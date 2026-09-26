import "server-only";
import type { NotificationType, Prisma, PrismaClient } from "@prisma/client";
import { db } from "@/lib/db";

type Tx = Prisma.TransactionClient | PrismaClient;

export function notify(userId: string, type: NotificationType, title: string, body: string, link?: string, tx: Tx = db) {
  return tx.notification.create({ data: { userId, type, title, body, link } });
}

export async function notifyMany(userIds: string[], type: NotificationType, title: string, body: string, link?: string, tx: Tx = db) {
  const unique = [...new Set(userIds)];
  if (!unique.length) return 0;
  const res = await tx.notification.createMany({ data: unique.map((userId) => ({ userId, type, title, body, link })) });
  return res.count;
}
