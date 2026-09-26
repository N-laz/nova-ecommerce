"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { action, AppError, type ActionResult } from "@/lib/errors";
import { COMPARE_COOKIE, RECENT_COOKIE } from "@/lib/auth/constants";

const MAX_COMPARE = 4;
const MAX_RECENT = 12;
const opts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 30, secure: process.env.NODE_ENV === "production" };

async function readIds(name: string) {
  const raw = (await cookies()).get(name)?.value ?? "";
  return raw.split(".").filter((s) => /^[a-z0-9]{10,40}$/i.test(s));
}

export async function toggleCompareAction(productId: string): Promise<ActionResult<{ ids: string[]; added: boolean }>> {
  return action("compare.toggle", async () => {
    const id = z.string().min(1).max(40).parse(productId);
    const ids = await readIds(COMPARE_COOKIE);
    let added = false;
    let next: string[];
    if (ids.includes(id)) next = ids.filter((x) => x !== id);
    else {
      if (ids.length >= MAX_COMPARE) throw new AppError(`You can compare up to ${MAX_COMPARE} products. Remove one first.`);
      const exists = await db.product.count({ where: { id, status: "PUBLISHED" } });
      if (!exists) throw new AppError("Product not found.");
      next = [...ids, id];
      added = true;
    }
    (await cookies()).set(COMPARE_COOKIE, next.join("."), opts);
    return { ids: next, added };
  });
}

export async function clearCompareAction(): Promise<ActionResult<null>> {
  return action("compare.clear", async () => {
    (await cookies()).delete(COMPARE_COOKIE);
    return null;
  });
}

export async function trackViewAction(productId: string): Promise<void> {
  try {
    const id = z.string().min(1).max(40).parse(productId);
    const ids = (await readIds(RECENT_COOKIE)).filter((x) => x !== id);
    (await cookies()).set(RECENT_COOKIE, [id, ...ids].slice(0, MAX_RECENT).join("."), opts);
  } catch {
    /* non-critical */
  }
}

export async function subscribeNewsletterAction(_: unknown, formData: FormData): Promise<ActionResult<null>> {
  return action(
    "newsletter.subscribe",
    async () => {
      const email = z.string().trim().toLowerCase().email("Enter a valid email address.").parse(formData.get("email"));
      const existing = await db.newsletterSubscriber.findUnique({ where: { email } });
      if (existing) throw new AppError("You're already subscribed — thanks for being here.", "ALREADY");
      await db.newsletterSubscriber.create({ data: { email } });
      return null;
    },
    "You're on the list. Watch your inbox for early drops.",
  );
}
