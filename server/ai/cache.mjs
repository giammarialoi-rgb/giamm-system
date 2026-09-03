import crypto from 'node:crypto';

/**
 * Small in-memory TTL cache. Keys must NEVER include raw user PII payloads across users.
 * Cache is keyed by hash(userId + normalizedQuestion + domainFlags) for generic FAQs only
 * when question looks non-personal — gateway decides eligibility.
 */
export function createAiCache(config) {
  const map = new Map();

  function prune() {
    const now = Date.now();
    for (const [k, v] of map) {
      if (v.expiresAt <= now) map.delete(k);
    }
    while (map.size > (config.cacheMaxEntries || 500)) {
      const first = map.keys().next().value;
      map.delete(first);
    }
  }

  return {
    enabled: () => Boolean(config.cacheEnabled),
    makeKey(userId, question, domains) {
      const raw = `${userId}|${String(question).toLowerCase().trim()}|${(domains || []).join(',')}`;
      return crypto.createHash('sha256').update(raw).digest('hex');
    },
    get(key) {
      if (!config.cacheEnabled) return null;
      prune();
      const hit = map.get(key);
      if (!hit) return null;
      if (hit.expiresAt <= Date.now()) {
        map.delete(key);
        return null;
      }
      return hit.value;
    },
    set(key, value) {
      if (!config.cacheEnabled) return;
      prune();
      map.set(key, { value, expiresAt: Date.now() + (config.cacheTtlMs || 300000) });
    },
    clear() {
      map.clear();
    },
    size() {
      return map.size;
    }
  };
}

/** Only cache short generic coaching questions without personal numbers/emails */
export function isCacheableQuestion(question) {
  const q = String(question || '');
  if (q.length < 12 || q.length > 180) return false;
  if (/\b\d{2,}\b/.test(q)) return false;
  if (/@/.test(q)) return false;
  if (/\b(mio|mia|miei|mie|kg|settimana\s*\d)\b/i.test(q) && /\d/.test(q)) return false;
  return /^(come|cosa|qual[ei]|perch[eé]|what|how|why|quando)\b/i.test(q.trim());
}
