// Example workouts on the site: /allenamenti lists them, /allenamenti/<slug>
// shows one the way the app lays a session out, and offers the whole program
// as a PDF. The PDF is not a public file: the visitor leaves an email
// address, a link is sent there, and the link is what downloads it - so the
// address is known to be theirs before anything else is ever sent to it.
//
// The programs are the app's own (site/samples.json, written by
// tools/build_site_samples.mjs from the same engines the app runs) and the
// PDFs are printed by the same tool (site/samples/<slug>.pdf).
//
// Marketing email is an explicit choice (the checkbox, never pre-ticked;
// required to get the PDF unless the host says otherwise): the row
// records whether and when it was given and the words that were shown, and
// every email carries a link that withdraws it (/allenamenti/disiscrizione).
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { SITE_LANGS, langPrefix, langOfPath, siteDict, st } from "./i18n.mjs";
import { serverTr, SERVER_LANGS } from "../i18n.mjs";
import { composeEmail, normalizeEmail, validEmail, linkTokenHash } from "../account/email-auth.mjs";

export const LINK_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const RESEND_GAP_MS = 60 * 1000;
export const CONSENT_TEXT = "Voglio ricevere via email novità, consigli di allenamento e offerte di Nurvan. Posso disiscrivermi quando voglio.";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

// What the site says about each example. The program itself is in samples.json.
export const SAMPLES = [
  {
    slug: "ipertrofia-3-giorni",
    tag: "Palestra",
    title: "Ipertrofia in 3 giorni",
    sub: "Full body in palestra, tre sedute a settimana per 8 settimane.",
    facts: ["3 giorni a settimana", "8 settimane", "Livello intermedio", "Palestra completa"],
    points: [
      "Ogni seduta allena tutto il corpo: i muscoli lavorano tre volte a settimana.",
      "I fondamentali restano gli stessi per tutto il programma, così il progresso si misura.",
      "Doppia progressione: prima sali di ripetizioni, poi di carico."
    ]
  },
  {
    slug: "hyrox-8-settimane",
    tag: "HYROX",
    title: "Preparazione HYROX in 8 settimane",
    sub: "Corsa, stazioni e forza nella stessa settimana, fino al giorno della gara.",
    facts: ["4 giorni a settimana", "8 settimane", "Categoria Open", "Palestra classica"],
    points: [
      "Quattro fasi: base, costruzione, picco con le simulazioni, scarico.",
      "Dove manca la slitta o lo ski erg, la stazione ha il suo esercizio sostitutivo.",
      "Nell’app la scrivi sulla data della tua gara e sulla tua categoria."
    ]
  },
  {
    slug: "casa-corpo-libero",
    tag: "A casa",
    title: "A casa a corpo libero",
    sub: "Calisthenics senza attrezzi: tre sedute da 30 minuti per 8 settimane.",
    facts: ["3 giorni a settimana", "30 minuti", "Senza attrezzi", "Livello intermedio"],
    points: [
      "Serve solo il pavimento: spinta, tirata, gambe e addome in ogni seduta.",
      "Ogni esercizio ha scritto come farlo.",
      "Da metà programma si passa alla variante più difficile."
    ]
  }
];
const metaOf = (slug) => SAMPLES.find((s) => s.slug === slug) || null;

function httpError(statusCode, message) {
  return Object.assign(new Error(message), { statusCode });
}
const newToken = () => crypto.randomBytes(32).toString("base64url");

/* ------------------------------ the email ----------------------------- */

export function sampleEmail({ title, link, unsubscribe, consent }, lang) {
  const tr = serverTr(lang);
  const outro = tr("Il link vale 7 giorni. Se non hai chiesto tu il PDF, ignora questa email.") +
    (consent && unsubscribe ? " " + tr("Hai scelto di ricevere le email di Nurvan: per non riceverle più apri questo link:") + " " + unsubscribe : "");
  return {
    subject: tr("NURVAN — il tuo allenamento in PDF"),
    ...composeEmail({
      title: tr("Il tuo allenamento è pronto"),
      intro: tr("Ecco il PDF che hai chiesto:") + " " + tr(title) + ". " + tr("Tocca il pulsante per scaricarlo."),
      button: { label: tr("Scarica il PDF"), href: link },
      outro
    }, lang)
  };
}

/* ------------------------------- the leads ---------------------------- */

