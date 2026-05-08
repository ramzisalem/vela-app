/**
 * Stub rate limiter. File 03 spec: 30/hr, 200/day per user. In production,
 * back this with Redis / Upstash. Here we use an in-memory cache that
 * resets per Edge runtime (good enough for dev; replace before prod).
 */
const HOUR_LIMIT = 30;
const DAY_LIMIT = 200;

interface Bucket {
  count: number;
  resetAt: number;
}

const hourly = new Map<string, Bucket>();
const daily = new Map<string, Bucket>();

function checkBucket(key: string, map: Map<string, Bucket>, limit: number, windowMs: number) {
  const now = Date.now();
  const b = map.get(key);
  if (!b || b.resetAt < now) {
    map.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= limit) return { ok: false, retryAfter: Math.ceil((b.resetAt - now) / 1000) };
  b.count++;
  return { ok: true };
}

export function isRateLimited(userId: string): { ok: boolean; retryAfter?: number } {
  const h = checkBucket(`hr:${userId}`, hourly, HOUR_LIMIT, 60 * 60 * 1000);
  if (!h.ok) return h;
  const d = checkBucket(`day:${userId}`, daily, DAY_LIMIT, 24 * 60 * 60 * 1000);
  return d;
}
