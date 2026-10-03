// Brief W4: the landing pages, the comparisons and the free tools of the Italian
// site. The formulas of the tools are checked against numbers worked out by
// hand; the pages against the brief (one H1, unique title and description,
// FAQ in the page and in JSON-LD, one primary button, links, no promise the
// app is out, no reviews or stars, every competitor datum with its source).
import fs from 'node:fs';
import vm from 'node:vm';
import http from 'node:http';
import express from 'express';
import { mountLandings, ALL_PATHS, LANDING_PATHS, wordCount } from './server/site/landings.mjs';
import { PAGES, TOOLS, COMPETITORS } from './server/site/landings-content.mjs';
import { collectEntries } from './server/site/sitemap.mjs';
import { loadArticles } from './server/site/blog.mjs';
import { softwareLd } from './server/site/seo.mjs';

let failed = 0;
function ok(value, message) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const near = (a, b, tol = 0.01) => Math.abs(a - b) <= tol;

// ---- 1. the formulas
const ctx = {};
vm.runInNewContext(fs.readFileSync('site/assets/calc.js', 'utf8'), ctx);
const C = ctx.NurvanCalc;
const r5 = C.oneRm(100, 5);
ok(near(r5.epley, 100 * (1 + 5 / 30)) && near(r5.epley, 116.67) && near(r5.brzycki, 112.5), '1a. 1RM: 100 kg x 5 = 116,67 (Epley) e 112,5 (Brzycki)');
const r1 = C.oneRm(140, 1);
ok(r1.epley === 140 && r1.brzycki === 140, '1b. 1RM con una sola ripetizione = il peso');
const r10 = C.oneRm(60, 10);
ok(near(r10.epley, 80) && near(r10.brzycki, 60 * 36 / 27), '1c. 1RM: 60 kg x 10 = 80 (Epley) e 80 (Brzycki)');
ok(C.oneRm(100, 13) === null && C.oneRm(0, 5) === null && C.oneRm(100, 0) === null, '1d. fuori da 1-12 ripetizioni o peso nullo: nessun risultato');
const tab = C.percentTable(200);
ok(tab[0].kg === 200 && tab.find((x) => x.percent === 80).kg === 160 && tab.find((x) => x.percent === 85).kg === 170 && tab.find((x) => x.percent === 95).kg === 190, '1e. tabella percentuali: 200 kg -> 80% 160, 85% 170, 95% 190');
// Wilks by hand, men, 100 kg: 500 / (a + b*100 + c*100^2 + d*100^3 + e*100^4 + f*100^5)
const den = -216.0475144 + 16.2606339 * 100 - 0.002388645 * 1e4 - 0.00113732 * 1e6 + 7.01863e-06 * 1e8 - 1.291e-08 * 1e10;
ok(near(C.wilksCoefficient('m', 100), 500 / den, 1e-9) && near(C.wilksCoefficient('m', 100), 0.6086, 0.0005), '1f. Wilks uomini 100 kg: coefficiente 0,6086');
ok(near(C.wilks('m', 100, 600), 600 * 500 / den, 1e-6) && C.wilks('m', 80, 600) > C.wilks('m', 120, 600), '1g. Wilks: il totale pesa di più per chi è più leggero');
const gl = 700 * 100 / (1199.72839 - 1025.18162 * Math.exp(-0.00921 * 93));
ok(near(C.goodlift('m', 'raw', 'sbd', 93, 700), gl, 1e-9) && near(gl, 91.57, 0.01), '1h. IPF GL uomini classic, 93 kg, totale 700: 91,57');
const glf = 400 * 100 / (610.32796 - 1045.59282 * Math.exp(-0.03048 * 63));
ok(near(C.goodlift('f', 'raw', 'sbd', 63, 400), glf, 1e-9) && near(glf, 87.51, 0.01), '1i. IPF GL donne classic, 63 kg, totale 400: 87,51');
ok(C.goodlift('m', 'raw', 'sbd', 30, 500) === null && C.goodlift('x', 'raw', 'sbd', 80, 500) === null && C.wilks('m', 0, 500) === null, '1j. IPF GL sotto 35 kg o sesso sconosciuto: nessun risultato');
const glb = C.goodlift('m', 'single', 'bench', 90, 200);
ok(near(glb, 200 * 100 / (381.22073 - 733.79378 * Math.exp(-0.02398 * 90)), 1e-9), '1k. IPF GL equipaggiato, solo panca, usa le sue costanti');
const mac = C.macros({ sex: 'm', weight: 80, height: 180, age: 30, activity: 'moderate', goal: 'maintain' });
ok(mac.bmr === 1780 && mac.tdee === Math.round(1780 * 1.55) && mac.kcal === 2760 && mac.protein === 144 && mac.fat === 77 && mac.carbs === 373, '1l. macro: uomo 80 kg 180 cm 30 anni moderato, mantenere: BMR 1780, 2760 kcal, P 144 / G 77 / C 373');
const macf = C.macros({ sex: 'f', weight: 60, height: 165, age: 28, activity: 'light', goal: 'cut' });
ok(macf.bmr === Math.round(600 + 1031.25 - 140 - 161) && macf.kcal === Math.round(macf.tdee * 0.85 / 10) * 10 && macf.protein === 120, '1m. macro: donna in dimagrimento, -15% e 2 g/kg di proteine');
ok(C.macros({ sex: 'm', weight: 80, height: 180, age: 12, activity: 'moderate', goal: 'cut' }) === null && C.macros({ sex: 'm', weight: 80, height: 180, age: 30, activity: 'x', goal: 'cut' }) === null, '1n. macro: età o attività fuori scala, nessun risultato');

