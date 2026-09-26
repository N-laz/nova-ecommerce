import "server-only";
import { dispatch } from "@/lib/email";
import { emailOrderEvent } from "@/lib/services/email-events";
import type { OrderStatus, Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getPaymentProvider, getProviderByName } from "@/lib/payments";
import type { PlaceOrderInput } from "@/lib/validation/checkout";
import { CATALOG_TAG } from "./catalog";
import { CouponInvalid } from "./coupon";
import { changeStock } from "./inventory";
import { notify } from "./notification";
import { pointsForAmount, priceOrder } from "./pricing";
import { earnPoints, redeemPoints, reverseOrderPoints } from "./rewards";

export const STATUS_FLOW: OrderStatus[] = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"];
export const CANCELLABLE: OrderStatus[] = ["PENDING", "CONFIRMED"];

async function generateOrderNumber(tx: Prisma.TransactionClient) {
  for (let i = 0; i < 8; i++) {
    const n = `NVA-${Math.floor(10000 + Math.random() * 89999)}`;
    if (!(await tx.order.findUnique({ where: { orderNumber: n }, select: { id: true } }))) return n;
  }
  return `NVA-${Date.now().toString().slice(-7)}`;
}

function estimateDelivery(method: "STANDARD" | "EXPRESS", from = new Date()) {
  const d = new Date(from);
  d.setDate(d.getDate() + (method === "EXPRESS" ? 2 : 5));
  return d;
}

/**
 * Place an order from the user's cart. Everything that matters — prices, stock,
 * coupon, points, totals — is recomputed from the database here.
 */
