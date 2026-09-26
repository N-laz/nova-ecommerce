"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, ChevronRight, CreditCard, Landmark, MapPin, Plus, Smartphone, Truck, Wallet, Zap, FlaskConical, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, NativeSelect } from "@/components/ui/input";
import { Field } from "@/components/ui/label";
import { ErrorNote } from "@/components/ui/states";
import { useStore } from "@/components/store/store-provider";
import { SummaryRows } from "@/components/store/cart-lines";
import { AddressForm, type AddressDTO } from "./address-form";
import { getCartAction } from "@/lib/actions/cart";
import { placeOrderAction, verifyPaymentAction } from "@/lib/actions/checkout";
import { formatINR } from "@/lib/format";
import { cn, formatDate } from "@/lib/utils";
import type { CartSummaryDTO } from "@/types";

type Method = "UPI" | "CARD" | "NET_BANKING" | "COD" | "TEST";
const METHODS: { id: Method; label: string; hint: string; icon: typeof Wallet }[] = [
  { id: "UPI", label: "UPI", hint: "GPay, PhonePe, Paytm or any UPI app", icon: Smartphone },
  { id: "CARD", label: "Credit / Debit card", hint: "Visa, Mastercard, RuPay, Amex", icon: CreditCard },
  { id: "NET_BANKING", label: "Net Banking", hint: "All major Indian banks", icon: Landmark },
  { id: "COD", label: "Cash on Delivery", hint: "Pay when your order arrives", icon: Wallet },
  { id: "TEST", label: "Test Payment", hint: "Developer sandbox — choose the outcome", icon: FlaskConical },
];
const BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank", "Yes Bank", "Test Bank (fail)"];

function eta(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return formatDate(d, { weekday: "short", day: "numeric", month: "short" });
}

declare global {
  interface Window { Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void } }
}

