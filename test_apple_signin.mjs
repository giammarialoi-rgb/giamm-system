// Sign in with Apple: the token check, the account it opens, the two ways in
// (web popup, Android through the browser), and deleting the account.
//
// Apple is replaced by a test key pair: tokens are signed here with a private
// key and checked against its public half, exactly as the server checks the
// real ones against Apple's published keys. The database is an in-memory fake
// that answers the queries the account code makes.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import express from 'express';
import jwt from 'jsonwebtoken';
import { SignJWT, generateKeyPair, exportJWK, createLocalJWKSet, decodeProtectedHeader, jwtVerify, importSPKI } from 'jose';
import {
  appleConfig, verifyAppleIdToken, issueAppleState, readAppleState, appleUserName,
  appleClientSecret, sealRefreshToken, openRefreshToken, mountAppleAuth, appleCallbackRoute
} from './server/account/apple.mjs';
import { resolveIdentityUser, deleteAccount, mountAccountDeletion } from './server/account/identity.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
async function rejects(promise, status, message) {
  try { await promise; failed++; console.log('FAIL ' + message + ' -- accettato'); }
  catch (err) {
    if (status && err.statusCode !== status) { failed++; console.log('FAIL ' + message + ' -- status ' + err.statusCode + ' ' + err.message); return; }
    console.log('OK   ' + message + ' (' + (err.statusCode || '') + ' ' + err.message + ')');
  }
}

// --- a fake Apple ---------------------------------------------------------
const CLIENT_ID = 'app.nurvan.signin';
const SECRET = 'test-secret-0123456789-0123456789-0123';
const { privateKey: APPLE_SIGNING, publicKey: APPLE_PUBLIC } = await generateKeyPair('RS256');
const pubJwk = await exportJWK(APPLE_PUBLIC);
const JWKS = createLocalJWKSet({ keys: [{ ...pubJwk, kid: 'test-kid', alg: 'RS256', use: 'sig' }] });
const { privateKey: OTHER_SIGNING } = await generateKeyPair('RS256');

async function appleToken(claims = {}, opts = {}) {
  const now = Math.floor((opts.now || Date.now()) / 1000);
  const body = { email: 'mario@example.com', email_verified: 'true', ...claims };
  return new SignJWT(body)
    .setProtectedHeader({ alg: 'RS256', kid: 'test-kid' })
    .setIssuer(opts.iss || 'https://appleid.apple.com')
    .setAudience(opts.aud || CLIENT_ID)
    .setSubject(opts.sub || '001234.apple-sub-mario')
    .setIssuedAt(now - 10)
    .setExpirationTime(opts.exp != null ? opts.exp : now + 600)
    .sign(opts.key || APPLE_SIGNING);
}

// The team's .p8 key (EC P-256), as Apple issues it.
const ec = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
const P8 = ec.privateKey.export({ type: 'pkcs8', format: 'pem' });
const EC_PUBLIC = ec.publicKey.export({ type: 'spki', format: 'pem' });
const ENV = { APPLE_CLIENT_ID: CLIENT_ID, APPLE_TEAM_ID: 'TEAM123456', APPLE_KEY_ID: 'KEY1234567', APPLE_PRIVATE_KEY: P8.replace(/\n/g, '\\n') };

