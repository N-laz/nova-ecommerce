import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { cookies } from "next/headers";
import { GitCompareArrows } from "lucide-react";
import { db } from "@/lib/db";
import { COMPARE_COOKIE } from "@/lib/auth/constants";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";
import { Price } from "@/components/shared/price";
import { Stars } from "@/components/shared/rating";
import { StockStatus } from "@/components/shared/stock-status";
import { CompareAdd, CompareClear, CompareRemove } from "@/components/cart/compare-actions";

export const metadata: Metadata = { title: "Compare products", robots: { index: false } };

export default async function ComparePage() {
  const ids = ((await cookies()).get(COMPARE_COOKIE)?.value ?? "").split(".").filter(Boolean);
  const rows = ids.length
    ? await db.product.findMany({
        where: { id: { in: ids }, status: "PUBLISHED" },
        include: { brand: { select: { name: true } }, category: { select: { name: true } }, images: { take: 1, orderBy: { position: "asc" } }, specifications: { orderBy: { position: "asc" } } },
      })
    : [];
  const products = ids.map((id) => rows.find((r) => r.id === id)).filter((p): p is (typeof rows)[number] => !!p);

  // Union of spec keys (grouped, in first-seen order) — computed entirely from DB specs
  const groups = new Map<string, string[]>();
  for (const p of products) for (const s of p.specifications) {
    const keys = groups.get(s.group) ?? [];
    if (!keys.includes(s.key)) keys.push(s.key);
    groups.set(s.group, keys);
  }
  const specValue = (p: (typeof products)[number], key: string) => p.specifications.find((s) => s.key === key)?.value ?? "—";
  const cols = { gridTemplateColumns: `180px repeat(${products.length}, minmax(200px, 1fr))` };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Compare</h1>
          <p className="mt-1 text-sm text-muted">Side-by-side specs for up to 4 products.</p>
        </div>
        {products.length > 0 && <CompareClear />}
      </div>
      {products.length === 0 ? (
        <EmptyState icon={<GitCompareArrows />} title="Nothing to compare yet" description="Tap the compare icon on any product card to add it here. Try comparing the Sony WH-1000XM6, Bose QC Ultra and AirPods Max." action={<Button asChild><Link href="/shop?category=audio">Browse audio</Link></Button>} />
      ) : (
        <div className="overflow-x-auto rounded-2xl hairline">
          <div className="min-w-fit">
            <div className="grid border-b border-border bg-card" style={cols}>
              <div className="p-4 text-sm text-muted">{products.length} of 4 selected{products.length < 2 && <p className="mt-2 text-xs">Add at least one more product to compare.</p>}</div>
              {products.map((p) => (
                <div key={p.id} className="relative border-l border-border p-4">
                  <CompareRemove productId={p.id} name={p.name} />
                  <Link href={`/product/${p.slug}`} className="relative block aspect-square overflow-hidden rounded-xl bg-surface">
                    {p.images[0] && <Image src={p.images[0].url} alt={p.name} fill sizes="220px" className="object-cover" />}
                  </Link>
                  <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-muted">{p.brand.name}</p>
                  <Link href={`/product/${p.slug}`} className="font-medium hover:text-white/80">{p.name}</Link>
                  <Price price={p.price.toString()} compareAt={p.compareAtPrice?.toString()} discount={p.discountPercent} className="mt-2" />
                  <div className="mt-3">{p.stock > 0 ? <CompareAdd productId={p.id} /> : <StockStatus stock={0} low={5} />}</div>
                </div>
              ))}
            </div>
            {[
              ["Rating", (p: (typeof products)[number]) => <span className="flex items-center gap-2"><Stars value={Number(p.ratingAvg)} /> <span className="text-xs text-muted">({p.ratingCount})</span></span>],
              ["Category", (p: (typeof products)[number]) => p.category.name],
              ["Warranty", (p: (typeof products)[number]) => p.warranty ?? "—"],
              ["Availability", (p: (typeof products)[number]) => <StockStatus stock={p.stock} low={p.lowStockThreshold} />],
            ].map(([label, fn]) => (
              <div key={label as string} className="grid border-b border-border text-sm" style={cols}>
                <div className="p-4 text-muted">{label as string}</div>
                {products.map((p) => <div key={p.id} className="border-l border-border p-4">{(fn as (p: (typeof products)[number]) => React.ReactNode)(p)}</div>)}
              </div>
            ))}
            {[...groups].map(([group, keys]) => (
              <div key={group}>
                <div className="bg-card/60 px-4 py-2.5 text-xs font-medium uppercase tracking-[0.14em] text-muted">{group}</div>
                {keys.map((k) => {
                  const values = products.map((p) => specValue(p, k));
                  const differs = new Set(values).size > 1;
                  return (
                    <div key={k} className="grid border-b border-border text-sm last:border-0" style={cols}>
                      <div className="p-4 text-muted">{k}</div>
                      {values.map((v, i) => <div key={products[i].id} className={`border-l border-border p-4 ${differs ? "text-foreground" : "text-foreground/70"}`}>{v}</div>)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
