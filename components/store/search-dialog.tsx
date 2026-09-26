"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search, ArrowUpRight, Loader2, TrendingUp, LayoutGrid, Tag } from "lucide-react";
import * as D from "@radix-ui/react-dialog";
import { formatINR } from "@/lib/format";
import { useStore } from "./store-provider";

const POPULAR = ["headphones", "laptops", "smartphones", "gaming mouse", "smartwatch", "mechanical keyboard"];

type Results = {
  products: { id: string; slug: string; name: string; brand: string; price: string; compareAtPrice: string | null; image: string | null }[];
  categories: { name: string; slug: string }[];
  brands: { name: string; slug: string }[];
};

export function SearchDialog() {
  const { searchOpen, setSearchOpen } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setData(null);
      setError(null);
      return;
    }
    const t = setTimeout(async () => {
      abort.current?.abort();
      const ctrl = new AbortController();
      abort.current = ctrl;
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Search failed");
        setData(json);
        setError(null);
      } catch (e) {
        if ((e as Error).name !== "AbortError") setError("Search is unavailable right now. Please try again.");
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => clearTimeout(t);
  }, [q]);

  function go(href: string) {
    setSearchOpen(false);
    router.push(href);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (q.trim()) go(`/shop?q=${encodeURIComponent(q.trim())}`);
  }

  const empty = data && !data.products.length && !data.categories.length && !data.brands.length;

  return (
    <D.Root open={searchOpen} onOpenChange={(o) => { setSearchOpen(o); if (!o) setQ(""); }}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
        <D.Content className="fixed left-1/2 top-[8vh] z-50 w-[calc(100%-1.5rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-2xl border border-border bg-card shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-2 duration-200">
          <D.Title className="sr-only">Search NOVA</D.Title>
          <form onSubmit={submit} className="flex items-center gap-3 border-b border-border px-5">
            <Search className="size-5 text-muted" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search products, brands and categories"
              className="h-14 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
              aria-label="Search"
              maxLength={80}
            />
            {loading && <Loader2 className="size-4 animate-spin text-muted" />}
            <kbd className="hidden rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[10px] text-muted sm:block">ESC</kbd>
          </form>

          <div className="max-h-[65vh] overflow-y-auto p-3">
            {q.trim().length < 2 ? (
              <div className="p-2">
                <p className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.14em] text-muted"><TrendingUp className="size-3.5" /> Popular searches</p>
                <div className="flex flex-wrap gap-2">
                  {POPULAR.map((p) => (
                    <button key={p} onClick={() => go(`/shop?q=${encodeURIComponent(p)}`)} className="rounded-full bg-white/5 px-3.5 py-1.5 text-sm hairline transition hover:bg-white/10 cursor-pointer">
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            ) : error ? (
              <p className="p-6 text-center text-sm text-danger">{error}</p>
            ) : empty ? (
              <div className="p-8 text-center">
                <p className="text-sm">No results for &ldquo;{q}&rdquo;</p>
                <p className="mt-1 text-xs text-muted">Try a broader term like &ldquo;headphones&rdquo; or &ldquo;laptop&rdquo;.</p>
              </div>
            ) : data ? (
              <div className="space-y-4">
                {data.products.length > 0 && (
                  <section>
                    <p className="px-2 pb-2 text-xs uppercase tracking-[0.14em] text-muted">Products</p>
                    <ul>
                      {data.products.map((p) => (
                        <li key={p.id}>
                          <Link href={`/product/${p.slug}`} onClick={() => setSearchOpen(false)} className="flex items-center gap-3 rounded-xl p-2 transition hover:bg-white/5">
                            <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface">
                              {p.image && <Image src={p.image} alt="" fill sizes="48px" className="object-cover" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm">{p.name}</p>
                              <p className="text-xs text-muted">{p.brand}</p>
                            </div>
                            <span className="text-sm tabular">{formatINR(p.price)}</span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {(data.categories.length > 0 || data.brands.length > 0) && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {data.categories.length > 0 && (
                      <section>
                        <p className="px-2 pb-2 text-xs uppercase tracking-[0.14em] text-muted">Categories</p>
                        {data.categories.map((c) => (
                          <button key={c.slug} onClick={() => go(`/shop?category=${c.slug}`)} className="flex w-full items-center gap-2 rounded-xl p-2 text-sm hover:bg-white/5 cursor-pointer">
                            <LayoutGrid className="size-4 text-muted" /> {c.name}
                          </button>
                        ))}
                      </section>
                    )}
                    {data.brands.length > 0 && (
                      <section>
                        <p className="px-2 pb-2 text-xs uppercase tracking-[0.14em] text-muted">Brands</p>
                        {data.brands.map((b) => (
                          <button key={b.slug} onClick={() => go(`/shop?brand=${b.slug}`)} className="flex w-full items-center gap-2 rounded-xl p-2 text-sm hover:bg-white/5 cursor-pointer">
                            <Tag className="size-4 text-muted" /> {b.name}
                          </button>
                        ))}
                      </section>
                    )}
                  </div>
                )}
                <button onClick={() => go(`/shop?q=${encodeURIComponent(q.trim())}`)} className="flex w-full items-center justify-between rounded-xl bg-white/4 px-3 py-2.5 text-sm hover:bg-white/8 cursor-pointer">
                  See all results for &ldquo;{q.trim()}&rdquo; <ArrowUpRight className="size-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2 p-2">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-14" />)}</div>
            )}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
