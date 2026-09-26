import "server-only";
import { createHash, randomBytes } from "node:crypto";
import type { AuthTokenType } from "@prisma/client";
import { db } from "@/lib/db";

export const TOKEN_TTL: Record<AuthTokenType, number> = {
  PASSWORD_RESET: 30 * 60_000,
  EMAIL_VERIFY: 24 * 60 * 60_000,
};

function hash(raw: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) throw new Error("AUTH_SECRET is missing or too short");
  return createHash("sha256").update(`auth-token.${raw}.${secret}`).digest("hex");
}

/** Issue a fresh single-use token. Any earlier unused token of the same type is invalidated. */
export async function issueAuthToken(userId: string, type: AuthTokenType) {
  const raw = randomBytes(32).toString("base64url");
  await db.$transaction([
    db.authToken.deleteMany({ where: { userId, type, usedAt: null } }),
    db.authToken.create({ data: { userId, type, tokenHash: hash(raw), expiresAt: new Date(Date.now() + TOKEN_TTL[type]) } }),
  ]);
  return raw;
}

/** Look up a token without consuming it (used to render the reset/verify page). */
export async function peekAuthToken(raw: string | undefined, type: AuthTokenType) {
  if (!raw || raw.length < 20 || raw.length > 100) return null;
  const t = await db.authToken.findUnique({ where: { tokenHash: hash(raw) }, include: { user: { select: { id: true, email: true, name: true, emailVerified: true } } } });
  if (!t || t.type !== type || t.usedAt || t.expiresAt < new Date()) return null;
  return t;
}

/**
 * Atomically consume a token: the conditional update guarantees that two
 * concurrent requests can't both use the same link.
 */
export async function consumeAuthToken(raw: string, type: AuthTokenType) {
  if (!raw || raw.length < 20 || raw.length > 100) return null;
  const tokenHash = hash(raw);
  const res = await db.authToken.updateMany({ where: { tokenHash, type, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
  if (res.count !== 1) return null;
  return db.authToken.findUnique({ where: { tokenHash }, include: { user: true } });
}
