// The HYROX race calendar on the site: /hyrox lists the races still to come
// and every race has its own page (/hyrox/<id>), written from the calendar
// file (web/hyrox-events.json, built by tools/hyrox_events.mjs). A race added
// to the file is a new page on the site, with nothing else to do.
//
// HYROX is a registered trademark of its owner: the pages say that Nurvan is
// not affiliated and link the official page for dates and registration.
import fs from "node:fs/promises";
import path from "node:path";
import { breadcrumbLd } from "./seo.mjs";
import { SITE_LANGS, SITE_LOCALES, langPrefix, langOfPath, siteDict, st } from "./i18n.mjs";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const EUROPE = ["AT", "BE", "CH", "CZ", "DE", "DK", "ES", "FI", "FR", "GB", "GR", "HU", "IE", "LV", "NL", "NO", "PL", "PT", "SE"];
const regionOf = (ev) => (ev.country === "IT" ? "italy" : (EUROPE.includes(ev.country) ? "europe" : "world"));

function dateText(ev, lang) {
  if (!ev.start) return "";
  const fmt = (iso, opts) => new Intl.DateTimeFormat(SITE_LOCALES[lang] || "it-IT", Object.assign({ timeZone: "UTC" }, opts)).format(new Date(iso + "T00:00:00Z"));
  try {
    return ev.end && ev.end !== ev.start
      ? fmt(ev.start, { day: "numeric", month: "long" }) + " – " + fmt(ev.end, { day: "numeric", month: "long", year: "numeric" })
      : fmt(ev.start, { day: "numeric", month: "long", year: "numeric" });
  } catch (_) { return ev.start; }
}

