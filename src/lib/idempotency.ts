/**
 * In-memory idempotency / concurrency guard for companion generations.
 *
 * Guarantees (single instance only — documented limitation, like the rate
 * limiter): a duplicate in-flight requestId is rejected, and each user has at
 * most one active generation. Completed request ids are remembered briefly so
 * a double-click after completion doesn't double-charge.
 *
 * Request ids are client-generated, non-secret, and stored only in memory.
 * A multi-instance deployment should replace this with a shared store behind
 * the same interface.
 */

interface UserState {
  active: Set<string>;
  recentlyCompleted: Map<string, number>;
}

const users = new Map<string, UserState>();

const RECENT_TTL_MS = 60_000;
const MAX_CONCURRENT_PER_USER = 1;

export type BeginResult = { ok: true } | { ok: false; reason: "duplicate" | "busy" };

export function beginGeneration(userId: string, requestId: string): BeginResult {
  const state = users.get(userId) ?? { active: new Set(), recentlyCompleted: new Map() };
  users.set(userId, state);

  const now = Date.now();
  for (const [id, at] of state.recentlyCompleted) {
    if (now - at > RECENT_TTL_MS) state.recentlyCompleted.delete(id);
  }

  if (state.active.has(requestId) || state.recentlyCompleted.has(requestId)) {
    return { ok: false, reason: "duplicate" };
  }
  if (state.active.size >= MAX_CONCURRENT_PER_USER) {
    return { ok: false, reason: "busy" };
  }
  state.active.add(requestId);
  return { ok: true };
}

export function endGeneration(userId: string, requestId: string): void {
  const state = users.get(userId);
  if (!state) return;
  state.active.delete(requestId);
  state.recentlyCompleted.set(requestId, Date.now());
}

/** Test hook. */
export function resetIdempotencyForTests(): void {
  users.clear();
}
