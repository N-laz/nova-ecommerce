import "server-only";
import type { Prisma } from "@prisma/client";

export async function ensureRewardAccount(tx: Prisma.TransactionClient, userId: string) {
  return tx.rewardAccount.upsert({ where: { userId }, update: {}, create: { userId } });
}

export async function earnPoints(tx: Prisma.TransactionClient, userId: string, points: number, description: string, orderId?: string) {
  if (points <= 0) return;
  const acc = await ensureRewardAccount(tx, userId);
  await tx.rewardAccount.update({ where: { id: acc.id }, data: { balance: { increment: points }, lifetimeEarned: { increment: points } } });
  await tx.rewardTransaction.create({ data: { accountId: acc.id, type: "EARNED", points, description, orderId } });
}

/** Atomically redeem points; throws if balance is insufficient. */
export async function redeemPoints(tx: Prisma.TransactionClient, userId: string, points: number, description: string, orderId?: string) {
  if (points <= 0) return;
  const acc = await ensureRewardAccount(tx, userId);
  const res = await tx.rewardAccount.updateMany({
    where: { id: acc.id, balance: { gte: points } },
    data: { balance: { decrement: points }, lifetimeUsed: { increment: points } },
  });
  if (res.count === 0) throw new Error("INSUFFICIENT_POINTS");
  await tx.rewardTransaction.create({ data: { accountId: acc.id, type: "REDEEMED", points: -points, description, orderId } });
}

/** Undo earned/redeemed points for a cancelled order. Never lets balance go negative. */
export async function reverseOrderPoints(tx: Prisma.TransactionClient, userId: string, order: { id: string; orderNumber: string; pointsEarned: number; pointsRedeemed: number }) {
  const acc = await ensureRewardAccount(tx, userId);
  if (order.pointsRedeemed > 0) {
    await tx.rewardAccount.update({ where: { id: acc.id }, data: { balance: { increment: order.pointsRedeemed }, lifetimeUsed: { decrement: order.pointsRedeemed } } });
    await tx.rewardTransaction.create({ data: { accountId: acc.id, type: "ADJUSTED", points: order.pointsRedeemed, description: `Points refunded — ${order.orderNumber} cancelled`, orderId: order.id } });
  }
  if (order.pointsEarned > 0) {
    const fresh = await tx.rewardAccount.findUniqueOrThrow({ where: { id: acc.id } });
    const take = Math.min(order.pointsEarned, fresh.balance);
    if (take > 0) {
      await tx.rewardAccount.update({ where: { id: acc.id }, data: { balance: { decrement: take }, lifetimeEarned: { decrement: take } } });
      await tx.rewardTransaction.create({ data: { accountId: acc.id, type: "REVERSED", points: -take, description: `Points reversed — ${order.orderNumber} cancelled`, orderId: order.id } });
    }
  }
}
