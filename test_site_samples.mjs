// The example workouts on the site: the pages, the request for the PDF, the
// link sent by email, the download, the consent and its withdrawal.
// Run against the real module with a database kept in memory.
import fs from 'node:fs';
import http from 'node:http';
import express from 'express';
import { mountSamples, SAMPLES, CONSENT_TEXT, LINK_TTL_MS, listLeads, leadsCsv, redeemSample, sampleEmail } from './server/site/samples.mjs';
import { buildSamples, SAMPLE_IDS } from './tools/build_site_samples.mjs';
import { translateHtml, siteDict } from './server/site/i18n.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

// site_leads, in memory: the statements the module runs, nothing more.
export function fakeLeadsPool() {
  const rows = [];
  let id = 0;
  return {
    rows,
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT id, last_sent_at, unsub_hash FROM site_leads WHERE email')) return { rows: rows.filter((r) => r.email === p[0] && r.sample === p[1]) };
      if (s.startsWith('INSERT INTO site_leads')) {
        const [email, sample, lang, consent, consentAt, consentText, tokenHash, unsubHash, when] = p;
        const cur = rows.find((r) => r.email === email && r.sample === sample);
        if (!cur) rows.push({ id: ++id, email, sample, lang, marketing_consent: consent, consent_at: consentAt, consent_text: consentText, token_hash: tokenHash, unsub_hash: unsubHash, created_at: when, last_sent_at: when, confirmed_at: null, downloads: 0, unsubscribed_at: null });
        else {
          const newly = consent && !cur.marketing_consent;
          Object.assign(cur, { lang, token_hash: tokenHash, unsub_hash: unsubHash, last_sent_at: when });
          if (newly) { cur.consent_at = consentAt; cur.consent_text = consentText; }
          if (consent) cur.unsubscribed_at = null;
          cur.marketing_consent = cur.marketing_consent || consent;
        }
        return { rows: [] };
      }
      if (s.startsWith('SELECT id, sample, last_sent_at FROM site_leads WHERE token_hash')) return { rows: rows.filter((r) => r.token_hash === p[0]) };
      if (s.startsWith('UPDATE site_leads SET confirmed_at')) { const r = rows.find((x) => x.id === p[0]); r.confirmed_at = r.confirmed_at || p[1]; r.downloads++; return { rows: [] }; }
      if (s.startsWith('SELECT email FROM site_leads WHERE unsub_hash')) return { rows: rows.filter((r) => r.unsub_hash === p[0]) };
      if (s.startsWith('UPDATE site_leads SET marketing_consent = FALSE')) { rows.filter((r) => r.email === p[0]).forEach((r) => { r.marketing_consent = false; r.unsubscribed_at = p[1]; }); return { rows: [] }; }
      if (s.startsWith('SELECT email, sample, lang, marketing_consent')) return { rows: rows.slice().reverse() };
      throw new Error('unexpected SQL: ' + s.slice(0, 80));
    }
  };
}

