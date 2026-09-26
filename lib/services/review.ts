import "server-only";
import type { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";
import { CATALOG_TAG } from "./catalog";

/** Only customers with a delivered order containing the product may review. */
export async function hasPurchased(userId: string, productId: string) {
  const n = await db.orderItem.count({ where: { productId, order: { userId, status: "DELIVERED" } } });
  return n > 0;
}

export async function recomputeRating(productId: string, tx: Prisma.TransactionClient | typeof db = db) {
  const agg = await tx.review.aggregate({ where: { productId, status: "APPROVED" }, _avg: { rating: true }, _count: { _all: true } });
  await tx.product.update({
    where: { id: productId },
    data: { ratingAvg: (agg._avg.rating ?? 0).toFixed(2), ratingCount: agg._count._all },
  });
}

export async function upsertReview(userId: string, input: { productId: string; rating: number; title: string; comment: string }) {
  if (!(await hasPurchased(userId, input.productId))) {
    throw new AppError("Only customers who received this product can review it.", "NOT_PURCHASED", 403);
  }
  await db.$transaction(async (tx) => {
    await tx.review.upsert({
      where: { userId_productId: { userId, productId: input.productId } },
      update: { rating: input.rating, title: input.title, comment: input.comment, status: "APPROVED" },
      create: { userId, productId: input.productId, rating: input.rating, title: input.title, comment: input.comment, verifiedPurchase: true, status: "APPROVED" },
    });
    await recomputeRating(input.productId, tx);
  });
  revalidateTag(CATALOG_TAG);
}

export async function deleteOwnReview(userId: string, reviewId: string) {
  const r = await db.review.findFirst({ where: { id: reviewId, userId } });
  if (!r) throw new AppError("Review not found.", "NOT_FOUND", 404);
  await db.$transaction(async (tx) => {
    await tx.review.delete({ where: { id: reviewId } });
    await recomputeRating(r.productId, tx);
  });
  revalidateTag(CATALOG_TAG);
}

export async function moderateReview(reviewId: string, status: "APPROVED" | "HIDDEN" | "DELETE") {
  const r = await db.review.findUnique({ where: { id: reviewId } });
  if (!r) throw new AppError("Review not found.", "NOT_FOUND", 404);
  await db.$transaction(async (tx) => {
    if (status === "DELETE") await tx.review.delete({ where: { id: reviewId } });
    else await tx.review.update({ where: { id: reviewId }, data: { status } });
    await recomputeRating(r.productId, tx);
  });
  revalidateTag(CATALOG_TAG);
}
