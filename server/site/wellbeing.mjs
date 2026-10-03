// The site's pages for "Salute e recupero": the hub, posture and pains, labour
// and birth, after the birth. They are written from the same data as the app
// (web/wellbeing.js, web/wellbeing-care.js, web/wellbeing-refs.js): what the
// app says and what the site says cannot drift apart, and the studies are the
// same ones, with their identifiers.
//
// Every page opens with the whole notice. The citations are shown as
// published (English) and are not translated; everything else goes through
// the site's dictionary like any other page.
import fs from "node:fs/promises";
import path from "node:path";
import vm from "node:vm";
import { SITE_LANGS, langPrefix, langOfPath, siteDict } from "./i18n.mjs";
import { breadcrumbLd } from "./seo.mjs";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const notr = (html) => `<span data-notr>${html}</span><!--/notr-->`;

// Italian keeps its own words, the other languages share the English ones.
const SLUGS = { hub: ["salute-e-recupero", "health"], posture: ["postura", "posture"], postpartum: ["dopo-il-parto", "postpartum"], labour: ["travaglio-e-parto", "labour"] };
export const wellbeingPath = (key, lang) => (!lang || lang === "it" ? "/" + SLUGS[key][0] : "/" + lang + "/" + SLUGS[key][1]);

export async function loadWellbeing(root) {
  const ctx = { self: {}, console };
  vm.createContext(ctx);
  for (const f of ["web/wellbeing.js", "web/wellbeing-care.js", "web/wellbeing-refs.js"]) {
    vm.runInContext(await fs.readFile(path.join(root, f), "utf8"), ctx);
  }
  return { W: ctx.self.NurvanWellbeing, REFS: ctx.self.NURVAN_WELLBEING_REFS };
}

function refsHtml(REFS, ids) {
  const seen = new Set();
  const items = [];
  for (const id of ids) {
    if (seen.has(id) || !REFS[id]) continue;
    seen.add(id);
    items.push(`<li>${notr(esc(REFS[id].cite) + (REFS[id].pmid ? " · PMID " + esc(REFS[id].pmid) : ""))} · <a href="${esc(REFS[id].url)}" target="_blank" rel="noopener nofollow">${REFS[id].pmid ? "PubMed" : "Sito ufficiale"}</a></li>`);
  }
  return items.length ? `<details class="wb-refs"><summary>Le fonti</summary><ul>${items.join("")}</ul></details>` : "";
}
const bullets = (list) => `<ul>${list.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
function claims(REFS, sources) {
  return `<ul>${sources.map((s) => `<li>${esc(s.t)}${refsHtml(REFS, s.r)}</li>`).join("")}</ul>`;
}
function disclaimerBlock(W) {
  return `<div class="wb-warn"><h2>Avvertenza</h2>${W.DISCLAIMER.map((t) => `<p>${esc(t)}</p>`).join("")}</div>`;
}
const head = (eyebrow, title, lead) => `<div class="head"><div class="eyebrow">${eyebrow}</div><h1 class="blog-title">${title}</h1>${lead ? `<p class="lead">${lead}</p>` : ""}</div>`;

export function hubMain(W, lang) {
  const cards = [
    ["posture", "Postura e dolori", "Dodici problemi comuni, da scapole e spalle alla schiena, al ginocchio e al piede: cosa dicono le fonti, cosa non è dimostrato, quali esercizi hanno il miglior supporto."],
    ["labour", "Travaglio e parto", "Posizioni e movimento in travaglio, e la preparazione delle ultime settimane: cosa dicono le prove, comprese quelle che non danno vantaggi a chi si allena."],
    ["postpartum", "Dopo il parto", "Il ritorno all'esercizio in base al tipo di parto e ai mesi passati, con i segnali per cui si chiama e le fasi che si sbloccano solo senza sintomi."]
  ];
  return `<section class="blog wb"><div class="wrap narrow">` +
    head("Salute e recupero", "Esercizio per un problema fisico, per il parto e per il dopo parto", "Informazioni con le fonti, scritte per essere lette con il tuo medico, fisioterapista od ostetrica. Qui non c'è nessuna promessa di «correggere» ciò che gli studi non dimostrano.") +
    disclaimerBlock(W) +
    `<div class="cards">${cards.map(([key, title, text]) => `<a class="card" href="${wellbeingPath(key, lang)}"><h3>${title}</h3><p>${text}</p><span class="more">Leggi →</span></a>`).join("")}</div>` +
    `<div class="prose"><h2>Come lavoriamo</h2><ul>` +
    `<li>${esc("Partiamo da linee guida, revisioni sistematiche e meta-analisi, non da opinioni.")}</li>` +
    `<li>${esc("Ogni affermazione porta il riferimento allo studio, con l'identificativo (PMID) o l'indirizzo ufficiale della linea guida.")}</li>` +
    `<li>${esc("Dove una cosa è opinione di esperti e non risultato di studi, lo scriviamo; dove gli studi dicono che un esercizio non cambia ciò che molti credono, lo scriviamo ugualmente.")}</li>` +
    `<li>${esc("Nell'app, ognuna di queste sezioni comincia dai segni per cui prima serve un professionista, e ti propone un programma solo se non ce n'è nessuno.")}</li></ul>` +
    `<p><a class="btn primary" href="{{APP_URL}}">Apri l'app</a></p></div>` +
    `</div></section>`;
}

