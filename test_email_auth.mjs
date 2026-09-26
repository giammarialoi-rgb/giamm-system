// Email and password accounts as any online service runs them
// (server/account/email-auth.mjs, and the routes of coach-api.mjs that use it).
//
// The module's routes run for real on an express app, over a stand-in for
// Postgres that holds the tables in memory and answers the module's queries;
// the emails are caught instead of sent. The sign-up, login and reset routes
// in coach-api.mjs need the real database, so for those the code is read.
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'node:url';
import {
  mountEmailAuth, startEmailVerification, needsEmailVerification, loginLocked, noteLoginFailure, clearLoginFailures,
  linkTokenHash, composeEmail, verificationEmail, isSyntheticEmail, LOGIN_MAX_FAILURES, RESEND_GAP_MS
} from './server/account/email-auth.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

// ---- the tables, in memory ----
const db = { users: [], verifications: new Map(), resets: new Map(), failures: new Map(), nextId: 1 };
const rows = (r) => ({ rows: r, rowCount: r.length });
const byId = (id) => db.users.find((u) => String(u.id) === String(id));
const nowMs = () => Date.now();
const pool = {
  async query(sql, p = []) {
    const s = sql.replace(/\s+/g, ' ').trim();
    if (/^SELECT created_at FROM app_email_verifications WHERE user_id = \$1$/.test(s)) {
      const v = db.verifications.get(String(p[0])); return rows(v ? [{ created_at: v.created_at }] : []);
    }
    if (/^INSERT INTO app_email_verifications/.test(s)) {
      const prev = db.verifications.get(String(p[0]));
      const attempts = prev && new Date(prev.expires_at).getTime() > new Date(p[5]).getTime() ? prev.attempts : 0;
      db.verifications.set(String(p[0]), { user_id: p[0], email: p[1], code_hash: p[2], link_hash: p[3], expires_at: p[4], attempts, created_at: p[5] });
      return rows([]);
    }
    if (/^SELECT id, email, name, provider, avatar_url, password_hash, email_verified_at, email_verify_required FROM app_users WHERE (email|id) = \$1$/.test(s)) {
      const u = /WHERE email/.test(s) ? db.users.find((x) => x.email === p[0]) : byId(p[0]);
      return rows(u ? [u] : []);
    }
    if (/^UPDATE app_email_verifications SET attempts = attempts \+ 1 WHERE user_id = \$1 AND attempts < \$2 AND expires_at > NOW\(\) RETURNING code_hash$/.test(s)) {
      const v = db.verifications.get(String(p[0]));
      if (!v || v.attempts >= p[1] || new Date(v.expires_at).getTime() <= nowMs()) return rows([]);
      v.attempts++;
      return rows([{ code_hash: v.code_hash }]);
    }
    if (/^UPDATE app_users SET email_verified_at = COALESCE\(email_verified_at, NOW\(\)\), updated_at = NOW\(\) WHERE id = \$1$/.test(s)) {
      const u = byId(p[0]); if (u && !u.email_verified_at) u.email_verified_at = new Date().toISOString(); return rows([]);
    }
    if (/^DELETE FROM app_email_verifications WHERE user_id = \$1$/.test(s)) { db.verifications.delete(String(p[0])); return rows([]); }
    if (/^SELECT user_id, email FROM app_email_verifications WHERE link_hash = \$1 AND expires_at > NOW\(\)$/.test(s)) {
      const v = [...db.verifications.values()].find((x) => x.link_hash === p[0] && new Date(x.expires_at).getTime() > nowMs());
      return rows(v ? [{ user_id: v.user_id, email: v.email }] : []);
    }
    if (/^SELECT email FROM app_password_resets WHERE link_hash = \$1 AND expires_at > NOW\(\)$/.test(s)) {
      const r = [...db.resets.values()].find((x) => x.link_hash === p[0] && new Date(x.expires_at).getTime() > nowMs());
      return rows(r ? [{ email: r.email }] : []);
    }
    if (/^UPDATE app_users SET password_hash = \$1, tokens_valid_after = \$3, email_verified_at = COALESCE\(email_verified_at, NOW\(\)\), updated_at = NOW\(\) WHERE email = \$2 RETURNING id, email$/.test(s)) {
      const u = db.users.find((x) => x.email === p[1]); if (!u) return rows([]);
      Object.assign(u, { password_hash: p[0], tokens_valid_after: p[2], email_verified_at: u.email_verified_at || new Date().toISOString() });
      return rows([{ id: u.id, email: u.email }]);
    }
    if (/^DELETE FROM app_password_resets WHERE email = \$1$/.test(s)) { db.resets.delete(p[0]); return rows([]); }
    if (/^UPDATE app_users SET password_hash = \$1, tokens_valid_after = \$3, updated_at = NOW\(\) WHERE id = \$2$/.test(s)) {
      const u = byId(p[1]); Object.assign(u, { password_hash: p[0], tokens_valid_after: p[2] }); return rows([]);
    }
    if (/^UPDATE app_users SET tokens_valid_after = \$2 WHERE id = \$1$/.test(s)) { byId(p[0]).tokens_valid_after = p[1]; return rows([]); }
    if (/^SELECT failures, window_start FROM app_login_failures WHERE email = \$1$/.test(s)) {
      const f = db.failures.get(p[0]); return rows(f ? [f] : []);
    }
    if (/^INSERT INTO app_login_failures/.test(s)) {
      const f = db.failures.get(p[0]);
      if (f && new Date(f.window_start).getTime() > new Date(p[2]).getTime()) f.failures++;
      else db.failures.set(p[0], { failures: 1, window_start: p[1] });
      return rows([]);
    }
    if (/^DELETE FROM app_login_failures WHERE email = \$1$/.test(s)) { db.failures.delete(p[0]); return rows([]); }
    throw new Error('query non prevista: ' + s.slice(0, 140));
  }
};

