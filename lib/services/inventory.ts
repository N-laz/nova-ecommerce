import "server-only";
import { dispatch } from "@/lib/email";
import { emailBackInStock } from "@/lib/services/email-events";
import type { InventoryReason, Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { db } from "@/lib/db";
import { AppError, NotFoundError } from "@/lib/errors";
import { CATALOG_TAG } from "./catalog";
import { notifyMany } from "./notification";

/**
 * Atomic, never-negative stock change. Every mutation writes an InventoryTransaction.
 * Returns the new stock level.
 */
export async function changeStock(
  tx: Prisma.TransactionClient,
  input: { productId: string; change: number; reason: InventoryReason; note?: string; orderId?: string; actorId?: string },
) {
  if (input.change === 0) throw new AppError("Stock change can't be zero.");
  const where: Prisma.ProductWhereInput = { id: input.productId, ...(input.change < 0 ? { stock: { gte: -input.change } } : {}) };
  const res = await tx.product.updateMany({ where, data: { stock: { increment: input.change } } });
  if (res.count === 0) {
    const p = await tx.product.findUnique({ where: { id: input.productId }, select: { name: true, stock: true } });
    if (!p) throw new NotFoundError("Product not found.");
    throw new AppError(`Not enough stock for ${p.name} (available: ${p.stock}).`, "INSUFFICIENT_STOCK");
  }
  const { stock } = await tx.product.findUniqueOrThrow({ where: { id: input.productId }, select: { stock: true } });
  await tx.inventoryTransaction.create({
    data: { productId: input.productId, change: input.change, reason: input.reason, note: input.note, orderId: input.orderId, actorId: input.actorId, stockAfter: stock },
  });
  return stock;
}

/** Notify users waiting on (or wishlisting) a product that just came back. */
export async function announceBackInStock(productId: string) {
  const product = await db.product.findUnique({ where: { id: productId }, select: { name: true, slug: true, stock: true, status: true } });
  if (!product || product.stock <= 0 || product.status !== "PUBLISHED") return;
  const [alerts, wishers] = await Promise.all([
    db.stockAlert.findMany({ where: { productId, notifiedAt: null }, select: { id: true, userId: true } }),
    db.wishlistItem.findMany({ where: { productId }, select: { wishlist: { select: { userId: true } } } }),
  ]);
  const userIds = [...alerts.map((a) => a.userId), ...wishers.map((w) => w.wishlist.userId)];
  dispatch(() => emailBackInStock(productId, userIds));
  await notifyMany(userIds, "BACK_IN_STOCK", `${product.name} is back in stock`, "It's available again — grab yours before it sells out.", `/product/${product.slug}`);
  if (alerts.length) await db.stockAlert.updateMany({ where: { id: { in: alerts.map((a) => a.id) } }, data: { notifiedAt: new Date() } });
}

export async function adjustStock(input: { productId: string; mode: "add" | "remove" | "set"; quantity: number; reason: InventoryReason; note?: string; actorId: string }) {
  const before = await db.product.findUnique({ where: { id: input.productId }, select: { stock: true } });
  if (!before) throw new NotFoundError("Product not found.");
  let change = input.quantity;
  if (input.mode === "remove") change = -input.quantity;
  if (input.mode === "set") change = input.quantity - before.stock;
  if (change === 0) throw new AppError("Stock is already at that level.");
  const stock = await db.$transaction((tx) => changeStock(tx, { productId: input.productId, change, reason: input.reason, note: input.note, actorId: input.actorId }));
  revalidateTag(CATALOG_TAG);
  if (before.stock <= 0 && stock > 0) await announceBackInStock(input.productId);
  return stock;
}