export function postureMain(W, REFS, lang) {
  const toc = `<nav class="chips" aria-label="Problemi">${W.POSTURE.map((t) => `<a class="chip" href="#${t.id}">${esc(t.label)}</a>`).join("")}</nav>`;
  const sections = W.POSTURE.map((t) =>
    `<section id="${t.id}" class="wb-topic"><h2>${esc(t.label)}</h2><p>${esc(t.what)}</p>` +
    `<h3>Cosa dicono le fonti</h3>${claims(REFS, t.sources)}` +
    `<h3>Cosa non è dimostrato</h3>${bullets(t.notProven)}` +
    `<h3>Quando prima il medico</h3>${bullets(t.red)}` +
    `<h3>Muscoli e dosaggio</h3><p><b>Muscoli.</b> ${esc(t.muscles)}</p><p><b>Dosaggio.</b> ${esc(t.dose)}</p>` +
    `<h3>Gli esercizi</h3><ul>${t.exercises.map((id) => `<li><b>${esc(W.EX[id].name)}</b> ${esc(W.EX[id].cue)}</li>`).join("")}</ul>` +
    `</section>`).join("");
  return `<section class="blog wb"><div class="wrap narrow">` +
    head("Salute e recupero", "Postura e dolori: cosa dicono davvero le fonti", "Dodici problemi comuni. Il legame tra postura e dolore è spesso debole: gli esercizi aiutano soprattutto attraverso forza, carico progressivo e attività, e il «raddrizzare» è dimostrato poco o per niente.") +
    disclaimerBlock(W) + toc + `<div class="prose">${sections}</div>` +
    `<p><a class="btn primary" href="{{APP_URL}}">Apri l'app</a></p>` +
    `</div></section>`;
}

export function postpartumMain(W, REFS, lang) {
  const phases = `<ul>${W.PHASES.map((p) => `<li><b>${esc(p.label)}</b> <i>${esc(p.range)}</i><br>${esc(p.summary)}</li>`).join("")}</ul>`;
  const deliveries = `<ul>${W.DELIVERIES.map((d) => `<li><b>${esc(d.label)}</b><br>${esc(d.note)}</li>`).join("")}</ul>`;
  return `<section class="blog wb"><div class="wrap narrow">` +
    head("Salute e recupero", "Dopo il parto: il ritorno all'esercizio", "In base al tipo di parto e ai mesi passati. Il tipo di parto decide quando si sblocca una fase; i sintomi decidono se si va avanti.") +
    disclaimerBlock(W) +
    `<div class="prose"><h2>Le fasi</h2>${phases}<h2>Il tipo di parto</h2>${deliveries}` +
    `<h2>Cosa dicono le fonti</h2>${claims(REFS, W.POSTPARTUM_SOURCES)}` +
    `<h2>Cosa non è dimostrato</h2>${bullets(W.POSTPARTUM_NOT_PROVEN)}` +
    `<h2>Quando fermarsi e chiamare</h2>${bullets(W.URGENT)}` +
    `<h2>Sintomi da far vedere a un fisioterapista del pavimento pelvico</h2>${bullets(W.PELVIC)}` +
    `<h2>Prima della corsa: i test</h2><p>${esc("Consenso di esperti, non risultati di studi. Da fare senza dolore, pesantezza, trascinamento o perdite.")}</p>${bullets(W.LOAD_TESTS.concat(W.STRENGTH_TESTS))}` +
    `<p><a class="btn primary" href="{{APP_URL}}">Apri l'app</a></p></div>` +
    `</div></section>`;
}

