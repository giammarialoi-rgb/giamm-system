// The pages that say who writes and who is behind the site: the author's page,
// "who we are", the contacts (with a form that writes to the owner) and the
// privacy and terms pages under the site's own domain.
//
// The author's details are read from content/author.md and are not copied
// anywhere else. The company's name, address and VAT number come from
// web/features.json "legal" (the same block the legal pages use): while they
// are empty the page shows a visible placeholder - they are never made up.
import fs from "node:fs/promises";
import path from "node:path";
import { SITE_LANGS, langPrefix, langOfPath, siteDict, st } from "./i18n.mjs";
import { composeEmail, normalizeEmail, validEmail } from "../account/email-auth.mjs";
import { FORM_SCRIPT, httpError, clean, notifyRecipients, waitlistPath } from "./waitlist.mjs";
import { INSTAGRAM_APP, personLd } from "./seo.mjs";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const CONTACT_CONSENT_TEXT = "Acconsento al trattamento dei miei dati per ricevere una risposta a questo messaggio. Ho letto l'informativa sulla privacy.";
export const AUTHOR_SLUG = "giammaria-loi";

// Italian keeps its own words, the other languages share the English ones.
const SLUGS = { author: ["autore", "author"], about: ["chi-siamo", "about"], contact: ["contatti", "contact"] };
export const authorPath = (lang) => (!lang || lang === "it" ? "/autore/" + AUTHOR_SLUG : "/" + lang + "/author/" + AUTHOR_SLUG);
export const aboutPath = (lang) => (!lang || lang === "it" ? "/" + SLUGS.about[0] : "/" + lang + "/" + SLUGS.about[1]);
export const contactPath = (lang) => (!lang || lang === "it" ? "/" + SLUGS.contact[0] : "/" + lang + "/" + SLUGS.contact[1]);
export const legalPath = (lang, page) => langPrefix(lang) + "/" + page;
export const authorPhotoPath = "/site-assets/author/" + AUTHOR_SLUG + ".jpg";

/* ------------------------------- the author ----------------------------- */

function front(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/.exec(String(text).replace(/^﻿/, ""));
  const meta = {};
  if (!m) return { meta, body: String(text) };
  m[1].split(/\r?\n/).forEach((line) => { const i = line.indexOf(":"); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); });
  return { meta, body: m[2] };
}
// "## Title" section, as { IT: [paragraphs], EN: [paragraphs] }.
function section(body, title) {
  const m = new RegExp("^##\\s+" + title + "[^\\n]*\\n([\\s\\S]*?)(?=^##\\s|$(?![\\s\\S]))", "m").exec(body.replace(/\r\n/g, "\n"));
  const out = { IT: [], EN: [] };
  if (!m) return out;
  let lang = null;
  for (const raw of m[1].split("\n")) {
    const line = raw.trim();
    const tag = /^(IT|EN):\s*(.*)$/.exec(line);
    if (tag) { lang = tag[1]; if (tag[2]) out[lang].push(tag[2]); continue; }
    if (line && lang) out[lang].push(line);
  }
  return out;
}

export async function loadAuthor(root) {
  const file = path.join(root, "content", "author.md");
  const { meta, body } = front(await fs.readFile(file, "utf8"));
  const short = section(body, "Bio breve");
  const long = section(body, "Bio estesa");
  const instagram = String(meta.instagram || "").trim();
  return {
    name: meta.name || "Giammaria Loi",
    slug: meta.slug || AUTHOR_SLUG,
    roleIt: meta.role_it || "", roleEn: meta.role_en || "",
    photoFile: path.join(root, meta.photo || "content/author/giammaria-loi.jpg"),
    instagram, handle: "@" + (instagram.split("/").filter(Boolean).pop() || ""),
    trainingSince: meta.training_since, coachingSince: meta.coaching_since, powerliftingSince: meta.powerlifting_competitions_since,
    short, long
  };
}
// The author's text in the visitor's language: Italian, otherwise English.
const pick = (block, lang) => (lang === "it" ? block.IT : block.EN).length ? (lang === "it" ? block.IT : block.EN) : (block.IT.length ? block.IT : block.EN);
export const roleOf = (author, lang) => (lang === "it" ? author.roleIt : author.roleEn) || author.roleIt;

