"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, Heart, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "./store-provider";

export function MobileNav() {
  const pathname = usePathname();
  const { cartCount, setCartOpen, wishlist, user } = useStore();
  const item = "relative flex flex-1 flex-col items-center justify-center gap-1 min-h-[48px] py-1.5 text-[11px] font-medium tracking-wide";
  const is = (p: string) => (p === "/" ? pathname === "/" : pathname.startsWith(p));
  return (
    <nav aria-label="Mobile navigation" className="glass fixed inset-x-0 bottom-0 z-40 flex border-t border-border pb-[env(safe-area-inset-bottom)] md:hidden">
      <Link href="/" className={cn(item, is("/") ? "text-foreground" : "text-muted")} aria-label="Home">
        <Home className="size-5" aria-hidden="true" />
        <span>Home</span>
      </Link>
      <Link href="/shop" className={cn(item, is("/shop") ? "text-foreground" : "text-muted")} aria-label="Shop categories and products">
        <LayoutGrid className="size-5" aria-hidden="true" />
        <span>Shop</span>
      </Link>
      <Link href="/wishlist" className={cn(item, is("/wishlist") ? "text-foreground" : "text-muted")} aria-label={`Wishlist, ${wishlist.size} saved items`}>
        <Heart className="size-5" aria-hidden="true" />
        <span>Wishlist</span>
        {wishlist.size > 0 && <span className="absolute right-[28%] top-1.5 size-2 rounded-full bg-[#ff5a7a]" aria-hidden="true" />}
      </Link>
      <button type="button" onClick={() => setCartOpen(true)} className={cn(item, "text-muted cursor-pointer")} aria-label={`Cart, ${cartCount} items`}>
        <ShoppingBag className="size-5" aria-hidden="true" />
        <span>Cart</span>
        {cartCount > 0 && <span className="absolute right-[24%] top-1 grid min-w-4 place-items-center rounded-full bg-accent px-1 text-[9px] font-semibold leading-4 text-white" aria-hidden="true">{cartCount}</span>}
      </button>
      <Link href={user ? "/account" : "/login"} className={cn(item, is("/account") || is("/login") ? "text-foreground" : "text-muted")} aria-label={user ? "My account" : "Sign in"}>
        <User className="size-5" aria-hidden="true" />
        <span>{user ? "Account" : "Sign in"}</span>
      </Link>
    </nav>
  );
}
