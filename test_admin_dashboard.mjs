// Dashboard di amministrazione: accesso, pagine, privacy.
//
// Le route /api/admin/* e la pagina /admin girano qui su un vero server
// Express locale, con un database finto in memoria (solo le query che la
// dashboard fa) e l'invio email catturato. Si prova: login con email della
// lista + codice, rifiuto per le altre, sessione di 12 ore in cookie HttpOnly,
// audit di ogni richiesta, assegnazione di un piano con l'email di chi la fa
// nel log, numeri calcolati dal server, catalogo che riscrive food-staples.json
// (su una copia), nessun campo sensibile nelle risposte, la pagina separata
// dall'app.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import express from 'express';
import { fileURLToPath } from 'node:url';
import { mountAdminDashboard } from './server/admin/index.mjs';
import { sessionFromRequest, codeHash } from './server/admin/auth.mjs';
import { metrics, customFoods, recentErrors } from './server/admin/queries.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
function eq(actual, expected, message) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(expected);
  if (a === b) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message + '\n     atteso ' + b + ', ottenuto ' + a);
}

const DAY = 86400000;
const NOW = Date.now();
const iso = (ms) => new Date(ms).toISOString();

/* ---------------- in-memory database: only what the dashboard asks ---------------- */
const db = {
  codes: new Map(),
  sessions: new Map(),
  audit: [],
  history: [],
  users: [
    { id: 1, email: 'owner@example.com', name: 'Owner', plan: 'free', plan_source: 'manual', plan_until: null, seats: null, trial_until: null, trial_used_at: null, last_seen: iso(NOW - DAY), is_coach: false, athletes: 0, coach_email: null },
    { id: 2, email: 'atleta@example.com', name: 'Atleta', plan: 'free', plan_source: 'manual', plan_until: null, seats: null, trial_until: null, trial_used_at: null, last_seen: iso(NOW - 2 * DAY), is_coach: false, athletes: 0, coach_email: 'coach@example.com' }
  ]
};
function q(sql, params = []) {
  const s = sql.replace(/\s+/g, ' ').trim();
  if (/^SELECT created_at FROM admin_login_codes/.test(s)) return rows(db.codes.has(params[0]) ? [db.codes.get(params[0])] : []);
  if (/^INSERT INTO admin_login_codes/.test(s)) { db.codes.set(params[0], { code_hash: params[1], expires_at: params[2], attempts: 0, created_at: params[3] }); return rows([]); }
  if (/^SELECT code_hash, expires_at, attempts FROM admin_login_codes/.test(s)) return rows(db.codes.has(params[0]) ? [db.codes.get(params[0])] : []);
  if (/^UPDATE admin_login_codes SET attempts/.test(s)) { const c = db.codes.get(params[0]); if (c) c.attempts++; return rows([]); }
  if (/^DELETE FROM admin_login_codes/.test(s)) { db.codes.delete(params[0]); return rows([]); }
  if (/^INSERT INTO admin_sessions/.test(s)) { db.sessions.set(params[0], { email: params[1], expires_at: params[3], revoked_at: null }); return rows([]); }
  if (/^SELECT email, expires_at, revoked_at FROM admin_sessions/.test(s)) return rows(db.sessions.has(params[0]) ? [db.sessions.get(params[0])] : []);
  if (/^UPDATE admin_sessions SET revoked_at/.test(s)) { const x = db.sessions.get(params[0]); if (x) x.revoked_at = iso(Date.now()); return rows([]); }
  if (/^INSERT INTO admin_audit/.test(s)) { db.audit.push({ actor: params[0], action: params[1], target: params[2], detail: JSON.parse(params[3]) }); return rows([]); }
  if (/^SELECT plan FROM app_users WHERE id = \$1 FOR UPDATE/.test(s)) { const u = db.users.find((x) => String(x.id) === String(params[0])); return rows(u ? [{ plan: u.plan }] : []); }
  if (/^UPDATE app_users SET plan = \$2/.test(s)) { const u = db.users.find((x) => String(x.id) === String(params[0])); Object.assign(u, { plan: params[1], plan_source: params[2], plan_until: params[3], seats: params[4] }); return rows([]); }
  if (/^INSERT INTO app_plan_history/.test(s)) { db.history.push({ user_id: params[0], from_plan: params[1], to_plan: params[2], source: params[3], note: params[6], actor: params[7] }); return rows([]); }
  if (/^SELECT plan, plan_source, plan_until, seats, trial_until, trial_used_at FROM app_users WHERE id/.test(s)) { const u = db.users.find((x) => String(x.id) === String(params[0])); return rows(u ? [u] : []); }
  if (/FROM app_users u WHERE \(\$1 = '' OR LOWER\(u.email\) LIKE \$2\)/.test(s)) return rows(db.users.filter((u) => !params[0] || u.email.includes(params[0])));
  if (/FROM app_plan_history WHERE user_id/.test(s)) return rows(db.history.filter((h) => String(h.user_id) === String(params[0])));
  if (/FROM app_plan_history h JOIN app_users/.test(s)) return rows(db.history.map((h) => ({ ...h, email: db.users.find((u) => String(u.id) === String(h.user_id)).email, changed_at: iso(NOW) })));
  if (/^BEGIN|^COMMIT|^ROLLBACK/.test(s)) return rows([]);
  throw new Error('query not in the fake: ' + s.slice(0, 120));
}
function rows(r) { return { rows: r }; }
const pool = {
  async query(sql, params) { return q(sql, params); },
  async connect() { return { query: async (sql, params) => q(sql, params), release() {} }; }
};