export async function placeOrder(user: { id: string; name: string; email: string }, input: PlaceOrderInput) {
  const cart = await db.cart.findUnique({
    where: { userId: user.id },
    include: { coupon: true, items: { include: { product: { include: { images: { orderBy: { position: "asc" }, take: 1 } } } } } },
  });
  if (!cart || cart.items.length === 0) throw new AppError("Your cart is empty.", "EMPTY_CART");

  const address = await db.address.findFirst({ where: { id: input.addressId, userId: user.id } });
  if (!address) throw new AppError("Please choose a valid delivery address.", "ADDRESS");

  for (const it of cart.items) {
    if (it.product.status !== "PUBLISHED") throw new AppError(`${it.product.name} is no longer available. Please remove it from your cart.`, "UNAVAILABLE");
    if (it.quantity > it.product.stock) throw new AppError(it.product.stock ? `Only ${it.product.stock} × ${it.product.name} left. Please update your cart.` : `${it.product.name} just sold out. Please remove it from your cart.`, "INSUFFICIENT_STOCK");
  }

  const order = await db.$transaction(
    async (tx) => {
      const reward = await tx.rewardAccount.findUnique({ where: { userId: user.id } });
      let pricing;
      try {
        pricing = await priceOrder({
          lines: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.product.price, compareAtPrice: i.product.compareAtPrice })),
          coupon: cart.coupon,
          userId: user.id,
          delivery: input.deliveryMethod,
          pointsBalance: reward?.balance ?? 0,
          usePoints: input.usePoints,
          strictCoupon: true,
          tx,
        });
      } catch (e) {
        if (e instanceof CouponInvalid) throw new AppError(`Coupon ${cart.coupon?.code}: ${e.message}`, "COUPON");
        throw e;
      }

      const orderNumber = await generateOrderNumber(tx);
      const created = await tx.order.create({
        data: {
          orderNumber,
          userId: user.id,
          status: "PENDING",
          deliveryMethod: input.deliveryMethod,
          shipName: address.fullName,
          shipPhone: address.phone,
          shipLine1: address.line1,
          shipLine2: address.line2,
          shipCity: address.city,
          shipState: address.state,
          shipPincode: address.pincode,
          subtotal: pricing.subtotal,
          discountTotal: pricing.couponDiscount,
          pointsDiscount: pricing.pointsDiscount,
          shippingFee: pricing.shipping,
          taxTotal: pricing.tax,
          total: pricing.total,
          pointsRedeemed: pricing.pointsRedeemed,
          couponId: pricing.couponDiscount.greaterThan(0) ? cart.couponId : null,
          couponCode: pricing.couponDiscount.greaterThan(0) ? cart.coupon?.code : null,
          notes: input.notes || null,
          estimatedDelivery: estimateDelivery(input.deliveryMethod),
          items: {
            create: cart.items.map((i) => ({
              productId: i.productId,
              name: i.product.name,
              sku: i.product.sku,
              image: i.product.images[0]?.url ?? null,
              color: i.color,
              unitPrice: i.product.price,
              quantity: i.quantity,
              lineTotal: i.product.price.times(i.quantity),
            })),
          },
        },
      });

      // Reserve stock atomically — fails the whole transaction if anything sold out meanwhile.
      for (const i of cart.items) {
        await changeStock(tx, { productId: i.productId, change: -i.quantity, reason: "ORDER", note: `Order ${orderNumber}`, orderId: created.id });
        await tx.product.update({ where: { id: i.productId }, data: { soldCount: { increment: i.quantity } } });
      }

      if (created.couponId && cart.coupon) {
        const bumped = await tx.coupon.updateMany({
          where: { id: cart.coupon.id, ...(cart.coupon.usageLimit !== null ? { usedCount: { lt: cart.coupon.usageLimit } } : {}) },
          data: { usedCount: { increment: 1 } },
        });
        if (bumped.count === 0) throw new AppError("This coupon has just reached its usage limit.", "COUPON");
        await tx.couponUsage.create({ data: { couponId: cart.coupon.id, userId: user.id, orderId: created.id, amount: pricing.couponDiscount } });
      }

      if (pricing.pointsRedeemed > 0) {
        try {
          await redeemPoints(tx, user.id, pricing.pointsRedeemed, `Redeemed on ${orderNumber}`, created.id);
        } catch {
          throw new AppError("Your reward points balance changed. Please review your order.", "POINTS");
        }
      }

      const provider = getPaymentProvider(input.payment.method);
      const payment = await tx.payment.create({
        data: { orderId: created.id, provider: provider.name, method: input.payment.method, amount: pricing.total, status: "PENDING" },
      });
      return { ...created, paymentId: payment.id, providerName: provider.name };
    },
    { timeout: 20_000, maxWait: 10_000 },
  );

  // ── Payment (outside the DB transaction: gateways are network calls) ──
  const provider = getPaymentProvider(input.payment.method);
  let outcome;
  try {
    outcome = await provider.createPayment({
      paymentId: order.paymentId,
      orderNumber: order.orderNumber,
      amountPaise: order.total.times(100).toNumber(),
      currency: "INR",
      method: input.payment.method,
      details: input.payment,
      customer: { name: user.name, email: user.email, phone: address.phone },
    });
  } catch (e) {
    logger.error("payment.createPayment", e);
    outcome = { status: "FAILED" as const, reason: "Payment gateway error. You have not been charged." };
  }

  revalidateTag(CATALOG_TAG);

  if (outcome.status === "FAILED") {
    await db.payment.update({ where: { id: order.paymentId }, data: { status: "FAILED", failureReason: outcome.reason } });
    await cancelOrderInternal(order.id, { reason: "Payment failed", byAdmin: false, silent: true });
    throw new AppError(`${outcome.reason} Your cart has been kept — try another payment method.`, "PAYMENT_FAILED");
  }

  if (outcome.status === "REQUIRES_ACTION") {
    await db.payment.update({ where: { id: order.paymentId }, data: { providerOrderId: outcome.providerOrderId } });
    return { orderNumber: order.orderNumber, action: outcome.clientPayload };
  }

  await confirmOrder(order.id, outcome.status === "SUCCEEDED" ? { providerPaymentId: outcome.providerPaymentId, metadata: outcome.metadata } : { metadata: outcome.metadata });
  return { orderNumber: order.orderNumber, action: null };
}

