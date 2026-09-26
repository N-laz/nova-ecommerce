import { NextResponse, type NextRequest } from "next/server";

// Edge-level fast path: bounce visitors with no session cookie away from
// protected areas. Real authorization (session validity + role) is always
// re-checked on the server in layouts, pages and actions.
const PROTECTED = ["/account", "/checkout", "/admin", "/wishlist", "/invoice"];

export function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const needsAuth = PROTECTED.some((p) => pathname === p || pathname.startsWith(p + "/"));
  if (needsAuth && !req.cookies.get("nova_session")?.value) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|products/|media/|categories/|hero.webp|og.jpg|brand/|api/health).*)"],
};
