// The loads of a person's own training cannot be lost by accident: a copy is kept on the device, and a sync that
// would send "all my loads are gone" (without a deliberate clear) brings them back from the copy, or holds the
// deletion back. Run on the app's own code (web/index.base.html).
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const html = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const cut = (a, b) => { const i = html.indexOf(a); const j = html.indexOf(b, i); if (i < 0 || j < 0) throw new Error('block not found: ' + a); return html.slice(i, j); };
const code = cut('var STAMPED_MAP_FIELDS', '// One map, local and remote, key by key.');

function world(opts) {
  opts = opts || {};
  const ls = {};
  const toasts = [];
  const c = {
    console: { warn() {}, log() {}, error() {} }, JSON, Date, Math, String, Number, Array, Object, Promise,
    localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } },
    toasts, ls,
    showToast: (m, k) => toasts.push([m, k]),
    confirm: () => true, persist() {}, render() {},
    personalScopedKey: (n) => n + '__u_1',
    isClientStorageContext: () => !!opts.client,
    coachHoldsClientData: () => !!opts.coachHolds,
    isAthleteRole: () => false,
    appLocale: () => 'it-IT',
    store: { data: {}, subs: {}, skips: {}, customSets: {}, loadTypes: {}, tempos: {}, exIntensity: {}, bonus: {}, bw: {}, exMuscle: {}, nutritionDaily: {}, intelTargets: {}, warmups: {}, warmupProgress: {}, mapStamps: {}, mapDeletes: {}, mapSyncBase: null, activeProgramId: 'p1' },
    window: {}
  };
  c.personalDomain = () => c.store;
  vm.createContext(c);
  vm.runInContext(code, c);
  return c;
}
const keys = (n, v) => { const o = {}; for (let i = 0; i < n; i++) o['w1_d0_e' + i + '_s1_load'] = String(v || 40 + i); return o; };
const count = (o) => Object.keys(o || {}).length;

// ---- a copy is kept
{
  const w = world();
  w.store.data = keys(100); w.store.subs = { w1_d0_e1: 'X' };
  ok('1a. the first look with loads keeps a copy', vm.runInContext('saveTrainingSafetyCopy("test", true)', w) === true && vm.runInContext('trainingSafetyCopies().length', w) === 1);
  ok('1b. the same record is not copied twice', vm.runInContext('saveTrainingSafetyCopy("test", true)', w) === false);
  w.store.data = keys(101);
  vm.runInContext('saveTrainingSafetyCopy("test", true)', w);
  w.store.data = keys(102);
  vm.runInContext('saveTrainingSafetyCopy("test", true)', w);
  ok('1c. only the last two copies stay', vm.runInContext('trainingSafetyCopies().length', w) === 2 && vm.runInContext('trainingSafetyCopies()[1].sig', w).startsWith('102'));
  const small = world(); small.store.data = keys(10);
  ok('1d. a record with a few loads has nothing worth a copy', vm.runInContext('saveTrainingSafetyCopy("test", true)', small) === false);
  const inClient = world({ coachHolds: true }); inClient.store.data = keys(100);
  ok('1e. a client\'s data in a coach session is never copied as the coach\'s own', vm.runInContext('saveTrainingSafetyCopy("test", true)', inClient) === false);
  const athlete = world({ client: true }); athlete.store.data = keys(100);
  ok('1f. nor an athlete\'s own space', vm.runInContext('saveTrainingSafetyCopy("test", true)', athlete) === false);
}

// ---- the incident: the loads are gone at the next look
{
  const w = world();
  w.store.data = keys(200);
  vm.runInContext('store.mapSyncBase = mapSnapshot(); saveTrainingSafetyCopy("test", true);', w);
  w.store.data = {};          // wiped
  vm.runInContext('stampLocalMapChanges(Date.now())', w);
  ok('2a. the loads come back from the copy', count(w.store.data) === 200);
  ok('2b. and are not sent as deletions', count(w.store.mapDeletes.data) === 0);
  ok('2c. the person is told', w.toasts.some((t) => /ripristinato i carichi/.test(t[0])));
  ok('2d. the restored keys carry a time (every device takes them)', count(w.store.mapStamps.data) === 200);
}
{
  const w = world();
  w.store.data = keys(200);
  vm.runInContext('store.mapSyncBase = mapSnapshot();', w);   // no copy kept
  w.store.data = {};
  vm.runInContext('stampLocalMapChanges(Date.now())', w);
  ok('3a. with no copy the deletion is held back: no tombstones', count(w.store.mapDeletes.data) === 0);
  ok('3b. and the reference stays, so the cloud fills the gap at the next download', count(w.store.mapSyncBase.data) === 200);
  // the cloud's keys arrive: the guard is quiet again
  w.store.data = keys(200);
  vm.runInContext('stampLocalMapChanges(Date.now())', w);
  ok('3c. once the loads are back nothing is held any more', count(w.store.mapDeletes.data) === 0 && count(w.store.data) === 200);
}

