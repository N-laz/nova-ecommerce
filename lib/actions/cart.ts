"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { action, AppError, type ActionResult } from "@/lib/errors";
import { getCurrentUser } from "@/lib/auth/session";
import { addToCart, getCartSummary, getOrCreateCart, removeCartItem, updateCartItem } from "@/lib/services/cart";
import { findCouponByCode, evaluateCoupon, CouponInvalid } from "@/lib/services/coupon";
import { sum } from "@/lib/money";
import type { CartSummaryDTO } from "@/types";

const idSchema = z.string().min(1).max(40);

function touch() {
  revalidatePath("/", "layout");
}

export async function addToCartAction(productId: string, quantity = 1, color = ""): Promise<ActionResult<CartSummaryDTO>> {
  return action(
    "cart.add",
    async () => {
      const qty = z.number().int().min(1).max(10).parse(quantity);
      await addToCart(idSchema.parse(productId), qty, z.string().max(30).parse(color));
      touch();
      return getCartSummary();
    },
    "Added to cart",
  );
}

export async function updateCartItemAction(itemId: string, quantity: number): Promise<ActionResult<CartSummaryDTO>> {
  return action("cart.update", async () => {
    await updateCartItem(idSchema.parse(itemId), z.number().int().min(0).max(10).parse(quantity));
    touch();
    return getCartSummary();
  });
}

export async function removeCartItemAction(itemId: string): Promise<ActionResult<CartSummaryDTO>> {
  return action(
    "cart.remove",
    async () => {
      await removeCartItem(idSchema.parse(itemId));
      touch();
      return getCartSummary();
    },
    "Removed from cart",
  );
}

export async function getCartAction(opts?: { delivery?: "STANDARD" | "EXPRESS"; usePoints?: boolean }): Promise<ActionResult<CartSummaryDTO>> {
  return action("cart.get", async () => {
    const o = z.object({ delivery: z.enum(["STANDARD", "EXPRESS"]).optional(), usePoints: z.boolean().optional() }).parse(opts ?? {});
    return getCartSummary(o);
  });
}

/** Apply a coupon — validated entirely on the server from the DB record. */
export async function applyCouponAction(code: string): Promise<ActionResult<CartSummaryDTO>> {
  return action("cart.coupon", async () => {
    const clean = z.string().trim().min(3, "Enter a coupon code.").max(20).parse(code).toUpperCase();
    const cart = await getOrCreateCart();
    if (!cart.items.length) throw new AppError("Add items to your cart before applying a coupon.");
    const coupon = await findCouponByCode(clean);
    const user = await getCurrentUser();
    const subtotal = sum(cart.items.filter((i) => i.product.status === "PUBLISHED" && i.product.stock >= i.quantity).map((i) => i.product.price.times(i.quantity)));
    try {
      await evaluateCoupon(coupon, { userId: user?.id ?? null, subtotal });
    } catch (e) {
      if (e instanceof CouponInvalid) throw new AppError(e.message, "COUPON");
      throw e;
    }
    await db.cart.update({ where: { id: cart.id }, data: { couponId: coupon!.id } });
    touch();
    return getCartSummary();
  }, `Coupon applied`);
}

export async function removeCouponAction(): Promise<ActionResult<CartSummaryDTO>> {
  return action("cart.coupon.remove", async () => {
    const cart = await getOrCreateCart();
    await db.cart.update({ where: { id: cart.id }, data: { couponId: null } });
    touch();
    return getCartSummary();
  }, "Coupon removed");
}
