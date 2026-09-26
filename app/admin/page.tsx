import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { getDashboardAnalytics, RANGES, type Range } from "@/lib/services/analytics";
import { PageHeader } from "@/components/admin/sidebar";
import { CustomersChart, OrdersChart, RevenueChart } from "@/components/admin/charts";
import { OrderStatusBadge } from "@/components/account/order-status";
import { formatCompact, formatINR } from "@/lib/format";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

function Change({ v }: { v: number | null }) {
  if (v === null) return <span className="text-xs text-subtle">No prior data</span>;
  const up = v >= 0;
  return <span className={cn("inline-flex items-center gap-0.5 text-xs tabular", up ? "text-success" : "text-danger")}>{up ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}{Math.abs(v).toFixed(1)}%</span>;
}

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const { range: raw } = await searchParams;
  const range: Range = (RANGES.find((r) => r.value === raw)?.value ?? "30d") as Range;
  const a = await getDashboardAnalytics(range);
  const maxProduct = Math.max(1, ...a.topProducts.map((p) => p.revenue));
  const maxCat = Math.max(1, ...a.topCategories.map((p) => p.revenue));
  const rangeLabel = RANGES.find((r) => r.value === range)!.label;

  const kpis = [
    { label: "Revenue", value: formatINR(a.kpis.revenue.value), change: a.kpis.revenue.change },
    { label: "Orders", value: a.kpis.orders.value.toLocaleString("en-IN"), change: a.kpis.orders.change },
    { label: "Customers", value: a.kpis.customers.value.toLocaleString("en-IN"), sub: `+${a.kpis.customers.newInRange} new`, change: a.kpis.customers.change },
    { label: "Products", value: a.kpis.products.value.toLocaleString("en-IN"), sub: `${a.kpis.products.published} published` },
    { label: "Avg. order value", value: formatINR(a.kpis.aov.value), change: a.kpis.aov.change },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Live store performance · ${rangeLabel} vs previous period · cancelled orders excluded`}
        actions={
          <div className="flex rounded-full p-1 hairline" role="tablist" aria-label="Date range">
            {RANGES.map((r) => (
              <Link key={r.value} href={`/admin?range=${r.value}`} role="tab" aria-selected={r.value === range} className={cn("rounded-full px-3 py-1 text-xs", r.value === range ? "bg-white text-black" : "text-muted hover:text-foreground")}>{r.label}</Link>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-2xl bg-card p-5 hairline">
            <p className="text-xs text-muted">{k.label}</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight tabular">{k.value}</p>
            <div className="mt-1 flex items-center gap-2">{"change" in k && <Change v={k.change ?? null} />}{k.sub && <span className="text-xs text-subtle">{k.sub}</span>}</div>
          </div>
        ))}
      </div>

      <section className="rounded-2xl bg-card p-5 hairline">
        <div className="mb-4 flex items-baseline justify-between"><h2 className="font-medium">Revenue over time</h2><span className="text-xs text-muted">{formatINR(a.kpis.revenue.value)} total</span></div>
        <RevenueChart data={a.timeline} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-card p-5 hairline"><h2 className="mb-4 font-medium">Order volume</h2><OrdersChart data={a.timeline} /></section>
        <section className="rounded-2xl bg-card p-5 hairline"><h2 className="mb-4 font-medium">Customer growth</h2><CustomersChart data={a.timeline} /></section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {[
          ["Top products", a.topProducts, maxProduct],
          ["Top categories", a.topCategories, maxCat],
        ].map(([title, rows, max]) => (
          <section key={title as string} className="rounded-2xl bg-card p-5 hairline">
            <h2 className="mb-4 font-medium">{title as string}</h2>
            {(rows as typeof a.topProducts).length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No sales in this period.</p>
            ) : (
              <ul className="space-y-3">
                {(rows as typeof a.topProducts).map((r) => (
                  <li key={r.name} className="text-sm">
                    <div className="flex justify-between gap-3"><span className="truncate">{r.name}</span><span className="shrink-0 tabular text-muted">{r.units} units · ₹{formatCompact(r.revenue)}</span></div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/6"><div className="h-full rounded-full bg-accent" style={{ width: `${(r.revenue / (max as number)) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl bg-card hairline">
          <div className="flex items-center justify-between p-5"><h2 className="font-medium">Recent orders</h2><Link href="/admin/orders" className="text-xs text-muted hover:text-foreground">View all</Link></div>
          <ul className="divide-y divide-border border-t border-border">
            {a.recentOrders.map((o) => (
              <li key={o.id}>
                <Link href={`/admin/orders/${o.id}`} className="flex items-center gap-4 px-5 py-3 text-sm hover:bg-white/[0.02]">
                  <span className="w-28 font-medium">{o.orderNumber}</span>
                  <span className="flex-1 truncate text-muted">{o.user.name}</span>
                  <span className="hidden text-xs text-subtle sm:inline">{timeAgo(o.createdAt)}</span>
                  <OrderStatusBadge status={o.status} />
                  <span className="w-24 text-right tabular">{formatINR(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl bg-card p-5 hairline">
          <h2 className="mb-4 font-medium">Orders by status</h2>
          {a.statusBreakdown.length === 0 ? <p className="text-sm text-muted">No orders in this period.</p> : (
            <ul className="space-y-2.5 text-sm">
              {a.statusBreakdown.sort((x, y) => y.count - x.count).map((s) => (
                <li key={s.status} className="flex items-center justify-between"><OrderStatusBadge status={s.status} /><span className="tabular">{s.count}</span></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
