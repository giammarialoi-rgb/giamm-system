// Notices of illegal content (Digital Services Act, art. 16): the page anyone can use, the checks on what
// it sends, the confirmation of receipt, the decision written on the dashboard and sent to whoever reported,
// the 12 months they are kept, and the links that lead to the page (app settings, terms, site footer).
import fs from 'node:fs';
import { validateContentReport, receiptEmail, decisionEmail, decideContentReport, listContentReports, mountContentReports, CONTENT_REPORT_KINDS } from './server/admin/content-reports.mjs';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}
const read = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n');
const codeOf = (body) => { try { validateContentReport(body); return ''; } catch (e) { return e.code; } };
const good = { kind: 'rights', location: 'Programma condiviso con codice ABC123, foto nella scheda', explanation: 'È una mia foto, caricata senza il mio permesso.', name: 'Anna Bianchi', email: 'anna@example.com', goodFaith: true, lang: 'it' };

// ---- what a notice must contain (art. 16(2))
ok('a complete notice passes', codeOf(good) === '');
ok('the kind must be one of the list', codeOf({ ...good, kind: 'nope' }) === 'KIND' && Object.keys(CONTENT_REPORT_KINDS).length === 7);
ok('where the content is', codeOf({ ...good, location: ' ' }) === 'LOCATION');
ok('why it is illegal', codeOf({ ...good, explanation: 'no' }) === 'EXPLANATION');
ok('name and email of who sends it', codeOf({ ...good, name: '' }) === 'NAME' && codeOf({ ...good, email: 'x' }) === 'EMAIL');
ok('the statement of good faith', codeOf({ ...good, goodFaith: 'yes' }) === 'GOOD_FAITH');
ok('only child sexual abuse material can be reported anonymously', codeOf({ ...good, kind: 'csam', name: '', email: '' }) === '' && codeOf({ ...good, kind: 'csam', name: '', email: 'bad' }) === 'EMAIL');
const cleaned = validateContentReport({ ...good, location: 'x'.repeat(5000), lang: '<script>' });
ok('long texts are cut, the language is checked', cleaned.location.length === 2000 && cleaned.lang === 'it');

// ---- the emails
const r = receiptEmail('7', good);
ok('the receipt has the number and says a decision with its reason will follow', /n\. 7/.test(r.subject) && /decisione/.test(r.text) && /ABC123/.test(r.text));
const d = decisionEmail('7', good, 'Abbiamo rimosso la foto.');
ok('the decision says a person took it and how to contest it', /rimosso la foto/.test(d.text) && /non da un sistema automatico/.test(d.text) && /contestarla/.test(d.text) && /extragiudiziale/.test(d.text));

// ---- the route, with a database stood in for
const rows = [];
let lastSql = [];
const pool = { async query(sql, params) {
  lastSql.push(sql);
  if (/SELECT COUNT\(\*\)::int AS n FROM content_reports WHERE ip_hash/.test(sql)) return { rows: [{ n: rows.filter((x) => x.ip === params[0]).length }] };
  if (/INSERT INTO content_reports/.test(sql)) { rows.push({ id: rows.length + 1, kind: params[0], name: params[3], email: params[4], ip: params[6], status: 'open' }); return { rows: [{ id: rows.length }] }; }
  if (/UPDATE content_reports SET status = 'handled'/.test(sql)) { const row = rows.find((x) => String(x.id) === String(params[0]) && x.status === 'open'); if (!row) return { rows: [] }; row.status = 'handled'; row.decision = params[1]; return { rows: [row] }; }
  if (/DELETE FROM content_reports/.test(sql)) return { rowCount: 0 };
  if (/FROM content_reports ORDER BY/.test(sql)) return { rows: rows.map((x) => ({ ...x, location: 'l', explanation: 'e', lang: 'it', created_at: new Date() })) };
  return { rows: [] };
} };
const routes = {};
const app = { post: (p, h) => { routes['POST ' + p] = h; }, get: (p, h) => { routes['GET ' + p] = h; } };
const mails = [];
mountContentReports(app, { pool, initDb: async () => {}, sendEmail: async (to, subject) => { mails.push({ to, subject }); return { sent: true }; }, secret: 's', notifyTo: 'info@nurvan.app' });
const call = async (body, ip = '1.2.3.4') => {
  let status = 200, json = null;
  const res = { status(c) { status = c; return this; }, json(j) { json = j; return this; } };
  await routes['POST /api/content-report']({ body, ip }, res);
  return { status, json };
};
let out = await call(good);
await new Promise((r) => setTimeout(r, 0));
ok('anyone can send a notice, without an account', out.status === 200 && out.json.ok && out.json.id === '1');
ok('the sender gets the receipt and Nurvan is told', mails.some((m) => m.to === 'anna@example.com' && /ricevuto/.test(m.subject)) && mails.some((m) => m.to === 'info@nurvan.app'));
ok('the address is not kept, only a one-way trace of it', rows[0].ip && rows[0].ip !== '1.2.3.4' && rows[0].ip.length === 32);
out = await call({ ...good, goodFaith: false });
ok('an incomplete notice gets the code the page translates', out.status === 400 && out.json.code === 'GOOD_FAITH');
for (let i = 0; i < 10; i++) await call(good, '9.9.9.9');
out = await call(good, '9.9.9.9');
ok('ten a day from the same place, then a polite stop', out.status === 429 && out.json.code === 'RATE');

