import { Prisma } from "@prisma/client";

/**
 * All currency math uses Prisma.Decimal (decimal.js) — never JS floats.
 * Values are only converted to strings/numbers at the presentation boundary.
 */
export const D = Prisma.Decimal;
export type Decimal = Prisma.Decimal;
export const ZERO = new D(0);

export function toDecimal(v: Prisma.Decimal | string | number | null | undefined): Prisma.Decimal {
  if (v === null || v === undefined) return new D(0);
  return v instanceof D ? v : new D(v);
}

export function round2(v: Prisma.Decimal) {
  return v.toDecimalPlaces(2, D.ROUND_HALF_UP);
}

export function sum(values: Prisma.Decimal[]) {
  return values.reduce((a, b) => a.plus(b), new D(0));
}

export function minD(a: Prisma.Decimal, b: Prisma.Decimal) {
  return a.lessThan(b) ? a : b;
}

export function maxD(a: Prisma.Decimal, b: Prisma.Decimal) {
  return a.greaterThan(b) ? a : b;
}

/** Discount % between compare-at and price, integer, 0 when not discounted. */
export function discountPercent(price: Prisma.Decimal | string | number, compareAt?: Prisma.Decimal | string | number | null) {
  if (compareAt === null || compareAt === undefined) return 0;
  const p = toDecimal(price);
  const c = toDecimal(compareAt);
  if (c.lessThanOrEqualTo(p) || c.isZero()) return 0;
  return c.minus(p).dividedBy(c).times(100).toDecimalPlaces(0, D.ROUND_FLOOR).toNumber();
}

/** Serialize a Decimal for client components (string preserves precision). */
export function money(v: Prisma.Decimal | string | number | null | undefined): string {
  return toDecimal(v).toFixed(2);
}
