import "server-only";
import { db } from "@/lib/db";
import { sendEmail, skipEmail } from "@/lib/email";
import {
  backInStockTemplate,
  orderCancelledTemplate,
  orderConfirmedTemplate,
  orderStageTemplate,
  priceDropTemplate,
  promotionalTemplate,
  type EmailOrder,
  type Rendered,
} from "@/lib/email/templates";

type OrderEmailKind = "CONFIRMED" | "SHIPPED" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

async function loadOrder(orderId: string) {
  const o = await db.order.findUnique({
    where: { id: orderId },
    include: {
      user: { select: { id: true, name: true, email: true, emailOrderUpdates: true } },
      items: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
  if (!o) return null;
  const pay = o.payments[0];
  const data: EmailOrder = {
    orderNumber: o.orderNumber,
    status: o.status,
    placedAt: o.placedAt,
    estimatedDelivery: o.estimatedDelivery,
    deliveryMethod: o.deliveryMethod,
    shipName: o.shipName,
    shipPhone: o.shipPhone,
    shipLine1: o.shipLine1,
    shipLine2: o.shipLine2,
    shipCity: o.shipCity,
    shipState: o.shipState,
    shipPincode: o.shipPincode,
    subtotal: o.subtotal.toFixed(2),
    discountTotal: o.discountTotal.toFixed(2),
    pointsDiscount: o.pointsDiscount.toFixed(2),
    shippingFee: o.shippingFee.toFixed(2),
    taxTotal: o.taxTotal.toFixed(2),
    total: o.total.toFixed(2),
    couponCode: o.couponCode,
    pointsEarned: o.pointsEarned,
    paymentMethod: pay?.method ?? null,
    paymentStatus: pay?.status ?? null,
    cancelReason: o.cancelReason,
    items: o.items.map((i) => ({ name: i.name, color: i.color, quantity: i.quantity, unitPrice: i.unitPrice.toFixed(2), lineTotal: i.lineTotal.toFixed(2), image: i.image })),
  };
  return { order: o, data };
}

/**
 * Order lifecycle emails. Confirmation and cancellation are receipts and always go out;
 * shipping progress respects the customer's "order updates" preference.
 */
export async function emailOrderEvent(orderId: string, kind: OrderEmailKind, opts: { refunded?: boolean } = {}) {
  const loaded = await loadOrder(orderId);
  if (!loaded) return;
  const { order, data } = loaded;
  let rendered: Rendered;
  if (kind === "CONFIRMED") rendered = orderConfirmedTemplate(data);
  else if (kind === "CANCELLED") rendered = orderCancelledTemplate(data, opts.refunded ?? false);
  else rendered = orderStageTemplate(data, kind);

  const template = `order.${kind.toLowerCase()}`;
  const receipt = kind === "CONFIRMED" || kind === "CANCELLED";
  if (!receipt && !order.user.emailOrderUpdates) {
    return skipEmail({ to: order.user.email, userId: order.user.id, template, rendered, reason: "Customer turned off order update emails" });
  }
  return sendEmail({ to: order.user.email, userId: order.user.id, template, rendered });
}

async function offerRecipients(userIds: string[]) {
  const ids = [...new Set(userIds)];
  if (!ids.length) return [];
  return db.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true, emailOffers: true } });
}

async function sendToEach(users: { id: string; name: string; email: string; emailOffers: boolean }[], template: string, render: (name: string) => Rendered) {
  // Sequential keeps SMTP connection counts sane; volumes here are small (wishlisters of one product).
  for (const u of users) {
    const rendered = render(u.name);
    if (!u.emailOffers) await skipEmail({ to: u.email, userId: u.id, template, rendered, reason: "Customer turned off offer and alert emails" });
    else await sendEmail({ to: u.email, userId: u.id, template, rendered });
  }
}

export async function emailBackInStock(productId: string, userIds: string[]) {
  const product = await db.product.findUnique({ where: { id: productId }, select: { name: true, slug: true, price: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } } });
  if (!product) return;
  const users = await offerRecipients(userIds);
  await sendToEach(users, "alert.back_in_stock", (name) => backInStockTemplate(name, { name: product.name, slug: product.slug, price: product.price.toFixed(2), image: product.images[0]?.url ?? null }));
}

export async function emailPriceDrop(productId: string, userIds: string[], was: string, now: string) {
  const product = await db.product.findUnique({ where: { id: productId }, select: { name: true, slug: true, images: { orderBy: { position: "asc" }, take: 1, select: { url: true } } } });
  if (!product) return;
  const users = await offerRecipients(userIds);
  await sendToEach(users, "alert.price_drop", (name) => priceDropTemplate(name, { name: product.name, slug: product.slug, image: product.images[0]?.url ?? null }, was, now));
}

export async function emailPromotion(userIds: string[], title: string, body: string, link?: string | null) {
  const users = await offerRecipients(userIds);
  await sendToEach(users, "promo.broadcast", (name) => promotionalTemplate(name, title, body, link));
}
