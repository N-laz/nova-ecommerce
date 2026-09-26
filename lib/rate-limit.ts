import { headers } from "next/headers";
import { AppError } from "./errors";

/**
 * Rate limiting behind a small interface so the in-memory store can be
 * replaced by Redis/Upstash in multi-instance deployments without touching callers.
 */
export interface RateLimitStore {
  hit(key: string, windowMs: number): Promise<{ count: number; resetAt: number }>;
}

class MemoryStore implements RateLimitStore {
  private buckets = new Map<string, { count: number; resetAt: number }>();
  async hit(key: string, windowMs: number) {
    const now = Date.now();
    const b = this.buckets.get(key);
    if (!b || b.resetAt < now) {
      const fresh = { count: 1, resetAt: now + windowMs };
      this.buckets.set(key, fresh);
      if (this.buckets.size > 10_000) this.sweep(now);
      return fresh;
    }
    b.count++;
    return b;
  }
  private sweep(now: number) {
    for (const [k, v] of this.buckets) if (v.resetAt < now) this.buckets.delete(k);
  }
}

const g = globalThis as unknown as { __novaRateStore?: RateLimitStore };
const store: RateLimitStore = g.__novaRateStore ?? (g.__novaRateStore = new MemoryStore());

export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
}

export async function rateLimit(name: string, { limit, windowMs, key }: { limit: number; windowMs: number; key?: string }) {
  const id = `${name}:${key ?? (await clientIp())}`;
  const { count, resetAt } = await store.hit(id, windowMs);
  if (count > limit) {
    const secs = Math.ceil((resetAt - Date.now()) / 1000);
    throw new AppError(`Too many attempts. Please try again in ${secs}s.`, "RATE_LIMITED", 429);
  }
}
