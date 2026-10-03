"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, Plus, GitCompareArrows, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Price } from "@/components/shared/price";
import { RatingInline } from "@/components/shared/rating";
import { StockStatus } from "@/components/shared/stock-status";
import { useStore } from "./store-provider";
import type { ProductCardDTO } from "@/types";

export function ProductCard({ product, priority, className }: { product: ProductCardDTO; priority?: boolean; className?: string }) {
  const { addToCart, toggleWishlist, toggleCompare, wishlist, compare, pending } = useStore();
  const wished = wishlist.has(product.id);
  const comparing = compare.includes(product.id);
  const out = product.stock <= 0;
  const adding = pending.has(`cart:${product.id}`);

  return (
    <motion.article
      initial={false}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("group relative flex min-w-0 flex-col overflow-hidden rounded-2xl bg-card hairline", className)}
    >
      <div className="relative aspect-square overflow-hidden bg-[#111318]">
        <Link href={`/product/${product.slug}`} aria-label={product.name} className="absolute inset-0">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.imageAlt}
              fill
              priority={priority}
              sizes="(min-width:1280px) 22vw, (min-width:768px) 30vw, (min-width:640px) 44vw, 75vw"
              className={cn("object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]", out && "opacity-50 grayscale-[40%]")}
            />
          ) : (
            <div className="grid h-full place-items-center text-sm text-muted">No image</div>
          )}
        </Link>
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex max-w-[calc(100%-4.5rem)] flex-col items-start gap-1.5">
          {out && <Badge variant="danger">Sold out</Badge>}
          {product.isNew && <Badge variant="accent">New</Badge>}
          {product.trending && !product.isNew && <Badge>Trending</Badge>}
          {product.discountPercent >= 5 && <Badge variant="solid">−{product.discountPercent}%</Badge>}
        </div>
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => toggleWishlist(product.id)}
            aria-label={wished ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            aria-pressed={wished}
            className="relative grid size-11 place-items-center rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white shadow-sm transition hover:scale-105 hover:bg-black/90 hover:border-white/40 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 focus-visible:rounded-full cursor-pointer sm:size-9"
          >
            <motion.span key={String(wished)} initial={{ scale: 0.6 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}>
              <Heart className={cn("size-4", wished ? "fill-[#ff5a7a] text-[#ff5a7a]" : "text-white")} />
            </motion.span>
          </button>
          <button
            type="button"
            onClick={() => toggleCompare(product.id)}
            aria-label={comparing ? `Remove ${product.name} from comparison` : `Compare ${product.name}`}
            aria-pressed={comparing}
            className={cn(
              "relative grid size-11 place-items-center rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-white shadow-sm transition hover:scale-105 hover:bg-black/90 hover:border-white/40 focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 focus-visible:rounded-full cursor-pointer sm:size-9 md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
              comparing && "md:opacity-100 text-accent border-accent/40"
            )}
          >
            {comparing ? <Check className="size-4 text-accent" /> : <GitCompareArrows className="size-4 text-white" />}
          </button>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4 min-w-0">
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.14em] text-muted">
          <span className="truncate">{product.brand}</span>
          <RatingInline avg={product.ratingAvg} count={product.ratingCount} className="normal-case tracking-normal" />
        </div>
        {/* card-title-area enforces a fixed 2-line height so action rows align across all cards */}
        <h3 className="card-title-area text-[15px] font-medium leading-snug">
          <Link href={`/product/${product.slug}`} className="hover:text-white/80">{product.name}</Link>
        </h3>
        <div className="mt-auto flex items-end justify-between gap-2 pt-1 min-w-0">
          <div className="min-w-0 flex-1 space-y-1">
            <Price price={product.price} compareAt={product.compareAtPrice} discount={product.discountPercent} />
            <StockStatus stock={product.stock} low={product.lowStockThreshold} subtle />
          </div>
          <button
            type="button"
            disabled={out || adding}
            onClick={() => addToCart(product.id)}
            aria-label={out ? `${product.name} is currently unavailable` : `Add ${product.name} to cart`}
            title={out ? "Currently unavailable" : "Add to cart"}
            className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-black transition hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/30 cursor-pointer sm:size-10"
          >
            {adding ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          </button>
        </div>
      </div>
    </motion.article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-2xl bg-card hairline">
      <div className="skeleton aspect-square rounded-none" />
      <div className="space-y-2.5 p-4">
        <div className="skeleton h-3 w-1/3" />
        <div className="skeleton h-4 w-4/5" />
        <div className="skeleton h-4 w-1/2" />
      </div>
    </div>
  );
}

export function ProductGrid({ products, className, priorityCount = 0 }: { products: ProductCardDTO[]; className?: string; priorityCount?: number }) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-4", className)}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} priority={i < priorityCount} />
      ))}
    </div>
  );
}
