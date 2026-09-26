// Email and password accounts, the way any online service runs them.
//
// - Sign-up sends a verification email: a 6-digit code to type in the app and
//   a link for the browser (/verifica-email). An account registered with a
//   password logs in only once its address is verified; the ones created
//   before verification existed keep working (email_verify_required false).
// - Password reset: the code already in the app, plus a link to
//   /reimposta-password. Receiving either proves the address, so a reset
//   also verifies it.
// - Logged in: change the password (the other devices are signed out and an
//   email says so), or sign out every other device.
// - Wrong passwords are counted per address: after LOGIN_MAX_FAILURES in
//   LOGIN_WINDOW_MS that address is refused until the window ends, however
//   many networks the guesses come from.
//
// Codes and link tokens are stored hashed (bcrypt for the 6 digits, SHA-256
// for the 256-bit link tokens). Accounts made by a coach for an athlete have
// no real address (c.<token>@client.nurvan.internal) and are left out.
import crypto from "node:crypto";

export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;
export const RESET_TTL_MS = 60 * 60 * 1000;
export const RESEND_GAP_MS = 60 * 1000;
export const CODE_MAX_ATTEMPTS = 8;
export const LOGIN_MAX_FAILURES = 10;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const PASSWORD_MIN = 8;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}
export function validEmail(email) {
  return EMAIL_RE.test(String(email || ""));
}
export function isSyntheticEmail(email) {
  return /@client\.nurvan\.internal$/i.test(String(email || ""));
}
export function linkTokenHash(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}
function newCode() {
  return String(crypto.randomInt(100000, 1000000));
}
function newLinkToken() {
  return crypto.randomBytes(32).toString("base64url");
}
function httpError(statusCode, message, extra) {
  return Object.assign(new Error(message), { statusCode, extra });
}

// Whether this account has to verify its address before logging in.
export function needsEmailVerification(user) {
  return !!(user && user.email_verify_required && !user.email_verified_at && user.provider !== "coach_client");
}

// ---- the emails ----------------------------------------------------------

function escHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// A plain branded email: the text version is what every client can show,
// the HTML one the same words with the code and the button set apart.
export function composeEmail({ title, intro, code, button, outro }) {
  const lines = [title, "", intro];
  if (code) lines.push("", "Codice: " + code);
  if (button) lines.push("", button.label + ": " + button.href);
  if (outro) lines.push("", outro);
  lines.push("", "— NURVAN");
  const html = '<!doctype html><html><body style="margin:0;background:#0b0b0b;font-family:Helvetica,Arial,sans-serif;color:#eee;">' +
    '<div style="max-width:480px;margin:0 auto;padding:28px 22px;">' +
    '<div style="font-weight:900;letter-spacing:3px;color:#d4af37;font-size:14px;margin-bottom:18px;">NURVAN</div>' +
    '<h1 style="font-size:20px;margin:0 0 12px;color:#fff;">' + escHtml(title) + '</h1>' +
    '<p style="font-size:14px;line-height:1.5;color:#ccc;margin:0 0 18px;">' + escHtml(intro) + '</p>' +
    (code ? '<div style="font-size:30px;font-weight:900;letter-spacing:8px;color:#d4af37;background:#161616;border:1px solid #333;border-radius:10px;padding:14px;text-align:center;margin:0 0 18px;">' + escHtml(code) + '</div>' : '') +
    (button ? '<p style="text-align:center;margin:0 0 18px;"><a href="' + escHtml(button.href) + '" style="display:inline-block;background:#d4af37;color:#111;font-weight:800;text-decoration:none;padding:12px 20px;border-radius:10px;font-size:14px;">' + escHtml(button.label) + '</a></p>' : '') +
    (outro ? '<p style="font-size:12px;line-height:1.5;color:#888;margin:0;">' + escHtml(outro) + '</p>' : '') +
    '</div></body></html>';
  return { text: lines.join("\n"), html };
}