// ---- the server around the module ----
const SECRET = 'test-secret';
const mails = [];
const sendEmail = async (to, subject, text, html) => { mails.push({ to, subject, text, html }); return { sent: true }; };
const hashPassword = (s) => bcrypt.hash(s, 4);
const verifyPassword = (s, h) => bcrypt.compare(s, h);
const issueAccountToken = (u) => jwt.sign({ sub: String(u.id), email: u.email, name: u.name, provider: u.provider, role: u.role }, SECRET, { expiresIn: '1h' });
const accountFromBearer = async (h) => {
  try {
    const pl = jwt.verify(String(h || '').replace(/^Bearer /, ''), SECRET);
    const u = byId(pl.sub);
    if (!u || (u.tokens_valid_after && pl.iat * 1000 + 2000 < new Date(u.tokens_valid_after).getTime())) return null;
    return { id: pl.sub, email: pl.email, provider: pl.provider, role: pl.role || 'user' };
  } catch (_) { return null; }
};
const forgotten = [];
const app = express();
app.use(express.json());
const emailAuth = mountEmailAuth(app, {
  pool, sendEmail, hashPassword, verifyPassword, issueAccountToken, accountFromBearer,
  sessionGate: { forget: (id) => forgotten.push(String(id)) },
  revocationMoment: () => new Date().toISOString(),
  publicUser: (u) => ({ id: u.id, email: u.email, name: u.name, provider: u.provider }),
  env: { PUBLIC_APP_URL: 'https://app.example' }, isProduction: () => true
});
const server = app.listen(0);
const base = 'http://127.0.0.1:' + server.address().port;
const post = async (p, body, token) => {
  const r = await fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: JSON.stringify(body || {}) });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};
const codeOf = (mail) => (String(mail.text).match(/Codice: (\d{6})/) || [])[1];
const linkOf = (mail) => (String(mail.text).match(/https:\/\/app\.example\/\S+/) || [])[0];
const reqStub = { headers: { host: 'x' }, protocol: 'https' };

