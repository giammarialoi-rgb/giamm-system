// The site pages of "Salute e recupero": every page, in every language, opens
// with the whole notice, carries the studies with their identifiers, and is
// translated; and they are found by the sitemap and from the footer and home.
import fs from 'node:fs';
import http from 'node:http';
import express from 'express';
import { mountWellbeing, wellbeingPath, loadWellbeing } from './server/site/wellbeing.mjs';
import { translateHtml, siteDict, SITE_LANGS, pageTexts } from './server/site/i18n.mjs';
import { collectEntries } from './server/site/sitemap.mjs';
import { loadArticles } from './server/site/blog.mjs';

let failed = 0;
function ok(value, message) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

const pages = [];
const app = express();
const shell = async (req, page) => { pages.push(page); return '<html><head><title>' + page.title + '</title></head><body>' + translateHtml(page.main, await siteDict('site', page.lang)) + '</body></html>'; };
mountWellbeing(app, { root: '.', siteDir: 'site', shell });
const server = http.createServer(app);
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = 'http://127.0.0.1:' + server.address().port;
const { W, REFS } = await loadWellbeing('.');
const e = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

try {
  const keys = ['hub', 'posture', 'postpartum', 'labour'];
  const html = {};
  for (const k of keys) html[k] = await (await fetch(base + wellbeingPath(k, 'it'))).text();
  ok(keys.every((k) => html[k].length > 3000), '1a. le quattro pagine rispondono in italiano');
  ok(keys.every((k) => html[k].includes('Avvertenza') && html[k].includes(W.DISCLAIMER[0].replace(/'/g, '&#39;')) && html[k].includes('Nurvan non fa diagnosi')), '1b. ognuna apre con l’avvertenza intera');
  ok(W.POSTURE.every((t) => html.posture.includes('id="' + t.id + '"') && html.posture.includes(e(t.label))), '1c. la pagina postura ha i dodici problemi, con il loro indirizzo interno');
  const cited = new Set(W.POSTURE.flatMap((t) => t.sources.flatMap((s) => s.r)));
  ok([...cited].every((id) => REFS[id] && html.posture.includes(REFS[id].url.replace(/&/g, '&amp;'))), '1d. ogni studio citato ha il suo collegamento (PubMed o sito ufficiale)');
  ok(/PMID 23580420/.test(html.posture) && /data-notr/.test(html.posture), '1e. la citazione è com’è stata pubblicata, con il PMID, e non viene tradotta');
  ok(W.POSTURE.every((t) => t.notProven.every((n) => html.posture.includes(n.replace(/'/g, '&#39;').replace(/«/g, '«')))), '1f. per ogni problema c’è cosa non è dimostrato');
  ok(/le fasi/i.test(html.postpartum) && W.DELIVERIES.every((d) => html.postpartum.includes(d.label.replace(/'/g, '&#39;'))) && W.URGENT.every((u) => html.postpartum.includes(u)), '1g. dopo il parto: fasi, tipi di parto e segnali per cui si chiama');
  ok(W.LABOUR_GUIDE.every((g) => html.labour.includes(e(g.title))) && /le stesse per tutte/.test(html.labour), '1h. travaglio: i nove momenti e il messaggio che in sala parto le indicazioni sono le stesse per tutte');
  ok(!/guarisc|garantisc/i.test(Object.values(html).join(' ')), '1i. nessuna promessa di guarigione o garanzia');

  for (const l of SITE_LANGS.filter((x) => x !== 'it')) {
    const bad = [];
    for (const k of keys) {
      const res = await fetch(base + wellbeingPath(k, l));
      const text = await res.text();
      if (res.status !== 200) bad.push(k + ' ' + res.status);
      const dict = await siteDict('site', l);
      const missing = pageTexts(pages[pages.length - 1].main).filter((t) => !(t in dict) && /[A-Za-zÀ-ÿ]{3,}/.test(t));
      if (missing.length) bad.push(k + ': ' + missing.length + ' testi non tradotti, es. «' + missing[0].slice(0, 60) + '»');
      if (!text.includes('<title>')) bad.push(k + ' senza titolo');
    }
    ok(bad.length === 0, '2. ' + l + ': quattro pagine, tutti i testi tradotti ' + bad.join(' | '));
  }
  const last = pages.filter((p) => p.lang === 'de' && p.alternates);
  ok(SITE_LANGS.every((l) => last[0].alternates[l] === wellbeingPath('hub', l)) && wellbeingPath('posture', 'it') === '/postura' && wellbeingPath('posture', 'de') === '/de/posture' && wellbeingPath('labour', 'it') === '/travaglio-e-parto', '3a. gli hreflang sono reciproci su tutte le lingue; indirizzi italiani e inglesi');
  const ld = last[0].ld('https://nurvan.app');
  ok(ld[0]['@type'] === 'BreadcrumbList' && ld[0].itemListElement.length === 2, '3b. breadcrumb per la pagina');
  ok(pages.every((p) => p.title && p.description && p.description.length > 80), '3c. ogni pagina ha titolo e descrizione');
  const entries = await collectEntries({ articles: async (l) => loadArticles({ contentDir: 'content/articles', siteDir: 'site/blog' }, new Date(), l), events: [], siteDir: 'site', webDir: 'web' });
  const flat = entries.flatMap((e) => Object.values(e.urls));
  ok(SITE_LANGS.every((l) => keys.every((k) => flat.includes(wellbeingPath(k, l)))), '3d. la sitemap ha le quattro pagine in ogni lingua');
  const shellHtml = fs.readFileSync('site/shell.html', 'utf8');
  const home = fs.readFileSync('site/home.html', 'utf8');
  ok(/href="\{\{HEALTH\}\}">Salute e recupero</.test(shellHtml) && /href="\{\{HEALTH\}\}">Scopri come funziona/.test(home), '3e. dal piè di pagina e dalla home si arriva alla sezione');
  ok(/mountWellbeing\(app, \{ root: __dirname/.test(fs.readFileSync('coach-api.mjs', 'utf8')) && /HEALTH: wellbeingPath\("hub", lang\)/.test(fs.readFileSync('coach-api.mjs', 'utf8')), '3f. le pagine sono montate e il segnaposto del piè di pagina è riempito');
} finally { server.close(); }

console.log('');
if (failed) { console.log(failed + ' controlli del sito su salute e recupero falliti.'); process.exit(1); }
console.log('Tutti i controlli del sito su salute e recupero passano.');
