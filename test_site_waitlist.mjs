// The waiting list of the site and the founding coaches' application: the
// page, the two forms, what is saved, what is refused, the links to it from
// the rest of the site. Run against the real module with the database kept
// in memory.
import fs from 'node:fs';
import http from 'node:http';
import express from 'express';
import { mountWaitlist, waitlistPath, WAITLIST_CONSENT_TEXT, MAX_PER_HOUR, listWaitlist, waitlistCsv, listCoachApplications, coachApplicationsCsv } from './server/site/waitlist.mjs';
import { translateHtml, siteDict, SITE_LANGS } from './server/site/i18n.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

function fakePool() {
  const waitlist = [];
  const coaches = [];
  return {
    waitlist, coaches,
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('INSERT INTO waitlist')) {
        const [email, lang, when, text] = p;
        const cur = waitlist.find((r) => r.email === email);
        if (cur) Object.assign(cur, { lang, consent_at: when, consent_text: text, updated_at: when });
        else waitlist.push({ email, lang, consent_at: when, consent_text: text, created_at: when, updated_at: when });
        return { rows: [] };
      }
      if (s.startsWith('INSERT INTO coach_applications')) {
        const [email, name, social, athletes, qualification, notes, lang, when, text] = p;
        const row = { email, name, social, athletes, qualification, notes, lang, consent_at: when, consent_text: text, created_at: when, updated_at: when };
        const i = coaches.findIndex((r) => r.email === email);
        if (i >= 0) coaches[i] = Object.assign(coaches[i], row, { created_at: coaches[i].created_at }); else coaches.push(row);
        return { rows: [] };
      }
      if (s.startsWith('SELECT email, lang, consent_at, created_at FROM waitlist')) return { rows: waitlist.slice().reverse() };
      if (s.startsWith('SELECT email, name, social')) return { rows: coaches.slice().reverse() };
      throw new Error('unexpected SQL: ' + s.slice(0, 80));
    }
  };
}

async function world(maxPerHour = 1000) {
  const pool = fakePool();
  const pages = [];
  const app = express();
  app.use(express.json());
  const shell = async (req, page) => { pages.push(page); return '<html><head><title>' + page.title + '</title><meta name="description" content="' + page.description + '"></head><body>' + translateHtml(page.main, await siteDict('site', page.lang)) + '</body></html>'; };
  mountWaitlist(app, { siteDir: 'site', shell, pool, initDb: async () => {}, maxPerHour });
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (route, body) => fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { pool, pages, base, post, close: () => new Promise((r) => server.close(r)) };
}

const coachBody = (extra = {}) => Object.assign({ name: 'Luca Rossi', email: 'Luca@Example.com', social: '@lucacoach', athletes: '6-20', qualification: 'ISSA Personal Trainer', notes: '', consent: true, lang: 'it' }, extra);

