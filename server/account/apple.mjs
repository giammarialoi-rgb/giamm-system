// Sign in with Apple.
//
// Two ways in, one check:
// - web: the page runs Apple's JS in a popup and posts the identity token
//   here (POST /api/auth/apple);
// - Android: the app opens /api/auth/apple/start in the browser, Apple posts
//   the answer to /api/auth/apple/callback, and the server hands the app a
//   one-time ticket through giammaria://oauth/apple; the app swaps it here for
//   a session. No native SDK.
//
// The identity token is checked against Apple's public keys (signature),
// issuer, audience (our Services ID), expiry, and a nonce this server signed:
// a token minted for another site or another attempt does not open anything.
//
// Configuration: APPLE_CLIENT_ID (Services ID), APPLE_TEAM_ID, APPLE_KEY_ID,
// APPLE_PRIVATE_KEY (the .p8). Without all four the routes answer "not
// configured" and the page does not show the button. The key signs the
// client secret used to exchange the code for a refresh token, which is kept
// encrypted to revoke the app's access when the account is deleted.
import crypto from "node:crypto";
import { createRemoteJWKSet, importPKCS8, jwtVerify, SignJWT } from "jose";
import { publicUser, resolveIdentityUser } from "./identity.mjs";

export const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_AUTHORIZE = "https://appleid.apple.com/auth/authorize";
const APPLE_TOKEN = "https://appleid.apple.com/auth/token";
const APPLE_REVOKE = "https://appleid.apple.com/auth/revoke";
const STATE_TTL_MS = 10 * 60 * 1000;
const TICKET_TTL_MS = 2 * 60 * 1000;
const APP_RETURN = "giammaria://oauth/apple";

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}