export function labourMain(W, REFS, lang) {
  const guide = W.LABOUR_GUIDE.map((g) =>
    `<h3>${esc(g.title)}</h3><p class="wb-when">${esc(g.when)}</p><p>${esc(g.t)}</p><p><b>Cosa dicono gli studi.</b> ${esc(g.e)}</p>${refsHtml(REFS, g.r)}`).join("");
  return `<section class="blog wb"><div class="wrap narrow">` +
    head("Salute e recupero", "Travaglio e parto: cosa dicono le prove", "Posizioni, movimento e preparazione. In travaglio decide il team che ti assiste: queste informazioni servono a sapere cosa si può chiedere.") +
    disclaimerBlock(W) +
    `<div class="prose"><h2>Prima di tutto: la tua situazione</h2><p>${esc("Se per te è vero qualcuno di questi punti, posizioni, movimento e preparazione le decide chi ti segue: qui trovi solo informazioni.")}</p>${bullets(W.LABOUR_RISKS)}` +
    `<h2>In travaglio</h2>${guide}` +
    `<h2>${esc(W.LABOUR_TRAINING.title)}</h2><p>${esc(W.LABOUR_TRAINING.t)}</p>${claims(REFS, W.LABOUR_TRAINING.facts)}` +
    `<h2>Quando chiamare subito il punto nascita o il 112</h2>${bullets(W.LABOUR_ALARMS)}` +
    `<p><a class="btn primary" href="{{APP_URL}}">Apri l'app</a></p></div>` +
    `</div></section>`;
}

export function mountWellbeing(app, { root, siteDir, shell }) {
  let data = null;
  const load = async () => data || (data = await loadWellbeing(root));
  const everyLang = (key) => Object.fromEntries(SITE_LANGS.map((l) => [l, wellbeingPath(key, l)]));
  const page = (key, title, description, build) => async (req, res) => {
    const lang = langOfPath(req.path);
    const { W, REFS } = await load();
    const main = build(W, REFS, lang);
    const crumbs = (origin) => [{ name: "Nurvan", url: origin + (langPrefix(lang) || "/") }]
      .concat(key === "hub" ? [] : [{ name: "Salute e recupero", url: origin + wellbeingPath("hub", lang) }])
      .concat([{ name: title.replace(/ — Nurvan$/, ""), url: origin + wellbeingPath(key, lang) }]);
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).type("html").send(await shell(req, { lang, alternates: everyLang(key), title, description, main, ld: (origin) => [breadcrumbLd(crumbs(origin))] }));
  };
  const routes = {
    hub: page("hub", "Salute e recupero — Nurvan", "Esercizio per un problema fisico, per il parto e per il dopo parto: informazioni con le fonti, i limiti di ciò che gli studi dimostrano e un'avvertenza chiara.", (W, R, l) => hubMain(W, l)),
    posture: page("posture", "Postura e dolori: cosa dicono le fonti — Nurvan", "Scapole alate, spalle in avanti, iperlordosi, collo, scoliosi, ginocchio, schiena, spalla, piede e anca: cosa dicono studi e linee guida, cosa non è dimostrato e quali esercizi hanno più supporto.", postureMain),
    postpartum: page("postpartum", "Dopo il parto: tornare all'esercizio — Nurvan", "Il ritorno all'esercizio dopo il parto in base al tipo di parto e ai mesi passati: fasi, segnali per fermarsi, pavimento pelvico, diastasi, corsa e cesareo, con le fonti.", postpartumMain),
    labour: page("labour", "Travaglio e parto: cosa dicono le prove — Nurvan", "Posizioni e movimento in travaglio, preparazione delle ultime settimane e il ruolo dell'allenamento: cosa dicono le revisioni Cochrane e le linee guida, e quando decide il team.", labourMain)
  };
  for (const key of Object.keys(routes)) for (const l of SITE_LANGS) app.get(wellbeingPath(key, l), routes[key]);
  return { load, paths: wellbeingPath };
}
