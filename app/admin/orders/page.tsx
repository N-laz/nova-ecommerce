import type { Metadata } from "next";
import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/sidebar";
import { FilterPills, TableSearch } from "@/components/admin/table-search";
import { Pager } from "@/components/admin/pager";
import { OrderStatusBadge } from "@/components/account/order-status";
import { formatINR } from "@/lib/format";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Orders" };
export const dynamic = "force-dynamic";
const STATUSES = ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"] as const;

export default async function AdminOrders({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; page?: string }> }) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const take = 25;
  const status = STATUSES.includes(sp.status as OrderStatus) ? (sp.status as OrderStatus) : undefined;
  const where: Prisma.OrderWhereInput = {
    ...(status && { status }),
    ...(sp.q && { OR: [{ orderNumber: { contains: sp.q, mode: "insensitive" } }, { user: { name: { contains: sp.q, mode: "insensitive" } } }, { user: { email: { contains: sp.q, mode: "insensitive" } } }, { shipPhone: { contains: sp.q } }] }),
  };
  const [rows, total, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take, include: { user: { select: { name: true, email: true } }, payments: { orderBy: { createdAt: "desc" }, take: 1 }, _count: { select: { items: true } } } }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const c = (s: string) => counts.find((x) => x.status === s)?._count._all ?? 0;
  return (
    <div>
      <PageHeader title="Orders" description={`${total} orders`} />
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <TableSearch placeholder="Order #, customer, email, phone" />
        <FilterPills name="status" current={sp.status ?? ""} options={[["", "All"], ...STATUSES.map((s) => [s, `${s.replaceAll("_", " ").toLowerCase()} (${c(s)})`] as [string, string])]} />
      </div>
      <div className="overflow-hidden rounded-2xl bg-card hairline">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="border-b border-border text-left text-xs text-muted"><tr><th className="px-5 py-3 font-normal">Order</th><th className="font-normal">Customer</th><th className="font-normal">Placed</th><th className="font-normal">Payment</th><th className="font-normal">Status</th><th className="px-5 text-right font-normal">Total</th></tr></thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-muted">No orders match these filters.</td></tr>}
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-white/[0.015]">
                  <td className="px-5 py-3"><Link href={`/admin/orders/${o.id}`} className="font-medium hover:text-accent">{o.orderNumber}</Link><span className="block text-xs text-muted">{o._count.items} item{o._count.items > 1 ? "s" : ""}</span></td>
                  <td><span className="block">{o.user.name}</span><span className="text-xs text-muted">{o.user.email}</span></td>
                  <td className="text-muted">{formatDateTime(o.createdAt)}</td>
                  <td className="text-xs"><span className="block">{o.payments[0]?.method.replaceAll("_", " ") ?? "—"}</span><span className="text-muted">{o.payments[0]?.status.toLowerCase()}</span></td>
                  <td><OrderStatusBadge status={o.status} /></td>
                  <td className="px-5 text-right tabular">{formatINR(o.total.toString())}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pager page={page} pages={Math.ceil(total / take)} base="/admin/orders" params={{ q: sp.q, status: sp.status }} />
      </div>
    </div>
  );
}