export function appleConfig(env) {
  const e = env || {};
  const clientId = String(e.APPLE_CLIENT_ID || "").trim();
  const teamId = String(e.APPLE_TEAM_ID || "").trim();
  const keyId = String(e.APPLE_KEY_ID || "").trim();
  // Render and .env files often keep the .p8 on one line with literal \n.
  const privateKey = String(e.APPLE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  // Optional: the return URL registered at Apple. Without it, this server's
  // own /api/auth/apple/callback, as the request reached it.
  const redirectUri = String(e.APPLE_REDIRECT_URI || "").trim();
  return { enabled: Boolean(clientId && teamId && keyId && privateKey), clientId, teamId, keyId, privateKey, redirectUri };
}

// --- state and nonce -------------------------------------------------------
// The state travels through Apple and comes back; the nonce ends up inside
// the identity token. Both derive from one signed value, so a token is only
// accepted together with the state this server issued for it.

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

function hmac(secret, text) {
  return crypto.createHmac("sha256", String(secret)).update(text).digest("base64url");
}

export function issueAppleState(secret, mode, now = Date.now()) {
  const body = b64url(JSON.stringify({ n: crypto.randomBytes(16).toString("base64url"), m: mode === "app" ? "app" : "web", exp: now + STATE_TTL_MS }));
  const state = body + "." + hmac(secret, "apple-state:" + body);
  return { state, nonce: hmac(secret, "apple-nonce:" + body) };
}

export function readAppleState(secret, state, now = Date.now()) {
  const [body, sig] = String(state || "").split(".");
  if (!body || !sig) throw httpError(400, "Richiesta Apple non valida. Riprova.");
  const want = hmac(secret, "apple-state:" + body);
  const a = Buffer.from(sig);
  const b = Buffer.from(want);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw httpError(400, "Richiesta Apple non valida. Riprova.");
  let data;
  try { data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")); } catch (_) { throw httpError(400, "Richiesta Apple non valida. Riprova."); }
  if (!data || !(Number(data.exp) > now)) throw httpError(400, "Richiesta Apple scaduta. Riprova.");
  return { mode: data.m === "app" ? "app" : "web", nonce: hmac(secret, "apple-nonce:" + body) };
}

// --- the identity token ----------------------------------------------------

let remoteJwks = null;
export function appleJwks() {
  if (!remoteJwks) remoteJwks = createRemoteJWKSet(new URL(APPLE_ISSUER + "/auth/keys"));
  return remoteJwks;
}

function truthy(v) {
  return v === true || v === "true";
}

export async function verifyAppleIdToken(idToken, { jwks, clientId, nonce, now } = {}) {
  if (!idToken) throw httpError(400, "Token Apple mancante.");
  if (!clientId) throw httpError(503, "Accesso con Apple non configurato.");
  let payload;
  try {
    const verified = await jwtVerify(String(idToken), jwks || appleJwks(), {
      issuer: APPLE_ISSUER,
      audience: clientId,
      algorithms: ["RS256"],
      currentDate: now ? new Date(now) : undefined,
      clockTolerance: 30
    });
    payload = verified.payload;
  } catch (_) {
    throw httpError(401, "Token Apple non valido o scaduto.");
  }
  if (!payload || !payload.sub) throw httpError(401, "Token Apple non valido.");
  if (nonce !== undefined && payload.nonce !== nonce) throw httpError(401, "Token Apple non valido per questa richiesta.");
  return {
    sub: String(payload.sub),
    email: payload.email ? String(payload.email) : "",
    // A relay address (@privaterelay.appleid.com) is a real, verified
    // address: Apple forwards mail sent to it.
    emailVerified: truthy(payload.email_verified),
    privateEmail: truthy(payload.is_private_email)
  };
}

// The name arrives only on the first authorization, next to the token, as an
// object (JS) or as a JSON string (form post).
export function appleUserName(user) {
  let u = user;
  if (typeof u === "string") { try { u = JSON.parse(u); } catch (_) { u = null; } }
  const n = u && u.name;
  if (!n) return "";
  return [n.firstName, n.lastName].map((s) => String(s || "").trim()).filter(Boolean).join(" ").slice(0, 120);
}

// --- client secret, code exchange, revocation ------------------------------

export async function appleClientSecret(cfg, now = Date.now()) {
  const key = await importPKCS8(cfg.privateKey, "ES256");
  const iat = Math.floor(now / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: cfg.keyId })
    .setIssuer(cfg.teamId)
    .setIssuedAt(iat)
    .setExpirationTime(iat + 300)
    .setAudience(APPLE_ISSUER)
    .setSubject(cfg.clientId)
    .sign(key);
}

export async function exchangeAppleCode(cfg, code, redirectUri, fetchImpl = fetch) {
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: await appleClientSecret(cfg),
    code: String(code),
    grant_type: "authorization_code",
    redirect_uri: redirectUri
  });
  const res = await fetchImpl(APPLE_TOKEN, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!res.ok) throw new Error("apple_token_" + res.status);
  const json = await res.json();
  return json && json.refresh_token ? String(json.refresh_token) : "";
}

