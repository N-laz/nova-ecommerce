import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Heart, Package, Sparkles, Star } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatINR } from "@/lib/format";
import { formatDate } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/account/order-status";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountHome() {
  const user = await requireUserPage("/account");
  const [orderCount, wishCount, reviewCount, reward, recent] = await Promise.all([
    db.order.count({ where: { userId: user.id } }),
    db.wishlistItem.count({ where: { wishlist: { userId: user.id } } }),
    db.review.count({ where: { userId: user.id } }),
    db.rewardAccount.findUnique({ where: { userId: user.id } }),
    db.order.findMany({ where: { userId: user.id }, orderBy: { placedAt: "desc" }, take: 3, include: { items: { take: 3, select: { image: true, name: true } }, _count: { select: { items: true } } } }),
  ]);

  const tiles = [
    { href: "/account/orders", label: "Orders", value: orderCount, icon: Package },
    { href: "/wishlist", label: "Wishlist", value: wishCount, icon: Heart },
    { href: "/account/reviews", label: "Reviews", value: reviewCount, icon: Star },
    { href: "/account/rewards", label: "Reward points", value: (reward?.balance ?? 0).toLocaleString("en-IN"), icon: Sparkles },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="group rounded-2xl bg-card p-5 hairline transition hover:bg-elevated">
            <t.icon className="size-4 text-accent" />
            <p className="mt-4 text-2xl font-semibold tabular">{t.value}</p>
            <p className="text-sm text-muted">{t.label}</p>
          </Link>
        ))}
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          <Link href="/account/orders" className="flex items-center gap-1 text-sm text-muted hover:text-foreground">All orders <ArrowRight className="size-4" /></Link>
        </div>
        {recent.length === 0 ? (
          <div className="rounded-2xl p-8 text-center hairline">
            <p className="font-medium">No orders yet</p>
            <p className="mt-1 text-sm text-muted">When you place an order, you&apos;ll track it here.</p>
            <Link href="/shop" className="mt-4 inline-block text-sm text-accent hover:underline">Start shopping</Link>
          </div>
        ) : (
          <ul className="space-y-3">
            {recent.map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.orderNumber}`} className="flex items-center gap-4 rounded-2xl bg-card p-4 hairline transition hover:bg-elevated">
                  <div className="flex -space-x-3">
                    {o.items.map((it, i) => (
                      <div key={i} className="relative size-12 overflow-hidden rounded-xl bg-surface ring-2 ring-card">{it.image && <Image src={it.image} alt="" fill sizes="48px" className="object-cover" />}</div>
                    ))}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{o.orderNumber}</p>
                    <p className="truncate text-xs text-muted">{formatDate(o.placedAt)} · {o._count.items} {o._count.items === 1 ? "item" : "items"}</p>
                  </div>
                  <div className="text-right">
                    <OrderStatusBadge status={o.status} />
                    <p className="mt-1 text-sm tabular">{formatINR(o.total.toString())}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-gradient-to-br from-[#1a1433] to-card p-6 hairline">
        <p className="flex items-center gap-2 text-sm text-[#b3a1ff]"><Sparkles className="size-4" /> NOVA Rewards</p>
        <p className="mt-2 text-3xl font-semibold tabular">{(reward?.balance ?? 0).toLocaleString("en-IN")} points</p>
        <p className="mt-1 text-sm text-muted">Worth {formatINR(reward?.balance ?? 0)} on your next order. Earn 1 point for every ₹100 you spend.</p>
      </section>
    </div>
  );
}
