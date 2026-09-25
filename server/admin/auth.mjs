// Accesso alla dashboard di amministrazione.
//
// Email in ADMIN_EMAILS + codice a 6 cifre per email (lo stesso canale del
// codice di reset password: Resend, RESEND_API_KEY + MAIL_FROM). Il codice
// vale 10 minuti e 5 tentativi; la sessione 12 ore, in un cookie HttpOnly,
// SameSite=Strict, Secure in https; nel database solo gli hash.
//
// NURVAN_ADMIN_TOKEN resta per lo script CLI (tools/plan_admin.mjs) e non apre
// la dashboard. Ogni richiesta admin passa da adminGuard, che scrive chi,
// quando e cosa in admin_audit.
import crypto from "node:crypto";

export const SESSION_HOURS = 12;
export const CODE_MINUTES = 10;
export const CODE_ATTEMPTS = 5;
export const COOKIE = "nurvan_admin";
const HOUR = 3600000;

export function adminEmails(env = process.env) {
  return String(env.ADMIN_EMAILS || "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
}
export function normalizeEmail(v) {
  return String(v || "").trim().toLowerCase().slice(0, 254);
}
function sha(value) {
  return crypto.createHash("sha256").update(String(value)).digest("hex");
}
function safeEqual(a, b) {
  const x = Buffer.from(String(a || ""));
  const y = Buffer.from(String(b || ""));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export function codeHash(secret, email, code) {
  return sha(String(secret) + "|admin-code|" + email + "|" + code);
}
export function parseCookies(header) {
  const out = {};
  String(header || "").split(";").forEach((part) => {
    const i = part.indexOf("=");
    if (i <= 0) return;
    const k = part.slice(0, i).trim();
    if (!k) return;
    try { out[k] = decodeURIComponent(part.slice(i + 1).trim()); } catch (_) { out[k] = part.slice(i + 1).trim(); }
  });
  return out;
}
export function clientIp(req) {
  // req.ip, resolved by Express from the trusted proxy: the first
  // X-Forwarded-For entry is written by the client and can be anything.
  return String(req.ip || req.socket?.remoteAddress || "").trim().slice(0, 64);
}
function isHttps(req) {
  return req.secure || String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
}
export function sessionCookie(req, token, maxAgeSec) {
  return COOKIE + "=" + encodeURIComponent(token) + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=" + maxAgeSec + (isHttps(req) ? "; Secure" : "");
}

/**
 * startLogin: a code for an address in ADMIN_EMAILS, by email. For any other
 * address nothing is sent and the answer is the same, so the list of
 * administrators cannot be probed. -> { ok, status, error? }
 */
export async function startLogin(pool, { email, env, secret, sendEmail, now = Date.now() }) {
  const addr = normalizeEmail(email);
  if (!addr || !addr.includes("@")) return { ok: false, status: 400, error: "Scrivi un indirizzo email." };
  if (!sendEmail || !sendEmail.configured) return { ok: false, status: 503, error: "Invio email non configurato sul server (RESEND_API_KEY e MAIL_FROM)." };
  if (!adminEmails(env).includes(addr)) return { ok: true, status: 200 };
  const prev = await pool.query("SELECT created_at FROM admin_login_codes WHERE email = $1", [addr]);
  if (prev.rows[0] && now - new Date(prev.rows[0].created_at).getTime() < 60000) {
    return { ok: false, status: 429, error: "Aspetta un minuto prima di chiedere un altro codice." };
  }
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  await pool.query(
    `INSERT INTO admin_login_codes(email, code_hash, expires_at, attempts, created_at)
     VALUES($1,$2,$3,0,$4)
     ON CONFLICT (email) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, created_at = EXCLUDED.created_at`,
    [addr, codeHash(secret, addr, code), new Date(now + CODE_MINUTES * 60000).toISOString(), new Date(now).toISOString()]
  );
  const sent = await sendEmail(addr, "NURVAN - codice di accesso amministrazione",
    "Il tuo codice di accesso alla dashboard NURVAN e': " + code + "\n\nScade tra " + CODE_MINUTES + " minuti. Se non l'hai chiesto tu, ignora questa email.");
  if (!sent || !sent.sent) {
    await pool.query("DELETE FROM admin_login_codes WHERE email = $1", [addr]);
    return { ok: false, status: 502, error: "Email non inviata: riprova tra poco." };
  }
  return { ok: true, status: 200 };
}

/** verifyLogin: the code, then a 12-hour session. -> { ok, status, token?, email?, expiresAt? } */
export async function verifyLogin(pool, { email, code, env, secret, req, now = Date.now() }) {
  const addr = normalizeEmail(email);
  const digits = String(code || "").replace(/\D/g, "");
  const refused = { ok: false, status: 401, error: "Codice non valido o scaduto." };
  if (!addr || digits.length !== 6 || !adminEmails(env).includes(addr)) return refused;
  const row = (await pool.query("SELECT code_hash, expires_at, attempts FROM admin_login_codes WHERE email = $1", [addr])).rows[0];
  if (!row || new Date(row.expires_at).getTime() < now || Number(row.attempts) >= CODE_ATTEMPTS) return refused;
  if (!safeEqual(row.code_hash, codeHash(secret, addr, digits))) {
    await pool.query("UPDATE admin_login_codes SET attempts = attempts + 1 WHERE email = $1", [addr]);
    return refused;
  }
  await pool.query("DELETE FROM admin_login_codes WHERE email = $1", [addr]);
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(now + SESSION_HOURS * HOUR).toISOString();
  await pool.query(
    "INSERT INTO admin_sessions(token_hash, email, created_at, expires_at, ip, user_agent) VALUES($1,$2,$3,$4,$5,$6)",
    [sha(token), addr, new Date(now).toISOString(), expiresAt, req ? clientIp(req) : null, req ? String(req.headers["user-agent"] || "").slice(0, 200) : null]
  );
  return { ok: true, status: 200, token, email: addr, expiresAt };
}

/** The session behind the cookie, or null (expired, revoked, email removed from the list). */
export async function sessionFromRequest(pool, req, { env, now = Date.now() } = {}) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (!token || token.length < 20) return null;
  const row = (await pool.query(
    "SELECT email, expires_at, revoked_at FROM admin_sessions WHERE token_hash = $1",
    [sha(token)]
  )).rows[0];
  if (!row || row.revoked_at || new Date(row.expires_at).getTime() <= now) return null;
  if (!adminEmails(env).includes(normalizeEmail(row.email))) return null;
  return { email: normalizeEmail(row.email), expiresAt: new Date(row.expires_at).toISOString(), tokenHash: sha(token) };
}

export async function logout(pool, req) {
  const token = parseCookies(req.headers.cookie)[COOKIE];
  if (token) await pool.query("UPDATE admin_sessions SET revoked_at = NOW() WHERE token_hash = $1", [sha(token)]);
}

export async function audit(pool, { actor, action, target = null, detail = {}, ip = null }) {
  try {
    await pool.query(
      "INSERT INTO admin_audit(actor, action, target, detail, ip) VALUES($1,$2,$3,$4,$5)",
      [String(actor).slice(0, 200), String(action).slice(0, 200), target == null ? null : String(target).slice(0, 200), JSON.stringify(detail || {}), ip]
    );
  } catch (err) {
    console.warn("ADMIN_AUDIT", err && err.message);
  }
}

// What the audit keeps of a request: the route, the ids, the search, and for
// changes the fields sent (values of plans and catalog, never user data).
function auditDetail(req) {
  const detail = {};
  if (req.params && Object.keys(req.params).length) detail.params = req.params;
  if (req.query && req.query.q) detail.q = String(req.query.q).slice(0, 100);
  if (req.method !== "GET" && req.body && typeof req.body === "object") {
    const body = {};
    for (const k of ["plan", "seats", "until", "source", "note", "kcal", "pro", "carb", "fat"]) {
      if (req.body[k] !== undefined) body[k] = typeof req.body[k] === "string" ? req.body[k].slice(0, 300) : req.body[k];
    }
    detail.body = body;
  }
  return detail;
}

/**
 * makeAdminGuard: (req, res) -> actor | null. The dashboard session (actor =
 * its email), or the CLI token (actor = "cli-token"). Changes from the page
 * must carry X-Nurvan-Admin and, when the browser sends Origin, come from
 * this same host. Every accepted request is written to admin_audit.
 */
export function makeAdminGuard({ pool, initDb, env = process.env }) {
  return async function adminGuard(req, res) {
    await initDb();
    let actor = null;
    const token = String(env.NURVAN_ADMIN_TOKEN || "");
    if (token.length >= 24 && req.headers["x-admin-token"] && safeEqual(req.headers["x-admin-token"], token)) {
      actor = "cli-token";
    } else {
      const session = await sessionFromRequest(pool, req, { env });
      if (session) {
        if (req.method !== "GET") {
          const origin = req.headers.origin;
          const host = req.headers["x-forwarded-host"] || req.headers.host;
          const sameOrigin = !origin || origin.replace(/^https?:\/\//, "") === host;
          if (req.headers["x-nurvan-admin"] !== "1" || !sameOrigin) {
            res.status(403).json({ error: "Richiesta non valida." });
            return null;
          }
        }
        actor = session.email;
      }
    }
    if (!actor) {
      res.status(401).json({ error: "Accedi alla dashboard." });
      return null;
    }
    await audit(pool, {
      actor,
      action: req.method + " " + ((req.route && req.route.path) || req.path),
      target: (req.params && (req.params.id || null)) || null,
      detail: auditDetail(req),
      ip: clientIp(req)
    });
    return actor;
  };
}
