// Superset: closing a working set leads to the same set of the next linked
// exercise with no rest; the rest starts only when the round is over, and
// lasts the longest prescribed among the linked exercises.
import fs from 'node:fs';
import vm from 'node:vm';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const SRC = fs.readFileSync('web/index.base.html', 'utf8');
const block = (start) => {
  const at = SRC.indexOf(start);
  if (at < 0) throw new Error(start);
  let d = 0;
  for (let i = SRC.indexOf('{', at); i < SRC.length; i++) {
    if (SRC[i] === '{') d++;
    else if (SRC[i] === '}' && --d === 0) return SRC.slice(at, i + 1);
  }
  throw new Error('unterminated ' + start);
};
const ctx = {
  currentWeek: 1, currentDay: 0,
  store: { data: {}, skips: {}, customSets: {}, subs: {} },
  window: {},
  restOverrides() { return {}; },
  DATA: { weeks: [{ sessions: [{ exercises: [
    { name: 'Panca', superset_id: 'ss1', rest: '90s', sets: [{ warmup: true }, {}, {}] },
    { name: 'Rematore', superset_id: 'ss1', rest: '2 min', sets: [{}, {}] },
    { name: 'Curl', rest: '60s', sets: [{}, {}] },
  ] }] }] },
};
vm.createContext(ctx);
vm.runInContext(['function parseRestSeconds(', 'function restOverrideFor(', 'function effectiveRestSeconds(', 'function isWarmupSet(', 'function countWarmupSets(', 'function exerciseRowAt(', 'function getExerciseSetCount(', 'function supersetWorkingSets(', 'function supersetNextStep('].map(block).join('\n'), ctx);
const run = (code) => vm.runInContext(code, ctx);
const done = (e, s) => { ctx.store.data[`w1_d0_e${e}_s${s}_done`] = true; };

ok('1a. esercizio non in superset: nessun cambio', run('supersetNextStep(2, 1)') === null);
done(0, 2);
const a = run('supersetNextStep(0, 2)');
ok('1b. prima allenante di Panca (dopo il riscaldamento) porta alla serie 1 di Rematore', a && a.next && a.next.exIdx === 1 && a.next.setNum === 1);
done(1, 1);
const b = run('supersetNextStep(1, 1)');
ok('1c. fine giro: riposo, il piu\' lungo dei due (2 min di Rematore)', b && !b.next && b.restKey === 'w1_d0_e1' && b.sec === 120);
ctx.store.skips.w1_d0_e1 = 'saltato';
ok('1d. se il collegato e\' saltato, niente superset', run('supersetNextStep(0, 3)') === null);
ok('2a. il ✓ usa il passo del superset', /const ssStep = isWarm \? null : supersetNextStep\(exIdx, setNum\);/.test(SRC));

console.log('');
if (failed) { console.log(failed + ' controlli del superset falliti.'); process.exit(1); }
console.log('Tutti i controlli del superset passano.');
