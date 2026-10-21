/**
 * Lightweight in-memory rate limiter (06-security.md Section 13).
 * Defends against automated rapid submission without adding external infrastructure.
 */
type RateLimitRecord = { count: number; resetAt: number };
const store = new Map<string, RateLimitRecord>();

// Cleanup stale entries periodically to prevent memory accumulation
let lastCleanup = Date.now();
function cleanupStale(now: number) {
  if (now - lastCleanup < 60_000) return;
  lastCleanup = now;
  for (const [key, record] of store.entries()) {
    if (record.resetAt <= now) {
      store.delete(key);
    }
  }
}

/**
 * Checks if a given key has exceeded the limit within the specified window.
 * @param key unique identifier (e.g. IP address or token ID)
 * @param limit maximum allowed actions in the window
 * @param windowMs window duration in milliseconds (default: 60,000ms = 1 min)
 * @returns true if allowed, false if limit exceeded
 */
export function checkRateLimit(key: string, limit: number = 5, windowMs: number = 60_000): boolean {
  const now = Date.now();
  cleanupStale(now);

  const record = store.get(key);
  if (!record || record.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (record.count >= limit) {
    return false;
  }

  record.count += 1;
  return true;
}
