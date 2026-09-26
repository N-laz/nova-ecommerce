import type { Metadata } from "next";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { formatINR } from "@/lib/format";
import { cn, formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "NOVA Rewards", robots: { index: false } };

export default async function RewardsPage() {
  const u = await requireUserPage("/account/rewards");
  const account = await db.rewardAccount.findUnique({ where: { userId: u.id }, include: { transactions: { orderBy: { createdAt: "desc" }, take: 50, include: { order: { select: { orderNumber: true } } } } } });
  const bal = account?.balance ?? 0;
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1f1740] via-[#15171D] to-card p-6 hairline md:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-accent/25 blur-3xl" />
        <p className="flex items-center gap-2 text-sm text-[#b3a1ff]"><Sparkles className="size-4" /> NOVA Rewards</p>
        <p className="mt-3 text-5xl font-semibold tabular">{bal.toLocaleString("en-IN")}</p>
        <p className="text-sm text-muted">points available · worth {formatINR(bal)}</p>
        <dl className="mt-6 grid max-w-md grid-cols-2 gap-4 text-sm">
          <div><dt className="text-muted">Lifetime earned</dt><dd className="text-lg font-medium tabular">{(account?.lifetimeEarned ?? 0).toLocaleString("en-IN")}</dd></div>
          <div><dt className="text-muted">Lifetime used</dt><dd className="text-lg font-medium tabular">{(account?.lifetimeUsed ?? 0).toLocaleString("en-IN")}</dd></div>
        </dl>
      </section>
      <section className="grid gap-3 text-sm md:grid-cols-3">
        {[["Earn", "1 point for every ₹100 spent, credited when your order is confirmed."], ["Redeem", "1 point = ₹1 at checkout, up to 10% of your order value."], ["Reversals", "Points from cancelled orders are reversed; redeemed points are returned."]].map(([t, d]) => (
          <div key={t} className="rounded-2xl bg-card p-4 hairline"><p className="font-medium">{t}</p><p className="mt-1 text-muted">{d}</p></div>
        ))}
      </section>
      <section className="rounded-2xl bg-card hairline">
        <h2 className="border-b border-border p-5 font-semibold">History</h2>
        {!account?.transactions.length ? (
          <p className="p-5 text-sm text-muted">No activity yet. <Link href="/shop" className="text-accent hover:underline">Start shopping</Link> to earn points.</p>
        ) : (
          <ul className="divide-y divide-border">
            {account.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
                <div>
                  <p>{t.description}</p>
                  <p className="text-xs text-muted">{formatDate(t.createdAt)}{t.order && <> · <Link href={`/account/orders/${t.order.orderNumber}`} className="hover:text-foreground">{t.order.orderNumber}</Link></>}</p>
                </div>
                <span className={cn("font-medium tabular", t.points >= 0 ? "text-success" : "text-foreground/70")}>{t.points >= 0 ? "+" : ""}{t.points}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
