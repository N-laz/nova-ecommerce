"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { addToCartAction } from "@/lib/actions/cart";
import { toggleWishlistAction } from "@/lib/actions/wishlist";
import { toggleCompareAction } from "@/lib/actions/browse";
import type { CartSummaryDTO } from "@/types";

type StoreUser = { id: string; name: string; email: string; role: "CUSTOMER" | "ADMIN" } | null;

type StoreCtx = {
  user: StoreUser;
  cartCount: number;
  cart: CartSummaryDTO | null;
  setCart: (c: CartSummaryDTO) => void;
  cartOpen: boolean;
  setCartOpen: (v: boolean) => void;
  searchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  wishlist: Set<string>;
  compare: string[];
  addToCart: (productId: string, opts?: { quantity?: number; color?: string; openDrawer?: boolean }) => Promise<boolean>;
  toggleWishlist: (productId: string) => Promise<void>;
  toggleCompare: (productId: string) => Promise<void>;
  pending: Set<string>;
};

const Ctx = React.createContext<StoreCtx | null>(null);

export function useStore() {
  const c = React.useContext(Ctx);
  if (!c) throw new Error("useStore must be used within StoreProvider");
  return c;
}

export function StoreProvider({ user, initialCartCount, initialWishlist, initialCompare, children }: { user: StoreUser; initialCartCount: number; initialWishlist: string[]; initialCompare: string[]; children: React.ReactNode }) {
  const router = useRouter();
  const [cartCount, setCartCount] = React.useState(initialCartCount);
  const [cart, setCartState] = React.useState<CartSummaryDTO | null>(null);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [wishlist, setWishlist] = React.useState(() => new Set(initialWishlist));
  const [compare, setCompare] = React.useState(initialCompare);
  const [pending, setPending] = React.useState<Set<string>>(new Set());

  // Sync when server re-renders (e.g. after login / navigation refresh)
  React.useEffect(() => setCartCount(initialCartCount), [initialCartCount]);
  React.useEffect(() => setWishlist(new Set(initialWishlist)), [initialWishlist]);
  React.useEffect(() => setCompare(initialCompare), [initialCompare]);

  const mark = (key: string, on: boolean) =>
    setPending((prev) => {
      const n = new Set(prev);
      if (on) n.add(key);
      else n.delete(key);
      return n;
    });

  const setCart = React.useCallback((c: CartSummaryDTO) => {
    setCartState(c);
    setCartCount(c.itemCount);
  }, []);

  const addToCart: StoreCtx["addToCart"] = async (productId, opts = {}) => {
    mark(`cart:${productId}`, true);
    try {
      const res = await addToCartAction(productId, opts.quantity ?? 1, opts.color ?? "");
      if (!res.ok) {
        toast.error(res.error);
        return false;
      }
      setCart(res.data);
      toast.success("Added to cart", { action: { label: "View cart", onClick: () => setCartOpen(true) } });
      if (opts.openDrawer) setCartOpen(true);
      return true;
    } catch {
      toast.error("Couldn't reach the server. Check your connection and try again.");
      return false;
    } finally {
      mark(`cart:${productId}`, false);
    }
  };

  const toggleWishlist: StoreCtx["toggleWishlist"] = async (productId) => {
    if (!user) {
      toast("Sign in to save items to your wishlist.", { action: { label: "Sign in", onClick: () => router.push(`/login?next=${encodeURIComponent(location.pathname)}`) } });
      return;
    }
    const was = wishlist.has(productId);
    setWishlist((prev) => {
      const n = new Set(prev);
      if (was) n.delete(productId);
      else n.add(productId);
      return n;
    });
    const res = await toggleWishlistAction(productId).catch(() => null);
    if (!res || !res.ok) {
      setWishlist((prev) => {
        const n = new Set(prev);
        if (was) n.add(productId);
        else n.delete(productId);
        return n;
      });
      toast.error(res && !res.ok ? res.error : "Couldn't update your wishlist.");
      return;
    }
    toast.success(res.message ?? "Wishlist updated");
  };

  const toggleCompare: StoreCtx["toggleCompare"] = async (productId) => {
    const res = await toggleCompareAction(productId).catch(() => null);
    if (!res || !res.ok) {
      toast.error(res && !res.ok ? res.error : "Couldn't update comparison.");
      return;
    }
    setCompare(res.data.ids);
    toast.success(res.data.added ? "Added to compare" : "Removed from compare", res.data.added && res.data.ids.length > 1 ? { action: { label: `Compare (${res.data.ids.length})`, onClick: () => router.push("/compare") } } : undefined);
  };

  return (
    <Ctx.Provider value={{ user, cartCount, cart, setCart, cartOpen, setCartOpen, searchOpen, setSearchOpen, wishlist, compare, addToCart, toggleWishlist, toggleCompare, pending }}>
      {children}
    </Ctx.Provider>
  );
}
