"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, Boxes, ShoppingCart, TicketPercent, MessageSquareText, Users, Megaphone, Mail, ExternalLink, LogOut } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { logoutAction } from "@/lib/actions/auth";
import { cn } from "@/lib/utils";

const NAV = [
  ["/admin", "Dashboard", LayoutDashboard],
  ["/admin/products", "Products", Package],
  ["/admin/inventory", "Inventory", Boxes],
  ["/admin/orders", "Orders", ShoppingCart],
  ["/admin/coupons", "Coupons", TicketPercent],
  ["/admin/reviews", "Reviews", MessageSquareText],
  ["/admin/customers", "Customers", Users],
  ["/admin/notifications", "Broadcast", Megaphone],
  ["/admin/emails", "Emails", Mail],
] as const;

export function AdminSidebar({ name, pendingReviews }: { name: string; pendingReviews: number }) {
  const path = usePathname();
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface/60 p-4 lg:flex">
        <Link href="/admin" className="mb-8 flex items-center gap-2 px-2 pt-1"><Logo /><span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#b3a1ff]">Admin</span></Link>
        <nav className="flex-1 space-y-0.5" aria-label="Admin">
          {NAV.map(([href, label, Icon]) => {
            const active = href === "/admin" ? path === href : path.startsWith(href);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition", active ? "bg-white/8 text-foreground" : "text-muted hover:bg-white/4 hover:text-foreground")}>
                <Icon className="size-4" /> <span className="flex-1">{label}</span>
                {label === "Reviews" && pendingReviews > 0 && <span className="rounded-full bg-warning/20 px-1.5 text-[11px] text-warning tabular">{pendingReviews}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="space-y-1 border-t border-border pt-4 text-sm">
          <Link href="/" className="flex items-center gap-3 rounded-lg px-3 py-2 text-muted hover:bg-white/4 hover:text-foreground"><ExternalLink className="size-4" /> View store</Link>
          <form action={logoutAction}><button className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted hover:bg-white/4 hover:text-foreground cursor-pointer"><LogOut className="size-4" /> Sign out</button></form>
          <p className="truncate px-3 pt-2 text-xs text-subtle">{name}</p>
        </div>
      </aside>
      <nav className="no-scrollbar sticky top-0 z-30 flex gap-1 overflow-x-auto border-b border-border bg-background/90 px-3 py-2 backdrop-blur lg:hidden" aria-label="Admin">
        {NAV.map(([href, label, Icon]) => {
          const active = href === "/admin" ? path === href : path.startsWith(href);
          return <Link key={href} href={href} className={cn("flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs", active ? "bg-white/10" : "text-muted")}><Icon className="size-3.5" />{label}</Link>;
        })}
        <Link href="/" className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted"><ExternalLink className="size-3.5" />Store</Link>
      </nav>
    </>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
