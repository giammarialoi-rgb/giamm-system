// Level 1 of the 25/09 audit: the security holes, one by one.
//
// The real server is started without a database for what can be shown over
// HTTP (the invite page, the AI routes); the rest runs the modules directly
// or reads the code where it cannot run here (Android, SQL).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createFixedWindowRateLimiter } from './server/security.mjs';
import { clientIp } from './server/admin/auth.mjs';
import { createSessionGate, tokenStillValid, revocationMoment } from './server/account/sessions.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

async function waitForServer(port) {
  for (let i = 0; i < 60; i++) {
    try { const r = await fetch('http://127.0.0.1:' + port + '/health'); if (r.ok) return true; } catch (_) {}
    await new Promise((r) => setTimeout(r, 250));
  }
  return false;
}

const api = read('coach-api.mjs');
const practice = read('coach-practice.mjs');

console.log('');
console.log('--- 1-7 sul server vero (senza database) ---');
{
  const port = 18291;
  const child = spawn(process.execPath, ['coach-api.mjs'], { cwd: root, env: { ...process.env, PORT: String(port), DATABASE_URL: '', GEMINI_API_KEY: 'test-key' }, stdio: 'pipe' });
  try {
    ok('0. il server parte', await waitForServer(port));
    const base = 'http://127.0.0.1:' + port;

    // 1. Reflected XSS through /c/:token
    const evil = '/c/' + encodeURIComponent('</script><script>alert(1)</script>');
    const r1 = await fetch(base + evil);
    const t1 = await r1.text();
    ok('1a. /c/ con </script> nel token: 404, niente pagina, niente cookie', r1.status === 404 && !/alert\(1\)/.test(t1) && !r1.headers.get('set-cookie'));
    const r1b = await fetch(base + '/c/' + encodeURIComponent('abc"onload="x'));
    ok('1b. /c/ con virgolette nel token: 404', r1b.status === 404);
    const good = await fetch(base + '/c/Ab3-xY_9.k~q');
    const tg = await good.text();
    ok('1c. un token valido apre la pagina con il boot', good.status === 200 && tg.includes('window.__NURVAN_CLIENT_BOOT={"token":"Ab3-xY_9.k~q","mode":"client"}'));
    const mf = await fetch(base + '/c/' + encodeURIComponent('a<b') + '/manifest.webmanifest');
    ok('1d. anche il manifest rifiuta i token non validi', mf.status === 400 || mf.status === 404);

    // 7. AI routes need a session
    for (const [method, p] of [['POST', '/api/chat'], ['POST', '/coach'], ['POST', '/api/coach'], ['POST', '/api/analyze'], ['POST', '/api/food/analyze-photo'], ['POST', '/api/food/ocr-label'], ['POST', '/api/food/barcode/8001234567890/ai-lookup']]) {
      const r = await fetch(base + p, { method, headers: { 'Content-Type': 'application/json' }, body: '{"message":"ciao"}' });
      const j = await r.json().catch(() => ({}));
      ok('7. ' + p + ' senza login: 401 AI_AUTH_REQUIRED', r.status === 401 && j.code === 'AI_AUTH_REQUIRED');
    }
    const ing = await fetch(base + '/api/ingest/document', { method: 'POST' });
    ok('7. /api/ingest/document senza login: 401', ing.status === 401);
    const other = await fetch(base + '/api/coach/features');
    ok('7b. le altre rotte /api/coach/* non passano dal controllo AI', other.status !== 401 || !/AI_AUTH_REQUIRED/.test(await other.text()));

    // 4. the /health hop counter
    const h = await (await fetch(base + '/health', { headers: { 'X-Forwarded-For': '1.2.3.4, 5.6.7.8' } })).json();
    ok('4a. /health conta gli hop di X-Forwarded-For, senza indirizzi', h.forwardedHops === 2 && !JSON.stringify(h).includes('1.2.3.4'));
  } finally {
    child.kill();
  }
}

