import "server-only";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { GUEST_CART_COOKIE } from "@/lib/auth/constants";
import { getCurrentUser } from "@/lib/auth/session";
import { priceOrder } from "./pricing";
import type { CartSummaryDTO } from "@/types";

export const MAX_QTY_PER_LINE = 10;

const cartInclude = {
  coupon: true,
  items: {
    orderBy: { createdAt: "asc" as const },
    include: {
      product: {
        select: {
          id: true, slug: true, name: true, price: true, compareAtPrice: true, stock: true, status: true,
          brand: { select: { name: true } },
          images: { select: { url: true }, orderBy: { position: "asc" as const }, take: 1 },
        },
      },
    },
  },
};

async function guestToken() {
  return (await cookies()).get(GUEST_CART_COOKIE)?.value ?? null;
}

/** Find the cart for the current visitor without creating one. */
export async function findCart() {
  const user = await getCurrentUser();
  if (user) return db.cart.findUnique({ where: { userId: user.id }, include: cartInclude });
  const token = await guestToken();
  if (!token) return null;
  return db.cart.findUnique({ where: { guestToken: token }, include: cartInclude });
}

/** Get or create the visitor's cart. Only callable from server actions (sets cookies). */
export async function getOrCreateCart() {
  const user = await getCurrentUser();
  if (user) {
    return db.cart.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id }, include: cartInclude });
  }
  const jar = await cookies();
  let token = jar.get(GUEST_CART_COOKIE)?.value;
  if (token) {
    const existing = await db.cart.findUnique({ where: { guestToken: token }, include: cartInclude });
    if (existing) return existing;
  }
  token = randomBytes(24).toString("base64url");
  jar.set(GUEST_CART_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 30 });
  return db.cart.create({ data: { guestToken: token }, include: cartInclude });
}

type CartWithItems = NonNullable<Awaited<ReturnType<typeof findCart>>>;

export async function summarizeCart(
  cart: CartWithItems | null,
  opts: { delivery?: "STANDARD" | "EXPRESS"; usePoints?: boolean; userId?: string | null } = {},
): Promise<CartSummaryDTO> {
  if (!cart) {
    return { id: null, lines: [], itemCount: 0, subtotal: "0.00", savings: "0.00", couponCode: null, couponDiscount: "0.00", couponError: null, shipping: "0.00", pointsDiscount: "0.00", pointsRedeemed: 0, tax: "0.00", total: "0.00", hasIssues: false };
  }
  const userId = opts.userId ?? cart.userId;
  let pointsBalance = 0;
  if (opts.usePoints && userId) {
    pointsBalance = (await db.rewardAccount.findUnique({ where: { userId }, select: { balance: true } }))?.balance ?? 0;
  }

  const lines = cart.items.map((it) => {
    const p = it.product;
    let issue: string | null = null;
    if (p.status !== "PUBLISHED") issue = "No longer available";
    else if (p.stock <= 0) issue = "Out of stock";
    else if (it.quantity > p.stock) issue = `Only ${p.stock} left`;
    return {
      id: it.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      brand: p.brand.name,
      image: p.images[0]?.url ?? null,
      color: it.color,
      quantity: it.quantity,
      unitPrice: p.price,
      compareAtPrice: p.compareAtPrice,
      stock: p.stock,
      available: !issue,
      issue,
    };
  });
  const valid = lines.filter((l) => l.available);
  const pricing = await priceOrder({
    lines: valid.map((l) => ({ productId: l.productId, quantity: l.quantity, unitPrice: l.unitPrice, compareAtPrice: l.compareAtPrice })),
    coupon: cart.coupon,
    userId,
    delivery: opts.delivery ?? "STANDARD",
    pointsBalance,
    usePoints: opts.usePoints,
  });

  return {
    id: cart.id,
    lines: lines.map((l) => ({
      ...l,
      unitPrice: l.unitPrice.toFixed(2),
      compareAtPrice: l.compareAtPrice?.toFixed(2) ?? null,
      lineTotal: l.unitPrice.times(l.quantity).toFixed(2),
    })),
    itemCount: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: pricing.subtotal.toFixed(2),
    savings: pricing.savings.toFixed(2),
    couponCode: cart.coupon?.code ?? null,
    couponDiscount: pricing.couponDiscount.toFixed(2),
    couponError: pricing.couponError,
    shipping: pricing.shipping.toFixed(2),
    pointsDiscount: pricing.pointsDiscount.toFixed(2),
    pointsRedeemed: pricing.pointsRedeemed,
    tax: pricing.tax.toFixed(2),
    total: pricing.total.toFixed(2),
    hasIssues: lines.some((l) => !l.available),
  };
}

