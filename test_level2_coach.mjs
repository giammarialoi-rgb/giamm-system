// Level 2 of the 25/09 audit, third block: a coach's own data while viewing an
// athlete, and the phone's health figures across accounts.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n');
const SRC = read('web/index.base.html');
const UI = read('web/coach-practice-ui.js');
const NL = '\n';
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
function grab(src, name) {
  const at = src.indexOf('function ' + name + '(');
  if (at < 0) return '';
  const end = src.indexOf(NL + '}', at);
  return src.slice(at, end + 2) + NL;
}

console.log('');
console.log('--- 1. il coach che guarda un atleta ---');
{
  const nav = UI.slice(UI.indexOf("if (raw === 'home' || raw === 'settings') {"), UI.indexOf("if (raw === 'import' && store.coachViewingClient"));
  ok('1a. Home o Impostazioni durante la vista atleta: prima si torna all\'area del coach (come ESCI), poi si naviga',
    /if \(store\.coachViewingClient\) \{/.test(nav) && /Promise\.resolve\(leaveCoachClientView\(true\)\)\.then\(go, go\);/.test(nav));

  const ctx = { console, Promise, store: { accountToken: 'tok' }, NurvanMemory: { active: 'personal', client: null } };
  ctx.nurvanClientAreaActive = () => ctx.NurvanMemory.active === 'client' && !!ctx.NurvanMemory.client;
  ctx.isClientStorageContext = () => false;
  ctx.coachEndpoint = (p) => 'https://api.example' + p;
  ctx.calls = [];
  ctx.apiFetch = (url, o) => { ctx.calls.push([url, o && o.method]); return Promise.resolve({ ok: true }); };
  vm.createContext(ctx);
  vm.runInContext(grab(SRC, 'coachHoldsClientData') + grab(SRC, 'accountRequest'), ctx);
  const tryUpload = async () => { try { await vm.runInContext("accountRequest('/api/account/sync', { method: 'POST', body: '{}' })", ctx); return 'sent'; } catch (e) { return 'blocked'; } };
  ok('1b. area personale: la sincronizzazione parte', await tryUpload() === 'sent');
  ctx.store.coachViewingClient = true;
  ok('1c. con la vista atleta accesa: bloccata', await tryUpload() === 'blocked');
  ctx.store.coachViewingClient = false;
  ctx.NurvanMemory = { active: 'client', client: { domain: {} } };
  ok('1d. segni spenti ma dati dell\'atleta ancora in memoria: bloccata lo stesso', await tryUpload() === 'blocked');
  ctx.isClientStorageContext = () => true;
  ok('1e. l\'atleta nella sua app (area cliente sua): la sua sincronizzazione parte', await tryUpload() === 'sent');
  ctx.isClientStorageContext = () => false;
  const read1 = await vm.runInContext("accountRequest('/api/account/me', { method: 'GET' }).then(() => 'read')", ctx).catch(() => 'blocked');
  ok('1f. le letture non si bloccano', read1 === 'read');
}

console.log('');
console.log('--- 2. dati salute del telefono e account diversi ---');
{
  const svc = read('prepare_task20_js_services.mjs');
  const body = svc.slice(svc.indexOf('async syncFromNative() {'), svc.indexOf('let raw = {};', svc.indexOf('async syncFromNative() {')));
  const ctx = { console, storage: {}, cleared: 0 };
  ctx.localStorage = { getItem: (k) => (k in ctx.storage ? ctx.storage[k] : null), setItem: (k, v) => { ctx.storage[k] = String(v); } };
  ctx.NativeConfig = { clearHealthData: () => { ctx.cleared++; } };
  ctx.accountSpaceId = (u) => String(u.id);
  vm.createContext(ctx);
  vm.runInContext('var S = { ' + body + ' return "read"; } };', ctx);
  ctx.store = { accountUser: { id: 1 } };
  ok('2a. primo account sul telefono: legge e se lo segna', (await vm.runInContext('S.syncFromNative()', ctx)) === 'read' && ctx.storage.NURVAN_HEALTH_OWNER === '1');
  ctx.store = { accountUser: { id: 2 } };
  const r2 = await vm.runInContext('S.syncFromNative()', ctx);
  ok('2b. un altro account sullo stesso telefono: i dati del precedente si cancellano, non si uniscono', r2 === null && ctx.cleared === 1 && ctx.storage.NURVAN_HEALTH_OWNER === '2');
  ctx.store = { accountUser: null };
  ok('2c. nessuno dentro: niente dati salute da attaccare', (await vm.runInContext('S.syncFromNative()', ctx)) === null);
  const main = read('app/src/main/java/com/giammaria/system/MainActivity.java');
  ok('2d. il bridge Android sa cancellarli', /public void clearHealthData\(\) \{\s+try \{\s+getSharedPreferences\("gs_health", MODE_PRIVATE\)\.edit\(\)\.clear\(\)\.apply\(\);/.test(main));
  ok('2e. ed e\' nella pagina costruita', read('web/index.html').includes("localStorage.getItem('NURVAN_HEALTH_OWNER')"));
}

console.log('');
console.log('--- 3. l\'atleta con "Resta connesso" non viene disconnesso a ogni ricarica ---');
{
  const login = UI.slice(UI.indexOf("store.stayLoggedIn = !(stayEl && stayEl.checked === false);"), UI.indexOf("store.stayLoggedIn = !(stayEl && stayEl.checked === false);") + 2500);
  ok('3a. al login con "Resta connesso" il dispositivo ricorda quale atleta riaprire (e per quale invito)',
    /if \(store\.stayLoggedIn\) localStorage\.setItem\('GS_CLIENT_ACTIVE', JSON\.stringify\(\{ user: payload\.user, inviteToken: store\.inviteToken \|\| '' \}\)\);/.test(login));
  const boot = grab(SRC, 'loadStore');
  ok('3b. all\'avvio del link riapre il suo spazio, solo se il link e\' lo stesso invito',
    /const active = JSON\.parse\(localStorage\.getItem\('GS_CLIENT_ACTIVE'\) \|\| 'null'\);/.test(boot) &&
    /\(!urlToken \|\| !active\.inviteToken \|\| urlToken === active\.inviteToken\)/.test(boot) &&
    boot.indexOf("GS_CLIENT_ACTIVE") < boot.indexOf('clientRaw = localStorage.getItem(GS_STORE_CLIENT_PENDING_KEY)'));
  ok('3c. uscendo, il dispositivo lo dimentica', /try \{ localStorage\.removeItem\('GS_CLIENT_ACTIVE'\); \} catch \(_\) \{\}/.test(UI));
}

console.log('');
if (failed) { console.log(failed + ' controlli del livello 2 (coach, salute) falliti.'); process.exit(1); }
console.log('Tutti i controlli del livello 2 (coach, salute) passano.');