// ---- what is NOT a wipe
{
  const w = world();
  w.store.data = keys(200);
  vm.runInContext('store.mapSyncBase = mapSnapshot(); saveTrainingSafetyCopy("test", true);', w);
  w.store.data = {};
  vm.runInContext('resetMapStampsFor(["data"])', w);          // "Azzera carichi" / a program switch
  vm.runInContext('stampLocalMapChanges(Date.now())', w);
  ok('4a. a deliberate clear (the reference restarts) is left alone', count(w.store.data) === 0 && count(w.store.mapDeletes.data) === 0);
}
{
  const w = world();
  w.store.data = keys(200);
  vm.runInContext('store.mapSyncBase = mapSnapshot(); saveTrainingSafetyCopy("test", true);', w);
  Object.keys(w.store.data).slice(0, 20).forEach((k) => delete w.store.data[k]);
  vm.runInContext('stampLocalMapChanges(Date.now())', w);
  ok('4b. a few deletions are normal edits: recorded, nothing restored', count(w.store.data) === 180 && count(w.store.mapDeletes.data) === 20);
}
{
  const w = world({ coachHolds: true });
  w.store.data = keys(200);
  vm.runInContext('store.mapSyncBase = mapSnapshot();', w);
  w.store.data = {};
  vm.runInContext('stampLocalMapChanges(Date.now())', w);
  ok('4c. inside a coach\'s client area the guard does not touch anything', count(w.store.data) === 0);
}
{
  const w = world({ client: true });
  w.store.data = keys(200);
  vm.runInContext('store.mapSyncBase = mapSnapshot();', w);
  w.store.data = {};
  vm.runInContext('stampLocalMapChanges(Date.now())', w);
  ok('4d. an athlete\'s own space follows the old rules', count(w.store.data) === 0 && count(w.store.mapDeletes.data) === 200);
}

// ---- the restore button
{
  const w = world();
  w.store.data = keys(100);
  vm.runInContext('saveTrainingSafetyCopy("test", true)', w);
  w.store.data = Object.assign({}, keys(60), { w1_d0_e0_s1_load: '999' });
  vm.runInContext('restoreTrainingFromSafetyUi()', w);
  ok('5a. it adds the missing loads and never overwrites one that exists', count(w.store.data) === 100 && w.store.data.w1_d0_e0_s1_load === '999');
  ok('5b. it says what it did', w.toasts.some((t) => /Carichi ripristinati/.test(t[0])));
  const none = world();
  vm.runInContext('restoreTrainingFromSafetyUi()', none);
  ok('5c. with no copy it says so', none.toasts.some((t) => /Nessuna copia/.test(t[0])));
}

// ---- wiring in the page
ok('6a. a copy is taken before any client area is opened', /function nurvanEnterClientArea\(\) \{\n  try \{ saveTrainingSafetyCopy\('before-client-area', true\)/.test(html));
ok('6b. the payload of a coach session is never built from the markers', /const bakHasData = !!\(bak && \(bak\.data \|\| bak\.DATA \|\| bak\.activeProgram\)\);/.test(html) && /&& !bakHasData\) \{/.test(html));
ok('6c. the button is in Privacy e dati, only with a copy and not for athletes', /trainingSafetyCopies\(\)\.length\) \? '<button[^']*restoreTrainingFromSafetyUi\(\)/.test(html));

// ---- the cause found on 05-10-2026: the client view's live poll kept writing into whichever area was on screen
const ui = fs.readFileSync('web/coach-practice-ui.js', 'utf8').replace(/\r\n/g, '\n');
ok('7a. the live poll stops by itself when the coach\'s own area is back on screen (before and after its request)',
  /const ownAreaBack = function \(\) \{ return typeof nurvanClientAreaActive === 'function' && !nurvanClientAreaActive\(\); \};/.test(ui)
  && /if \(ownAreaBack\(\)\) \{ stopStale\(\); return; \}/.test(ui)
  && /The answer can arrive after the area changed\./.test(ui));
ok('7b. leaving the client area ends the client view (flag and poll), whichever way it was left',
  /if \(!left\) return;\n(  \/\/[^\n]*\n)+  try \{ stopClientLivePoll\(\); \} catch \(_\) \{\}\n  store\.coachViewingClient = false;/.test(ui));
ok('7c. starting an assignment from the client view ends the view (both ways into the sandbox)',
  /function beginAssignSandbox\(clientId, name, mode\) \{\n  requestNotifyPermission\(\);\n(  \/\/[^\n]*\n)+  try \{ stopClientLivePoll\(\); \} catch \(_\) \{\}\n  store\.coachViewingClient = false;/.test(ui)
  && /if \(!store\.coachAssigning\) \{\n    try \{ stopClientLivePoll\(\); \} catch \(_\) \{\}\n    store\.coachViewingClient = false;/.test(ui));

if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nCarichi al sicuro: copia sul dispositivo e controllo a ogni sincronizzazione.');
