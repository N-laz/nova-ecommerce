import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import { requireUserPage } from "@/lib/auth/guards";
import { MarkAllRead, NotificationLink } from "@/components/account/forms";
import { EmailPreferences } from "@/components/account/email-security";
import { NotificationIcon } from "@/components/store/notifications-menu";
import { EmptyState } from "@/components/ui/states";
import { cn, timeAgo } from "@/lib/utils";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default async function NotificationsPage() {
  const u = await requireUserPage("/account/notifications");
  const [items, prefs] = await Promise.all([
    db.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 50 }),
    db.user.findUniqueOrThrow({ where: { id: u.id }, select: { emailOrderUpdates: true, emailOffers: true } }),
  ]);
  const unread = items.filter((i) => !i.readAt).length;
  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold">Email preferences</h2>
      <EmailPreferences orderUpdates={prefs.emailOrderUpdates} offers={prefs.emailOffers} />
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Notifications {unread > 0 && <span className="ml-1 text-sm font-normal text-muted">({unread} unread)</span>}</h2>
        <MarkAllRead disabled={unread === 0} />
      </div>
      {items.length === 0 ? (
        <EmptyState icon={<Bell />} title="You're all caught up" description="Order updates, price drops and back-in-stock alerts will show up here." />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl bg-card hairline">
          {items.map((n) => (
            <li key={n.id}>
              <NotificationLink id={n.id} href={n.link} unread={!n.readAt}>
                <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-white/6"><NotificationIcon type={n.type} className="size-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-sm", !n.readAt ? "font-medium" : "text-foreground/80")}>{n.title}</span>
                  <span className="block text-sm text-muted">{n.body}</span>
                  <span className="mt-1 block text-xs text-subtle">{timeAgo(n.createdAt)}</span>
                </span>
                {!n.readAt && <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
              </NotificationLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
