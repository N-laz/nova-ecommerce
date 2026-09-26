import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { OAUTH_COOKIE, createOAuthState, googleAuthorizationUrl, isGoogleEnabled } from "@/lib/auth/providers";
import { getCurrentUser } from "@/lib/auth/session";
import { rateLimit } from "@/lib/rate-limit";
import { AppError } from "@/lib/errors";

export const dynamic = "force-dynamic";

const base = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "");

/** Start Google sign-in (or account linking with ?mode=link). */
export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  const mode = req.nextUrl.searchParams.get("mode") === "link" ? "link" : "signin";
  const back = mode === "link" ? "/account/security" : "/login";

  if (!isGoogleEnabled()) return NextResponse.redirect(`${base()}${back}?error=google_unavailable`);
  try {
    await rateLimit("oauth-start", { limit: 20, windowMs: 10 * 60_000 });
  } catch (e) {
    if (e instanceof AppError) return NextResponse.redirect(`${base()}${back}?error=rate_limited`);
    throw e;
  }

  let loginHint: string | undefined;
  if (mode === "link") {
    const user = await getCurrentUser();
    if (!user) return NextResponse.redirect(`${base()}/login?next=/account/security`);
    loginHint = user.email;
  }

  const state = createOAuthState(next, mode);
  (await cookies()).set(OAUTH_COOKIE, Buffer.from(JSON.stringify(state)).toString("base64url"), {
    httpOnly: true,
    sameSite: "lax", // must survive the top-level redirect back from Google
    secure: process.env.NODE_ENV === "production" && base().startsWith("https://"),
    path: "/api/auth/google",
    maxAge: 600,
  });
  return NextResponse.redirect(googleAuthorizationUrl(state, loginHint));
}