export async function getCartSummary(opts?: { delivery?: "STANDARD" | "EXPRESS"; usePoints?: boolean }) {
  const user = await getCurrentUser();
  return summarizeCart(await findCart(), { ...opts, userId: user?.id ?? null });
}

export async function getCartCount() {
  const cart = await findCart();
  return cart?.items.reduce((n, i) => n + i.quantity, 0) ?? 0;
}

export async function addToCart(productId: string, quantity: number, color = "") {
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true, stock: true, status: true, colors: true, name: true } });
  if (!product || product.status !== "PUBLISHED") throw new NotFoundError("This product is no longer available.");
  if (product.stock <= 0) throw new AppError("This product is currently out of stock.", "OUT_OF_STOCK");
  if (color && !product.colors.includes(color)) throw new AppError("Please choose a valid colour.");
  const chosenColor = color || product.colors[0] || "";
  const cart = await getOrCreateCart();
  const existing = cart.items.find((i) => i.productId === productId && i.color === chosenColor);
  const nextQty = (existing?.quantity ?? 0) + quantity;
  if (nextQty > product.stock) throw new AppError(product.stock === 1 ? "Only 1 unit left in stock." : `Only ${product.stock} units left in stock.`, "INSUFFICIENT_STOCK");
  if (nextQty > MAX_QTY_PER_LINE) throw new AppError(`You can buy up to ${MAX_QTY_PER_LINE} of this item per order.`);
  await db.cartItem.upsert({
    where: { cartId_productId_color: { cartId: cart.id, productId, color: chosenColor } },
    update: { quantity: nextQty },
    create: { cartId: cart.id, productId, color: chosenColor, quantity },
  });
  return { name: product.name };
}

async function ownedItem(itemId: string) {
  const cart = await findCart();
  const item = cart?.items.find((i) => i.id === itemId);
  if (!cart || !item) throw new NotFoundError("That item is no longer in your cart.");
  return { cart, item };
}

export async function updateCartItem(itemId: string, quantity: number) {
  const { item } = await ownedItem(itemId);
  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: itemId } });
    return;
  }
  if (quantity > item.product.stock) throw new AppError(item.product.stock ? `Only ${item.product.stock} units available.` : "This item is out of stock.", "INSUFFICIENT_STOCK");
  if (quantity > MAX_QTY_PER_LINE) throw new AppError(`Maximum ${MAX_QTY_PER_LINE} per item.`);
  await db.cartItem.update({ where: { id: itemId }, data: { quantity } });
}

export async function removeCartItem(itemId: string) {
  await ownedItem(itemId);
  await db.cartItem.delete({ where: { id: itemId } });
}

/** Move a guest cart into the user's cart after sign-in, respecting stock. */
export async function mergeGuestCart(userId: string) {
  const token = await guestToken();
  if (!token) return;
  const guest = await db.cart.findUnique({ where: { guestToken: token }, include: { items: { include: { product: { select: { stock: true } } } } } });
  if (guest && guest.items.length) {
    const userCart = await db.cart.upsert({ where: { userId }, update: {}, create: { userId }, include: { items: true } });
    for (const gi of guest.items) {
      const existing = userCart.items.find((i) => i.productId === gi.productId && i.color === gi.color);
      const qty = Math.min((existing?.quantity ?? 0) + gi.quantity, gi.product.stock, MAX_QTY_PER_LINE);
      if (qty <= 0) continue;
      await db.cartItem.upsert({
        where: { cartId_productId_color: { cartId: userCart.id, productId: gi.productId, color: gi.color } },
        update: { quantity: qty },
        create: { cartId: userCart.id, productId: gi.productId, color: gi.color, quantity: qty },
      });
    }
    if (guest.couponId && !userCart.couponId) await db.cart.update({ where: { id: userCart.id }, data: { couponId: guest.couponId } });
  }
  if (guest) await db.cart.delete({ where: { id: guest.id } });
  (await cookies()).delete(GUEST_CART_COOKIE);
}
