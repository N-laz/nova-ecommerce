"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Search, ShoppingBag, Heart, User, LogOut, Package, LayoutDashboard, Gift, Settings, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogTrigger, SheetContent, DialogClose } from "@/components/ui/dialog";
import { logoutAction } from "@/lib/actions/auth";
import { useStore } from "./store-provider";
import { NotificationsMenu } from "./notifications-menu";

const LINKS = [
  { href: "/shop", label: "Shop" },
  { href: "/shop?category=smartphones", label: "Phones" },
  { href: "/shop?category=laptops", label: "Laptops" },
  { href: "/shop?category=audio", label: "Audio" },
  { href: "/shop?category=wearables", label: "Wearables" },
  { href: "/shop?category=gaming", label: "Gaming" },
  { href: "/compare", label: "Compare" },
];

export function Navbar({ unread }: { unread: number }) {
  const { user, cartCount, setCartOpen, setSearchOpen, wishlist } = useStore();
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen]);

  return (
    <header className={cn("sticky top-0 z-40 transition-colors duration-300", scrolled ? "glass border-b border-border" : "border-b border-transparent")}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 md:px-6">
        <Dialog>
          <DialogTrigger asChild>
            <button className="grid size-9 place-items-center rounded-full hover:bg-white/6 lg:hidden cursor-pointer" aria-label="Open menu">
              <Menu className="size-5" />
            </button>
          </DialogTrigger>
          <SheetContent side="left" title="Menu" className="p-6">
            <Logo />
            <nav className="mt-8 flex flex-col gap-1" aria-label="Mobile">
              {LINKS.map((l) => (
                <DialogClose asChild key={l.href}>
                  <Link href={l.href} className="rounded-xl px-3 py-2.5 text-[15px] hover:bg-white/5">{l.label}</Link>
                </DialogClose>
              ))}
            </nav>
          </SheetContent>
        </Dialog>

        <Link href="/" className="shrink-0" aria-label="NOVA home">
          <Logo />
        </Link>

        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Primary">
          {LINKS.map((l) => {
            const active = l.href === "/shop" ? pathname === "/shop" : pathname.startsWith(l.href.split("?")[0]) && l.href === "/compare";
            return (
              <Link key={l.href} href={l.href} className={cn("rounded-full px-3 py-1.5 text-[13px] text-muted transition-colors hover:text-foreground", active && "text-foreground")}>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(true)}
            className="hidden h-9 items-center gap-2 rounded-full bg-white/5 pl-3 pr-2 text-[13px] text-muted hairline transition hover:bg-white/8 md:flex cursor-pointer"
            aria-label="Search products"
          >
            <Search className="size-4" />
            <span className="w-28 text-left">Search</span>
            <kbd className="rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
          </button>
          <button onClick={() => setSearchOpen(true)} className="grid size-9 place-items-center rounded-full hover:bg-white/6 md:hidden cursor-pointer" aria-label="Search products">
            <Search className="size-[18px]" />
          </button>

          {user && <NotificationsMenu initialUnread={unread} />}

          <Link href="/wishlist" className="relative hidden size-9 place-items-center rounded-full hover:bg-white/6 md:grid" aria-label={`Wishlist, ${wishlist.size} items`}>
            <Heart className="size-[18px]" />
            {wishlist.size > 0 && <span className="absolute right-1 top-1 size-2 rounded-full bg-[#ff5a7a]" />}
          </Link>

          <button onClick={() => setCartOpen(true)} className="relative grid size-9 place-items-center rounded-full hover:bg-white/6 cursor-pointer" aria-label={`Cart, ${cartCount} items`}>
            <ShoppingBag className="size-[18px]" />
            {cartCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[10px] font-semibold leading-[18px] tabular">{cartCount > 99 ? "99+" : cartCount}</span>
            )}
          </button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="ml-1 grid size-9 place-items-center rounded-full bg-gradient-to-br from-accent to-[#4a36b8] text-[13px] font-semibold cursor-pointer" aria-label="Account menu">
                  {user.name.slice(0, 1).toUpperCase()}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-60">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium text-foreground">{user.name}</div>
                  <div className="truncate">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {user.role === "ADMIN" && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin"><LayoutDashboard /> Admin dashboard</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild><Link href="/account"><User /> My account</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/account/orders"><Package /> Orders</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/wishlist"><Heart /> Wishlist</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/account/rewards"><Gift /> NOVA Rewards</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/account/security"><Settings /> Security</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <form action={logoutAction}>
                  <button type="submit" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-danger hover:bg-danger/10 cursor-pointer">
                    <LogOut className="size-4" /> Sign out
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild size="sm" variant="secondary" className="ml-1 hidden sm:inline-flex">
              <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
