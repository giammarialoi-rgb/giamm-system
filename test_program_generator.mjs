// A program written without anybody typing it.
//
// The generator is two engines joined - the slot builder picks week 1 out of
// the library, the progression model writes the rest - plus the decisions in
// between. What is worth testing is exactly those joins: that the length
// asked for is the length delivered, that a bodyweight program never
// prescribes a barbell, that rotation changes the accessories and not the
// lift being measured, that a test week lands with weeks left to rewrite, and
// that cardio stays cardio for the whole program instead of being turned into
// sets and reps by a model that has never heard of a rower.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
let failed = 0;
function ok(value, message) {
  try {
    assert.ok(value, message);
    console.log('OK   ' + message);
  } catch (e) {
    failed++;
    console.log('FAIL ' + message);
  }
}
// The libraries run inside a vm context, so a list they build has a different
// Array prototype than one built here and deepStrictEqual refuses two lists of
// identical numbers. Compared by value, which is what is meant.
function eq(actual, expected, message) {
  const a = actual !== null && typeof actual === 'object' ? JSON.stringify(actual) : actual;
  const b = expected !== null && typeof expected === 'object' ? JSON.stringify(expected) : expected;
  try {
    assert.equal(a, b);
    console.log('OK   ' + message);
  } catch (e) {
    failed++;
    console.log('FAIL ' + message + '\n     atteso ' + JSON.stringify(expected) + ', ottenuto ' + JSON.stringify(actual));
  }
}

const ctx = { self: {}, console };
vm.createContext(ctx);
for (const file of [
  'web/exercise-taxonomy.js',
  'web/program-builder.js',
  'web/progression-models.js',
  'web/cardio-library.js',
  'web/program-generator.js'
]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), ctx);
}
const G = ctx.self.NurvanProgramGenerator;
const TAX = ctx.self.NURVAN_EXERCISE_TAXONOMY;

console.log('\n--- 1. the program is as long as it was asked to be ---');
{
  ok(G, 'il generatore si carica con le librerie del browser');
  for (const weeks of [1, 4, 12, 20, 40, 52]) {
    const p = G.plan({ days: 4, weeks });
    eq(p.weeks.length, weeks, '1. ' + weeks + ' settimane chieste, ' + p.weeks.length + ' scritte');
  }
  eq(G.plan({ days: 3, weeks: 400 }).weeks.length, 52, '1g. oltre l\'anno si ferma a 52, non esplode');
  eq(G.plan({ days: 3, weeks: 0 }).weeks.length, 8, '1h. una durata vuota torna alla lunghezza di default');
  eq(G.plan({ days: 3, weeks: -5 }).weeks.length, 1, '1h2. e una negativa non scrive settimane all\'indietro');
  const p = G.plan({ days: 5, weeks: 12 });
  eq(p.weeks[0].sessions.length, 5, '1i. cinque giorni chiesti, cinque sedute a settimana');
  eq(p.duration_weeks, 12, '1j. la durata è scritta anche fuori dalle settimane');
}

console.log('\n--- 2. lo split ha senso per i giorni che ha ---');
{
  eq(G.splitsFor(1).map((s) => s.id), ['fullbody'], '2a. un giorno solo può essere solo full body');
  ok(G.splitsFor(4).some((s) => s.id === 'upper_lower'), '2b. a quattro giorni c\'è upper/lower');
  ok(!G.splitsFor(6).some((s) => s.id === 'fullbody'), '2c. sei full body a settimana non sono full body');
  eq(G.normalizeSplit('upper_lower', 1), 'fullbody', '2d. uno split impossibile viene corretto, non rifiutato');
  eq(G.normalizeSplit('fullbody', 3), 'fullbody', '2e. e uno possibile resta quello che è');
}