// --- a fake database ------------------------------------------------------
function fakeDb() {
  const db = { users: [], identities: [], data: new Set(), tickets: new Map(), resets: new Set(), nextId: 1, log: [] };
  const rows = (r) => ({ rows: r, rowCount: r.length });
  const byId = (id) => db.users.find((u) => String(u.id) === String(id));
  function q(sql, p = []) {
    const s = sql.replace(/\s+/g, ' ').trim();
    db.log.push(s);
    if (/^(BEGIN|COMMIT|ROLLBACK)$/.test(s)) return rows([]);
    if (/^SELECT user_id FROM app_user_identities WHERE provider = \$1 AND provider_sub = \$2$/.test(s)) {
      const i = db.identities.find((x) => x.provider === p[0] && x.provider_sub === p[1]);
      return rows(i ? [{ user_id: i.user_id }] : []);
    }
    if (/^SELECT id FROM app_users WHERE id = \$1$/.test(s)) { const u = byId(p[0]); return rows(u ? [{ id: u.id }] : []); }
    if (/^SELECT id FROM app_users WHERE email = \$1$/.test(s)) { const u = db.users.find((x) => x.email === p[0]); return rows(u ? [{ id: u.id }] : []); }
    if (/^INSERT INTO app_users\(email, name, provider, provider_id, avatar_url\)/.test(s)) {
      if (db.users.some((x) => x.email === p[0])) throw Object.assign(new Error('duplicate key'), { code: '23505' });
      const u = { id: db.nextId++, email: p[0], name: p[1], provider: p[2], provider_id: p[3], avatar_url: p[4], password_hash: null };
      db.users.push(u);
      return rows([{ id: u.id }]);
    }
    if (/^INSERT INTO app_account_data/.test(s)) { db.data.add(String(p[0])); return rows([]); }
    if (/^INSERT INTO app_user_identities/.test(s)) {
      const i = db.identities.find((x) => x.provider === p[0] && x.provider_sub === p[1]);
      if (i) { i.email = p[3] || i.email; i.refresh_token_enc = p[4] || i.refresh_token_enc; }
      else db.identities.push({ provider: p[0], provider_sub: p[1], user_id: Number(p[2]), email: p[3], refresh_token_enc: p[4] });
      return rows([]);
    }
    if (/^SELECT id, email, name, provider, avatar_url FROM app_users WHERE id = \$1$/.test(s)) { const u = byId(p[0]); return rows(u ? [u] : []); }
    if (/^UPDATE app_users SET name = \$2, provider = \$3, provider_id = \$4/.test(s)) {
      const u = byId(p[0]);
      Object.assign(u, { name: p[1], provider: p[2], provider_id: p[3], avatar_url: u.avatar_url || p[4] });
      return rows([u]);
    }
    if (/^INSERT INTO app_login_tickets/.test(s)) { db.tickets.set(p[0], { user_id: p[1], expires_at: p[2] }); return rows([]); }
    if (/^DELETE FROM app_login_tickets WHERE ticket_hash = \$1 RETURNING/.test(s)) {
      const t = db.tickets.get(p[0]); db.tickets.delete(p[0]); return rows(t ? [t] : []);
    }
    if (/^SELECT id, email, provider FROM app_users WHERE id = \$1$/.test(s)) { const u = byId(p[0]); return rows(u ? [u] : []); }
    if (/^SELECT provider, refresh_token_enc FROM app_user_identities WHERE user_id = \$1$/.test(s)) {
      return rows(db.identities.filter((x) => String(x.user_id) === String(p[0])));
    }
    if (/^DELETE FROM app_password_resets WHERE email = \$1$/.test(s)) { db.resets.delete(p[0]); return rows([]); }
    if (/^DELETE FROM app_users WHERE id = \$1$/.test(s)) {
      // The foreign keys cascade.
      db.users = db.users.filter((x) => String(x.id) !== String(p[0]));
      db.identities = db.identities.filter((x) => String(x.user_id) !== String(p[0]));
      db.data.delete(String(p[0]));
      return rows([]);
    }
    throw new Error('query non prevista dal fake: ' + s.slice(0, 120));
  }
  const pool = { async query(a, b) { return q(a, b); }, async connect() { return { query: async (a, b) => q(a, b), release() {} }; } };
  return { db, pool };
}

