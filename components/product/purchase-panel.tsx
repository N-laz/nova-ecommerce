"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Heart, Minus, Plus, Bell, GitCompareArrows, Truck, ShieldCheck, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StockStatus } from "@/components/shared/stock-status";
import { useStore } from "@/components/store/store-provider";
import { notifyMeAction } from "@/lib/actions/wishlist";
import { cn } from "@/lib/utils";

const SWATCH: Record<string, string> = {
  black: "#111", white: "#f4f4f4", silver: "#c9cdd2", graphite: "#3b3d42", blue: "#3b5b9a", gray: "#7a7d83", grey: "#7a7d83", titanium: "#8d8a84", natural: "#bdb5a6", gold: "#d8c29a", green: "#4d6b56", pink: "#e8b7c1", purple: "#7a64b8", midnight: "#1d2330", starlight: "#e9e2d4", cream: "#efe7d6", red: "#b3302f", orange: "#e0692b", sand: "#cbb89a",
};
const swatch = (c: string) => SWATCH[Object.keys(SWATCH).find((k) => c.toLowerCase().includes(k)) ?? ""] ?? "#555";

export function PurchasePanel({ productId, colors, stock, lowStockThreshold, maxQty, deliveryLabel, alertActive }: { productId: string; colors: string[]; stock: number; lowStockThreshold: number; maxQty: number; deliveryLabel: string; alertActive: boolean }) {
  const { addToCart, toggleWishlist, toggleCompare, wishlist, compare, pending, user } = useStore();
  const router = useRouter();
  const [color, setColor] = useState(colors[0] ?? "");
  const [qty, setQty] = useState(1);
  const [buying, startBuy] = useTransition();
  const [alerted, setAlerted] = useState(alertActive);
  const [notifying, startNotify] = useTransition();
  const out = stock <= 0;
  const limit = Math.max(1, Math.min(stock, maxQty));
  const wished = wishlist.has(productId);

  return (
    <div className="space-y-6">
      {colors.length > 0 && (
        <div>
          <p className="mb-2.5 text-sm"><span className="text-muted">Colour:</span> {color}</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Colour">
            {colors.map((c) => (
              <button
                key={c}
                role="radio"
                aria-checked={c === color}
                onClick={() => setColor(c)}
                className={cn("flex items-center gap-2 rounded-full py-1.5 pl-1.5 pr-3.5 text-sm transition cursor-pointer", c === color ? "bg-white/10 ring-1 ring-white/60" : "hairline hover:bg-white/5")}
              >
                <span className="size-5 rounded-full ring-1 ring-white/20" style={{ background: swatch(c) }} />
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4">
        <StockStatus stock={stock} low={lowStockThreshold} className="text-sm" />
        {!out && <span className="flex items-center gap-1.5 text-sm text-muted"><Truck className="size-4" /> {deliveryLabel}</span>}
      </div>

      {out ? (
        <div className="space-y-3 rounded-2xl bg-card p-5 hairline">
          <p className="font-medium">Currently unavailable</p>
          <p className="text-sm text-muted">We&apos;re restocking soon. Get an in-app alert the moment it&apos;s back.</p>
          <Button
            variant={alerted ? "secondary" : "accent"}
            loading={notifying}
            disabled={alerted}
            onClick={() =>
              startNotify(async () => {
                if (!user) return router.push(`/login?next=${encodeURIComponent(location.pathname)}`);
                const r = await notifyMeAction(productId);
                if (r.ok) {
                  setAlerted(true);
                  toast.success("We'll notify you when it's back in stock");
                } else toast.error(r.error);
              })
            }
          >
            <Bell /> {alerted ? "You'll be notified" : "Notify Me"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex gap-3">
            <div className="flex h-12 items-center rounded-full hairline">
              <button aria-label="Decrease quantity" disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-full w-11 place-items-center text-muted hover:text-foreground disabled:opacity-30 cursor-pointer"><Minus className="size-4" /></button>
              <span className="w-8 text-center tabular" aria-live="polite">{qty}</span>
              <button aria-label="Increase quantity" disabled={qty >= limit} onClick={() => setQty((q) => Math.min(limit, q + 1))} className="grid h-full w-11 place-items-center text-muted hover:text-foreground disabled:opacity-30 cursor-pointer"><Plus className="size-4" /></button>
            </div>
            <Button size="lg" variant="secondary" className="flex-1" loading={pending.has(`cart:${productId}`)} onClick={() => addToCart(productId, { quantity: qty, color, openDrawer: true })}>
              Add to cart
            </Button>
          </div>
          <Button
            size="lg"
            className="w-full"
            loading={buying}
            onClick={() =>
              startBuy(async () => {
                const okAdd = await addToCart(productId, { quantity: qty, color });
                if (okAdd) router.push(user ? "/checkout" : "/login?next=/checkout");
              })
            }
          >
            Buy now
          </Button>
          {qty >= limit && stock <= maxQty && <p className="text-xs text-warning">Maximum available quantity selected.</p>}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={() => toggleWishlist(productId)} aria-pressed={wished}>
          <Heart className={cn(wished && "fill-[#ff5a7a] text-[#ff5a7a]")} /> {wished ? "Saved" : "Add to wishlist"}
        </Button>
        <Button variant="ghost" size="sm" className="min-h-[44px]" onClick={() => toggleCompare(productId)} aria-pressed={compare.includes(productId)}>
          <GitCompareArrows /> {compare.includes(productId) ? "Comparing" : "Compare"}
        </Button>
      </div>

      <ul className="grid grid-cols-3 gap-2 border-t border-border pt-5 text-xs text-muted">
        <li className="flex flex-col items-center gap-1.5 text-center"><Truck className="size-4 text-foreground/80" />Free standard delivery</li>
        <li className="flex flex-col items-center gap-1.5 text-center"><RotateCcw className="size-4 text-foreground/80" />7-day replacement</li>
        <li className="flex flex-col items-center gap-1.5 text-center"><ShieldCheck className="size-4 text-foreground/80" />Official brand warranty</li>
      </ul>
    </div>
  );
}
