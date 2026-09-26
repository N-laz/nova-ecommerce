"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { action, AppError, type ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/auth/guards";
import { rateLimit } from "@/lib/rate-limit";
import { addressSchema, placeOrderSchema } from "@/lib/validation/checkout";
import { placeOrder, verifyGatewayPayment, cancelOrderForUser } from "@/lib/services/order";

export async function saveAddressAction(input: unknown, addressId?: string): Promise<ActionResult<{ id: string }>> {
  return action(
    "address.save",
    async () => {
      const user = await requireUser();
      const data = addressSchema.parse(input);
      const count = await db.address.count({ where: { userId: user.id } });
      if (!addressId && count >= 10) throw new AppError("You can save up to 10 addresses.");
      const makeDefault = data.isDefault || count === 0;
      const saved = await db.$transaction(async (tx) => {
        if (makeDefault) await tx.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
        if (addressId) {
          const owned = await tx.address.findFirst({ where: { id: addressId, userId: user.id } });
          if (!owned) throw new AppError("Address not found.", "NOT_FOUND", 404);
          return tx.address.update({ where: { id: addressId }, data: { ...data, line2: data.line2 || null, isDefault: makeDefault || owned.isDefault } });
        }
        return tx.address.create({ data: { ...data, line2: data.line2 || null, isDefault: makeDefault, userId: user.id } });
      });
      revalidatePath("/account/addresses");
      revalidatePath("/checkout");
      return { id: saved.id };
    },
    addressId ? "Address updated" : "Address saved",
  );
}

export async function deleteAddressAction(addressId: string): Promise<ActionResult<null>> {
  return action(
    "address.delete",
    async () => {
      const user = await requireUser();
      const a = await db.address.findFirst({ where: { id: addressId, userId: user.id } });
      if (!a) throw new AppError("Address not found.", "NOT_FOUND", 404);
      await db.address.delete({ where: { id: a.id } });
      if (a.isDefault) {
        const next = await db.address.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" } });
        if (next) await db.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
      revalidatePath("/account/addresses");
      return null;
    },
    "Address removed",
  );
}

export async function setDefaultAddressAction(addressId: string): Promise<ActionResult<null>> {
  return action(
    "address.default",
    async () => {
      const user = await requireUser();
      const a = await db.address.findFirst({ where: { id: addressId, userId: user.id } });
      if (!a) throw new AppError("Address not found.", "NOT_FOUND", 404);
      await db.$transaction([
        db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } }),
        db.address.update({ where: { id: a.id }, data: { isDefault: true } }),
      ]);
      revalidatePath("/account/addresses");
      return null;
    },
    "Default address updated",
  );
}

export async function placeOrderAction(input: unknown): Promise<ActionResult<{ orderNumber: string; action: Record<string, unknown> | null }>> {
  return action("checkout.placeOrder", async () => {
    const user = await requireUser();
    await rateLimit("place-order", { limit: 8, windowMs: 60_000, key: user.id });
    const data = placeOrderSchema.parse(input);
    const res = await placeOrder(user, data);
    revalidatePath("/", "layout");
    return res;
  });
}

export async function verifyPaymentAction(input: unknown): Promise<ActionResult<{ orderNumber: string }>> {
  return action("checkout.verifyPayment", async () => {
    const user = await requireUser();
    const data = z.object({ orderNumber: z.string(), providerOrderId: z.string(), providerPaymentId: z.string(), signature: z.string() }).parse(input);
    return verifyGatewayPayment(user.id, data);
  });
}

export async function cancelOrderAction(orderNumber: string, reason: string): Promise<ActionResult<null>> {
  return action(
    "order.cancel",
    async () => {
      const user = await requireUser();
      const r = z.string().trim().min(3, "Tell us why you're cancelling.").max(200).parse(reason);
      await cancelOrderForUser(user.id, z.string().regex(/^NVA-\d{5,8}$/).parse(orderNumber), r);
      revalidatePath(`/account/orders/${orderNumber}`);
      revalidatePath("/account/orders");
      return null;
    },
    "Order cancelled",
  );
}
