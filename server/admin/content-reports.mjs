// Notices of illegal content (Digital Services Act, art. 16). Anyone, with or
// without an account, sends one from the page /segnala-contenuto (web/segnala-contenuto.html):
// what kind of content, where it is, why it is illegal, who sends it and the
// statement of good faith. The sender gets a confirmation of receipt by email
// (art. 16(4)) and, once the notice is examined from the dashboard, the
// decision with the way to contest it (art. 16(5) and 17).
//
// Photos and documents in Nurvan are never public: they stay between a coach and
// their athletes. A notice is how someone whose photo was taken, or who sees
// something illegal in a shared program or chat, tells us.
import crypto from "node:crypto";

export const CONTENT_REPORT_KINDS = {
  rights: "Viola i miei diritti (foto o immagini mie usate senza permesso, diritto d'autore)",
  privacy: "Dati personali o foto di una persona diffusi senza consenso",
  hate: "Odio, minacce, molestie o incitamento alla violenza",
  csam: "Abuso sessuale su minori",
  fraud: "Truffa, frode o falsa identità",
  health: "Prodotti o pratiche illegali o pericolose per la salute",
  other: "Altro contenuto illegale"
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const clean = (v, max) => String(v == null ? "" : v).replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);
const bad = (message, code) => Object.assign(new Error(message), { statusCode: 400, code });

// Checks a notice as the page sends it; the error messages are the ones the page shows.
export function validateContentReport(body) {
  const b = body || {};
  const kind = String(b.kind || "");
  if (!CONTENT_REPORT_KINDS[kind]) throw bad("Scegli che tipo di contenuto stai segnalando.", "KIND");
  const location = clean(b.location, 2000);
  if (location.length < 3) throw bad("Indica dove si trova il contenuto (link, nome utente, chat, data).", "LOCATION");
  const explanation = clean(b.explanation, 5000);
  if (explanation.length < 10) throw bad("Spiega perché il contenuto è illegale.", "EXPLANATION");
  const name = clean(b.name, 120);
  const email = clean(b.email, 200).toLowerCase();
  // Only a notice of child sexual abuse material can be anonymous (art. 16(2)(c)).
  if (kind !== "csam" && name.length < 2) throw bad("Scrivi il tuo nome e cognome.", "NAME");
  if (kind !== "csam" && !EMAIL_RE.test(email)) throw bad("Scrivi un indirizzo email valido.", "EMAIL");
  if (email && !EMAIL_RE.test(email)) throw bad("Scrivi un indirizzo email valido.", "EMAIL");
  if (b.goodFaith !== true) throw bad("Conferma la dichiarazione di buona fede.", "GOOD_FAITH");
  const lang = /^[a-z]{2}$/.test(String(b.lang || "")) ? String(b.lang) : "it";
  return { kind, location, explanation, name: name || null, email: email || null, lang };
}

export function receiptEmail(id, report) {
  return {
    subject: "Abbiamo ricevuto la tua segnalazione n. " + id + " - Nurvan",
    text: [
      "Ciao" + (report.name ? " " + report.name : "") + ",",
      "",
      "abbiamo ricevuto la tua segnalazione n. " + id + " (" + CONTENT_REPORT_KINDS[report.kind] + ").",
      "La esaminiamo con attenzione, di norma entro 24 ore, e ti scriviamo la decisione che prendiamo e il motivo.",
      "",
      "Dove si trova il contenuto, come l'hai indicato:",
      report.location,
      "",
      "Se vuoi aggiungere qualcosa rispondi a questa email.",
      "",
      "Nurvan - info@nurvan.app"
    ].join("\n")
  };
}

export function decisionEmail(id, report, decision) {
  return {
    subject: "Decisione sulla tua segnalazione n. " + id + " - Nurvan",
    text: [
      "Ciao" + (report.name ? " " + report.name : "") + ",",
      "",
      "abbiamo esaminato la tua segnalazione n. " + id + " (" + (CONTENT_REPORT_KINDS[report.kind] || report.kind) + ").",
      "",
      "La nostra decisione e il motivo:",
      decision,
      "",
      "La decisione è stata presa da una persona, non da un sistema automatico. Se non sei d'accordo puoi contestarla rispondendo a questa email entro 6 mesi: la riesaminiamo. Puoi anche rivolgerti a un organismo di risoluzione extragiudiziale certificato o all'autorità giudiziaria.",
      "",
      "Nurvan - info@nurvan.app"
    ].join("\n")
  };
}

async function safe(fn, empty) {
  try { return await fn(); } catch (err) { if (err && err.code === "42P01") return empty; throw err; }
}