// Two lines at the end of an article.
export function authorBoxHtml(author, lang, dict) {
  return `<aside class="author-box"><img src="${authorPhotoPath}" alt="${esc(author.name)}" width="72" height="72" loading="lazy">` +
    `<div><strong><a href="${authorPath(lang)}">${esc(author.name)}</a></strong><p>${esc(pick(author.short, lang).join(" "))}</p></div></aside>`;
}
// Under the title of an article.
export function bylineHtml({ author, lang, dict, date, dateLabel, reviewed, reviewedLabel }) {
  return `<p class="byline">${st(dict, "di")} <a href="${authorPath(lang)}">${esc(author.name)}</a> — ${st(dict, "personal trainer certificato FIPE, coach dal {0}", author.coachingSince)}` +
    (date ? ` · <time datetime="${esc(date)}">${esc(dateLabel)}</time>` : "") +
    (reviewed ? ` · ${st(dict, "Ultimo aggiornamento: {0}", `<time datetime="${esc(reviewed)}">${esc(reviewedLabel)}</time>`)}` : "") + `</p>`;
}

/* -------------------------------- the pages ----------------------------- */

const legalOf = async (webDir) => {
  try { return JSON.parse(await fs.readFile(path.join(webDir, "features.json"), "utf8")); } catch (_) { return {}; }
};

// One reading of content/author.md for the whole site.
export function authorLoader(root) {
  let cache = null;
  return async () => cache || (cache = await loadAuthor(root));
}

