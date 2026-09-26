import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Circle, XCircle, Sparkles, Printer } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { CANCELLABLE } from "@/lib/services/order";
import { formatINR } from "@/lib/format";
import { cn, formatDate, formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/account/order-status";
import { CancelOrderButton } from "@/components/account/cancel-order";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ orderNumber: string }>; searchParams: Promise<{ placed?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `Order ${(await params).orderNumber}`, robots: { index: false } };
}

const METHOD: Record<string, string> = { UPI: "UPI", CARD: "Card", NET_BANKING: "Net Banking", COD: "Cash on Delivery", TEST: "Test Payment" };

export default async function OrderDetail({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  const { placed } = await searchParams;
  const user = await requireUserPage(`/account/orders/${orderNumber}`);
  const order = await db.order.findFirst({
    where: { orderNumber, userId: user.id },
    include: { items: { include: { product: { select: { slug: true } } } }, payments: { orderBy: { createdAt: "desc" } } },
  });
  if (!order) notFound();
  const payment = order.payments[0];

  const steps = [
    { label: "Order placed", at: order.placedAt },
    { label: "Confirmed", at: order.confirmedAt },
    { label: "Packed", at: order.packedAt },
    { label: "Shipped", at: order.shippedAt },
    { label: "Out for delivery", at: order.outForDeliveryAt },
    { label: "Delivered", at: order.deliveredAt },
  ];
  const cancelled = order.status === "CANCELLED";
  const timeline = cancelled ? [...steps.filter((s) => s.at), { label: "Cancelled", at: order.cancelledAt }] : steps;
  const canCancel = (CANCELLABLE as readonly string[]).includes(order.status);

  return (
    <div className="space-y-6">
      {placed && !cancelled && (
        <div className="flex items-start gap-3 rounded-2xl border border-success/30 bg-success/10 p-5">
          <CheckCircle2 className="mt-0.5 size-5 text-success" />
          <div>
            <p className="font-medium">Thank you — your order is {order.status === "PENDING" ? "placed" : "confirmed"}.</p>
            <p className="text-sm text-muted">We&apos;ve sent a notification with the details. {order.pointsEarned > 0 && <>You earned <strong className="text-foreground">{order.pointsEarned} NOVA points</strong>.</>}</p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/account/orders" className="text-xs text-muted hover:text-foreground">← All orders</Link>
          <h2 className="mt-1 flex items-center gap-3 text-2xl font-semibold">{order.orderNumber} <OrderStatusBadge status={order.status} /></h2>
          <p className="text-sm text-muted">Placed {formatDateTime(order.placedAt)}{!cancelled && order.status !== "DELIVERED" && order.estimatedDelivery && <> · Estimated delivery {formatDate(order.estimatedDelivery, { weekday: "short", day: "numeric", month: "short" })}</>}</p>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button asChild variant="secondary" size="sm"><Link href={`/invoice/${order.orderNumber}`} target="_blank"><Printer /> Invoice</Link></Button>
          {canCancel && <CancelOrderButton orderNumber={order.orderNumber} prepaid={payment?.method !== "COD" && payment?.status === "CAPTURED"} />}
        </div>
      </div>

      <section className="rounded-2xl bg-card p-5 hairline md:p-6">
        <h3 className="mb-5 font-medium">Tracking</h3>
        <ol className="relative grid gap-0 md:grid-cols-6">
          {timeline.map((s, i) => {
            const done = !!s.at;
            const isCancel = s.label === "Cancelled";
            return (
              <li key={s.label} className="relative flex gap-3 pb-6 md:flex-col md:items-center md:pb-0 md:text-center">
                {i < timeline.length - 1 && <span className={cn("absolute left-[11px] top-6 h-[calc(100%-24px)] w-px md:left-1/2 md:top-[11px] md:h-px md:w-full", done && timeline[i + 1]?.at ? "bg-success" : "bg-border")} />}
                <span className="relative z-10 bg-card">
                  {isCancel ? <XCircle className="size-6 text-danger" /> : done ? <CheckCircle2 className="size-6 text-success" /> : <Circle className="size-6 text-border-strong" />}
                </span>
                <div className="md:mt-2">
                  <p className={cn("text-sm", !done && "text-muted")}>{s.label}</p>
                  {s.at && <p className="text-xs text-muted">{formatDate(s.at, { day: "numeric", month: "short" })}, {new Date(s.at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" })}</p>}
                </div>
              </li>
            );
          })}
        </ol>
        {cancelled && order.cancelReason && <p className="mt-5 rounded-xl bg-danger/10 p-3 text-sm text-foreground/85">Cancellation reason: {order.cancelReason}</p>}
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="rounded-2xl bg-card p-5 hairline">
          <h3 className="mb-2 font-medium">Items</h3>
          <ul className="divide-y divide-border">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center gap-4 py-4">
                <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-surface hairline">{it.image && <Image src={it.image} alt="" fill sizes="64px" className="object-cover" />}</div>
                <div className="min-w-0 flex-1 text-sm">
                  {it.product ? <Link href={`/product/${it.product.slug}`} className="font-medium hover:text-white/80">{it.name}</Link> : <p className="font-medium">{it.name}</p>}
                  <p className="text-xs text-muted">{it.color && `${it.color} · `}Qty {it.quantity} · {formatINR(it.unitPrice.toString())} each</p>
                  {order.status === "DELIVERED" && it.product && <Link href={`/product/${it.product.slug}#reviews`} className="mt-1 inline-block text-xs text-accent hover:underline">Write a review</Link>}
                </div>
                <p className="text-sm tabular">{formatINR(it.lineTotal.toString())}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-6">
          <section className="space-y-2 rounded-2xl bg-card p-5 text-sm hairline">
            <h3 className="mb-3 font-medium">Payment summary</h3>
            <Row label="Subtotal" value={formatINR(order.subtotal.toString(), true)} />
            {order.discountTotal.gt(0) && <Row label={`Coupon ${order.couponCode ?? ""}`} value={`−${formatINR(order.discountTotal.toString(), true)}`} className="text-success" />}
            {order.pointsDiscount.gt(0) && <Row label={`Points (${order.pointsRedeemed})`} value={`−${formatINR(order.pointsDiscount.toString(), true)}`} className="text-success" />}
            <Row label={`Shipping (${order.deliveryMethod === "EXPRESS" ? "Express" : "Standard"})`} value={order.shippingFee.gt(0) ? formatINR(order.shippingFee.toString(), true) : "Free"} />
            <Row label="Includes GST (18%)" value={formatINR(order.taxTotal.toString(), true)} className="text-muted" />
            <div className="flex justify-between border-t border-border pt-3 text-base font-semibold"><span>Total</span><span className="tabular">{formatINR(order.total.toString(), true)}</span></div>
            {payment && (
              <p className="pt-2 text-xs text-muted">
                {METHOD[payment.method]} · <span className={cn(payment.status === "CAPTURED" && "text-success", payment.status === "FAILED" && "text-danger")}>{payment.status.toLowerCase()}</span>
                {payment.providerPaymentId && <> · Ref {payment.providerPaymentId}</>}
              </p>
            )}
            {order.pointsEarned > 0 && !cancelled && <p className="flex items-center gap-1.5 pt-1 text-xs text-[#b3a1ff]"><Sparkles className="size-3.5" /> {order.pointsEarned} points earned</p>}
          </section>
          <section className="rounded-2xl bg-card p-5 text-sm hairline">
            <h3 className="mb-3 font-medium">Delivery address</h3>
            <p>{order.shipName}</p>
            <p className="text-muted">{order.shipLine1}{order.shipLine2 && `, ${order.shipLine2}`}</p>
            <p className="text-muted">{order.shipCity}, {order.shipState} – {order.shipPincode}</p>
            <p className="text-muted">+91 {order.shipPhone}</p>
            {order.notes && <p className="mt-3 text-xs text-muted">Note: {order.notes}</p>}
          </section>
          {!canCancel && !cancelled && order.status !== "DELIVERED" && <p className="text-xs text-muted">This order has been packed and can no longer be cancelled. You can request a return after delivery.</p>}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return <div className={cn("flex justify-between", className)}><span className="text-muted">{label}</span><span className="tabular">{value}</span></div>;
}
