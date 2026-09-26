import "server-only";
import type { Coupon, Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";
import { D, minD, round2, toDecimal } from "@/lib/money";
import { formatINR } from "@/lib/format";

type Tx = Prisma.TransactionClient | PrismaClient;

export class CouponInvalid extends Error {}

/**
 * Server-side coupon evaluation. The client only ever sends a code; the
 * discount is always computed here from the database record.
 */
export async function evaluateCoupon(
  coupon: Coupon | null,
  { userId, subtotal, tx = db, now = new Date() }: { userId: string | null; subtotal: Prisma.Decimal; tx?: Tx; now?: Date },
): Promise<Prisma.Decimal> {
  if (!coupon) throw new CouponInvalid("That coupon code doesn't exist.");
  if (!coupon.active) throw new CouponInvalid("This coupon is no longer active.");
  if (coupon.startsAt > now) throw new CouponInvalid("This coupon isn't active yet.");
  if (coupon.expiresAt && coupon.expiresAt < now) throw new CouponInvalid("This coupon has expired.");
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) throw new CouponInvalid("This coupon has reached its usage limit.");
  if (subtotal.lessThan(coupon.minOrderAmount)) {
    throw new CouponInvalid(`Add ${formatINR(coupon.minOrderAmount.minus(subtotal).toFixed(2))} more to use ${coupon.code} (min. order ${formatINR(coupon.minOrderAmount.toFixed(0))}).`);
  }
  if (userId) {
    const used = await tx.couponUsage.count({ where: { couponId: coupon.id, userId } });
    if (used >= coupon.perUserLimit) throw new CouponInvalid("You've already used this coupon.");
  }
  let discount = coupon.type === "PERCENTAGE" ? subtotal.times(coupon.value).dividedBy(100) : toDecimal(coupon.value);
  if (coupon.maxDiscount) discount = minD(discount, coupon.maxDiscount);
  discount = minD(discount, subtotal);
  return round2(discount.lessThan(0) ? new D(0) : discount);
}

export function findCouponByCode(code: string, tx: Tx = db) {
  return tx.coupon.findUnique({ where: { code: code.trim().toUpperCase() } });
}
