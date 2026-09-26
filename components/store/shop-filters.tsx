"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { SlidersHorizontal, X, Star, Loader2 } from "lucide-react";
import * as D from "@radix-ui/react-dialog";
import { SheetContent } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";

type Opt = { name: string; slug: string; count: number };
type Facet = { key: string; values: { value: string; count: number }[] };

export type FiltersProps = {
  categories: Opt[];
  brands: Opt[];
  specFacets: Facet[];
  bounds: { min: number; max: number };
  total: number;
};

const SORTS = [
  ["featured", "Featured"],
  ["newest", "Newest"],
  ["price-asc", "Price: Low to High"],
  ["price-desc", "Price: High to Low"],
  ["rating", "Best Rated"],
  ["popular", "Most Popular"],
] as const;

function useQueryUpdater() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();
  const update = (mut: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(params.toString());
    mut(p);
    p.delete("page");
    start(() => router.push(`${pathname}?${p.toString()}`, { scroll: false }));
  };
  return { params, update, pending };
}

function toggleList(p: URLSearchParams, key: string, value: string) {
  const cur = (p.get(key) ?? "").split(",").filter(Boolean);
  const next = cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value];
  if (next.length) p.set(key, next.join(","));
  else p.delete(key);
}

function Check({ checked, label, count, onChange }: { checked: boolean; label: string; count?: number; onChange: () => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 rounded-lg px-1 py-1.5 text-sm text-foreground/85 hover:text-foreground">
      <input type="checkbox" checked={checked} onChange={onChange} className="peer sr-only" />
      <span className={cn("grid size-4 place-items-center rounded-[5px] border transition peer-focus-visible:ring-2 peer-focus-visible:ring-accent", checked ? "border-accent bg-accent" : "border-border-strong")}>
        {checked && <svg viewBox="0 0 12 12" className="size-2.5 text-white"><path d="M2 6.5 4.5 9 10 3" fill="none" stroke="currentColor" strokeWidth="2" /></svg>}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && <span className="text-xs text-subtle tabular">{count}</span>}
    </label>
  );
}

