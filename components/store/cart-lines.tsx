"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Minus, Plus, Trash2, AlertCircle, Loader2, TicketPercent, X } from "lucide-react";
import { toast } from "sonner";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/utils";
import { removeCartItemAction, updateCartItemAction, applyCouponAction, removeCouponAction } from "@/lib/actions/cart";
import { useStore } from "./store-provider";
import type { CartSummaryDTO } from "@/types";

export function CartLines({ cart, compact }: { cart: CartSummaryDTO; compact?: boolean }) {
  const { setCart } = useStore();
  const [busy, setBusy] = useState<string | null>(null);

  async function update(id: string, qty: number) {
    setBusy(id);
    const res = qty <= 0 ? await removeCartItemAction(id) : await updateCartItemAction(id, qty);
    setBusy(null);
    if (!res.ok) return toast.error(res.error);
    setCart(res.data);
    if (qty <= 0) toast.success("Removed from cart");
  }

  return (
    <ul className="divide-y divide-border">
      <AnimatePresence initial={false}>
        {cart.lines.map((l) => (
          <motion.li key={l.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="flex gap-4 py-4">
            <Link href={`/product/${l.slug}`} className={cn("relative shrink-0 overflow-hidden rounded-xl bg-surface hairline", compact ? "size-20" : "size-24 md:size-28")}>
              {l.image && <Image src={l.image} alt={l.name} fill sizes="112px" className={cn("object-cover", !l.available && "opacity-40")} />}
            </Link>
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{l.brand}</p>
                  <Link href={`/product/${l.slug}`} className="line-clamp-2 text-sm font-medium hover:text-white/80">{l.name}</Link>
                  {l.color && <p className="mt-0.5 text-xs text-muted">{l.color}</p>}
                </div>
                <div className="text-right tabular">
                  <p className="text-sm font-medium">{formatINR(l.lineTotal)}</p>
                  {l.quantity > 1 && <p className="text-[11px] text-muted">{formatINR(l.unitPrice)} each</p>}
                </div>
              </div>
              {l.issue && (
                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-warning"><AlertCircle className="size-3.5" /> {l.issue}</p>
              )}
              <div className="mt-auto flex items-center justify-between pt-2">
                <div className="flex items-center rounded-full bg-white/5 hairline">
                  <button onClick={() => update(l.id, l.quantity - 1)} disabled={busy === l.id} className="grid size-8 place-items-center rounded-full hover:bg-white/8 disabled:opacity-40 cursor-pointer" aria-label={`Decrease quantity of ${l.name}`}>
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm tabular" aria-live="polite">{busy === l.id ? <Loader2 className="mx-auto size-3.5 animate-spin" /> : l.quantity}</span>
                  <button onClick={() => update(l.id, l.quantity + 1)} disabled={busy === l.id || l.quantity >= Math.min(l.stock, 10)} className="grid size-8 place-items-center rounded-full hover:bg-white/8 disabled:opacity-40 cursor-pointer" aria-label={`Increase quantity of ${l.name}`}>
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <button onClick={() => update(l.id, 0)} disabled={busy === l.id} className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs text-muted hover:text-danger cursor-pointer" aria-label={`Remove ${l.name}`}>
                  <Trash2 className="size-3.5" /> Remove
                </button>
              </div>
            </div>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

export function CouponForm({ cart }: { cart: CartSummaryDTO }) {
  const { setCart } = useStore();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return setError("Enter a coupon code.");
    setLoading(true);
    const res = await applyCouponAction(code);
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setError(null);
    setCode("");
    setCart(res.data);
    toast.success(`${res.data.couponCode} applied — you save ${formatINR(res.data.couponDiscount)}`);
  }

  async function remove() {
    const res = await removeCouponAction();
    if (!res.ok) return toast.error(res.error);
    setCart(res.data);
  }

  if (cart.couponCode) {
    return (
      <div className={cn("flex items-center justify-between rounded-xl border px-3 py-2.5", cart.couponError ? "border-warning/30 bg-warning/5" : "border-success/25 bg-success/5")}>
        <div className="flex items-center gap-2 text-sm">
          <TicketPercent className={cn("size-4", cart.couponError ? "text-warning" : "text-success")} />
          <div>
            <span className="font-mono font-medium">{cart.couponCode}</span>
            <p className={cn("text-xs", cart.couponError ? "text-warning" : "text-success")}>{cart.couponError ?? `−${formatINR(cart.couponDiscount)} applied`}</p>
          </div>
        </div>
        <button onClick={remove} className="grid size-7 place-items-center rounded-full text-muted hover:bg-white/8 hover:text-foreground cursor-pointer" aria-label="Remove coupon">
          <X className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={apply} className="space-y-1.5">
      <div className="flex gap-2">
        <input
          value={code}
          onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(null); }}
          placeholder="Coupon code"
          aria-label="Coupon code"
          aria-invalid={!!error}
          className="h-10 min-w-0 flex-1 rounded-full border border-border bg-surface px-4 font-mono text-sm uppercase outline-none placeholder:font-sans placeholder:normal-case placeholder:text-subtle focus:border-accent/60"
          maxLength={20}
        />
        <button type="submit" disabled={loading} className="h-10 rounded-full bg-white/8 px-4 text-sm font-medium hover:bg-white/12 disabled:opacity-50 cursor-pointer">
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
        </button>
      </div>
      {error && <p role="alert" className="px-1 text-xs text-danger">{error}</p>}
    </form>
  );
}

export function SummaryRows({ cart, showShipping = true }: { cart: CartSummaryDTO; showShipping?: boolean }) {
  const Row = ({ label, value, className }: { label: React.ReactNode; value: string; className?: string }) => (
    <div className={cn("flex items-center justify-between text-sm", className)}>
      <span className="text-muted">{label}</span>
      <span className="tabular">{value}</span>
    </div>
  );
  return (
    <div className="space-y-2.5">
      <Row label={`Subtotal (${cart.itemCount} ${cart.itemCount === 1 ? "item" : "items"})`} value={formatINR(cart.subtotal, true)} />
      {Number(cart.savings) > 0 && <Row label="You save on MRP" value={formatINR(cart.savings)} className="[&>span:last-child]:text-success" />}
      {Number(cart.couponDiscount) > 0 && <Row label={`Coupon (${cart.couponCode})`} value={`−${formatINR(cart.couponDiscount, true)}`} className="[&>span:last-child]:text-success" />}
      {Number(cart.pointsDiscount) > 0 && <Row label={`NOVA points (${cart.pointsRedeemed})`} value={`−${formatINR(cart.pointsDiscount)}`} className="[&>span:last-child]:text-success" />}
      {showShipping && <Row label="Shipping" value={Number(cart.shipping) === 0 ? "Free" : formatINR(cart.shipping)} />}
      <Row label="GST (18%, included)" value={formatINR(cart.tax, true)} />
      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="font-medium">Total</span>
        <span className="text-lg font-semibold tabular">{formatINR(cart.total, true)}</span>
      </div>
    </div>
  );
}