// A request for a PDF: the row for this address and example is created or
// refreshed with a new link. Consent, once given, is not taken back by a
// later request made without the box ticked - only the unsubscribe link does.
export async function requestSample(pool, { email, slug, lang, consent, origin, sendEmail, now = Date.now() }) {
  email = normalizeEmail(email);
  if (!validEmail(email) || email.length > 200) throw httpError(400, "Scrivi un indirizzo email valido.");
  const meta = metaOf(slug);
  if (!meta) throw httpError(404, "Allenamento non trovato.");
  lang = SERVER_LANGS.includes(lang) ? lang : "it";
  const existing = (await pool.query("SELECT id, last_sent_at, unsub_hash FROM site_leads WHERE email = $1 AND sample = $2", [email, slug])).rows[0];
  if (existing && existing.last_sent_at && now - new Date(existing.last_sent_at).getTime() < RESEND_GAP_MS) {
    return { sent: false, throttled: true };
  }
  const token = newToken();
  const unsub = newToken();
  const when = new Date(now).toISOString();
  await pool.query(
    `INSERT INTO site_leads(email, sample, lang, marketing_consent, consent_at, consent_text, token_hash, unsub_hash, created_at, last_sent_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
     ON CONFLICT (email, sample) DO UPDATE SET
       lang = EXCLUDED.lang, token_hash = EXCLUDED.token_hash, unsub_hash = EXCLUDED.unsub_hash, last_sent_at = EXCLUDED.last_sent_at,
       marketing_consent = site_leads.marketing_consent OR EXCLUDED.marketing_consent,
       consent_at = CASE WHEN EXCLUDED.marketing_consent AND NOT site_leads.marketing_consent THEN EXCLUDED.consent_at ELSE site_leads.consent_at END,
       consent_text = CASE WHEN EXCLUDED.marketing_consent AND NOT site_leads.marketing_consent THEN EXCLUDED.consent_text ELSE site_leads.consent_text END,
       unsubscribed_at = CASE WHEN EXCLUDED.marketing_consent THEN NULL ELSE site_leads.unsubscribed_at END`,
    [email, slug, lang, !!consent, consent ? when : null, consent ? CONSENT_TEXT : null, linkTokenHash(token), linkTokenHash(unsub), when]
  );
  const link = origin + "/allenamenti/scarica/" + token;
  const mail = sampleEmail({ title: meta.title, link, unsubscribe: origin + "/allenamenti/disiscrizione/" + unsub, consent: !!consent }, lang);
  const result = await sendEmail(email, mail.subject, mail.text, mail.html);
  return { sent: !!(result && result.sent), reason: result && result.reason, link };
}

// The link in the email: valid for a week from when it was sent. Opening it
// proves the address (confirmed_at) and counts the download.
export async function redeemSample(pool, token, now = Date.now()) {
  const row = (await pool.query("SELECT id, sample, last_sent_at FROM site_leads WHERE token_hash = $1", [linkTokenHash(token)])).rows[0];
  if (!row) return null;
  if (now - new Date(row.last_sent_at).getTime() > LINK_TTL_MS) return { expired: true, sample: row.sample };
  await pool.query("UPDATE site_leads SET confirmed_at = COALESCE(confirmed_at, $2), downloads = downloads + 1 WHERE id = $1", [row.id, new Date(now).toISOString()]);
  return { sample: row.sample };
}

// One address, every example it asked for: no more marketing email.
export async function unsubscribeLead(pool, token, now = Date.now()) {
  const row = (await pool.query("SELECT email FROM site_leads WHERE unsub_hash = $1", [linkTokenHash(token)])).rows[0];
  if (!row) return false;
  await pool.query("UPDATE site_leads SET marketing_consent = FALSE, unsubscribed_at = $2 WHERE email = $1", [row.email, new Date(now).toISOString()]);
  return true;
}

