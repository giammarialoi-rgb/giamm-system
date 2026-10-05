// Landing pages, comparison pages and free tools of the Italian site (brief W4).
//
//   /app-per-personal-trainer, /software-schede-allenamento,
//   /alternativa-a-trainerize, /alternativa-a-truecoach,
//   /app-allenamento-hyrox, /app-powerlifting, /app-allenamento-palestra,
//   /strumenti and /strumenti/<tool>.
//
// Italian only: no other language has these pages, so the pages carry no
// hreflang to versions that do not exist (the shell writes only the
// alternates it is given) and the sitemap lists one language for them. The
// words are in landings-content.mjs.
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PAGES, TOOLS, COMPETITORS, VERIFIED_ON, COACH_CTA, ATHLETE_CTA, LASTMOD } from "./landings-content.mjs";
import { breadcrumbLd, faqLd, imageSize } from "./seo.mjs";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const here = path.dirname(fileURLToPath(import.meta.url));

export { LASTMOD as LANDING_LASTMOD };
export const LANDING_PATHS = Object.keys(PAGES).map((k) => "/" + k);
export const TOOL_PATHS = ["/strumenti"].concat(Object.keys(TOOLS).map((k) => "/strumenti/" + k));
export const ALL_PATHS = LANDING_PATHS.concat(TOOL_PATHS);

const TOOLS_INDEX = {
  title: "Calcolatori gratuiti: 1RM, Wilks e macro | Nurvan",
  description: "Tre calcolatori gratuiti che funzionano nel browser, senza registrazione e senza salvare nulla: massimale stimato 1RM, punti Wilks e IPF GL, calorie e macro.",
  h1: "Strumenti gratuiti per chi si allena"
};
const TOOL_BLURB = {
  "calcolatore-1rm": "Stima il massimale da peso e ripetizioni con Epley e Brzycki e ottieni la tabella dei carichi.",
  "calcolatore-wilks-ipf-gl": "Punti Wilks e IPF GL dal totale e dal peso corporeo, per classic ed equipaggiato.",
  "calcolatore-macro": "Calorie, proteine, carboidrati e grassi da cui partire, con la formula di Mifflin-St Jeor."
};

