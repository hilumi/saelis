/**
 * Simple in-memory fixed-window rate limiter.
 *
 * DEVELOPMENT / SINGLE-INSTANCE ONLY. State lives in this process's memory, so
 * it is NOT sufficient for multi-instance or serverless production deployments
 * (each instance keeps its own counters, and counters reset on cold start).
 * For production, replace with a managed limiter (e.g. Upstash Ratelimit or a
 * Postgres-backed counter) behind this same function signature.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function checkRateLimit(
  key: string,
  { limit = 20, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {},
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (bucket.count >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

/** Test helper — clears all buckets. */
export function resetRateLimiter(): void {
  buckets.clear();
}
