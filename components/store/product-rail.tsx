import { ProductCard } from "./product-card";
import type { ProductCardDTO } from "@/types";

export function ProductRail({ products }: { products: ProductCardDTO[] }) {
  if (!products.length) return <p className="text-sm text-muted">No products to show yet.</p>;
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 pt-1 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 md:py-0 md:scroll-px-0 xl:grid-cols-4">
      {products.map((p) => (
        <div key={p.id} className="w-[75%] shrink-0 snap-start sm:w-[44%] md:w-auto">
          <ProductCard product={p} />
        </div>
      ))}
      <div className="w-1 shrink-0 md:hidden" aria-hidden="true" />
    </div>
  );
}
