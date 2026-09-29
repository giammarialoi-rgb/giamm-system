// Google sign-in for the iOS app: start -> Google -> callback -> one-time
// ticket through nurvan://oauth/google -> swapped with the app's secret.
// Google is replaced by a fake token endpoint; the database by a tiny fake
// that keeps the login tickets.
import fs from 'node:fs';
import crypto from 'node:crypto';
import express from 'express';
import { mountGoogleAppAuth, googleAppConfig } from './server/account/google-app.mjs';
import { consumeLoginTicket } from './server/account/apple.mjs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

const SECRET = 'test-secret-0123456789-0123456789-0123';
const CLIENT = '123-abc.apps.googleusercontent.com';
const tickets = new Map();
const pool = {
  async query(sql, params) {
    if (/INSERT INTO app_login_tickets/.test(sql)) { tickets.set(params[0], { user_id: params[1], expires_at: params[2], verifier_hash: params[3] }); return { rows: [] }; }
    if (/DELETE FROM app_login_tickets/.test(sql)) { const r = tickets.get(params[0]); tickets.delete(params[0]); return { rows: r ? [r] : [] }; }
    if (/FROM app_users WHERE id/.test(sql)) return { rows: [{ id: params[0], email: 'a@b.it', name: 'A', provider: 'google' }] };
    return { rows: [] };
  }
};
let tokenRequest = null;
const fakeFetch = async (url, opts) => {
  tokenRequest = { url, body: new URLSearchParams(opts.body) };
  if (tokenRequest.body.get('code') !== 'good-code') return { ok: false, json: async () => ({ error: 'invalid_grant' }) };
  return { ok: true, json: async () => ({ id_token: 'the-id-token' }) };
};
const resolved = [];
const app = express();
app.set('trust proxy', true);
mountGoogleAppAuth(app, {
  pool, secret: SECRET, env: { GOOGLE_CLIENT_SECRET: 's3cret' }, clientId: () => CLIENT, fetchImpl: fakeFetch,
  verifyGoogleCredential: async (t) => { if (t !== 'the-id-token') throw Object.assign(new Error('bad'), { statusCode: 401 }); return { provider: 'google', sub: 'g-1', email: 'a@b.it', emailVerified: true, name: 'A' }; },
  resolveIdentityUser: async (_p, idn) => { resolved.push(idn); return { user: { id: 42 } }; }
});
const server = app.listen(0);
const base = 'http://127.0.0.1:' + server.address().port;
const b64 = (buf) => Buffer.from(buf).toString('base64url');

try {
  ok('1a. senza secret non e\' attivo', !googleAppConfig({}, CLIENT).enabled && googleAppConfig({ GOOGLE_CLIENT_SECRET: 'x' }, CLIENT).enabled);

  const verifier = b64(crypto.randomBytes(32));
  const vh = b64(crypto.createHash('sha256').update(verifier).digest());
  const start = await fetch(base + '/api/auth/google/start?vh=' + vh, { redirect: 'manual' });
  const loc = new URL(start.headers.get('location'));
  ok('2a. start porta a Google con il client, openid email e il ritorno sul server',
    start.status === 302 && loc.host === 'accounts.google.com' && loc.searchParams.get('client_id') === CLIENT &&
    loc.searchParams.get('scope') === 'openid email profile' && /\/api\/auth\/google\/callback$/.test(loc.searchParams.get('redirect_uri')));
  const bad = await (await fetch(base + '/api/auth/google/start?vh=xyz')).text();
  ok('2b. senza hash del segreto: pagina che chiede di aggiornare, nessun Google', /nurvan:\/\/oauth\/google\?error=update/.test(bad));

  const state = loc.searchParams.get('state');
  const cb = await (await fetch(base + '/api/auth/google/callback?code=good-code&state=' + encodeURIComponent(state))).text();
  const m = /nurvan:\/\/oauth\/google\?code=([A-Za-z0-9_-]+)/.exec(cb);
  ok('3a. callback: codice scambiato col secret, ticket nel link nurvan://', !!m && tokenRequest.body.get('client_secret') === 's3cret' && resolved.length === 1 && resolved[0].linkingUserId === null);
  const user = await consumeLoginTicket(pool, m[1], verifier);
  ok('3b. il ticket con il segreto giusto apre l\'account', user && user.id === 42);

  // A second login, the ticket tried with the wrong secret: refused, and used up.
  const cb2 = await (await fetch(base + '/api/auth/google/callback?code=good-code&state=' + encodeURIComponent(state))).text();
  const t2 = /code=([A-Za-z0-9_-]+)/.exec(cb2)[1];
  let refused = false;
  try { await consumeLoginTicket(pool, t2, 'wrong-secret'); } catch (e) { refused = e.statusCode === 401; }
  let gone = false;
  try { await consumeLoginTicket(pool, t2, verifier); } catch (e) { gone = e.statusCode === 401; }
  ok('3c. segreto sbagliato: rifiutato, e il ticket non vale piu\'', refused && gone);

  const forged = await (await fetch(base + '/api/auth/google/callback?code=good-code&state=forged.sig')).text();
  ok('4a. state non firmato dal server: nessun ticket', /error=failed/.test(forged) && !/code=/.test(forged));
  const badCode = await (await fetch(base + '/api/auth/google/callback?code=nope&state=' + encodeURIComponent(state))).text();
  ok('4b. Google non conferma il codice: nessun ticket', /error=failed/.test(badCode));
  const cancel = await (await fetch(base + '/api/auth/google/callback?error=access_denied')).text();
  ok('4c. annullato su Google: torna all\'app con error=cancelled', /error=cancelled/.test(cancel));

  const page = fs.readFileSync('web/index.base.html', 'utf8');
  ok('5a. app: su iPhone il pulsante Google usa il browser di sistema', /if \(isIosApp\(\)\) \{\s*startGoogleAuthIos\(\);/.test(page) && /browser\.open\(\{ url: coachEndpoint\('\/api\/auth\/google\/start\?vh=/.test(page));
  ok('5b. app: il ritorno nurvan://oauth/google scambia il ticket con il segreto', /url\.indexOf\('nurvan:\/\/oauth\/google'\) === 0/.test(page) && /ticket: ticket, verifier: saved\.v/.test(page));
  const plist = fs.readFileSync('ios/App/App/Info.plist', 'utf8');
  ok('5c. iOS: schema nurvan registrato', /<string>nurvan<\/string>/.test(plist));
  const api = fs.readFileSync('coach-api.mjs', 'utf8');
  ok('5d. server: /api/auth/google accetta il ticket e monta le route dell\'app', /req\.body && req\.body\.ticket/.test(api) && /mountGoogleAppAuth\(app/.test(api));
} finally {
  server.close();
}
if (failed) { console.log(failed + ' controlli del login Google per iOS falliti.'); process.exit(1); }
console.log('Tutti i controlli del login Google per iOS passano.');
