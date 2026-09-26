import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Package } from "lucide-react";
import type { OrderStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatINR } from "@/lib/format";
import { cn, formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/account/order-status";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

const FILTERS: [string, string, OrderStatus[] | null][] = [
  ["all", "All", null],
  ["active", "In progress", ["PENDING", "CONFIRMED", "PACKED", "SHIPPED", "OUT_FOR_DELIVERY"]],
  ["delivered", "Delivered", ["DELIVERED"]],
  ["cancelled", "Cancelled", ["CANCELLED"]],
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const user = await requireUserPage("/account/orders");
  const sp = await searchParams;
  const filter = FILTERS.find((f) => f[0] === sp.status) ?? FILTERS[0];
  const page = Math.max(1, Number(sp.page) || 1);
  const take = 10;
  const where = { userId: user.id, ...(filter[2] && { status: { in: filter[2] } }) };
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { placedAt: "desc" }, skip: (page - 1) * take, take, include: { items: { select: { name: true, image: true, quantity: true } } } }),
    db.order.count({ where }),
  ]);
  const pages = Math.ceil(total / take);

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold">Orders</h2>
      <div className="no-scrollbar mb-5 flex gap-2 overflow-x-auto">
        {FILTERS.map(([id, label]) => (
          <Link key={id} href={id === "all" ? "/account/orders" : `/account/orders?status=${id}`} className={cn("shrink-0 rounded-full px-3.5 py-1.5 text-sm", filter[0] === id ? "bg-white text-black" : "text-muted hairline hover:text-foreground")}>{label}</Link>
        ))}
      </div>
      {orders.length === 0 ? (
        <EmptyState icon={<Package />} title={filter[0] === "all" ? "No orders yet" : "No orders here"} description={filter[0] === "all" ? "Your orders will appear here once you check out." : "Try a different filter."} action={<Button asChild><Link href="/shop">Explore Products</Link></Button>} />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-2xl bg-card hairline">
              <Link href={`/account/orders/${o.orderNumber}`} className="block p-4 transition hover:bg-white/[0.02] md:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="font-medium">{o.orderNumber}</span>
                    <span className="text-muted">{formatDate(o.placedAt)}</span>
                  </div>
                  <OrderStatusBadge status={o.status} />
                </div>
                <div className="flex items-center gap-4 pt-3">
                  <div className="flex -space-x-3">
                    {o.items.slice(0, 3).map((it, i) => <div key={i} className="relative size-14 overflow-hidden rounded-xl bg-surface ring-2 ring-card">{it.image && <Image src={it.image} alt="" fill sizes="56px" className="object-cover" />}</div>)}
                  </div>
                  <p className="min-w-0 flex-1 truncate text-sm text-muted">{o.items.map((i) => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ""}`).join(", ")}</p>
                  <p className="font-medium tabular">{formatINR(o.total.toString())}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="mt-6 flex justify-center gap-2" aria-label="Pagination">
          {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
            <Link key={n} href={`/account/orders?${new URLSearchParams({ ...(sp.status && { status: sp.status }), page: String(n) })}`} className={cn("grid size-9 place-items-center rounded-full text-sm", n === page ? "bg-white text-black" : "text-muted hairline")}>{n}</Link>
          ))}
        </nav>
      )}
    </div>
  );
}
