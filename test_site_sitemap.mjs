// robots.txt, sitemap.xml and the one-address-per-page rules of the site.
// The sitemap is built from the real articles of content/articles and from a
// copy of them with one more article added, to see that a new article gets in
// with nothing else to do.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import express from 'express';
import { mountSitemap, collectEntries, renderUrlset, renderIndex, countUrls, robotsTxt } from './server/site/sitemap.mjs';
import { loadArticles } from './server/site/blog.mjs';
import { canonicalPath, canonicalUrls } from './server/site/urls.mjs';
import { SITE_LANGS } from './server/site/i18n.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const ORIGIN = 'https://nurvan.app';
const events = [{ id: 'roma-2099', city: 'Roma', start: '2099-05-01', end: '2099-05-02' }, { id: 'passata', city: 'Vecchia', start: '2020-01-01' }];
const calendar = async () => ({ events });

// The articles as the blog reads them, without its minute of cache.
const read = (dir) => async (lang) => loadArticles({ contentDir: dir, siteDir: 'site/blog' }, new Date(), lang);
const realDir = 'content/articles';
const real = await collectEntries({ articles: read(realDir), events, siteDir: 'site', webDir: 'web' });
const xml = renderUrlset(real, ORIGIN);

// --- the file ----------------------------------------------------------------
ok('1a. robots.txt lascia tutto aperto e indica la sitemap', robotsTxt(ORIGIN) === 'User-agent: *\nAllow: /\n\nSitemap: https://nurvan.app/sitemap.xml\n');
ok('1b. XML con il namespace xhtml, un blocco url ciascuno', /^<\?xml version="1.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9" xmlns:xhtml="http:\/\/www\.w3\.org\/1999\/xhtml">/.test(xml) && /<\/urlset>\n$/.test(xml));
const blocks = xml.split('<url>').slice(1);
ok('1c. ogni url ha loc, lastmod in formato data e x-default', blocks.length > 100 && blocks.every((b) => /<loc>https:\/\/nurvan\.app[^<]*<\/loc>/.test(b) && /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(b) && /hreflang="x-default"/.test(b)));
ok('1d. gli hreflang sono reciproci: se A indica B, B indica A con lo stesso blocco', (() => {
  const alt = (b) => [...b.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((m) => m[1] + '=' + m[2]).join('|');
  const byLoc = new Map(blocks.map((b) => [/<loc>([^<]+)</.exec(b)[1], alt(b)]));
  return blocks.every((b) => [...b.matchAll(/hreflang="([a-z]{2})" href="([^"]+)"/g)].every((m) => byLoc.get(m[2]) === alt(b)));
})());
ok('1e. c’è almeno un indirizzo per ogni lingua, home e blog compresi', SITE_LANGS.every((l) => real.some((e) => e.urls[l]) && xml.includes('<loc>' + ORIGIN + (l === 'it' ? '/' : '/' + l) + '</loc>') && xml.includes('<loc>' + ORIGIN + (l === 'it' ? '' : '/' + l) + '/blog</loc>')));
ok('1f. ci sono allenamenti, HYROX (solo gare future), lista d’attesa', xml.includes('/allenamenti/ipertrofia-3-giorni') && xml.includes('/en/allenamenti/casa-corpo-libero') && xml.includes('/hyrox/roma-2099') && !xml.includes('/hyrox/passata') && xml.includes(ORIGIN + '/lista-attesa') && xml.includes(ORIGIN + '/de/waitlist'));
const articles = (await read(realDir)('it'));
ok('1g. ogni articolo pubblicato è nella sitemap, in ogni lingua in cui è scritto', articles.length > 0 && articles.every((a) => xml.includes('<loc>' + ORIGIN + '/blog/' + a.slug + '</loc>')) && (await Promise.all(SITE_LANGS.map(async (l) => (await read(realDir)(l)).filter((a) => a.lang === l).every((a) => xml.includes('<loc>' + ORIGIN + (l === 'it' ? '' : '/' + l) + '/blog/' + a.slug + '</loc>'))))).every(Boolean));
ok('1h. un articolo ha nei suoi hreflang le versioni vere, e la data è quella dell’articolo', (() => {
  const a = articles.find((x) => x.slug === 'genetica-high-low-responder');
  const b = blocks.find((x) => x.includes('<loc>' + ORIGIN + '/blog/genetica-high-low-responder</loc>'));
  return !!a && !!b && b.includes('<lastmod>' + a.date + '</lastmod>') && b.includes('hreflang="en" href="' + ORIGIN + '/en/blog/genetics-high-low-responders"') && b.includes('hreflang="x-default" href="' + ORIGIN + '/blog/genetica-high-low-responder"');
})());
ok('1i. le pagine legali ci sono solo sul dominio del sito; nessuna dell’app e nessuna pagina d’errore', xml.includes('<loc>' + ORIGIN + '/privacy</loc>') && xml.includes('<loc>' + ORIGIN + '/en/termini</loc>') && !/app\.nurvan|elimina-account|verifica-email|reimposta-password/.test(xml));
ok('1j. gli indirizzi non hanno doppi slash né spazi, e non si ripetono', (() => { const locs = blocks.map((b) => /<loc>([^<]+)</.exec(b)[1]); return locs.every((l) => !/\s|\/\/(?!nurvan)/.test(l.replace('https://', ''))) && new Set(locs).size === locs.length; })());

// --- a new article gets in with nothing else to do -----------------------------
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'articles-'));
  try {
    for (const name of fs.readdirSync(realDir).filter((n) => !n.startsWith('_'))) {
      const from = path.join(realDir, name);
      if (!fs.statSync(from).isDirectory()) continue;
      fs.mkdirSync(path.join(tmp, name));
      for (const f of fs.readdirSync(from)) if (/^article\..*\.md$/.test(f)) fs.copyFileSync(path.join(from, f), path.join(tmp, name, f));
    }
    const before = renderUrlset(await collectEntries({ articles: read(tmp), events, siteDir: 'site', webDir: 'web' }), ORIGIN);
    fs.mkdirSync(path.join(tmp, '2026-10-03-articolo-di-prova'));
    fs.writeFileSync(path.join(tmp, '2026-10-03-articolo-di-prova', 'article.it.md'), '---\ntitle: "Articolo di prova"\nslug: articolo-di-prova\ndate: 2026-10-03\nupdated: 2026-10-04\nlang: it\ncategory: allenamento\n---\nTesto di prova.\n');
    fs.writeFileSync(path.join(tmp, '2026-10-03-articolo-di-prova', 'article.en.md'), '---\ntitle: "Test article"\nslug: test-article\ndate: 2026-10-03\nlang: en\ncategory: allenamento\n---\nTest text.\n');
    const after = renderUrlset(await collectEntries({ articles: read(tmp), events, siteDir: 'site', webDir: 'web', now: new Date('2026-10-05') }), ORIGIN);
    ok('2a. l’articolo nuovo non c’era e ora c’è, in italiano e in inglese, con la sua data di revisione', !before.includes('articolo-di-prova') && after.includes('<loc>' + ORIGIN + '/blog/articolo-di-prova</loc>') && after.includes('<loc>' + ORIGIN + '/en/blog/test-article</loc>') && /articolo-di-prova<\/loc>\s*<lastmod>2026-10-04<\/lastmod>/.test(after));
    ok('2b. e si lega alla versione inglese con hreflang', /articolo-di-prova<\/loc>[\s\S]*?hreflang="en" href="https:\/\/nurvan\.app\/en\/blog\/test-article"/.test(after));
    const future = fs.readdirSync(tmp).length;
    fs.writeFileSync(path.join(tmp, '2026-10-03-articolo-di-prova', 'article.it.md'), fs.readFileSync(path.join(tmp, '2026-10-03-articolo-di-prova', 'article.it.md'), 'utf8').replace('date: 2026-10-03', 'date: 2999-01-01').replace('updated: 2026-10-04\n', ''));
    ok('2c. un articolo con data futura (non ancora pubblicato) non c’è', future > 0 && !renderUrlset(await collectEntries({ articles: read(tmp), events, siteDir: 'site', webDir: 'web' }), ORIGIN).includes('/blog/articolo-di-prova'));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// --- over 1000 addresses: an index, one sitemap per language ------------------
{
  const big = real.concat(Array.from({ length: 120 }, (_, i) => ({ urls: Object.fromEntries(SITE_LANGS.map((l) => [l, '/' + l + '/x' + i])), lastmod: '2026-10-01' })));
  ok('3a. sopra le 1000 si passa all’indice con una sitemap per lingua', countUrls(big) > 1000 && countUrls(real) <= 1000 && SITE_LANGS.every((l) => renderIndex(big, ORIGIN).includes('<loc>' + ORIGIN + '/sitemap-' + l + '.xml</loc>')) && /<sitemapindex /.test(renderIndex(big, ORIGIN)));
  const only = renderUrlset(big, ORIGIN, 'de');
  ok('3b. la sitemap di una lingua ha solo quella lingua, ognuna con tutti gli hreflang', (only.match(/<url>/g) || []).length > 20 && !/<loc>https:\/\/nurvan\.app\/(en|fr)\//.test(only) && /<loc>https:\/\/nurvan\.app\/de\//.test(only) && /hreflang="fr"/.test(only));
}

// --- served --------------------------------------------------------------------
async function serve(maxUrls) {
  const app = express();
  app.use(canonicalUrls((req) => (req.hostname === 'localhost' || req.hostname === '127.0.0.1')));
  mountSitemap(app, { articles: read(realDir), calendar, siteDir: 'site', webDir: 'web', isSiteHost: (req) => req.get('x-site') !== 'app', origin: ORIGIN, maxUrls });
  app.get('/blog', (req, res) => res.send('blog'));
  app.get('/', (req, res) => res.send('home'));
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  return { base: 'http://127.0.0.1:' + server.address().port, close: () => new Promise((r) => server.close(r)) };
}
{
  const s = await serve();
  try {
    const rb = await fetch(s.base + '/robots.txt');
    ok('4a. /robots.txt: 200, text/plain, testo atteso', rb.status === 200 && /^text\/plain/.test(rb.headers.get('content-type')) && (await rb.text()) === robotsTxt(ORIGIN));
    const sm = await fetch(s.base + '/sitemap.xml');
    const body = await sm.text();
    ok('4b. /sitemap.xml: 200, application/xml, XML che inizia bene', sm.status === 200 && /^application\/xml/.test(sm.headers.get('content-type')) && body.startsWith('<?xml') && body.includes('<urlset'));
    ok('4c. sull’indirizzo dell’app non si serve nessuno dei due', (await fetch(s.base + '/robots.txt', { headers: { 'x-site': 'app' } })).status === 404 && (await fetch(s.base + '/sitemap.xml', { headers: { 'x-site': 'app' } })).status === 404);
    ok('4d. sotto le 1000 non esistono sitemap per lingua', (await fetch(s.base + '/sitemap-de.xml')).status === 404);
    const r1 = await fetch(s.base + '/it/blog', { redirect: 'manual' });
    ok('4e. /it/blog → 301 a /blog', r1.status === 301 && r1.headers.get('location') === '/blog');
    const r2 = await fetch(s.base + '/blog/?a=1', { redirect: 'manual' });
    ok('4f. /blog/ → 301 a /blog, con la query', r2.status === 301 && r2.headers.get('location') === '/blog?a=1');
    const r3 = await fetch(s.base + '/it', { redirect: 'manual' });
    ok('4g. /it → 301 alla radice; la radice e /blog restano 200', r3.status === 301 && r3.headers.get('location') === '/' && (await fetch(s.base + '/')).status === 200 && (await fetch(s.base + '/blog')).status === 200);
    const r4 = await fetch(s.base + '/it/blog', { redirect: 'manual', headers: { 'x-site': 'app' } });
    ok('4h. un POST non viene mai reindirizzato', (await fetch(s.base + '/blog/', { method: 'POST', redirect: 'manual' })).status !== 301);
  } finally { await s.close(); }
}
{
  const s = await serve(50);
  try {
    const idx = await (await fetch(s.base + '/sitemap.xml')).text();
    const de = await fetch(s.base + '/sitemap-de.xml');
    ok('4i. con più indirizzi del limite /sitemap.xml è un indice e le sitemap per lingua rispondono', /<sitemapindex/.test(idx) && de.status === 200 && /<loc>https:\/\/nurvan\.app\/de\//.test(await de.text()) && (await fetch(s.base + '/sitemap-xx.xml')).status === 404);
  } finally { await s.close(); }
}
ok('5a. canonicalPath: prefisso /it e slash finale tolti, il resto invariato', canonicalPath('/it/blog/') === '/blog' && canonicalPath('/it') === '/' && canonicalPath('/') === '/' && canonicalPath('/en/blog') === '/en/blog' && canonicalPath('/italia') === '/italia' && canonicalPath('/blog//x') === '/blog/x');

// --- the rest of the corrections --------------------------------------------------
const api = fs.readFileSync('coach-api.mjs', 'utf8');
ok('6a. l’intestazione x-powered-by è tolta', /app\.disable\("x-powered-by"\)/.test(api));
ok('6b. il reindirizzamento e la sitemap sono montati prima delle pagine del sito', api.indexOf('app.use(canonicalUrls(isSiteHost))') > 0 && api.indexOf('app.use(canonicalUrls(isSiteHost))') < api.indexOf('const siteBlog = mountBlog') && api.indexOf('mountSitemap(app') > api.indexOf('const siteBlog = mountBlog'));
const ico = fs.readFileSync('web/favicon.ico');
ok('6c. esiste un favicon.ico vero (contiene il PNG dell’icona)', ico.readUInt16LE(2) === 1 && ico.readUInt16LE(4) === 1 && ico.subarray(22, 26).toString('latin1') === '\x89PNG' && ico.readUInt32LE(14) === ico.length - 22);

console.log('');
if (failed) { console.log(failed + ' controlli della sitemap falliti.'); process.exit(1); }
console.log('Tutti i controlli della sitemap passano.');
