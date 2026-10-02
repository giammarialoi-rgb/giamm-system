// The screen stays on while a workout is under way, and is let go when it
// ends: the rule (when), and the three ways it is kept on (web, Android, iOS).
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const html = fs.readFileSync('web/index.base.html', 'utf8');
const from = html.indexOf('let workoutWakeLock = null;');
const to = html.indexOf('function nativeVibrate(ms) {');
ok('0. il blocco è nella pagina', from > 0 && to > from);

function world() {
  const calls = { native: [], ios: [], web: 0, released: 0 };
  const c = {
    store: { sessionStartedAt: null, sessionClockRunning: false },
    currentView: 'home',
    window: {},
    document: { visibilityState: 'visible', addEventListener() {} },
    NativeConfig: { keepScreenOn: (on) => calls.native.push(on) },
    capacitorPlugin: (name) => (name === 'KeepAwake' ? { keepAwake: () => calls.ios.push(true), allowSleep: () => calls.ios.push(false) } : null),
    navigator: { wakeLock: { request: () => { calls.web++; return Promise.resolve({ release() { calls.released++; }, addEventListener() {} }); } } },
    Date, Number, Promise
  };
  vm.createContext(c);
  vm.runInContext(html.slice(from, to) + '\nthis.api = { want: workoutWantsScreenOn, sync: syncWorkoutScreenAwake };', c);
  return { c, calls };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

{
  const { c, calls } = world();
  ok('1a. senza allenamento in corso lo schermo non viene tenuto acceso', c.api.want() === false && (c.api.sync(), calls.native.length === 0 && calls.web === 0));
  c.store.sessionStartedAt = Date.now(); c.store.sessionClockRunning = true; c.currentView = 'training';
  c.api.sync(); await tick();
  ok('1b. allenamento avviato nella schermata di allenamento: acceso (web, Android, iOS)', c.api.want() && calls.native.join() === 'true' && calls.ios.join() === 'true' && calls.web === 1);
  c.api.sync(); await tick();
  ok('1c. non viene richiesto di nuovo a ogni secondo', calls.native.length === 1 && calls.web === 1);
  c.store.sessionClockRunning = false;
  c.api.sync(); await tick();
  ok('1d. in pausa si spegne come sempre', calls.native.join() === 'true,false' && calls.ios.join() === 'true,false' && calls.released === 1);
  c.store.sessionClockRunning = true; c.currentView = 'nutrition';
  ok('1e. fuori dalla schermata di allenamento no', c.api.want() === false);
  c.currentView = 'training'; c.store.sessionStartedAt = Date.now() - 5 * 3600 * 1000;
  ok('1f. un timer dimenticato acceso da più di 4 ore non tiene sveglio il telefono', c.api.want() === false);
}
{
  const { c, calls } = world();
  c.window.__lesson = { steps: [] };
  ok('2a. lezione a tempo aperta: acceso anche senza timer di seduta', c.api.want() === true);
  c.window.__lesson = null; c.window.__circuitPlayer = { c: {} };
  ok('2b. circuito aperto: acceso', c.api.want() === true);
  c.document.visibilityState = 'hidden';
  ok('2c. con l’app in secondo piano no', c.api.want() === false);
  c.document.visibilityState = 'visible';
  c.api.sync(); await tick();
  // The browser drops the lock when the page is hidden: asked for again.
  vm.runInContext('workoutWakeLock = null;', c);
  c.api.sync(); await tick();
  ok('2d. se il browser lo rilascia, viene richiesto di nuovo', calls.web === 2);
}

ok('3a. collegato a timer di seduta, lezione, circuito e cambio schermata', (html.match(/try \{ syncWorkoutScreenAwake\(\); \} catch \(_\) \{\}/g) || []).length >= 9 && /document\.addEventListener\('visibilitychange', function \(\) \{ try \{ syncWorkoutScreenAwake\(\)/.test(html));
ok('3b. Android: comando nativo', /public void keepScreenOn\(final boolean on\)/.test(fs.readFileSync('app/src/main/java/com/giammaria/system/MainActivity.java', 'utf8')) && /FLAG_KEEP_SCREEN_ON/.test(fs.readFileSync('app/src/main/java/com/giammaria/system/MainActivity.java', 'utf8')));
ok('3c. iOS: plugin installato', /"@capacitor-community\/keep-awake"/.test(fs.readFileSync('package.json', 'utf8')) && /CapacitorCommunityKeepAwake/.test(fs.readFileSync('ios/App/Podfile', 'utf8')));

console.log('');
if (failed) { console.log(failed + ' controlli dello schermo acceso falliti.'); process.exit(1); }
console.log('Tutti i controlli dello schermo acceso passano.');