export async function revokeAppleToken(cfg, refreshToken, fetchImpl = fetch) {
  const body = new URLSearchParams({
    client_id: cfg.clientId,
    client_secret: await appleClientSecret(cfg),
    token: refreshToken,
    token_type_hint: "refresh_token"
  });
  const res = await fetchImpl(APPLE_REVOKE, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  return res.ok;
}

function refreshKey(secret) {
  return crypto.createHash("sha256").update("apple-refresh:" + String(secret)).digest();
}

export function sealRefreshToken(secret, token) {
  if (!token) return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", refreshKey(secret), iv);
  const enc = Buffer.concat([cipher.update(String(token), "utf8"), cipher.final()]);
  return b64url(Buffer.concat([iv, cipher.getAuthTag(), enc]));
}

export function openRefreshToken(secret, sealed) {
  const raw = Buffer.from(String(sealed || ""), "base64url");
  if (raw.length < 29) return "";
  const decipher = crypto.createDecipheriv("aes-256-gcm", refreshKey(secret), raw.subarray(0, 12));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString("utf8");
}

// --- one-time tickets for the app --------------------------------------------

function ticketHash(ticket) {
  return crypto.createHash("sha256").update(String(ticket)).digest("hex");
}

export async function issueLoginTicket(pool, userId, now = Date.now()) {
  const ticket = crypto.randomBytes(32).toString("base64url");
  await pool.query(
    "INSERT INTO app_login_tickets(ticket_hash, user_id, expires_at) VALUES($1, $2, $3)",
    [ticketHash(ticket), userId, new Date(now + TICKET_TTL_MS).toISOString()]
  );
  return ticket;
}

export async function consumeLoginTicket(pool, ticket, now = Date.now()) {
  const gone = await pool.query(
    "DELETE FROM app_login_tickets WHERE ticket_hash = $1 RETURNING user_id, expires_at",
    [ticketHash(ticket)]
  );
  const row = gone.rows[0];
  if (!row || new Date(row.expires_at).getTime() <= now) throw httpError(401, "Accesso scaduto: riprova con Apple.");
  const user = await pool.query("SELECT id, email, name, provider, avatar_url FROM app_users WHERE id = $1", [row.user_id]);
  if (!user.rows.length) throw httpError(401, "Account non trovato.");
  return user.rows[0];
}

// --- routes ------------------------------------------------------------------

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// The page the browser shows after Apple, on the phone: back to the app.
function returnPage(res, href, message) {
  res.set("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
  res.set("Cache-Control", "no-store");
  res.set("Referrer-Policy", "no-referrer");
  res.type("html").send(
    "<!doctype html><html lang=\"it\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
    "<meta http-equiv=\"refresh\" content=\"0;url=" + escHtml(href) + "\"><title>Nurvan</title></head>" +
    "<body style=\"font:16px system-ui,sans-serif;background:#000;color:#fff;text-align:center;padding:48px 16px;\">" +
    "<p>" + escHtml(message) + "</p>" +
    "<p><a href=\"" + escHtml(href) + "\" style=\"display:inline-block;padding:12px 20px;border-radius:8px;background:#fff;color:#000;text-decoration:none;font-weight:600;\">Torna a Nurvan</a></p>" +
    "</body></html>"
  );
}

// The form post from Apple, with its own small body parser. `target` is filled
// by mountAppleAuth later: the server registers this route first, before CORS.
export function appleCallbackRoute(app, urlencoded, target) {
  app.post("/api/auth/apple/callback", urlencoded, (req, res, next) => {
    if (target.handle) return target.handle(req, res, next);
    return res.status(503).type("text").send("Non pronto.");
  });
}

export function mountAppleAuth(app, deps) {
  const { pool, initDb, secret, accountFromBearer, issueAccountToken } = deps;
  const env = deps.env || process.env;
  const fetchImpl = deps.fetchImpl || ((...a) => fetch(...a));
  const jwks = () => deps.jwks || appleJwks();
  const cfg = () => appleConfig(env);
  const redirectUri = (req) => cfg().redirectUri || (req.protocol + "://" + req.get("host") + "/api/auth/apple/callback");

  // Apple's answer turned into an account: verify, link or create, keep the
  // refresh token for a later revocation.
  async function signIn({ idToken, code, user, state, redirect, linkingUserId }) {
    const c = cfg();
    if (!c.enabled) throw httpError(503, "Accesso con Apple non configurato.");
    const st = readAppleState(secret, state);
    const id = await verifyAppleIdToken(idToken, { jwks: jwks(), clientId: c.clientId, nonce: st.nonce });
    let refreshTokenEnc = null;
    if (code) {
      try { refreshTokenEnc = sealRefreshToken(secret, await exchangeAppleCode(c, code, redirect, fetchImpl)); }
      catch (err) { console.warn("APPLE_CODE_EXCHANGE", err && err.message); }
    }
    if (initDb) await initDb();
    const resolved = await resolveIdentityUser(pool, {
      provider: "apple", sub: id.sub, email: id.email, emailVerified: id.emailVerified,
      name: appleUserName(user), linkingUserId, refreshTokenEnc
    });
    return { ...resolved, mode: st.mode };
  }

  app.get("/api/auth/apple/web-config", (req, res) => {
    const c = cfg();
    if (!c.enabled) return res.status(404).json({ enabled: false });
    const { state, nonce } = issueAppleState(secret, "web");
    res.set("Cache-Control", "no-store");
    return res.json({ enabled: true, clientId: c.clientId, redirectURI: redirectUri(req), scope: "name email", state, nonce });
  });

  app.post("/api/auth/apple", async (req, res) => {
    try {
      const body = req.body || {};
      if (body.ticket) {
        if (initDb) await initDb();
        const user = await consumeLoginTicket(pool, body.ticket);
        return res.json({ token: issueAccountToken(user), user: publicUser(user) });
      }
      const auth = await accountFromBearer(req.headers.authorization);
      const out = await signIn({
        idToken: body.id_token || body.idToken,
        code: body.code,
        user: body.user,
        state: body.state,
        redirect: redirectUri(req),
        linkingUserId: auth && auth.role === "user" ? auth.id : null
      });
      return res.json({ token: issueAccountToken(out.user), user: publicUser(out.user), created: out.created });
    } catch (err) {
      if (!err.statusCode) console.error("APPLE_AUTH_ERROR", err);
      return res.status(err.statusCode || 500).json({ error: err.statusCode ? err.message : "Accesso con Apple non riuscito." });
    }
  });

  // Android: the browser goes to Apple from here.
  app.get("/api/auth/apple/start", (req, res) => {
    const c = cfg();
    if (!c.enabled) return returnPage(res, APP_RETURN + "?error=not_configured", "Accesso con Apple non disponibile.");
    const { state, nonce } = issueAppleState(secret, "app");
    const q = new URLSearchParams({
      response_type: "code id_token",
      response_mode: "form_post",
      client_id: c.clientId,
      redirect_uri: redirectUri(req),
      scope: "name email",
      state,
      nonce
    });
    res.set("Cache-Control", "no-store");
    return res.redirect(302, APPLE_AUTHORIZE + "?" + q.toString());
  });

  // Apple posts here (form_post), from the browser opened by the app. The
  // caller registers it (see appleCallbackRoute): it has to sit before the
  // CORS allowlist, since the post comes from appleid.apple.com.
  const callbackHandler = async (req, res) => {
    const body = req.body || {};
    if (body.error) return returnPage(res, APP_RETURN + "?error=cancelled", "Accesso con Apple annullato.");
    try {
      const out = await signIn({ idToken: body.id_token, code: body.code, user: body.user, state: body.state, redirect: redirectUri(req), linkingUserId: null });
      if (out.mode !== "app") throw httpError(400, "Richiesta Apple non valida. Riprova.");
      const ticket = await issueLoginTicket(pool, out.user.id);
      return returnPage(res, APP_RETURN + "?code=" + encodeURIComponent(ticket), "Accesso riuscito. Torna a Nurvan.");
    } catch (err) {
      if (!err.statusCode) console.error("APPLE_CALLBACK_ERROR", err);
      return returnPage(res, APP_RETURN + "?error=failed", err.statusCode ? err.message : "Accesso con Apple non riuscito.");
    }
  };

  return {
    callbackHandler,
    // After an account is deleted: revoke the app's access on Apple's side.
    async revokeIdentities(identities) {
      const c = cfg();
      if (!c.enabled) return 0;
      let revoked = 0;
      for (const idn of identities || []) {
        if (idn.provider !== "apple" || !idn.refresh_token_enc) continue;
        try {
          const token = openRefreshToken(secret, idn.refresh_token_enc);
          if (token && await revokeAppleToken(c, token, fetchImpl)) revoked++;
        } catch (err) { console.warn("APPLE_REVOKE", err && err.message); }
      }
      return revoked;
    }
  };
}