export function mountHyrox(app, { webDir, siteDir, shell }) {
  let cache = { at: 0, data: { events: [] } };
  async function calendar() {
    if (Date.now() - cache.at > 60 * 1000) {
      let data = { events: [] };
      try { data = JSON.parse(await fs.readFile(path.join(webDir, "hyrox-events.json"), "utf8")); } catch (_) {}
      cache = { at: Date.now(), data };
    }
    return cache.data;
  }
  const upcoming = (events) => {
    const today = new Date().toISOString().slice(0, 10);
    return events.filter((e) => !e.start || (e.end || e.start) >= today).sort((a, b) => (a.start || "9999").localeCompare(b.start || "9999"));
  };
  const send = async (req, res, page, status = 200) => {
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(status).type("html").send(await shell(req, page));
  };
  const everyLang = (tail) => Object.fromEntries(SITE_LANGS.map((l) => [l, langPrefix(l) + tail]));
  const note = '<p class="legal-note">HYROX® è un marchio registrato del suo titolare. Nurvan non è affiliata né sponsorizzata da HYROX: date, luoghi e iscrizioni vanno sempre verificati sulla pagina ufficiale della gara.</p>';

  // What was measured on people who raced, each line with its study: the
  // same evidence the app's preparation is laid out on (web/hyrox.js).
  const evidence = '<h2>Cosa dicono i dati</h2><p>Numeri misurati su chi ha gareggiato: dicono dove si guadagna tempo, non garantiscono un risultato.</p><ul><li><span>La corsa vale circa metà del tempo di gara: nei migliori 100 Pro della stagione 2024/25, 27:38 su 56:56 per gli uomini e 30:17 su 1:03:11 per le donne.</span> <a href="https://doi.org/10.3389/fphys.2026.1847569" target="_blank" rel="noopener nofollow" data-notr>Rappelt et al., Front Physiol 2026</a><!--/notr--></li><li><span>Chi ha un VO2max più alto e fa più ore di resistenza a settimana finisce prima; forza della presa e ore di pesi non spostano il tempo finale.</span> <a href="https://doi.org/10.3389/fphys.2025.1519240" target="_blank" rel="noopener nofollow" data-notr>Brandt et al., Front Physiol 2025</a><!--/notr--></li><li><span>In gara si passa circa l’80% del tempo tra il 90 e il 100% della frequenza cardiaca massima, con il picco ai wall ball, l’ultima stazione.</span> <a href="https://doi.org/10.3389/fphys.2025.1519240" target="_blank" rel="noopener nofollow" data-notr>Brandt et al., Front Physiol 2025</a><!--/notr--></li><li><span>Allenare la forza due o tre volte a settimana migliora l’economia di corsa dal 2 all’8%.</span> <a href="https://doi.org/10.1007/s40279-017-0835-7" target="_blank" rel="noopener nofollow" data-notr>Blagrove et al., Sports Med 2018</a><!--/notr--></li><li><span>Lo scarico che rende di più dura circa due settimane e taglia il volume del 41–60% lasciando invariata l’intensità.</span> <a href="https://doi.org/10.1249/mss.0b013e31806010e0" target="_blank" rel="noopener nofollow" data-notr>Bosquet et al., Med Sci Sports Exerc 2007</a><!--/notr--></li></ul><p>La preparazione di Nurvan è scritta su questi dati: più corsa che sola forza, corsa a gambe stanche dopo ogni stazione, due settimane di scarico prima della gara.</p>';

  const raceCard = (ev, lang, dict) =>
    `<a class="race" href="${langPrefix(lang)}/hyrox/${esc(ev.id)}"><span data-notr><strong>${esc(ev.city)}</strong><small>${esc(ev.countryName)}</small></span><!--/notr-->` +
    `<span class="when" data-notr>${esc(ev.start ? dateText(ev, lang) : st(dict, "Data da annunciare"))}</span><!--/notr--></a>`;

  const list = async (req, res) => {
    const lang = langOfPath(req.path);
    const dict = await siteDict(siteDir, lang);
    const data = await calendar();
    const all = upcoming(data.events || []);
    const group = (title, items) => (items.length ? `<h2 class="race-group">${title}</h2><div class="races">${items.map((ev) => raceCard(ev, lang, dict)).join("")}</div>` : "");
    const main = `<section class="blog"><div class="wrap"><div class="head"><div class="eyebrow">HYROX</div><h1 class="blog-title">Calendario gare HYROX</h1>` +
      `<p class="lead">Tutte le gare in programma, in Italia, in Europa e nel mondo. Scegli la tua e preparala con un programma scritto sulla data.</p></div>` +
      group("Italia", all.filter((e) => regionOf(e) === "italy")) +
      group("Europa", all.filter((e) => regionOf(e) === "europe")) +
      group("Resto del mondo", all.filter((e) => regionOf(e) === "world")) +
      (all.length ? "" : '<p class="lead">Nessuna gara in calendario al momento.</p>') +
      `<div class="prose">${evidence}</div>` +
      (lang === "it" ? '<p class="lead">Come ti prepara Nurvan: <a href="/app-allenamento-hyrox">app di allenamento per HYROX</a>, con un programma scritto sulla data della gara.</p>' : "") +
      `<div class="post-cta"><strong>Prepara la tua gara con Nurvan.</strong><a class="btn primary" href="{{APP_URL}}">Apri l'app</a></div>` + note +
      "</div></section>";
    return send(req, res, { lang, alternates: everyLang("/hyrox"), title: "Calendario gare HYROX — Nurvan", description: "Le prossime gare HYROX in Italia, in Europa e nel mondo, con date, città e link ufficiali per iscriverti, e la preparazione su misura nell’app Nurvan.", main, ld: (origin) => [breadcrumbLd([{ name: "Nurvan", url: origin + (langPrefix(lang) || "/") }, { name: "HYROX", url: origin + langPrefix(lang) + "/hyrox" }])] });
  };

  const one = async (req, res) => {
    const lang = langOfPath(req.path);
    const dict = await siteDict(siteDir, lang);
    const data = await calendar();
    const ev = (data.events || []).find((e) => e.id === String(req.params.id || "").toLowerCase());
    if (!ev) return send(req, res, { lang, title: "Gara non trovata — Nurvan", description: "", main: `<section class="blog"><div class="wrap"><div class="head"><h1 class="blog-title">Gara non trovata</h1><p class="lead">Forse è già passata.</p></div><a class="more-link" href="${langPrefix(lang)}/hyrox">Calendario gare HYROX →</a></div></section>` }, 404);
    const when = ev.start ? dateText(ev, lang) : st(dict, "Data da annunciare");
    const weeks = ev.start ? Math.floor((new Date(ev.start + "T00:00:00Z").getTime() - Date.now()) / (7 * 24 * 3600 * 1000)) : null;
    const main = `<article class="post"><div class="wrap narrow">` +
      `<a class="back" href="${langPrefix(lang)}/hyrox">← Calendario gare HYROX</a>` +
      `<div class="eyebrow">HYROX</div>` +
      `<h1 class="blog-title" data-notr>HYROX ${esc(ev.city)}</h1><!--/notr-->` +
      `<p class="lead" data-notr>${esc(ev.countryName)} · ${esc(when)}</p><!--/notr-->` +
      (weeks != null && weeks > 0 ? `<p class="race-left" data-notr>${esc(st(dict, "Mancano {0} settimane.", weeks))}</p><!--/notr-->` : "") +
      `<div class="prose">` +
      `<h2>Come funziona la gara</h2>` +
      `<p>Il formato è lo stesso in ogni città: otto volte un chilometro di corsa, ogni volta seguito da una stazione, sempre nello stesso ordine.</p>` +
      `<ol><li>Ski erg, 1000 m</li><li>Sled push, 50 m</li><li>Sled pull, 50 m</li><li>Burpee broad jump, 80 m</li><li>Vogatore, 1000 m</li><li>Farmer carry, 200 m</li><li>Affondi con sandbag, 100 m</li><li>Wall ball, 100 ripetizioni</li></ol>` +
      `<h2>Quanto tempo serve per prepararla</h2>` +
      `<p>Con una base di corsa e di pesi bastano 8 settimane; partendo da zero è meglio contarne 12-16. Le ultime sono le più importanti: simulazioni di gara e lo scarico prima della partenza.</p>` +
      evidence +
      `<h2>Iscrizioni e orari</h2>` +
      `<p>Categorie, prezzi, orari di partenza e disponibilità dei posti sono sulla pagina ufficiale della gara.</p>` +
      `<p><a href="${esc(ev.url)}" target="_blank" rel="noopener nofollow">Pagina ufficiale della gara →</a></p>` +
      `</div>` +
      `<div class="post-cta"><strong>Prepara questa gara con Nurvan.</strong><a class="btn primary" href="{{APP_URL}}">Apri l'app</a></div>` + note +
      `</div></article>`;
    return send(req, res, { lang, alternates: everyLang("/hyrox/" + ev.id), ownTitle: true, title: `HYROX ${ev.city} ${ev.start ? ev.start.slice(0, 4) : ""} — Nurvan`, description: st(dict, "HYROX {0}: date, formato della gara (8 km di corsa e 8 stazioni di forza e resistenza), iscrizioni e preparazione su misura con Nurvan.", ev.city), main });
  };

  for (const base of SITE_LANGS.map(langPrefix)) {
    app.get(base + "/hyrox", list);
    app.get(base + "/hyrox/:id", one);
  }
  return { calendar };
}
