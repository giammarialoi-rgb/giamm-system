// Le serie di riscaldamento: proposte dall'app, controllate dal coach.
//
// Quattro cose devono tornare. La rampa: da un carico allenante escono le
// serie giuste, arrotondate al disco. Le esclusioni: un riscaldamento chiuso
// non e' volume, non e' record, non misura il recupero e non entra nel
// contatore. Il coach: nella revisione toglie la rampa con un tap, la
// ritocca a mano (e l'automatico si spegne), la fa ricalcolare cambiando il
// carico. L'atleta: la serie si vede e si spunta, o resta nascosta e la
// seduta parte dalla prima allenante.
//
// Le regole vivono nel modulo delle progressioni e nella pagina: qui girano
// quelle vere, ritagliate dal sorgente, piu' il generatore e il motore.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { enforceExercisePrescription } from './prescription-engine.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8').replace(/\r\n/g, '\n');
const BUILT = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8').replace(/\r\n/g, '\n');

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
function eq(actual, expected, message) {
  const a = actual !== null && typeof actual === 'object' ? JSON.stringify(actual) : actual;
  const b = expected !== null && typeof expected === 'object' ? JSON.stringify(expected) : expected;
  try { assert.equal(a, b); console.log('OK   ' + message); }
  catch (e) { failed++; console.log('FAIL ' + message + '\n     atteso ' + JSON.stringify(expected) + ', ottenuto ' + JSON.stringify(actual)); }
}
function grab(name) {
  const at = SRC.indexOf('function ' + name + '(');
  if (at < 0) return '';
  const end = SRC.indexOf('\n}', at);
  return end < 0 ? '' : SRC.slice(at, end + 2) + '\n';
}
const ramp = (sets) => sets.filter((s) => s.warmup).map((s) => s.target_load + 'x' + s.reps).join(' ');

