"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { action, type ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/auth/guards";
import { reviewSchema } from "@/lib/validation/catalog";
import { upsertReview, deleteOwnReview } from "@/lib/services/review";
import { rateLimit } from "@/lib/rate-limit";
import type { NotificationDTO } from "@/types";

export async function submitReviewAction(input: unknown): Promise<ActionResult<null>> {
  return action(
    "review.submit",
    async () => {
      const user = await requireUser();
      await rateLimit("review", { limit: 10, windowMs: 60 * 60_000, key: user.id });
      const data = reviewSchema.parse(input);
      await upsertReview(user.id, data);
      const p = await db.product.findUnique({ where: { id: data.productId }, select: { slug: true } });
      if (p) revalidatePath(`/product/${p.slug}`);
      revalidatePath("/account/reviews");
      return null;
    },
    "Thanks! Your review is live.",
  );
}

export async function deleteReviewAction(reviewId: string): Promise<ActionResult<null>> {
  return action(
    "review.delete",
    async () => {
      const user = await requireUser();
      await deleteOwnReview(user.id, z.string().min(1).parse(reviewId));
      revalidatePath("/account/reviews");
      return null;
    },
    "Review deleted",
  );
}

export async function getNotificationsAction(): Promise<ActionResult<{ items: NotificationDTO[]; unread: number }>> {
  return action("notifications.list", async () => {
    const user = await requireUser();
    const [items, unread] = await Promise.all([
      db.notification.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 8 }),
      db.notification.count({ where: { userId: user.id, readAt: null } }),
    ]);
    return {
      unread,
      items: items.map((n) => ({ id: n.id, type: n.type, title: n.title, body: n.body, link: n.link, read: !!n.readAt, createdAt: n.createdAt.toISOString() })),
    };
  });
}

export async function markNotificationReadAction(id?: string): Promise<ActionResult<null>> {
  return action("notifications.read", async () => {
    const user = await requireUser();
    await db.notification.updateMany({ where: { userId: user.id, readAt: null, ...(id ? { id } : {}) }, data: { readAt: new Date() } });
    revalidatePath("/account/notifications");
    return null;
  });
}
