import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Circle, Printer, XCircle } from "lucide-react";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/sidebar";
import { OrderActions } from "@/components/admin/order-actions";
import { OrderStatusBadge } from "@/components/account/order-status";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatINR } from "@/lib/format";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Order" };
export const dynamic = "force-dynamic";

export default async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.order.findUnique({
    where: { id },
    include: { user: { select: { id: true, name: true, email: true, phone: true, _count: { select: { orders: true } } } }, items: true, payments: { orderBy: { createdAt: "asc" } }, inventoryTxns: { orderBy: { createdAt: "asc" }, include: { product: { select: { name: true } } } }, rewardTxns: { orderBy: { createdAt: "asc" } } },
  });
  if (!o) notFound();
  const steps = [
    ["Placed", o.placedAt], ["Confirmed", o.confirmedAt], ["Packed", o.packedAt], ["Shipped", o.shippedAt], ["Out for delivery", o.outForDeliveryAt], ["Delivered", o.deliveredAt],
  ] as const;
  const history = o.status === "CANCELLED" ? [...steps.filter(([, at]) => at), ["Cancelled", o.cancelledAt] as const] : steps;

  return (
    <div>
      <Link href="/admin/orders" className="mb-3 inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"><ArrowLeft className="size-4" /> Orders</Link>
      <PageHeader title={o.orderNumber} description={`Placed ${formatDateTime(o.placedAt)}`} actions={<><OrderStatusBadge status={o.status} /><Button asChild size="sm" variant="secondary"><Link href={`/invoice/${o.orderNumber}`} target="_blank"><Printer /> Invoice</Link></Button></>} />
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="rounded-2xl bg-card hairline">
            <h2 className="p-5 font-medium">Items</h2>
            <ul className="divide-y divide-border border-t border-border">
              {o.items.map((it) => (
                <li key={it.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                  <div className="relative size-12 shrink-0 overflow-hidden rounded-lg bg-surface">{it.image && <Image src={it.image} alt="" fill sizes="48px" className="object-cover" />}</div>
                  <div className="min-w-0 flex-1">{it.productId ? <Link href={`/admin/products/${it.productId}`} className="font-medium hover:text-accent">{it.name}</Link> : <span className="font-medium">{it.name}</span>}<p className="text-xs text-muted">{it.sku}{it.color && ` · ${it.color}`} · {formatINR(it.unitPrice.toString())} × {it.quantity}</p></div>
                  <span className="tabular">{formatINR(it.lineTotal.toString())}</span>
                </li>
              ))}
            </ul>
            <dl className="space-y-1.5 border-t border-border p-5 text-sm">
              {[
                ["Subtotal", formatINR(o.subtotal.toString())],
                ...(Number(o.discountTotal) > 0 ? [[`Coupon ${o.couponCode ?? ""}`, `−${formatINR(o.discountTotal.toString())}`]] : []),
                ...(Number(o.pointsDiscount) > 0 ? [[`Reward points (${o.pointsRedeemed})`, `−${formatINR(o.pointsDiscount.toString())}`]] : []),
                [`Shipping (${o.deliveryMethod.toLowerCase()})`, Number(o.shippingFee) ? formatINR(o.shippingFee.toString()) : "Free"],
                ["GST included", formatINR(o.taxTotal.toString(), true)],
              ].map(([k, v]) => <div key={k} className="flex justify-between text-muted"><dt>{k}</dt><dd className="tabular">{v}</dd></div>)}
              <div className="flex justify-between pt-2 text-base font-medium"><dt>Total</dt><dd className="tabular">{formatINR(o.total.toString())}</dd></div>
            </dl>
          </section>

          <section className="rounded-2xl bg-card p-5 hairline">
            <h2 className="mb-4 font-medium">Status history</h2>
            <ol className="space-y-3">
              {history.map(([label, at]) => (
                <li key={label} className="flex items-center gap-3 text-sm">
                  {label === "Cancelled" ? <XCircle className="size-4 text-danger" /> : at ? <CheckCircle2 className="size-4 text-success" /> : <Circle className="size-4 text-subtle" />}
                  <span className={at ? "" : "text-subtle"}>{label}</span>
                  <span className="ml-auto text-xs text-muted">{at ? formatDateTime(at) : "—"}</span>
                </li>
              ))}
            </ol>
            {o.cancelReason && <p className="mt-4 rounded-xl bg-danger/10 p-3 text-sm text-danger">Reason: {o.cancelReason}</p>}
          </section>

          <section className="rounded-2xl bg-card p-5 hairline">
            <h2 className="mb-4 font-medium">Payments</h2>
            {o.payments.length === 0 ? <p className="text-sm text-muted">No payment records.</p> : (
              <ul className="space-y-2 text-sm">
                {o.payments.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl p-3 hairline">
                    <span className="font-medium">{p.method.replaceAll("_", " ")}</span>
                    <Badge variant={p.status === "CAPTURED" ? "success" : p.status === "FAILED" ? "danger" : p.status === "REFUNDED" ? "default" : "warning"}>{p.status.toLowerCase()}</Badge>
                    <span className="text-xs text-muted">{p.provider}{p.providerPaymentId && ` · ${p.providerPaymentId}`}</span>
                    {p.failureReason && <span className="w-full text-xs text-danger">{p.failureReason}</span>}
                    <span className="ml-auto tabular">{formatINR(p.amount.toString())}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl bg-card p-5 hairline">
            <h2 className="mb-4 font-medium">Inventory & rewards ledger</h2>
            <ul className="space-y-1.5 font-mono text-xs">
              {o.inventoryTxns.map((t) => <li key={t.id} className="flex justify-between gap-3"><span><span className={t.change > 0 ? "text-success" : "text-danger"}>{t.change > 0 ? "+" : ""}{t.change}</span> {t.product.name} <span className="text-muted">({t.reason.toLowerCase()})</span></span><span className="text-muted">stock → {t.stockAfter}</span></li>)}
              {o.rewardTxns.map((t) => <li key={t.id} className="flex justify-between gap-3"><span><span className={t.points > 0 ? "text-success" : "text-danger"}>{t.points > 0 ? "+" : ""}{t.points} pts</span> <span className="text-muted">{t.description}</span></span></li>)}
              {o.inventoryTxns.length + o.rewardTxns.length === 0 && <li className="text-muted">No ledger entries.</li>}
            </ul>
          </section>
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl bg-card p-5 hairline"><h2 className="mb-4 font-medium">Fulfilment</h2><OrderActions orderId={o.id} status={o.status} /></section>
          <section className="rounded-2xl bg-card p-5 text-sm hairline">
            <h2 className="mb-3 font-medium">Customer</h2>
            <p>{o.user.name}</p><p className="text-muted">{o.user.email}</p>{o.user.phone && <p className="text-muted">{o.user.phone}</p>}
            <p className="mt-2 text-xs text-subtle">{o.user._count.orders} orders total</p>
          </section>
          <section className="rounded-2xl bg-card p-5 text-sm hairline">
            <h2 className="mb-3 font-medium">Ship to</h2>
            <address className="not-italic leading-relaxed text-muted"><span className="text-foreground">{o.shipName}</span><br />{o.shipLine1}{o.shipLine2 && <>, {o.shipLine2}</>}<br />{o.shipCity}, {o.shipState} {o.shipPincode}<br />{o.shipPhone}</address>
            {o.notes && <p className="mt-3 rounded-lg bg-white/4 p-2 text-xs">Note: {o.notes}</p>}
          </section>
        </div>
      </div>
    </div>
  );
}
