// A coach's client and the normal app live at the same address and share a
// browser's storage. What keeps them apart is one rule - the address decides:
// /c/<invite> is the client's space, the rest is the normal app - and nothing
// a session of one kind leaves behind may turn a page of the other into it.
// The whole scenario is tried in a real browser by
// tools/browser-checks/seal_test.mjs; here, the rules it rests on.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const idx = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const cpu = fs.readFileSync('web/coach-practice-ui.js', 'utf8').replace(/\r\n/g, '\n');
const plans = fs.readFileSync('web/plans-ui.js', 'utf8').replace(/\r\n/g, '\n');
const server = fs.readFileSync('coach-practice.mjs', 'utf8').replace(/\r\n/g, '\n');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('block not found: ' + a); return src.slice(i, j); };

// --- the server -----------------------------------------------------------
ok('1a. il server non rimanda più l’indirizzo principale al link cliente per un cookie', !/res\.redirect\(302, "\/c\/"/.test(server) && !/mode === "client" && isSafeInviteToken\(ctx\)/.test(server));
ok('1b. il link cliente resta servito con il suo invito scritto nella pagina', /app\.get\("\/c\/:token"/.test(server) && /injectClientPwaHtml/.test(server));
ok('1c. le rotte del coach e quelle del cliente hanno ognuna il suo controllo', /requireCoach/.test(server) && /requireAthlete/.test(server) && /loadOwnedClient/.test(server));

// --- the address decides ---------------------------------------------------
function world(href, opts = {}) {
  const url = new URL(href);
  const ls = {};
  const c = {
    console, JSON, String, Object, URLSearchParams, decodeURIComponent, encodeURIComponent, RegExp,
    location: { pathname: url.pathname, search: url.search, hash: '' },
    window: { navigator: { standalone: !!opts.standalone }, matchMedia: () => ({ matches: !!opts.standalone }) },
    document: { cookie: opts.cookie || '' },
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } },
    history: { replaceState() { c.rewritten = true; } },
    store: opts.store || {},
    GS_STORE_CLIENT_PENDING_KEY: 'GS_STORE_CLIENT',
    persistNurvanAppMode() { c.modeWritten = true; }
  };
  if (opts.shell) ls.GS_CLIENT_SHELL = JSON.stringify({ inviteToken: opts.shell, locked: true });
  vm.createContext(c);
  vm.runInContext(cut(idx, 'function detectClientBootContext() {', 'function isClientStorageContext() {')
    + cut(idx, 'function restoreClientShellSync() {', 'var store = loadStore();')
    + '\nthis.api = { restore: restoreClientShellSync, mayResume: clientShellMayResume, pendingKey: clientPendingStoreKey, token: nurvanClientUrlToken };', c);
  c.ls = ls;
  return c;
}
const leftovers = { cookie: 'nurvan_client_ctx=TOKA; nurvan_app_mode=client', shell: 'TOKA' };
{
  const c = world('https://app.nurvan.app/', Object.assign({ store: { accountToken: 'personal', accountUser: { id: 1 } } }, leftovers));
  ok('2a. app normale con un account personale: cookie e flag di un link cliente vengono ignorati', c.api.restore() === '' && !c.store.clientShell && !c.rewritten);
  const c2 = world('https://app.nurvan.app/', leftovers);
  ok('2b. app normale senza nessuno collegato: resta l’app normale lo stesso', c2.api.restore() === '' && !c2.store.clientShell && !c2.rewritten && !c2.modeWritten);
  const c3 = world('https://app.nurvan.app/', Object.assign({ store: { accountToken: 'personal', accountUser: { id: 1 }, clientShell: true, __cpClientScoped: true, inviteToken: 'TOKA' } }, leftovers));
  c3.api.restore();
  ok('2c. un archivio personale rimasto segnato come cliente viene rimesso a posto', c3.store.clientShell === false && c3.store.__cpClientScoped === false && c3.store.inviteToken === '');
  const c4 = world('https://app.nurvan.app/c/TOKB', leftovers);
  ok('2d. al link cliente è una sessione cliente, con l’invito dell’indirizzo e non quello rimasto', c4.api.restore() === 'TOKB' && c4.store.clientShell === true && c4.store.inviteToken === 'TOKB');
  const c5 = world('https://app.nurvan.app/', Object.assign({ standalone: true }, leftovers));
  ok('2e. unica eccezione: l’app del cliente già installata sul telefono, che si apre all’indirizzo principale', c5.api.mayResume() === true && c5.api.restore() === 'TOKA');
  ok('2f. prima dell’accesso ogni invito tiene il suo stato, non uno comune', world('https://app.nurvan.app/c/TOKA').api.pendingKey() !== world('https://app.nurvan.app/c/TOKB').api.pendingKey() && world('https://app.nurvan.app/c/TOK%2FX').api.pendingKey() === 'GS_STORE_CLIENT_t_TOK_X');
}
ok('2g. anche l’avvio dell’area coach rispetta la regola', /else if \(!urlToken && typeof clientShellMayResume === 'function' && clientShellMayResume\(\)\)/.test(cpu) && /const token = urlToken \|\| \(mayResume \? store\.inviteToken : ''\)/.test(cpu));

