// Session tokens that can be ended.
//
// A session is a signed token valid 90 days; on its own nothing could end it
// early - not a password reset, not an account taken back from whoever had
// registered its address, not a deleted account. Each account now has a
// moment before which its tokens are refused (app_users.tokens_valid_after),
// and a token of an account that no longer exists is refused too.
//
// The check is one indexed read per request, cached for a short while, so a
// revocation takes effect within that time on every route. The moment is
// written with this server's clock, the same one that stamps the tokens.

const GRACE_MS = 2000;

export function revocationMoment(now = Date.now()) {
  return new Date(now).toISOString();
}

// Refused when issued before the account's moment (with a small grace for the
// token issued in the same second as the reset that moved it).
export function tokenStillValid(iatSec, validAfter) {
  if (!validAfter) return true;
  const after = new Date(validAfter).getTime();
  if (!Number.isFinite(after)) return true;
  const iatMs = Number(iatSec) * 1000;
  if (!Number.isFinite(iatMs)) return false;
  return iatMs + GRACE_MS >= after;
}

export function createSessionGate({ getPool, enabled = () => true, ttlMs = 30_000, now = () => Date.now() }) {
  const cache = new Map();
  let warned = false;

  async function lookup(userId) {
    const key = String(userId);
    const hit = cache.get(key);
    if (hit && now() - hit.at < ttlMs) return hit;
    const res = await getPool().query("SELECT tokens_valid_after FROM app_users WHERE id = $1", [userId]);
    const entry = { at: now(), exists: res.rows.length > 0, validAfter: res.rows[0] ? res.rows[0].tokens_valid_after : null };
    cache.set(key, entry);
    if (cache.size > 20_000) cache.clear();
    return entry;
  }

  return {
    // true: the token may be used. Without a database (tests, local runs) or
    // when the read fails, the signature alone decides, as before.
    async allows(payload) {
      if (!payload || !payload.sub) return false;
      if (!enabled()) return true;
      try {
        const entry = await lookup(payload.sub);
        if (!entry.exists) return false;
        return tokenStillValid(payload.iat, entry.validAfter);
      } catch (err) {
        if (!warned) { warned = true; console.warn("SESSION_GATE_UNAVAILABLE", err && err.message); }
        return true;
      }
    },
    forget(userId) {
      cache.delete(String(userId));
    }
  };
}