/* ---------------- server ---------------- */
const mails = [];
const sendEmail = async (to, subject, text) => { mails.push({ to, subject, text }); return { sent: true }; };
Object.defineProperty(sendEmail, 'configured', { get: () => true });
const noMail = async () => ({ sent: false });
Object.defineProperty(noMail, 'configured', { get: () => false });
const env = { ADMIN_EMAILS: 'Owner@Example.com', NURVAN_ADMIN_TOKEN: 'k'.repeat(32) };
const SECRET = 'test-secret';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nurvan-admin-'));
const staples = path.join(tmp, 'food-staples.json');
fs.copyFileSync(path.join(root, 'food-staples.json'), staples);

function makeServer(mail) {
  const app = express();
  app.use(express.json());
  mountAdminDashboard(app, { pool, initDb: async () => {}, sendEmail: mail, secret: SECRET, env, staplesPath: staples });
  return new Promise((resolve) => { const srv = app.listen(0, () => resolve(srv)); });
}
const srv = await makeServer(sendEmail);
const base = 'http://127.0.0.1:' + srv.address().port;
async function call(route, { method = 'GET', body, cookie, headers = {} } = {}) {
  const res = await fetch(base + route, {
    method,
    headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}), ...headers },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch (_) {}
  return { status: res.status, json, text, headers: res.headers };
}