export function verificationEmail(code, link) {
  return {
    subject: "NURVAN — conferma la tua email",
    ...composeEmail({
      title: "Conferma la tua email",
      intro: "Per attivare il tuo account NURVAN inserisci questo codice nell'app, oppure tocca il pulsante.",
      code,
      button: { label: "Conferma email", href: link },
      outro: "Il codice e il link valgono 24 ore. Se non hai creato tu l'account, ignora questa email: senza conferma l'account non si attiva."
    })
  };
}
export function resetEmail(code, link) {
  return {
    subject: "NURVAN — recupero password",
    ...composeEmail({
      title: "Reimposta la password",
      intro: "Inserisci questo codice nell'app insieme alla nuova password, oppure tocca il pulsante per sceglierla nel browser.",
      code,
      button: { label: "Scegli una nuova password", href: link },
      outro: "Codice e link valgono 60 minuti. Se non hai chiesto tu il recupero, ignora questa email: la password resta quella di prima."
    })
  };
}
export function passwordChangedEmail(origin) {
  return {
    subject: "NURVAN — password cambiata",
    ...composeEmail({
      title: "La tua password è stata cambiata",
      intro: "La password del tuo account NURVAN è appena stata cambiata e gli altri dispositivi sono stati disconnessi.",
      button: { label: "Non sono stato io: reimposta la password", href: origin + "/reimposta-password" },
      outro: "Se sei stato tu, non devi fare nulla."
    })
  };
}

// ---- verification --------------------------------------------------------

// A new code and link for this account, sent by email. At most one a minute.
// Returns { sent, throttled, reason, code } - code only for the caller to
// show in development, when no email can be sent.
export async function startEmailVerification(pool, user, { sendEmail, origin, now = Date.now() }) {
  const recent = await pool.query("SELECT created_at FROM app_email_verifications WHERE user_id = $1", [user.id]);
  if (recent.rows[0] && now - new Date(recent.rows[0].created_at).getTime() < RESEND_GAP_MS) {
    return { sent: false, throttled: true };
  }
  const code = newCode();
  const token = newLinkToken();
  const codeHash = await sendEmail.hash(code);
  await pool.query(
    `INSERT INTO app_email_verifications(user_id, email, code_hash, link_hash, expires_at, attempts, created_at)
     VALUES($1, $2, $3, $4, $5, 0, $6)
     ON CONFLICT (user_id) DO UPDATE SET email = $2, code_hash = $3, link_hash = $4, expires_at = $5,
       attempts = CASE WHEN app_email_verifications.expires_at > $6 THEN app_email_verifications.attempts ELSE 0 END,
       created_at = $6`,
    [user.id, user.email, codeHash, linkTokenHash(token), new Date(now + VERIFY_TTL_MS).toISOString(), new Date(now).toISOString()]
  );
  const mail = verificationEmail(code, origin + "/verifica-email?t=" + encodeURIComponent(token));
  const res = await sendEmail(user.email, mail.subject, mail.text, mail.html);
  return { sent: !!(res && res.sent), reason: res && res.reason, code };
}

async function markVerified(pool, userId) {
  await pool.query("UPDATE app_users SET email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW() WHERE id = $1", [userId]);
  await pool.query("DELETE FROM app_email_verifications WHERE user_id = $1", [userId]);
}

// ---- wrong passwords -----------------------------------------------------

export async function loginLocked(pool, email, now = Date.now()) {
  const r = await pool.query("SELECT failures, window_start FROM app_login_failures WHERE email = $1", [email]);
  const row = r.rows[0];
  if (!row) return false;
  const start = new Date(row.window_start).getTime();
  return now - start < LOGIN_WINDOW_MS && Number(row.failures) >= LOGIN_MAX_FAILURES;
}
export async function noteLoginFailure(pool, email, now = Date.now()) {
  const at = new Date(now).toISOString();
  const windowStart = new Date(now - LOGIN_WINDOW_MS).toISOString();
  await pool.query(
    `INSERT INTO app_login_failures(email, failures, window_start) VALUES($1, 1, $2)
     ON CONFLICT (email) DO UPDATE SET
       failures = CASE WHEN app_login_failures.window_start > $3 THEN app_login_failures.failures + 1 ELSE 1 END,
       window_start = CASE WHEN app_login_failures.window_start > $3 THEN app_login_failures.window_start ELSE $2 END`,
    [email, at, windowStart]
  );
}
export async function clearLoginFailures(pool, email) {
  await pool.query("DELETE FROM app_login_failures WHERE email = $1", [email]);
}

// ---- routes --------------------------------------------------------------