// ---- 2. the pages
const pages = [];
const app = express();
mountLandings(app, { siteDir: 'site', shell: async (req, page) => { pages.push(Object.assign({ path: req.path }, page)); return '<html><body>' + page.main + '</body></html>'; } });
const server = http.createServer(app);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;
const articles = await loadArticles({ contentDir: 'content/articles', siteDir: 'site/blog' }, new Date(), 'it');
// Only articles that are in the repository count: a link to a file that exists on this disk but is not committed is a 404 on the site.
import { execSync } from 'node:child_process';
const tracked = execSync('git ls-files content/articles', { encoding: 'utf8' }).split('\n').filter((f) => /article\.it\.md$/.test(f));
const slugs = new Set(tracked.map((f) => (/^slug:\s*(\S+)/m.exec(fs.readFileSync(f, 'utf8')) || [])[1]).filter(Boolean));
slugs.add('migliori-software-app-personal-trainer-italia');
const html = {};
try {
  for (const p of ALL_PATHS) {
    const res = await fetch(base + p);
    html[p] = await res.text();
    ok(res.status === 200, '2a. ' + p + ' risponde 200');
  }
  const pageOf = (p) => pages.find((x) => x.path === p);
  const titles = new Set(); const descs = new Set();
  for (const p of ALL_PATHS) {
    const pg = pageOf(p);
    const h1 = (html[p].match(/<h1\b/g) || []).length;
    ok(h1 === 1, '2b. ' + p + ': un solo H1');
    ok(pg.title.length >= 30 && pg.title.length <= 65 && pg.description.length >= 90 && pg.description.length <= 165, '2c. ' + p + ': titolo ' + pg.title.length + ' e descrizione ' + pg.description.length + ' caratteri nei limiti');
    titles.add(pg.title); descs.add(pg.description);
    ok(pg.alternates && Object.keys(pg.alternates).join() === 'it' && pg.alternates.it === p && pg.lang === 'it', '2d. ' + p + ': solo la versione italiana, canonica su sé stessa, nessun hreflang inesistente');
    const ld = pg.ld('https://nurvan.app');
    const crumbs = ld.find((o) => o['@type'] === 'BreadcrumbList');
    ok(crumbs && crumbs.itemListElement[0].item === 'https://nurvan.app/' && crumbs.itemListElement.at(-1).item === 'https://nurvan.app' + p, '2e. ' + p + ': BreadcrumbList fino alla pagina');
    ok(!/AggregateRating|"ratingValue"|reviewCount/.test(JSON.stringify(ld)), '2f. ' + p + ': nessuna valutazione nel JSON-LD');
    ok(!/App Store|Google Play|\bscarica(ci|re|la)?\b|download|★|recensioni|utenti attivi/i.test(html[p].replace(/<script[\s\S]*?<\/script>/g, '').replace(/niente da scaricare/g, '')), '2g. ' + p + ': nessun badge, download, stella o contatore');
    const imgs = [...html[p].matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
    ok(imgs.every((i) => /alt="[^"]{8,}"/.test(i) && /width="\d+"/.test(i) && /height="\d+"/.test(i) && /loading="lazy"/.test(i)), '2h. ' + p + ': immagini con alt descrittivo, dimensioni e lazy');
    ok(!/href="\/(?:it|en)\//.test(html[p]) && (html[p].match(/<h2/g) || []).length >= 2, '2i. ' + p + ': titoli H2 e nessun link a versioni non italiane');
  }
  ok(titles.size === ALL_PATHS.length && descs.size === ALL_PATHS.length, '2j. titoli e descrizioni tutti diversi');

  for (const p of LANDING_PATHS) {
    const pg = pageOf(p); const ld = pg.ld('https://nurvan.app');
    const faq = ld.find((o) => o['@type'] === 'FAQPage');
    const words = wordCount(pg.main);
    ok(words >= 600 && words <= 900, '3a. ' + p + ': ' + words + ' parole (600-900)');
    ok(faq && faq.mainEntity.length >= 4 && faq.mainEntity.length <= 6 && faq.mainEntity.every((q) => html[p].includes('<summary>' + q.name.replace(/&/g, '&amp;').replace(/'/g, '&#39;') + '</summary>')), '3b. ' + p + ': 4-6 domande, le stesse che si vedono nella pagina');
    ok((html[p].match(/class="btn primary"/g) || []).length === 1 && /post-cta/.test(html[p]), '3c. ' + p + ': un solo pulsante primario');
    const blog = [...html[p].matchAll(/href="\/blog\/([a-z0-9-]+)"/g)].map((m) => m[1]);
    ok(new Set(blog).size >= 2 && blog.every((s) => slugs.has(s) || s === 'migliori-software-app-personal-trainer-italia'), '3d. ' + p + ': almeno 2 articoli del blog, tutti esistenti (' + new Set(blog).size + ')');
    const lands = new Set([...html[p].matchAll(/href="(\/(?:app-|software-|alternativa-|strumenti|hyrox)[a-z0-9\/-]*)"/g)].map((m) => m[1]).filter((h) => h !== p));
    ok(lands.size >= 1 && [...lands].every((h) => h === '/hyrox' || ALL_PATHS.includes(h)), '3e. ' + p + ': collegamenti ad altre pagine del sito, tutti esistenti');
  }
  ok(/href="\/lista-attesa#coach"/.test(html['/app-per-personal-trainer']) && /href="\/lista-attesa#coach"/.test(html['/software-schede-allenamento']) && /href="\/lista-attesa"/.test(html['/app-powerlifting']) && /href="\/lista-attesa"/.test(html['/app-allenamento-hyrox']), '3f. coach: candidatura coach fondatore; atleti: lista d’attesa');
  ok(/non è ancora uscita/i.test(html['/app-per-personal-trainer']) && /non è ancora uscita/i.test(html['/app-allenamento-palestra']), '3g. le pagine dicono che l’app non è ancora uscita');
  ok(/Excel, PDF, Word/.test(html['/software-schede-allenamento']) && /RIR/.test(html['/app-allenamento-palestra']) && /Epley|1RM/.test(html['/strumenti/calcolatore-1rm']), '3h. le funzioni citate sono quelle del progetto (import Excel/PDF/Word/foto, RIR)');
  ok(/dal 2018/.test(html['/app-powerlifting']) && /HYROX è un marchio registrato/.test(html['/app-allenamento-hyrox']), '3i. powerlifting dal 2018; HYROX dichiarato marchio altrui');

  // comparisons
  for (const key of ['trainerize', 'truecoach']) {
    const p = '/alternativa-a-' + key; const c = COMPETITORS[key];
    ok(/Per chi è meglio/.test(html[p]) && /<table>/.test(html[p]) && html[p].includes('3 ottobre 2026') && html[p].includes(c.url.replace(/^https:\/\//, '')), '4a. ' + p + ': tabella, "Per chi è meglio il concorrente", data e fonte');
    ok(!/<img\b/.test(html[p]) && !/logo/i.test(html[p].replace(/nessun logo/g, '')), '4b. ' + p + ': nessun logo del concorrente');
  }
  ok(/26,34/.test(html['/alternativa-a-truecoach']) && !/\$ al mese/.test(html['/alternativa-a-trainerize'].replace(/\d+,\d+ \$ al mese/g, '')) && !/\b9\s*\$|\b10\s*\$|\$\s?9\b|\$\s?10\b/.test(html['/alternativa-a-trainerize']), '4c. TrueCoach: prezzi dalla pagina ufficiale; Trainerize: nessun prezzo (la pagina si contraddice)');
  const content = fs.readFileSync('server/site/landings-content.mjs', 'utf8');
  ok(Object.values(COMPETITORS).every((c) => content.includes(c.url) && new RegExp(c.url.replace(/[.\/?]/g, '\\$&') + '[\\s\\S]{0,40}').test(content)) && (content.match(/2026-10-03/g) || []).length >= 3 && /Fitnessitaly/.test(content), '4d. ogni dato dei concorrenti ha nel codice fonte e data di verifica');

  // tools
  for (const key of Object.keys(TOOLS)) {
    const p = '/strumenti/' + key; const pg = pageOf(p); const ld = pg.ld('https://nurvan.app');
    const web = ld.find((o) => o['@type'] === 'WebApplication');
    ok(web && web.isAccessibleForFree === true && web.offers.price === '0' && !web.aggregateRating, '5a. ' + p + ': WebApplication gratuita, senza valutazioni');
    ok(/Come si calcola/.test(html[p]) && /nessun dato viene inviato/.test(html[p]) && /\/site-assets\/calc\.js/.test(html[p]) && /lista-attesa/.test(html[p]), '5b. ' + p + ': formula spiegata, nessun dato inviato, script del calcolo e invito discreto alla lista');
    ok((html[p].match(/<details>/g) || []).length >= 3 && !/class="btn primary"/.test(html[p]), '5c. ' + p + ': domande frequenti e nessun pulsante primario');
  }
  ok(/non è un consiglio medico/.test(html['/strumenti/calcolatore-macro']) && /legal-note/.test(html['/strumenti/calcolatore-macro']), '5d. il calcolatore macro avvisa che non è un consiglio medico');

  // sitemap
  const entries = await collectEntries({ articles: async (l) => loadArticles({ contentDir: 'content/articles', siteDir: 'site/blog' }, new Date(), l), events: [], siteDir: 'site', webDir: 'web' });
  const itOnly = entries.filter((e) => Object.keys(e.urls).join() === 'it' && ALL_PATHS.includes(e.urls.it));
  ok(itOnly.length === ALL_PATHS.length && itOnly.every((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.lastmod)), '6a. tutte le pagine nuove sono in sitemap, solo in italiano, con lastmod');
  const guide = entries.find((e) => e.urls.it === '/blog/migliori-software-app-personal-trainer-italia');
  ok(guide && Object.keys(guide.urls).join() === 'it', '6b. la guida ai software è in sitemap solo in italiano');
  const en = await loadArticles({ contentDir: 'content/articles', siteDir: 'site/blog' }, new Date(), 'en');
  ok(!en.some((a) => a.slug === 'migliori-software-app-personal-trainer-italia') && articles.some((a) => a.slug === 'migliori-software-app-personal-trainer-italia'), '6c. la guida non compare nel blog delle altre lingue');

  // home, nav, footer, schema
  const api = fs.readFileSync('coach-api.mjs', 'utf8');
  ok(/Nurvan – App di allenamento, nutrizione e coaching/.test(api) && /app di allenamento<\/strong>/.test(api) && /app per personal trainer e coach<\/strong>/.test(api) && /Per chi è Nurvan/.test(api) && /href="\/app-per-personal-trainer"/.test(api) && /href="\/app-allenamento-palestra"/.test(api), '7a. home: titolo, lead con le due espressioni e blocco "Per chi è Nurvan" con due schede');
  const descIt = /description: it \? "([^"]+)"/.exec(api)[1];
  ok(descIt.length >= 140 && descIt.length <= 160 && /lista d’attesa/.test(descIt), '7b. descrizione della home di ' + descIt.length + ' caratteri');
  ok(/<h1>Allenati con metodo\./.test(fs.readFileSync('site/home.html', 'utf8')), '7c. l’H1 della home non cambia');
  ok(/NAV_EXTRA: lang === "it"/.test(api) && /FOOT_EXTRA: lang === "it"/.test(api) && /Per i coach/.test(api) && /Per gli atleti/.test(api) && /Strumenti/.test(api), '7d. menu e piè di pagina: Per i coach, Per gli atleti, Strumenti (solo italiano)');
  const sw = softwareLd('https://nurvan.app', 'D');
  ok(sw.offers.availability === 'https://schema.org/PreOrder' && !sw.aggregateRating, '7e. SoftwareApplication in prevendita, senza valutazione');
  ok(/mountLandings\(app/.test(api), '7f. le pagine sono montate');
} finally { server.close(); }

console.log('');
if (failed) { console.log(failed + ' controlli su landing e strumenti falliti.'); process.exit(1); }
console.log('Tutti i controlli su landing e strumenti passano.');
