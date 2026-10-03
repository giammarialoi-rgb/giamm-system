// The waiting list of the site: /lista-attesa (and /<lang>/waitlist) asks for
// an email address to write to at the launch, and offers the coaches a
// second form to apply as one of the ten founding coaches (Coach Pro free
// for twelve months).
//
// Both forms keep their rows in Postgres (waitlist, coach_applications:
// migration 0024), the same database the rest of the site already uses, so
// there is no external service to configure. The owner reads them as a file
// from the admin (/api/admin/waitlist.csv, /api/admin/coach-applications.csv).
//
// What protects them, with no CAPTCHA: a field only a robot fills in (the
// honeypot) and a handful of requests an hour for each address of the
// network. The privacy box is required and its words and time are saved.
import { SITE_LANGS, langPrefix, langOfPath, siteDict, st } from "./i18n.mjs";
import { SERVER_LANGS } from "../i18n.mjs";
import { normalizeEmail, validEmail } from "../account/email-auth.mjs";

export const WAITLIST_CONSENT_TEXT = "Acconsento a essere ricontattato via email per il lancio di Nurvan e l'accesso anticipato. Ho letto l'informativa sulla privacy.";
export const ATHLETE_BANDS = ["1-5", "6-20", "21-50", "oltre 50"];
export const MAX_PER_HOUR = 6;

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });
const clean = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u001f\u007f]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

// Italian keeps its own word; the other languages share "waitlist".
export const waitlistPath = (lang) => (!lang || lang === "it" ? "/lista-attesa" : "/" + lang + "/waitlist");

/* ------------------------------- the rows ----------------------------- */

export async function joinWaitlist(pool, { email, lang, consent, now = Date.now() }) {
  email = normalizeEmail(email);
  if (!validEmail(email) || email.length > 200) throw httpError(400, "Scrivi un indirizzo email valido.");
  if (consent !== true) throw httpError(400, "Per iscriverti spunta la casella sulla privacy.");
  lang = SERVER_LANGS.includes(lang) ? lang : "it";
  const when = new Date(now).toISOString();
  // The same address again is not an error: the row is only refreshed.
  await pool.query(
    `INSERT INTO waitlist(email, lang, consent_at, consent_text, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $3, $3)
     ON CONFLICT (email) DO UPDATE SET lang = EXCLUDED.lang, consent_at = EXCLUDED.consent_at, consent_text = EXCLUDED.consent_text, updated_at = EXCLUDED.updated_at`,
    [email, lang, when, WAITLIST_CONSENT_TEXT]
  );
  return { email };
}