function FilterBody({ categories, brands, specFacets, bounds }: FiltersProps) {
  const { params, update } = useQueryUpdater();
  const list = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
  const [price, setPrice] = useState<[number, number]>([Number(params.get("min") ?? bounds.min), Number(params.get("max") ?? bounds.max)]);
  useEffect(() => setPrice([Number(params.get("min") ?? bounds.min), Number(params.get("max") ?? bounds.max)]), [params, bounds]);
  const rating = Number(params.get("rating") ?? 0);
  const discount = Number(params.get("discount") ?? 0);

  return (
    <Accordion type="multiple" defaultValue={["category", "brand", "price", "rating", "availability", "discount", ...specFacets.slice(0, 2).map((f) => `spec_${f.key}`)]}>
      <AccordionItem value="category">
        <AccordionTrigger>Category</AccordionTrigger>
        <AccordionContent>
          {categories.map((c) => <Check key={c.slug} label={c.name} count={c.count} checked={list("category").includes(c.slug)} onChange={() => update((p) => toggleList(p, "category", c.slug))} />)}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="brand">
        <AccordionTrigger>Brand</AccordionTrigger>
        <AccordionContent className="max-h-64 overflow-y-auto">
          {brands.map((b) => <Check key={b.slug} label={b.name} count={b.count} checked={list("brand").includes(b.slug)} onChange={() => update((p) => toggleList(p, "brand", b.slug))} />)}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="price">
        <AccordionTrigger>Price</AccordionTrigger>
        <AccordionContent>
          <div className="px-1 pt-2">
            <Slider
              min={bounds.min}
              max={bounds.max}
              step={500}
              value={price}
              onValueChange={(v) => setPrice([v[0], v[1]])}
              onValueCommit={(v) =>
                update((p) => {
                  if (v[0] > bounds.min) p.set("min", String(v[0]));
                  else p.delete("min");
                  if (v[1] < bounds.max) p.set("max", String(v[1]));
                  else p.delete("max");
                })
              }
            />
            <div className="mt-3 flex justify-between text-xs text-muted tabular">
              <span>{formatINR(price[0])}</span>
              <span>{formatINR(price[1])}</span>
            </div>
          </div>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="rating">
        <AccordionTrigger>Customer rating</AccordionTrigger>
        <AccordionContent>
          {[4, 3].map((r) => (
            <label key={r} className="flex cursor-pointer items-center gap-2.5 px-1 py-1.5 text-sm">
              <input type="radio" name="rating" checked={rating === r} onChange={() => update((p) => (rating === r ? p.delete("rating") : p.set("rating", String(r))))} onClick={() => rating === r && update((p) => p.delete("rating"))} className="accent-[#7C5CFC]" />
              <span className="flex items-center gap-1">{r}<Star className="size-3.5 fill-[#f5c451] text-[#f5c451]" /> & up</span>
            </label>
          ))}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="availability">
        <AccordionTrigger>Availability</AccordionTrigger>
        <AccordionContent>
          <Check label="In stock only" checked={params.get("inStock") === "1"} onChange={() => update((p) => (p.get("inStock") ? p.delete("inStock") : p.set("inStock", "1")))} />
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="discount">
        <AccordionTrigger>Discount</AccordionTrigger>
        <AccordionContent>
          {[10, 20, 30].map((d) => (
            <label key={d} className="flex cursor-pointer items-center gap-2.5 px-1 py-1.5 text-sm">
              <input type="radio" name="discount" checked={discount === d} onChange={() => update((p) => p.set("discount", String(d)))} onClick={() => discount === d && update((p) => p.delete("discount"))} className="accent-[#7C5CFC]" />
              {d}% off or more
            </label>
          ))}
        </AccordionContent>
      </AccordionItem>
      {specFacets.map((f) => (
        <AccordionItem key={f.key} value={`spec_${f.key}`}>
          <AccordionTrigger>{f.key}</AccordionTrigger>
          <AccordionContent className="max-h-56 overflow-y-auto">
            {f.values.map((v) => (
              <Check key={v.value} label={v.value} count={v.count} checked={list(`spec_${f.key}`).includes(v.value)} onChange={() => update((p) => toggleList(p, `spec_${f.key}`, v.value))} />
            ))}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

export function ShopToolbar(props: FiltersProps) {
  const { params, update, pending } = useQueryUpdater();
  const [open, setOpen] = useState(false);
  const active: { label: string; clear: (p: URLSearchParams) => void }[] = [];
  const catMap = new Map(props.categories.map((c) => [c.slug, c.name]));
  const brandMap = new Map(props.brands.map((b) => [b.slug, b.name]));
  params.forEach((value, key) => {
    if (key === "q") active.push({ label: `“${value}”`, clear: (p) => p.delete("q") });
    else if (key === "category" || key === "brand" || key.startsWith("spec_"))
      value.split(",").filter(Boolean).forEach((v) => active.push({ label: key === "category" ? catMap.get(v) ?? v : key === "brand" ? brandMap.get(v) ?? v : v, clear: (p) => toggleList(p, key, v) }));
    else if (key === "min") active.push({ label: `Min ${formatINR(value)}`, clear: (p) => p.delete("min") });
    else if (key === "max") active.push({ label: `Max ${formatINR(value)}`, clear: (p) => p.delete("max") });
    else if (key === "rating") active.push({ label: `${value}★ & up`, clear: (p) => p.delete("rating") });
    else if (key === "inStock") active.push({ label: "In stock", clear: (p) => p.delete("inStock") });
    else if (key === "discount") active.push({ label: `${value}%+ off`, clear: (p) => p.delete("discount") });
    else if (key === "tag") active.push({ label: `#${value}`, clear: (p) => p.delete("tag") });
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <D.Root open={open} onOpenChange={setOpen}>
          <D.Trigger asChild>
            <Button variant="secondary" size="sm" className="lg:hidden"><SlidersHorizontal /> Filters{active.length ? ` (${active.length})` : ""}</Button>
          </D.Trigger>
          <SheetContent side="bottom" title="Filters">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <p className="font-semibold">Filters</p>
              <D.Close className="grid size-8 place-items-center rounded-full hover:bg-white/8" aria-label="Close filters"><X className="size-4" /></D.Close>
            </div>
            <div className="flex-1 overflow-y-auto px-5"><FilterBody {...props} /></div>
            <div className="border-t border-border p-4"><Button className="w-full" onClick={() => setOpen(false)}>Show {props.total} results</Button></div>
          </SheetContent>
        </D.Root>
        <p className="flex items-center gap-2 text-sm text-muted" aria-live="polite">
          {pending && <Loader2 className="size-3.5 animate-spin" />}
          <span className="tabular">{props.total}</span> {props.total === 1 ? "product" : "products"}
        </p>
        <label className="ml-auto flex items-center gap-2 text-sm">
          <span className="hidden text-muted sm:inline">Sort by</span>
          <select
            value={params.get("sort") ?? "featured"}
            onChange={(e) => update((p) => (e.target.value === "featured" ? p.delete("sort") : p.set("sort", e.target.value)))}
            className="h-9 rounded-full border border-border bg-surface px-3 pr-8 text-sm outline-none focus:border-accent/60"
            aria-label="Sort products"
          >
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </div>
      {active.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {active.map((a, i) => (
            <button key={i} onClick={() => update(a.clear)} className="flex items-center gap-1.5 rounded-full bg-white/6 py-1 pl-3 pr-2 text-xs hairline hover:bg-white/10 cursor-pointer">
              {a.label} <X className="size-3" />
            </button>
          ))}
          <button onClick={() => update((p) => [...p.keys()].forEach((k) => k !== "sort" && p.delete(k)))} className="text-xs text-muted underline-offset-2 hover:text-foreground hover:underline cursor-pointer">Clear all</button>
        </div>
      )}
    </div>
  );
}

export function ShopSidebar(props: FiltersProps) {
  return (
    <aside className="hidden lg:block" aria-label="Filters">
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-2">
        <FilterBody {...props} />
      </div>
    </aside>
  );
}