// --- what each side keeps is its own -----------------------------------------
{
  const mk = (client) => { const c = { isClientStorageContext: () => client, localStorage: { getItem: () => null, setItem() {}, removeItem() {} }, window: {} }; c.self = c; vm.createContext(c); vm.runInContext(cut(plans, 'var PLAN_ENTITLEMENT_KEY', 'function planLib()') + '\nthis.key = planEntitlementKey();', c); return c.key; };
  ok('3a. il piano ricordato dal link cliente non è quello dell’account personale', mk(false) === 'nurvan.entitlement.v1' && mk(true) === 'nurvan.entitlement.client.v1');
}
{
  const ls = { NURVAN_E2E_KEYPAIR: 'OLD' };
  const c = { String, store: { accountUser: { id: 'coach1' } }, localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } } };
  vm.createContext(c);
  vm.runInContext(cut(cpu, 'function e2eKeyStorageName() {', 'async function getOrCreateE2EKeyPair() {') + '\nthis.name = e2eKeyStorageName;', c);
  const coachKey = c.name();
  c.store.accountUser = { id: 'athlete9' };
  const athleteKey = c.name();
  ok('3b. la chiave della chat è di un account: coach e cliente sullo stesso browser non la condividono', coachKey !== athleteKey && ls[coachKey] === 'OLD' && !ls[athleteKey]);
}
ok('3c. il link cliente ha il suo database locale, non quello personale', /NURVAN_PERSONAL_DB_NAME \+ '__client_'/.test(idx));

// --- what a client can open -------------------------------------------------
{
  const c = { store: { clientShell: true }, isAthleteRole: () => true, isClientStorageContext: () => true, window: {} };
  vm.createContext(c);
  vm.runInContext(cut(cpu, 'function gatePracticeView(v) {', '\nfunction ', ) + '\nthis.gate = gatePracticeView;', c);
  const coachViews = ['coachHub', 'coachClient', 'coachToday', 'coachInbox', 'coachChat', 'coachPrograms', 'coachImport', 'coachCalendar', 'coachLibrary', 'coachCheckIns', 'coachNutrition', 'coachAnalytics', 'coachAgent', 'coachAutomations', 'coachBusiness', 'coachCrm', 'coachActionCenter', 'coachFormReview', 'coachMealAi', 'coachAgentAudit', 'pricing', 'programs', 'db'];
  ok('4a. un cliente non apre nessuna schermata del coach', coachViews.every((v) => c.gate(v) === 'home'));
  ok('4b. le sue pagine restano sue', ['home', 'training', 'nutrition', 'supplements', 'therapy', 'exams', 'stats', 'calendar', 'clientChat'].every((v) => c.gate(v) === v));
  ok('4c. Coach AI mai, nemmeno con un vecchio permesso rimasto', c.gate('ai') === 'home' && (c.store.clientProfile = { allowNurvanAi: true }, c.gate('ai') === 'home'));
  c.isAthleteRole = () => false;
  ok('4d. vale già dal link aperto, prima dell’accesso', c.gate('coachHub') === 'home');
}
ok('4e. il controllo è dove la pagina viene disegnata, non solo dove viene chiesta', /var allowedView = gatePracticeView\(currentView\)/.test(idx) && /const allowed = gatePracticeView\(currentView\);/.test(cpu));
ok('5. uscire dal link cliente resta nel link cliente (non carica l’account personale nella stessa pagina)', /location\.replace\(tok \? '\/c\/' \+ encodeURIComponent\(tok\) : '\/'\)/.test(idx) && !/history\.replaceState\(null, '', '\/'\); \} catch \(_\) \{\}\n    restorePersonalStoreFromNamespace\(\);/.test(idx));

console.log('');
if (failed) { console.log(failed + ' controlli del link cliente falliti.'); process.exit(1); }
console.log('Tutti i controlli del link cliente passano.');