console.log('');
console.log('--- 1. il verificatore del token ---');
{
  const { state, nonce } = issueAppleState(SECRET, 'web');
  const good = await appleToken({ nonce });
  const id = await verifyAppleIdToken(good, { jwks: JWKS, clientId: CLIENT_ID, nonce });
  ok('1a. token valido firmato con la chiave di test: accettato', id.sub === '001234.apple-sub-mario' && id.email === 'mario@example.com' && id.emailVerified === true);
  ok('1b. lo state torna indietro con lo stesso nonce', readAppleState(SECRET, state).nonce === nonce);
  const past = Date.now() - 3600 * 1000;
  await rejects(verifyAppleIdToken(await appleToken({ nonce }, { now: past, exp: Math.floor(past / 1000) + 600 }), { jwks: JWKS, clientId: CLIENT_ID, nonce }), 401, '1c. token scaduto: rifiutato');
  await rejects(verifyAppleIdToken(await appleToken({ nonce }, { aud: 'com.altro.sito' }), { jwks: JWKS, clientId: CLIENT_ID, nonce }), 401, '1d. audience sbagliata: rifiutato');
  await rejects(verifyAppleIdToken(await appleToken({ nonce }, { iss: 'https://evil.example' }), { jwks: JWKS, clientId: CLIENT_ID, nonce }), 401, '1e. emittente diverso da Apple: rifiutato');
  await rejects(verifyAppleIdToken(await appleToken({ nonce }, { key: OTHER_SIGNING }), { jwks: JWKS, clientId: CLIENT_ID, nonce }), 401, '1f. firmato con una chiave che non e\' di Apple: rifiutato');
  await rejects(verifyAppleIdToken(await appleToken({ nonce: 'altro' }), { jwks: JWKS, clientId: CLIENT_ID, nonce }), 401, '1g. nonce di un\'altra richiesta: rifiutato');
  await rejects(verifyAppleIdToken(good, { jwks: JWKS, clientId: '', nonce }), 503, '1h. senza client id configurato: non si verifica niente');
  const relay = await verifyAppleIdToken(await appleToken({ nonce, email: 'x7k2p9@privaterelay.appleid.com', is_private_email: 'true' }), { jwks: JWKS, clientId: CLIENT_ID, nonce });
  ok('1i. email relay: accettata come verificata', relay.email === 'x7k2p9@privaterelay.appleid.com' && relay.emailVerified && relay.privateEmail);
  await rejects(Promise.resolve().then(() => readAppleState(SECRET, state.replace(/.$/, (c) => (c === 'A' ? 'B' : 'A')))), 400, '1j. state manomesso: rifiutato');
  await rejects(Promise.resolve().then(() => readAppleState(SECRET, state, Date.now() + 11 * 60 * 1000)), 400, '1k. state vecchio di piu\' di 10 minuti: rifiutato');
  await rejects(Promise.resolve().then(() => readAppleState('altro-segreto', state)), 400, '1l. state firmato da un altro server: rifiutato');
  ok('1m. il nome arriva come oggetto (JS) o come stringa JSON (form post)',
    appleUserName({ name: { firstName: 'Mario', lastName: 'Rossi' } }) === 'Mario Rossi' &&
    appleUserName('{"name":{"firstName":"Anna","lastName":""}}') === 'Anna' && appleUserName(undefined) === '');
}

console.log('');
console.log('--- 2. configurazione, client secret, refresh token ---');
{
  ok('2a. senza variabili: Apple spento', appleConfig({}).enabled === false && appleConfig({ APPLE_CLIENT_ID: 'x', APPLE_TEAM_ID: 'y', APPLE_KEY_ID: 'z' }).enabled === false);
  const cfg = appleConfig(ENV);
  ok('2b. con le quattro: acceso, e la chiave su una riga con \\n torna un PEM', cfg.enabled && cfg.privateKey.startsWith('-----BEGIN PRIVATE KEY-----\n'));
  const secretJwt = await appleClientSecret(cfg);
  const header = decodeProtectedHeader(secretJwt);
  const { payload } = await jwtVerify(secretJwt, await importSPKI(EC_PUBLIC, 'ES256'), { audience: 'https://appleid.apple.com', issuer: 'TEAM123456' });
  ok('2c. il client secret e\' ES256, kid = KEY_ID, iss = TEAM_ID, sub = CLIENT_ID, aud = Apple', header.alg === 'ES256' && header.kid === 'KEY1234567' && payload.sub === CLIENT_ID && payload.exp - payload.iat <= 300);
  const sealed = sealRefreshToken(SECRET, 'r.apple.refresh.token');
  ok('2d. il refresh token si conserva cifrato e si riapre', sealed && sealed.indexOf('apple.refresh') < 0 && openRefreshToken(SECRET, sealed) === 'r.apple.refresh.token');
  let wrong = false; try { openRefreshToken('altro', sealed); } catch (_) { wrong = true; }
  ok('2e. con un altro segreto non si apre', wrong);
}

