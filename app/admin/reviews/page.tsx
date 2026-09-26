import type { Metadata } from "next";
import Link from "next/link";
import type { ReviewStatus } from "@prisma/client";
import { BadgeCheck } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/sidebar";
import { FilterPills } from "@/components/admin/table-search";
import { ReviewModeration } from "@/components/admin/review-moderation";
import { Pager } from "@/components/admin/pager";
import { Stars } from "@/components/shared/rating";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Reviews" };
export const dynamic = "force-dynamic";

export default async function Reviews({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const take = 15;
  const status = ["PENDING", "APPROVED", "HIDDEN"].includes(sp.status ?? "") ? (sp.status as ReviewStatus) : undefined;
  const where = status ? { status } : {};
  const [rows, total, counts] = await Promise.all([
    db.review.findMany({ where, orderBy: [{ status: "asc" }, { createdAt: "desc" }], skip: (page - 1) * take, take, include: { user: { select: { name: true, email: true } }, product: { select: { name: true, slug: true } } } }),
    db.review.count({ where }),
    db.review.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const c = (s: string) => counts.find((x) => x.status === s)?._count._all ?? 0;
  return (
    <div>
      <PageHeader title="Reviews" description="Only customers with a delivered order can review. Product ratings update automatically when you moderate." />
      <div className="mb-4"><FilterPills name="status" current={sp.status ?? ""} options={[["", "All"], ["PENDING", `Pending (${c("PENDING")})`], ["APPROVED", `Approved (${c("APPROVED")})`], ["HIDDEN", `Hidden (${c("HIDDEN")})`]]} /></div>
      <div className="overflow-hidden rounded-2xl bg-card hairline">
        {rows.length === 0 ? <p className="py-12 text-center text-sm text-muted">No reviews in this view.</p> : (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 p-5 md:flex-row md:items-start">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Stars value={r.rating} />
                    <Badge variant={r.status === "APPROVED" ? "success" : r.status === "PENDING" ? "warning" : "default"}>{r.status.toLowerCase()}</Badge>
                    {r.verifiedPurchase && <span className="inline-flex items-center gap-1 text-xs text-success"><BadgeCheck className="size-3.5" /> Verified purchase</span>}
                  </div>
                  <p className="mt-2 font-medium">{r.title}</p>
                  <p className="mt-1 text-sm text-muted">{r.comment}</p>
                  <p className="mt-2 text-xs text-subtle">{r.user.name} · {r.user.email} · on <Link href={`/product/${r.product.slug}`} className="hover:text-foreground" target="_blank">{r.product.name}</Link> · {timeAgo(r.createdAt)}</p>
                </div>
                <ReviewModeration id={r.id} status={r.status} />
              </li>
            ))}
          </ul>
        )}
        <Pager page={page} pages={Math.ceil(total / take)} base="/admin/reviews" params={{ status: sp.status }} />
      </div>
    </div>
  );
}
