import "server-only";
import type { Coupon, Prisma } from "@prisma/client";
import { D, ZERO, minD, round2, sum } from "@/lib/money";
import { CouponInvalid, evaluateCoupon } from "./coupon";

export const GST_RATE = new D(18); // prices are GST-inclusive
export const EXPRESS_FEE = new D(99);
export const POINT_VALUE = new D(1); // 1 point = ₹1
export const MAX_POINTS_SHARE = new D("0.10"); // points can cover up to 10% of the order
export const RUPEES_PER_POINT = 100; // ₹100 spent = 1 point

export type PricingLine = {
  productId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  compareAtPrice: Prisma.Decimal | null;
};

export type PricingResult = {
  subtotal: Prisma.Decimal;
  savings: Prisma.Decimal;
  couponDiscount: Prisma.Decimal;
  couponError: string | null;
  shipping: Prisma.Decimal;
  pointsRedeemed: number;
  pointsDiscount: Prisma.Decimal;
  tax: Prisma.Decimal;
  total: Prisma.Decimal;
};

/** Pure-ish pricing engine used by both cart display and order placement. */
export async function priceOrder(input: {
  lines: PricingLine[];
  coupon: Coupon | null;
  userId: string | null;
  delivery: "STANDARD" | "EXPRESS";
  pointsBalance?: number;
  usePoints?: boolean;
  strictCoupon?: boolean;
  tx?: Prisma.TransactionClient;
}): Promise<PricingResult> {
  const subtotal = round2(sum(input.lines.map((l) => l.unitPrice.times(l.quantity))));
  const savings = round2(
    sum(input.lines.map((l) => (l.compareAtPrice && l.compareAtPrice.greaterThan(l.unitPrice) ? l.compareAtPrice.minus(l.unitPrice).times(l.quantity) : ZERO))),
  );

  let couponDiscount = ZERO;
  let couponError: string | null = null;
  if (input.coupon) {
    try {
      couponDiscount = await evaluateCoupon(input.coupon, { userId: input.userId, subtotal, tx: input.tx });
    } catch (e) {
      if (!(e instanceof CouponInvalid)) throw e;
      if (input.strictCoupon) throw e;
      couponError = e.message;
    }
  }

  const shipping = input.delivery === "EXPRESS" ? EXPRESS_FEE : ZERO;
  const afterCoupon = subtotal.minus(couponDiscount);

  let pointsRedeemed = 0;
  let pointsDiscount = ZERO;
  if (input.usePoints && input.pointsBalance && input.pointsBalance > 0 && afterCoupon.greaterThan(0)) {
    const cap = afterCoupon.times(MAX_POINTS_SHARE).dividedBy(POINT_VALUE).toDecimalPlaces(0, D.ROUND_FLOOR);
    pointsRedeemed = minD(new D(input.pointsBalance), cap).toNumber();
    pointsDiscount = POINT_VALUE.times(pointsRedeemed);
  }

  const taxable = afterCoupon.minus(pointsDiscount);
  // GST component contained within the (inclusive) taxable amount.
  const tax = round2(taxable.times(GST_RATE).dividedBy(GST_RATE.plus(100)));
  const total = round2(taxable.plus(shipping));
  return { subtotal, savings, couponDiscount, couponError, shipping, pointsRedeemed, pointsDiscount, tax, total };
}

export function pointsForAmount(total: Prisma.Decimal) {
  return total.dividedBy(RUPEES_PER_POINT).toDecimalPlaces(0, D.ROUND_FLOOR).toNumber();
}
