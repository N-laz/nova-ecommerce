"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ShoppingBag, ArrowRight, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/states";
import { useStore } from "@/components/store/store-provider";
import { CartLines, CouponForm, SummaryRows } from "@/components/store/cart-lines";
import type { CartSummaryDTO } from "@/types";

export function CartPageClient({ initial }: { initial: CartSummaryDTO }) {
  const { cart, setCart, user } = useStore();
  useEffect(() => setCart(initial), [initial, setCart]);
  const c = cart ?? initial;

  if (!c.lines.length)
    return (
      <div className="flex flex-col items-center py-24 text-center">
        <div className="grid size-16 place-items-center rounded-2xl bg-card hairline"><ShoppingBag className="size-6 text-muted" /></div>
        <h2 className="mt-5 text-xl font-semibold">Your cart is empty.</h2>
        <p className="mt-1 text-sm text-muted">Looks like you haven&apos;t added anything yet.</p>
        <Button asChild className="mt-6"><Link href="/shop">Explore Products</Link></Button>
      </div>
    );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="rounded-2xl bg-card px-5 hairline md:px-6">
        <CartLines cart={c} />
      </div>
      <aside className="h-fit space-y-5 rounded-2xl bg-card p-5 hairline lg:sticky lg:top-20">
        <h2 className="font-semibold">Order summary</h2>
        <CouponForm cart={c} />
        <SummaryRows cart={c} />
        {c.hasIssues && <ErrorNote>Some items need attention before checkout — update quantities or remove unavailable items.</ErrorNote>}
        {c.hasIssues ? (
          <Button size="lg" className="w-full" disabled>Checkout</Button>
        ) : (
          <Button asChild size="lg" variant="accent" className="w-full">
            <Link href={user ? "/checkout" : "/login?next=/checkout"}>{user ? "Checkout" : "Sign in to checkout"} <ArrowRight /></Link>
          </Button>
        )}
        <p className="flex items-center justify-center gap-1.5 text-xs text-muted"><Lock className="size-3" /> Secure checkout · UPI, cards, net banking & COD</p>
      </aside>
    </div>
  );
}
