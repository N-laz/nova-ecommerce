"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { action, AuthError, type ActionResult } from "@/lib/errors";
import { getCurrentUser } from "@/lib/auth/session";
import { toggleWishlist } from "@/lib/services/wishlist";
import { addToCart } from "@/lib/services/cart";

export async function toggleWishlistAction(productId: string): Promise<ActionResult<{ wished: boolean }>> {
  const res = await action("wishlist.toggle", async () => {
    const user = await getCurrentUser();
    if (!user) throw new AuthError("Sign in to save items to your wishlist.");
    const r = await toggleWishlist(user.id, z.string().min(1).max(40).parse(productId));
    revalidatePath("/wishlist");
    return r;
  });
  if (res.ok) res.message = res.data.wished ? "Saved to wishlist" : "Removed from wishlist";
  return res;
}

export async function moveWishlistToCartAction(productId: string): Promise<ActionResult<null>> {
  return action(
    "wishlist.moveToCart",
    async () => {
      const user = await getCurrentUser();
      if (!user) throw new AuthError();
      const id = z.string().min(1).max(40).parse(productId);
      await addToCart(id, 1);
      await db.wishlistItem.deleteMany({ where: { productId: id, wishlist: { userId: user.id } } });
      revalidatePath("/", "layout");
      return null;
    },
    "Moved to cart",
  );
}

export async function notifyMeAction(productId: string): Promise<ActionResult<null>> {
  return action(
    "stock.notifyMe",
    async () => {
      const user = await getCurrentUser();
      if (!user) throw new AuthError("Sign in to get notified when this is back in stock.");
      const id = z.string().min(1).max(40).parse(productId);
      await db.stockAlert.upsert({ where: { userId_productId: { userId: user.id, productId: id } }, update: { notifiedAt: null }, create: { userId: user.id, productId: id } });
      return null;
    },
    "We'll notify you when it's back in stock",
  );
}
