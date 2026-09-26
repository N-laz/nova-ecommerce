import "server-only";
/**
 * OAuth providers. Google is implemented as a standard OpenID Connect
 * authorization-code flow with PKCE, state and nonce, and the ID token is
 * verified against Google's published keys (JWKS).
 *
 * Enable by setting GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET. The authorised
 * redirect URI in Google Cloud Console must be:
 *   {NEXT_PUBLIC_APP_URL}/api/auth/google/callback
 *
 * GOOGLE_AUTH_URL / GOOGLE_TOKEN_URL / GOOGLE_JWKS_URL / GOOGLE_ISSUER exist only so
 * the flow can be exercised end-to-end against a local OIDC test server; leave them unset.
 */
import { createHash, randomBytes } from "node:crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { db } from "@/lib/db";
import { AppError } from "@/lib/errors";

export type OAuthProfile = { provider: string; providerAccountId: string; email: string; emailVerified: boolean; name: string; image?: string | null };

export function googleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  return {
    enabled: Boolean(clientId && clientSecret),
    clientId,
    clientSecret,
    authorizationEndpoint: process.env.GOOGLE_AUTH_URL || "https://accounts.google.com/o/oauth2/v2/auth",
    tokenEndpoint: process.env.GOOGLE_TOKEN_URL || "https://oauth2.googleapis.com/token",
    jwksUri: process.env.GOOGLE_JWKS_URL || "https://www.googleapis.com/oauth2/v3/certs",
    issuers: process.env.GOOGLE_ISSUER ? [process.env.GOOGLE_ISSUER] : ["https://accounts.google.com", "accounts.google.com"],
    redirectUri: `${(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "")}/api/auth/google/callback`,
    scope: "openid email profile",
  };
}

export const isGoogleEnabled = () => googleConfig().enabled;

export const OAUTH_COOKIE = "nova_oauth";
export type OAuthState = { state: string; verifier: string; nonce: string; next: string; mode: "signin" | "link"; createdAt: number };

export function createOAuthState(next: string, mode: OAuthState["mode"]): OAuthState {
  return { state: randomBytes(24).toString("base64url"), verifier: randomBytes(48).toString("base64url"), nonce: randomBytes(24).toString("base64url"), next, mode, createdAt: Date.now() };
}

