// Adding a superset from the top of the workout: a list opens (no selection mode down the page) and the user says whether it
// holds only this time (this session, this week) or for the whole program (the same session in every week).
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const idx = fs.readFileSync('web/index.base.html', 'utf8').replace(/\r\n/g, '\n');
const cut = (src, a, b) => { const i = src.indexOf(a); const j = src.indexOf(b, i); if (i < 0 || j < 0) throw new Error('block not found: ' + a); return src.slice(i, j); };

// --- the page -------------------------------------------------------------------------------
ok('1a. il pulsante SUPERSET in alto apre l’elenco', /onclick="openSupersetModal\(\)">SUPERSET<\/button>/.test(idx));
ok('1b. niente più caselle da spuntare in fondo alla pagina', !/__ssSelect/.test(idx) && !/toggleSupersetPick/.test(idx) && /const ssPick = '';/.test(idx));
ok('1c. le due scelte sono chieste esplicitamente: solo questa volta / tutta la programmazione', /applySelectedSuperset\(\\'once\\'\)">SOLO QUESTA VOLTA/.test(idx) && /applySelectedSuperset\(\\'program\\'\)">TUTTA LA PROGRAMMAZIONE/.test(idx));
ok('1d. anche scollegare chiede la stessa cosa quando il superset è in altre settimane', /unlinkSupersetScope\(\\'' \+ esc\(ssId\) \+ '\\',\\'once\\'\)/.test(idx) && /Lo scolleghi solo questa volta o in tutta la programmazione\?/.test(idx));
for (const name of ['openSupersetModal', 'closeSupersetModal', 'applySelectedSuperset', 'unlinkSuperset', 'unlinkSupersetScope']) {
  ok('1e. window.' + name + ' esportata', new RegExp('window\\.' + name + ' = ' + name).test(idx));
}

// --- the behaviour --------------------------------------------------------------------------
function world(weeksCount) {
  const mkWeek = (w) => ({ sessions: [
    { exercises: [{ name: 'Squat' }, { name: 'Panca piana' }, { name: 'Rematore' }, { name: 'Curl' }] },
    { exercises: [{ name: 'Stacco' }, { name: 'Lat machine' }] }
  ] });
  const DATA = { weeks: Array.from({ length: weeksCount }, (_, i) => mkWeek(i)) };
  // week 3 has the exercises in another order, week 4 has lost "Panca piana"
  if (weeksCount >= 3) DATA.weeks[2].sessions[0].exercises = [{ name: 'Rematore' }, { name: 'PANCA PIANA ' }, { name: 'Squat' }, { name: 'Curl' }];
  if (weeksCount >= 4) DATA.weeks[3].sessions[0].exercises = [{ name: 'Squat' }, { name: 'Rematore' }, { name: 'Curl' }];
  let picks = [];
  const toasts = [];
  const c = {
    DATA, currentWeek: 2, currentDay: 0, store: { subs: {} }, String, Date, Number, Array,
    $: () => null, esc: (s) => String(s),
    exerciseNameAt: () => '', sessionSupersetLetter: () => 'A',
    pushWorkoutUndoSnapshot() {}, persistActiveProgramStructure() { c.persisted = (c.persisted || 0) + 1; }, render() { c.rendered = (c.rendered || 0) + 1; },
    showToast: (m) => toasts.push(m),
    document: { querySelectorAll: () => picks.map((v) => ({ value: String(v) })), body: { appendChild() {} }, createElement: () => ({ style: {} }) }
  };
  c.currentSessionExercises = () => DATA.weeks[c.currentWeek - 1].sessions[c.currentDay].exercises;
  c.setPicks = (p) => { picks = p; };
  c.toasts = toasts;
  vm.createContext(c);
  vm.runInContext(cut(idx, 'function programSessionRows(weekIdx, dayIdx) {', 'function updateData(key, val){') + '\nthis.apply = applySelectedSuperset; this.unlink = unlinkSuperset; this.unlinkScope = unlinkSupersetScope; this.weeksWith = supersetWeeksWith;', c);
  return c;
}
const ssOf = (c, wi, di = 0) => c.DATA.weeks[wi].sessions[di].exercises.map((e) => e.superset_id || null);
{
  const c = world(4);
  c.setPicks([0, 1]);   // Squat + Panca piana, in week 2
  c.apply('once');
  ok('2a. solo questa volta: la settimana 2 ha il superset', ssOf(c, 1)[0] && ssOf(c, 1)[0] === ssOf(c, 1)[1] && !ssOf(c, 1)[2]);
  ok('2b. solo questa volta: le altre settimane non cambiano', [0, 2, 3].every((w) => ssOf(c, w).every((x) => x === null)));
  ok('2c. la seduta viene salvata e ridisegnata, e dice che vale solo per questa volta', c.persisted === 1 && c.rendered === 1 && /solo per questa volta/.test(c.toasts[0]));
}
{
  const c = world(4);
  c.setPicks([0, 1]);
  c.apply('program');
  const id = ssOf(c, 1)[0];
  ok('3a. tutta la programmazione: stesso superset nella settimana 1', ssOf(c, 0)[0] === id && ssOf(c, 0)[1] === id && ssOf(c, 0)[2] === null);
  ok('3b. gli esercizi si trovano per nome anche in un altro ordine e con maiuscole/spazi diversi (settimana 3)', ssOf(c, 2)[2] === id && ssOf(c, 2)[1] === id && ssOf(c, 2)[0] === null);
  ok('3c. una settimana senza i due esercizi non viene toccata (settimana 4 senza Panca piana)', ssOf(c, 3).every((x) => x === null));
  ok('3d. avvisa in quante settimane è stato collegato', /3 settimane su 4/.test(c.toasts[0]));
  ok('3e. un’altra seduta (giorno 2) non viene toccata', [0, 1, 2, 3].every((w) => ssOf(c, w, 1).every((x) => x === null)));
}
{
  const c = world(4);
  c.setPicks([0]);
  c.apply('program');
  ok('4a. con un solo esercizio non succede nulla e lo dice', ssOf(c, 1).every((x) => x === null) && !c.persisted && /almeno 2/.test(c.toasts[0]));
}
{
  const c = world(4);
  c.setPicks([0, 1]); c.apply('program');
  const id = ssOf(c, 1)[0];
  ok('5a. il superset risulta in 3 settimane', c.weeksWith(id).length === 3);
  c.unlinkScope(id, 'once');
  ok('5b. scollegare solo questa volta toglie solo la settimana 2', ssOf(c, 1).every((x) => x === null) && ssOf(c, 0)[0] === id && ssOf(c, 2)[1] === id);
  c.unlinkScope(id, 'program');
  ok('5c. scollegare tutta la programmazione le toglie da tutte', [0, 1, 2, 3].every((w) => ssOf(c, w).every((x) => x === null)));
}
{
  const c = world(1);
  c.currentWeek = 1;
  c.setPicks([2, 3]); c.apply('program');
  ok('6a. un programma di una sola settimana funziona lo stesso', ssOf(c, 0)[2] && ssOf(c, 0)[2] === ssOf(c, 0)[3]);
}

console.log(failed ? '\n' + failed + ' FAILED' : '\nAll good.');
process.exit(failed ? 1 : 0);