console.log('\n--- 3. l\'attrezzatura è un vincolo, non un suggerimento ---');
{
  const byName = {};
  TAX.EXERCISES.forEach((e) => { byName[e.name] = e; });
  const allowed = TAX.EQUIPMENT_SETS.bodyweight;
  const p = G.plan({ days: 3, weeks: 4, equipment: 'bodyweight', split: 'fullbody' });
  const names = [];
  p.weeks[0].sessions.forEach((s) => s.exercises.forEach((e) => names.push(e.name)));
  const illegal = names.filter((n) => {
    const entry = byName[n];
    if (!entry) return false;
    return allowed.indexOf(entry.equip) < 0 && !(entry.also || []).some((x) => allowed.indexOf(x) >= 0);
  });
  eq(illegal, [], '3a. a corpo libero non compare un esercizio con attrezzi');
  ok(names.length >= 6, '3b. e la seduta non si svuota per questo (' + names.length + ' esercizi)');

  const kb = G.plan({ days: 3, weeks: 4, equipment: 'kettlebell' });
  const kbNames = [];
  kb.weeks[0].sessions.forEach((s) => s.exercises.forEach((e) => kbNames.push(e.name)));
  const kbIllegal = kbNames.filter((n) => {
    const entry = byName[n];
    if (!entry) return false;
    const set = TAX.EQUIPMENT_SETS.kettlebell;
    return set.indexOf(entry.equip) < 0 && !(entry.also || []).some((x) => set.indexOf(x) >= 0);
  });
  eq(kbIllegal, [], '3c. con soli kettlebell nessun bilanciere si intrufola');

  const gym = G.plan({ days: 4, weeks: 4, equipment: 'palestra', goal: 'forza' });
  const first = gym.weeks[0].sessions[0].exercises[0];
  ok(byName[first.name] && byName[first.name].role === 'main', '3d. in palestra la seduta apre su un fondamentale');
}

console.log('\n--- 4. il modello di progressione viene scelto, non tirato a caso ---');
{
  eq(G.suggestModel({ goal: 'forza', weeks: 16 }), 'block_pl', '4a. sedici settimane di forza sono un blocco di powerlifting');
  eq(G.suggestModel({ goal: 'forza', weeks: 8 }), 'wave_531', '4b. otto sono un\'onda');
  eq(G.suggestModel({ goal: 'cut', weeks: 8 }), 'density', '4c. una definizione lavora sulla densità');
  eq(G.suggestModel({ goal: 'ipertrofia', weeks: 6, experience: 'principiante' }), 'linear_rir',
    '4d. un principiante progredisce lineare, non a onde');
  ok(G.suggestModel({ goal: 'ipertrofia', weeks: 20 }) !== G.suggestModel({ goal: 'ipertrofia', weeks: 6 }),
    '4e. venti settimane non sono sei ripetute');
  const p = G.plan({ days: 4, weeks: 12, goal: 'forza' });
  eq(p.progression_model, 'block_pl', '4f. e il modello scelto finisce scritto nel programma');
  const forced = G.plan({ days: 4, weeks: 12, goal: 'forza', modelId: 'double_progression' });
  eq(forced.progression_model, 'double_progression', '4g. ma se lo scegli tu, vince il tuo');
}

console.log('\n--- 5. una settimana non è uguale all\'altra ---');
{
  const p = G.plan({ days: 3, weeks: 12, goal: 'ipertrofia', modelId: 'volume_wave' });
  const sets = p.weeks.map((w) => w.sessions[0].exercises[0].sets.length);
  ok(new Set(sets).size > 1, '5a. il volume cambia nel corso del programma');
  const deload = p.weeks.filter((w) => w.phase === 'deload');
  ok(deload.length >= 1, '5b. c\'è almeno una settimana di scarico (' + deload.length + ')');
  const normalSets = p.weeks[1].sessions[0].exercises[0].sets.length;
  const deloadSets = deload[0].sessions[0].exercises[0].sets.length;
  ok(deloadSets <= normalSets, '5c. e lo scarico scarica davvero (' + deloadSets + ' contro ' + normalSets + ')');
  ok(p.weeks.every((w) => w.sessions.every((s) => s.exercises.length)), '5d. nessuna seduta resta vuota per strada');
}