// For the dashboard: who asked for what. Only the confirmed addresses that
// said yes are ones to write to (the "contattabile" column).
export async function listLeads(pool, { limit = 5000 } = {}) {
  const rows = (await pool.query(
    `SELECT email, sample, lang, marketing_consent, consent_at, confirmed_at, downloads, unsubscribed_at, created_at
       FROM site_leads ORDER BY created_at DESC LIMIT $1`, [Math.min(20000, Math.max(1, Number(limit) || 5000))]
  )).rows;
  return rows.map((r) => Object.assign({}, r, { contactable: !!(r.marketing_consent && r.confirmed_at && !r.unsubscribed_at) }));
}
export function leadsCsv(rows) {
  const iso = (d) => (d ? new Date(d).toISOString() : "");
  const cell = (v) => { const s = String(v == null ? "" : v); return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  return ["email,allenamento,lingua,contattabile,consenso_marketing,consenso_il,email_confermata_il,download,disiscritto_il,richiesto_il"]
    .concat(rows.map((r) => [r.email, r.sample, r.lang, r.contactable ? "si" : "no", r.marketing_consent ? "si" : "no", iso(r.consent_at), iso(r.confirmed_at), r.downloads, iso(r.unsubscribed_at), iso(r.created_at)].map(cell).join(",")))
    .join("\n") + "\n";
}

/* ------------------------------- the pages ---------------------------- */

// A session the way the app shows it: the exercise, its sets and reps, the
// effort and the rest. Names are the app's own and are not translated.
function sessionHtml(session, index) {
  return `<div class="app-day" data-day="${index}"${index ? " hidden" : ""}>` +
    session.rows.map((r) =>
      `<div class="app-ex"><div class="app-ex-name" data-notr>${r.main ? '<i aria-hidden="true"></i>' : ""}${esc(r.name)}</div><!--/notr-->` +
      `<div class="app-ex-meta" data-notr><b>${esc(r.dose)}</b>${r.rir ? `<span>${esc(r.rir)}</span>` : ""}${r.rest ? `<span>⏱ ${esc(r.rest)}</span>` : ""}</div><!--/notr-->` +
      (r.circuit ? `<div class="app-ex-note" data-notr>${esc(r.items.join(" · "))}</div><!--/notr-->` : "") +
      `</div>`).join("") + `</div>`;
}
function phoneHtml(sample) {
  const week = sample.weeks[0];
  return `<div class="phone sample-phone"><div class="screen">` +
    `<div class="tag">Settimana 1</div>` +
    `<div class="app-tabs" role="tablist">` + week.sessions.map((s, i) => `<button type="button" role="tab" data-day="${i}"${i ? "" : ' class="on"'}><span data-notr>${esc(s.name)}</span><!--/notr--></button>`).join("") + `</div>` +
    week.sessions.map(sessionHtml).join("") +
    `</div></div>`;
}
export function sampleCardsHtml(lang) {
  return `<div class="cards samples">` + SAMPLES.map((m) =>
    `<a class="card sample-card" href="${langPrefix(lang)}/allenamenti/${m.slug}"><div class="eyebrow">${esc(m.tag)}</div><h3>${esc(m.title)}</h3><p>${esc(m.sub)}</p>` +
    `<div class="chips">` + m.facts.map((f) => `<span class="chip">${esc(f)}</span>`).join("") + `</div><span class="more">Guarda l'allenamento →</span></a>`).join("") + `</div>`;
}

const SCRIPT = `<script>
(function(){
  var phone=document.querySelector('.sample-phone');
  if(phone){phone.querySelectorAll('.app-tabs button').forEach(function(b){b.addEventListener('click',function(){
    phone.querySelectorAll('.app-tabs button').forEach(function(x){x.classList.toggle('on',x===b);});
    phone.querySelectorAll('.app-day').forEach(function(d){d.hidden=d.getAttribute('data-day')!==b.getAttribute('data-day');});
  });});}
  var form=document.getElementById('sample-form');
  if(!form)return;
  var msg=document.getElementById('sample-msg');
  form.addEventListener('submit',function(ev){
    ev.preventDefault();
    var btn=form.querySelector('button');
    btn.disabled=true;msg.className='form-msg';msg.textContent=form.getAttribute('data-wait');
    fetch('/api/site/samples/request',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      email:form.email.value,sample:form.getAttribute('data-sample'),lang:form.getAttribute('data-lang'),consent:!!(form.consent&&form.consent.checked)})})
    .then(function(r){return r.json().then(function(j){return {ok:r.ok,j:j};});})
    .then(function(r){
      if(!r.ok)throw new Error((r.j&&r.j.error)||form.getAttribute('data-fail'));
      msg.className='form-msg ok';msg.textContent=r.j.message;form.classList.add('done');
      if(r.j.link){var a=document.createElement('a');a.href=r.j.link;a.textContent=' PDF';msg.appendChild(a);}
    })
    .catch(function(e){msg.className='form-msg err';msg.textContent=e.message||form.getAttribute('data-fail');btn.disabled=false;});
  });
})();
</script>`;

export function mountSamples(app, { siteDir, shell, pool, initDb, sendEmail, env = process.env }) {
  // The PDF is given in exchange for the consent to Nurvan's emails (the
  // owner's choice, 02-10-2026). SITE_SAMPLE_CONSENT_REQUIRED=0 on the host
  // makes the box optional again, with no change to the code.
  const consentRequired = () => env.SITE_SAMPLE_CONSENT_REQUIRED !== "0";
  let cache = null;
  async function programs() {
    if (!cache) cache = JSON.parse(await fs.readFile(path.join(siteDir, "samples.json"), "utf8"));
    return cache;
  }
  const send = async (req, res, page, status = 200) => {
    res.setHeader("Cache-Control", status === 200 && !page.private ? "public, max-age=300" : "no-store");
    res.status(status).type("html").send(await shell(req, page));
  };
  const everyLang = (tail) => Object.fromEntries(SITE_LANGS.map((l) => [l, langPrefix(l) + tail]));
  const note = '<p class="legal-note">Programmi generici a scopo informativo: non sostituiscono il parere di un medico o di un professionista. HYROX® è un marchio registrato del suo titolare: Nurvan non è affiliata né sponsorizzata da HYROX.</p>';

  const list = async (req, res) => {
    const lang = langOfPath(req.path);
    const main = `<section class="blog"><div class="wrap"><div class="head"><div class="eyebrow">Allenamenti di esempio</div><h1 class="blog-title">Guarda come si allena chi usa Nurvan.</h1>` +
      `<p class="lead">Tre programmi presi dal database dell'app, così come li vedi sul telefono. Ognuno si scarica in PDF, completo di tutte le settimane.</p></div>` +
      sampleCardsHtml(lang) + note + `</div></section>`;
    return send(req, res, { lang, alternates: everyLang("/allenamenti"), title: "Allenamenti di esempio — Nurvan", description: "Tre programmi di allenamento di esempio: ipertrofia in 3 giorni, preparazione HYROX e allenamento a casa a corpo libero. Da vedere come nell’app e da scaricare in PDF.", main });
  };

  const one = async (req, res) => {
    const lang = langOfPath(req.path);
    const dict = await siteDict(siteDir, lang);
    const meta = metaOf(String(req.params.slug || "").toLowerCase());
    const sample = meta ? (await programs())[meta.slug] : null;
    if (!meta || !sample) {
      return send(req, res, { lang, title: "Allenamento non trovato — Nurvan", description: "", main: `<section class="blog"><div class="wrap"><div class="head"><h1 class="blog-title">Allenamento non trovato</h1></div><a class="more-link" href="${langPrefix(lang)}/allenamenti">Tutti gli allenamenti di esempio →</a></div></section>` }, 404);
    }
    const required = consentRequired();
    const main = `<article class="post sample"><div class="wrap">` +
      `<a class="back" href="${langPrefix(lang)}/allenamenti">← Tutti gli allenamenti di esempio</a>` +
      `<div class="split top sample-split"><div>` +
      `<div class="eyebrow">${esc(meta.tag)}</div><h1 class="blog-title">${esc(meta.title)}</h1><p class="lead">${esc(meta.sub)}</p>` +
      `<div class="chips">` + meta.facts.map((f) => `<span class="chip">${esc(f)}</span>`).join("") + `</div>` +
      `<ul>` + meta.points.map((p) => `<li>${esc(p)}</li>`).join("") + `</ul>` +
      `<div class="card sample-form-card"><h3>Ricevi il programma completo in PDF</h3>` +
      `<p>Tutte le settimane, seduta per seduta, da stampare o tenere sul telefono. Ti mandiamo il link per email.</p>` +
      `<form id="sample-form" data-sample="${esc(meta.slug)}" data-lang="${esc(lang)}" data-wait="${esc(st(dict, "Invio in corso…"))}" data-fail="${esc(st(dict, "Invio non riuscito. Riprova tra poco."))}" novalidate>` +
      `<label class="field"><span>La tua email</span><input type="email" name="email" required autocomplete="email" inputmode="email" placeholder="nome@esempio.it"></label>` +
      `<label class="check"><input type="checkbox" name="consent"${required ? " required" : ""}><span>${esc(CONSENT_TEXT)}</span></label>` +
      `<button type="submit" class="btn primary">Mandami il PDF</button>` +
      `<p id="sample-msg" class="form-msg" role="status"></p>` +
      `<p class="form-legal"><span>Usiamo l'indirizzo per mandarti il link.</span> <a href="{{APP_URL}}privacy?lang=${lang}">Informativa sulla privacy</a></p>` +
      `</form></div>` +
      `</div><div class="sample-phone-col">` + phoneHtml(sample) + `<p class="phone-caption">Così nell'app: tocca un giorno per vedere la seduta.</p></div></div>` +
      `<div class="post-cta"><strong>Nell'app la scheda si adatta ai tuoi giorni e alla tua attrezzatura.</strong><a class="btn primary" href="{{APP_URL}}">Apri l'app</a></div>` + note +
      `</div></article>` + SCRIPT;
    return send(req, res, { lang, alternates: everyLang("/allenamenti/" + meta.slug), title: st(dict, meta.title) + " — Nurvan", ownTitle: true, description: st(dict, meta.sub), main });
  };

  const message = (req, res, lang, title, text, status = 200) => send(req, res, {
    lang, private: true, title: title + " — Nurvan", description: "",
    main: `<section class="blog"><div class="wrap"><div class="head"><h1 class="blog-title">${title}</h1><p class="lead">${text}</p></div><a class="more-link" href="${langPrefix(lang)}/allenamenti">Tutti gli allenamenti di esempio →</a></div></section>`
  }, status);

  // The link from the email.
  app.get("/allenamenti/scarica/:token", async (req, res) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    const lang = reqSiteLang(req);
    try {
      await initDb();
      const found = await redeemSample(pool, String(req.params.token || ""));
      if (!found) return message(req, res, lang, "Link non valido", "Questo link non corrisponde a nessuna richiesta. Chiedi di nuovo il PDF dalla pagina dell'allenamento.", 404);
      if (found.expired) return message(req, res, lang, "Link scaduto", "Il link vale 7 giorni. Chiedi di nuovo il PDF dalla pagina dell'allenamento.", 410);
      const file = await fs.readFile(path.join(siteDir, "samples", found.sample + ".pdf"));
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", 'attachment; filename="nurvan-' + found.sample + '.pdf"');
      return res.send(file);
    } catch (err) {
      console.error("SAMPLE_DOWNLOAD", err);
      return message(req, res, lang, "PDF non disponibile", "Riprova tra poco.", 500);
    }
  });

  app.get("/allenamenti/disiscrizione/:token", async (req, res) => {
    res.setHeader("X-Robots-Tag", "noindex, nofollow");
    const lang = reqSiteLang(req);
    try {
      await initDb();
      const done = await unsubscribeLead(pool, String(req.params.token || ""));
      if (!done) return message(req, res, lang, "Link non valido", "Questo link non corrisponde a nessuna iscrizione.", 404);
      return message(req, res, lang, "Disiscrizione fatta", "Non riceverai più email da Nurvan a questo indirizzo.");
    } catch (err) {
      console.error("SAMPLE_UNSUBSCRIBE", err);
      return message(req, res, lang, "Disiscrizione non riuscita", "Riprova tra poco.", 500);
    }
  });

  // A few requests an hour from one address of the network are plenty.
  const hits = new Map();
  const tooMany = (ip, max = 8, windowMs = 3600000) => {
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) hits.clear();
    return recent.length > max;
  };

  app.post("/api/site/samples/request", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const body = req.body || {};
    const lang = SITE_LANGS.includes(String(body.lang || "")) ? String(body.lang) : "it";
    const dict = await siteDict(siteDir, lang);
    try {
      if (tooMany(String(req.ip || ""))) throw httpError(429, "Troppe richieste. Riprova più tardi.");
      const consent = body.consent === true;
      if (consentRequired() && !consent) throw httpError(400, "Per ricevere il PDF spunta la casella.");
      await initDb();
      const origin = req.protocol + "://" + req.get("host");
      const out = await requestSample(pool, { email: body.email, slug: String(body.sample || ""), lang, consent, origin, sendEmail });
      const reply = { ok: true, message: st(dict, "Fatto: ti abbiamo mandato il link. Controlla la posta, anche tra lo spam.") };
      // Where no email can be sent (a development machine) the link is
      // handed back, so the flow can be tried.
      if (!out.sent && !out.throttled) {
        if (sendEmail.configured || env.NODE_ENV === "production") throw httpError(502, "Invio non riuscito. Riprova tra poco.");
        reply.link = out.link;
      }
      return res.json(reply);
    } catch (err) {
      if (!err.statusCode) console.error("SAMPLE_REQUEST", err);
      return res.status(err.statusCode || 500).json({ error: st(dict, err.statusCode ? err.message : "Invio non riuscito. Riprova tra poco.") });
    }
  });

  for (const base of SITE_LANGS.map(langPrefix)) {
    app.get(base + "/allenamenti", list);
    app.get(base + "/allenamenti/:slug", one);
  }
  return { cardsHtml: sampleCardsHtml };
}

// The link pages have no language in their address: the browser's.
function reqSiteLang(req) {
  const header = String((req.headers && req.headers["accept-language"]) || "");
  for (const part of header.split(",")) {
    const code = part.trim().slice(0, 2).toLowerCase();
    if (SITE_LANGS.includes(code)) return code;
  }
  return "it";
}
