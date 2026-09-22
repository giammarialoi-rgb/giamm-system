// Exercises that are not measured in repetitions.
//
// A plank is seconds. Ten minutes on the rower is minutes, and a distance
// and a heart rate only if the athlete cares. Both were being written as
// "reps", which asked people to lie to the app - a plank logged as "45" and
// a rowing session logged as "10". A row now carries the unit it is actually
// measured in, and the only thing ever required of a cardio set is how long
// it lasted.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');

function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}
function slice(from, to) {
  const a = html.indexOf(from);
  const b = html.indexOf(to, a + 1);
  assert.ok(a > 0 && b > a, 'source slice not found: ' + from);
  return html.slice(a, b);
}

console.log('--- Running cardio / time-unit tests ---');

const lib = { self: {}, console };
vm.createContext(lib);
vm.runInContext(fs.readFileSync(path.join(root, 'web/cardio-library.js'), 'utf8'), lib);
const C = lib.self.NurvanCardio;

/* ---------- 1. the cardio library ---------- */
{
  ok(C.LIST.length >= 20, '1a. there is a cardio library (' + C.LIST.length + ' entries)');
  ok(C.LIST.every((c) => c.name && c.kind && c.minutes > 0 && Array.isArray(c.logs)),
    '1b. every entry says what it is, how long by default, and what it can log');
  ok(new Set(C.LIST.map((c) => c.name)).size === C.LIST.length, '1c. no duplicates');
  ['Tapis roulant', 'Cyclette', 'Vogatore', 'Ellittica', 'Air bike', 'Ski erg', 'Stair climber',
    'Salto della corda', 'Burpees', 'Mountain climber', 'Box jump'].forEach((n) => {
    ok(C.isCardio(n), '1d. the library has ' + n);
  });
  ok(C.find('Rowing machine') && C.find('Rowing machine').name === 'Vogatore',
    '1e. and answers to the English name too');
  ok(!C.isCardio('Panca piana bilanciere') && !C.isCardio('Squat bilanciere'),
    '1f. a barbell lift is not cardio');

  ok(C.logFieldsFor('Vogatore').includes('distance') && C.logFieldsFor('Vogatore').includes('hr'),
    '1g. a rower offers distance and heart rate');
  ok(C.logFieldsFor('Burpees').includes('reps'), '1h. burpees offer a rep count, because that is what people chase');
  ok(!C.logFieldsFor('Air bike').includes('incline'), '1i. and nothing offers a field that makes no sense for it');
  ok(C.LIST.every((c) => !c.logs.includes('duration')),
    '1j. duration is never in the optional list: it is the one thing always asked');

  const tabata = C.formatById('tabata');
  ok(tabata.work === 20 && tabata.rest === 10 && tabata.rounds === 8, '1k. Tabata is 20 on, 10 off, eight rounds');
  ok(C.FORMATS.length >= 5, '1l. with other interval shapes beside it');
  ok(C.intervalReady().length >= 10 && !C.intervalReady().some((c) => c.name === 'Tapis roulant'),
    '1m. and the ones marked for intervals exclude a treadmill, which spends the round getting up to speed');
}

/* ---------- 2. which unit an exercise is measured in ---------- */
{
  ok(C.defaultUnitFor('Plank addominale') === 'time', '2a. a plank is seconds');
  ['Hollow hold', 'Dead hang', 'Farmer walk', 'Suitcase carry', 'Wall sit', 'Handstand hold', 'Side plank']
    .forEach((n) => ok(C.defaultUnitFor(n) === 'time', '2b. so is ' + n));
  ok(C.defaultUnitFor('Vogatore') === 'cardio' && C.defaultUnitFor('Corsa') === 'cardio', '2c. cardio is minutes');
  ['Squat bilanciere', 'Panca piana bilanciere', 'Curl manubri', 'Leg press']
    .forEach((n) => ok(C.defaultUnitFor(n) === 'reps', '2d. and ' + n + ' is repetitions'));
  ok(C.defaultUnitFor('') === 'reps' && C.defaultUnitFor(null) === 'reps', '2e. nothing known falls back to repetitions');
}

/* ---------- 3. what the app does with it ---------- */
const ctx = {
  console, Math, String, Number, Array, Object, JSON, Date, parseInt, parseFloat, isNaN, Boolean,
  window: { NurvanCardio: C },
  document: { getElementById: () => null },
  store: { data: {} },
  currentWeek: 1, currentDay: 0,
  persist() {},
  esc: (x) => String(x == null ? '' : x)
};
vm.createContext(ctx);
vm.runInContext(slice('function exerciseLogUnit(row, name)', 'function completeSetQuick(exIdx'), ctx);
{
  ok(ctx.exerciseLogUnit({ unit: 'time' }, 'Squat bilanciere') === 'time',
    '3a. a row that says it is timed is timed, whatever its name');
  ok(ctx.exerciseLogUnit({}, 'Vogatore') === 'cardio', '3b. otherwise the name decides');
  ok(ctx.exerciseLogUnit({}, 'Curl manubri') === 'reps', '3c. and repetitions are the default');

  ok(ctx.prescribedSecondsFor({}, { seconds: 45 }) === 45, '3d. the seconds of a hold are read from the set');
  ok(ctx.prescribedSecondsFor({ repsTarget: '45s' }, null) === 45, '3e. or from "45s" written in the reps field');
  ok(ctx.prescribedSecondsFor({ repsTarget: '30-45s' }, null) === 45, '3f. a range takes the top of it');
  ok(ctx.prescribedSecondsFor({}, null) === 30, '3g. and there is a sane default');
  ok(ctx.prescribedMinutesFor({ name: 'Vogatore' }, null) === 15, '3h. cardio minutes come from the library when not written');
  ok(ctx.prescribedMinutesFor({}, { minutes: 35 }) === 35, '3i. and from the set when they are');
}