try {
  /* ---------------- access ---------------- */
  {
    const other = await call('/api/admin/login/start', { method: 'POST', body: { email: 'intruso@example.com' } });
    eq([other.status, mails.length, db.codes.size], [200, 0, 0], 'email not in ADMIN_EMAILS: same answer, no code, no email');
    const guess = await call('/api/admin/login/verify', { method: 'POST', body: { email: 'intruso@example.com', code: '123456' } });
    eq(guess.status, 401, 'email not in ADMIN_EMAILS: login refused');

    const srvNoMail = await makeServer(noMail);
    const r = await fetch('http://127.0.0.1:' + srvNoMail.address().port + '/api/admin/login/start', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: 'owner@example.com' }) });
    eq(r.status, 503, 'no email channel configured: said plainly, for every address');
    srvNoMail.close();

    const start = await call('/api/admin/login/start', { method: 'POST', body: { email: 'OWNER@example.com' } });
    const code = (mails[0] && mails[0].text.match(/\b(\d{6})\b/) || [])[1];
    ok('admin email: a 6-digit code by email', start.status === 200 && mails.length === 1 && mails[0].to === 'owner@example.com' && !!code);
    ok('the code is stored as a hash only', db.codes.get('owner@example.com').code_hash === codeHash(SECRET, 'owner@example.com', code) && !JSON.stringify([...db.codes.values()]).includes(code));
    const again = await call('/api/admin/login/start', { method: 'POST', body: { email: 'owner@example.com' } });
    eq(again.status, 429, 'a second code within a minute: wait');
    const wrong = await call('/api/admin/login/verify', { method: 'POST', body: { email: 'owner@example.com', code: code === '000000' ? '111111' : '000000' } });
    eq([wrong.status, db.codes.get('owner@example.com').attempts], [401, 1], 'wrong code: refused and counted');
    const good = await call('/api/admin/login/verify', { method: 'POST', body: { email: 'owner@example.com', code } });
    const cookieHeader = good.headers.get('set-cookie') || '';
    ok('right code: in, with an HttpOnly, SameSite=Strict, 12-hour cookie', good.status === 200 && /HttpOnly/.test(cookieHeader) && /SameSite=Strict/.test(cookieHeader) && /Max-Age=43200/.test(cookieHeader));
    ok('the code is used once', !db.codes.has('owner@example.com'));
    const cookie = cookieHeader.split(';')[0];
    globalThis.__cookie = cookie;
    const sess = await call('/api/admin/session', { cookie });
    eq([sess.status, sess.json && sess.json.email], [200, 'owner@example.com'], 'the session opens the dashboard');
    ok('sessions are stored as hashes', ![...db.sessions.keys()].some((k) => cookie.includes(k)));

    const token = decodeURIComponent(cookie.split('=')[1]);
    const req = { headers: { cookie: 'nurvan_admin=' + encodeURIComponent(token) } };
    ok('11 h 59 later: still in', !!(await sessionFromRequest(pool, req, { env, now: Date.now() + 12 * 3600000 - 60000 })));
    ok('12 h later: out', (await sessionFromRequest(pool, req, { env, now: Date.now() + 12 * 3600000 + 1000 })) === null);
    ok('email taken out of ADMIN_EMAILS: out at once', (await sessionFromRequest(pool, req, { env: { ADMIN_EMAILS: 'someone@else.it' } })) === null);

    const tokenOnly = await call('/api/admin/session', { headers: { 'X-Admin-Token': env.NURVAN_ADMIN_TOKEN } });
    eq(tokenOnly.status, 401, 'the CLI token does not open the dashboard');
    const cli = await call('/api/admin/accounts', { headers: { 'X-Admin-Token': env.NURVAN_ADMIN_TOKEN } });
    eq(cli.status, 200, 'the CLI token still works for the script');
    eq((await call('/api/admin/accounts')).status, 401, 'no session, no token: 401');
  }

  /* ---------------- plan assignment, audit, plan log ---------------- */
  {
    const cookie = globalThis.__cookie;
    const noHeader = await call('/api/admin/accounts/2/plan', { method: 'POST', cookie, body: { plan: 'standard' } });
    eq(noHeader.status, 403, 'a change without the dashboard header: refused');
    const foreign = await call('/api/admin/accounts/2/plan', { method: 'POST', cookie, body: { plan: 'standard' }, headers: { 'X-Nurvan-Admin': '1', Origin: 'https://evil.example' } });
    eq(foreign.status, 403, 'a change from another origin: refused');
    const set = await call('/api/admin/accounts/2/plan', { method: 'POST', cookie, body: { plan: 'standard', note: 'prova dashboard' }, headers: { 'X-Nurvan-Admin': '1' } });
    eq([set.status, set.json.account.plan, set.json.entitlement.effective.plan], [200, 'standard', 'standard'], 'Standard assigned: the app reads it from the entitlement');
    eq([db.history.at(-1).to_plan, db.history.at(-1).actor, db.history.at(-1).note], ['standard', 'owner@example.com', 'prova dashboard'], 'plan log: the row carries my email');
    const log = await call('/api/admin/plan-log', { cookie });
    ok('plan log page: who, when, from, to, note', log.json.log.some((r) => r.actor === 'owner@example.com' && r.from === 'free' && r.to === 'standard' && r.note === 'prova dashboard' && r.at));
    const audited = db.audit.filter((a) => a.actor === 'owner@example.com');
    ok('audit: login, reads and the change, with who and what', audited.some((a) => a.action === 'LOGIN') && audited.some((a) => a.action === 'POST /api/admin/accounts/:id/plan' && a.target === '2' && a.detail.body.plan === 'standard') && audited.some((a) => a.action === 'GET /api/admin/plan-log'));
    ok('audit: refused logins too', db.audit.some((a) => a.action === 'LOGIN_REFUSED' && a.actor === 'intruso@example.com'));
    ok('audit: the CLI appears as cli-token', db.audit.some((a) => a.actor === 'cli-token'));
    const acc = await call('/api/admin/accounts?q=atleta', { cookie });
    eq(Object.keys(acc.json.accounts[0]).sort(), ['athletes', 'coachEmail', 'effectivePlan', 'email', 'id', 'isCoach', 'lastSeenAt', 'name', 'plan', 'planSource', 'planUntil', 'seats', 'seatsEffective', 'status', 'trialUntil', 'trialUsedAt'].sort(), 'accounts: plan, origin, expiry, seats, last access, linked coach, nothing else');
    const out = await call('/api/admin/logout', { method: 'POST', cookie });
    ok('logout: the session is revoked', out.status === 200 && (await call('/api/admin/session', { cookie })).status === 401);
  }

  /* ---------------- catalog ---------------- */
  {
    const login = async () => {
      db.codes.clear();
      mails.length = 0;
      await call('/api/admin/login/start', { method: 'POST', body: { email: 'owner@example.com' } });
      const code = mails[0].text.match(/\b(\d{6})\b/)[1];
      const res = await call('/api/admin/login/verify', { method: 'POST', body: { email: 'owner@example.com', code } });
      return res.headers.get('set-cookie').split(';')[0];
    };
    const cookie = await login();
    const before = fs.readFileSync(staples, 'utf8');
    const cat = await call('/api/admin/catalog', { cookie });
    const skyr = cat.json.rows.find((r) => r.name === 'Skyr');
    ok('catalog: the Nurvan entries with their values (Skyr among them)', cat.json.rows.length === 43 && skyr && skyr.kcal === 63 && cat.json.regenerate === false);
    const put = await call('/api/admin/catalog/' + skyr.id, { method: 'PUT', cookie, body: { kcal: 66 }, headers: { 'X-Nurvan-Admin': '1' } });
    const after = fs.readFileSync(staples, 'utf8');
    const changed = before.split('\n').map((l, i) => (l !== after.split('\n')[i] ? l.trim() + ' -> ' + after.split('\n')[i].trim() : null)).filter(Boolean);
    eq(changed, ['"kcal": 63, -> "kcal": 66,'], 'Skyr kcal 63 -> 66: food-staples.json changes on that line only');
    ok('the answer says to regenerate', put.json.regenerate === true && /Rigenera/.test(put.json.message));
    const cat2 = await call('/api/admin/catalog', { cookie });
    ok('the catalog page marks it «da rigenerare»', cat2.json.regenerate === true && cat2.json.rows.find((r) => r.id === skyr.id).stale === true);
    eq((await call('/api/admin/catalog/food_Bevande_0', { method: 'PUT', cookie, body: { kcal: 1 }, headers: { 'X-Nurvan-Admin': '1' } })).status, 400, 'a CREA entry is not editable here');
    eq((await call('/api/admin/catalog/' + skyr.id, { method: 'PUT', cookie, body: { kcal: 5000 }, headers: { 'X-Nurvan-Admin': '1' } })).status, 400, 'impossible values refused');
    const file = await call('/api/admin/catalog/file', { cookie });
    ok('the edited file can be downloaded', file.status === 200 && /attachment/.test(file.headers.get('content-disposition')) && file.text.includes('"kcal": 66'));
    ok('the real food-staples.json is untouched by this test', read('food-staples.json').includes('"name": "Skyr"') && /"name": "Skyr",[\s\S]{0,120}"kcal": 63,/.test(read('food-staples.json')));
  }

  /* ---------------- static page ---------------- */
  {
    const page = await call('/admin');
    ok('/admin serves the page with a strict policy, no frames, no cache, no index', page.status === 200 && /script-src 'self'/.test(page.headers.get('content-security-policy')) && page.headers.get('x-frame-options') === 'DENY' && page.headers.get('cache-control') === 'no-store' && /noindex/.test(page.headers.get('x-robots-tag')));
    const js = await call('/admin/admin.js');
    ok('/admin/admin.js served as JavaScript', js.status === 200 && /javascript/.test(js.headers.get('content-type')));
  }
} finally {
  srv.close();
}

