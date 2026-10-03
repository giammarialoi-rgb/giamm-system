// Administration suite: the private link, the money, the profiles, the counters
// and the connections. What can be proved without a database is proved here
// (pure functions, the gate on a real Express server, the counters against a
// recording pool); the SQL itself was run against a real PostgreSQL when it was
// written (see docs/ADMIN.md, "Come si prova").
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { adminSlug, makeLinkGate } from './server/admin/link.mjs';
import { sourceOf, pagePath, deviceOf, dayOf, cleanMetric, createAnalytics, METRIC_SOURCES } from './server/admin/analytics.mjs';
import { priceBook, monthlyCents, parseAmountCents, cleanLedgerEntry, ledgerCsv, sanitizePrices, sanitizeCosts } from './server/admin/economy.mjs';
import { seal, unseal, parseAscSales, parsePlayInstalls, missing, configured, fetchInstagram } from './server/admin/integrations.mjs';
import { dateOnly } from './server/admin/dates.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++; console.log('FAIL ' + message);
}
function eq(actual, expected, message) {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a === b) { console.log('OK   ' + message); return; }
  failed++; console.log('FAIL ' + message + '\n     atteso ' + b + ', ottenuto ' + a);
}

/* ---------------- the private link ---------------- */
{
  eq(adminSlug({ NODE_ENV: 'production' }), '', 'production without ADMIN_PATH: no address, the dashboard is off');
  eq(adminSlug({ NODE_ENV: 'production', ADMIN_PATH: 'short' }), '', 'a short secret is not accepted');
  eq(adminSlug({ NODE_ENV: 'production', ADMIN_PATH: '/Zk3-pQ9_xT7aLm2Vb8Nc/' }), 'Zk3-pQ9_xT7aLm2Vb8Nc', 'the secret is taken without its slashes');
  eq(adminSlug({ NODE_ENV: 'production', ADMIN_PATH: '../etc/passwd-passwd-passwd' }), '', 'a secret that is not letters, digits, - or _ is refused');
  eq(adminSlug({ NODE_ENV: 'development' }), 'admin', 'outside production the address is /admin, nothing to configure');

  const env = { NODE_ENV: 'production', ADMIN_PATH: 'Zk3-pQ9_xT7aLm2Vb8Nc', NURVAN_ADMIN_TOKEN: 't'.repeat(30) };
  const app = express();
  app.use('/api/admin', makeLinkGate(env));
  app.get('/api/admin/ping', (req, res) => res.json({ ok: true }));
  const srv = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = 'http://127.0.0.1:' + srv.address().port;
  const get = async (headers) => (await fetch(base + '/api/admin/ping', { headers })).status;
  eq(await get({}), 404, 'no link: the routes do not exist (404, not 401)');
  eq(await get({ 'X-Nurvan-Admin-Link': 'wrong-wrong-wrong-wrong' }), 404, 'wrong link: 404');
  eq(await get({ 'X-Nurvan-Admin-Link': 'Zk3-pQ9_xT7aLm2Vb8Nc' }), 200, 'the right link passes the gate');
  eq(await get({ 'X-Admin-Token': 't'.repeat(30) }), 200, 'the command-line token has its own door');
  eq(await get({ 'X-Admin-Token': 'x'.repeat(30) }), 404, 'a wrong token does not');
  srv.close();
  const off = express();
  off.use('/api/admin', makeLinkGate({ NODE_ENV: 'production' }));
  off.get('/api/admin/ping', (req, res) => res.json({ ok: true }));
  const s2 = await new Promise((r) => { const s = off.listen(0, () => r(s)); });
  eq((await fetch('http://127.0.0.1:' + s2.address().port + '/api/admin/ping', { headers: { 'X-Nurvan-Admin-Link': 'admin' } })).status, 404, 'no ADMIN_PATH in production: nothing answers, whatever is sent');
  s2.close();

  const idx = read('server/admin/index.mjs');
  ok('the page is served only at the secret address, not at /admin', idx.includes('app.get("/" + slug, ') && !/app\.get\(\["\/admin"/.test(idx));
  ok('the page learns its address from the server', idx.includes('split("__BASE__").join("/" + slug)') && read('admin/index.html').includes('__BASE__/admin.js'));
  ok('the files served from the secret address are only .js in admin/', /\^\[a-z0-9-\]\+\\\.js\$/.test(idx));
  ok('every admin request carries the link header, files included', read('admin/ui.js').includes("'X-Nurvan-Admin-Link'") && read('admin/ui.js').match(/X-Nurvan-Admin-Link/g).length >= 2);
}

/* ---------------- where a visit came from, and what a page is ---------------- */
{
  const own = ['nurvan.app', 'www.nurvan.app', 'app.nurvan.app'];
  const req = (ref, query = {}) => ({ query, headers: ref ? { referer: ref } : {} });
  eq(sourceOf(req(''), own), 'diretto', 'no referrer: direct');
  eq(sourceOf(req('https://l.instagram.com/?u=x'), own), 'instagram', 'Instagram in-app browser');
  eq(sourceOf(req('', { utm_source: 'Instagram' }), own), 'instagram', 'a tagged link says where it was put');
  eq(sourceOf(req('', { utm_source: 'news letter!' }), own), 'link:newsletter', 'any other tag is cleaned and kept');
  eq(sourceOf(req('https://www.google.com/search?q=x'), own), 'google', 'Google');
  eq(sourceOf(req('https://nurvan.app/blog'), own), 'interno', 'a click inside the site is not a source');
  eq(sourceOf(req('https://chatgpt.com/'), own), 'assistenti-ai', 'AI assistants are told apart');
  eq(sourceOf(req('https://example.org/page'), own), 'altro:example.org', 'anything else by its host');
  eq(sourceOf(req('', { utm_source: 'x'.repeat(100) }), own).length <= 'link:'.length + 30, true, 'a tag cannot grow without limit');
  eq(pagePath('/Blog/Creatina/?utm=1'), '/blog/creatina', 'paths are lower case, no query, no trailing slash');
  eq(pagePath('//a//b///'), '/a/b', 'doubled slashes collapse');
  eq(deviceOf('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'), 'mobile', 'phone');
  eq(deviceOf('Mozilla/5.0 (Windows NT 10.0) Chrome/120'), 'desktop', 'desktop');
  ok('days are Italian days (YYYY-MM-DD)', /^\d{4}-\d{2}-\d{2}$/.test(dayOf()) && dayOf(Date.UTC(2026, 0, 1, 23, 30)) === '2026-01-02');
}

/* ---------------- the counters: what is counted, and what is not ---------------- */
{
  const calls = [];
  let failNext = false;
  const pool = { async query(sql, params) { if (failNext) { failNext = false; throw new Error('down'); } calls.push({ sql: sql.replace(/\s+/g, ' ').trim(), params }); return { rows: [] }; } };
  const a = createAnalytics({ pool, initDb: async () => {}, secret: 's', siteHosts: ['nurvan.app'], appHosts: ['app.nurvan.app'], hiddenPrefixes: ['Zk3secretsecretsecret'.toLowerCase()], flushMs: 600000 });
  const finish = [];
  const fake = (over, status = 200) => {
    const req = Object.assign({ method: 'GET', path: '/', hostname: 'nurvan.app', query: {}, ip: '1.2.3.4', headers: { 'user-agent': 'Mozilla/5.0 (iPhone) Safari', referer: 'https://l.instagram.com/' }, socket: {} }, over);
    const handlers = [];
    const res = { statusCode: status, getHeader: () => 'text/html; charset=utf-8', on: (ev, fn) => handlers.push(fn) };
    a.middleware(req, res, () => {});
    handlers.forEach((h) => h());
    return req;
  };
  fake({});
  fake({ path: '/blog/x', headers: { 'user-agent': 'Mozilla/5.0 Chrome' } });
  fake({ headers: { 'user-agent': 'Googlebot/2.1' } });
  fake({ path: '/site-assets/a.css' });
  fake({ path: '/logo.png' });
  fake({ path: '/api/health' });
  fake({ path: '/admin' });
  fake({ path: '/zk3secretsecretsecret' });
  fake({ hostname: 'evil.example' });
  fake({ method: 'POST' });
  fake({ path: '/pagina' }, 404);
  fake({ path: '/redirect' }, 301);
  await a.flush();
  const hitsCall = calls.find((c) => /INSERT INTO site_hits_day/.test(c.sql));
  ok('hits are written in one statement', !!hitsCall && /UNNEST/.test(hitsCall.sql));
  const paths = hitsCall.params[2];
  ok('pages of people on the site are counted', paths.includes('/') && paths.includes('/blog/x'));
  ok('bots, assets, the API, the dashboard, other hosts, POSTs, errors and redirects are not', paths.length === 2 && !paths.includes('/site-assets/a.css') && !paths.includes('/logo.png') && !paths.includes('/api/health') && !paths.includes('/admin') && !paths.includes('/zk3secretsecretsecret') && !paths.includes('/pagina') && !paths.includes('/redirect'));
  ok('exactly the two real visits are in', hitsCall.params[5].reduce((n, x) => n + x, 0) === 2);
  const visitors = calls.find((c) => /INSERT INTO site_visitors_day/.test(c.sql));
  ok('visitors are hashes, never an address', visitors.params[1].every((h) => /^[a-f0-9]{24}$/.test(h)) && !JSON.stringify(visitors.params).includes('1.2.3.4'));
  ok('two visits from two browsers are two visitors', new Set(visitors.params[1]).size === 2);
  ok('the day\'s distinct visitors are counted by source from the table, then old hashes are forgotten', calls.some((c) => /INSERT INTO site_uniques_day/.test(c.sql)) && calls.some((c) => /DELETE FROM site_visitors_day/.test(c.sql)));

  // the app
  const json = (body, over) => { const out = { status: 200, body: null }; const res = { status(n) { out.status = n; return res; }, json(b) { out.body = b; return out; } }; return a.appPing(Object.assign({ body, ip: '9.9.9.9', headers: { 'user-agent': 'Mozilla/5.0 test' } }, over), res); };
  eq(json({ platform: 'toaster' }).status, 400, 'an unknown platform is refused');
  eq(json({ platform: 'ios', first: true }).status, 200, 'a known platform is counted');
  json({ platform: 'android' });
  json({ platform: 'ios' }, { headers: { 'user-agent': 'Googlebot' } });
  calls.length = 0;
  await a.flush();
  const pings = calls.find((c) => /INSERT INTO app_pings_day/.test(c.sql));
  ok('app openings are a day, a platform and a hash', pings && pings.params[1].sort().join() === 'android,ios' && pings.params[2].every((h) => /^[a-f0-9]{24}$/.test(h)));
  ok('first openings are added to the day\'s installs', calls.some((c) => /INSERT INTO app_stats_day/.test(c.sql) && c.params && c.params[2] && c.params[2][0] === 1));
  let limited = 0;
  for (let i = 0; i < 40; i++) if (json({ platform: 'web' }, { ip: '7.7.7.7' }).status === 429) limited++;
  ok('a flood from one address is cut after 30 an hour', limited === 10);

  // a failed write keeps the counts
  fake({ path: '/riprova' });
  failNext = true;
  await a.flush();
  calls.length = 0;
  await a.flush();
  ok('a failed write is retried, not lost', calls.some((c) => /INSERT INTO site_hits_day/.test(c.sql) && c.params[2].includes('/riprova')));
  await a.stop();
}

/* ---------------- metrics typed by hand ---------------- */
{
  eq(cleanMetric({ source: 'instagram', metric: 'followers', value: '1.250,5'.replace('.', ''), day: '2026-10-01' }).value, 1250.5, 'a number with a decimal comma is read');
  for (const bad of [{ source: 'x', metric: 'followers', value: 1 }, { source: 'instagram', metric: 'bogus', value: 1 }, { source: 'instagram', metric: 'followers', value: -1 }, { source: 'instagram', metric: 'followers', value: 'abc' }, { source: 'instagram', metric: 'followers', value: 1, day: '2026-13-45' }]) {
    let threw = false; try { cleanMetric(bad); } catch (e) { threw = e.statusCode === 400; }
    ok('refused: ' + JSON.stringify(bad), threw);
  }
  ok('"other" takes any tidy name', cleanMetric({ source: 'other', metric: 'blog_subscribers', value: 3 }).metric === 'blog_subscribers' && METRIC_SOURCES.instagram.includes('followers'));
}

/* ---------------- money ---------------- */
{
  const book = priceBook();
  eq(book.standard, { month: null, year: 24 }, 'the price book is the plans\' own prices');
  eq(book.coach, { month: 19, year: 190 }, 'coach: monthly and yearly');
  eq(priceBook({ standard: { month: 3, year: 30 } }).standard, { month: 3, year: 30 }, 'the owner\'s prices go on top');
  eq(priceBook({ standard: { year: null } }).standard.year, null, 'a period can be taken off sale');
  eq(monthlyCents('standard', null, book), 200, 'yearly price -> a twelfth a month');
  eq(monthlyCents('coach', null, book), 1900, 'coach defaults to the monthly price');
  eq(monthlyCents('coach', { period: 'year' }, book), Math.round(19000 / 12), 'coach billed yearly');
  eq(monthlyCents('coach', { period: 'year', price_cents: 12000 }, book), 1000, 'an account\'s own price wins');
  eq(monthlyCents('coach_pro', { price_cents: 0 }, book), 3900, 'a zero price is not a price');
  eq([parseAmountCents('24,50'), parseAmountCents('1 000'), parseAmountCents('-3'), parseAmountCents('abc'), parseAmountCents('')], [2450, 100000, null, null, 0], 'amounts: comma, spaces, negative and rubbish');
  eq(sanitizePrices({ coach: { month: '20,5', year: '' }, bogus: { month: 1 } }), { coach: { month: 20.5, year: null } }, 'prices: only real plans, comma read, empty = off sale');
  let threw = false; try { sanitizePrices({ coach: { month: 'x' } }); } catch (e) { threw = e.statusCode === 400; }
  ok('a price that is not a number is refused', threw);
  eq(sanitizeCosts([{ name: 'Render', amount: '7', period: 'month' }, { name: '', amount: '99', period: 'year' }]), [{ name: 'Render', cents: 700, period: 'month' }, { name: 'Costo', cents: 9900, period: 'year' }], 'costs: cents and period');
  const e = cleanLedgerEntry({ kind: 'income', amount: '19', day: '2026-10-03', category: 'abbonamento', source: 'stripe', reference: 'pi_1' }, 'me@x.it');
  eq([e.cents, e.kind, e.category, e.source, e.actor], [1900, 'income', 'abbonamento', 'stripe', 'me@x.it'], 'a ledger entry is cleaned');
  eq(cleanLedgerEntry({ kind: 'expense', amount: 5, category: 'inventata' }, 'x').category, 'altro', 'an unknown category becomes "altro"');
  for (const bad of [{ kind: 'x', amount: 1 }, { kind: 'income', amount: 0 }, { kind: 'income', amount: 'a' }, { kind: 'income', amount: 1, day: 'ieri' }]) {
    let t = false; try { cleanLedgerEntry(bad, 'x'); } catch (er) { t = er.statusCode === 400; }
    ok('ledger refuses ' + JSON.stringify(bad), t);
  }
  const csv = ledgerCsv([{ day: '2026-10-03', kind: 'income', cents: 1900, currency: 'EUR', category: 'abbonamento', source: 'stripe', reference: 'pi_1', email: 'a@b.it', note: 'con; punto e virgola', by: 'me', voided: false }]);
  ok('the ledger file uses the Italian conventions and quotes what needs it', csv.startsWith('data;tipo;importo') && csv.includes('19,00') && csv.includes('"con; punto e virgola"') && csv.includes('entrata'));
  eq(dateOnly(new Date(2026, 9, 3)), '2026-10-03', 'a DATE read as local midnight keeps its day');
}

/* ---------------- the connections ---------------- */
{
  const sealed = seal('token-123', 'secret');
  eq(unseal(sealed, 'secret'), 'token-123', 'a stored token comes back');
  eq(unseal(sealed, 'other'), null, 'with another key it does not');
  eq(unseal(sealed.slice(0, -3) + 'AAA', 'secret'), null, 'a tampered one does not');
  ok('the stored token is not readable', !sealed.includes('token-123'));
  eq(missing('instagram', {}), ['IG_ACCESS_TOKEN'], 'Instagram says what it lacks');
  ok('App Store needs four variables, Google Play two', missing('appstore', {}).length === 4 && missing('playstore', {}).length === 2);
  ok('with them set a connection is on', configured('instagram', { IG_ACCESS_TOKEN: 'x' }) && !configured('appstore', { ASC_KEY_ID: 'x' }));
  const tsv = ['Provider\tProduct Type Identifier\tUnits\tDeveloper Proceeds\tCurrency of Proceeds',
    'APPLE\t1F\t3\t0\tEUR', 'APPLE\t7\t10\t0\tEUR', 'APPLE\tIA1\t2\t1.5\tEUR', 'APPLE\t1\t1\t0\tEUR'].join('\n');
  const s = parseAscSales(tsv);
  eq([s.downloads, s.updates, s.proceeds], [4, 10, { EUR: 3 }], 'App Store sales: downloads, updates, proceeds by currency');
  eq(parseAscSales('').downloads, 0, 'an empty report is zero');
  const play = ['Date,Package Name,Daily Device Installs,Daily Device Uninstalls,Daily Device Upgrades,Total User Installs,Daily User Installs,Daily User Uninstalls,Active Device Installs',
    '2026-10-01,com.nurvan.app,5,1,0,40,4,1,30', 'bad,row', '2026-10-02,com.nurvan.app,2,0,0,42,2,0,31'].join('\n');
  eq(parsePlayInstalls(play), [{ day: '2026-10-01', installs: 4, uninstalls: 1, active: 30 }, { day: '2026-10-02', installs: 2, uninstalls: 0, active: 31 }], 'Google Play installs, rows that are not a day skipped');
  const src = read('server/admin/integrations.mjs');
  ok('a number typed by hand is never overwritten by a fetch', read('server/admin/analytics.mjs').includes("WHERE admin_metrics.origin <> 'manual' OR EXCLUDED.origin = 'manual'"));
  ok('the connections run on their own, six hours apart, only when configured', src.includes('everyMs = 6 * 3600000') && src.includes('if (!configured(name, env)) continue;'));
  ok('the Instagram token is renewed monthly and kept encrypted', src.includes('30 * DAY') && src.includes('seal(token, secret)'));
}

/* ---------------- how it is wired ---------------- */
{
  const api = read('coach-api.mjs');
  const at = api.indexOf('app.use(analytics.middleware);');
  ok('visits are counted before the site\'s pages are served', at > 0 && at < api.indexOf('mountBlog(app') && at < api.indexOf('mountLandings(app'));
  ok('the app\'s daily ping has its own route', api.includes('app.post("/api/app/ping", analytics.appPing);'));
  ok('the counts are written out on shutdown', /await analytics\.stop\(\)/.test(api));
  ok('the connections start in production only', api.includes('if (isProduction(process.env)) startIntegrationsJob('));
  ok('a suspended account\'s sessions stop', read('server/account/sessions.mjs').includes('disabled_at') && read('server/account/sessions.mjs').includes('entry.disabled'));
  const mig = read('server/db/migrations/0026_admin_suite.sql');
  for (const t of ['admin_settings', 'admin_account_billing', 'admin_ledger', 'admin_notes', 'site_hits_day', 'site_visitors_day', 'site_uniques_day', 'app_pings_day', 'app_stats_day', 'admin_metrics', 'admin_integrations']) ok('migration 0026 creates ' + t, mig.includes('CREATE TABLE IF NOT EXISTS ' + t));
  ok('a ledger row is voided, never deleted', !/DELETE FROM admin_ledger/.test(read('server/admin/economy.mjs')) && read('server/admin/economy.mjs').includes('SET voided_at = NOW()'));
  ok('the coaches\' own ledger is never read by the dashboard', !/coach_payment_events/.test(read('server/admin/economy.mjs') + read('server/admin/profiles.mjs') + read('server/admin/overview.mjs')));
  const prof = read('server/admin/profiles.mjs');
  ok('profiles read counts, never content', !/data->'logs'\s*\)?\s*(?:AS|,)\s*(?:notes|text)/.test(prof) && !/photo|diary|therapy|exams?\b.*SELECT/i.test(prof.replace(/\/\/.*$/gm, '')));
  const app = read('web/index.base.html');
  ok('the app reports its platform once a day and keeps no identifier', /function reportAppUse\(\)/.test(app) && app.includes("nurvan_ping_day") && !/nurvan_install_id|deviceId|uuid/i.test(app.slice(app.indexOf('function reportAppUse'), app.indexOf('function openAccount'))));
  ok('the ping sends no account token', !/Authorization/.test(app.slice(app.indexOf('function reportAppUse'), app.indexOf('function openAccount'))));
  ok('the dashboard is documented', fs.existsSync(path.join(root, 'docs/ADMIN.md')) && /ADMIN_PATH/.test(read('docs/ADMIN.md')) && /ADMIN_EMAILS/.test(read('docs/ADMIN.md')));
  ok('render.yaml lists the dashboard\'s variables', /ADMIN_PATH/.test(read('render.yaml')) && /ADMIN_EMAILS/.test(read('render.yaml')) && /IG_ACCESS_TOKEN/.test(read('render.yaml')));
}

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nSuite di amministrazione: tutto verde');
