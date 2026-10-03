// IndexNow: the key file, what is announced and when, and that a refusal from
// the search engine does not mark anything as announced. The database and the
// network are replaced by in-memory ones.
import fs from 'node:fs';
import http from 'node:http';
import express from 'express';
import { runIndexNow, toAnnounce, urlsOf, mountIndexNowKey, keyOf, DEFAULT_KEY, ENDPOINT, BATCH } from './server/site/indexnow.mjs';
import { collectEntries } from './server/site/sitemap.mjs';
import { loadArticles } from './server/site/blog.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const ORIGIN = 'https://nurvan.app';

function fakePool() {
  const rows = new Map();
  return {
    rows,
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT url, lastmod FROM indexnow_urls')) return { rows: [...rows].map(([url, lastmod]) => ({ url, lastmod })) };
      if (s.startsWith('INSERT INTO indexnow_urls')) { rows.set(p[0], p[1]); return { rows: [] }; }
      throw new Error('unexpected SQL: ' + s.slice(0, 80));
    }
  };
}
const calls = [];
const fetchOk = async (url, init) => { calls.push({ url, body: JSON.parse(init.body), init }); return { status: 200 }; };
const quiet = { warn() {}, log() {} };

let list = [
  { urls: { it: '/', en: '/en' }, lastmod: '2026-10-03' },
  { urls: { it: '/blog/a', en: '/en/blog/a' }, lastmod: '2026-10-01', dated: true }
];
const entries = async () => list;
const pool = fakePool();
const run = (extra = {}) => runIndexNow(Object.assign({ pool, initDb: async () => {}, entries, origin: ORIGIN, key: 'k'.repeat(32), fetchFn: fetchOk, log: quiet }, extra));

// --- the key file ------------------------------------------------------------
{
  const app = express();
  mountIndexNowKey(app, { isSiteHost: (req) => req.get('x-site') !== 'app', key: 'abc123abc123abc123' });
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const res = await fetch(base + '/abc123abc123abc123.txt');
  ok('1a. il file della chiave è sul dominio del sito, testo semplice, con la chiave dentro', res.status === 200 && /^text\/plain/.test(res.headers.get('content-type')) && (await res.text()) === 'abc123abc123abc123');
  ok('1b. non sull’indirizzo dell’app', (await fetch(base + '/abc123abc123abc123.txt', { headers: { 'x-site': 'app' } })).status === 404);
  server.close();
}
ok('1c. la chiave è di 32 caratteri esadecimali (8-128 ammessi) e INDEXNOW_KEY la sostituisce', /^[0-9a-f]{32}$/.test(DEFAULT_KEY) && keyOf({}) === DEFAULT_KEY && keyOf({ INDEXNOW_KEY: ' miachiave123456 ' }) === 'miachiave123456');

// --- what is announced -----------------------------------------------------------
{
  const n = await run();
  const body = calls[0].body;
  ok('2a. la prima volta annuncia tutto il sito, con host, chiave, indirizzo del file e indirizzi assoluti', n === 4 && calls.length === 1 && calls[0].url === ENDPOINT && body.host === 'nurvan.app' && body.key === 'k'.repeat(32) && body.keyLocation === 'https://nurvan.app/' + 'k'.repeat(32) + '.txt' && body.urlList.join() === 'https://nurvan.app/,https://nurvan.app/en,https://nurvan.app/blog/a,https://nurvan.app/en/blog/a');
  ok('2b. è un POST JSON in UTF-8', calls[0].init.method === 'POST' && /application\/json; charset=utf-8/.test(calls[0].init.headers['Content-Type']));
  ok('2c. ricordati nel database con la loro data', pool.rows.size === 4 && pool.rows.get('https://nurvan.app/blog/a') === '2026-10-01');
  ok('2d. una seconda passata subito dopo non annuncia niente', (await run()) === 0 && calls.length === 1);
}
{
  list = list.concat([{ urls: { it: '/blog/nuovo', en: '/en/blog/new' }, lastmod: '2026-10-03', dated: true }]);
  const n = await run();
  ok('3a. un articolo nuovo: si annunciano solo i suoi indirizzi', n === 2 && calls.length === 2 && calls[1].body.urlList.join() === 'https://nurvan.app/blog/nuovo,https://nurvan.app/en/blog/new');
}
{
  list = list.map((e) => (e.urls.it === '/blog/a' ? Object.assign({}, e, { lastmod: '2026-10-04' }) : e));
  const n = await run();
  ok('3b. un articolo con data cambiata (revisione) si annuncia di nuovo', n === 2 && calls[2].body.urlList.join() === 'https://nurvan.app/blog/a,https://nurvan.app/en/blog/a' && pool.rows.get('https://nurvan.app/blog/a') === '2026-10-04');
}
{
  list = list.map((e) => (e.urls.it === '/' ? Object.assign({}, e, { lastmod: '2026-10-09' }) : e));
  ok('3c. una pagina senza data vera (la home: vale il giorno dell’ultimo deploy) non si riannuncia a ogni riavvio', (await run()) === 0 && calls.length === 3);
}