/* ---------- 4. writing a program with them ---------- */
{
  const bctx = {
    console, Math, String, Number, Array, Object, JSON, Date, parseInt, parseFloat, isNaN, Boolean,
    encodeURIComponent, decodeURIComponent,
    window: { NurvanCardio: C }, document: { getElementById: () => null, createElement: () => ({ style: {}, classList: { add() {} } }), body: { appendChild() {} } },
    store: {}, DATA: null, currentWeek: 1, currentDay: 0,
    WEB_EXERCISE_CATALOG: [], persist() {}, showToast() {}, persistActiveProgramStructure() {}, recordManualAction() {}
  };
  vm.createContext(bctx);
  bctx.self = bctx.window;
  vm.runInContext(html.match(/const esc = x => [^\n]+/)[0], bctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-taxonomy.js'), 'utf8'), bctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'web/progression-models.js'), 'utf8'), bctx);
  vm.runInContext(slice('var SPACE_EQUIPMENT = [', 'function emptyProgramDraft()'), bctx);
  vm.runInContext(slice('function emptyProgramDraft()', 'function saveAll()'), bctx);

  const plank = bctx.programExerciseRow({ name: 'Plank addominale', unit: 'time', sets: 3, reps: '45' });
  ok(plank.unit === 'time' && plank.sets.length === 3, '4a. a timed exercise keeps its sets');
  ok(plank.sets.every((s) => s.seconds === 45), '4b. each carrying the seconds to hold');
  ok(plank.repsTarget === '45s', '4c. and reading as a duration, not as a rep count');

  const row = bctx.programExerciseRow({ name: 'Vogatore', unit: 'cardio', reps: '12' });
  ok(row.unit === 'cardio' && row.sets.length === 1, '4d. cardio defaults to one block, not three sets');
  ok(row.sets[0].minutes === 12 && row.repsTarget === '12 min', '4e. written in minutes');
  ok(row.rest === '2 min', '4f. with a rest that suits it');

  const curl = bctx.programExerciseRow({ name: 'Curl manubri', sets: 3, reps: '8-10' });
  ok(curl.unit === 'reps' && curl.repsTarget === '8-10' && curl.sets[0].seconds === undefined,
    '4g. and an ordinary exercise is untouched by any of it');

  // The unit survives into the weeks a progression writes.
  const weeks = bctx.window.NurvanProgressions.weeksFromTemplate([{
    name: 'A', exercises: [plank, row, curl]
  }], { weeks: 6, modelId: 'linear_rir' });
  ok(weeks[5].sessions[0].exercises[0].repsTarget.endsWith('s'),
    '4h. six weeks later the plank is still measured in seconds');
  ok(weeks[5].sessions[0].exercises[1].repsTarget.endsWith('min'),
    '4i. and the rower still in minutes');
  ok(/^\d+(-\d+)?$/.test(weeks[5].sessions[0].exercises[2].repsTarget),
    '4j. while the curl is still a rep range');

  const bumped = bctx.window.NurvanProgressions.weeksFromTemplate([{
    name: 'A', exercises: [bctx.programExerciseRow({ name: 'Plank addominale', unit: 'time', sets: 2, reps: '30' })]
  }], { weeks: 8, modelId: 'double_progression' });
  const secs = bumped.map((w) => parseInt(w.sessions[0].exercises[0].repsTarget, 10));
  ok(Math.max(...secs) > 30, '4k. a progression that adds reps adds seconds to a hold instead');
  ok(Math.max(...secs) <= 60, '4l. by a step that means something, not one second at a time');
}

/* ---------- 5. how it looks while training ---------- */
{
  ok(/exLogUnit === 'cardio'/.test(html) && /exLogUnit === 'time'/.test(html),
    '5a. the set row is built differently for each unit');
  ok(/<div>SECONDI<\/div><div>TIMER<\/div>/.test(html), '5b. a hold shows seconds and a timer');
  ok(/<div>MINUTI<\/div><div>DATI<\/div>/.test(html), '5c. cardio shows minutes and a way to add the rest');
  ok(/onclick="toggleSetTimer\(/.test(html), '5d. the timer is wired to the set it belongs to');
  ok(/onclick="toggleCardioExtras\(/.test(html), '5e. and the extra fields open on request');
  ok(html.includes("if (exLogUnit !== 'cardio')"),
    '5f. an intensity technique is not offered for ten minutes on a bike');
  ok(/store\.data\[key \+ '_sec'\] = held/.test(html),
    '5g. stopping the timer early records what was actually held, not what was asked for');
  ok(built.includes('NurvanCardio') && built.includes('cardio-library.js'),
    '5h. all of it ships in the built app');

  const sw = fs.readFileSync(path.join(root, 'web/sw.js'), 'utf8');
  ok(sw.includes('cardio-library.js'), '5i. and is cached offline like the rest of the app');
}

/* ---------- 6. circuits ---------- */
{
  const cctx = {
    console, Math, String, Number, Array, Object, JSON, Date, parseInt, parseFloat, isNaN, Boolean,
    encodeURIComponent, decodeURIComponent,
    window: { NurvanCardio: C }, document: { getElementById: () => null, createElement: () => ({ style: {}, classList: { add() {} } }), body: { appendChild() {} } },
    store: { data: {} }, DATA: null, currentWeek: 1, currentDay: 0,
    WEB_EXERCISE_CATALOG: [], persist() {}, showToast() {}, persistActiveProgramStructure() {}, recordManualAction() {}
  };
  vm.createContext(cctx);
  cctx.self = cctx.window;
  vm.runInContext(html.match(/const esc = x => [^\n]+/)[0], cctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-taxonomy.js'), 'utf8'), cctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'web/progression-models.js'), 'utf8'), cctx);
  vm.runInContext(slice('var SPACE_EQUIPMENT = [', 'function emptyProgramDraft()'), cctx);
  vm.runInContext(slice('function emptyProgramDraft()', 'function saveAll()'), cctx);
  vm.runInContext(slice('function exerciseLogUnit(row, name)', 'function completeSetQuick(exIdx'), cctx);

  // Built in the draft, the way the builder builds it.
  cctx.store.programDraft = { title: 'HIIT', weeks: 4, days: [{ name: 'A', exercises: [] }] };
  cctx.openCircuitBuilder(0);
  const draftCircuit = cctx.store.programDraft.days[0].exercises[0];
  ok(draftCircuit.unit === 'circuit' && draftCircuit.circuit.format === 'tabata',
    '6a. a new circuit starts as a Tabata');
  ok(draftCircuit.circuit.work === 20 && draftCircuit.circuit.rest === 10 && draftCircuit.circuit.rounds === 8,
    '6b. with twenty on, ten off, eight rounds');
  cctx.setCircuitFormat(0, 0, 'hiit_40_20');
  ok(draftCircuit.circuit.work === 40 && draftCircuit.circuit.rest === 20, '6c. changing the format changes the clock');
  cctx.updateCircuitField(0, 0, 'rounds', '6');
  ok(draftCircuit.circuit.rounds === 6 && draftCircuit.circuit.format === 'custom',
    '6d. and touching a number by hand makes it a custom one, not a mislabelled Tabata');
  cctx.updateCircuitField(0, 0, 'work', '9000');
  ok(draftCircuit.circuit.work === 600, '6e. a typo cannot make a ninety-minute interval');
  cctx.updateCircuitField(0, 0, 'work', '40');

  draftCircuit.circuit.items.push({ name: 'Burpees' }, { name: 'Air bike' }, { name: 'Salto della corda' });
  const row = cctx.programExerciseRow(draftCircuit);
  ok(row.unit === 'circuit' && row.circuit.items.length === 3, '6f. it reaches the program with its stations');
  ok(row.setCount === 1 && /round/.test(row.repsTarget), '6g. counted in rounds, not in sets');

  const c = cctx.circuitOf(row);
  ok(c.rounds === 6 && c.items.length === 3, '6h. and is read back whole');
  ok(cctx.circuitTotalSeconds(c) === 6 * 3 * (40 + 20), '6i. its length is arithmetic, not a guess');
  ok(cctx.circuitOf({ circuit: { items: [] } }) === null && cctx.circuitOf({}) === null,
    '6j. a circuit with no stations is not a circuit');

  ok(cctx.exerciseLogUnit(row, row.name) === 'circuit', '6k. the workout screen knows to draw it as one');
  const block = cctx.circuitBlockHtml(0, row);
  ok(/Burpees/.test(block) && /Air bike/.test(block), '6l. the card lists the stations');
  ok(/40" lavoro/.test(block) && /6 round/.test(block), '6m. and the clock it will run');
  ok(/AVVIA CIRCUITO/.test(block), '6n. with a way to start it');

  // A progression has nothing to say to a clock.
  const weeks = cctx.window.NurvanProgressions.weeksFromTemplate([{ name: 'A', exercises: [row] }],
    { weeks: 6, modelId: 'volume_wave' });
  ok(weeks.every((w) => w.sessions[0].exercises[0].circuit.rounds === 6),
    '6o. six weeks of a volume wave leave the circuit exactly as written');
  ok(weeks.every((w) => w.sessions[0].exercises[0].sets.length === 1),
    '6p. and never turn its rounds into sets');
}

console.log('\nAll cardio / time-unit tests passed.');
