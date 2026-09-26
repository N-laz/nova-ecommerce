"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, Package, Truck, CheckCircle2, XCircle, TrendingDown, PackageCheck, Megaphone, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { getNotificationsAction, markNotificationReadAction } from "@/lib/actions/engagement";
import { cn, timeAgo } from "@/lib/utils";
import type { NotificationDTO } from "@/types";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  ORDER_CONFIRMED: Package,
  ORDER_UPDATE: Package,
  ORDER_SHIPPED: Truck,
  ORDER_DELIVERED: CheckCircle2,
  ORDER_CANCELLED: XCircle,
  PRICE_DROP: TrendingDown,
  BACK_IN_STOCK: PackageCheck,
  PROMOTIONAL: Megaphone,
};

export function NotificationIcon({ type, className }: { type: string; className?: string }) {
  const I = ICONS[type] ?? Bell;
  return <I className={className} />;
}

export function NotificationsMenu({ initialUnread }: { initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const [items, setItems] = useState<NotificationDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    const res = await getNotificationsAction().catch(() => null);
    if (!res || !res.ok) {
      setError(res && !res.ok ? res.error : "Couldn't load notifications.");
      return;
    }
    setItems(res.data.items);
    setUnread(res.data.unread);
  }

  async function markAll() {
    const res = await markNotificationReadAction();
    if (res.ok) {
      setUnread(0);
      setItems((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
    }
  }

  async function markOne(id: string) {
    const target = items?.find((n) => n.id === id);
    if (!target || target.read) return;
    setItems((prev) => prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? null);
    setUnread((u) => Math.max(0, u - 1));
    await markNotificationReadAction(id);
  }

  return (
    <DropdownMenu onOpenChange={(o) => o && load()}>
      <DropdownMenuTrigger asChild>
        <button className="relative grid size-9 place-items-center rounded-full hover:bg-white/6 cursor-pointer" aria-label={`Notifications, ${unread} unread`}>
          <Bell className="size-[18px]" />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-[18px] tabular">{unread > 9 ? "9+" : unread}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[360px] max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs text-accent hover:underline cursor-pointer">Mark all read</button>
          )}
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {error ? (
            <p className="px-4 py-8 text-center text-sm text-danger">{error}</p>
          ) : items === null ? (
            <div className="grid place-items-center py-10 text-muted"><Loader2 className="size-5 animate-spin" /></div>
          ) : items.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <Bell className="mx-auto size-6 text-subtle" />
              <p className="mt-2 text-sm text-muted">You&apos;re all caught up.</p>
            </div>
          ) : (
            items.map((n) => {
              const inner = (
                <div className={cn("flex gap-3 px-4 py-3 transition hover:bg-white/4", !n.read && "bg-accent/[0.06]")}>
                  <div className={cn("mt-0.5 grid size-8 shrink-0 place-items-center rounded-full", n.read ? "bg-white/5 text-muted" : "bg-accent-soft text-[#b3a1ff]")}>
                    <NotificationIcon type={n.type} className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-snug">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted">{n.body}</p>
                    <p className="mt-1 text-[11px] text-subtle">{timeAgo(n.createdAt)}</p>
                  </div>
                  {!n.read && <span className="mt-2 size-2 shrink-0 rounded-full bg-accent" aria-label="Unread" />}
                </div>
              );
              return n.link ? (
                <Link key={n.id} href={n.link} onClick={() => markOne(n.id)} className="block">{inner}</Link>
              ) : (
                <button key={n.id} onClick={() => markOne(n.id)} className="block w-full text-left">{inner}</button>
              );
            })
          )}
        </div>
        <Link href="/account/notifications" className="block border-t border-border px-4 py-3 text-center text-xs text-muted hover:text-foreground">View all notifications</Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