// Visible words of an HTML fragment (tags and scripts out).
export function wordCount(html) {
  const text = String(html).replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/g, " ");
  return (text.match(/[A-Za-zÀ-ÿ0-9][A-Za-zÀ-ÿ0-9’'.,%-]*/g) || []).length;
}

function crumbsHtml(trail) {
  return '<nav class="crumbs" aria-label="Percorso"><a href="/">Nurvan</a>' + trail.map(([name, href], i) => " › " + (i === trail.length - 1 ? '<span aria-current="page">' + esc(name) + "</span>" : '<a href="' + href + '">' + esc(name) + "</a>")).join("") + "</nav>";
}
function faqHtml(faq) {
  return '<h2>Domande frequenti</h2><div class="faq">' + faq.map((f) => "<details><summary>" + esc(f.q) + "</summary><p>" + esc(f.a) + "</p></details>").join("") + "</div>";
}
function ctaHtml(kind) {
  const cta = kind === "coach" || kind === "compare" ? COACH_CTA : ATHLETE_CTA;
  const text = kind === "coach" || kind === "compare"
    ? "Nurvan non è ancora uscita. Cerchiamo i primi coach fondatori."
    : "Nurvan non è ancora uscita. Entra nella lista per sapere quando arriva.";
  return '<div class="post-cta"><strong>' + esc(text) + '</strong><a class="btn primary" href="' + cta.href + '">' + esc(cta.label) + "</a></div>";
}
function figureHtml(shot, sizes) {
  if (!shot) return "";
  const s = sizes[shot.file] || { width: 600, height: 1299 };
  return '<figure class="shot solo landing-shot"><img src="/site-assets/shots/' + esc(shot.file) + '" alt="' + esc(shot.alt) + '" width="' + s.width + '" height="' + s.height + '" loading="lazy"></figure>';
}

function compareSections(key) {
  const c = COMPETITORS[key];
  const table = '<div class="table-wrap"><table><thead><tr><th>Aspetto</th><th>' + esc(c.name) + "</th><th>Nurvan</th></tr></thead><tbody>" +
    c.rows.map((r) => "<tr><td>" + esc(r[0]) + "</td><td>" + esc(r[1]) + "</td><td>" + esc(r[2]) + "</td></tr>").join("") + "</tbody></table></div>";
  return [
    { h2: "Prima di confrontare: una cosa va detta", html: "<p>Nurvan non è ancora uscita. " + esc(c.full) + " sì, e questo conta: è uno strumento che puoi aprire oggi, con clienti reali dentro. Questa pagina non vuole convincerti a lasciarlo. Vuole aiutarti a capire se le cose che cerchi stanno in un prodotto o nell’altro, e dirti con franchezza quando conviene restare dove sei.</p>" },
    { h2: "Il confronto, voce per voce", html: table + "<p>Le voci di " + esc(c.name) + " sono quelle che abbiamo letto sulla pagina ufficiale (<a href=\"" + esc(c.url) + "\" rel=\"nofollow noopener\" target=\"_blank\">" + esc(c.url.replace(/^https:\/\//, "")) + "</a>) il " + VERIFIED_ON + ". I prezzi e i piani cambiano: controlla sempre la pagina del produttore prima di decidere. Le voci di Nurvan descrivono funzioni già presenti nella versione in sviluppo e piani previsti, che possono cambiare prima del lancio.</p>" },
    { h2: "Per chi è meglio " + esc(c.name), html: "<p>Scegli " + esc(c.name) + " se:</p><ul>" + c.better.map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul><p>Sono motivi seri, e non abbiamo nessuna ragione per dirti il contrario.</p>" },
    { h2: "Per chi può avere senso Nurvan", html: "<p>Nurvan è pensata per il coach che lavora in Italia e vuole tenere in un’app sola ciò che oggi sta in più posti:</p><ul>" +
      "<li>schede che arrivano già scritte in <strong>Excel, PDF, Word o foto</strong> e vanno trasformate in schede da seguire, senza riscriverle;</li>" +
      "<li>alimentazione e integrazione assegnate allo stesso atleta, con piano, diario e ricettario dentro l’app;</li>" +
      "<li>una <strong>chat privata cifrata</strong>, la videochiamata e i check-in programmati nello stesso posto;</li>" +
      "<li>un’area coach con registro economico manuale, pipeline dei contatti e automazioni, senza dover collegare Stripe;</li>" +
      "<li>prezzi in euro e un’app in italiano, scritta da un personal trainer e coach certificato FIPE.</li></ul>" +
      "<p>Se questo ti somiglia e vuoi influire su come l’app nasce, puoi candidarti come coach fondatore. Se hai bisogno di uno strumento operativo da lunedì, non aspettarci.</p>" },
    { h2: "Come abbiamo verificato i dati", html: "<p>Abbiamo letto la pagina dei prezzi ufficiale di " + esc(c.full) + " il " + VERIFIED_ON + " e riportato solo ciò che c’era scritto. Dove la pagina non era chiara o si contraddiceva, non abbiamo riportato il dato. Nessuna recensione di terzi, nessun logo, nessuna stima. Se trovi un’informazione cambiata o sbagliata, scrivici dalla pagina <a href=\"/contatti\">contatti</a> e la correggiamo.</p><p>Per capire come ragioniamo quando scriviamo di allenamento, leggi <a href=\"/blog/genetica-high-low-responder\">Low responder: quanto conta la genetica nei muscoli</a>. Per un quadro più ampio, anche con i software italiani, leggi la <a href=\"/blog/migliori-software-app-personal-trainer-italia\">guida ai migliori software per personal trainer in Italia</a>. Se vuoi invece capire cosa fa Nurvan, vedi <a href=\"/app-per-personal-trainer\">l’app per personal trainer</a> e il <a href=\"/software-schede-allenamento\">software per schede di allenamento</a>.</p>" }
  ];
}
function compareFaq(key) {
  const c = COMPETITORS[key];
  return [
    { q: "Nurvan è già disponibile come " + c.name + "?", a: "No. Nurvan non è ancora uscita: non c’è niente da scaricare. " + c.full + " invece si può usare oggi." },
    { q: "Quanto costa " + c.name + "?", a: key === "truecoach" ? "Sulla pagina ufficiale letta il " + VERIFIED_ON + " i piani mensili costano 26,34 $ (fino a 5 clienti attivi), 57,99 $ (fino a 20) e 136,99 $ (fino a 50), con 14 giorni di prova. I prezzi possono cambiare." : "I prezzi sono sulla pagina ufficiale. Sulla pagina letta il " + VERIFIED_ON + " lo stesso piano compariva con due cifre diverse, quindi non le riportiamo." },
    { q: "Quanto costerà Nurvan?", a: "I piani previsti sono Coach a 19 € al mese (fino a 20 atleti) e Coach Pro a 39 € al mese (atleti illimitati), con 14 giorni di prova al lancio. Possono cambiare prima dell’uscita." },
    { q: "Posso passare da " + c.name + " a Nurvan?", a: "Se hai le schede in Excel, PDF o Word, o anche in foto, puoi importarle in Nurvan. Non abbiamo un import dedicato dei dati da " + c.name + "." }
  ];
}

export function mountLandings(app, { siteDir, shell, articles }) {
  let sizes = null;
  const shotSizes = async () => {
    if (sizes) return sizes;
    sizes = {};
    const dir = path.join(siteDir, "assets", "shots");
    try { for (const f of await fs.readdir(dir)) sizes[f] = imageSize(await fs.readFile(path.join(dir, f))) || { width: 600, height: 1299 }; } catch (_) { /* default size */ }
    return sizes;
  };
  const send = async (req, res, key, trail, page, ldExtra) => {
    const url = "/" + key;
    res.setHeader("Cache-Control", "public, max-age=300");
    res.status(200).type("html").send(await shell(req, Object.assign({ lang: "it", alternates: { it: url }, landing: true }, page, {
      ld: (origin) => [breadcrumbLd([{ name: "Nurvan", url: origin + "/" }].concat(trail.map(([name, href]) => ({ name, url: origin + href })))), ...ldExtra(origin, url)]
    })));
  };

  const landing = (key) => async (req, res) => {
    const p = PAGES[key];
    const sizesNow = await shotSizes();
    let sections = p.sections; let faq = p.faq; let lead = p.lead; let eyebrow = p.eyebrow; let shot = p.shot;
    if (p.kind === "compare") {
      sections = compareSections(p.competitor); faq = compareFaq(p.competitor); eyebrow = "Confronto";
      lead = "Cerchi un’alternativa a " + COMPETITORS[p.competitor].full + " e ti stai chiedendo se Nurvan fa per te? Qui trovi un confronto senza giri di parole, con la data in cui abbiamo letto ogni dato e l’elenco di chi dovrebbe restare con il concorrente.";
    }
    const main = '<article class="post landing"><div class="wrap narrow">' + crumbsHtml(p.crumbs) +
      '<div class="eyebrow">' + esc(eyebrow) + '</div><h1 class="blog-title">' + esc(p.h1) + '</h1><p class="lead">' + esc(lead) + "</p>" +
      figureHtml(shot, sizesNow) +
      '<div class="prose">' + sections.map((s) => "<h2>" + esc(s.h2).replace(/&amp;/g, "&amp;") + "</h2>" + s.html).join("") + faqHtml(faq) + "</div>" +
      ctaHtml(p.kind) + "</div></article>";
    await send(req, res, key, p.crumbs, { title: p.title, description: p.description, main }, () => [faqLd(faq)]);
  };
  for (const key of Object.keys(PAGES)) app.get("/" + key, landing(key));

  const indexPage = async (req, res) => {
    const cards = Object.keys(TOOLS).map((k) => '<a class="post-card" href="/strumenti/' + k + '"><div class="post-card-body"><div class="eyebrow">Strumento gratuito</div><h3>' + esc(TOOLS[k].name) + "</h3><p>" + esc(TOOL_BLURB[k]) + "</p></div></a>").join("");
    const main = '<section class="blog landing"><div class="wrap">' + crumbsHtml([["Strumenti", "/strumenti"]]) +
      '<div class="head"><div class="eyebrow">Strumenti</div><h1 class="blog-title">' + esc(TOOLS_INDEX.h1) + '</h1><p class="lead">Calcolatori che funzionano nel browser: non chiedono registrazione, non salvano e non inviano nulla di ciò che inserisci.</p></div>' +
      '<h2>I calcolatori</h2><div class="posts">' + cards + "</div>" +
      '<h2>Perché sono gratuiti e senza registrazione</h2><p class="lead">Sono strumenti che servono a chi si allena, e li abbiamo scritti perché li usiamo noi. Il calcolo avviene nel browser: nessun dato viene inviato e nulla viene salvato. Ogni pagina spiega la formula e i suoi limiti.</p>' +
      '<p class="lead" style="margin-top:20px;">Se ti alleni con metodo, guarda anche l’<a href="/app-allenamento-palestra">app per l’allenamento in palestra</a> e quella per il <a href="/app-powerlifting">powerlifting</a>.</p></div></section>';
    await send(req, res, "strumenti", [["Strumenti", "/strumenti"]], { title: TOOLS_INDEX.title, description: TOOLS_INDEX.description, main }, () => []);
  };
  app.get("/strumenti", indexPage);

  const tool = (key) => async (req, res) => {
    const t = TOOLS[key];
    const trail = [["Strumenti", "/strumenti"], [t.name, "/strumenti/" + key]];
    const main = '<article class="post landing"><div class="wrap narrow">' + crumbsHtml(trail) +
      '<div class="eyebrow">Strumento gratuito</div><h1 class="blog-title">' + esc(t.h1) + '</h1><p class="lead">' + esc(t.lead) + "</p>" +
      (t.warning ? '<p class="legal-note"><strong>Attenzione.</strong> ' + esc(t.warning) + "</p>" : "") +
      widgetHtml(key) +
      '<div class="prose">' + t.formula + faqHtml(t.faq) + "</div>" +
      '<p class="tool-wait">Nurvan è un’app di allenamento, alimentazione e coaching, non ancora uscita. <a href="/lista-attesa">Entra nella lista d’attesa →</a></p>' +
      '<p class="tool-wait">Altri strumenti: ' + Object.keys(TOOLS).filter((k) => k !== key).map((k) => '<a href="/strumenti/' + k + '">' + esc(TOOLS[k].name) + "</a>").join(" · ") + ".</p>" +
      '<script src="/site-assets/calc.js?v={{V}}"></script><script>' + widgetScript(key) + "</script></div></article>";
    await send(req, res, "strumenti/" + key, trail, { title: t.title, description: t.description, main }, (origin, url) => [{
      "@context": "https://schema.org", "@type": "WebApplication", name: t.name, url: origin + url, description: t.description,
      applicationCategory: "HealthApplication", operatingSystem: "Any", inLanguage: "it", browserRequirements: "Requires JavaScript",
      isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "EUR" },
      provider: { "@id": origin + "/#organization" }
    }, faqLd(t.faq)]);
  };
  for (const key of Object.keys(TOOLS)) app.get("/strumenti/" + key, tool(key));

  return {
    paths: ALL_PATHS,
    // For the sitemap: [{ path, lastmod }].
    entries: async () => ALL_PATHS.map((p) => ({ path: p, lastmod: LASTMOD }))
  };
}

/* ----------------------------- the tool forms ---------------------------- */

const field = (id, label, inner) => '<label class="tf" for="' + id + '"><span>' + label + "</span>" + inner + "</label>";
const num = (id, label, attrs) => field(id, label, '<input id="' + id + '" type="number" inputmode="decimal" step="any" ' + (attrs || "") + ">");
const sel = (id, label, opts) => field(id, label, '<select id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '">' + t + "</option>").join("") + "</select>");

function widgetHtml(key) {
  let form = "";
  if (key === "calcolatore-1rm") {
    form = num("w", "Peso sollevato (kg)", 'min="1" value="100"') + num("r", "Ripetizioni (1–12)", 'min="1" max="12" step="1" value="5"');
  } else if (key === "calcolatore-wilks-ipf-gl") {
    form = sel("sex", "Categoria di confronto", [["m", "Maschile"], ["f", "Femminile"]]) + num("bw", "Peso corporeo (kg)", 'min="35" value="83"') + num("tot", "Totale o panca (kg)", 'min="1" value="500"') +
      sel("eq", "Attrezzatura (IPF GL)", [["raw", "Classic (raw)"], ["single", "Equipaggiato (singolo strato)"]]) + sel("ev", "Gara (IPF GL)", [["sbd", "Totale (squat, panca, stacco)"], ["bench", "Solo panca"]]);
  } else {
    form = sel("sex", "Sesso", [["m", "Uomo"], ["f", "Donna"], ["n", "Non binario"]]) + num("age", "Età (anni)", 'min="18" max="90" value="30"') + num("h", "Altezza (cm)", 'min="120" max="230" value="175"') + num("w", "Peso (kg)", 'min="30" max="300" value="75"') +
      sel("act", "Attività", [["sedentary", "Sedentario (ufficio, poco movimento)"], ["light", "Leggera (1-3 allenamenti a settimana)"], ["moderate", "Moderata (3-5 allenamenti)"], ["high", "Alta (6-7 allenamenti)"], ["extreme", "Molto alta (lavoro fisico e allenamenti)"]]) +
      sel("goal", "Obiettivo", [["cut", "Dimagrire"], ["maintain", "Mantenere"], ["bulk", "Aumentare"]]);
  }
  return '<form class="tool" onsubmit="return false" aria-label="Calcolatore"><div class="tool-grid">' + form + '</div><div id="out" class="tool-out" role="status" aria-live="polite"></div></form>';
}

// Written in plain ES5 and without the characters that need escaping here.
function widgetScript(key) {
  const head = "var C=window.NurvanCalc,$=function(i){return document.getElementById(i)},out=$('out'),f1=function(n,d){return n.toLocaleString('it-IT',{maximumFractionDigits:d==null?1:d,minimumFractionDigits:d==null?1:d})};" +
    "function esc(t){return String(t).replace(/[&<>]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;'}[c]})}";
  const wire = "Array.prototype.forEach.call(document.querySelectorAll('.tool input,.tool select'),function(e){e.addEventListener('input',run);e.addEventListener('change',run)});run();";
  if (key === "calcolatore-1rm") {
    return head + "function run(){var r=C.oneRm($('w').value,$('r').value);if(!r){out.textContent='Inserisci un peso e da 1 a 12 ripetizioni.';return}" +
      "var avg=(r.epley+r.brzycki)/2;var t=C.percentTable(avg).map(function(x){return '<tr><td>'+x.percent+'%</td><td>'+f1(x.kg,1)+' kg</td></tr>'}).join('');" +
      "out.innerHTML='<p>Epley: <strong>'+f1(r.epley)+' kg</strong><br>Brzycki: <strong>'+f1(r.brzycki)+' kg</strong></p><p>Media delle due: <strong>'+f1(avg)+' kg</strong></p>" +
      "<div class=\"table-wrap\"><table><thead><tr><th>% del massimale</th><th>Carico (media)</th></tr></thead><tbody>'+t+'</tbody></table></div>'}" + wire;
  }
  if (key === "calcolatore-wilks-ipf-gl") {
    return head + "function run(){var s=$('sex').value,bw=parseFloat($('bw').value),t=parseFloat($('tot').value);var w=C.wilks(s,bw,t),g=C.goodlift(s,$('eq').value,$('ev').value,bw,t);" +
      "if(w===null){out.textContent='Inserisci peso corporeo e totale.';return}" +
      "out.innerHTML='<p>Punti Wilks: <strong>'+f1(w,2)+'</strong></p><p>Punti IPF GL: <strong>'+(g===null?'non definiti sotto i 35 kg':f1(g,2))+'</strong></p>'}" + wire;
  }
  return head + "function run(){var m=C.macros({sex:$('sex').value,age:$('age').value,height:$('h').value,weight:$('w').value,activity:$('act').value,goal:$('goal').value});" +
    "if(!m){out.textContent='Controlla i valori: età 18-90 anni, altezza 120-230 cm, peso 30-300 kg.';return}" +
    "out.innerHTML='<p>Metabolismo basale: <strong>'+f1(m.bmr,0)+' kcal</strong><br>Fabbisogno giornaliero: <strong>'+f1(m.tdee,0)+' kcal</strong></p>" +
    "<p>Obiettivo: <strong>'+f1(m.kcal,0)+' kcal al giorno</strong></p><p>Proteine <strong>'+f1(m.protein,0)+' g</strong> · Carboidrati <strong>'+f1(m.carbs,0)+' g</strong> · Grassi <strong>'+f1(m.fat,0)+' g</strong></p>" +
    "<p class=\"note\">Stima generica, non un consiglio medico.</p>'}" + wire;
}