try {
  console.log('--- 1. conferma dell\'email ---');
  const anna = { id: db.nextId++, email: 'anna@example.com', name: 'Anna', provider: 'email', avatar_url: null, password_hash: await hashPassword('password-1'), email_verified_at: null, email_verify_required: true };
  db.users.push(anna);
  ok('1a. un account nuovo non confermato deve confermare', needsEmailVerification(anna));
  ok('1b. uno di prima (non richiesto), un atleta del coach: no', !needsEmailVerification({ ...anna, email_verify_required: false }) && !needsEmailVerification({ ...anna, provider: 'coach_client' }));
  const first = await emailAuth.startVerification(reqStub, anna);
  const mail1 = mails[mails.length - 1];
  ok('1c. l\'email parte, con codice e link', first.sent && mail1.to === 'anna@example.com' && /^\d{6}$/.test(codeOf(mail1) || '') && /\/verifica-email\?t=/.test(linkOf(mail1) || ''));
  ok('1d. e ha anche la versione HTML con il codice', /<html/.test(mail1.html) && mail1.html.includes(codeOf(mail1)));
  const stored = db.verifications.get(String(anna.id));
  ok('1e. codice e link salvati solo come hash', stored.code_hash !== codeOf(mail1) && /^\$2/.test(stored.code_hash) && !stored.link_hash.includes(decodeURIComponent(linkOf(mail1).split('t=')[1])));
  const again = await emailAuth.startVerification(reqStub, anna);
  ok('1f. un secondo invio entro un minuto non parte', again.throttled && mails.length === 1);
  const wrong = await post('/api/auth/verify-email', { email: 'anna@example.com', code: codeOf(mail1) === '111111' ? '222222' : '111111' });
  ok('1g. codice sbagliato: 400, niente sessione', wrong.status === 400 && !wrong.body.token);
  const right = await post('/api/auth/verify-email', { email: 'ANNA@example.com ', code: codeOf(mail1) });
  ok('1h. codice giusto: confermata e dentro', right.status === 200 && !!right.body.token && !!anna.email_verified_at && !db.verifications.has(String(anna.id)));

  const bob = { id: db.nextId++, email: 'bob@example.com', name: 'Bob', provider: 'email', avatar_url: null, password_hash: 'x', email_verified_at: null, email_verify_required: true };
  db.users.push(bob);
  await emailAuth.startVerification(reqStub, bob);
  const bobMail = mails[mails.length - 1];
  for (let i = 0; i < 8; i++) await post('/api/auth/verify-email', { email: 'bob@example.com', code: codeOf(bobMail) === '000000' ? '000001' : '000000' });
  const late = await post('/api/auth/verify-email', { email: 'bob@example.com', code: codeOf(bobMail) });
  ok('1i. dopo 8 codici sbagliati anche quello giusto non passa', late.status === 400 && !bob.email_verified_at);
  const token = decodeURIComponent(linkOf(bobMail).split('t=')[1]);
  const viaLink = await post('/api/auth/verify-email-link', { token });
  ok('1j. il link dell\'email conferma (senza aprire una sessione)', viaLink.status === 200 && viaLink.body.email === 'bob@example.com' && !!bob.email_verified_at && !viaLink.body.token);
  const reused = await post('/api/auth/verify-email-link', { token });
  ok('1k. lo stesso link una seconda volta: non vale', reused.status === 400);
  const resendUnknown = await post('/api/auth/resend-verification', { email: 'nessuno@example.com' });
  const resendDone = await post('/api/auth/resend-verification', { email: 'bob@example.com' });
  ok('1l. "invia di nuovo" risponde uguale se l\'account non c\'e\' o e\' gia\' confermato', resendUnknown.status === 200 && resendDone.status === 200 && resendUnknown.body.message === resendDone.body.message);

  console.log('');
  console.log('--- 2. nuova password dal link ---');
  const resetToken = 'r'.repeat(43);
  db.resets.set('anna@example.com', { email: 'anna@example.com', link_hash: linkTokenHash(resetToken), expires_at: new Date(Date.now() + 3600e3).toISOString() });
  const short = await post('/api/auth/reset-password-link', { token: resetToken, password: 'corta' });
  ok('2a. password troppo corta: rifiutata', short.status === 400);
  const reset = await post('/api/auth/reset-password-link', { token: resetToken, password: 'nuova-password' });
  ok('2b. il link imposta la nuova password e chiude le sessioni', reset.status === 200 && await verifyPassword('nuova-password', anna.password_hash) && !!anna.tokens_valid_after && forgotten.includes(String(anna.id)));
  ok('2c. il link vale una volta sola', (await post('/api/auth/reset-password-link', { token: resetToken, password: 'altra-password' })).status === 400);

  console.log('');
  console.log('--- 3. da dentro l\'account ---');
  await new Promise((r) => setTimeout(r, 2100));
  const session = issueAccountToken(anna);
  const badCurrent = await post('/api/account/password', { current: 'sbagliata', password: 'ancora-nuova' }, session);
  ok('3a. cambio password con la password attuale sbagliata: no', badCurrent.status === 400 && await verifyPassword('nuova-password', anna.password_hash));
  await new Promise((r) => setTimeout(r, 2100));
  const mailsBefore = mails.length;
  const changed = await post('/api/account/password', { current: 'nuova-password', password: 'ancora-nuova' }, session);
  ok('3b. con quella giusta: cambiata, nuova sessione per questo dispositivo', changed.status === 200 && !!changed.body.token && await verifyPassword('ancora-nuova', anna.password_hash));
  await new Promise((r) => setTimeout(r, 50));
  ok('3c. e un\'email avvisa del cambio', mails.length === mailsBefore + 1 && /password cambiata/i.test(mails[mails.length - 1].subject));
  await new Promise((r) => setTimeout(r, 2100));
  ok('3d. la sessione di prima non vale piu\', la nuova si', !(await accountFromBearer('Bearer ' + session)) && !!(await accountFromBearer('Bearer ' + changed.body.token)));
  const oauthUser = { id: db.nextId++, email: 'g@example.com', name: 'G', provider: 'google', avatar_url: null, password_hash: null, email_verified_at: 'x', email_verify_required: false };
  db.users.push(oauthUser);
  const firstPw = await post('/api/account/password', { current: '', password: 'prima-password' }, issueAccountToken(oauthUser));
  ok('3e. chi entrava solo con Google imposta la sua prima password', firstPw.status === 200 && firstPw.body.hadPassword === false && await verifyPassword('prima-password', oauthUser.password_hash));
  const athlete = { id: db.nextId++, email: 'c.t@client.nurvan.internal', name: 'A', provider: 'coach_client', avatar_url: null, password_hash: 'h', role: 'athlete' };
  db.users.push(athlete);
  ok('3f. l\'atleta del coach non cambia la password da qui', (await post('/api/account/password', { current: 'h', password: 'qualcosa-lungo' }, issueAccountToken(athlete))).status === 403);
  await new Promise((r) => setTimeout(r, 2100));
  const keep = changed.body.token;
  const others = await post('/api/account/logout-others', {}, keep);
  ok('3g. esci dagli altri dispositivi: questo resta dentro con una sessione nuova', others.status === 200 && !!others.body.token && !!(await accountFromBearer('Bearer ' + others.body.token)));
  await new Promise((r) => setTimeout(r, 2100));
  ok('3h. gli altri no', !(await accountFromBearer('Bearer ' + keep)));
  ok('3i. senza sessione: 401', (await post('/api/account/logout-others', {})).status === 401);

  console.log('');
  console.log('--- 4. password sbagliate ---');
  for (let i = 0; i < LOGIN_MAX_FAILURES - 1; i++) await noteLoginFailure(pool, 'anna@example.com');
  ok('4a. sotto la soglia si puo\' ancora provare', !(await loginLocked(pool, 'anna@example.com')));
  await noteLoginFailure(pool, 'anna@example.com');
  ok('4b. alla ' + LOGIN_MAX_FAILURES + 'a: bloccato', await loginLocked(pool, 'anna@example.com'));
  ok('4c. dopo 15 minuti si riparte', !(await loginLocked(pool, 'anna@example.com', Date.now() + 16 * 60 * 1000)));
  await clearLoginFailures(pool, 'anna@example.com');
  ok('4d. un accesso riuscito azzera il conto', !(await loginLocked(pool, 'anna@example.com')));

  console.log('');
  console.log('--- 5. le rotte di coach-api.mjs ---');
  const api = read('coach-api.mjs');
  const between = (a, b) => api.slice(api.indexOf(a), api.indexOf(b, api.indexOf(a) + 1));
  const register = between('app.post("/api/auth/register"', 'app.post("/api/auth/login"');
  ok('5a. registrazione: account da confermare, niente sessione finche\' non lo e\'', /email_verify_required\) VALUES\(\$1, \$2, \$3, 'email', \$4\)/.test(register) && /if \(verify\) \{[\s\S]*?verificationRequired: true[\s\S]*?\}\s*return res\.status\(201\)\.json\(\{\s*consentOk: consented,\s*token:/.test(register));
  const login = between('app.post("/api/auth/login"', 'app.get("/api/account/personal-backup"');
  ok('5b. login: blocco dopo troppi errori, errori contati, azzerati al successo', /loginLocked\(pool, email\)/.test(login) && /noteLoginFailure\(pool, email\)/.test(login) && /clearLoginFailures\(pool, email\)/.test(login));
  ok('5c. login di un account non confermato: nuovo codice e niente sessione', /if \(needsEmailVerification\(user\)\) \{[\s\S]*?verificationRequired: true/.test(login) && login.indexOf('needsEmailVerification') < login.indexOf('token: issueAccountToken(user)'));
  const forgot = between('app.post("/api/auth/forgot-password"', 'app.post("/api/auth/reset-password"');
  ok('5d. recupero: niente per gli atleti del coach, link accanto al codice', /isSyntheticEmail\(email\)/.test(forgot) && /linkTokenHash\(linkToken\)/.test(forgot) && /sendPasswordResetEmail\(email, code, emailAuth\.resetLink\(req, linkToken\)\)/.test(forgot));
  ok('5e. le pagine dei link sono servite', /"\/verifica-email": "verifica-email\.html"/.test(api) && /"\/reimposta-password": "reimposta-password\.html"/.test(api) && fs.existsSync(path.join(root, 'web/verifica-email.html')) && fs.existsSync(path.join(root, 'web/reimposta-password.html')));
  const mig = read('server/db/migrations/0020_email_verification.sql');
  ok('5f. migrazione 0020: gli account di prima non devono confermare, Google/Apple risultano confermati', /email_verify_required BOOLEAN NOT NULL DEFAULT FALSE/.test(mig) && /WHERE email_verified_at IS NULL AND provider IN \('google', 'apple'\)/.test(mig));
  ok('5g. indirizzi finti degli atleti riconosciuti', isSyntheticEmail('c.abc@client.nurvan.internal') && !isSyntheticEmail('a@b.it'));
  const e = composeEmail({ title: '<b>', intro: 'x & y' });
  ok('5h. nell\'HTML delle email il testo e\' protetto', e.html.includes('&lt;b&gt;') && e.html.includes('x &amp; y'));
  ok('5i. il link dell\'email punta alla pagina del sito', /https:\/\/s\/verifica-email\?t=abc/.test(verificationEmail('123456', 'https://s/verifica-email?t=abc').text));
  ok('5j. un secondo invio aspetta ' + (RESEND_GAP_MS / 1000) + ' s', RESEND_GAP_MS === 60000);
} finally {
  server.close();
}

console.log('');
if (failed) { console.log(failed + ' controlli degli account falliti.'); process.exit(1); }
console.log('Tutti i controlli degli account passano.');
