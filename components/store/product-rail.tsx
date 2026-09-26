import { ProductCard } from "./product-card";
import type { ProductCardDTO } from "@/types";

export function ProductRail({ products }: { products: ProductCardDTO[] }) {
  if (!products.length) return <p className="text-sm text-muted">No products to show yet.</p>;
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-4">
      {products.map((p) => (
        <div key={p.id} className="w-[64%] shrink-0 snap-start sm:w-[42%] md:w-auto">
          <ProductCard product={p} />
        </div>
      ))}
    </div>
  );
}
