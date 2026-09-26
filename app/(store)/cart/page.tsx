import type { Metadata } from "next";
import { getCartSummary } from "@/lib/services/cart";
import { CartPageClient } from "@/components/cart/cart-page";

export const metadata: Metadata = { title: "Your cart", robots: { index: false } };

export default async function CartPage() {
  const cart = await getCartSummary();
  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight md:text-4xl">Cart</h1>
      <CartPageClient initial={cart} />
    </div>
  );
}
