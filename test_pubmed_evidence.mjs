// The "Evidenze" search (GET /api/evidence/search): it answers with the studies found on PubMed, the question goes out through
// our server and only the typed words leave, a bad or empty question is refused, PubMed being down gives a clear message.
import fs from 'node:fs';
import http from 'node:http';
import express from 'express';
import { searchPubMed, normalizeStudy, studyTypeOf, mountEvidenceRoutes } from './server/evidence/pubmed.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

const ESEARCH = { esearchresult: { idlist: ['111', '222', '333'] } };
const ESUMMARY = { result: {
  uids: ['111', '222', '333'],
  111: { uid: '111', title: 'Resistance training volume and hypertrophy: a meta-analysis.', fulljournalname: 'Sports Medicine', pubdate: '2017 Jun', pubtype: ['Journal Article', 'Meta-Analysis'] },
  222: { uid: '222', title: 'Effects of rest intervals.', source: 'J Strength Cond Res', pubdate: '2016', pubtype: ['Randomized Controlled Trial', 'Journal Article'] },
  333: { uid: '333', title: '', pubdate: '2020' }
} };
const calls = [];
const fakeFetch = async (url) => {
  calls.push(String(url));
  if (/esearch/.test(url)) return { ok: true, json: async () => ESEARCH };
  return { ok: true, json: async () => ESUMMARY };
};

ok('1a. la prova più forte vince sul tipo (meta-analisi, studio randomizzato, articolo)', studyTypeOf(['Journal Article', 'Meta-Analysis']) === 'Meta-Analysis' && studyTypeOf(['Journal Article', 'Randomized Controlled Trial']) === 'Randomized Controlled Trial' && studyTypeOf(['Journal Article']) === 'Journal Article' && studyTypeOf([]) === '');
const s = normalizeStudy(ESUMMARY.result[111]);
ok('1b. titolo, rivista, anno, tipo e link a PubMed', s.pmid === '111' && /meta-analysis/.test(s.title) && s.journal === 'Sports Medicine' && s.year === '2017' && s.studyType === 'Meta-Analysis' && s.url === 'https://pubmed.ncbi.nlm.nih.gov/111/');
ok('1c. un risultato senza titolo si scarta', normalizeStudy(ESUMMARY.result[333]) === null && normalizeStudy(null) === null);

const found = await searchPubMed('  resistance   training volume ', 6, fakeFetch, {});
ok('2a. restituisce gli studi con titolo, in ordine di rilevanza', found.length === 2 && found[0].pmid === '111' && found[1].pmid === '222');
ok('2b. chiede a PubMed prima l’elenco e poi i dettagli, con lo strumento Nurvan e senza dati dell’utente', /esearch\.fcgi\?db=pubmed/.test(calls[0]) && /sort=relevance/.test(calls[0]) && /term=resistance%20training%20volume/.test(calls[0]) && /esummary\.fcgi/.test(calls[1]) && /tool=nurvan/.test(calls[0]) && !/account|email=|token/i.test(calls[0].replace(/tool=nurvan/, '')));
let err = null;
try { await searchPubMed('ab', 6, fakeFetch, {}); } catch (e) { err = e; }
ok('2c. meno di 3 caratteri: rifiutata', err && err.status === 400);
const none = await searchPubMed('zzzzzz', 6, async () => ({ ok: true, json: async () => ({ esearchresult: { idlist: [] } }) }), {});
ok('2d. nessun risultato: elenco vuoto', Array.isArray(none) && none.length === 0);
err = null;
try { await searchPubMed('creatine', 6, async () => ({ ok: false, status: 503 }), {}); } catch (e) { err = e; }
ok('2e. PubMed che non risponde: messaggio chiaro', err && err.status === 502 && /PubMed non risponde/.test(err.message));
err = null;
try { await searchPubMed('creatine', 6, async () => { throw new Error('boom'); }, {}); } catch (e) { err = e; }
ok('2f. rete che cade: stesso messaggio', err && err.status === 502);
calls.length = 0;
await searchPubMed('x'.repeat(500), 99, fakeFetch, { NCBI_EMAIL: 'a@b.it', NCBI_API_KEY: 'k' });
ok('2g. domanda tagliata a 200 caratteri, al massimo 10 risultati, email e chiave solo se configurate', /term=x{200}(&|$)/.test(calls[0]) && !/term=x{201}/.test(calls[0]) && /retmax=10/.test(calls[0]) && /email=a%40b\.it/.test(calls[0]) && /api_key=k/.test(calls[0]));

// --- the route ------------------------------------------------------------------------------
const app = express();
let clock = 1000000;
let upstream = 0;
mountEvidenceRoutes(app, { fetchImpl: async (u) => { upstream++; return fakeFetch(u); }, now: () => clock });
const server = http.createServer(app);
await new Promise((r) => server.listen(0, r));
const base = 'http://127.0.0.1:' + server.address().port;
const get = async (path) => { const r = await fetch(base + path); return { status: r.status, json: await r.json() }; };
let r = await get('/api/evidence/search?q=resistance%20training&limit=6');
ok('3a. la rotta risponde { ok, studies } come si aspetta la pagina', r.status === 200 && r.json.ok === true && r.json.studies.length === 2 && r.json.studies[0].url.startsWith('https://pubmed.ncbi.nlm.nih.gov/'));
const before = upstream;
r = await get('/api/evidence/search?q=Resistance%20Training&limit=6');
ok('3b. la stessa domanda entro dieci minuti viene dalla memoria', r.json.cached === true && upstream === before);
clock += 11 * 60000;
r = await get('/api/evidence/search?q=resistance%20training&limit=6');
ok('3c. dopo dieci minuti si chiede di nuovo', !r.json.cached && upstream > before);
r = await get('/api/evidence/search?q=a');
ok('3d. una domanda troppo corta dà 400 con il motivo', r.status === 400 && /almeno 3/.test(r.json.error));
let last = 200;
for (let i = 0; i < 25; i++) { last = (await get('/api/evidence/search?q=creatine%20' + i)).status; }
ok('3e. oltre 20 ricerche al minuto dallo stesso indirizzo: 429', last === 429);
server.close();

const idx = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const api = fs.readFileSync('coach-api.mjs', 'utf8').replace(/\r\n/g, '\n');
ok('4a. la pagina chiama /api/evidence/search e legge data.studies', /\/api\/evidence\/search\?q=/.test(idx) && /data\.studies/.test(idx));
ok('4b. il server monta la rotta', /mountEvidenceRoutes\(app\)/.test(api));

console.log(failed ? '\n' + failed + ' FAILED' : '\nAll good.');
process.exit(failed ? 1 : 0);
