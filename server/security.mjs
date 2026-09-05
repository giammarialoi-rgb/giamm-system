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
    const error = new Error("Origin not allowed by NURVAN CORS policy.");
    error.statusCode = 403;
    return callback(error);
  };
}

function requestIp(req) {
  const forwarded = req && req.headers && req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded) return forwarded.split(",")[0].trim();
  return (req && (req.ip || (req.socket && req.socket.remoteAddress))) || "unknown";
}

export function createFixedWindowRateLimiter({
  windowMs = 60_000,
  max = 60,
  keyPrefix = "generic",
  key = requestIp
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
        error: "Troppe richieste. Riprova tra poco.",
        code: "RATE_LIMITED",
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

export const SecurityTestHelpers = Object.freeze({
  requestIp
});
