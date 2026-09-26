import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/sidebar";
import { CouponManager } from "@/components/admin/coupon-manager";

export const metadata: Metadata = { title: "Coupons" };
export const dynamic = "force-dynamic";

export default async function Coupons() {
  const rows = await db.coupon.findMany({ orderBy: { createdAt: "desc" } });
  const coupons = rows.map((c) => ({
    id: c.id, code: c.code, description: c.description, type: c.type, value: c.value.toString(), minOrderAmount: c.minOrderAmount.toString(), maxDiscount: c.maxDiscount?.toString() ?? null,
    usageLimit: c.usageLimit, perUserLimit: c.perUserLimit, usedCount: c.usedCount, startsAt: c.startsAt.toISOString(), expiresAt: c.expiresAt?.toISOString() ?? null, active: c.active,
  }));
  return (
    <div>
      <PageHeader title="Coupons" description="Percentage or fixed discounts with minimums, caps, usage limits and schedules." />
      <CouponManager coupons={coupons} />
    </div>
  );
}