/** Mark payment result, confirm the order, award points, clear the cart, notify. */
export async function confirmOrder(orderId: string, payment: { providerPaymentId?: string; metadata?: Record<string, unknown> }) {
  const confirmed = await db.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: orderId }, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } });
    if (order.status !== "PENDING") return false;
    const p = order.payments[0];
    if (p) {
      await tx.payment.update({
        where: { id: p.id },
        data: payment.providerPaymentId
          ? { status: "CAPTURED", providerPaymentId: payment.providerPaymentId, paidAt: new Date(), metadata: (payment.metadata ?? {}) as Prisma.InputJsonValue }
          : { status: "PENDING", metadata: (payment.metadata ?? {}) as Prisma.InputJsonValue },
      });
    }
    const points = pointsForAmount(order.total);
    await tx.order.update({ where: { id: orderId }, data: { status: "CONFIRMED", confirmedAt: new Date(), pointsEarned: points } });
    await earnPoints(tx, order.userId, points, `Earned on ${order.orderNumber}`, order.id);
    await tx.cartItem.deleteMany({ where: { cart: { userId: order.userId } } });
    await tx.cart.updateMany({ where: { userId: order.userId }, data: { couponId: null } });
    await notify(order.userId, "ORDER_CONFIRMED", `Order ${order.orderNumber} confirmed`, `Thanks for shopping with NOVA. You earned ${points} NOVA points.`, `/account/orders/${order.orderNumber}`, tx);
    return true;
  });
  // Email only after the transaction commits, and outside the request's critical path.
  if (confirmed) dispatch(() => emailOrderEvent(orderId, "CONFIRMED"));
}

export async function verifyGatewayPayment(userId: string, input: { orderNumber: string; providerOrderId: string; providerPaymentId: string; signature: string }) {
  const order = await db.order.findFirst({ where: { orderNumber: input.orderNumber, userId }, include: { payments: { orderBy: { createdAt: "desc" }, take: 1 } } });
  const p = order?.payments[0];
  if (!order || !p || p.providerOrderId !== input.providerOrderId) throw new NotFoundError("Payment not found.");
  const provider = getProviderByName(p.provider);
  if (!provider?.verifyPayment || !(await provider.verifyPayment(input))) {
    await db.payment.update({ where: { id: p.id }, data: { status: "FAILED", failureReason: "Signature verification failed" } });
    await cancelOrderInternal(order.id, { reason: "Payment verification failed", byAdmin: false, silent: true });
    throw new AppError("We couldn't verify your payment. You have not been charged.", "PAYMENT_FAILED");
  }
  await confirmOrder(order.id, { providerPaymentId: input.providerPaymentId });
  return { orderNumber: order.orderNumber };
}

/** Cancel + restock + refund coupon/points. Enforces cancellable statuses. */
export async function cancelOrderInternal(orderId: string, opts: { reason: string; byAdmin: boolean; silent?: boolean }) {
  const result = await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true, payments: true, couponUsage: true } });
    if (!order) throw new NotFoundError("Order not found.");
    if (!CANCELLABLE.includes(order.status)) {
      throw new AppError(`Orders can't be cancelled once they are ${order.status.replaceAll("_", " ").toLowerCase()}.`, "NOT_CANCELLABLE");
    }
    // Conditional status flip guards against concurrent cancellation/fulfilment.
    const flipped = await tx.order.updateMany({ where: { id: orderId, status: { in: CANCELLABLE } }, data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: opts.reason } });
    if (flipped.count === 0) throw new AppError("This order was just updated. Please refresh.", "CONFLICT");

    for (const it of order.items) {
      if (!it.productId) continue;
      await changeStock(tx, { productId: it.productId, change: it.quantity, reason: "ORDER_CANCELLED", note: `Cancelled ${order.orderNumber}`, orderId: order.id });
      await tx.product.update({ where: { id: it.productId }, data: { soldCount: { decrement: it.quantity } } });
    }
    for (const p of order.payments) {
      if (p.status === "CAPTURED") await tx.payment.update({ where: { id: p.id }, data: { status: "REFUNDED" } });
      else if (p.status === "PENDING") await tx.payment.update({ where: { id: p.id }, data: { status: "FAILED", failureReason: p.failureReason ?? opts.reason } });
    }
    if (order.couponUsage) {
      await tx.couponUsage.delete({ where: { id: order.couponUsage.id } });
      await tx.coupon.update({ where: { id: order.couponUsage.couponId }, data: { usedCount: { decrement: 1 } } });
    }
    await reverseOrderPoints(tx, order.userId, order);
    if (!opts.silent) {
      const refunded = order.payments.some((p) => p.status === "CAPTURED");
      await notify(
        order.userId,
        "ORDER_CANCELLED",
        `Order ${order.orderNumber} cancelled`,
        refunded ? "Your refund has been initiated and will reach your original payment method in 5–7 business days." : opts.byAdmin ? `Cancelled by NOVA: ${opts.reason}` : "Your order has been cancelled.",
        `/account/orders/${order.orderNumber}`,
        tx,
      );
    }
    return { order, refunded: order.payments.some((p) => p.status === "CAPTURED") };
  });
  revalidateTag(CATALOG_TAG);
  if (!opts.silent) dispatch(() => emailOrderEvent(orderId, "CANCELLED", { refunded: result.refunded }));
  return result.order;
}

