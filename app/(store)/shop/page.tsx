import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { shopQuerySchema } from "@/lib/validation/catalog";
import { getBrands, getCategories, getPriceBounds, getSpecFacets, searchProducts, type ShopParams } from "@/lib/services/catalog";
import { ProductGrid } from "@/components/store/product-card";
import { ShopSidebar, ShopToolbar } from "@/components/store/shop-filters";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SP = Promise<Record<string, string | string[] | undefined>>;

function parse(raw: Record<string, string | string[] | undefined>): ShopParams {
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === "string" && v !== "") flat[k] = v;
  const parsed = shopQuerySchema.safeParse(flat);
  const base = parsed.success ? parsed.data : {};
  const specs: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(flat)) if (k.startsWith("spec_")) specs[k.slice(5).slice(0, 60)] = v.split(",").filter(Boolean).slice(0, 20);
  return { ...base, specs };
}

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : null;
  const cat = typeof sp.category === "string" ? sp.category : null;
  const title = q ? `Search: ${q}` : cat ? `${cat.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase())}` : "Shop all products";
  return { title, description: "Browse premium smartphones, laptops, audio, wearables, gaming and desk-setup gear at NOVA.", alternates: { canonical: "/shop" } };
}

export default async function ShopPage({ searchParams }: { searchParams: SP }) {
  const raw = await searchParams;
  const params = parse(raw);
  const [result, categories, brands, facets, bounds] = await Promise.all([searchProducts(params), getCategories(), getBrands(), getSpecFacets(params), getPriceBounds()]);

  const filterProps = {
    categories: categories.map((c) => ({ name: c.name, slug: c.slug, count: c._count.products })),
    brands: brands.filter((b) => b._count.products > 0).map((b) => ({ name: b.name, slug: b.slug, count: b._count.products })),
    specFacets: facets,
    bounds,
    total: result.total,
  };

  const pageHref = (n: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries(raw)) if (typeof v === "string") p.set(k, v);
    p.set("page", String(n));
    return `/shop?${p.toString()}`;
  };

  const heading = params.q ? `Results for “${params.q}”` : params.category && !params.category.includes(",") ? categories.find((c) => c.slug === params.category)?.name ?? "Shop" : "Shop all";

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-6">
      <nav aria-label="Breadcrumb" className="mb-3 text-xs text-muted"><Link href="/" className="hover:text-foreground">Home</Link> / <span className="text-foreground/80">Shop</span></nav>
      <h1 className="mb-8 text-3xl font-semibold tracking-tight md:text-4xl">{heading}</h1>
      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <ShopSidebar {...filterProps} />
        <div className="min-w-0 space-y-6">
          <ShopToolbar {...filterProps} />
          {result.products.length ? (
            <ProductGrid products={result.products} priorityCount={4} className="md:grid-cols-2 lg:grid-cols-3" />
          ) : (
            <EmptyState
              icon={<SearchX />}
              title="No products match these filters"
              description="Try removing a filter or searching for something broader."
              action={<Button asChild variant="secondary"><Link href="/shop">Clear all filters</Link></Button>}
            />
          )}
          {result.pageCount > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 pt-6">
              {result.page > 1 && <Link href={pageHref(result.page - 1)} className="rounded-full px-4 py-2 text-sm hairline hover:bg-white/5">Previous</Link>}
              {Array.from({ length: result.pageCount }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={pageHref(n)} aria-current={n === result.page ? "page" : undefined} className={cn("grid size-9 place-items-center rounded-full text-sm tabular", n === result.page ? "bg-white text-black" : "text-muted hover:bg-white/5")}>
                  {n}
                </Link>
              ))}
              {result.page < result.pageCount && <Link href={pageHref(result.page + 1)} className="rounded-full px-4 py-2 text-sm hairline hover:bg-white/5">Next</Link>}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
