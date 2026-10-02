// Sharing a program with a code: anyone can send, only a paid plan receives,
// nothing personal travels, and a code is hard to guess and easy to type.
// The real module, with a database kept in memory.
import fs from 'node:fs';
import http from 'node:http';
import express from 'express';
import { mountProgramShare, shareableProgram, normalizeShareCode, formatShareCode, newShareCode, createShare, readShare, SHARE_TTL_MS } from './server/program/share.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

function fakePool() {
  const rows = [];
  return {
    rows,
    async query(sql, p = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT code FROM program_shares WHERE owner_user_id')) return { rows: rows.filter((r) => r.owner_user_id === p[0] && r.content_hash === p[1]) };
      if (s.startsWith('UPDATE program_shares SET expires_at')) { rows.find((r) => r.code === p[0]).expires_at = p[1]; return { rows: [] }; }
      if (s.startsWith('SELECT COUNT(*)::int AS n FROM program_shares')) return { rows: [{ n: rows.filter((r) => r.owner_user_id === p[0] && r.expires_at > p[1]).length }] };
      if (s.startsWith('INSERT INTO program_shares')) {
        if (rows.some((r) => r.code === p[0])) return { rows: [] };
        rows.push({ code: p[0], owner_user_id: p[1], title: p[2], kind: p[3], program: p[4], content_hash: p[5], created_at: p[6], expires_at: p[7], uses: 0, last_used_at: null });
        return { rows: [{ code: p[0] }] };
      }
      if (s.startsWith('SELECT code, owner_user_id, title, kind, program, expires_at FROM program_shares')) return { rows: rows.filter((r) => r.code === p[0]) };
      if (s.startsWith('UPDATE program_shares SET uses')) { const r = rows.find((x) => x.code === p[0]); r.uses++; r.last_used_at = p[1]; return { rows: [] }; }
      throw new Error('unexpected SQL: ' + s.slice(0, 80));
    }
  };
}
const program = () => ({
  id: 'custom_1', title: 'Forza 3 giorni',
  weeks: [{ week_number: 1, sessions: [{ name: 'A', exercises: [{ name: 'Squat', setCount: 3, repsTarget: '5' }] }] }],
  progression: { model: 'linear', maxes: { Squat: 140 } },
  nutrition: { days: [{ day: 'Lunedì' }] }, therapy: { medications: [{ name: 'x' }] }, exams: { records: [1] }, supplementation: { items: [1] },
  space: { name: 'Casa mia' }
});

