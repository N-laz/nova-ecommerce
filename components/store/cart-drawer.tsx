"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ShoppingBag, X, ArrowRight } from "lucide-react";
import * as D from "@radix-ui/react-dialog";
import { SheetContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ErrorNote } from "@/components/ui/states";
import { getCartAction } from "@/lib/actions/cart";
import { useStore } from "./store-provider";
import { CartLines, CouponForm, SummaryRows } from "./cart-lines";

export function CartDrawer() {
  const { cartOpen, setCartOpen, cart, setCart, cartCount } = useStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cartOpen) return;
    setLoading(true);
    getCartAction()
      .then((r) => (r.ok ? (setCart(r.data), setError(null)) : setError(r.error)))
      .catch(() => setError("Couldn't load your cart. Please try again."))
      .finally(() => setLoading(false));
  }, [cartOpen, setCart]);

  return (
    <D.Root open={cartOpen} onOpenChange={setCartOpen}>
      <SheetContent side="right" title="Shopping cart">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <p className="font-semibold">Cart <span className="text-muted">({cart?.itemCount ?? cartCount})</span></p>
          <D.Close className="grid size-8 place-items-center rounded-full hover:bg-white/8 cursor-pointer" aria-label="Close cart"><X className="size-4" /></D.Close>
        </div>
        <div className="flex-1 overflow-y-auto px-5">
          {error ? (
            <ErrorNote className="mt-5">{error}</ErrorNote>
          ) : !cart && loading ? (
            <div className="space-y-4 py-5">{[0, 1].map((i) => <div key={i} className="flex gap-4"><div className="skeleton size-20" /><div className="flex-1 space-y-2"><div className="skeleton h-3 w-1/3" /><div className="skeleton h-4 w-3/4" /></div></div>)}</div>
          ) : cart && cart.lines.length > 0 ? (
            <CartLines cart={cart} compact />
          ) : (
            <div className="flex h-full flex-col items-center justify-center py-16 text-center">
              <div className="grid size-16 place-items-center rounded-2xl bg-card hairline"><ShoppingBag className="size-6 text-muted" /></div>
              <p className="mt-4 font-medium">Your cart is empty.</p>
              <p className="mt-1 text-sm text-muted">Discover something you&apos;ll love.</p>
              <Button asChild className="mt-6" onClick={() => setCartOpen(false)}><Link href="/shop">Explore Products</Link></Button>
            </div>
          )}
        </div>
        {cart && cart.lines.length > 0 && (
          <div className="space-y-4 border-t border-border bg-card/60 p-5">
            <CouponForm cart={cart} />
            <SummaryRows cart={cart} />
            <div className="grid grid-cols-2 gap-2">
              <Button asChild variant="secondary" onClick={() => setCartOpen(false)}><Link href="/cart">View cart</Link></Button>
              {cart.hasIssues ? (
                <Button disabled title="Resolve the highlighted items first">Checkout</Button>
              ) : (
                <Button asChild variant="accent" onClick={() => setCartOpen(false)}><Link href="/checkout">Checkout <ArrowRight /></Link></Button>
              )}
            </div>
            {cart.hasIssues && <p className="text-center text-xs text-warning">Some items need attention before checkout.</p>}
          </div>
        )}
      </SheetContent>
    </D.Root>
  );
}