export function googleAuthorizationUrl(s: OAuthState, loginHint?: string) {
  const cfg = googleConfig();
  const url = new URL(cfg.authorizationEndpoint);
  url.search = new URLSearchParams({
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    response_type: "code",
    scope: cfg.scope,
    state: s.state,
    nonce: s.nonce,
    code_challenge: createHash("sha256").update(s.verifier).digest("base64url"),
    code_challenge_method: "S256",
    prompt: "select_account",
    ...(loginHint ? { login_hint: loginHint } : {}),
  }).toString();
  return url.toString();
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null;
let jwksFor = "";

/** Exchange the authorization code and return a verified profile from the ID token. */
export async function exchangeGoogleCode(code: string, s: OAuthState): Promise<{ profile: OAuthProfile; tokens: { accessToken?: string; refreshToken?: string; idToken: string; expiresAt?: number; scope?: string; tokenType?: string } }> {
  const cfg = googleConfig();
  const res = await fetch(cfg.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: cfg.redirectUri, client_id: cfg.clientId, client_secret: cfg.clientSecret, code_verifier: s.verifier }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = (await res.json().catch(() => ({}))) as { id_token?: string; access_token?: string; refresh_token?: string; expires_in?: number; scope?: string; token_type?: string; error?: string };
  if (!res.ok || !body.id_token) throw new AppError("Google sign-in failed while exchanging the code.", "OAUTH_EXCHANGE");

  if (!jwks || jwksFor !== cfg.jwksUri) {
    jwks = createRemoteJWKSet(new URL(cfg.jwksUri));
    jwksFor = cfg.jwksUri;
  }
  const { payload } = await jwtVerify(body.id_token, jwks, { issuer: cfg.issuers, audience: cfg.clientId, clockTolerance: 60 }).catch(() => {
    throw new AppError("We couldn't verify the response from Google.", "OAUTH_TOKEN");
  });
  if (payload.nonce !== s.nonce) throw new AppError("Google sign-in expired. Please try again.", "OAUTH_NONCE");
  if (typeof payload.sub !== "string" || typeof payload.email !== "string") throw new AppError("Google didn't share an email address.", "OAUTH_PROFILE");

  return {
    profile: {
      provider: "google",
      providerAccountId: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true || payload.email_verified === "true",
      name: typeof payload.name === "string" && payload.name.trim() ? payload.name.trim().slice(0, 80) : payload.email.split("@")[0],
      image: typeof payload.picture === "string" ? payload.picture : null,
    },
    tokens: {
      idToken: body.id_token,
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      expiresAt: body.expires_in ? Math.floor(Date.now() / 1000) + body.expires_in : undefined,
      scope: body.scope,
      tokenType: body.token_type,
    },
  };
}

type Tokens = Awaited<ReturnType<typeof exchangeGoogleCode>>["tokens"];

/**
 * Sign-in resolution:
 *  1. Known Google account → that user.
 *  2. Existing NOVA user with the same email → link, but only if Google says the email is verified
 *     (otherwise anyone could claim an address and take over the account).
 *  3. Otherwise create a new customer.
 */
export async function signInWithOAuth(profile: OAuthProfile, tokens: Tokens) {
  const existing = await db.account.findUnique({
    where: { provider_providerAccountId: { provider: profile.provider, providerAccountId: profile.providerAccountId } },
    include: { user: true },
  });
  if (existing) {
    await db.account.update({ where: { id: existing.id }, data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken ?? existing.refreshToken, idToken: tokens.idToken, expiresAt: tokens.expiresAt, scope: tokens.scope, email: profile.email } });
    return { user: existing.user, created: false, linked: false };
  }
  if (!profile.emailVerified) throw new AppError("Your Google email isn't verified, so we can't use it to sign in.", "OAUTH_UNVERIFIED");

  const byEmail = await db.user.findUnique({ where: { email: profile.email } });
  if (byEmail) {
    await db.$transaction([
      db.account.create({ data: { userId: byEmail.id, type: "oidc", provider: profile.provider, providerAccountId: profile.providerAccountId, email: profile.email, ...tokens } }),
      db.user.update({ where: { id: byEmail.id }, data: { emailVerified: byEmail.emailVerified ?? new Date(), image: byEmail.image ?? profile.image } }),
    ]);
    return { user: byEmail, created: false, linked: true };
  }

  const user = await db.user.create({
    data: {
      email: profile.email,
      name: profile.name,
      image: profile.image,
      emailVerified: new Date(),
      accounts: { create: { type: "oidc", provider: profile.provider, providerAccountId: profile.providerAccountId, email: profile.email, ...tokens } },
      rewardAccount: { create: { balance: 100, lifetimeEarned: 100, transactions: { create: { type: "EARNED", points: 100, description: "Welcome bonus" } } } },
    },
  });
  return { user, created: true, linked: false };
}

/** Attach a Google account to the signed-in user (from Account → Security). */
export async function linkOAuthToUser(userId: string, profile: OAuthProfile, tokens: Tokens) {
  const existing = await db.account.findUnique({ where: { provider_providerAccountId: { provider: profile.provider, providerAccountId: profile.providerAccountId } } });
  if (existing && existing.userId !== userId) throw new AppError("That Google account is already connected to a different NOVA account.", "OAUTH_IN_USE");
  if (existing) return { alreadyLinked: true };
  const other = await db.account.findFirst({ where: { userId, provider: profile.provider } });
  if (other) throw new AppError("A Google account is already connected. Disconnect it first.", "OAUTH_ALREADY");
  await db.account.create({ data: { userId, type: "oidc", provider: profile.provider, providerAccountId: profile.providerAccountId, email: profile.email, ...tokens } });
  return { alreadyLinked: false };
}
