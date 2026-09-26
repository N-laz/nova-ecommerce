import "server-only";
import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export async function getWishlistIds(userId: string) {
  const items = await db.wishlistItem.findMany({ where: { wishlist: { userId } }, select: { productId: true } });
  return items.map((i) => i.productId);
}

export async function toggleWishlist(userId: string, productId: string) {
  const product = await db.product.findUnique({ where: { id: productId }, select: { id: true, price: true, status: true } });
  if (!product || product.status !== "PUBLISHED") throw new NotFoundError("Product not found.");
  const wishlist = await db.wishlist.upsert({ where: { userId }, update: {}, create: { userId } });
  const existing = await db.wishlistItem.findUnique({ where: { wishlistId_productId: { wishlistId: wishlist.id, productId } } });
  if (existing) {
    await db.wishlistItem.delete({ where: { id: existing.id } });
    return { wished: false };
  }
  await db.wishlistItem.create({ data: { wishlistId: wishlist.id, productId, priceAtAdd: product.price } });
  return { wished: true };
}

export async function getWishlist(userId: string) {
  return db.wishlistItem.findMany({
    where: { wishlist: { userId } },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        select: {
          id: true, slug: true, name: true, price: true, compareAtPrice: true, discountPercent: true, stock: true, status: true, colors: true, ratingAvg: true, ratingCount: true,
          brand: { select: { name: true } },
          images: { select: { url: true, alt: true }, orderBy: { position: "asc" }, take: 1 },
        },
      },
    },
  });
}