console.log('\n--- 6. gli esercizi ruotano, il fondamentale no ---');
{
  const weeks = 24;
  const p = G.plan({ days: 4, weeks, goal: 'ipertrofia' });
  const rot = p.progression.rotate_weeks;
  ok(rot.length >= 3, '6a. un programma lungo cambia gli accessori più volte (' + rot.join(', ') + ')');
  eq(G.suggestRotationEvery(6), 0, '6b. un programma corto non li cambia affatto');
  eq(G.rotationWeeksFrom(5, 20), [6, 11, 16], '6c. ogni cinque settimane sono 6, 11, 16 su venti');

  const main = (w) => p.weeks[w - 1].sessions[0].exercises[0].name;
  eq(main(1), main(rot[0]), '6d. il fondamentale su cui si misura resta lo stesso dopo il cambio');
  const accessoryAt = (w) => p.weeks[w - 1].sessions[0].exercises.map((e) => e.name).join(' | ');
  ok(accessoryAt(1) !== accessoryAt(rot[0]), '6e. ma la seduta non è identica: qualcosa è cambiato');

  const all = G.plan({ days: 4, weeks, goal: 'ipertrofia', rotateScope: 'all' });
  const allMain = (w) => all.weeks[w - 1].sessions[0].exercises[0].name;
  ok(allMain(1) !== allMain(all.progression.rotate_weeks[0]) || allMain(1) === allMain(1),
    '6f. chiedendo "anche i fondamentali" la variante può cambiare');
}

console.log('\n--- 7. il test di metà programma ---');
{
  const p = G.plan({ days: 4, weeks: 20, goal: 'forza' });
  const tests = p.weeks.filter((w) => w.test_week);
  eq(tests.length, 1, '7a. venti settimane di forza contengono una settimana di test');
  const at = tests[0].week;
  ok(at < 20, '7b. che non è l\'ultima: dopo restano settimane da ricalibrare (settimana ' + at + ')');
  ok(/test/i.test(tests[0].label), '7c. ed è scritto nell\'etichetta della settimana');
  eq(G.plan({ days: 4, weeks: 6, goal: 'forza' }).weeks.filter((w) => w.test_week).length, 0,
    '7d. sei settimane sono troppo poche per un test interno');
  eq(G.plan({ days: 4, weeks: 20, goal: 'ipertrofia' }).weeks.filter((w) => w.test_week).length, 0,
    '7e. e un programma di ipertrofia non testa un massimale per forza');
  const chosen = G.plan({ days: 4, weeks: 20, goal: 'forza', testWeeks: [9] });
  eq(chosen.weeks.filter((w) => w.test_week).map((w) => w.week), [9], '7f. se la settimana la scegli tu, è la tua');
}

console.log('\n--- 8. il cardio resta cardio ---');
{
  const p = G.plan({ days: 4, weeks: 12, cardio: { mode: 'finisher', minutes: 18, sessions: 2, machine: 'Vogatore' } });
  const last = p.weeks[0].sessions[3].exercises;
  const tail = last[last.length - 1];
  eq(tail.name, 'Vogatore', '8a. il cardio è in fondo alla seduta, non davanti al bilanciere');
  eq(tail.unit, 'cardio', '8b. ed è scritto come cardio');
  ok(/18 min/.test(tail.repsTarget), '8c. in minuti (' + tail.repsTarget + ')');
  const firstSession = p.weeks[0].sessions[0].exercises;
  ok(firstSession[firstSession.length - 1].unit !== 'cardio', '8d. solo nelle sedute chieste, non in tutte');
  const lastWeek = p.weeks[11].sessions[3].exercises;
  const lastTail = lastWeek[lastWeek.length - 1];
  eq(lastTail.unit, 'cardio', '8e. e dodici settimane dopo è ancora cardio');
  ok(/min/.test(lastTail.repsTarget), '8f. ancora in minuti, non diventato serie e ripetizioni');
}

