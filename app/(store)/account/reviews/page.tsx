import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { Stars } from "@/components/shared/rating";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { DeleteReviewButton } from "@/components/account/review-row-actions";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "My reviews", robots: { index: false } };

export default async function MyReviews() {
  const user = await requireUserPage("/account/reviews");
  const [reviews, pendingItems] = await Promise.all([
    db.review.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, include: { product: { select: { name: true, slug: true, images: { take: 1, orderBy: { position: "asc" }, select: { url: true } } } } } }),
    db.orderItem.findMany({
      where: { order: { userId: user.id, status: "DELIVERED" }, product: { reviews: { none: { userId: user.id } }, status: "PUBLISHED" } },
      distinct: ["productId"],
      select: { productId: true, name: true, image: true, product: { select: { slug: true } } },
      take: 6,
    }),
  ]);

  return (
    <div className="space-y-8">
      {pendingItems.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Waiting for your review</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {pendingItems.map((i) => (
              <li key={i.productId} className="flex items-center gap-3 rounded-2xl bg-card p-3 hairline">
                <div className="relative size-14 overflow-hidden rounded-xl bg-surface">{i.image && <Image src={i.image} alt="" fill sizes="56px" className="object-cover" />}</div>
                <p className="min-w-0 flex-1 truncate text-sm">{i.name}</p>
                <Button asChild size="sm" variant="secondary"><Link href={`/product/${i.product!.slug}#reviews`}>Review</Link></Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Your reviews</h2>
        {reviews.length === 0 ? (
          <EmptyState icon={<Star />} title="No reviews yet" description="Reviews you write for delivered products will appear here." />
        ) : (
          <ul className="space-y-3">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-2xl bg-card p-5 hairline">
                <div className="flex items-start gap-4">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-surface">{r.product.images[0] && <Image src={r.product.images[0].url} alt="" fill sizes="56px" className="object-cover" />}</div>
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${r.product.slug}`} className="text-sm text-muted hover:text-foreground">{r.product.name}</Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2"><Stars value={r.rating} /><p className="font-medium">{r.title}</p>{r.status !== "APPROVED" && <Badge variant={r.status === "HIDDEN" ? "danger" : "warning"}>{r.status === "HIDDEN" ? "Hidden by moderator" : "Pending review"}</Badge>}</div>
                    <p className="mt-2 text-sm text-foreground/80">{r.comment}</p>
                    <p className="mt-2 text-xs text-muted">{formatDate(r.createdAt)}</p>
                  </div>
                </div>
                <div className="mt-3 flex gap-2 border-t border-border pt-3">
                  <Button asChild size="sm" variant="secondary"><Link href={`/product/${r.product.slug}#reviews`}>Edit</Link></Button>
                  <DeleteReviewButton id={r.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
