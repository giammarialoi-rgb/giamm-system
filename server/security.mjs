const DEV_JWT_SECRET = "nurvan-development-only-secret-change-before-production";

export function isProduction(env = process.env) {
  return String(env.NODE_ENV || "").toLowerCase() === "production";
}

export function resolveJwtSecret(env = process.env) {
  const configured = String(env.JWT_SECRET || "").trim();
  if (configured.length >= 32) return configured;
  if (isProduction(env)) {
    throw new Error("JWT_SECRET must be configured with at least 32 characters in production.");
  }
  return configured || DEV_JWT_SECRET;
}

export function configuredCorsOrigins(env = process.env) {
  const values = new Set();
  String(env.CORS_ORIGINS || "")
    .split(",")
    .map((value) => value.trim().replace(/\/$/, ""))
    .filter(Boolean)
    .forEach((value) => values.add(value));
  [env.RENDER_EXTERNAL_URL, env.PUBLIC_APP_URL]
    .map((value) => String(value || "").trim().replace(/\/$/, ""))
    .filter(Boolean)
    .forEach((value) => values.add(value));
  // Production web is served from this API today. Keep the canonical origin
  // while allowing operators to replace/extend it through CORS_ORIGINS.
  values.add("https://coach-api-gemini.onrender.com");
  return values;
}

export function isCorsOriginAllowed(origin, env = process.env) {
  if (!origin || origin === "null" || origin === "file://") return true;
  const normalized = String(origin).trim().replace(/\/$/, "");
  if (configuredCorsOrigins(env).has(normalized)) return true;
  if (!isProduction(env)) {
    try {
      const parsed = new URL(normalized);
      return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
    } catch (_) {
      return false;
    }
  }
  return false;
}

export function buildCorsOriginValidator(env = process.env) {
  return function validateCorsOrigin(origin, callback) {
    if (isCorsOriginAllowed(origin, env)) return callback(null, true);
    // The origin used to be left out of the error entirely, so a rejection
    // only ever surfaced as a bare "not allowed" message plus a full Express
    // default-handler stack trace flooding the logs - no way to tell which
    // origin actually needs whitelisting without reproducing it locally.
    console.warn("[CORS_REJECTED]", JSON.stringify({ origin: origin || null, at: new Date().toISOString() }));
    const error = new Error(`Origin not allowed by NURVAN CORS policy: ${origin || "(none)"}`);
    error.statusCode = 403;
    error.corsOrigin = origin || null;
    return callback(error);
  };
}

// The address the proxy in front of us saw, not the first X-Forwarded-For
// entry: that one is whatever the client wrote, and a new value per request
// used to get past every limit. Express resolves req.ip from the trusted
// hops ("trust proxy" in coach-api.mjs).
function requestIp(req) {
  return (req && (req.ip || (req.socket && req.socket.remoteAddress))) || "unknown";
}

export function createFixedWindowRateLimiter({
  windowMs = 60_000,
  max = 60,
  keyPrefix = "generic",
  key = requestIp,
  code = "RATE_LIMITED",
  message = "Troppe richieste. Riprova tra poco."
} = {}) {
  const buckets = new Map();

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const bucketKey = keyPrefix + ":" + String(key(req) || "unknown");
    let bucket = buckets.get(bucketKey);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(bucketKey, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: message,
        code,
        retryAfter
      });
    }
    if (buckets.size > 10_000) {
      for (const [storedKey, stored] of buckets) {
        if (now >= stored.resetAt) buckets.delete(storedKey);
      }
    }
    return next();
  };
}

/** PostgreSQL fixed-window limiter for multi-instance Cloud Run deployments.
 * Falls back only when explicitly configured as memory or the database is not
 * available (useful for local development); production operators should set
 * RATE_LIMIT_STORE=postgres and DATABASE_URL. */
export function createPostgresFixedWindowRateLimiter({ getPool, windowMs = 60_000, max = 60, keyPrefix = "generic", key = requestIp, code = "RATE_LIMITED", message = "Troppe richieste. Riprova tra poco." } = {}) {
  const fallback = createFixedWindowRateLimiter({ windowMs, max, keyPrefix, key, code, message });
  let tableReady = false;
  return async function rateLimit(req, res, next) {
    if (String(process.env.RATE_LIMIT_STORE || "memory").toLowerCase() !== "postgres") return fallback(req, res, next);
    try {
      const pool = getPool?.();
      if (!pool) throw new Error("pool unavailable");
      if (!tableReady) {
        await pool.query("CREATE TABLE IF NOT EXISTS rate_limit_buckets (bucket_key TEXT PRIMARY KEY, window_start TIMESTAMPTZ NOT NULL, count INTEGER NOT NULL)");
        tableReady = true;
      }
      const now = Date.now();
      const start = new Date(Math.floor(now / windowMs) * windowMs);
      const bucketKey = `${keyPrefix}:${String(key(req) || "unknown")}`;
      const result = await pool.query(`INSERT INTO rate_limit_buckets(bucket_key, window_start, count) VALUES($1, $2, 1)
        ON CONFLICT(bucket_key) DO UPDATE SET count = CASE WHEN rate_limit_buckets.window_start = EXCLUDED.window_start THEN rate_limit_buckets.count + 1 ELSE 1 END, window_start = EXCLUDED.window_start
        RETURNING count`, [bucketKey, start]);
      if (Number(result.rows[0]?.count || 0) > max) {
        const retryAfter = Math.max(1, Math.ceil((start.getTime() + windowMs - now) / 1000));
        res.setHeader("Retry-After", String(retryAfter));
        return res.status(429).json({ error: message, code, retryAfter });
      }
      return next();
    } catch (err) {
      if (isProduction()) return next(err);
      return fallback(req, res, next);
    }
  };
}

export const SecurityTestHelpers = Object.freeze({
  requestIp
});