async function world(env = { SITE_SAMPLE_CONSENT_REQUIRED: '0' }) {
  const pool = fakeLeadsPool();
  const mails = [];
  const sendEmail = async (to, subject, text, html) => { mails.push({ to, subject, text, html }); return { sent: true }; };
  sendEmail.configured = true;
  const app = express();
  app.use(express.json());
  const shell = async (req, page) => translateHtml('<html><body><main>' + page.main + '</main></body></html>', await siteDict('site', page.lang));
  mountSamples(app, { siteDir: 'site', shell, pool, initDb: async () => {}, sendEmail, env });
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const post = (body, ip) => fetch(base + '/api/site/samples/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return { pool, mails, base, post, close: () => new Promise((r) => server.close(r)) };
}
const linkIn = (mail, part) => (new RegExp('http://[^\\s"]*/allenamenti/' + part + '/[A-Za-z0-9_-]+').exec(mail.text) || [])[0];

// --- the programs are the app's own, and up to date -----------------------
{
  const built = buildSamples();
  const saved = JSON.parse(fs.readFileSync('site/samples.json', 'utf8'));
  ok('1a. i tre esempi sono programmi del database dell’app, non scritti a mano', JSON.stringify(built) === JSON.stringify(saved) && Object.keys(SAMPLE_IDS).length === 3);
  ok('1b. ogni esempio ha la sua scheda sul sito e il suo PDF', SAMPLES.every((m) => saved[m.slug] && fs.existsSync('site/samples/' + m.slug + '.pdf') && fs.readFileSync('site/samples/' + m.slug + '.pdf').subarray(0, 5).toString() === '%PDF-'));
  ok('1c. tre giorni di ipertrofia, quattro di HYROX per 8 settimane, tre a casa', saved['ipertrofia-3-giorni'].days === 3 && saved['hyrox-8-settimane'].weeks.length === 8 && saved['hyrox-8-settimane'].days === 4 && saved['casa-corpo-libero'].weeks.length === 8);
  ok('1d. i PDF non sono tra i file pubblici del sito', !fs.existsSync('site/assets/samples'));
}

const w = await world();
try {
  // --- pages ---------------------------------------------------------------
  const list = await (await fetch(w.base + '/allenamenti')).text();
  ok('2a. /allenamenti elenca i tre esempi', SAMPLES.every((m) => list.includes('/allenamenti/' + m.slug) && list.includes(m.title)));
  const page = await (await fetch(w.base + '/allenamenti/ipertrofia-3-giorni')).text();
  ok('2b. la pagina mostra la seduta come nell’app, un giorno alla volta', (page.match(/class="app-day"/g) || []).length === 3 && /Full Body A/.test(page) && /class="app-ex-meta"/.test(page) && (page.match(/class="app-day" data-day="\d" hidden/g) || []).length === 2);
  ok('2c. c’è il modulo: email, consenso non preselezionato (qui reso facoltativo), privacy', /id="sample-form"/.test(page) && /type="email"/.test(page) && /<input type="checkbox" name="consent">/.test(page) && page.includes(CONSENT_TEXT) && /privacy/.test(page));
  ok('2d. nessun link diretto al PDF nella pagina', !/\.pdf/.test(page));
  const en = await (await fetch(w.base + '/en/allenamenti/hyrox-8-settimane')).text();
  ok('2e. in inglese i testi sono tradotti, i nomi degli esercizi restano quelli dell’app', /Send me the PDF/.test(en) && /Squat bilanciere/.test(en) && !/Mandami il PDF/.test(en));
  ok('2f. un esempio che non esiste: 404', (await fetch(w.base + '/allenamenti/boh')).status === 404);

  // --- request -------------------------------------------------------------
  ok('3a. un indirizzo non valido è rifiutato', (await w.post({ email: 'non-una-mail', sample: 'ipertrofia-3-giorni' })).status === 400 && w.mails.length === 0);
  ok('3b. un esempio inesistente è rifiutato', (await w.post({ email: 'a@example.com', sample: 'boh' })).status === 404);
  const r1 = await w.post({ email: ' Mario@Example.com ', sample: 'ipertrofia-3-giorni', lang: 'it', consent: false });
  const j1 = await r1.json();
  ok('3c. la richiesta manda una email con il link, e non lo restituisce alla pagina', r1.status === 200 && j1.ok && !j1.link && w.mails.length === 1 && w.mails[0].to === 'mario@example.com' && !!linkIn(w.mails[0], 'scarica'));
  ok('3d. senza casella spuntata non c’è consenso, e la mail non parla di iscrizione', w.pool.rows[0].marketing_consent === false && w.pool.rows[0].consent_at === null && !/disiscrizione/.test(w.mails[0].text));
  ok('3e. nel database c’è solo l’impronta del link, non il link', !w.mails[0].text.includes(w.pool.rows[0].token_hash) && /^[0-9a-f]{64}$/.test(w.pool.rows[0].token_hash));
  await w.post({ email: 'mario@example.com', sample: 'ipertrofia-3-giorni' });
  ok('3f. una seconda richiesta entro un minuto non manda un’altra email', w.mails.length === 1);

  // --- download ------------------------------------------------------------
  const link = linkIn(w.mails[0], 'scarica');
  const dl = await fetch(link);
  const pdf = Buffer.from(await dl.arrayBuffer());
  ok('4a. il link scarica il PDF di quell’esempio', dl.status === 200 && dl.headers.get('content-type') === 'application/pdf' && /nurvan-ipertrofia-3-giorni\.pdf/.test(dl.headers.get('content-disposition')) && pdf.subarray(0, 5).toString() === '%PDF-');
  ok('4b. aprire il link conferma l’indirizzo e conta il download', !!w.pool.rows[0].confirmed_at && w.pool.rows[0].downloads === 1);
  ok('4c. un link inventato non scarica nulla', (await fetch(w.base + '/allenamenti/scarica/' + 'x'.repeat(43))).status === 404);
  ok('4d. dopo 7 giorni il link è scaduto', (await redeemSample(w.pool, link.split('/').pop(), Date.now() + LINK_TTL_MS + 1000)).expired === true);

  // --- consent -------------------------------------------------------------
  await w.post({ email: 'anna@example.com', sample: 'casa-corpo-libero', lang: 'en', consent: true });
  const anna = w.pool.rows.find((r) => r.email === 'anna@example.com');
  const mail2 = w.mails[w.mails.length - 1];
  ok('5a. casella spuntata: consenso registrato con data e testo mostrato', anna.marketing_consent === true && !!anna.consent_at && anna.consent_text === CONSENT_TEXT);
  ok('5b. la mail è nella lingua di chi chiede e ha il link per disiscriversi', /Download the PDF/.test(mail2.text) && !!linkIn(mail2, 'disiscrizione'));
  let leads = await listLeads(w.pool);
  ok('5c. contattabile solo chi ha detto sì E ha aperto il link', leads.every((l) => l.contactable === false));
  await fetch(linkIn(mail2, 'scarica'));
  leads = await listLeads(w.pool);
  ok('5d. dopo il download Anna è contattabile, Mario (nessun consenso) no', leads.find((l) => l.email === 'anna@example.com').contactable === true && leads.find((l) => l.email === 'mario@example.com').contactable === false);
  const csv = leadsCsv(leads);
  ok('5e. l’elenco per la dashboard lo dice riga per riga', /^email,allenamento,lingua,contattabile/.test(csv) && /anna@example\.com,casa-corpo-libero,en,si,si/.test(csv) && /mario@example\.com,ipertrofia-3-giorni,it,no,no/.test(csv));
  const un = await fetch(linkIn(mail2, 'disiscrizione'));
  ok('5f. il link di disiscrizione ritira il consenso', un.status === 200 && anna.marketing_consent === false && !!anna.unsubscribed_at && (await listLeads(w.pool)).every((l) => !l.contactable));
} finally { await w.close(); }

// --- as published: the consent is required ---------------------------------
{
  const strict = await world({});
  try {
    const no = await strict.post({ email: 'b@example.com', sample: 'ipertrofia-3-giorni', consent: false });
    const yes = await strict.post({ email: 'b@example.com', sample: 'ipertrofia-3-giorni', consent: true });
    const page = await (await fetch(strict.base + '/allenamenti/ipertrofia-3-giorni')).text();
    ok('6a. così com’è pubblicato il consenso è obbligatorio: senza casella non parte nulla', no.status === 400 && yes.status === 200 && strict.mails.length === 1 && strict.pool.rows[0].marketing_consent === true);
    ok('6b. la casella è obbligatoria ma mai preselezionata', /<input type="checkbox" name="consent" required>/.test(page) && !/name="consent"[^>]*checked/.test(page));
  } finally { await strict.close(); }
}
ok('7. la mail ha testo e versione grafica con il pulsante', (() => { const m = sampleEmail({ title: 'Ipertrofia in 3 giorni', link: 'https://x/allenamenti/scarica/abc', unsubscribe: 'https://x/u', consent: true }, 'it'); return /Scarica il PDF: https:\/\/x\/allenamenti\/scarica\/abc/.test(m.text) && /href="https:\/\/x\/allenamenti\/scarica\/abc"/.test(m.html) && /https:\/\/x\/u/.test(m.text); })());
ok('8. la tabella dei contatti è una migrazione', /CREATE TABLE IF NOT EXISTS site_leads/.test(fs.readFileSync('server/db/migrations/0021_site_leads.sql', 'utf8')));

console.log('');
if (failed) { console.log(failed + ' controlli degli allenamenti di esempio falliti.'); process.exit(1); }
console.log('Tutti i controlli degli allenamenti di esempio passano.');