export function mountEmailAuth(app, deps) {
  const { pool, initDb, sendEmail, hashPassword, verifyPassword, issueAccountToken, accountFromBearer, sessionGate, revocationMoment, publicUser } = deps;
  const env = deps.env || process.env;
  const production = () => (deps.isProduction ? deps.isProduction(env) : env.NODE_ENV === "production");
  const origin = (req) => String(env.PUBLIC_APP_URL || "").replace(/\/+$/, "") ||
    (String(req.headers["x-forwarded-proto"] || req.protocol || "https").split(",")[0].trim() + "://" +
      String(req.headers["x-forwarded-host"] || req.headers.host || "localhost").split(",")[0].trim());
  const mailer = Object.assign((to, subject, text, html) => sendEmail(to, subject, text, html), { hash: (s) => hashPassword(s) });

  const route = (fn) => async (req, res) => {
    try {
      if (!env.DATABASE_URL && !deps.pool) return res.status(503).json({ error: "Database non configurato." });
      if (initDb) await initDb();
      return await fn(req, res);
    } catch (err) {
      if (err && err.statusCode) return res.status(err.statusCode).json({ error: err.message, ...(err.extra || {}) });
      console.error("EMAIL_AUTH_ERROR", err && err.message ? err.message : err);
      return res.status(500).json({ error: "Operazione non riuscita. Riprova." });
    }
  };
  const sessionFor = (user) => ({ token: issueAccountToken(user), user: publicUser(user) });
  const USER_COLS = "id, email, name, provider, avatar_url, password_hash, email_verified_at, email_verify_required";

  // What the app says after sending (or failing to send) a verification email.
  function deliveryAnswer(sent, extra = {}) {
    if (sent.sent) return { delivery: "email", message: "Ti abbiamo inviato un codice di 6 cifre. Controlla la posta (anche lo spam).", ...extra };
    if (sent.throttled) return { delivery: "email", message: "Ti abbiamo appena inviato un codice: controlla la posta, o riprova tra un minuto.", ...extra };
    if (production()) {
      console.warn("VERIFY_DELIVERY_UNAVAILABLE", sent.reason || "mail_failed");
      return { delivery: "unavailable", message: "Non riusciamo a inviare l'email in questo momento. Riprova tra qualche minuto con «Invia di nuovo».", ...extra };
    }
    return { delivery: "inline", code: sent.code, message: "Codice di verifica (sviluppo, nessuna email): inseriscilo sotto.", ...extra };
  }

  // The code from the email, typed in the app: verified, and logged in.
  app.post("/api/auth/verify-email", route(async (req, res) => {
    const email = normalizeEmail(req.body && req.body.email);
    const code = String((req.body && req.body.code) || "").trim();
    if (!validEmail(email) || !/^\d{6}$/.test(code)) throw httpError(400, "Inserisci l'email e il codice di 6 cifre.");
    const u = await pool.query("SELECT " + USER_COLS + " FROM app_users WHERE email = $1", [email]);
    const user = u.rows[0];
    if (!user) throw httpError(400, "Codice non valido o scaduto.");
    if (user.email_verified_at) return res.json({ ...sessionFor(user), alreadyVerified: true });
    const counted = await pool.query(
      `UPDATE app_email_verifications SET attempts = attempts + 1
       WHERE user_id = $1 AND attempts < $2 AND expires_at > NOW() RETURNING code_hash`,
      [user.id, CODE_MAX_ATTEMPTS]
    );
    const row = counted.rows[0];
    if (!row) throw httpError(400, "Codice scaduto o troppi tentativi. Tocca «Invia di nuovo» per riceverne uno nuovo.");
    if (!(await verifyPassword(code, row.code_hash))) throw httpError(400, "Codice non valido.");
    await markVerified(pool, user.id);
    return res.json({ ...sessionFor(user), verified: true });
  }));

  // The link from the email, opened in a browser: verified; the app then logs in.
  app.post("/api/auth/verify-email-link", route(async (req, res) => {
    const token = String((req.body && req.body.token) || "");
    if (token.length < 20) throw httpError(400, "Link non valido.");
    const r = await pool.query(
      "SELECT user_id, email FROM app_email_verifications WHERE link_hash = $1 AND expires_at > NOW()",
      [linkTokenHash(token)]
    );
    const row = r.rows[0];
    if (!row) throw httpError(400, "Link scaduto o già usato. Dall'app puoi chiedere un nuovo codice.");
    await markVerified(pool, row.user_id);
    return res.json({ ok: true, email: row.email });
  }));

  // A new verification email. Same answer whether the address has an account or not.
  app.post("/api/auth/resend-verification", route(async (req, res) => {
    const email = normalizeEmail(req.body && req.body.email);
    if (!validEmail(email)) throw httpError(400, "Inserisci un'email valida.");
    const generic = { ok: true, delivery: "email", message: "Se l'account esiste e non è ancora confermato, ti abbiamo inviato un nuovo codice." };
    const u = await pool.query("SELECT " + USER_COLS + " FROM app_users WHERE email = $1", [email]);
    const user = u.rows[0];
    if (!user || user.email_verified_at || isSyntheticEmail(email)) return res.json(generic);
    const sent = await startEmailVerification(pool, user, { sendEmail: mailer, origin: origin(req) });
    return res.json({ ok: true, ...deliveryAnswer(sent) });
  }));

  // The reset link from the email: a new password chosen in the browser.
  app.post("/api/auth/reset-password-link", route(async (req, res) => {
    const token = String((req.body && req.body.token) || "");
    const password = String((req.body && req.body.password) || "");
    if (token.length < 20) throw httpError(400, "Link non valido.");
    if (password.length < PASSWORD_MIN) throw httpError(400, "La password deve avere almeno " + PASSWORD_MIN + " caratteri.");
    const r = await pool.query(
      "SELECT email FROM app_password_resets WHERE link_hash = $1 AND expires_at > NOW()",
      [linkTokenHash(token)]
    );
    const row = r.rows[0];
    if (!row) throw httpError(400, "Link scaduto o già usato. Chiedi un nuovo recupero dall'app.");
    const hash = await hashPassword(password);
    const updated = await pool.query(
      `UPDATE app_users SET password_hash = $1, tokens_valid_after = $3, email_verified_at = COALESCE(email_verified_at, NOW()), updated_at = NOW()
       WHERE email = $2 RETURNING id, email`,
      [hash, row.email, revocationMoment()]
    );
    await pool.query("DELETE FROM app_password_resets WHERE email = $1", [row.email]);
    if (!updated.rows[0]) throw httpError(400, "Account non trovato.");
    if (sessionGate) sessionGate.forget(updated.rows[0].id);
    await clearLoginFailures(pool, row.email);
    return res.json({ ok: true, email: row.email });
  }));

  // Logged in: a new password. The current one is asked for (an account
  // made with Google or Apple has none and sets its first). Every other
  // device is signed out; this one gets a fresh session.
  app.post("/api/account/password", route(async (req, res) => {
    const auth = await accountFromBearer(req.headers.authorization);
    if (!auth) throw httpError(401, "Accedi di nuovo.");
    if (auth.provider === "coach_client" || auth.role === "athlete") throw httpError(403, "La password del tuo account la gestisce il coach.");
    const current = String((req.body && req.body.current) || "");
    const password = String((req.body && req.body.password) || "");
    if (password.length < PASSWORD_MIN) throw httpError(400, "La nuova password deve avere almeno " + PASSWORD_MIN + " caratteri.");
    const u = await pool.query("SELECT " + USER_COLS + " FROM app_users WHERE id = $1", [auth.id]);
    const user = u.rows[0];
    if (!user) throw httpError(401, "Account non trovato.");
    const hadPassword = !!user.password_hash;
    if (hadPassword && !(await verifyPassword(current, user.password_hash))) throw httpError(400, "La password attuale non è corretta.");
    const hash = await hashPassword(password);
    await pool.query("UPDATE app_users SET password_hash = $1, tokens_valid_after = $3, updated_at = NOW() WHERE id = $2", [hash, user.id, revocationMoment()]);
    if (sessionGate) sessionGate.forget(user.id);
    const mail = passwordChangedEmail(origin(req));
    if (!isSyntheticEmail(user.email)) sendEmail(user.email, mail.subject, mail.text, mail.html).catch(() => {});
    return res.json({ ok: true, ...sessionFor(user), hadPassword });
  }));

  // Logged in: every other device signed out, this one kept with a fresh session.
  app.post("/api/account/logout-others", route(async (req, res) => {
    const auth = await accountFromBearer(req.headers.authorization);
    if (!auth) throw httpError(401, "Accedi di nuovo.");
    const u = await pool.query("SELECT " + USER_COLS + " FROM app_users WHERE id = $1", [auth.id]);
    const user = u.rows[0];
    if (!user) throw httpError(401, "Account non trovato.");
    await pool.query("UPDATE app_users SET tokens_valid_after = $2 WHERE id = $1", [user.id, revocationMoment()]);
    if (sessionGate) sessionGate.forget(user.id);
    return res.json({ ok: true, ...sessionFor({ ...user, role: auth.role, clientId: auth.clientId }) });
  }));

  // For the sign-up, login and reset routes that live in coach-api.mjs.
  return {
    origin,
    deliveryAnswer,
    startVerification: (req, user) => startEmailVerification(pool, user, { sendEmail: mailer, origin: origin(req) }),
    resetLink: (req, token) => origin(req) + "/reimposta-password?t=" + encodeURIComponent(token),
    newLinkToken
  };
}
