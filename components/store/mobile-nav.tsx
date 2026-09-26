"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Heart, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "./store-provider";

export function MobileNav() {
  const pathname = usePathname();
  const { cartCount, setCartOpen, wishlist, user } = useStore();
  const item = "relative flex flex-1 flex-col items-center gap-1 py-2 text-[10px] tracking-wide";
  const is = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));
  return (
    <nav aria-label="Mobile" className="glass fixed inset-x-0 bottom-0 z-40 flex border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden">
      <Link href="/" className={cn(item, is("/") ? "text-foreground" : "text-muted")}><Home className="size-5" />Home</Link>
      <Link href="/shop" className={cn(item, is("/shop") ? "text-foreground" : "text-muted")}><LayoutGrid className="size-5" />Shop</Link>
      <Link href="/wishlist" className={cn(item, is("/wishlist") ? "text-foreground" : "text-muted")}>
        <Heart className="size-5" />Wishlist
        {wishlist.size > 0 && <span className="absolute right-[30%] top-1.5 size-2 rounded-full bg-[#ff5a7a]" />}
      </Link>
      <button onClick={() => setCartOpen(true)} className={cn(item, "text-muted cursor-pointer")}>
        <ShoppingBag className="size-5" />Cart
        {cartCount > 0 && <span className="absolute right-[26%] top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-semibold leading-4 text-white">{cartCount}</span>}
      </button>
      <Link href={user ? "/account" : "/login"} className={cn(item, is("/account") || is("/login") ? "text-foreground" : "text-muted")}><User className="size-5" />Account</Link>
    </nav>
  );
}