console.log('');
console.log('--- 4. i limiti non si aggirano con X-Forwarded-For ---');
{
  const limiter = createFixedWindowRateLimiter({ windowMs: 60_000, max: 3, keyPrefix: 't' });
  let blocked = 0;
  for (let i = 0; i < 10; i++) {
    const req = { ip: '203.0.113.7', headers: { 'x-forwarded-for': '10.0.0.' + i }, socket: {} };
    const res = { statusCode: 200, setHeader() {}, status(c) { this.statusCode = c; return this; }, json() { if (this.statusCode === 429) blocked++; return this; } };
    limiter(req, res, () => {});
  }
  ok('4b. un X-Forwarded-For diverso a ogni richiesta non azzera il limite (7 bloccate su 10)', blocked === 7);
  ok('4c. l\'admin legge req.ip, non il primo X-Forwarded-For', clientIp({ ip: '203.0.113.9', headers: { 'x-forwarded-for': '6.6.6.6' }, socket: {} }) === '203.0.113.9');
  ok('4d. trust proxy configurabile, 2 di default (Render: Cloudflare + bilanciatore, misurato)', /app\.set\("trust proxy", Math\.max\(0, Number\(process\.env\.TRUST_PROXY_HOPS \|\| 2\)\)\);/.test(api));
  const forgot = api.slice(api.indexOf('app.post("/api/auth/forgot-password"'), api.indexOf('app.post("/api/auth/reset-password"'));
  const reset = api.slice(api.indexOf('app.post("/api/auth/reset-password"'), api.indexOf('app.post("/api/auth/register"'));
  ok('4e. reset: un codice al minuto per indirizzo', /Date\.now\(\) - new Date\(recent\.rows\[0\]\.created_at\)\.getTime\(\) < 60 \* 1000/.test(forgot));
  ok('4f. reset: i tentativi sbagliati non si azzerano chiedendo un codice nuovo', /attempts = CASE WHEN app_password_resets\.expires_at > NOW\(\) THEN app_password_resets\.attempts ELSE 0 END/.test(forgot));
  ok('4g. reset: il tentativo si conta prima del confronto, in una sola istruzione', /UPDATE app_password_resets SET attempts = attempts \+ 1\s+WHERE email = \$1 AND attempts < 8 AND expires_at > NOW\(\)\s+RETURNING code_hash/.test(reset) && reset.indexOf('attempts = attempts + 1') < reset.indexOf('verifyPassword(code'));
  ok('4h. reset: a 8 tentativi la riga resta bloccata (non si cancella per ripartire)', !/DELETE FROM app_password_resets WHERE email = \$1", \[email\]\);\s*\n\s*return res\.status\(429\)/.test(reset));
}

console.log('');
console.log('--- 3. login atleta ---');
{
  const login = practice.slice(practice.indexOf('app.post("/api/client/login"'), practice.indexOf('const jwtUser = {', practice.indexOf('app.post("/api/client/login"')));
  ok('3a. senza invito valido, per nome utente solo se il nome e\' di un atleta solo', /ORDER BY id DESC LIMIT 2/.test(login) && /if \(q2\.rows\.length > 1\) \{\s*\n\s*return res\.status\(401\)/.test(login) && !/LIMIT 12/.test(login));
  ok('3b. login e password dimenticata atleta hanno un limite di richieste', /app\.use\(\["\/api\/client\/login", "\/api\/client\/password-help"\], distributedRateLimiter\(/.test(api) && api.indexOf('"/api/client/login", "/api/client/password-help"') < api.indexOf('mountCoachPractice('));
}

console.log('');
console.log('--- 5. sessioni revocabili e account ripreso per email ---');
{
  const now = Date.now();
  ok('5a. un token emesso prima della revoca e\' rifiutato', tokenStillValid(Math.floor((now - 60_000) / 1000), revocationMoment(now)) === false);
  ok('5b. quello emesso subito dopo (stesso secondo) passa', tokenStillValid(Math.floor(now / 1000), revocationMoment(now)) === true);
  ok('5c. senza revoca, passa', tokenStillValid(Math.floor(now / 1000), null) === true);
  const rows = { '1': { tokens_valid_after: null }, '2': { tokens_valid_after: revocationMoment(now) } };
  let broken = false;
  const pool = { async query(sql, p) { if (broken) throw new Error('db down'); const r = rows[String(p[0])]; return { rows: r ? [r] : [] }; } };
  const gate = createSessionGate({ getPool: () => pool, ttlMs: 0 });
  const iatOld = Math.floor((now - 3600_000) / 1000);
  ok('5d. account esistente senza revoca: ok', await gate.allows({ sub: '1', iat: iatOld }));
  ok('5e. account con sessioni chiuse dopo il token: rifiutato', !(await gate.allows({ sub: '2', iat: iatOld })));
  ok('5f. account eliminato: rifiutato', !(await gate.allows({ sub: '9', iat: iatOld })));
  broken = true;
  ok('5g. database non raggiungibile: decide la firma, come prima', await gate.allows({ sub: '9', iat: iatOld }));
  ok('5h. accountFromBearer passa dal controllo', /if \(!\(await sessionGate\.allows\(payload\)\)\) return null;/.test(api));
  ok('5i. il reset della password chiude le sessioni precedenti', /UPDATE app_users SET password_hash = \$1, tokens_valid_after = \$3, updated_at = NOW\(\) WHERE email = \$2/.test(api));
  const idn = read('server/account/identity.mjs');
  ok('5j. login Google/Apple che trova l\'account per email verificata: via la password di chi l\'aveva registrato, e le sue sessioni',
    /UPDATE app_users SET password_hash = NULL, tokens_valid_after = \$2 WHERE id = \$1 AND password_hash IS NOT NULL RETURNING id/.test(idn) && /if \(matchedByEmail\) \{/.test(idn));
  const mig = read('server/db/migrations/0018_session_revocation.sql');
  ok('5k. migrazione 0018: tokens_valid_after e verifier del ticket', /ADD COLUMN IF NOT EXISTS tokens_valid_after TIMESTAMPTZ/.test(mig) && /ADD COLUMN IF NOT EXISTS verifier_hash TEXT/.test(mig));
}

console.log('');
console.log('--- 2. Android: nessuno script e nessun file da un intent ---');
{
  const main = read('app/src/main/java/com/giammaria/system/MainActivity.java');
  ok('2a. nessuno script letto dagli extra di un intent (evalJs rimosso)', !/getStringExtra\("evalJs"\)/.test(main));
  ok('2b. evaluateJavascript solo con stringhe costruite dall\'app (ticket Apple quotato, route quotata, documento scelto)', !/getStringExtra\([^)]*\)\s*\)?\s*;?\s*\n?[^\n]*evaluateJavascript/.test(main));
  const onCreateIntent = main.slice(main.indexOf('Intent intent = getIntent();'), main.indexOf('dispatchNurvanRoute(intent);', main.indexOf('Intent intent = getIntent();')));
  const onNew = main.slice(main.indexOf('protected void onNewIntent('), main.indexOf('private void debugJs('));
  ok('2c. un intent esterno non apre file (content:// o file://) nell\'import', !/handlePickedDocument/.test(onCreateIntent) && !/handlePickedDocument/.test(onNew));
  ok('2d. il selettore di file dell\'app funziona ancora (onActivityResult)', /handlePickedDocument\(result\)/.test(main));
}

console.log('');
console.log('--- 7. la pagina manda la sessione alle nostre rotte ---');
{
  const page = read('web/index.base.html');
  const at = page.indexOf('function withAccountAuth(');
  const src = page.slice(at, page.indexOf('\n}\n', at) + 3);
  const ctx = { store: { accountToken: 'tok123' }, coachEndpoint: (p) => 'https://api.example' + p, Headers: globalThis.Headers };
  vm.createContext(ctx);
  vm.runInContext(src, ctx);
  const a = ctx.withAccountAuth('https://api.example/api/chat', { headers: { 'Content-Type': 'application/json' } });
  ok('7c. aggiunge Authorization alle chiamate al nostro server', a.headers.Authorization === 'Bearer tok123' && a.headers['Content-Type'] === 'application/json');
  const b = ctx.withAccountAuth('https://api.example/api/x', { headers: { authorization: 'Bearer altro' } });
  ok('7d. non sovrascrive una sessione gia\' messa (es. coach che agisce per un atleta)', b.headers.authorization === 'Bearer altro' && !b.headers.Authorization);
  const c = ctx.withAccountAuth('https://world.openfoodfacts.org/api', {});
  ok('7e. mai verso altri siti', !c.headers);
  ok('7f. apiFetch la usa, e la foto del pasto passa da apiFetch', /fetch\(url, \{ \.\.\.withAccountAuth\(url, options\), signal: controller\.signal \}\)/.test(page) && /apiFetch\(endpoint, \{\s*\n\s*method: 'POST',\s*\n\s*headers: \{ 'Content-Type': 'application\/json' \},\s*\n\s*body: JSON\.stringify\(\{\s*\n\s*images: imagesPayload/.test(page));
  const food = read('server/food/index.mjs');
  ok('7g. ricerca alimenti: lang solo tra le lingue note', /Object\.prototype\.hasOwnProperty\.call\(FOOD_LANG_LABELS, asked\) \? asked : 'it'/.test(food));
  ok('7h. tetto per account sulle rotte AI', /keyPrefix: "ai-account"/.test(api));
}

console.log('');
if (failed) { console.log(failed + ' controlli del livello 1 falliti.'); process.exit(1); }
console.log('Tutti i controlli del livello 1 passano.');