export async function cancelOrderForUser(userId: string, orderNumber: string, reason: string) {
  const order = await db.order.findFirst({ where: { orderNumber, userId }, select: { id: true } });
  if (!order) throw new NotFoundError("Order not found.");
  return cancelOrderInternal(order.id, { reason, byAdmin: false });
}

const STATUS_TIMESTAMP: Partial<Record<OrderStatus, keyof Prisma.OrderUpdateInput>> = {
  CONFIRMED: "confirmedAt",
  PACKED: "packedAt",
  SHIPPED: "shippedAt",
  OUT_FOR_DELIVERY: "outForDeliveryAt",
  DELIVERED: "deliveredAt",
};

/** Admin fulfilment: only forward moves along the flow; cancellation goes through cancelOrderInternal. */
export async function advanceOrderStatus(orderId: string, next: OrderStatus) {
  if (next === "CANCELLED") throw new AppError("Use cancel to cancel an order.");
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payments: true } });
  if (!order) throw new NotFoundError("Order not found.");
  if (order.status === "CANCELLED") throw new AppError("Cancelled orders can't be updated.");
  const from = STATUS_FLOW.indexOf(order.status);
  const to = STATUS_FLOW.indexOf(next);
  if (to <= from) throw new AppError("Orders can only move forward in the fulfilment flow.");
  if (order.status === "PENDING" && next !== "CONFIRMED") throw new AppError("Confirm the order before fulfilling it.");

  await db.$transaction(async (tx) => {
    const now = new Date();
    const data: Prisma.OrderUpdateInput = { status: next };
    // Fill in timestamps for any skipped intermediate steps too.
    for (const s of STATUS_FLOW.slice(from + 1, to + 1)) {
      const key = STATUS_TIMESTAMP[s];
      if (key) (data as Record<string, unknown>)[key] = now;
    }
    await tx.order.update({ where: { id: orderId }, data });
    if (next === "DELIVERED") {
      const cod = order.payments.find((p) => p.method === "COD" && p.status === "PENDING");
      if (cod) await tx.payment.update({ where: { id: cod.id }, data: { status: "CAPTURED", paidAt: now, providerPaymentId: `cod_${order.orderNumber}` } });
    }
    const link = `/account/orders/${order.orderNumber}`;
    if (next === "SHIPPED") await notify(order.userId, "ORDER_SHIPPED", `Order ${order.orderNumber} has shipped`, "Your package is on its way.", link, tx);
    else if (next === "DELIVERED") await notify(order.userId, "ORDER_DELIVERED", `Order ${order.orderNumber} delivered`, "Enjoy your new gear! Share a review to help others.", link, tx);
    else if (next === "OUT_FOR_DELIVERY") await notify(order.userId, "ORDER_UPDATE", `Out for delivery`, `Order ${order.orderNumber} will reach you today.`, link, tx);
    else if (next === "PACKED") await notify(order.userId, "ORDER_UPDATE", `Order ${order.orderNumber} packed`, "Your order is packed and ready to ship.", link, tx);
    else if (next === "CONFIRMED") await notify(order.userId, "ORDER_CONFIRMED", `Order ${order.orderNumber} confirmed`, "We've confirmed your order.", link, tx);
  });
  if (next === "CONFIRMED" || next === "SHIPPED" || next === "OUT_FOR_DELIVERY" || next === "DELIVERED") {
    dispatch(() => emailOrderEvent(orderId, next));
  }
}