export function CheckoutFlow({ addresses: initialAddresses, initialCart, pointsBalance }: { addresses: AddressDTO[]; initialCart: CartSummaryDTO; pointsBalance: number }) {
  const router = useRouter();
  const { setCart } = useStore();
  const [addresses, setAddresses] = useState(initialAddresses);
  const [addressId, setAddressId] = useState(initialAddresses.find((a) => a.isDefault)?.id ?? initialAddresses[0]?.id ?? "");
  const [adding, setAdding] = useState(initialAddresses.length === 0);
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [delivery, setDelivery] = useState<"STANDARD" | "EXPRESS">("STANDARD");
  const [usePoints, setUsePoints] = useState(false);
  const [cart, setLocalCart] = useState(initialCart);
  const [refreshing, startRefresh] = useTransition();
  const [method, setMethod] = useState<Method>("UPI");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [placing, startPlace] = useTransition();

  useEffect(() => {
    startRefresh(async () => {
      const r = await getCartAction({ delivery, usePoints });
      if (r.ok) {
        setLocalCart(r.data);
        setCart(r.data);
      } else toast.error(r.error);
    });
  }, [delivery, usePoints, setCart]);

  const selected = addresses.find((a) => a.id === addressId);

  function onAddressSaved(id: string) {
    setAdding(false);
    router.refresh();
    // Optimistically select; the refreshed server list replaces ours on next render
    setAddressId(id);
  }
  useEffect(() => setAddresses(initialAddresses), [initialAddresses]);

  async function runGateway(payload: Record<string, unknown>, orderNumber: string) {
    if (payload.gateway !== "razorpay") throw new Error("Unsupported payment gateway.");
    if (!window.Razorpay) {
      await new Promise<void>((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => res();
        s.onerror = () => rej(new Error("Couldn't load the payment window."));
        document.body.appendChild(s);
      });
    }
    return new Promise<void>((resolve, reject) => {
      const rz = new window.Razorpay!({
        key: payload.key, order_id: payload.orderId, amount: payload.amount, currency: payload.currency, name: "NOVA", description: orderNumber, prefill: payload.prefill, theme: { color: "#7C5CFC" },
        handler: async (resp: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const v = await verifyPaymentAction({ orderNumber, providerOrderId: resp.razorpay_order_id, providerPaymentId: resp.razorpay_payment_id, signature: resp.razorpay_signature });
          if (v.ok) resolve();
          else reject(new Error(v.error));
        },
        modal: { ondismiss: () => reject(new Error("Payment was cancelled. Your order is saved as pending — you can retry from your orders page.")) },
      });
      rz.open();
    });
  }

  function placeOrder(form: HTMLFormElement) {
    const fd = new FormData(form);
    const g = (k: string) => String(fd.get(k) ?? "");
    const payment =
      method === "UPI" ? { method, upiId: g("upiId") }
      : method === "CARD" ? { method, cardNumber: g("cardNumber"), cardName: g("cardName"), expiry: g("expiry"), cvv: g("cvv") }
      : method === "NET_BANKING" ? { method, bank: g("bank") }
      : method === "TEST" ? { method, outcome: g("outcome") || "success" }
      : { method };
    setFormError(null);
    startPlace(async () => {
      const r = await placeOrderAction({ addressId, deliveryMethod: delivery, usePoints, notes: g("notes") || undefined, payment });
      if (!r.ok) {
        const fe: Record<string, string> = {};
        for (const [k, v] of Object.entries(r.fieldErrors ?? {})) fe[k.replace(/^payment\./, "")] = v;
        setErrors(fe);
        setFormError(r.error);
        toast.error(r.error);
        return;
      }
      try {
        if (r.data.action) await runGateway(r.data.action, r.data.orderNumber);
        router.push(`/account/orders/${r.data.orderNumber}?placed=1`);
        router.refresh();
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Payment could not be completed.";
        setFormError(msg);
        toast.error(msg);
      }
    });
  }

  const stepHeader = (n: 1 | 2 | 3, title: string, summary?: React.ReactNode) => (
    <button type="button" disabled={n > step} onClick={() => n < step && setStep(n)} className="flex w-full items-center gap-3 text-left disabled:cursor-default cursor-pointer">
      <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-xs font-medium tabular", step > n ? "bg-success text-black" : step === n ? "bg-white text-black" : "bg-white/8 text-muted")}>
        {step > n ? <Check className="size-3.5" /> : n}
      </span>
      <span className="flex-1">
        <span className={cn("block font-medium", step < n && "text-muted")}>{title}</span>
        {step > n && summary && <span className="block text-xs text-muted">{summary}</span>}
      </span>
      {step > n && <span className="text-xs text-accent">Change</span>}
    </button>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
      <div className="space-y-4">
        {/* Step 1 — Address */}
        <section className="rounded-2xl bg-card p-5 hairline md:p-6">
          {stepHeader(1, "Delivery address", selected && `${selected.fullName}, ${selected.line1}, ${selected.city} ${selected.pincode}`)}
          {step === 1 && (
            <div className="mt-5 space-y-3">
              {addresses.map((a) => (
                <label key={a.id} className={cn("flex cursor-pointer gap-3 rounded-xl p-4 transition", addressId === a.id ? "bg-white/[0.04] ring-1 ring-accent" : "hairline hover:bg-white/[0.02]")}>
                  <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-[#7C5CFC]" />
                  <span className="text-sm">
                    <span className="flex items-center gap-2 font-medium">{a.fullName} <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted">{a.label}</span>{a.isDefault && <span className="text-[11px] text-accent">Default</span>}</span>
                    <span className="mt-1 block text-muted">{a.line1}{a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} – {a.pincode}</span>
                    <span className="block text-muted">+91 {a.phone}</span>
                  </span>
                </label>
              ))}
              {adding ? (
                <div className="rounded-xl p-4 hairline">
                  <p className="mb-4 font-medium">New address</p>
                  <AddressForm onSaved={onAddressSaved} onCancel={addresses.length ? () => setAdding(false) : undefined} />
                </div>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setAdding(true)}><Plus /> Add a new address</Button>
              )}
              {!adding && (
                <Button className="w-full sm:w-auto" disabled={!addressId} onClick={() => setStep(2)}>
                  Deliver here <ChevronRight />
                </Button>
              )}
            </div>
          )}
        </section>

        {/* Step 2 — Delivery */}
        <section className="rounded-2xl bg-card p-5 hairline md:p-6">
          {stepHeader(2, "Delivery method", delivery === "EXPRESS" ? `Express · by ${eta(2)}` : `Standard · by ${eta(5)}`)}
          {step === 2 && (
            <div className="mt-5 space-y-3">
              {[
                { id: "STANDARD" as const, label: "Standard delivery", desc: `3–5 business days · Arrives by ${eta(5)}`, price: "Free", icon: Truck },
                { id: "EXPRESS" as const, label: "Express delivery", desc: `1–2 business days · Arrives by ${eta(2)}`, price: formatINR(99), icon: Zap },
              ].map((d) => (
                <label key={d.id} className={cn("flex cursor-pointer items-center gap-4 rounded-xl p-4 transition", delivery === d.id ? "bg-white/[0.04] ring-1 ring-accent" : "hairline hover:bg-white/[0.02]")}>
                  <input type="radio" name="delivery" checked={delivery === d.id} onChange={() => setDelivery(d.id)} className="accent-[#7C5CFC]" />
                  <d.icon className="size-5 text-muted" />
                  <span className="flex-1 text-sm"><span className="block font-medium">{d.label}</span><span className="text-muted">{d.desc}</span></span>
                  <span className="text-sm font-medium tabular">{d.price}</span>
                </label>
              ))}
              <Button onClick={() => setStep(3)}>Continue to payment <ChevronRight /></Button>
            </div>
          )}
        </section>

        {/* Step 3 — Payment */}
        <section className="rounded-2xl bg-card p-5 hairline md:p-6">
          {stepHeader(3, "Payment")}
          {step === 3 && (
            <form
              noValidate
              className="mt-5 space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                placeOrder(e.currentTarget);
              }}
            >
              <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
                {METHODS.map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    role="radio"
                    aria-checked={method === m.id}
                    onClick={() => { setMethod(m.id); setErrors({}); }}
                    className={cn("flex items-start gap-3 rounded-xl p-3.5 text-left transition cursor-pointer", method === m.id ? "bg-white/[0.04] ring-1 ring-accent" : "hairline hover:bg-white/[0.02]", m.id === "TEST" && "sm:col-span-2")}
                  >
                    <m.icon className="mt-0.5 size-4 text-muted" />
                    <span className="text-sm"><span className="block font-medium">{m.label}</span><span className="text-xs text-muted">{m.hint}</span></span>
                  </button>
                ))}
              </div>

              <div className="rounded-xl p-4 hairline">
                {method === "UPI" && (
                  <Field label="UPI ID" htmlFor="upi" error={errors.upiId} hint="Test mode: any valid ID succeeds; an ID ending in @fail is declined.">
                    <Input id="upi" name="upiId" placeholder="yourname@okaxis" autoComplete="off" invalid={!!errors.upiId} />
                  </Field>
                )}
                {method === "CARD" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Card number" htmlFor="cc" error={errors.cardNumber} className="sm:col-span-2" hint="Test cards: 4111 1111 1111 1111 (success) · 4000 0000 0000 0002 (declined)">
                      <Input id="cc" name="cardNumber" inputMode="numeric" autoComplete="cc-number" placeholder="1234 5678 9012 3456" maxLength={23} invalid={!!errors.cardNumber} />
                    </Field>
                    <Field label="Name on card" htmlFor="ccn" error={errors.cardName} className="sm:col-span-2">
                      <Input id="ccn" name="cardName" autoComplete="cc-name" invalid={!!errors.cardName} />
                    </Field>
                    <Field label="Expiry" htmlFor="exp" error={errors.expiry}>
                      <Input id="exp" name="expiry" placeholder="MM/YY" autoComplete="cc-exp" maxLength={5} invalid={!!errors.expiry} />
                    </Field>
                    <Field label="CVV" htmlFor="cvv" error={errors.cvv}>
                      <Input id="cvv" name="cvv" type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} invalid={!!errors.cvv} />
                    </Field>
                  </div>
                )}
                {method === "NET_BANKING" && (
                  <Field label="Bank" htmlFor="bank" error={errors.bank}>
                    <NativeSelect id="bank" name="bank" defaultValue="" invalid={!!errors.bank}>
                      <option value="" disabled>Select your bank</option>
                      {BANKS.map((b) => <option key={b}>{b}</option>)}
                    </NativeSelect>
                  </Field>
                )}
                {method === "COD" && <p className="text-sm text-muted">Pay {formatINR(cart.total)} in cash or UPI when your order arrives. Your order is confirmed right away.</p>}
                {method === "TEST" && (
                  <fieldset className="space-y-2 text-sm">
                    <legend className="mb-2 text-muted">Simulated gateway outcome</legend>
                    <label className="flex items-center gap-2"><input type="radio" name="outcome" value="success" defaultChecked className="accent-[#7C5CFC]" /> Payment succeeds</label>
                    <label className="flex items-center gap-2"><input type="radio" name="outcome" value="failure" className="accent-[#7C5CFC]" /> Payment fails (cart is kept, stock restored)</label>
                  </fieldset>
                )}
              </div>

              <Field label="Delivery instructions (optional)" htmlFor="notes">
                <Input id="notes" name="notes" maxLength={300} placeholder="e.g. Leave with the building security" />
              </Field>

              {formError && <ErrorNote>{formError}</ErrorNote>}
              <Button type="submit" size="lg" variant="accent" className="w-full" loading={placing} disabled={refreshing || cart.hasIssues || !cart.lines.length}>
                <Lock /> {method === "COD" ? "Place order" : "Pay"} {formatINR(cart.total)}
              </Button>
              <p className="text-center text-xs text-muted">By placing this order you agree to NOVA&apos;s terms of sale. Prices and stock are verified again on our servers.</p>
            </form>
          )}
        </section>
      </div>

      <aside className="h-fit space-y-5 rounded-2xl bg-card p-5 hairline lg:sticky lg:top-20">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Order summary</h2>
          <Link href="/cart" className="text-xs text-muted hover:text-foreground">Edit cart</Link>
        </div>
        <ul className="space-y-3">
          {cart.lines.map((l) => (
            <li key={l.id} className="flex items-center gap-3 text-sm">
              <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface hairline">
                {l.image && <Image src={l.image} alt="" fill sizes="56px" className="object-cover" />}
                <span className="absolute right-0.5 top-0.5 grid size-4 place-items-center rounded-full bg-white text-[10px] font-medium text-black">{l.quantity}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate">{l.name}</p>
                <p className="text-xs text-muted">{l.color}{l.issue && <span className="text-danger"> · {l.issue}</span>}</p>
              </div>
              <span className="tabular">{formatINR(l.lineTotal)}</span>
            </li>
          ))}
        </ul>
        {pointsBalance > 0 && (
          <label className="flex cursor-pointer items-center gap-3 rounded-xl p-3 text-sm hairline">
            <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} className="size-4 accent-[#7C5CFC]" />
            <Sparkles className="size-4 text-accent" />
            <span className="flex-1">Use NOVA points <span className="block text-xs text-muted">{pointsBalance.toLocaleString("en-IN")} available · 1 point = ₹1 · up to 10% of order</span></span>
          </label>
        )}
        <div className={cn("transition-opacity", refreshing && "opacity-50")}>
          <SummaryRows cart={cart} />
        </div>
        {cart.hasIssues && <ErrorNote>Some items are unavailable. <Link href="/cart" className="underline">Review your cart</Link> before paying.</ErrorNote>}
        <p className="flex items-center gap-1.5 text-xs text-muted"><MapPin className="size-3.5" /> {selected ? `Delivering to ${selected.city}, ${selected.pincode}` : "Add a delivery address to continue"}</p>
      </aside>
    </div>
  );
}
