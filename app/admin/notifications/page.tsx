import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/sidebar";
import { BroadcastForm } from "@/components/admin/broadcast-form";
import { timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Broadcast" };
export const dynamic = "force-dynamic";

export default async function Broadcast() {
  const [audience, recent, byType] = await Promise.all([
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.notification.groupBy({ by: ["title", "body"], where: { type: "PROMOTIONAL" }, _count: { _all: true }, _max: { createdAt: true }, orderBy: { _max: { createdAt: "desc" } }, take: 8 }),
    db.notification.groupBy({ by: ["type"], _count: { _all: true } }),
  ]);
  return (
    <div>
      <PageHeader title="Broadcast" description="Send a promotional in-app notification to every customer. Order, price-drop and back-in-stock alerts are sent automatically." />
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <BroadcastForm audience={audience} />
        <div className="space-y-6">
          <section className="rounded-2xl bg-card p-5 hairline">
            <h2 className="mb-3 font-medium">Recent broadcasts</h2>
            {recent.length === 0 ? <p className="text-sm text-muted">Nothing sent yet.</p> : (
              <ul className="space-y-3 text-sm">{recent.map((r) => <li key={r.title + r.body}><p className="font-medium">{r.title}</p><p className="text-xs text-muted">{r._count._all} recipients · {r._max.createdAt ? timeAgo(r._max.createdAt) : ""}</p></li>)}</ul>
            )}
          </section>
          <section className="rounded-2xl bg-card p-5 hairline">
            <h2 className="mb-3 font-medium">All notifications by type</h2>
            <ul className="space-y-1.5 text-sm">{byType.map((t) => <li key={t.type} className="flex justify-between"><span className="text-muted">{t.type.replaceAll("_", " ").toLowerCase()}</span><span className="tabular">{t._count._all}</span></li>)}</ul>
          </section>
        </div>
      </div>
    </div>
  );
}
