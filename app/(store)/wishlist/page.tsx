import type { Metadata } from "next";
import Link from "next/link";
import { Heart } from "lucide-react";
import { requireUserPage } from "@/lib/auth/guards";
import { getWishlist } from "@/lib/services/wishlist";
import { WishlistList } from "@/components/cart/wishlist-list";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const user = await requireUserPage("/wishlist");
  const items = await getWishlist(user.id);
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-6">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Wishlist</h1>
      <p className="mb-8 mt-1 text-sm text-muted">{items.length} saved {items.length === 1 ? "item" : "items"}</p>
      {items.length === 0 ? (
        <EmptyState icon={<Heart />} title="Your wishlist is empty." description="Tap the heart on any product to save it for later." action={<Button asChild><Link href="/shop">Explore Products</Link></Button>} />
      ) : (
        <WishlistList
          items={items.map((w) => ({
            productId: w.product.id, slug: w.product.slug, name: w.product.name, brand: w.product.brand.name, image: w.product.images[0]?.url ?? null,
            price: w.product.price.toString(), compareAt: w.product.compareAtPrice?.toString() ?? null, discount: w.product.discountPercent,
            stock: w.product.stock, available: w.product.status === "PUBLISHED", priceAtAdd: w.priceAtAdd.toString(),
          }))}
        />
      )}
    </div>
  );
}