export async function openContentReportCount(pool) {
  return safe(async () => Number((await pool.query("SELECT COUNT(*)::int AS n FROM content_reports WHERE status = 'open'")).rows[0].n), 0);
}

// Decided notices are kept 12 more months (to answer a complaint), as the privacy notice says.
export async function forgetOldContentReports(pool) {
  return safe(async () => (await pool.query("DELETE FROM content_reports WHERE status = 'handled' AND decided_at < NOW() - INTERVAL '12 months'")).rowCount, 0);
}

export async function listContentReports(pool, { limit = 100 } = {}) {
  const n = Math.max(1, Math.min(300, Math.round(Number(limit)) || 100));
  await forgetOldContentReports(pool);
  return safe(async () => (await pool.query(
    `SELECT id, kind, location, explanation, name, email, lang, status, decision, decided_at, created_at
       FROM content_reports ORDER BY (status = 'open') DESC, created_at DESC LIMIT $1`, [n]
  )).rows.map((r) => ({
    id: String(r.id), kind: r.kind, kindLabel: CONTENT_REPORT_KINDS[r.kind] || r.kind, location: r.location, explanation: r.explanation,
    name: r.name || "", email: r.email || "", lang: r.lang, status: r.status, decision: r.decision || "", decidedAt: r.decided_at, at: r.created_at
  })), []);
}

// The decision, written by a person on the dashboard, goes to whoever sent the notice.
export async function decideContentReport(pool, id, decision, sendEmail) {
  const text = clean(decision, 3000);
  if (text.length < 5) throw bad("Scrivi la decisione e il motivo: arrivano a chi ha segnalato.", "DECISION");
  const r = await pool.query(
    "UPDATE content_reports SET status = 'handled', decision = $2, decided_at = NOW() WHERE id = $1 AND status = 'open' RETURNING id, kind, name, email",
    [id, text]
  );
  if (!r.rows[0]) return { ok: false };
  const row = r.rows[0];
  let emailed = false;
  if (row.email && sendEmail) {
    const mail = decisionEmail(String(row.id), row, text);
    try { emailed = !!((await sendEmail(row.email, mail.subject, mail.text)) || {}).sent; } catch (_) { emailed = false; }
  }
  return { ok: true, emailed };
}

export function mountContentReports(app, { pool, initDb, sendEmail = null, secret = "", notifyTo = "" }) {
  const ipHash = (req) => crypto.createHash("sha256").update(String(secret) + "|" + String(req.ip || "")).digest("hex").slice(0, 32);
  app.post("/api/content-report", async (req, res) => {
    let report;
    try { report = validateContentReport(req.body); } catch (err) { return res.status(400).json({ ok: false, error: err.message, code: err.code }); }
    try {
      await initDb();
      const hash = ipHash(req);
      const recent = Number((await pool.query("SELECT COUNT(*)::int AS n FROM content_reports WHERE ip_hash = $1 AND created_at > NOW() - INTERVAL '1 day'", [hash])).rows[0].n);
      if (recent >= 10) return res.status(429).json({ ok: false, error: "Hai inviato molte segnalazioni oggi. Per altre scrivi a info@nurvan.app.", code: "RATE" });
      const ins = await pool.query(
        `INSERT INTO content_reports(kind, location, explanation, name, email, good_faith, lang, ip_hash)
         VALUES ($1,$2,$3,$4,$5,TRUE,$6,$7) RETURNING id`,
        [report.kind, report.location, report.explanation, report.name, report.email, report.lang, hash]
      );
      const id = String(ins.rows[0].id);
      forgetOldContentReports(pool).catch(() => {});
      if (sendEmail) {
        if (report.email) { const mail = receiptEmail(id, report); sendEmail(report.email, mail.subject, mail.text).catch(() => {}); }
        if (notifyTo) sendEmail(notifyTo, "Nuova segnalazione di contenuto n. " + id + " (" + report.kind + ")", "Tipo: " + CONTENT_REPORT_KINDS[report.kind] + "\nDove: " + report.location + "\n\nPerché:\n" + report.explanation + "\n\nDa: " + (report.name || "anonimo") + " " + (report.email || "") + "\n\nGestiscila dalla dashboard: Operazioni › Segnalazioni contenuti.").catch(() => {});
      }
      return res.json({ ok: true, id });
    } catch (err) {
      console.error("CONTENT_REPORT", err && err.message);
      return res.status(500).json({ ok: false, error: "Non riusciamo a registrare la segnalazione ora. Riprova o scrivi a info@nurvan.app." });
    }
  });
}