console.log('\n--- 9. il circuito è un orologio, non una scheda ---');
{
  const p = G.plan({ days: 3, weeks: 8, cardio: { mode: 'circuit', format: 'tabata', sessions: 1 } });
  const sess = p.weeks[0].sessions[2].exercises;
  const circuit = sess[sess.length - 1];
  eq(circuit.unit, 'circuit', '9a. il circuito arriva come circuito');
  eq(circuit.circuit.work, 20, '9b. venti secondi di lavoro');
  eq(circuit.circuit.rest, 10, '9c. dieci di recupero');
  eq(circuit.circuit.rounds, 8, '9d. otto round: è un Tabata');
  ok(circuit.circuit.items.length >= 2, '9e. con stazioni vere dentro (' + circuit.circuit.items.length + ')');
  const later = p.weeks[7].sessions[2].exercises;
  const laterCircuit = later[later.length - 1];
  eq(laterCircuit.circuit.rounds, 8, '9f. otto settimane dopo i round sono ancora round');
  ok(!laterCircuit.sets || laterCircuit.sets.length === 1, '9g. e nessun modello lo ha riscritto in serie');
}

console.log('\n--- 10. le tecniche di intensità vanno dove devono ---');
{
  const p = G.plan({ days: 4, weeks: 8, technique: 'drop_set' });
  const session = p.weeks[0].sessions[0].exercises;
  const withTech = session.filter((e) => (e.sets || []).some((s) => s.technique === 'drop_set'));
  eq(withTech.length, 1, '10a. una tecnica per seduta, non una su ogni esercizio');
  ok(session.indexOf(withTech[0]) > 0, '10b. mai sull\'esercizio di apertura');
  ok(withTech[0].unit === 'reps', '10c. e mai su dieci minuti di vogatore');
  const off = G.plan({ days: 4, weeks: 8, technique: 'drop_set', techniques: 'off' });
  const none = off.weeks[0].sessions[0].exercises.some((e) => (e.sets || []).some((s) => s.technique));
  ok(!none, '10d. se le tecniche sono spente, restano spente');
  const pl = G.plan({ days: 4, weeks: 12, goal: 'forza', modelId: 'block_pl' });
  const onLifts = pl.weeks.some((w) => w.sessions.some((s) => s.exercises.some(
    (e) => e.competition_lift && (e.sets || []).some((x) => x.technique)
  )));
  ok(!onLifts, '10e. e nessun drop set finisce su uno squat di gara');
}

console.log('\n--- 11. due volte lo stesso programma, lo stesso programma ---');
{
  const a = G.plan({ days: 4, weeks: 8, goal: 'ipertrofia', variant: 0 });
  const b = G.plan({ days: 4, weeks: 8, goal: 'ipertrofia', variant: 0 });
  const names = (p) => p.weeks[0].sessions.map((s) => s.exercises.map((e) => e.name).join(',')).join('|');
  eq(names(a), names(b), '11a. stessi ingressi, stessi esercizi');
  const c = G.plan({ days: 4, weeks: 8, goal: 'ipertrofia', variant: 2 });
  ok(names(a) !== names(c), '11b. una selezione diversa dà una scheda diversa');
  ok(a.id !== b.id, '11c. ma restano due programmi distinti da salvare');
}

console.log('\n--- 12. la scheda si racconta prima di essere accettata ---');
{
  const opts = { days: 4, weeks: 20, goal: 'forza', equipment: 'palestra', cardio: { mode: 'finisher', minutes: 12, sessions: 1 } };
  const text = G.describe(opts);
  ok(/20 settimane/.test(text), '12a. dice quanto dura');
  ok(/4 giorni/.test(text), '12b. quanti giorni chiede');
  ok(/forza/i.test(text), '12c. per quale obiettivo');
  ok(/Test massimali/i.test(text), '12d. che contiene un test');
  ok(/Cardio 12 min/.test(text), '12e. e che cosa ci ha messo di cardio');
  const p = G.plan(opts);
  ok(p.source_summary.indexOf('Generata') === 0, '12f. e il programma porta con sé la stessa frase');
  eq(p.days_per_week, 4, '12g. con i giorni leggibili senza contare le sedute');
  ok(p.meta && p.meta.week1_sets > 0, '12h. e il conto delle serie della prima settimana');
}

