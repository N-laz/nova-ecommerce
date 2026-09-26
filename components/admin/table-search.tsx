"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

export function TableSearch({ placeholder = "Search…" }: { placeholder?: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");
  useEffect(() => {
    const t = setTimeout(() => {
      if ((params.get("q") ?? "") === q) return;
      const p = new URLSearchParams(params.toString());
      if (q) p.set("q", q);
      else p.delete("q");
      p.delete("page");
      router.replace(`${path}?${p}`);
    }, 300);
    return () => clearTimeout(t);
  }, [q, params, path, router]);
  return (
    <label className="relative block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="h-9 w-64 max-w-full rounded-full border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-accent/60" />
    </label>
  );
}

export function FilterPills({ name, options, current }: { name: string; options: [string, string][]; current: string }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(([v, l]) => (
        <button
          key={v}
          onClick={() => {
            const p = new URLSearchParams(params.toString());
            if (v) p.set(name, v);
            else p.delete(name);
            p.delete("page");
            router.replace(`${path}?${p}`);
          }}
          className={`rounded-full px-3 py-1.5 text-xs cursor-pointer ${current === v ? "bg-white text-black" : "text-muted hairline hover:text-foreground"}`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