// The browser libraries, in one context.
const lib = { self: {}, console };
lib.window = lib.self;
vm.createContext(lib);
for (const file of ['web/exercise-taxonomy.js', 'web/program-builder.js', 'web/progression-models.js', 'web/cardio-library.js', 'web/program-generator.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), lib);
}
const P = lib.self.NurvanProgressions;
const G = lib.self.NurvanProgramGenerator;

console.log('\n--- 0. i pezzi ci sono ---');
ok('0a. il modulo delle progressioni espone la rampa', P && typeof P.warmupSetsFor === 'function' && typeof P.applyWarmupRamp === 'function' && typeof P.warmupRestSeconds === 'function');
ok('0b. la pagina costruita ha gli helper', /function isWarmupSet\(s\)/.test(BUILT) && /function countWarmupSets\(sets\)/.test(BUILT) && /function warmupRestTextFor\(restText\)/.test(BUILT));

console.log('\n--- 1. la rampa sale al carico allenante, a dischi da 2,5 ---');
{
  eq(ramp(P.warmupSetsFor(80)), '40x6 60x3', '1a. 80 kg: 40×6, 60×3');
  eq(ramp(P.warmupSetsFor(120)), '50x6 72.5x4 97.5x2', '1b. 120 kg: 50×6, 72,5×4, 97,5×2');
  eq(ramp(P.warmupSetsFor(90)), '45x6 67.5x3', '1c. 90 kg: 45×6, 67,5×3');
  eq(ramp(P.warmupSetsFor(30)), '15x8', '1d. 30 kg: una sola serie, 15×8');
  eq(ramp(P.warmupSetsFor(40)), '20x8', '1e. 40 kg e\' ancora la fascia leggera');
  eq(ramp(P.warmupSetsFor(100)), '50x6 75x3', '1f. 100 kg e\' ancora la fascia media');
  eq(ramp(P.warmupSetsFor(47)), '25x6 37.5x3', '1g. 23,5 diventa 25 e 35,25 diventa 37,5: si arrotonda al disco per eccesso');
  eq(P.warmupSetsFor(0).length + P.warmupSetsFor(null).length + P.warmupSetsFor(-10).length, 0, '1h. senza carico, nessuna rampa');
  ok('1i. ogni serie porta il flag e il tipo', P.warmupSetsFor(80).every((s) => s.warmup === true && s.set_type === 'warmup'));
  eq([90, 60, 40, 180, 75].map(P.warmupRestSeconds), [45, 30, 30, 90, 40], '1j. recupero fra riscaldamenti: meta\', a 5 s, mai sotto 30');
  const row = { sets: [{ reps: '8', target_load: 80 }, { reps: '8', target_load: 80 }, { reps: '8', target_load: 80 }] };
  P.applyWarmupRamp(row);
  eq(row.sets.length, 5, '1k. la rampa si mette davanti alle allenanti');
  eq(P.workingSetsOf(row.sets).length, 3, '1l. e le allenanti restano tre');
  row.sets[2].target_load = 90; row.sets[3].target_load = 90; row.sets[4].target_load = 90;
  P.applyWarmupRamp(row);
  eq(ramp(row.sets), '45x6 67.5x3', '1m. riapplicata su 90 kg, la rampa vecchia sparisce e arriva quella nuova');
  const noLoad = { sets: [{ reps: '8', target_load: null }] };
  P.applyWarmupRamp(noLoad);
  eq(noLoad.sets.length, 1, '1n. senza carico la riga resta com\'era');
}

console.log('\n--- 2. il generatore la scrive solo sul fondamentale con un carico ---');
{
  const kg = G.plan({ days: 4, weeks: 4, goal: 'forza', modelId: 'block_pl', loadDisplay: 'kg', maxes: { squat: 150, bench: 100, deadlift: 180, press: 60 } });
  const rows = kg.weeks.flatMap((w) => w.sessions.flatMap((s) => s.exercises));
  const bench = rows.filter((r) => r.competition_lift === 'bench' && r.progressed);
  ok('2a. la panca piana e\' un fondamentale con carico', bench.length > 0 && bench.every((r) => P.firstWorkingLoad(r) > 0));
  ok('2b. e porta la rampa di quel carico, in ogni settimana', bench.every((r) => ramp(r.sets) === ramp(P.warmupSetsFor(P.firstWorkingLoad(r), { test: !!r.test_attempt }))));
  ok('2c. con il riscaldamento automatico acceso', bench.every((r) => r.warmup_auto === true));
  const iso = rows.filter((r) => !r.progressed);
  ok('2d. gli accessori non ne hanno nessuna', iso.length > 0 && iso.every((r) => !(r.sets || []).some((s) => s.warmup)));
  const mainNoLoad = rows.filter((r) => r.progressed && !P.firstWorkingLoad(r));
  ok('2e. un fondamentale senza carico scritto non ne ha', mainNoLoad.every((r) => !(r.sets || []).some((s) => s.warmup) && !r.warmup_auto));
  const pct = G.plan({ days: 4, weeks: 4, goal: 'forza', modelId: 'block_pl' });
  eq(pct.weeks.flatMap((w) => w.sessions.flatMap((s) => s.exercises)).filter((r) => (r.sets || []).some((s) => s.warmup)).length, 0, '2f. una scheda a percentuali non ha carichi, quindi niente rampa');
  const hyp = G.plan({ days: 3, weeks: 4, goal: 'ipertrofia' });
  eq(hyp.weeks.flatMap((w) => w.sessions.flatMap((s) => s.exercises)).filter((r) => (r.sets || []).some((s) => s.warmup)).length, 0, '2g. ne\' una scheda a RIR');
  ok('2h. il cardio non ha riscaldamento', !rows.filter((r) => r.unit === 'cardio' || r.unit === 'circuit').some((r) => (r.sets || []).some((s) => s.warmup)));
}

// The page functions, cut from the source and run alone.
function pageContext(extra) {
  const ctx = Object.assign({ console, store: { prefs: {}, data: {}, customSets: {}, bonus: {}, skips: {}, subs: {}, loadTypes: {}, exIntensity: {} }, DATA: null, currentWeek: 1, currentDay: 0 }, extra || {});
  ctx.window = ctx;
  ctx.window.NurvanProgressions = P;
  vm.createContext(ctx);
  return ctx;
}
const helpers = ['isWarmupSet', 'countWarmupSets', 'showWarmupSets', 'warmupRestTextFor', 'parseRestSeconds', 'setCount', 'formatSetRepScheme', 'deriveRepsTarget', 'repsChoiceValue'].map(grab).join('\n');

console.log('\n--- 3. la scheda normalizzata tiene la rampa davanti e conta le allenanti ---');
let normalized;
{
  // The real prescription lock runs here too: it rewrites the sets on its
  // own count, and the warm-ups must survive it.
  const ctx = pageContext({ enforceExercisePrescription });
  vm.runInContext(helpers + '\n' +
    'function adaptProgramDuration() {}\nfunction persist() {}\n' +
    ['resolveImportSetCount', 'detectExTechnique', 'normalizeProgram', 'getExerciseSetCount'].map(grab).join('\n'), ctx);
  const gen = G.plan({ days: 4, weeks: 2, goal: 'forza', modelId: 'block_pl', loadDisplay: 'kg', maxes: { squat: 150, bench: 100, deadlift: 180, press: 60 } });
  ctx.__prog = JSON.parse(JSON.stringify(gen));
  normalized = vm.runInContext('normalizeProgram(__prog)', ctx);
  const rows = normalized.weeks.flatMap((w) => w.sessions.flatMap((s) => s.exercises));
  const bench = rows.find((r) => r.competition_lift === 'bench' && r.progressed);
  const genBench = gen.weeks[0].sessions.flatMap((s) => s.exercises).find((r) => r.competition_lift === 'bench' && r.progressed);
  const warm = bench.sets.filter((s) => s.warmup);
  const work = bench.sets.filter((s) => !s.warmup);
  eq(warm.length, genBench.sets.filter((s) => s.warmup).length, '3a. i riscaldamenti sopravvivono alla normalizzazione');
  eq(work.length, genBench.sets.filter((s) => !s.warmup).length, '3b. e nessuna serie allenante e\' caduta dal conto');
  ok('3c. stanno davanti, con tipo warmup', bench.sets.slice(0, warm.length).every((s) => s.warmup === true && s.set_type === 'warmup') && work.every((s) => !s.warmup && s.set_type !== 'warmup'));
  eq(bench.sets_count, work.length, '3d. sets_count e\' di serie allenanti');
  eq(bench.prescription.sets, work.length, '3e. come la prescrizione');
  eq(bench.plannedLoad, P.firstWorkingLoad(genBench), '3f. il carico pianificato e\' quello allenante, non il primo riscaldamento');
  ctx.__again = JSON.parse(JSON.stringify(normalized));
  const twice = vm.runInContext('normalizeProgram(__again)', ctx);
  const benchTwice = twice.weeks.flatMap((w) => w.sessions.flatMap((s) => s.exercises)).find((r) => r.competition_lift === 'bench' && r.progressed);
  eq([benchTwice.sets.filter((s) => s.warmup).length, benchTwice.sets.filter((s) => !s.warmup).length, benchTwice.sets_count, benchTwice.prescription.sets], [warm.length, work.length, work.length, work.length], '3f2. rinormalizzata al riavvio (prescrizione gia\' bloccata), la scheda non cresce: stesse serie, stesso conto');
  ok('3g. il flag di ricalcolo automatico resta', bench.warmup_auto === true);
  ok('3h. i carichi della rampa restano sulle serie', warm.every((s, i) => s.target_load === genBench.sets[i].target_load && s.load === genBench.sets[i].target_load));
  ctx.__imported = { title: 'PDF', weeks: [{ sessions: [{ exercises: [{ name: 'Panca piana', sets: '3x10', rest: '90s' }, { name: 'Curl', sets: 3, reps: '12', rest: '60s' }] }] }] };
  const imp = vm.runInContext('normalizeProgram(__imported)', ctx);
  const impRows = imp.weeks[0].sessions[0].exercises;
  eq(impRows.map((r) => r.sets.filter((s) => s.warmup).length), [0, 0], '3i. una scheda importata non riceve nessuna rampa');
  eq(impRows.map((r) => r.sets.length), [3, 3], '3j. e conserva le sue serie');

  // Counting on the page: rows to show vs sets in the scheme.
  ctx.DATA = normalized;
  const day = normalized.weeks[0].sessions.findIndex((s) => s.exercises.some((r) => r.competition_lift === 'bench' && r.progressed));
  const idx = normalized.weeks[0].sessions[day].exercises.findIndex((r) => r.competition_lift === 'bench' && r.progressed);
  ctx.currentDay = day;
  eq(vm.runInContext('getExerciseSetCount(' + idx + ')', ctx), warm.length + work.length, '3k. le righe da compilare sono allenanti piu\' riscaldamenti');
  const scheme = vm.runInContext('formatSetRepScheme(DATA.weeks[0].sessions[' + day + '].exercises[' + idx + '])', ctx);
  eq(scheme.setCount, work.length, '3l. lo schema conta solo le allenanti');
  eq(scheme.warmups, warm.length, '3m. e dice a parte quanti riscaldamenti ci sono');
  ok('3n. lo schema non scrive i riscaldamenti nel NxM', new RegExp('^' + work.length + '×').test(scheme.scheme) || new RegExp('^' + work.length + 'x').test(scheme.scheme));
  eq(vm.runInContext("warmupRestTextFor('2 min')", ctx), '60s', '3o. fra due riscaldamenti di una panca da 2 min si riposa 60 s');
  eq(vm.runInContext("warmupRestTextFor('90s')", ctx), '45s', '3p. e di una da 90 s, 45');
  ctx.store.prefs.showWarmup = false;
  eq(vm.runInContext('getExerciseSetCount(' + idx + ')', ctx), warm.length + work.length, '3q. nascondere il riscaldamento non cambia il conto delle righe: la scheda resta la stessa');
  eq(vm.runInContext('showWarmupSets()', ctx), false, '3r. e la preferenza si legge');
}

console.log('\n--- 4. un riscaldamento chiuso non e\' volume, ne\' contatore ---');
{
  const row = { name: 'Panca piana', sets: [
    { reps: '6', target_load: 40, warmup: true }, { reps: '3', target_load: 60, warmup: true },
    { reps: '8', target_load: 80 }, { reps: '8', target_load: 80 }, { reps: '8', target_load: 80 },
    { reps: '8', target_load: 80 }, { reps: '8', target_load: 80 }, { reps: '8', target_load: 80 }
  ] };
  const data = {};
  row.sets.forEach((s, i) => {
    const k = 'w1_d0_e0_s' + (i + 1);
    data[k + '_load'] = s.target_load; data[k + '_reps'] = s.reps; data[k + '_rir'] = 2; data[k + '_done'] = true;
  });
  const ctx = pageContext({ store: { prefs: {}, data: data, skips: {}, subs: {}, loadTypes: {}, exIntensity: {}, sessionStartedAt: 0 }, DATA: { weeks: [{ sessions: [{ exercises: [row] }] }] } });
  vm.runInContext(helpers + '\n' +
    "function exerciseLogUnit() { return 'reps'; }\nfunction prescribedMinutesFor() { return 0; }\nfunction resolveExerciseMacroGroups() { return ['PETTO']; }\nfunction sessionElapsedMs() { return 0; }\n" +
    grab('withBonusRows') + grab('sessionSetTimes') + grab('sessionDurationSec') +
    grab('collectSessionStats'), ctx);
  const out = vm.runInContext('collectSessionStats({ currentSessionOnly: true })', ctx);
  eq(out.sets, 6, '4a. due riscaldamenti e sei allenanti chiuse: «6 serie»');
  eq(out.weight, 6 * 80 * 8, '4b. i chili sono quelli delle allenanti');
  eq(out.reps, 48, '4c. come le ripetizioni');
  eq(out.muscles.PETTO, 6, '4d. e la mappa si accende per sei serie, non otto');
  eq(out.exercises, 1, '4e. l\'esercizio conta una volta');
  // Only the warm-ups done: nothing to show yet.
  for (let i = 3; i <= 8; i++) ctx.store.data['w1_d0_e0_s' + i + '_done'] = false;
  const onlyWarm = vm.runInContext('collectSessionStats({ currentSessionOnly: true })', ctx);
  eq([onlyWarm.sets, onlyWarm.weight, onlyWarm.exercises, Object.keys(onlyWarm.muscles).length], [0, 0, 0, 0], '4f. con i soli riscaldamenti chiusi la seduta e\' ancora a zero');
}

console.log('\n--- 5. il motore non fa record su un riscaldamento ---');
{
  global.self = global; global.window = global;
  await import('./web/training-analytics-engine.js');
  const E = global.TrainingAnalyticsEngine;
  const meta = { name: 'Panca piana', sets: [{ reps: '6', target_load: 40, warmup: true }, { reps: '3', target_load: 60, warmup: true }, { reps: '8', target_load: 80 }, { reps: '8', target_load: 80 }] };
  const data = { weeks: [{ sessions: [{ exercises: [meta] }, { exercises: [meta] }] }] };
  const store = { data: {}, logs: [] };
  // Session 1: the warm-ups and two working sets at 80.
  [[1, 40, 6], [2, 60, 3], [3, 80, 8], [4, 80, 8]].forEach(([s, l, r]) => { store.data['w1_d0_e0_s' + s + '_load'] = l; store.data['w1_d0_e0_s' + s + '_reps'] = r; store.data['w1_d0_e0_s' + s + '_done'] = true; });
  const sets1 = E.normalizeSets(store, data);
  eq(sets1.map((s) => s.set).sort(), [3, 4], '5a. delle quattro serie chiuse, il motore legge le due allenanti');
  eq(sets1.reduce((n, s) => n + s.volume, 0), 2 * 80 * 8, '5b. e il volume e\' il loro');
  // Session 2: a heavier warm-up than the old working sets, and working sets equal to before.
  [[1, 85, 6], [2, 60, 3], [3, 80, 8], [4, 80, 8]].forEach(([s, l, r]) => { store.data['w1_d1_e0_s' + s + '_load'] = l; store.data['w1_d1_e0_s' + s + '_reps'] = r; store.data['w1_d1_e0_s' + s + '_done'] = true; });
  const all = E.normalizeSets(store, data);
  const prs = E.sessionPRs(all, 1, 1).filter((e) => e.type === 'weight' || e.type === 'e1rm');
  eq(prs.length, 0, '5c. un riscaldamento a 85 kg non e\' un record di carico');
}

console.log('\n--- 6. in seduta: la serie si chiude come le altre, ma non misura il recupero ---');
{
  const fn = grab('completeSetQuick');
  ok('6a. la serie di riscaldamento e la precedente si riconoscono dalla riga', /const isWarm = isWarmupSet\(setObjHere\);/.test(fn) && /const prevWarm = setNum > 1 && Array\.isArray\(rowForSugg\.sets\) && isWarmupSet\(rowForSugg\.sets\[setNum - 2\]\);/.test(fn));
  ok('6b. il recupero reale si scrive solo fra due allenanti', /if \(!isWarm && !prevWarm && prevSetKey && store\.data\[prevSetKey \+ '_done'\]/.test(fn));
  ok('6c. il carico scritto sulla serie (rampa o allenante) si conferma da solo col tap, se il campo e\' vuoto', /if \(load === '' && setObjHere && Number\(setObjHere\.target_load\) > 0\) load = setObjHere\.target_load;/.test(fn));
  ok('6c2. e la prima allenante non eredita mai il carico dell\'ultimo riscaldamento', /const prevSet = \(prevSetKey && !prevSetIsWarm\) \? \{/.test(fn) && fn.indexOf('if (load === \'\' && setObjHere && Number(setObjHere.target_load) > 0)') < fn.indexOf('if (load === \'\') load = prev.load || prevSet.load || \'\';'));
  const render = SRC.slice(SRC.indexOf('const warmCount = countWarmupSets(row.sets);'), SRC.indexOf('const warmCount = countWarmupSets(row.sets);') + 14000);
  ok('6d. nascosto, il riscaldamento non chiede niente: la riga si salta', /if \(isWarm && !warmVisible\) continue;/.test(render));
  ok('6e. il timer di un riscaldamento e\' quello dimezzato, quello della prima allenante e\' pieno', /const restForSet = \(isWarm && !\(setObj && setObj\.rest_full\)\) \? warmupRestTextFor\(row\.rest \|\| '90s'\) : esc\(row\.rest \|\| '90s'\);/.test(render));
  ok('6f. la riga e\' segnata leggera e numerata a parte', /set-row-warmup/.test(render) && /const setLabel = isWarm \? \('R' \+ s\) : String\(s - warmCount\);/.test(render));
  ok('6g. la preferenza sta nelle impostazioni allenamento', /id="pref-show-warmup"/.test(SRC) && /store\.prefs\.showWarmup=this\.checked;persist\(\);render\(\)/.test(SRC));
  ok('6h. la sincronizzazione col coach marca i riscaldamenti', /warmup: isWarmupSet\(Array\.isArray\(row\.sets\) \? row\.sets\[s - 1\] : null\) \|\| undefined,/.test(grab('buildSessionPayloadForSync')));
}

console.log('\n--- 7. il coach: toglie, ritocca, fa ricalcolare ---');
{
  const ctx = pageContext({ renders: 0, toasts: [] });
  const bench = JSON.parse(JSON.stringify(normalized.weeks[0].sessions.flatMap((s) => s.exercises).find((r) => r.competition_lift === 'bench' && r.progressed)));
  const prog = { weeks: [1, 2].map((w) => ({ label: 'Settimana ' + w, sessions: [{ title: 'A', exercises: [JSON.parse(JSON.stringify(bench))] }] })) };
  ctx.generatedReview = { prog: prog, week: 1 };
  vm.runInContext(helpers + '\n' +
    'function renderGeneratedReview() { renders++; }\nfunction confirm() { return true; }\nfunction showToast(m) { toasts.push(m); }\nfunction esc(s) { return String(s); }\n' +
    ['reviewWeeks', 'reviewSessionsOf', 'reviewEachOccurrence', 'updateReviewExercise', 'reviewApplyWarmupRamp', 'reviewWarmupHtml',
      'updateReviewWarmup', 'removeReviewWarmup', 'removeReviewWarmups', 'addReviewWarmup', 'toggleReviewWarmupAuto'].map(grab).join('\n'), ctx);
  const row = () => prog.weeks[0].sessions[0].exercises[0];
  const row2 = () => prog.weeks[1].sessions[0].exercises[0];
  const workLoad = (r) => r.sets.filter((s) => !s.warmup).map((s) => s.target_load);
  ok('7a. si parte con la rampa automatica', row().warmup_auto === true && row().sets.some((s) => s.warmup));
  vm.runInContext("updateReviewExercise(0, 0, 'load', '80', false)", ctx);
  eq(ramp(row().sets), '40x6 60x3', '7b. panca a 80 kg: 40×6, 60×3');
  eq(workLoad(row()).every((l) => l === 80), true, '7c. e le allenanti sono tutte a 80');
  vm.runInContext("updateReviewExercise(0, 0, 'load', '90', false)", ctx);
  eq(ramp(row().sets), '45x6 67.5x3', '7d. carico 80→90 con automatico acceso: 45×6, 67,5×3');
  const working = row().sets.filter((s) => !s.warmup).length;
  vm.runInContext("updateReviewExercise(0, 0, 'sets', '" + (working + 1) + "', false)", ctx);
  eq(row().sets.filter((s) => !s.warmup).length, working + 1, '7e. una serie allenante in piu\'');
  ok('7f. e la rampa resta davanti, intatta', ramp(row().sets) === '45x6 67.5x3' && row().sets[0].warmup && row().sets[1].warmup && !row().sets[2].warmup);
  eq(row().sets_count, working + 1, '7g. sets_count conta le allenanti');
  vm.runInContext("updateReviewExercise(0, 0, 'reps', '5', false)", ctx);
  eq(row().sets.filter((s) => s.warmup).map((s) => s.reps), ['6', '3'], '7h. cambiare le ripetizioni non tocca la rampa');
  vm.runInContext("updateReviewWarmup(0, 0, 0, 'load', '50')", ctx);
  eq(row().sets[0].target_load, 50, '7i. il coach ritocca il primo riscaldamento a 50');
  eq(row().warmup_auto, false, '7j. e l\'automatico si spegne da solo');
  vm.runInContext("updateReviewExercise(0, 0, 'load', '100', false)", ctx);
  eq(ramp(row().sets), '50x6 67.5x3', '7k. da spento, un nuovo carico non riscrive la rampa del coach');
  vm.runInContext('toggleReviewWarmupAuto(0, 0, true)', ctx);
  eq(ramp(row().sets), '50x6 75x3', '7l. riacceso, la rampa si ricalcola sul carico corrente (100 kg)');
  ok('7m. su tutte le settimane', row2().warmup_auto === true && row2().sets.some((s) => s.warmup));
  vm.runInContext('removeReviewWarmup(0, 0, 1)', ctx);
  eq(ramp(row().sets), '50x6', '7n. una serie si toglie da sola');
  vm.runInContext('addReviewWarmup(0, 0)', ctx);
  eq(row().sets.filter((s) => s.warmup).length, 2, '7o. e se ne aggiunge una');
  ok('7p. sempre davanti alle allenanti', !row().sets[2].warmup && row().sets[0].warmup && row().sets[1].warmup);
  const before2 = row2().sets.filter((s) => s.warmup).length;
  vm.runInContext('removeReviewWarmups(0, 0)', ctx);
  eq(row().sets.filter((s) => s.warmup).length, 0, '7q. «Togli tutte»: la seduta resta senza riscaldamento');
  eq(row().sets.filter((s) => !s.warmup).length, working + 1, '7r. e con tutte le sue allenanti');
  ok('7s. la conferma «tutte le settimane» la toglie anche dalla seconda', before2 > 0 && row2().sets.filter((s) => s.warmup).length === 0 && row2().warmup_auto === false);
  const noLoad = { name: 'Curl', unit: 'reps', sets: [{ reps: '12', target_load: null }, { reps: '12', target_load: null }], sets_count: 2 };
  prog.weeks[0].sessions[0].exercises.push(noLoad);
  vm.runInContext('toggleReviewWarmupAuto(0, 1, true)', ctx);
  ok('7t. accendere l\'automatico senza carico non inventa una rampa e lo dice', !noLoad.sets.some((s) => s.warmup) && ctx.toasts.length === 1);
  const html = vm.runInContext('reviewWarmupHtml(0, 0, generatedReview.prog.weeks[0].sessions[0].exercises[0], [], "")', ctx);
  ok('7u. la revisione mostra il blocco riscaldamento con automatico e «+ risc.»', /RISCALDAMENTO/.test(html) && /toggleReviewWarmupAuto\(0,0,this\.checked\)/.test(html) && /addReviewWarmup\(0,0\)/.test(html));
  ok('7v. e il campo Kg per il carico allenante', /updateReviewExercise\(' \+ si \+ ',' \+ ei \+ ',\\'load\\',this\.value,false\)/.test(SRC));
}

console.log('\n' + (failed ? failed + ' controlli falliti' : 'tutti i controlli passano'));
process.exit(failed ? 1 : 0);