const w = await world();
try {
  // --- the page ------------------------------------------------------------
  const res = await fetch(w.base + '/lista-attesa');
  const html = await res.text();
  const page = w.pages[0];
  ok('1a. /lista-attesa risponde 200 e il contenuto è nell’HTML', res.status === 200 && /<h1[^>]*>Nurvan sta arrivando\. Entra nella lista\.<\/h1>/.test(html));
  ok('1b. title ≤ 60 caratteri, description tra 140 e 160', page.title.length <= 60 && page.description.length >= 140 && page.description.length <= 160);
  ok('1c. c’è il modulo email, la casella privacy non preselezionata, il link all’informativa e il campo trappola', /id="waitlist-form"/.test(html) && /type="email"/.test(html) && /<input type="checkbox" name="consent" required>/.test(html) && !/name="consent"[^>]*checked/.test(html) && /privacy\?lang=it/.test(html) && /name="website"/.test(html));
  ok('1d. cinque punti sulle funzioni', (html.match(/<article class="card">/g) || []).length === 5);
  ok('1e. la sezione coach: 10 fondatori, Coach Pro gratis per 12 mesi, il suo modulo con tutti i campi', /id="coach"/.test(html) && /Cerchiamo 10 coach fondatori\./.test(html) && /Coach Pro gratuito per 12 mesi \(valore 390 €\)/.test(html) &&
    ['name', 'email', 'social', 'athletes', 'qualification', 'notes'].every((n) => new RegExp('id="coach-form"[\\s\\S]*name="' + n + '"').test(html)) && ['1-5', '6-20', '21-50', 'Oltre 50'].every((b) => html.includes('>' + b + '<')));
  ok('1f. dalla parte iniziale si arriva alla sezione coach', /href="#coach"/.test(html));
  const en = await (await fetch(w.base + '/en/waitlist')).text();
  ok('1g. in inglese la pagina è tradotta', /Nurvan is coming. Join the list./.test(en) && !/Nurvan sta arrivando/.test(en.slice(en.indexOf('<body>'))));
  ok('1h. ogni lingua ha la sua pagina, con slug /lista-attesa per l’italiano e /<lingua>/waitlist per le altre', (await Promise.all(SITE_LANGS.map(async (l) => (await fetch(w.base + waitlistPath(l))).status))).every((s) => s === 200) && waitlistPath('it') === '/lista-attesa' && waitlistPath('de') === '/de/waitlist');
  const alt = page.alternates;
  ok('1i. gli hreflang sono reciproci: la stessa mappa su ogni pagina, con tutte le lingue (x-default lo aggiunge il guscio dall’italiano)', SITE_LANGS.every((l) => alt[l] === waitlistPath(l)) && w.pages.every((p) => JSON.stringify(p.alternates) === JSON.stringify(alt)) && !!alt.it);

  // --- the waiting list ----------------------------------------------------
  const r1 = await w.post('/api/site/waitlist', { email: ' Mario@Example.com ', consent: true, lang: 'it' });
  const j1 = await r1.json();
  ok('2a. l’iscrizione salva l’indirizzo (in minuscolo), la lingua, data e testo del consenso', r1.status === 200 && j1.ok && /lista d'attesa/.test(j1.message) && w.pool.waitlist.length === 1 && w.pool.waitlist[0].email === 'mario@example.com' && !!w.pool.waitlist[0].consent_at && w.pool.waitlist[0].consent_text === WAITLIST_CONSENT_TEXT);
  ok('2b. senza consenso privacy non salva nulla', (await w.post('/api/site/waitlist', { email: 'b@example.com', consent: false })).status === 400 && (await w.post('/api/site/waitlist', { email: 'b@example.com' })).status === 400 && w.pool.waitlist.length === 1);
  ok('2c. con il campo trappola pieno non salva nulla', (await w.post('/api/site/waitlist', { email: 'bot@example.com', consent: true, website: 'http://spam' })).status === 400 && w.pool.waitlist.length === 1);
  ok('2d. un indirizzo non valido è rifiutato', (await w.post('/api/site/waitlist', { email: 'non-una-mail', consent: true })).status === 400 && w.pool.waitlist.length === 1);
  await w.post('/api/site/waitlist', { email: 'mario@example.com', consent: true, lang: 'en' });
  ok('2e. lo stesso indirizzo due volte è una riga sola', w.pool.waitlist.length === 1 && w.pool.waitlist[0].lang === 'en');
  const bad = await (await w.post('/api/site/waitlist', { email: 'x', consent: true, lang: 'de' })).json();
  ok('2f. i messaggi di errore sono nella lingua di chi scrive', /E-Mail/i.test(bad.error));

  // --- the coach application -----------------------------------------------
  const c1 = await w.post('/api/site/coach-application', coachBody());
  const cj = await c1.json();
  ok('3a. la candidatura salva tutti i campi e il consenso', c1.status === 200 && cj.ok && w.pool.coaches.length === 1 && w.pool.coaches[0].email === 'luca@example.com' && w.pool.coaches[0].name === 'Luca Rossi' && w.pool.coaches[0].athletes === '6-20' && w.pool.coaches[0].social === '@lucacoach' && w.pool.coaches[0].qualification === 'ISSA Personal Trainer' && !!w.pool.coaches[0].consent_at);
  ok('3b. il messaggio è diverso da quello della lista d’attesa', /Candidatura ricevuta/.test(cj.message) && cj.message !== j1.message);
  ok('3c. senza consenso, con la trappola piena o con una fascia inventata nulla viene salvato', (await w.post('/api/site/coach-application', coachBody({ email: 'c1@example.com', consent: false }))).status === 400 &&
    (await w.post('/api/site/coach-application', coachBody({ email: 'c2@example.com', website: 'x' }))).status === 400 &&
    (await w.post('/api/site/coach-application', coachBody({ email: 'c3@example.com', athletes: '1000' }))).status === 400 && w.pool.coaches.length === 1);
  ok('3d. nome, profilo e qualifica sono obbligatori; le note no', (await w.post('/api/site/coach-application', coachBody({ email: 'd1@example.com', name: '  ' }))).status === 400 &&
    (await w.post('/api/site/coach-application', coachBody({ email: 'd2@example.com', social: '' }))).status === 400 &&
    (await w.post('/api/site/coach-application', coachBody({ email: 'd3@example.com', qualification: '' }))).status === 400 &&
    (await w.post('/api/site/coach-application', coachBody({ email: 'd4@example.com', notes: undefined }))).status === 200);
  ok('3e. i testi lunghissimi vengono tagliati', (await w.post('/api/site/coach-application', coachBody({ email: 'e@example.com', notes: 'x'.repeat(5000), name: 'n'.repeat(500) }))).status === 200 && w.pool.coaches.find((r) => r.email === 'e@example.com').notes.length === 1000 && w.pool.coaches.find((r) => r.email === 'e@example.com').name.length === 100);

  // --- the files for the owner ---------------------------------------------
  const csv = waitlistCsv(await listWaitlist(w.pool));
  ok('4a. l’elenco per il titolare ha indirizzo, lingua e data del consenso', /^email,lingua,consenso_il,iscritto_il/.test(csv) && /mario@example\.com,en,\d{4}-/.test(csv));
  const ccsv = coachApplicationsCsv(await listCoachApplications(w.pool));
  ok('4b. e quello dei coach ha tutti i campi, e non fa eseguire formule', /^email,nome,instagram_o_sito,atleti,qualifica,note/.test(ccsv) && /luca@example\.com,Luca Rossi,@lucacoach,6-20,ISSA Personal Trainer/.test(ccsv) &&
    !/(^|,)=/m.test(coachApplicationsCsv([{ email: 'a@b.it', name: '=SUM(1)', social: '', athletes: '1-5', qualification: '+1', notes: '', lang: 'it' }]).split('\n')[1]));

} finally { await w.close(); }

// --- the rate limit ---------------------------------------------------------
{
  const r = await world(MAX_PER_HOUR);
  try {
    const codes = [];
    for (let i = 0; i < MAX_PER_HOUR + 2; i++) codes.push((await r.post('/api/site/waitlist', { email: 'r' + i + '@example.com', consent: true })).status);
    ok('5. troppe richieste dallo stesso indirizzo di rete: le prime passano, poi 429', codes.slice(0, MAX_PER_HOUR).every((c) => c === 200) && codes.slice(MAX_PER_HOUR).every((c) => c === 429) && r.pool.waitlist.length === MAX_PER_HOUR);
  } finally { await r.close(); }
}

// --- the rest of the site points here ---------------------------------------
const home = fs.readFileSync('site/home.html', 'utf8');
const shellHtml = fs.readFileSync('site/shell.html', 'utf8');
const hero = home.slice(home.indexOf('<div class="cta">'), home.indexOf('</div>', home.indexOf('<div class="cta">')));
ok('6a. il bottone principale della home è un vero link alla lista', /<a class="btn primary" href="\{\{WAITLIST\}\}">Entra nella lista<\/a>/.test(hero) && !/aria-disabled|soon/.test(hero));
ok('6b. il piè di pagina ha la voce Lista d’attesa', /<a href="\{\{WAITLIST\}\}">Lista d'attesa<\/a>/.test(shellHtml.slice(shellHtml.indexOf('<footer>'))));
ok('6c. ogni articolo del blog rimanda alla lista, sotto il riquadro Nurvan', /post-cta[\s\S]{0,400}post-wait[^`]*waitlistPath\(lang\)/.test(fs.readFileSync('server/site/blog.mjs', 'utf8')));
ok('6d. la tabella è una migrazione, e c’è un file per il titolare nell’admin', /CREATE TABLE IF NOT EXISTS waitlist/.test(fs.readFileSync('server/db/migrations/0024_site_waitlist.sql', 'utf8')) && /CREATE TABLE IF NOT EXISTS coach_applications/.test(fs.readFileSync('server/db/migrations/0024_site_waitlist.sql', 'utf8')) && /waitlist\.csv/.test(fs.readFileSync('server/admin/index.mjs', 'utf8')));

console.log('');
if (failed) { console.log(failed + ' controlli della lista d’attesa falliti.'); process.exit(1); }
console.log('Tutti i controlli della lista d’attesa passano.');
