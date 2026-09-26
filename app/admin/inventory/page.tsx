import type { Metadata } from "next";
import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getInventoryStats } from "@/lib/services/analytics";
import { PageHeader } from "@/components/admin/sidebar";
import { FilterPills, TableSearch } from "@/components/admin/table-search";
import { StockAdjust } from "@/components/admin/stock-adjust";
import { Pager } from "@/components/admin/pager";
import { formatINR } from "@/lib/format";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Inventory" };
export const dynamic = "force-dynamic";

export default async function Inventory({ searchParams }: { searchParams: Promise<{ q?: string; level?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const take = 20;
  let ids: string[] | undefined;
  if (sp.level === "low") ids = (await db.$queryRaw<{ id: string }[]>`SELECT id FROM "Product" WHERE stock > 0 AND stock <= "lowStockThreshold"`).map((r) => r.id);
  const where: Prisma.ProductWhereInput = {
    ...(sp.level === "out" && { stock: 0 }),
    ...(ids && { id: { in: ids } }),
    ...(sp.q && { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { sku: { contains: sp.q, mode: "insensitive" } }] }),
  };
  const [stats, rows, total, ledger] = await Promise.all([
    getInventoryStats(),
    db.product.findMany({ where, orderBy: [{ stock: "asc" }, { name: "asc" }], skip: (page - 1) * take, take, select: { id: true, name: true, sku: true, stock: true, lowStockThreshold: true, price: true, costPrice: true, status: true } }),
    db.product.count({ where }),
    db.inventoryTransaction.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { product: { select: { name: true, id: true } }, order: { select: { orderNumber: true, id: true } }, actor: { select: { name: true } } } }),
  ]);

  const cards = [
    ["Units in stock", stats.totalUnits.toLocaleString("en-IN"), `${stats.skus} SKUs`],
    ["Low stock", String(stats.lowStock), "At or below alert level"],
    ["Out of stock", String(stats.outOfStock), "Unavailable to buy"],
    ["Inventory value", formatINR(stats.value), "At cost (or price)"],
  ];

  return (
    <div>
      <PageHeader title="Inventory" description="Stock levels and the complete movement ledger." />
      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        {cards.map(([l, v, s], i) => (
          <div key={l} className="rounded-2xl bg-card p-5 hairline">
            <p className="text-xs text-muted">{l}</p>
            <p className={cn("mt-2 text-2xl font-semibold tabular", i === 1 && stats.lowStock > 0 && "text-warning", i === 2 && stats.outOfStock > 0 && "text-danger")}>{v}</p>
            <p className="mt-1 text-xs text-subtle">{s}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 2xl:grid-cols-[1fr_420px]">
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <TableSearch placeholder="Search name or SKU" />
            <FilterPills name="level" current={sp.level ?? ""} options={[["", "All"], ["low", `Low (${stats.lowStock})`], ["out", `Out (${stats.outOfStock})`]]} />
          </div>
          <div className="overflow-hidden rounded-2xl bg-card hairline">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="border-b border-border text-left text-xs text-muted"><tr><th className="px-5 py-3 font-normal">Product</th><th className="font-normal">SKU</th><th className="text-right font-normal">Stock</th><th className="text-right font-normal">Value</th><th /></tr></thead>
                <tbody className="divide-y divide-border">
                  {rows.length === 0 && <tr><td colSpan={5} className="py-12 text-center text-muted">Nothing here — stock levels look healthy.</td></tr>}
                  {rows.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-2.5"><Link href={`/admin/products/${p.id}`} className="hover:text-accent">{p.name}</Link>{p.status !== "PUBLISHED" && <span className="ml-2 text-xs text-subtle">{p.status.toLowerCase()}</span>}</td>
                      <td className="font-mono text-xs text-muted">{p.sku}</td>
                      <td className="text-right"><span className={cn("tabular", p.stock === 0 ? "text-danger" : p.stock <= p.lowStockThreshold ? "text-warning" : "")}>{p.stock}</span><span className="block text-[11px] text-subtle">alert ≤ {p.lowStockThreshold}</span></td>
                      <td className="text-right tabular text-muted">{formatINR(Number(p.costPrice ?? p.price) * p.stock)}</td>
                      <td className="pr-3 text-right"><StockAdjust productId={p.id} name={p.name} stock={p.stock} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pager page={page} pages={Math.ceil(total / take)} base="/admin/inventory" params={{ q: sp.q, level: sp.level }} />
          </div>
        </div>
        <section className="h-fit rounded-2xl bg-card hairline">
          <h2 className="p-5 font-medium">Recent movements</h2>
          <ul className="divide-y divide-border border-t border-border">
            {ledger.map((t) => (
              <li key={t.id} className="flex items-start gap-3 px-5 py-2.5 text-sm">
                <span className={cn("w-12 shrink-0 font-mono tabular", t.change > 0 ? "text-success" : "text-danger")}>{t.change > 0 ? "+" : ""}{t.change}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate">{t.product.name}</p>
                  <p className="text-xs text-muted">
                    {t.reason[0] + t.reason.slice(1).toLowerCase()}
                    {t.order && <> · <Link href={`/admin/orders/${t.order.id}`} className="hover:text-foreground">{t.order.orderNumber}</Link></>}
                    {t.note && ` · ${t.note}`}
                    {t.actor && ` · ${t.actor.name}`}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-muted"><span className="block tabular">→ {t.stockAfter}</span>{timeAgo(t.createdAt)}</div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
