/**
 * Pluggable counter store for rate limit / quota.
 * memory: single-instance (document limitation for multi-instance).
 * redis: optional when REDIS_URL / AI_REDIS_URL set (lazy import).
 */

export function createMemoryStore() {
  const buckets = new Map();

  function keyData(key) {
    let b = buckets.get(key);
    if (!b) {
      b = { count: 0, resetAt: 0, tokens: 0 };
      buckets.set(key, b);
    }
    return b;
  }

  return {
    kind: 'memory',
    async incr(key, windowMs) {
      const now = Date.now();
      const b = keyData(key);
      if (!b.resetAt || now >= b.resetAt) {
        b.count = 0;
        b.tokens = 0;
        b.resetAt = now + windowMs;
      }
      b.count += 1;
      return { count: b.count, resetAt: b.resetAt };
    },
    async get(key, windowMs) {
      const now = Date.now();
      const b = keyData(key);
      if (!b.resetAt || now >= b.resetAt) {
        return { count: 0, tokens: 0, resetAt: now + windowMs };
      }
      return { count: b.count, tokens: b.tokens || 0, resetAt: b.resetAt };
    },
    async addTokens(key, windowMs, tokens) {
      const now = Date.now();
      const b = keyData(key);
      if (!b.resetAt || now >= b.resetAt) {
        b.count = 0;
        b.tokens = 0;
        b.resetAt = now + windowMs;
      }
      b.tokens = (b.tokens || 0) + tokens;
      return { count: b.count, tokens: b.tokens, resetAt: b.resetAt };
    },
    async reset(key) {
      buckets.delete(key);
    },
    /** Test helper */
    _size() {
      return buckets.size;
    },
    _clear() {
      buckets.clear();
    }
  };
}

export async function createStore(config) {
  if (config.storeBackend === 'redis' && config.redisUrl) {
    // Optional Redis — not required for local/dev. Adapter keeps same interface.
    try {
      const mod = await import('node:net'); // placeholder guard
      void mod;
      console.warn('[AI] REDIS_URL set but Redis client not bundled; using in-memory store. Add ioredis later without changing /api/chat.');
    } catch (_) {}
  }
  return createMemoryStore();
}