export async function applyAsCoach(pool, body, now = Date.now()) {
  const email = normalizeEmail(body.email);
  const name = clean(body.name, 100);
  const social = clean(body.social, 200);
  const qualification = clean(body.qualification, 300);
  const notes = String(body.notes == null ? "" : body.notes).replace(/\r/g, "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, 1000);
  if (!name) throw httpError(400, "Scrivi il tuo nome.");
  if (!validEmail(email) || email.length > 200) throw httpError(400, "Scrivi un indirizzo email valido.");
  if (!social) throw httpError(400, "Scrivi il tuo profilo Instagram o il tuo sito.");
  if (!ATHLETE_BANDS.includes(String(body.athletes || ""))) throw httpError(400, "Scegli quanti atleti segui adesso.");
  if (!qualification) throw httpError(400, "Scrivi la tua qualifica o certificazione.");
  if (body.consent !== true) throw httpError(400, "Per candidarti spunta la casella sulla privacy.");
  const lang = SERVER_LANGS.includes(String(body.lang || "")) ? String(body.lang) : "it";
  const when = new Date(now).toISOString();
  await pool.query(
    `INSERT INTO coach_applications(email, name, social, athletes, qualification, notes, lang, consent_at, consent_text, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $8, $8)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, social = EXCLUDED.social, athletes = EXCLUDED.athletes, qualification = EXCLUDED.qualification,
       notes = EXCLUDED.notes, lang = EXCLUDED.lang, consent_at = EXCLUDED.consent_at, consent_text = EXCLUDED.consent_text, updated_at = EXCLUDED.updated_at`,
    [email, name, social, String(body.athletes), qualification, notes, lang, when, WAITLIST_CONSENT_TEXT]
  );
  return { email };
}

const iso = (d) => (d ? new Date(d).toISOString() : "");
// A cell that starts like a formula is kept as text (an Instagram handle is not one).
const cell = (v) => { const s = String(v == null ? "" : v); const safe = /^[=+\-@]/.test(s) && !/^@[\w.]+$/.test(s) ? "'" + s : s; return /[",\n;]/.test(safe) ? '"' + safe.replace(/"/g, '""') + '"' : safe; };
const csv = (head, rows) => [head.join(",")].concat(rows.map((r) => r.map(cell).join(","))).join("\n") + "\n";

export async function listWaitlist(pool, { limit = 20000 } = {}) {
  return (await pool.query(`SELECT email, lang, consent_at, created_at FROM waitlist ORDER BY created_at DESC LIMIT $1`, [Math.min(50000, Math.max(1, Number(limit) || 20000))])).rows;
}
export function waitlistCsv(rows) {
  return csv(["email", "lingua", "consenso_il", "iscritto_il"], rows.map((r) => [r.email, r.lang, iso(r.consent_at), iso(r.created_at)]));
}
export async function listCoachApplications(pool, { limit = 5000 } = {}) {
  return (await pool.query(
    `SELECT email, name, social, athletes, qualification, notes, lang, consent_at, created_at FROM coach_applications ORDER BY created_at DESC LIMIT $1`,
    [Math.min(20000, Math.max(1, Number(limit) || 5000))]
  )).rows;
}
export function coachApplicationsCsv(rows) {
  return csv(["email", "nome", "instagram_o_sito", "atleti", "qualifica", "note", "lingua", "consenso_il", "candidato_il"],
    rows.map((r) => [r.email, r.name, r.social, r.athletes, r.qualification, r.notes, r.lang, iso(r.consent_at), iso(r.created_at)]));
}

/* ------------------------------- the page ----------------------------- */

const SCRIPT = `<script>
(function(){
  document.querySelectorAll('form.wl-form').forEach(function(form){
    var msg=form.querySelector('.form-msg');
    form.addEventListener('submit',function(ev){
      ev.preventDefault();
      var btn=form.querySelector('button[type=submit]');
      btn.disabled=true;msg.className='form-msg';msg.textContent=form.getAttribute('data-wait');
      var body={lang:form.getAttribute('data-lang')};
      Array.prototype.forEach.call(form.elements,function(el){
        if(!el.name)return;
        body[el.name]=el.type==='checkbox'?el.checked:el.value;
      });
      fetch(form.getAttribute('data-endpoint'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
      .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
      .then(function(r){
        if(!r.ok)throw new Error((r.j&&r.j.error)||form.getAttribute('data-fail'));
        msg.className='form-msg sent';msg.textContent=r.j.message;form.classList.add('done');
      })
      .catch(function(e){msg.className='form-msg err';msg.textContent=e.message||form.getAttribute('data-fail');btn.disabled=false;});
    });
  });
})();
</script>`;

const FEATURES = [
  ["Schede e carichi", "Importa la scheda del tuo coach (Excel, PDF, foto) o generala in pochi tocchi. Serie, carichi, RIR/RPE, superset e timer di recupero."],
  ["Progressi che si leggono", "Dopo ogni esercizio un solo suggerimento per la volta successiva. Massimali stimati, volume e storico quando vuoi approfondire."],
  ["Alimentazione", "Piano alimentare, diario a calendario con le calorie del giorno, acqua, lista della spesa con i prezzi medi del tuo paese."],
  ["Coach AI", "Analizza la seduta, adatta la scheda alle tue richieste, risponde ai dubbi. Ogni modifica la confermi tu."],
  ["Enciclopedia esercizi", "Oltre 250 esercizi con immagini, esecuzione, errori comuni e video. Sempre a portata di mano, anche offline."]
];

function formHtml({ id, endpoint, lang, dict, fields, button, legal }) {
  return `<form id="${id}" class="wl-form" data-endpoint="${endpoint}" data-lang="${esc(lang)}" data-wait="${esc(st(dict, "Invio in corso…"))}" data-fail="${esc(st(dict, "Invio non riuscito. Riprova tra poco."))}" novalidate>` +
    fields +
    `<div class="hp" aria-hidden="true"><label>Non compilare questo campo<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>` +
    `<label class="check"><input type="checkbox" name="consent" required><span>${esc(WAITLIST_CONSENT_TEXT)}</span></label>` +
    `<button type="submit" class="btn primary">${button}</button>` +
    `<p class="form-msg" role="status"></p>` +
    `<p class="form-legal"><a href="{{APP_URL}}privacy?lang=${esc(lang)}">Informativa sulla privacy</a></p>` +
    `</form>`;
}
const field = (label, input) => `<label class="field"><span>${label}</span>${input}</label>`;

export function waitlistMain(lang, dict) {
  const waitForm = formHtml({
    id: "waitlist-form", endpoint: "/api/site/waitlist", lang, dict, button: "Entra nella lista",
    fields: field("La tua email", `<input type="email" name="email" required autocomplete="email" inputmode="email" placeholder="nome@esempio.it">`)
  });
  const coachForm = formHtml({
    id: "coach-form", endpoint: "/api/site/coach-application", lang, dict, button: "Candidati come coach fondatore",
    fields:
      field("Nome", `<input type="text" name="name" required autocomplete="name" maxlength="100">`) +
      field("La tua email", `<input type="email" name="email" required autocomplete="email" inputmode="email" placeholder="nome@esempio.it">`) +
      field("Instagram o sito", `<input type="text" name="social" required maxlength="200" placeholder="@nome o https://…">`) +
      field("Atleti che segui adesso", `<select name="athletes" required><option value="">Scegli</option>` + ATHLETE_BANDS.map((b) => `<option value="${esc(b)}">${esc(b === "oltre 50" ? "Oltre 50" : b)}</option>`).join("") + `</select>`) +
      field("Qualifica o certificazione", `<input type="text" name="qualification" required maxlength="300">`) +
      field("Note (facoltative)", `<textarea name="notes" rows="3" maxlength="1000"></textarea>`)
  });
  return `<section class="blog wl"><div class="wrap narrow">` +
    `<div class="head"><div class="eyebrow">Lista d'attesa</div><h1 class="blog-title">Nurvan sta arrivando. Entra nella lista.</h1>` +
    `<p class="lead">Nurvan tiene insieme allenamento, alimentazione e recupero, in palestra e a casa. Chi entra nella lista riceve l'accesso anticipato. Niente spam: ti scriviamo solo quando c'è qualcosa di concreto.</p></div>` +
    `<div class="card sample-form-card"><h2>Avvisami al lancio</h2>${waitForm}</div>` +
    `<p class="wl-coach-link"><a href="#coach">Sei un personal trainer o un coach? Candidati come coach fondatore →</a></p>` +
    `</div></section>` +
    `<section class="wl-features"><div class="wrap"><div class="head"><h2>Cosa trovi in Nurvan</h2></div><div class="cards">` +
    FEATURES.map(([t, p]) => `<article class="card"><h3>${t}</h3><p>${p}</p></article>`).join("") +
    `</div></div></section>` +
    `<section id="coach" class="wl coach-apply"><div class="wrap narrow">` +
    `<div class="head"><div class="eyebrow">Per i coach</div><h2>Sei un personal trainer o un coach?</h2><h2 class="wl-sub">Cerchiamo 10 coach fondatori.</h2></div>` +
    `<div class="split"><div>` +
    `<h3>Cosa offriamo</h3><ul>` +
    `<li>Coach Pro gratuito per 12 mesi (valore 390 €)</li>` +
    `<li>Accesso diretto allo sviluppo</li>` +
    `<li>Le tue richieste hanno priorità</li></ul>` +
    `<h3>Cosa chiediamo</h3><ul>` +
    `<li>Che lo usi davvero con i tuoi atleti</li>` +
    `<li>Che ci dia il tuo parere, con franchezza</li></ul>` +
    `</div><div class="card sample-form-card"><h3>Candidati</h3>${coachForm}</div></div>` +
    `</div></section>` + SCRIPT;
}

export function mountWaitlist(app, { siteDir, shell, pool, initDb, maxPerHour = MAX_PER_HOUR }) {
  const everyLang = () => Object.fromEntries(SITE_LANGS.map((l) => [l, waitlistPath(l)]));
  const hits = new Map();
  const tooMany = (ip, max = maxPerHour, windowMs = 3600000) => {
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) hits.clear();
    return recent.length > max;
  };

  const page = async (req, res) => {
    const lang = langOfPath(req.path);
    const dict = await siteDict(siteDir, lang);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).type("html").send(await shell(req, {
      lang, alternates: everyLang(), title: "Lista d'attesa Nurvan — accesso anticipato",
      description: "Nurvan sta arrivando: entra nella lista d'attesa per l'accesso anticipato. Sei un personal trainer? Candidati come coach fondatore e ottieni Coach Pro gratis.",
      main: waitlistMain(lang, dict)
    }));
  };

  // Shared by both forms: a language, the honeypot, the rate limit, a reply
  // in the visitor's language.
  const handle = (work, okMessage) => async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const body = req.body || {};
    const lang = SITE_LANGS.includes(String(body.lang || "")) ? String(body.lang) : "it";
    const dict = await siteDict(siteDir, lang);
    try {
      if (tooMany(String(req.ip || ""))) throw httpError(429, "Troppe richieste. Riprova più tardi.");
      // Only a robot fills in the field a person never sees.
      if (String(body.website || "").trim()) throw httpError(400, "Invio non riuscito. Riprova tra poco.");
      await initDb();
      await work(body, lang);
      return res.json({ ok: true, message: st(dict, okMessage) });
    } catch (err) {
      if (!err.statusCode) console.error("SITE_WAITLIST", err);
      return res.status(err.statusCode || 500).json({ error: st(dict, err.statusCode ? err.message : "Invio non riuscito. Riprova tra poco.") });
    }
  };

  app.post("/api/site/waitlist", handle((body, lang) => joinWaitlist(pool, { email: body.email, lang, consent: body.consent === true }),
    "Sei nella lista d'attesa. Ti scriviamo solo quando c'è qualcosa di concreto."));
  app.post("/api/site/coach-application", handle((body, lang) => applyAsCoach(pool, Object.assign({}, body, { lang })),
    "Candidatura ricevuta. La leggiamo e ti rispondiamo per email."));

  app.get("/lista-attesa", page);
  for (const l of SITE_LANGS.filter((x) => x !== "it")) app.get(langPrefix(l) + "/waitlist", page);
  return { path: waitlistPath };
}
