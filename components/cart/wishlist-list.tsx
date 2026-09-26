"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ShoppingBag, Trash2, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/shared/price";
import { StockStatus } from "@/components/shared/stock-status";
import { useStore } from "@/components/store/store-provider";
import { moveWishlistToCartAction } from "@/lib/actions/wishlist";
import { formatINR } from "@/lib/format";

export type WishRow = { productId: string; slug: string; name: string; brand: string; image: string | null; price: string; compareAt: string | null; discount: number; stock: number; available: boolean; priceAtAdd: string };

export function WishlistList({ items }: { items: WishRow[] }) {
  const { toggleWishlist } = useStore();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((w) => {
        const drop = Number(w.priceAtAdd) - Number(w.price);
        return (
          <li key={w.productId} className="flex flex-col overflow-hidden rounded-2xl bg-card hairline">
            <Link href={`/product/${w.slug}`} className="relative aspect-[4/3] bg-surface">
              {w.image && <Image src={w.image} alt={w.name} fill sizes="(min-width:1024px) 30vw, 50vw" className="object-cover" />}
            </Link>
            <div className="flex flex-1 flex-col p-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{w.brand}</p>
              <Link href={`/product/${w.slug}`} className="mt-0.5 font-medium hover:text-white/80">{w.name}</Link>
              <Price price={w.price} compareAt={w.compareAt} discount={w.discount} className="mt-2" />
              {drop > 0 && <p className="mt-1 flex items-center gap-1 text-xs text-success"><TrendingDown className="size-3.5" /> Price dropped {formatINR(drop)} since you saved it</p>}
              <StockStatus stock={w.available ? w.stock : 0} low={5} className="mt-2" />
              <div className="mt-auto flex gap-2 pt-4">
                <Button
                  size="sm"
                  className="flex-1"
                  disabled={!w.available || w.stock <= 0}
                  loading={busy === w.productId}
                  onClick={async () => {
                    setBusy(w.productId);
                    const r = await moveWishlistToCartAction(w.productId);
                    setBusy(null);
                    if (!r.ok) return toast.error(r.error);
                    toast.success("Moved to cart");
                    router.refresh();
                  }}
                >
                  <ShoppingBag /> {w.stock > 0 && w.available ? "Move to cart" : "Unavailable"}
                </Button>
                <Button
                  size="icon-sm"
                  variant="secondary"
                  aria-label={`Remove ${w.name} from wishlist`}
                  onClick={async () => {
                    await toggleWishlist(w.productId);
                    router.refresh();
                  }}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