console.log('');
console.log('--- 3. l\'account: crea, collega, non duplicare ---');
{
  const { db, pool } = fakeDb();
  const first = await resolveIdentityUser(pool, { provider: 'apple', sub: 'sub-A', email: 'Mario@Example.com', emailVerified: true, name: 'Mario Rossi' });
  ok('3a. primo accesso: account creato con l\'email di Apple e il nome', first.created && first.user.email === 'mario@example.com' && first.user.name === 'Mario Rossi' && db.data.has(String(first.user.id)));
  ok('3b. e l\'identita\' registrata', db.identities.length === 1 && db.identities[0].provider_sub === 'sub-A');
  const again = await resolveIdentityUser(pool, { provider: 'apple', sub: 'sub-A', email: 'mario@example.com', emailVerified: true, name: '' });
  ok('3c. secondo accesso (Apple non manda piu\' il nome): stesso account, nome conservato', !again.created && again.user.id === first.user.id && again.user.name === 'Mario Rossi' && db.users.length === 1);

  db.users.push({ id: db.nextId++, email: 'anna@example.com', name: 'Anna B.', provider: 'email', provider_id: null, avatar_url: null, password_hash: '$2a$10$hash' });
  const anna = await resolveIdentityUser(pool, { provider: 'apple', sub: 'sub-B', email: 'anna@example.com', emailVerified: true, name: 'Anna Bianchi' });
  const annaRow = db.users.find((u) => u.email === 'anna@example.com');
  ok('3d. email gia\' registrata con password: stesso account, nessun duplicato', !anna.created && anna.user.id === annaRow.id && db.users.filter((u) => u.email === 'anna@example.com').length === 1);
  ok('3e. la password resta, e il nome scelto non viene sovrascritto', annaRow.password_hash === '$2a$10$hash' && annaRow.name === 'Anna B.');

  const relay = await resolveIdentityUser(pool, { provider: 'apple', sub: 'sub-C', email: 'x7k2p9@privaterelay.appleid.com', emailVerified: true, name: 'Luca' });
  ok('3f. email relay: account creato con quell\'indirizzo', relay.created && relay.user.email === 'x7k2p9@privaterelay.appleid.com');
  const relayLater = await resolveIdentityUser(pool, { provider: 'apple', sub: 'sub-C', email: '', emailVerified: false });
  ok('3g. un token successivo senza email: l\'identita\' basta', relayLater.user.id === relay.user.id);

  const signedIn = db.users.find((u) => u.email === 'anna@example.com');
  const linked = await resolveIdentityUser(pool, { provider: 'apple', sub: 'sub-D', email: 'other@privaterelay.appleid.com', emailVerified: true, linkingUserId: signedIn.id });
  ok('3h. da loggato, collegare Apple non cambia l\'email dell\'account', linked.user.id === signedIn.id && signedIn.email === 'anna@example.com' && !db.users.some((u) => u.email === 'other@privaterelay.appleid.com'));
  await rejects(resolveIdentityUser(pool, { provider: 'apple', sub: 'sub-A', email: 'mario@example.com', emailVerified: true, linkingUserId: signedIn.id }), 409, '3i. un Apple gia\' di un altro account non si ricollega');

  db.users.push({ id: db.nextId++, email: 'zoe@example.com', name: 'Zoe', provider: 'email', provider_id: null, avatar_url: null, password_hash: 'h' });
  await rejects(resolveIdentityUser(pool, { provider: 'google', sub: 'g-Z', email: 'zoe@example.com', emailVerified: false }), 409, '3j. email non verificata dal provider: nessuna fusione silenziosa');

  db.users.push({ id: db.nextId++, email: 'nuovo@example.com', name: 'nuovo', provider: 'email', provider_id: null, avatar_url: null, password_hash: 'h' });
  const named = await resolveIdentityUser(pool, { provider: 'apple', sub: 'sub-E', email: 'nuovo@example.com', emailVerified: true, name: 'Nuovo Utente' });
  ok('3k. un nome fatto dall\'email si sostituisce con quello di Apple', named.user.name === 'Nuovo Utente');

  db.users.push({ id: db.nextId++, email: 'c.tok@client.nurvan.internal', name: 'Atleta', provider: 'coach_client', provider_id: null, avatar_url: null, password_hash: 'h' });
  const ath = db.users[db.users.length - 1];
  const athLinked = await resolveIdentityUser(pool, { provider: 'google', sub: 'g-ath', email: 'atleta@gmail.com', emailVerified: true, linkingUserId: ath.id });
  ok('3l. un account atleta resta atleta (il ruolo viene da provider)', athLinked.user.provider === 'coach_client');
}