export function mountTrust(app, { getAuthor, webDir, siteDir, shell, sendEmail, articles, cardHtml, isSiteHost, env = process.env, maxPerHour = 5 }) {
  const author = getAuthor;
  const everyLang = (fn) => Object.fromEntries(SITE_LANGS.map((l) => [l, fn(l)]));
  const send = async (req, res, page, status = 200) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(status).type("html").send(await shell(req, page));
  };
  const head = (eyebrow, title, lead) => `<div class="head"><div class="eyebrow">${eyebrow}</div><h1 class="blog-title">${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ""}</div>`;

  /* --- the author --- */
  const authorPage = async (req, res) => {
    const lang = langOfPath(req.path);
    const dict = await siteDict(siteDir, lang);
    const a = await author();
    const list = await articles(lang);
    const facts = [
      a.trainingSince && st(dict, "Si allena con i pesi dal {0}", a.trainingSince),
      a.coachingSince && st(dict, "Personal trainer e coach dal {0}", a.coachingSince),
      st(dict, "Certificato FIPE"),
      a.powerliftingSince && st(dict, "Powerlifting a livello nazionale dal {0}", a.powerliftingSince)
    ].filter(Boolean);
    const main = `<section class="blog author-page"><div class="wrap narrow">` +
      `<div class="author-hero"><img src="${authorPhotoPath}" alt="${esc(a.name)}" width="180" height="180"><div>` +
      `<div class="eyebrow">Autore</div><h1 class="blog-title" data-notr>${esc(a.name)}</h1><!--/notr-->` +
      `<p class="lead" data-notr>${esc(roleOf(a, lang))}</p><!--/notr-->` +
      `<div class="chips">` + facts.map((f) => `<span class="chip">${esc(f)}</span>`).join("") + `</div></div></div>` +
      `<div class="prose"><h2>Chi è</h2><div data-notr>` + pick(a.long, lang).map((p) => `<p>${esc(p)}</p>`).join("") + `</div><!--/notr-->` +
      `<h2>Dove trovarlo</h2><ul>` +
      `<li><a href="${esc(a.instagram)}" target="_blank" rel="noopener me"><span>Instagram personale</span> <span data-notr>${esc(a.handle)}</span><!--/notr--></a></li>` +
      `<li><a href="${esc(INSTAGRAM_APP)}" target="_blank" rel="noopener me"><span>Instagram di Nurvan</span> <span data-notr>@nurvan.app</span><!--/notr--></a></li>` +
      `<li><a href="${contactPath(lang)}">Contatti</a></li></ul></div>` +
      (list.length ? `<h2 class="author-articles">Gli articoli di Giammaria</h2><div class="posts">${list.map((x) => cardHtml(x, lang, dict)).join("")}</div>` : "") +
      `<p class="legal-note">I contenuti sono informativi e non sostituiscono il parere di un medico.</p>` +
      `</div></section>`;
    return send(req, res, {
      lang, alternates: everyLang(authorPath), ownTitle: true, title: st(dict, "{0} — autore di Nurvan", a.name),
      description: pick(a.short, lang).join(" ").slice(0, 200),
      og: { image: authorPhotoPath, imageAlt: a.name, type: "profile" },
      ld: (origin) => [personLd({
        origin, author: a, url: origin + authorPath(lang), jobTitle: roleOf(a, lang), image: origin + authorPhotoPath,
        sameAs: [a.instagram, INSTAGRAM_APP],
        knowsAbout: ["Powerlifting", "Strength training", "Personal training", "Sports nutrition", "Dietary supplements"],
        credential: st(dict, "Certificato FIPE")
      })],
      main
    });
  };
  app.get("/site-assets/author/" + AUTHOR_SLUG + ".jpg", async (req, res, next) => {
    try { res.setHeader("Cache-Control", "public, max-age=86400"); res.type("image/jpeg").send(await fs.readFile((await author()).photoFile)); } catch (_) { next(); }
  });

  /* --- who we are --- */
  const aboutPage = async (req, res) => {
    const lang = langOfPath(req.path);
    const dict = await siteDict(siteDir, lang);
    const a = await author();
    const main = `<section class="blog about"><div class="wrap narrow">` +
      head("Chi siamo", "Nurvan: allenamento, alimentazione e coaching in un’unica app", "Nurvan tiene insieme schede e carichi, piano alimentare, integrazione e coaching, in palestra e a casa.") +
      `<div class="prose">` +
      `<h2>Cosa fa Nurvan</h2><p>Aiuta chi si allena a seguire un programma con metodo: schede, carichi e progressi, piano alimentare e diario, ricette, e un’area dedicata ai coach per seguire i propri atleti. Sul blog trovi gli approfondimenti, scritti partendo dagli studi.</p>` +
      `<h2>Chi c’è dietro</h2><p>${st(dict, "Nurvan è fondata e guidata da {0}, personal trainer e coach certificato FIPE dal {1} e atleta di powerlifting a livello nazionale.", `<a href="${authorPath(lang)}">${esc(a.name)}</a>`, a.coachingSince)}</p>` +
      `<h2>Come scegliamo le fonti</h2>` +
      `<p>Ogni articolo parte dalla letteratura scientifica e ti dice da dove arrivano i numeri.</p><ul>` +
      `<li>Si parte da PubMed, meta-analisi e position stand delle società scientifiche.</li>` +
      `<li>Ogni numero ha una fonte, con PMID o DOI.</li>` +
      `<li>Le affermazioni sono etichettate come confermate, da precisare o smentite.</li>` +
      `<li>I contenuti sono informativi e non sostituiscono il parere di un medico.</li></ul>` +
      `<h2>Scrivici</h2><p>${st(dict, "Per domande, collaborazioni o segnalazioni usa la pagina {0}.", `<a href="${contactPath(lang)}">${st(dict, "Contatti")}</a>`)}</p>` +
      `<p>${st(dict, "Se sei un coach, guarda anche la {0}.", `<a href="${waitlistPath(lang)}#coach">${st(dict, "candidatura come coach fondatore")}</a>`)}</p>` +
      `</div></div></section>`;
    return send(req, res, {
      lang, alternates: everyLang(aboutPath), title: "Chi siamo — Nurvan",
      description: "Cos’è Nurvan, chi c’è dietro e come scegliamo le fonti: studi su PubMed, numeri con PMID o DOI, contenuti informativi e non un parere medico.",
      main
    });
  };

  /* --- the contacts --- */
  const contactPage = async (req, res) => {
    const lang = langOfPath(req.path);
    const dict = await siteDict(siteDir, lang);
    const legal = (await legalOf(webDir)).legal || {};
    const mail = String(env.SITE_CONTACT_EMAIL || "info@nurvan.app");
    // A detail not yet defined is shown as a visible placeholder, never invented.
    const row = (label, value, placeholder) => `<div class="company-row"><dt>${label}</dt><dd>` +
      (String(value || "").trim() ? `<span data-notr>${esc(String(value).trim())}</span><!--/notr-->` : `<span class="missing">${placeholder}</span>`) + `</dd></div>`;
    const form = `<form id="contact-form" class="wl-form" data-endpoint="/api/site/contact" data-lang="${esc(lang)}" data-wait="${esc(st(dict, "Invio in corso…"))}" data-fail="${esc(st(dict, "Invio non riuscito. Riprova tra poco."))}" novalidate>` +
      `<label class="field"><span>Nome</span><input type="text" name="name" required autocomplete="name" maxlength="100"></label>` +
      `<label class="field"><span>La tua email</span><input type="email" name="email" required autocomplete="email" inputmode="email" placeholder="nome@esempio.it"></label>` +
      `<label class="field"><span>Messaggio</span><textarea name="message" rows="5" required maxlength="3000"></textarea></label>` +
      `<div class="hp" aria-hidden="true"><label>Non compilare questo campo<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>` +
      `<label class="check"><input type="checkbox" name="consent" required><span>${esc(CONTACT_CONSENT_TEXT)}</span></label>` +
      `<button type="submit" class="btn primary">Invia il messaggio</button><p class="form-msg" role="status"></p>` +
      `<p class="form-legal"><a href="{{PRIVACY}}">Informativa sulla privacy</a></p></form>`;
    const main = `<section class="blog contact"><div class="wrap narrow">` +
      head("Contatti", "Scrivici", "Per domande, collaborazioni o segnalazioni. Rispondiamo per email.") +
      `<div class="split top"><div>` +
      `<h2>Email</h2><p><a href="mailto:${esc(mail)}">${esc(mail)}</a></p>` +
      `<h2>Chi siamo, per legge</h2><dl class="company">` +
      row("Ragione sociale", legal.controllerName, "[ragione sociale da definire]") +
      row("Sede", legal.controllerAddress, "[sede da definire]") +
      row("Partita IVA / codice fiscale", legal.controllerVat, "[partita IVA da definire]") + `</dl>` +
      `</div><div class="card sample-form-card"><h2>Scrivici un messaggio</h2>${form}</div></div>` +
      `</div></section>` + FORM_SCRIPT;
    return send(req, res, {
      lang, alternates: everyLang(contactPath), title: "Contatti — Nurvan",
      description: "Scrivi a Nurvan per domande, collaborazioni o segnalazioni: indirizzo email, dati dell’azienda e modulo di contatto per scriverci direttamente dal sito.",
      main
    });
  };

  // Messages go to the owner by email (the same recipients as the waiting list); nothing is kept.
  const hits = new Map();
  const tooMany = (ip, windowMs = 3600000) => {
    const now = Date.now();
    const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(ip, recent);
    if (hits.size > 5000) hits.clear();
    return recent.length > maxPerHour;
  };
  app.post("/api/site/contact", async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    const body = req.body || {};
    const lang = SITE_LANGS.includes(String(body.lang || "")) ? String(body.lang) : "it";
    const dict = await siteDict(siteDir, lang);
    try {
      if (tooMany(String(req.ip || ""))) throw httpError(429, "Troppe richieste. Riprova più tardi.");
      if (String(body.website || "").trim()) throw httpError(400, "Invio non riuscito. Riprova tra poco.");
      const name = clean(body.name, 100);
      const email = normalizeEmail(body.email);
      const message = String(body.message == null ? "" : body.message).replace(/\r/g, "").replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, " ").trim().slice(0, 3000);
      if (!name) throw httpError(400, "Scrivi il tuo nome.");
      if (!validEmail(email) || email.length > 200) throw httpError(400, "Scrivi un indirizzo email valido.");
      if (message.length < 5) throw httpError(400, "Scrivi il tuo messaggio.");
      if (body.consent !== true) throw httpError(400, "Per inviare il messaggio spunta la casella sulla privacy.");
      const to = notifyRecipients(env);
      if (!to.length || !sendEmail) throw httpError(503, "Invio non riuscito. Riprova tra poco.");
      const mail = composeEmail({ title: "Nuovo messaggio dal sito", intro: ["Nome: " + name, "Email: " + email, "Lingua: " + lang, "", message].join("\n") }, "it");
      const subject = "NURVAN — messaggio dal sito: " + name;
      let sent = false;
      for (const addr of to) { try { const r = await sendEmail(addr, subject, mail.text, mail.html); sent = sent || !!(r && r.sent); } catch (e) { console.error("SITE_CONTACT_SEND", e && e.message); } }
      if (!sent) throw httpError(502, "Invio non riuscito. Riprova tra poco.");
      return res.json({ ok: true, message: st(dict, "Messaggio inviato. Ti rispondiamo per email appena possibile.") });
    } catch (err) {
      if (!err.statusCode) console.error("SITE_CONTACT", err);
      return res.status(err.statusCode || 500).json({ error: st(dict, err.statusCode ? err.message : "Invio non riuscito. Riprova tra poco.") });
    }
  });

  /* --- privacy and terms, with the site's header and footer --- */
  const legalPage = (page, title, description) => async (req, res, next) => {
    if (!isSiteHost(req)) return next();
    const asked = String(req.query.lang || "").slice(0, 2).toLowerCase();
    const lang = SITE_LANGS.includes(asked) ? asked : langOfPath(req.path);
    let html = null;
    for (const file of lang === "it" ? [path.join(webDir, page + ".html")] : [path.join(webDir, "legal", lang, page + ".html"), path.join(webDir, page + ".html")]) {
      try { html = await fs.readFile(file, "utf8"); break; } catch (_) { /* the next one */ }
    }
    if (!html) return next();
    const inner = (/<main>([\s\S]*)<\/main>/.exec(html) || [])[1] || "";
    const features = await legalOf(webDir);
    const legal = features.legal || {};
    const values = {
      controllerName: legal.controllerName, controllerAddress: legal.controllerAddress, controllerVat: legal.controllerVat, hostingRegion: legal.hostingRegion,
      privacyEmail: String(legal.privacyEmail || features.contactEmail || "").trim(), minAge: String(legal.minAge || 16),
      lastUpdated: legal.lastUpdated || legal.version, version: legal.version
    };
    const placeholders = { controllerName: "[nome o ragione sociale del titolare]", controllerAddress: "[indirizzo del titolare]", controllerVat: "[partita IVA / codice fiscale]", hostingRegion: "[regione dei server]", privacyEmail: "[email di contatto privacy]", lastUpdated: "[data]", version: "[versione]" };
    let body = inner.replace(/<header class="brand">[\s\S]*?<\/header>/, "")
      .replace(/<(a|span)([^>]*)\sdata-legal="([a-zA-Z]+)"([^>]*)>\s*<\/\1>/g, (all, tag, a1, key, a2) => {
        const v = String(values[key] || "").trim();
        if (v) return tag === "a" && key === "privacyEmail" ? `<a${a1}${a2.replace(/\shref="#"/, "")} href="mailto:${esc(v)}">${esc(v)}</a>` : `<${tag}${a1}${a2}>${esc(v)}</${tag}>`;
        return `<${tag}${a1}${a2} class="missing">${esc(placeholders[key] || "[da compilare]")}</${tag}>`;
      });
    const incomplete = ["controllerName", "controllerAddress", "privacyEmail"].some((k) => !String(values[k] || "").trim());
    body = body.replace(/<div id="legal-draft" class="draft" hidden>/, incomplete ? '<div id="legal-draft" class="draft">' : '<div id="legal-draft" class="draft" hidden>')
      .replace(/href="\?lang=it"/g, `href="${legalPath("it", page)}"`)
      .replace(/<h1>/, '<h1 class="blog-title">');
    const main = `<article class="post legal-doc"><div class="wrap narrow"><div class="prose" data-notr>${body}</div><!--/notr--></div></article>`;
    return send(req, res, { lang, alternates: everyLang((l) => legalPath(l, page)), title, ownTitle: true, description, main });
  };
  const privacy = legalPage("privacy", "Informativa sulla privacy — Nurvan", "Come Nurvan tratta i dati personali, compresi i dati sulla salute.");
  const terms = legalPage("termini", "Termini di servizio — Nurvan", "Le condizioni d’uso di Nurvan: account, piani, contenuti e responsabilità.");

  for (const l of SITE_LANGS) {
    app.get(authorPath(l), authorPage);
    app.get(aboutPath(l), aboutPage);
    app.get(contactPath(l), contactPage);
    app.get(legalPath(l, "privacy"), privacy);
    app.get(legalPath(l, "termini"), terms);
  }
  return { author };
}
