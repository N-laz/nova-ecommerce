import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { COMPARE_COOKIE } from "@/lib/auth/constants";
import { getCartCount } from "@/lib/services/cart";
import { getWishlistIds } from "@/lib/services/wishlist";
import { StoreProvider } from "@/components/store/store-provider";
import { Navbar } from "@/components/store/navbar";
import { SearchDialog } from "@/components/store/search-dialog";
import { CartDrawer } from "@/components/store/cart-drawer";
import { MobileNav } from "@/components/store/mobile-nav";
import { Footer } from "@/components/store/footer";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const jar = await cookies();
  const [cartCount, wishlist, unread] = await Promise.all([
    getCartCount(),
    user ? getWishlistIds(user.id) : Promise.resolve([] as string[]),
    user ? db.notification.count({ where: { userId: user.id, readAt: null } }) : Promise.resolve(0),
  ]);
  const compare = (jar.get(COMPARE_COOKIE)?.value ?? "").split(".").filter(Boolean);

  return (
    <StoreProvider user={user ? { id: user.id, name: user.name, email: user.email, role: user.role } : null} initialCartCount={cartCount} initialWishlist={wishlist} initialCompare={compare}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-white focus:px-4 focus:py-2 focus:text-black">Skip to content</a>
      <Navbar unread={unread} />
      <main id="main" className="min-h-[70vh]">{children}</main>
      <Footer />
      <MobileNav />
      <SearchDialog />
      <CartDrawer />
    </StoreProvider>
  );
}
