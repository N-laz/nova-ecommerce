import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { getCartSummary } from "@/lib/services/cart";
import { CheckoutFlow } from "@/components/checkout/checkout-flow";
import { EmptyState } from "@/components/ui/states";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await requireUserPage("/checkout");
  const [cart, addresses, reward] = await Promise.all([
    getCartSummary(),
    db.address.findMany({ where: { userId: user.id }, orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }] }),
    db.rewardAccount.findUnique({ where: { userId: user.id }, select: { balance: true } }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 md:px-6">
      <h1 className="mb-8 text-3xl font-semibold tracking-tight md:text-4xl">Checkout</h1>
      {cart.lines.length === 0 ? (
        <EmptyState icon={<ShoppingBag />} title="Your cart is empty." description="Add a few products before checking out." action={<Button asChild><Link href="/shop">Explore Products</Link></Button>} />
      ) : (
        <CheckoutFlow
          initialCart={cart}
          pointsBalance={reward?.balance ?? 0}
          addresses={addresses.map((a) => ({ id: a.id, label: a.label, fullName: a.fullName, phone: a.phone, line1: a.line1, line2: a.line2, city: a.city, state: a.state, pincode: a.pincode, isDefault: a.isDefault }))}
        />
      )}
    </div>
  );
}
