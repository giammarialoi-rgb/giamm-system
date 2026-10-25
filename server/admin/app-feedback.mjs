// Suggestions and problems sent from the app (Impostazioni › Suggerimenti e problemi): the channel the
// Google Play testers asked for (Testers Community report, October 2026). A message carries its text,
// an email to answer it (optional) and, only if the box stays ticked, what is needed to reproduce a
// problem: app version, platform, system, device model, screen, language and the page it was sent from.
// It lands in the dashboard (Operazioni › Suggerimenti app) and in an email to Nurvan.
import crypto from "node:crypto";

export const APP_FEEDBACK_KINDS = {
  bug: "Problema",
  idea: "Suggerimento",
  other: "Altro"
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v, max) => String(v == null ? "" : v).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const bad = (message, code) => Object.assign(new Error(message), { statusCode: 400, code });
const DEVICE_FIELDS = { app: 20, build: 40, platform: 10, os: 40, model: 60, screen: 20, lang: 5, view: 40 };

// Checks a message as the app sends it; the error messages are the ones the app shows.
export function validateAppFeedback(body) {
  const b = body || {};
  const kind = String(b.kind || "");
  if (!APP_FEEDBACK_KINDS[kind]) throw bad("Scegli se è un problema, un suggerimento o altro.", "KIND");
  const message = clean(b.message, 4000);
  if (message.length < 5) throw bad("Scrivi qualche parola in più: cosa è successo o cosa vorresti.", "MESSAGE");
  const email = clean(b.email, 200).toLowerCase();
  if (email && !EMAIL_RE.test(email)) throw bad("L'indirizzo email non sembra valido.", "EMAIL");
  let device = null;
  if (b.device && typeof b.device === "object") {
    device = {};
    for (const [key, max] of Object.entries(DEVICE_FIELDS)) {
      const v = clean(b.device[key], max);
      if (v) device[key] = v;
    }
    if (!Object.keys(device).length) device = null;
  }
  return { kind, message, email: email || null, device };
}

function deviceLine(device) {
  if (!device) return "non allegati";
  return Object.entries(device).map(([k, v]) => k + ": " + v).join(" · ");
}

export function feedbackNotifyEmail(id, fb, accountEmail) {
  return {
    subject: "Nurvan · " + APP_FEEDBACK_KINDS[fb.kind] + " dall'app n. " + id,
    text: [
      APP_FEEDBACK_KINDS[fb.kind] + " n. " + id,
      "",
      fb.message,
      "",
      "Rispondere a: " + (fb.email || "nessuna email lasciata"),
      "Account: " + (accountEmail || "non collegato"),
      "Dati tecnici: " + deviceLine(fb.device),
      "",
      "Lo trovi anche nella dashboard: Operazioni › Suggerimenti app."
    ].join("\n")
  };
}

async function safe(fn, empty) {
  try { return await fn(); } catch (err) { if (err && err.code === "42P01") return empty; throw err; }
}

export async function openAppFeedbackCount(pool) {
  return safe(async () => Number((await pool.query("SELECT COUNT(*)::int AS n FROM app_feedback WHERE status = 'open'")).rows[0].n), 0);
}

// Closed messages are kept 12 more months, as the privacy notice says.
export async function forgetOldAppFeedback(pool) {
  return safe(async () => (await pool.query("DELETE FROM app_feedback WHERE status = 'done' AND done_at < NOW() - INTERVAL '12 months'")).rowCount, 0);
}

export async function listAppFeedback(pool, { limit = 100 } = {}) {
  const n = Math.max(1, Math.min(300, Math.round(Number(limit)) || 100));
  await forgetOldAppFeedback(pool);
  return safe(async () => (await pool.query(
    `SELECT f.id, f.kind, f.message, f.email, f.device, f.status, f.note, f.done_at, f.created_at, a.email AS account_email
       FROM app_feedback f LEFT JOIN app_users a ON a.id = f.account_id
      ORDER BY (f.status = 'open') DESC, f.created_at DESC LIMIT $1`, [n]
  )).rows.map((r) => ({
    id: String(r.id), kind: r.kind, kindLabel: APP_FEEDBACK_KINDS[r.kind] || r.kind, message: r.message, email: r.email || "",
    accountEmail: r.account_email || "", device: r.device || null, status: r.status, note: r.note || "", doneAt: r.done_at, at: r.created_at
  })), []);
}

export async function closeAppFeedback(pool, id, note) {
  const r = await pool.query("UPDATE app_feedback SET status = 'done', note = $2, done_at = NOW() WHERE id = $1 AND status = 'open' RETURNING id", [id, clean(note, 1000) || null]);
  return !!r.rows[0];
}

export async function reopenAppFeedback(pool, id) {
  const r = await pool.query("UPDATE app_feedback SET status = 'open', done_at = NULL WHERE id = $1 AND status = 'done' RETURNING id", [id]);
  return !!r.rows[0];
}

export function mountAppFeedback(app, { pool, initDb, accountFromBearer = null, sendEmail = null, secret = "", notifyTo = "" }) {
  const ipHash = (req) => crypto.createHash("sha256").update(String(secret) + "|" + String(req.ip || "")).digest("hex").slice(0, 32);
  app.post("/api/feedback", async (req, res) => {
    let fb;
    try { fb = validateAppFeedback(req.body); } catch (err) { return res.status(400).json({ ok: false, error: err.message, code: err.code }); }
    try {
      await initDb();
      // Signed in, the message is tied to the account (the dashboard shows its email); never required.
      const auth = accountFromBearer ? await accountFromBearer(req.headers.authorization).catch(() => null) : null;
      const accountId = auth && auth.role !== "athlete" && /^\d+$/.test(String(auth.id)) ? String(auth.id) : null;
      const hash = ipHash(req);
      const recent = Number((await pool.query("SELECT COUNT(*)::int AS n FROM app_feedback WHERE ip_hash = $1 AND created_at > NOW() - INTERVAL '1 day'", [hash])).rows[0].n);
      if (recent >= 10) return res.status(429).json({ ok: false, error: "Hai inviato molti messaggi oggi. Per altro scrivi a info@nurvan.app.", code: "RATE" });
      const ins = await pool.query(
        `INSERT INTO app_feedback(kind, message, email, device, account_id, ip_hash)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [fb.kind, fb.message, fb.email, fb.device ? JSON.stringify(fb.device) : null, accountId, hash]
      );
      const id = String(ins.rows[0].id);
      forgetOldAppFeedback(pool).catch(() => {});
      if (sendEmail && notifyTo) {
        const mail = feedbackNotifyEmail(id, fb, auth && auth.email);
        sendEmail(notifyTo, mail.subject, mail.text).catch(() => {});
      }
      return res.json({ ok: true, id });
    } catch (err) {
      console.error("APP_FEEDBACK", err && err.message);
      return res.status(500).json({ ok: false, error: "Non riusciamo a inviare il messaggio ora. Riprova più tardi o scrivi a info@nurvan.app." });
    }
  });
}