// --- the routes, on a real express app -------------------------------------
async function withServer(env, fn) {
  const { db, pool } = fakeDb();
  const calls = [];
  const fetchImpl = async (url, init) => {
    const body = Object.fromEntries(new URLSearchParams(String(init.body)));
    calls.push({ url, body });
    if (/auth\/token$/.test(url)) return { ok: true, json: async () => ({ refresh_token: 'r.refresh.' + body.code, id_token: 'x' }) };
    if (/auth\/revoke$/.test(url)) return { ok: true, json: async () => ({}) };
    return { ok: false, status: 404, json: async () => ({}) };
  };
  const issueAccountToken = (u) => jwt.sign({ sub: String(u.id), email: u.email, name: u.name, provider: u.provider, role: u.provider === 'coach_client' ? 'athlete' : 'user' }, SECRET, { expiresIn: '90d' });
  const accountFromBearer = async (h) => {
    if (!h || !h.startsWith('Bearer ')) return null;
    try { const p = jwt.verify(h.slice(7), SECRET); return { id: p.sub, email: p.email, provider: p.provider, role: p.role }; } catch (_) { return null; }
  };
  const app = express();
  const target = { handle: null };
  appleCallbackRoute(app, express.urlencoded({ extended: false }), target);
  app.use(express.json());
  const apple = mountAppleAuth(app, { pool, initDb: null, env, secret: SECRET, accountFromBearer, issueAccountToken, fetchImpl, jwks: JWKS });
  target.handle = apple.callbackHandler;
  mountAccountDeletion(app, { pool, initDb: null, accountFromBearer, onDeleted: (gone) => apple.revokeIdentities(gone.identities) });
  const server = await new Promise((r) => { const s = app.listen(0, () => r(s)); });
  const base = 'http://127.0.0.1:' + server.address().port;
  try { await fn({ base, db, calls, issueAccountToken }); } finally { server.close(); }
}
const postJson = (url, body, headers = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });

console.log('');
console.log('--- 4. web: popup di Apple, poi POST /api/auth/apple ---');
await withServer(ENV, async ({ base, db, calls }) => {
  const cfgRes = await fetch(base + '/api/auth/apple/web-config');
  const cfg = await cfgRes.json();
  ok('4a. la pagina riceve client id, return URL, state e nonce', cfg.enabled && cfg.clientId === CLIENT_ID && /\/api\/auth\/apple\/callback$/.test(cfg.redirectURI) && cfg.state && cfg.nonce);
  const token = await appleToken({ nonce: cfg.nonce, email: 'giulia@privaterelay.appleid.com', is_private_email: 'true' }, { sub: 'sub-web' });
  const res = await postJson(base + '/api/auth/apple', { id_token: token, code: 'c-web-1', state: cfg.state, user: { name: { firstName: 'Giulia', lastName: 'Verdi' }, email: 'giulia@privaterelay.appleid.com' } });
  const out = await res.json();
  const session = out.token ? jwt.verify(out.token, SECRET) : null;
  ok('4b. token valido: account creato e sessione aperta', res.status === 200 && out.created === true && session && session.sub === String(out.user.id));
  ok('4c. nome salvato subito, email relay come email dell\'account', out.user.name === 'Giulia Verdi' && out.user.email === 'giulia@privaterelay.appleid.com');
  const exch = calls.find((c) => /auth\/token$/.test(c.url));
  ok('4d. il code si scambia con il client secret firmato, stessa return URL', exch && exch.body.code === 'c-web-1' && exch.body.client_id === CLIENT_ID && exch.body.client_secret.split('.').length === 3 && exch.body.redirect_uri === cfg.redirectURI);
  const idn = db.identities.find((i) => i.provider_sub === 'sub-web');
  ok('4e. il refresh token e\' conservato cifrato', idn && idn.refresh_token_enc && idn.refresh_token_enc.indexOf('refresh') < 0 && openRefreshToken(SECRET, idn.refresh_token_enc) === 'r.refresh.c-web-1');

  const cfg2 = await (await fetch(base + '/api/auth/apple/web-config')).json();
  const past = Date.now() - 3600 * 1000;
  const expired = await appleToken({ nonce: cfg2.nonce }, { now: past, exp: Math.floor(past / 1000) + 600, sub: 'sub-x' });
  const r1 = await postJson(base + '/api/auth/apple', { id_token: expired, state: cfg2.state });
  ok('4f. token scaduto: 401 e nessun account', r1.status === 401 && !db.users.some((u) => u.email === 'mario@example.com'));
  const wrongAud = await appleToken({ nonce: cfg2.nonce }, { aud: 'com.altro', sub: 'sub-x' });
  const r2 = await postJson(base + '/api/auth/apple', { id_token: wrongAud, state: cfg2.state });
  ok('4g. audience sbagliata: 401', r2.status === 401);
  const r3 = await postJson(base + '/api/auth/apple', { id_token: await appleToken({ nonce: cfg2.nonce }), state: 'x.y' });
  ok('4h. state non nostro: 400', r3.status === 400);

  db.users.push({ id: db.nextId++, email: 'marco@example.com', name: 'Marco', provider: 'email', provider_id: null, avatar_url: null, password_hash: 'h' });
  const cfg3 = await (await fetch(base + '/api/auth/apple/web-config')).json();
  const r4 = await postJson(base + '/api/auth/apple', { id_token: await appleToken({ nonce: cfg3.nonce, email: 'marco@example.com' }, { sub: 'sub-marco' }), state: cfg3.state });
  const o4 = await r4.json();
  ok('4i. email gia\' registrata: si entra nello stesso account', r4.status === 200 && o4.user.email === 'marco@example.com' && db.users.filter((u) => u.email === 'marco@example.com').length === 1 && !o4.created);
});