// --- what travels ----------------------------------------------------------
{
  const p = shareableProgram(program());
  ok('1a. viaggia la scheda: settimane e titolo', p.weeks.length === 1 && p.title === 'Forza 3 giorni');
  ok('1b. non viaggiano alimentazione, integrazione, terapia, esami, luogo e massimali', !p.nutrition && !p.supplementation && !p.therapy && !p.exams && !p.space && p.progression.model === 'linear' && p.progression.maxes === undefined);
  let threw = 0;
  for (const bad of [null, {}, { weeks: [] }, { weeks: [{ sessions: [] }] }]) { try { shareableProgram(bad); } catch (e) { if (e.statusCode === 400) threw++; } }
  ok('1c. un programma vuoto non si condivide', threw === 4);
}
// --- the code ---------------------------------------------------------------
{
  const codes = new Set(Array.from({ length: 500 }, newShareCode));
  ok('2a. 8 caratteri, senza 0/O e 1/I/L, diversi tra loro', [...codes].every((c) => /^[2-9A-HJKMNP-Z]{8}$/.test(c)) && codes.size === 500);
  ok('2b. si scrive come viene: minuscole, spazi, con o senza NV-', normalizeShareCode(' nv-7k3m 9qxd ') === '7K3M9QXD' && normalizeShareCode('7K3M-9QXD') === '7K3M9QXD' && formatShareCode('7k3m9qxd') === 'NV-7K3M-9QXD');
}
// --- store ------------------------------------------------------------------
{
  const pool = fakePool();
  const a = await createShare(pool, 1, program(), { now: 1000 });
  const again = await createShare(pool, 1, program(), { now: 2000 });
  ok('3a. lo stesso programma condiviso di nuovo tiene lo stesso codice', a.code === again.code && pool.rows.length === 1);
  const other = await createShare(pool, 2, program(), { now: 1000 });
  ok('3b. un altro account ha il suo codice', other.code !== a.code);
  const got = await readShare(pool, 'nv-' + a.code.toLowerCase(), 3000);
  ok('3c. il codice restituisce il programma e conta l’uso', got.title === 'Forza 3 giorni' && got.program.weeks.length === 1 && pool.rows[0].uses === 1);
  let status = 0;
  try { await readShare(pool, a.code, 2000 + SHARE_TTL_MS + 1); } catch (e) { status = e.statusCode; }
  ok('3d. dopo 30 giorni il codice è scaduto', status === 410);
  status = 0;
  try { await readShare(pool, 'ZZZZZZZZ', 3000); } catch (e) { status = e.statusCode; }
  ok('3e. un codice inventato non trova nulla', status === 404);
}
// --- routes: who may do what -------------------------------------------------
{
  const pool = fakePool();
  const plans = { free: { plan: 'free' }, paid: { plan: 'standard' }, athleteOfCoach: { plan: 'free', coachLink: { active: true, seatInactive: false, coachPlan: 'coach' } } };
  const app = express();
  app.use(express.json({ limit: '5mb' }));
  mountProgramShare(app, {
    pool, initDb: async () => {},
    accountFromBearer: async (h) => { const k = String(h || '').replace('Bearer ', ''); return plans[k] ? { id: Object.keys(plans).indexOf(k) + 1, key: k } : null; },
    entitlementOf: async (_pool, auth) => plans[auth.key]
  });
  const server = http.createServer(app);
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port;
  const call = (method, path, who, body) => fetch(base + path, { method, headers: Object.assign({ 'Content-Type': 'application/json' }, who ? { Authorization: 'Bearer ' + who } : {}), body: body ? JSON.stringify(body) : undefined });
  try {
    ok('4a. senza accesso non si condivide', (await call('POST', '/api/programs/share', null, { program: program() })).status === 401);
    const sent = await call('POST', '/api/programs/share', 'free', { program: program(), kind: 'pesi' });
    const sj = await sent.json();
    ok('4b. un account gratuito può condividere', sent.status === 200 && /^NV-[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(sj.code));
    const stored = JSON.parse(pool.rows[0].program);
    ok('4c. sul server arriva solo la scheda', !stored.nutrition && !stored.therapy && !stored.exams && !(stored.progression && stored.progression.maxes));
    const refused = await call('GET', '/api/programs/shared/' + sj.code, 'free');
    const rj = await refused.json();
    ok('4d. un account gratuito non può ricevere: lo dice il server', refused.status === 403 && rj.needPlan === 'standard' && !rj.program);
    const got = await call('GET', '/api/programs/shared/' + sj.code, 'paid');
    const gj = await got.json();
    ok('4e. un account a pagamento riceve il programma', got.status === 200 && gj.program.weeks.length === 1 && gj.title === 'Forza 3 giorni');
    ok('4f. anche l’atleta di un coach riceve (piano ereditato)', (await call('GET', '/api/programs/shared/' + sj.code, 'athleteOfCoach')).status === 200);
    ok('4g. un programma non valido è rifiutato', (await call('POST', '/api/programs/share', 'free', { program: { weeks: [] } })).status === 400);
  } finally { await new Promise((r) => server.close(r)); }
}
// --- app --------------------------------------------------------------------
{
  const html = fs.readFileSync('web/index.base.html', 'utf8');
  ok('5a. nell’app: condividi il programma attivo, condividi da «Programmi creati», campo per il codice', /shareProgramById\(\\'\\'\)/.test(html) && /onclick="shareProgramById\(/.test(html) && /id="share-code-input"/.test(html) && /function receiveSharedProgram/.test(html));
  ok('5b. chi riceve è controllato anche nell’app, e il programma finisce tra i salvati senza attivarsi', /requirePlan\('program_share_receive'\)/.test(html) && /await deliverProgram\(prog, 'save'/.test(html));
  ok('5c. la tabella è una migrazione', /CREATE TABLE IF NOT EXISTS program_shares/.test(fs.readFileSync('server/db/migrations/0022_program_shares.sql', 'utf8')));
}

console.log('');
if (failed) { console.log(failed + ' controlli della condivisione falliti.'); process.exit(1); }
console.log('Tutti i controlli della condivisione passano.');