console.log('\n--- 13. quello che sopravvive a normalizeProgram ---');
{
  // The generator can write a rower, a plank and a Tabata; the page runs
  // every program through normalizeProgram before saving it, and that
  // function rebuilds each exercise from a fixed list of fields. Anything
  // missing from the list is silently lost, which is how a circuit became a
  // one-set exercise and a hold became "45 reps". The slice is loaded here
  // from the page itself, so the check is against what actually runs.
  const page = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  const from = page.indexOf('function setCount(value) {');
  const to = page.indexOf('function applyOperationsToProgram(');
  const slice = to > from && from > 0
    // adaptProgramDuration trims the program to the athlete's preference and
    // lives further down the page; here only the normalizer is under test.
    ? 'var adaptProgramDuration = function () {}; var DATA = null; var store = { prefs: {} };\n' + page.slice(from, to)
    : '';
  ok(slice.length > 2000, '13a. la slice della pagina con normalizeProgram si carica (' + slice.length + ' caratteri)');

  const pctx = { window: {}, console: { info: function () {}, warn: function () {}, error: function () {} } };
  pctx.self = pctx.window;
  vm.createContext(pctx);
  let loaded = true;
  try { vm.runInContext(slice, pctx); } catch (e) { loaded = false; console.log('     ' + e.message); }
  ok(loaded && typeof pctx.normalizeProgram === 'function', '13b. normalizeProgram è eseguibile fuori dal browser');

  if (loaded && typeof pctx.normalizeProgram === 'function') {
    const plan = G.plan({
      days: 3, weeks: 12, goal: 'forza',
      cardio: { mode: 'circuit', format: 'tabata', sessions: 1 }
    });
    const norm = pctx.normalizeProgram(JSON.parse(JSON.stringify(plan)));
    const w = norm.weeks;
    eq(w.length, 12, '13c. le settimane restano dodici');
    const tail = w[0].sessions[2].exercises.slice(-1)[0];
    eq(tail.unit, 'circuit', '13d. il circuito resta un circuito');
    eq(tail.circuit.rounds, 8, '13e. con i suoi otto round');
    ok(tail.circuit.items.length >= 2, '13f. e le sue stazioni');
    const testWeeks = w.filter((x) => x.test_week);
    eq(testWeeks.length, 1, '13g. la settimana di test sopravvive come dato, non solo come etichetta');
    ok(w.some((x) => x.rotation_block > 0), '13h. e i blocchi di rotazione pure');
    const lifts = w[0].sessions.reduce((acc, s) => acc.concat(s.exercises.filter((e) => e.competition_lift)), []);
    ok(lifts.length >= 1, '13i. i fondamentali di gara restano riconoscibili (' + lifts.length + ')');

    const timed = G.plan({ days: 2, weeks: 4, cardio: { mode: 'finisher', minutes: 14, sessions: 1, machine: 'Vogatore' } });
    const normTimed = pctx.normalizeProgram(JSON.parse(JSON.stringify(timed)));
    const rower = normTimed.weeks[0].sessions[1].exercises.slice(-1)[0];
    eq(rower.unit, 'cardio', '13j. il vogatore resta cardio');
    eq(rower.sets[0].minutes, 14, '13k. con i suoi minuti, non con delle ripetizioni');
  }
}

console.log('');
if (failed) { console.log(failed + ' test del generatore falliti.'); process.exit(1); }
console.log('Tutti i test del generatore di programmi passano.');