/* ---------------- numbers: computed on the server ---------------- */
{
  const fake = {
    async query(sql) {
      const s = sql.replace(/\s+/g, ' ');
      if (/AS d7, COUNT\(\*\) FILTER \(WHERE s.seen/.test(s)) return rows([{ d7: 3, d30: 5 }]);
      if (/d.data->'logs'/.test(s)) return rows([{ t: iso(NOW - DAY) }, { t: iso(NOW - 10 * DAY) }, { t: iso(NOW - 40 * DAY) }, { t: 'rotto' }, { t: null }]);
      if (/importLog/.test(s)) return rows([{ t: iso(NOW - 2 * DAY) }, { t: iso(NOW - 20 * DAY) }]);
      if (/FROM coach_check_ins WHERE received_at IS NOT NULL/.test(s)) return rows([{ d7: 1, d30: 4 }]);
      if (/SELECT plan, plan_until, seats, trial_until FROM app_users/.test(s)) return rows([
        { plan: 'free' }, { plan: 'standard' }, { plan: 'coach' }, { plan: 'coach', plan_until: iso(NOW - 10 * DAY) }, { plan: 'free', trial_until: iso(NOW + 3 * DAY) }
      ]);
      throw new Error('unexpected ' + s.slice(0, 80));
    }
  };
  const m = await metrics(fake, { now: NOW });
  eq([m.active, m.sessions, m.imports, m.checkIns], [{ d7: 3, d30: 5 }, { d7: 1, d30: 2 }, { d7: 1, d30: 2 }, { d7: 1, d30: 4 }], 'numbers: active, sessions (bad dates ignored), imports, check-ins in 7 and 30 days');
  eq([m.plans.assigned, m.plans.effective], [{ free: 2, standard: 1, coach: 2, coach_pro: 0 }, { free: 2, standard: 1, coach: 2, coach_pro: 0 }], 'accounts per plan: assigned and in force (expired coach -> free, trial -> coach)');
}

/* ---------------- privacy ---------------- */
{
  const src = read('server/admin/queries.mjs');
  const FORBIDDEN = ["'notes'", "'weight'", "'photo", "'meals'", "'diary'", "'therapy'", "'exams'", "'answers'", "'attachment'", "'analysis'", "'front'", "'back'", "'side'"];
  eq(FORBIDDEN.filter((k) => src.includes(k)), [], 'no query reads notes, weight, photos, meals, therapy, exams, answers or attachments');
  ok('account data read only as dates and send states', !/SELECT d\.data\b|SELECT data FROM app_account_data/.test(src));
  ok('no route returns the account data blob', !/data: /.test(read('server/admin/index.mjs')));
  let captured = '';
  await customFoods({ async query(sql, params) { captured = sql + JSON.stringify(params); return rows([{ name: 'barretta x', accounts: 3 }]); } });
  ok('hand-added foods: names and counts, at least 2 accounts, never who', /COUNT\(DISTINCT f\.user_id\)/.test(captured) && /HAVING COUNT\(DISTINCT f\.user_id\) >= \$1/.test(captured) && captured.includes('[2,') && !/email/.test(captured));
  const errs = await recentErrors({
    async query(sql) {
      if (/FROM app_events/.test(sql)) return rows([{ at: iso(NOW - DAY), kind: 'import_failed', email: 'a@b.it', detail: { route: '/api/ingest/document', status: 500, format: 'pdf', message: 'Bad header' } }]);
      return rows([{ email: 'a@b.it', kind: 'scheduled', state: 'FAILED', failed_at: iso(NOW - 2 * DAY), at: iso(NOW - 2 * DAY) }, { email: 'c@d.it', kind: null, state: 'QUEUED', failed_at: null, at: iso(NOW - 60 * DAY) }]);
    }
  }, { now: NOW });
  eq([errs.server[0].format, errs.server[0].message, errs.app.length, errs.app[0].kind, Object.keys(errs.app[0]).sort()], ['pdf', 'Bad header', 1, 'check-in', ['at', 'email', 'kind', 'state']], 'errors: format and message; app sends as state and date only, last 30 days');
  const act = read('server/admin/activity.mjs');
  ok('server events keep route, status, format, message: never the file name or content', /route:/.test(act) && /format:/.test(act) && !/originalname|buffer|filename:/.test(act));
}

/* ---------------- separate from the app ---------------- */
{
  const js = read('admin/admin.js');
  const html = read('admin/index.html');
  ok('the dashboard imports nothing from the app', !/from ['"][^'"]*web\//.test(js) && !/src="[^"]*web\//.test(html) && !/index\.base/.test(js));
  ok('the app does not know the dashboard', !read('web/index.base.html').includes('/admin/') && !read('web/sw.js').includes('admin'));
  ok('data enter the page as text only', !/innerHTML/.test(js));
  ok('no inline handlers (the policy would block them)', !/ on[a-z]+="/.test(html));
  ok('375 px: the page never scrolls sideways, tables scroll in their box', /body \{ overflow-x: hidden; \}/.test(html) && /\.tbl \{ overflow-x: auto; max-width: 100%;/.test(html) && /table \{[^}]*min-width: 640px/.test(html));
  const api = read('coach-api.mjs');
  ok('one email channel: reset codes and admin codes', /async function sendEmail\(to, subject, text\)/.test(api) && /return sendEmail\(\s*email,/.test(api) && api.includes('mountAdminDashboard(app, { pool, initDb, sendEmail, secret: JWT_SECRET });'));
  ok('last access stamped by the server on account read/sync, client/me, coach status', (api.match(/touchLastSeen\(pool, auth\.id\)/g) || []).length === 2 && read('coach-practice.mjs').includes('touchLastSeen(pool, ctx.auth.id)') && read('coach-practice.mjs').includes('touchLastSeen(pool, auth.id)'));
  ok('failures recorded: sync, check-in send, document import', /recordEvent\(pool, "sync_failed"/.test(api) && /recordEvent\(pool, "import_failed"/.test(api) && read('coach-practice.mjs').includes('recordEvent(pool, "checkin_failed"'));
  const mig = read('server/db/migrations/0016_admin_dashboard.sql');
  ok('migration: last access, events, codes, sessions, audit', ['ADD COLUMN IF NOT EXISTS last_seen_at', 'CREATE TABLE IF NOT EXISTS app_events', 'CREATE TABLE IF NOT EXISTS admin_login_codes', 'CREATE TABLE IF NOT EXISTS admin_sessions', 'CREATE TABLE IF NOT EXISTS admin_audit'].every((x) => mig.includes(x)));
}

fs.rmSync(tmp, { recursive: true, force: true });
if (failed) {
  console.log('\n' + failed + ' FAIL');
  process.exit(1);
}
console.log('\nDashboard di amministrazione: tutto verde');