// ---- the decision
mails.length = 0;
let dec = await decideContentReport(pool, '1', 'Rimossa: la foto viola il diritto all’immagine.', async (to, subject) => { mails.push({ to, subject }); return { sent: true }; });
ok('the decision is saved and emailed to who reported', dec.ok && dec.emailed && mails[0].to === 'anna@example.com' && /Decisione/.test(mails[0].subject));
dec = await decideContentReport(pool, '1', 'di nuovo', null);
ok('a decided notice is not decided twice', dec.ok === false);
let err = null; try { await decideContentReport(pool, '2', ' ', null); } catch (e) { err = e; }
ok('a decision needs its reason', err && err.code === 'DECISION');
lastSql = [];
await listContentReports(pool);
ok('decided notices older than 12 months are forgotten', lastSql.some((q) => /DELETE FROM content_reports WHERE status = 'handled' AND decided_at < NOW\(\) - INTERVAL '12 months'/.test(q)));

// ---- the page and where it is linked
const page = read('web/segnala-contenuto.html');
ok('the page has the form: kind, where, why, name, email, good faith', ['report-kind', 'report-location', 'report-explanation', 'report-name', 'report-email', 'report-good-faith'].every((id) => page.includes('id="' + id + '"')) && Object.keys(CONTENT_REPORT_KINDS).every((k) => page.includes('value="' + k + '"')));
ok('every code the server can answer has its words in the page', ['KIND', 'LOCATION', 'EXPLANATION', 'NAME', 'EMAIL', 'GOOD_FAITH', 'RATE', 'FAIL', 'OK'].every((c) => page.includes('data-msg="' + c + '"')));
ok('it names the single point of contact and its languages', /Punto di contatto/.test(page) && /articoli 11 e 12/.test(page) && /italiano o in inglese/.test(page));
ok('the script posts to the route', /\/api\/content-report/.test(read('web/segnala-contenuto.js')));
const api = read('coach-api.mjs');
ok('the server serves the page in every language and mounts the route', /"\/segnala-contenuto": "segnala-contenuto\.html"/.test(api) && /mountContentReports\(app/.test(api));
ok('the app links it from Privacy e dati', /legalLinkHtml\('segnala-contenuto', 'Segnala un contenuto'\)/.test(read('web/index.base.html')));
ok('the terms explain it, with the point of contact', /href="\/segnala-contenuto"/.test(read('web/termini.html')) && /punto di contatto unico/.test(read('web/termini.html')));
ok('the site footer links it', /\{\{REPORT\}\}/.test(read('site/shell.html')) && /REPORT: "\/segnala-contenuto"/.test(api));
ok('the dashboard has the tab, and the overview warns', /\['content', 'Segnalazioni contenuti'\]/.test(read('admin/page-ops.js')) && /openContentReportCount/.test(read('server/admin/overview.mjs')));
ok('the privacy notice says what a notice keeps and for how long', /Segnalazioni di contenuti illegali/.test(read('web/privacy.html')));

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nSegnalazioni di contenuti (DSA): tutto verde');
