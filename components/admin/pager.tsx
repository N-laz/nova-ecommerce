import Link from "next/link";

export function Pager({ page, pages, base, params }: { page: number; pages: number; base: string; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (n: number) => {
    const p = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]);
    p.set("page", String(n));
    return `${base}?${p}`;
  };
  return (
    <nav className="flex items-center justify-between px-5 py-3 text-sm" aria-label="Pagination">
      <span className="text-muted">Page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link href={href(page - 1)} className="rounded-full px-3 py-1 hairline hover:bg-white/5">Previous</Link>}
        {page < pages && <Link href={href(page + 1)} className="rounded-full px-3 py-1 hairline hover:bg-white/5">Next</Link>}
      </div>
    </nav>
  );
}
