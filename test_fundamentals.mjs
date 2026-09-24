// Il fondamentale e' il nome, non una parola nel nome; e il giorno del
// massimale ha la sua rampa.
//
// «Croci panca piana» contiene "panca piana" ed e' un'apertura: veniva letta
// come panca, riceveva le percentuali del massimale di panca e una rampa da
// panca. Ora un nome e' un fondamentale quando l'alzata e' la sua testa
// (dopo i qualificativi di una variante col bilanciere) e niente nel nome
// dice manubri, macchina, cavi o un isolamento. Le varianti (panca
// inclinata, front squat, stacco rumeno) sono fondamentali, ma le percentuali
// del massimale restano dell'alzata esatta.
//
// La seduta di test (1×1 o 1×3 al massimale) si scalda con 40%×5, 55%×3,
// 70%×2, 80%×1, 90%×1 sul carico di test; meta' recupero fino al 70%, pieno
// dall'80%. Il toggle automatico del coach la ricalcola come le altre.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const SRC = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8').replace(/\r\n/g, '\n');

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

const lib = { self: {}, console };
lib.window = lib.self;
vm.createContext(lib);
for (const file of ['web/exercise-taxonomy.js', 'web/program-builder.js', 'web/progression-models.js', 'web/cardio-library.js', 'web/program-generator.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), lib);
}
const P = lib.self.NurvanProgressions;
const G = lib.self.NurvanProgramGenerator;

console.log('\n--- 1. il nome e\' il fondamentale, non lo contiene ---');
{
  eq(P.fundamentalFor('Croci panca piana'), null, '1a. «Croci panca piana» non e\' un fondamentale');
  eq(P.competitionLiftFor('Croci panca piana'), null, '1b. e non e\' la panca');
  eq(P.fundamentalFor('Panca inclinata bilanciere'), { lift: 'bench', variant: true }, '1c. «Panca inclinata bilanciere» e\' un fondamentale, variante della panca');
  eq(P.competitionLiftFor('Panca inclinata bilanciere'), null, '1d. ma le percentuali del massimale di panca piana non le riceve');
  const variants = { 'Front squat': 'squat', 'Squat frontale': 'squat', 'Stacco rumeno': 'deadlift', 'Romanian deadlift': 'deadlift', 'Incline bench press': 'bench', 'Panca declinata': 'bench', 'Close-grip bench': 'bench', 'Stacco sumo': 'deadlift', 'Box squat': 'squat' };
  ok('1e. le varianti col bilanciere sono fondamentali: ' + Object.keys(variants).join(', '),
    Object.keys(variants).every((n) => { const f = P.fundamentalFor(n); return f && f.lift === variants[n] && f.variant === true; }));
  const exact = { 'Panca piana bilanciere': 'bench', 'Panca': 'bench', 'Bench press': 'bench', 'Squat': 'squat', 'Squat bilanciere': 'squat', 'Low-bar squat': 'squat', 'Stacco': 'deadlift', 'Stacco da terra': 'deadlift', 'Deadlift': 'deadlift', 'Military press': 'press', 'Lento avanti': 'press', 'Overhead press': 'press', 'Trazioni alla sbarra': 'pullup', 'Pull-up zavorrato': 'pullup', 'Dip alle parallele': 'dip' };
  ok('1f. le alzate esatte restano alzate', Object.keys(exact).every((n) => P.competitionLiftFor(n) === exact[n]));
  const refs = ['Croci panca inclinata', 'Alzate laterali su panca', 'Aperture su panca piana', 'Panca piana manubri', 'Spinte con manubri su panca', 'Leg extension', 'Rematore su panca', 'Bench dip', 'Dip su panca', 'Scapular pull-up', 'Squat a corpo libero', 'Kettlebell deadlift', 'Trap bar deadlift', 'Squat goblet', 'Hack squat', 'Squat Smith', 'Panca piana Smith', 'Military press manubri', 'Overhead extension', 'Panca Scott curl', 'Pullover su panca', 'Crunch su panca'];
  eq(refs.filter((n) => P.fundamentalFor(n) !== null), [], '1g. chi nomina il fondamentale come riferimento non lo e\'');
}

console.log('\n--- 2. il censimento del database: nessun isolamento dentro ---');
{
  const census = (await import('./tools/list_fundamentals.mjs')).default;
  const recognised = census.flatMap((s) => s.rows.map((r) => r.name));
  const ISOLATION = /(croci|fly|apertur|alzat|pullover|kickback|curl|estension|extension|crunch|french|skull|manubri|dumbbell|kettlebell|macchina|machine|smith|cavo|cable|corpo libero|scapular|goblet|hack|sissy|pistol|jump)/i;
  eq(recognised.filter((n) => ISOLATION.test(n)), [], '2a. nessun nome da isolamento, macchina o manubri fra i riconosciuti');
  const catalog = census.find((s) => s.label === 'catalogo web');
  eq(catalog.total, 216, '2b. il catalogo ha 216 voci');
  // Prima del cambio queste sette erano lette come l'alzata di gara.
  const wrongBefore = ['Croci panca piana', 'Scapular pull-up', 'Squat a corpo libero', 'Kettlebell deadlift', 'Stacco gambe tese', 'Tempo squat', 'Safety bar squat'];
  eq(wrongBefore.filter((n) => P.competitionLiftFor(n) !== null), [], '2c. le sette letture sbagliate di prima non ci sono piu\'');
  ok('2d. e le tre varianti fra loro restano fondamentali, come varianti', ['Stacco gambe tese', 'Tempo squat', 'Safety bar squat'].every((n) => P.fundamentalFor(n) && P.fundamentalFor(n).variant));
}

console.log('\n--- 3. nel generatore, «Croci panca piana» non ha carichi ne\' rampa da panca ---');
let testPlan;
{
  testPlan = G.plan({ days: 4, weeks: 8, goal: 'forza', modelId: 'block_pl', loadDisplay: 'kg', maxes: { squat: 150, bench: 100, deadlift: 180, press: 60 }, testWeeks: [4] });
  const rows = testPlan.weeks.flatMap((w) => w.sessions.flatMap((s) => s.exercises));
  const croci = rows.filter((r) => /^Croci panca/.test(r.name));
  ok('3a. la scheda di prova contiene le croci', croci.length > 0);
  ok('3b. senza alzata di gara', croci.every((r) => !r.competition_lift && r.target_pct == null));
  ok('3c. senza carico calcolato dal massimale di panca', croci.every((r) => r.sets.every((s) => s.target_load == null)));
  ok('3d. e senza riscaldamento', croci.every((r) => !r.sets.some((s) => s.warmup) && !r.warmup_auto));
  const incl = rows.filter((r) => r.name === 'Panca inclinata bilanciere');
  ok('3e. la panca inclinata non riceve le percentuali della piana', incl.length > 0 && incl.every((r) => !r.competition_lift && r.sets.every((s) => s.target_load == null)));
}

console.log('\n--- 4. la rampa del giorno del massimale ---');
{
  eq(ramp(P.warmupSetsFor(100, { test: true })), '40x5 55x3 70x2 80x1 90x1', '4a. panca 100 kg: 40×5, 55×3, 70×2, 80×1, 90×1');
  eq(P.warmupSetsFor(100, { test: true }).map((s) => !!s.rest_full), [false, false, false, true, true], '4b. recupero pieno dall\'80%, meta\' prima');
  eq(ramp(P.warmupSetsFor(110, { test: true })), '45x5 62.5x3 77.5x2 90x1 100x1', '4c. su 110 kg, sempre per eccesso al disco');
  const benchTest = testPlan.weeks[3].sessions.flatMap((s) => s.exercises).find((r) => r.competition_lift === 'bench');
  ok('4d. la settimana 4 e\' di test e la panca e\' marcata come tentativo', testPlan.weeks[3].test_week && benchTest && benchTest.test_attempt === true);
  eq(ramp(benchTest.sets), '40x5 55x3 70x2 80x1 90x1', '4e. il generatore le mette la rampa da test');
  eq(benchTest.sets.filter((s) => !s.warmup).map((s) => s.target_load + 'x' + s.reps), ['100x1'], '4f. poi il singolo al massimale');
  const benchNormal = testPlan.weeks[1].sessions.flatMap((s) => s.exercises).find((r) => r.competition_lift === 'bench');
  ok('4g. una settimana normale resta con la rampa normale', !benchNormal.test_attempt && ramp(benchNormal.sets) === ramp(P.warmupSetsFor(P.firstWorkingLoad(benchNormal))));
  const accessories = testPlan.weeks[3].sessions.flatMap((s) => s.exercises).filter((r) => !r.competition_lift);
  ok('4h. solo i fondamentali: nessun accessorio della settimana di test e\' un tentativo', accessories.every((r) => !r.test_attempt));
}

console.log('\n--- 5. la pagina: la rampa sopravvive, e il timer e\' pieno dalla quarta ---');
{
  const ctx = { console, store: { prefs: {} }, window: {}, DATA: null };
  ctx.window.NurvanProgressions = P;
  vm.createContext(ctx);
  vm.runInContext(['isWarmupSet', 'countWarmupSets', 'warmupRestTextFor', 'parseRestSeconds', 'setCount', 'formatSetRepScheme', 'deriveRepsTarget', 'repsChoiceValue', 'resolveImportSetCount', 'detectExTechnique', 'normalizeProgram'].map(grab).join('\n') +
    '\nfunction enforceExercisePrescription() {}\nfunction adaptProgramDuration() {}\nfunction persist() {}\n', ctx);
  ctx.__p = JSON.parse(JSON.stringify(testPlan));
  const norm = vm.runInContext('normalizeProgram(__p)', ctx);
  const row = norm.weeks[3].sessions.flatMap((s) => s.exercises).find((r) => r.competition_lift === 'bench');
  ok('5a. il tentativo resta marcato', row.test_attempt === true);
  eq(row.sets.filter((s) => s.warmup).map((s) => (s.rest_full ? 'pieno' : 'meta')), ['meta', 'meta', 'meta', 'pieno', 'pieno'], '5b. e ogni salita sa quanto recupero chiede');
  // The timer text each set starts, with the expression the page renders.
  const line = (SRC.match(/const restForSet = \(isWarm[^\n]*;/) || [''])[0];
  ok('5c. la riga del timer c\'e\'', !!line);
  ctx.esc = (s) => String(s);
  const timers = row.sets.map((setObj) => vm.runInContext('(function (row, setObj, isWarm) { ' + line + ' return parseRestSeconds(restForSet); })', ctx)(row, setObj, !!setObj.warmup));
  eq(timers, [150, 150, 150, 300, 300, 300], '5d. recupero 5 min: 2:30 dopo le prime tre salite, pieno dalla quarta in poi');
  ok('5e. il massimale letto dal test salta i riscaldamenti', /if \(isWarmupSet\(Array\.isArray\(row\.sets\) \? row\.sets\[s - 1\] : null\)\) continue;/.test(grab('testedMaxFor')));
}

console.log('\n--- 6. il toggle del coach ricalcola la rampa da test ---');
{
  const row = JSON.parse(JSON.stringify(testPlan.weeks[3].sessions.flatMap((s) => s.exercises).find((r) => r.competition_lift === 'bench')));
  row.sets.filter((s) => !s.warmup).forEach((s) => { s.target_load = 110; });
  P.applyWarmupRamp(row);
  eq(ramp(row.sets), '45x5 62.5x3 77.5x2 90x1 100x1', '6a. carico di test 100→110: la rampa si riscrive su 110');
  eq(row.sets.filter((s) => !s.warmup).length, 1, '6b. e il singolo resta uno');
  const review = grab('reviewApplyWarmupRamp');
  ok('6c. la revisione passa dalla stessa funzione, che legge il tentativo dalla riga', /P\.applyWarmupRamp\(row\)/.test(review) && /test: !!row\.test_attempt/.test(fs.readFileSync(path.join(root, 'web/progression-models.js'), 'utf8')));
}

console.log('\n' + (failed ? failed + ' controlli falliti' : 'tutti i controlli passano'));
process.exit(failed ? 1 : 0);