console.log('');
console.log('--- 5. Android: browser, callback di Apple, ticket nell\'app ---');
await withServer(ENV, async ({ base, db }) => {
  const start = await fetch(base + '/api/auth/apple/start', { redirect: 'manual' });
  const loc = new URL(start.headers.get('location'));
  ok('5a. /start manda ad Apple con form_post, state e nonce', start.status === 302 && loc.origin === 'https://appleid.apple.com' && loc.searchParams.get('response_mode') === 'form_post' && loc.searchParams.get('client_id') === CLIENT_ID && loc.searchParams.get('state') && loc.searchParams.get('nonce'));
  const state = loc.searchParams.get('state');
  const token = await appleToken({ nonce: loc.searchParams.get('nonce'), email: 'paolo@example.com' }, { sub: 'sub-android' });
  const form = new URLSearchParams({ state, code: 'c-and', id_token: token, user: JSON.stringify({ name: { firstName: 'Paolo', lastName: 'Neri' } }) });
  const cb = await fetch(base + '/api/auth/apple/callback', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://appleid.apple.com' }, body: form });
  const html = await cb.text();
  const m = html.match(/giammaria:\/\/oauth\/apple\?code=([A-Za-z0-9_-]+)/);
  ok('5b. il callback risponde con il ritorno all\'app e un ticket', cb.status === 200 && !!m && /Torna a Nurvan/.test(html));
  ok('5c. la pagina di ritorno non esegue script', /default-src 'none'/.test(cb.headers.get('content-security-policy') || '') && !/<script/i.test(html));
  const swap = await postJson(base + '/api/auth/apple', { ticket: m && m[1] });
  const out = await swap.json();
  ok('5d. l\'app scambia il ticket con la sessione: account creato, nome salvato', swap.status === 200 && jwt.verify(out.token, SECRET).sub === String(out.user.id) && out.user.name === 'Paolo Neri');
  const again = await postJson(base + '/api/auth/apple', { ticket: m && m[1] });
  ok('5e. il ticket vale una volta sola', again.status === 401);
  ok('5f. nel database solo l\'hash del ticket', ![...db.tickets.keys()].includes(m && m[1]));
  const webState = issueAppleState(SECRET, 'web');
  const cb2 = await fetch(base + '/api/auth/apple/callback', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ state: webState.state, id_token: await appleToken({ nonce: webState.nonce }, { sub: 'sub-z' }) }) });
  ok('5g. uno state del web non passa dal callback dell\'app', /error=failed/.test(await cb2.text()));
  const cancel = await fetch(base + '/api/auth/apple/callback', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'error=user_cancelled_authorize' });
  ok('5h. annullato su Apple: si torna all\'app senza ticket', /error=cancelled/.test(await cancel.text()));
});

