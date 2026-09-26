import { ProductCardSkeleton } from "@/components/store/product-card";

export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-6">
      <div className="skeleton mb-8 h-10 w-56" />
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <div className="hidden space-y-4 lg:block">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-8" />)}</div>
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">{Array.from({ length: 9 }).map((_, i) => <ProductCardSkeleton key={i} />)}</div>
      </div>
    </div>
  );
}
