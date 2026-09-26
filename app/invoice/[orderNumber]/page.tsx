import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatINR } from "@/lib/format";
import { formatDate } from "@/lib/utils";
import { PrintButton } from "@/components/shared/print-button";

export const metadata: Metadata = { title: "Invoice", robots: { index: false } };

export default async function Invoice({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const user = await requireUserPage(`/invoice/${orderNumber}`);
  const order = await db.order.findFirst({ where: { orderNumber, ...(user.role === "ADMIN" ? {} : { userId: user.id }) }, include: { items: true, payments: { take: 1, orderBy: { createdAt: "desc" } }, user: { select: { email: true } } } });
  if (!order) notFound();
  const taxable = order.total.minus(order.taxTotal);
  return (
    <main className="min-h-screen bg-white px-6 py-10 text-[#111] print:p-0">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-semibold tracking-[0.2em]">NOVA</p>
            <p className="mt-1 text-xs text-neutral-500">NOVA Retail Pvt. Ltd. · GSTIN 24AABCN1234F1Z5<br />4th Floor, Titanium Square, Ahmedabad, Gujarat 380054</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-lg font-semibold">Tax Invoice</p>
            <p>{order.orderNumber}</p>
            <p className="text-neutral-500">{formatDate(order.placedAt)}</p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 gap-6 text-sm">
          <div><p className="text-xs uppercase tracking-wider text-neutral-500">Bill / ship to</p><p className="mt-1 font-medium">{order.shipName}</p><p>{order.shipLine1}{order.shipLine2 && `, ${order.shipLine2}`}</p><p>{order.shipCity}, {order.shipState} – {order.shipPincode}</p><p>+91 {order.shipPhone} · {order.user.email}</p></div>
          <div className="text-right"><p className="text-xs uppercase tracking-wider text-neutral-500">Payment</p><p className="mt-1">{order.payments[0]?.method.replace("_", " ")} · {order.payments[0]?.status.toLowerCase()}</p><p>Status: {order.status.replace(/_/g, " ").toLowerCase()}</p></div>
        </div>
        <table className="mt-8 w-full text-sm">
          <thead><tr className="border-b border-neutral-300 text-left text-xs uppercase tracking-wider text-neutral-500"><th className="py-2">Item</th><th>SKU</th><th className="text-right">Qty</th><th className="text-right">Rate</th><th className="text-right">Amount</th></tr></thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={i.id} className="border-b border-neutral-200"><td className="py-2.5">{i.name}{i.color && <span className="text-neutral-500"> ({i.color})</span>}</td><td className="text-neutral-500">{i.sku}</td><td className="text-right">{i.quantity}</td><td className="text-right">{formatINR(i.unitPrice.toString(), true)}</td><td className="text-right">{formatINR(i.lineTotal.toString(), true)}</td></tr>
            ))}
          </tbody>
        </table>
        <div className="ml-auto mt-6 w-72 space-y-1.5 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(order.subtotal.toString(), true)}</span></div>
          {order.discountTotal.gt(0) && <div className="flex justify-between"><span>Discount ({order.couponCode})</span><span>−{formatINR(order.discountTotal.toString(), true)}</span></div>}
          {order.pointsDiscount.gt(0) && <div className="flex justify-between"><span>Points redeemed</span><span>−{formatINR(order.pointsDiscount.toString(), true)}</span></div>}
          <div className="flex justify-between"><span>Shipping</span><span>{formatINR(order.shippingFee.toString(), true)}</span></div>
          <div className="flex justify-between text-neutral-500"><span>Taxable value</span><span>{formatINR(taxable.toString(), true)}</span></div>
          <div className="flex justify-between text-neutral-500"><span>IGST @18% (included)</span><span>{formatINR(order.taxTotal.toString(), true)}</span></div>
          <div className="flex justify-between border-t border-neutral-300 pt-2 text-base font-semibold"><span>Total</span><span>{formatINR(order.total.toString(), true)}</span></div>
        </div>
        <div className="mt-12 flex items-center justify-between text-xs text-neutral-500">
          <p>This is a computer-generated invoice. Thank you for shopping with NOVA.</p>
          <PrintButton />
        </div>
      </div>
    </main>
  );
}
