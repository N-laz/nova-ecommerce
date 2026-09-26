import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { OAUTH_COOKIE, exchangeGoogleCode, linkOAuthToUser, signInWithOAuth, type OAuthState } from "@/lib/auth/providers";
import { createSession, getCurrentUser } from "@/lib/auth/session";
import { mergeGuestCart } from "@/lib/services/cart";
import { notify } from "@/lib/services/notification";
import { dispatch, sendEmail } from "@/lib/email";
import { googleLinkedTemplate, welcomeGoogleTemplate } from "@/lib/email/templates";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const base = () => (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

const ERROR_CODES: Record<string, string> = {
  OAUTH_UNVERIFIED: "google_unverified",
  OAUTH_IN_USE: "google_in_use",
  OAUTH_ALREADY: "google_already",
  OAUTH_NONCE: "google_expired",
};

function readState(raw: string | undefined): OAuthState | null {
  if (!raw) return null;
  try {
    const s = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OAuthState;
    if (!s.state || !s.verifier || !s.nonce || Date.now() - s.createdAt > 10 * 60_000) return null;
    return s;
  } catch {
    return null;
  }
}

function same(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export async function GET(req: NextRequest) {
  const jar = await cookies();
  const saved = readState(jar.get(OAUTH_COOKIE)?.value);
  jar.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });

  const back = saved?.mode === "link" ? "/account/security" : "/login";
  const fail = (code: string) => NextResponse.redirect(`${base()}${back}?error=${code}${saved?.next && back === "/login" ? `&next=${encodeURIComponent(saved.next)}` : ""}`);

  const params = req.nextUrl.searchParams;
  if (params.get("error")) return fail(params.get("error") === "access_denied" ? "google_cancelled" : "google_failed");
  const code = params.get("code");
  const state = params.get("state");
  if (!saved || !code || !state || !same(state, saved.state)) return fail("google_expired");

  try {
    const { profile, tokens } = await exchangeGoogleCode(code, saved);

    if (saved.mode === "link") {
      const user = await getCurrentUser();
      if (!user) return NextResponse.redirect(`${base()}/login?next=/account/security`);
      const r = await linkOAuthToUser(user.id, profile, tokens);
      if (!r.alreadyLinked) {
        const rendered = googleLinkedTemplate(user.name, profile.email);
        dispatch(() => sendEmail({ to: user.email, userId: user.id, template: "security.google_linked", rendered }));
      }
      return NextResponse.redirect(`${base()}/account/security?linked=google`);
    }

    const { user, created, linked } = await signInWithOAuth(profile, tokens);
    await createSession(user.id);
    await mergeGuestCart(user.id);
    if (created) {
      await notify(user.id, "PROMOTIONAL", "Welcome to NOVA", "You've got 100 NOVA points to start. Use code WELCOME500 for ₹500 off your first order above ₹10,000.", "/shop");
      const rendered = welcomeGoogleTemplate(user.name);
      dispatch(() => sendEmail({ to: user.email, userId: user.id, template: "account.welcome_google", rendered }));
    } else if (linked) {
      const rendered = googleLinkedTemplate(user.name, profile.email);
      dispatch(() => sendEmail({ to: user.email, userId: user.id, template: "security.google_linked", rendered }));
    }
    const dest = saved.next || (user.role === "ADMIN" ? "/admin" : "/account");
    return NextResponse.redirect(`${base()}${dest}`);
  } catch (err) {
    if (err instanceof AppError) {
      logger.warn("oauth.google", { code: err.code, message: err.message });
      return fail(ERROR_CODES[err.code] ?? "google_failed");
    }
    logger.error("oauth.google", err);
    return fail("google_failed");
  }
}
