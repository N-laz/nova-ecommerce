"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Package, Heart, Star, Sparkles, Bell, MapPin, User, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  ["/account", "Overview", LayoutGrid],
  ["/account/orders", "Orders", Package],
  ["/wishlist", "Wishlist", Heart],
  ["/account/reviews", "Reviews", Star],
  ["/account/rewards", "NOVA Rewards", Sparkles],
  ["/account/notifications", "Notifications", Bell],
  ["/account/addresses", "Addresses", MapPin],
  ["/account/profile", "Profile", User],
  ["/account/security", "Security", Shield],
] as const;

export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
      {LINKS.map(([href, label, Icon]) => {
        const active = href === "/account" ? path === href : path.startsWith(href);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={cn("flex shrink-0 items-center gap-2.5 rounded-full px-3.5 py-2 text-sm transition lg:rounded-xl", active ? "bg-white/8 text-foreground" : "text-muted hover:bg-white/4 hover:text-foreground")}>
            <Icon className="size-4" /> {label}
          </Link>
        );
      })}
    </nav>
  );
}