// --- a refusal, and big sites --------------------------------------------------------
{
  const p2 = fakePool();
  const refuse = async (u, init) => { calls.push({ url: u, body: JSON.parse(init.body) }); return { status: 403 }; };
  const before = calls.length;
  const n = await run({ pool: p2, fetchFn: refuse });
  ok('4a. se il motore rifiuta (403: la chiave non è raggiungibile) niente viene segnato come annunciato e si riprova alla passata dopo', n === 0 && p2.rows.size === 0 && calls.length === before + 1);
  const n2 = await run({ pool: p2 });
  ok('4b. e la passata dopo, ora accettata, annuncia tutto', n2 === 6 && p2.rows.size === 6);
  const many = Array.from({ length: 1200 }, (_, i) => ({ urls: { it: '/p' + i }, lastmod: '2026-10-01' }));
  const sizes = [];
  const p3 = fakePool();
  await run({ pool: p3, entries: async () => many, fetchFn: async (u, init) => { sizes.push(JSON.parse(init.body).urlList.length); return { status: 202 }; } });
  ok('4c. sopra i 1000 indirizzi si manda a gruppi, e 202 vale come accettato', BATCH === 1000 && sizes.join() === '1000,200' && p3.rows.size === 1200);
}
{
  const t = urlsOf([{ urls: { it: '/x', zz: '/zz/x' }, lastmod: '2026-10-01', dated: true }], ORIGIN);
  ok('4d. solo le lingue del sito entrano nell’elenco', t.length === 1 && t[0].url === 'https://nurvan.app/x');
  ok('4e. toAnnounce: nuovo sì, già noto e uguale no, noto e cambiato solo se datato', toAnnounce([{ url: 'a', lastmod: '1' }, { url: 'b', lastmod: '1' }, { url: 'c', lastmod: '2', dated: true }, { url: 'd', lastmod: '2' }], new Map([['b', '1'], ['c', '1'], ['d', '1']])).map((u) => u.url).join() === 'a,c');
}

// --- real pages: the articles are marked as dated ----------------------------------------
{
  const real = await collectEntries({ articles: async (l) => loadArticles({ contentDir: 'content/articles', siteDir: 'site/blog' }, new Date(), l), events: [], siteDir: 'site', webDir: 'web' });
  const art = real.filter((e) => e.dated);
  ok('5a. nell’elenco vero gli articoli e le categorie hanno una data vera, le altre pagine no', art.length > 20 && real.some((e) => !e.dated) && real.find((e) => e.urls.it === '/').dated !== true && real.every((e) => !e.dated || /^\d{4}-\d{2}-\d{2}$/.test(e.lastmod)));
}

// --- wired into the site ---------------------------------------------------------------------
const api = fs.readFileSync('coach-api.mjs', 'utf8');
ok('6a. il file della chiave è montato e l’invio parte solo in produzione, spegnibile con INDEXNOW=0', /mountIndexNowKey\(app, \{ isSiteHost/.test(api) && /isProduction\(process\.env\) && process\.env\.INDEXNOW !== "0"/.test(api) && /startIndexNowJob\(\{ pool, initDb, entries: siteMap\.entries/.test(api));
ok('6b. la tabella è una migrazione', /CREATE TABLE IF NOT EXISTS indexnow_urls/.test(fs.readFileSync('server/db/migrations/0025_indexnow_urls.sql', 'utf8')));

console.log('');
if (failed) { console.log(failed + ' controlli di IndexNow falliti.'); process.exit(1); }
console.log('Tutti i controlli di IndexNow passano.');