console.log('');
console.log('--- 6. senza variabili: niente Apple ---');
await withServer({}, async ({ base }) => {
  const r = await fetch(base + '/api/auth/apple/web-config');
  ok('6a. web-config: 404, enabled false', r.status === 404 && (await r.json()).enabled === false);
  const p = await postJson(base + '/api/auth/apple', { id_token: 'x', state: 'y' });
  ok('6b. POST /api/auth/apple: 503', p.status === 503);
  const s = await fetch(base + '/api/auth/apple/start', { redirect: 'manual' });
  ok('6c. /start: nessun redirect ad Apple', s.status === 200 && /not_configured/.test(await s.text()));
  const api = read('coach-api.mjs');
  ok('6d. public-config dice appleEnabled dalle quattro variabili', /appleEnabled: appleConfig\(process\.env\)\.enabled/.test(api));
  const page = read('web/index.base.html');
  const sync = page.slice(page.indexOf('function syncAppleAuthButton('), page.indexOf('function loadAppleIdScript('));
  ok('6e. la pagina mostra il bottone solo con appleEnabled', /!!window\.__appleEnabled/.test(sync) && /window\.__appleEnabled = !!\(cfg && cfg\.appleEnabled\)/.test(page));
  const open = page.slice(page.indexOf('function openAccount()'), page.indexOf('function enterAccountSession('));
  const hydrateApple = page.slice(page.indexOf('function hydrateAppleEnabled()'), page.indexOf('function syncAppleAuthButton('));
  ok('6e2. appleEnabled si chiede al server a parte, anche con l\'id Google gia\' nel build (in produzione CONFIG.googleClientId c\'e\')',
    /hydrateAppleEnabled\(\)\.then\(function \(\) \{ syncAppleAuthButton\(!!store\.accountToken\); \}\);/.test(open) &&
    /fetch\(coachEndpoint\('\/api\/auth\/public-config'\)/.test(hydrateApple) && /window\.__appleEnabled = !!\(cfg && cfg\.appleEnabled\)/.test(hydrateApple));
  ok('6f. e di partenza il bottone e\' nascosto', /\.apple-signin-btn \{\s*\n\s*display: none;/.test(page) && !/\$\('apple-auth'\)\.style\.display = 'block'/.test(page));
});

console.log('');
console.log('--- 7. logout e cancellazione, anche con solo Apple ---');
await withServer(ENV, async ({ base, db, calls, issueAccountToken }) => {
  const cfg = await (await fetch(base + '/api/auth/apple/web-config')).json();
  const r = await postJson(base + '/api/auth/apple', { id_token: await appleToken({ nonce: cfg.nonce, email: 'solo@privaterelay.appleid.com' }, { sub: 'sub-solo' }), code: 'c-solo', state: cfg.state });
  const out = await r.json();
  const user = db.users.find((u) => u.id === out.user.id);
  ok('7a. account con solo Apple: nessuna password', user && user.password_hash === null);
  const noConfirm = await fetch(base + '/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + out.token }, body: JSON.stringify({}) });
  ok('7b. senza la parola ELIMINA non si cancella', noConfirm.status === 400 && db.users.some((u) => u.id === out.user.id));
  const noAuth = await fetch(base + '/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirm: 'ELIMINA' }) });
  ok('7c. senza sessione: 401', noAuth.status === 401);
  const del = await fetch(base + '/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + out.token }, body: JSON.stringify({ confirm: 'elimina' }) });
  ok('7d. con la sessione Apple e ELIMINA: account cancellato, con i dati e le identita\'', del.status === 200 && !db.users.some((u) => u.id === out.user.id) && !db.identities.some((i) => i.user_id === out.user.id) && !db.data.has(String(out.user.id)));
  const rev = calls.find((c) => /auth\/revoke$/.test(c.url));
  ok('7e. e l\'accesso revocato presso Apple con il suo refresh token', rev && rev.body.token === 'r.refresh.c-solo' && rev.body.token_type_hint === 'refresh_token' && rev.body.client_id === CLIENT_ID);
  db.users.push({ id: db.nextId++, email: 'c.x@client.nurvan.internal', name: 'Atleta', provider: 'coach_client', provider_id: null, avatar_url: null, password_hash: 'h' });
  const ath = db.users[db.users.length - 1];
  const athDel = await fetch(base + '/api/account', { method: 'DELETE', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + issueAccountToken(ath) }, body: JSON.stringify({ confirm: 'ELIMINA' }) });
  ok('7f. l\'account di un atleta lo rimuove il coach, non l\'atleta', athDel.status === 403 && db.users.some((u) => u.id === ath.id));
  const page = read('web/index.base.html');
  const logout = page.slice(page.indexOf('function logoutAccount()'), page.indexOf('function syncAccountFormMode()'));
  ok('7g. il logout non dipende da password o provider', !/password|provider|apple|google/i.test(logout) && /store\.accountToken = null/.test(logout));
  ok('7h. in pagina: ELIMINA ACCOUNT, conferma scritta, DELETE /api/account, poi la copia sul dispositivo', /id="account-delete">ELIMINA ACCOUNT</.test(page) && /accountRequest\('\/api\/account', \{ method: 'DELETE', body: JSON\.stringify\(\{ confirm: 'ELIMINA' \}\) \}\)/.test(page) && /await forgetDeletedAccountOnDevice\(store\.accountUser\)/.test(page) && /indexedDB\.deleteDatabase\(dbName\)/.test(page));
});

console.log('');
console.log('--- 8. il resto del cablaggio ---');
{
  const api = read('coach-api.mjs');
  ok('8a. il callback di Apple e\' registrato prima del CORS (Apple posta da appleid.apple.com)', api.indexOf('appleCallbackRoute(app,') > 0 && api.indexOf('appleCallbackRoute(app,') < api.indexOf('app.use(cors('));
  ok('8b. Google passa dallo stesso collegamento: per identita\', email verificata, niente email sovrascritta', /resolveIdentityUser\(pool, \{ \.\.\.identity, linkingUserId:/.test(api) && /emailVerified: verified/.test(api) && !/SET email = \$1/.test(api) && !/function resolveOAuthUser/.test(api));
  ok('8a2. e ha un suo limite di richieste per IP, prima del parser', /appleCallbackRoute\(app, \[\s*\n\s*createFixedWindowRateLimiter\(\{[^\n]*keyPrefix: "apple-callback" \}\),\s*\n\s*express\.urlencoded/.test(api));
  ok('8a3. un account eliminato che scrive ancora con un vecchio token: 401, non un 500 sulla dashboard',
    /function isDeletedAccountWrite\(err\) \{\s*\n\s*return Boolean\(err && err\.code === "23503"\);/.test(api) &&
    (api.match(/if \(isDeletedAccountWrite\((error|err)\)\) return res\.status\(401\)\.json\(DELETED_ACCOUNT\);/g) || []).length === 2);
  ok('8c. il vecchio verificatore con APPLE_BUNDLE_ID non c\'e\' piu\'', !/APPLE_BUNDLE_ID|verifyAppleCredential/.test(api));
  const relay = 'x7k2p9@privaterelay.appleid.com';
  ok('8d. le regex email del server (reset, registrazione) accettano un relay', /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(relay) && (api.match(/\/\^\[\^@\\s\]\+@\[\^@\\s\]\+\\\.\[\^@\\s\]\+\$\//g) || []).length === 3);
  const page = read('web/index.base.html');
  ok('8e. il bottone: logo Apple e testo esatto "Accedi con Apple"', /id="apple-auth" aria-label="Accedi con Apple"><svg viewBox="0 0 814 1000"[^>]*><path d="M788\.1 340\.9/.test(page) && /<span>Accedi con Apple<\/span><\/button>/.test(page));
  ok('8f. bianco su fondo scuro, 40px e angoli 4px come il bottone Google', /\.apple-signin-btn \{[\s\S]*?height: 40px;[\s\S]*?background: #fff;[\s\S]*?color: #000;[\s\S]*?border-radius: 4px;/.test(page) && /theme: 'filled_black',\s*\n\s*size: 'large'/.test(page));
  ok('8g. web: Sign in with Apple JS in popup, con state e nonce del server', /appleid\.cdn-apple\.com\/appleauth\/static\/jsapi\/appleid\/1\/it_IT\/appleid\.auth\.js/.test(page) && /usePopup: true/.test(page) && /\/api\/auth\/apple\/web-config/.test(page));
  ok('8h. Android: il bridge apre il browser, il ritorno porta un ticket', /native\.startAppleAuth\(\)/.test(page) && /appleSignInRequest\(\{ ticket: String\(ticket\) \}\)/.test(page));
  const main = read('app/src/main/java/com/giammaria/system/MainActivity.java');
  ok('8i. e l\'app Android apre proprio /api/auth/apple/start (nessun SDK nativo)', /COACH_API_URL \+ "\/api\/auth\/apple\/start"/.test(main) && !/appleid|AuthenticationServices/i.test(read('app/build.gradle')));
  const mig = read('server/db/migrations/0017_login_identities.sql');
  ok('8j. migrazione 0017: identita\' per (provider, sub), ticket, e i login Google/Apple di prima', /PRIMARY KEY \(provider, provider_sub\)/.test(mig) && /CREATE TABLE IF NOT EXISTS app_login_tickets/.test(mig) && /INSERT INTO app_user_identities \(provider, provider_sub, user_id, email\)\s*\nSELECT provider, provider_id, id, email/.test(mig));
  ok('8k. il README delle quattro variabili c\'e\', dieci righe', (() => { const t = read('server/account/APPLE_SIGNIN.md').trim().split('\n'); return t.length === 10 && ['APPLE_TEAM_ID', 'APPLE_CLIENT_ID', 'APPLE_KEY_ID', 'APPLE_PRIVATE_KEY'].every((k) => t.join('\n').includes(k)); })());
  const pkg = JSON.parse(read('package.json'));
  ok('8l. nessuna dipendenza nuova: jose c\'era gia\'', pkg.dependencies.jose && !pkg.dependencies['apple-signin-auth'] && !pkg.dependencies['jwks-rsa']);
  ok('8m. persist() intatto', /function persist\(\) \{\s*\n\s*ensureStoreIntegrity\(\);/.test(page));
}

console.log('');
if (failed) { console.log(failed + ' test di Sign in with Apple falliti.'); process.exit(1); }
console.log('Tutti i test di Sign in with Apple passano.');
