// Runs the real import-review flow and asserts which muscles a reviewed row ends up
// with. Nothing here string-matches the source: a workbook is imported with the real
// importer, the real review screen (renderReviewTraining, cut out of
// web/index.base.html) renders its suggestion chips and name inputs, and their own
// onclick / oninput / onchange code is run against stand-in elements. The reviewed
// program then goes through the real normalizeProgram and the real stats engine.
//
// Guards the stale-muscle bug: picking a suggestion (or typing a new name) renamed a
// row but kept the importer's muscle groups, so a bare "Kickback" imported as the
// glute kickback and picked as "Kickback tricipiti · TRICIPITI" still counted as legs.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseStructuredWorkbook, normalizeExerciseName, EXERCISE_DICTIONARY } from './universal-import-engine.mjs';
import { enforceExercisePrescription } from './prescription-engine.mjs';
import { JS_PRODUCT_SERVICES } from './prepare_task20_js_services.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const XLSX = createRequire(import.meta.url)('xlsx');
const base = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');

function blockAfter(src, at, what) {
  assert.ok(at !== -1, what + ' not found');
  let depth = 0;
  for (let i = src.indexOf('{', at); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(at, i + 1);
  }
  throw new Error('unterminated ' + what);
}
const fn = (name) => blockAfter(base, base.indexOf('function ' + name + '('), name + ' in web/index.base.html');
const line = (start) => { const at = base.indexOf(start); assert.ok(at !== -1, start + ' not found'); return base.slice(at, base.indexOf('\n', at)); };
const constBlock = (start, end) => { const at = base.indexOf(start); assert.ok(at !== -1, start + ' not found'); return base.slice(at, base.indexOf(end, at) + end.length); };
// The app's exercise library service, as the page gets it from the services bundle.
const exerciseDbService = blockAfter(JS_PRODUCT_SERVICES, JS_PRODUCT_SERVICES.indexOf('const ExerciseDatabaseService = {'), 'ExerciseDatabaseService') + ';';

function loadPage(customEx) {
  const sb = { console, EXERCISE_DICTIONARY, normalizeExerciseName, enforceExercisePrescription };
  sb.window = sb;
  sb.self = sb;
  vm.createContext(sb);
  vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-catalog-extra.js'), 'utf8'), sb);
  vm.runInContext(fs.readFileSync(path.join(root, 'web/training-analytics-engine.js'), 'utf8'), sb);
  vm.runInContext([
    'var DATA = null;',
    'var currentView = "import";',
    'var renders = 0;',
    'function render() { renders++; }',
    'function persist() {}',
    'var store = { prefs: {}, customEx: ' + JSON.stringify(customEx || []) + ' };',
    line('const esc = '),
    exerciseDbService,
    fn('normalizeExerciseKey'),
    fn('suggestExerciseMatches'),
    fn('enrichProgramMappingConfidence'),
    fn('countUncertainMappings'),
    fn('renderReviewTraining'),
    fn('confirmExerciseMapping'),
    constBlock('const MACRO_MUSCLE_GROUPS = ', '];'),
    fn('normalizeMacroMuscleGroup'),
    fn('reviewExerciseNameKey'),
    fn('knownExerciseMuscles'),
    line('const REVIEW_EXERCISE_BASE_MUSCLES = '),
    fn('reviewExerciseMuscleFields'),
    fn('rememberReviewExerciseBaseline'),
    fn('reviewExerciseMovementFor'),
    fn('syncReviewExerciseMuscles'),
    fn('commitReviewExerciseMuscles'),
    fn('reviewExerciseRowsAt'),
    fn('pickSuggestedExerciseMapping'),
    fn('updateReviewExerciseField'),
    fn('normalizeProgram'),
    fn('resolveImportSetCount'),
    fn('detectExTechnique'),
    fn('deriveRepsTarget'),
    fn('mapSetRow'),
    fn('adaptProgramDuration')
  ].join('\n'), sb);
  return sb;
}

// A day sheet that lists names only, so every row is reviewable (no scheme, low confidence).
// Two filler rows go last: a sheet with a single name is not read as a training day.
function importDay(names) {
  const wb = XLSX.utils.book_new();
  const list = names.concat(['Leg press', 'Hip thrust']);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['GIORNO 1', '']].concat(list.map((n) => ['', n]))), 'Settimana 1');
  const parsed = parseStructuredWorkbook(wb, 'scheda.xlsx');
  return parsed.canonicalProgram || parsed.program || parsed;
}

const unescape = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
function attrs(tag) {
  const out = {};
  for (const m of tag.matchAll(/([a-z-]+)="([^"]*)"/g)) out[m[1]] = unescape(m[2]);
  return out;
}

// One review session: import, render, and act through the rendered controls' own code.
// `split` loads the program the way the Coach AI "open in review" path does (a JSON
// copy), where canonicalProgram.weeks and canonicalProgram.training are separate copies.
// Sessions share one page per library (the review keeps its per-row memory by row object, so
// separate imports never mix); each session points the page at its own program before acting.
const pages = new Map();
function pageFor(customEx) {
  const k = JSON.stringify(customEx || []);
  if (!pages.has(k)) pages.set(k, loadPage(customEx));
  return pages.get(k);
}
function review(names, customEx, split) {
  const page = pageFor(customEx);
  const prog = split ? JSON.parse(JSON.stringify(importDay(names))) : importDay(names);
  const state = { canonicalProgram: prog };
  page.window.programImportState = state;
  const rows = prog.weeks[0].sessions[0].exercises;
  // What activation stores: normalizeProgram(prog.training || prog) on a JSON copy.
  function storedProgram() {
    const copy = JSON.parse(JSON.stringify(prog));
    return page.normalizeProgram(copy.training || copy);
  }
  function html() { return page.renderReviewTraining(prog); }
  function run(code, el) { page.window.programImportState = state; page.__el = el; vm.runInContext('(function () { ' + code + ' }).call(__el)', page); }
  function chips(i) {
    return [...html().matchAll(/<button [^>]*onclick="pickSuggestedExerciseMapping\([^>]*>/g)].map((m) => attrs(m[0]))
      .filter((a) => a.onclick.startsWith('pickSuggestedExerciseMapping(0,0,' + i + ','));
  }
  function nameInput(i) {
    const m = [...html().matchAll(/<input [^>]*oninput="updateReviewExerciseField\([^>]*>/g)].map((x) => attrs(x[0]))
      .find((a) => a.oninput.startsWith('updateReviewExerciseField(0, 0, ' + i + ", 'name'"));
    assert.ok(m, 'row ' + i + ' has a name input');
    return m;
  }
  return {
    page,
    prog,
    storedProgram,
    muscles: (i) => [rows[i].name, rows[i].muscle_group, (rows[i].muscle_groups || []).join('+')].join(' | '),
    stored: (i) => { const x = storedProgram().weeks[0].sessions[0].exercises[i]; return [x.name, x.muscle_group, (x.muscle_groups || []).join('+')].join(' | '); },
    // Per-muscle stats for 3 logged sets of row i of the stored program: [muscle, direct, indirect].
    stats(i) {
      const TAE = page.TrainingAnalyticsEngine;
      const logged = { data: {}, subs: {}, skips: {}, prefs: { intensityType: 'RIR' }, exMuscle: {}, exMuscleByName: {} };
      for (let s = 1; s <= 3; s++) { logged.data['w1_d0_e' + i + '_s' + s + '_load'] = 8; logged.data['w1_d0_e' + i + '_s' + s + '_reps'] = 12; }
      return JSON.parse(JSON.stringify(TAE.buildByMuscle(TAE.normalizeSets(logged, storedProgram(), {}))))
        .map((m) => [m.id, m.directSets, m.indirectSets]).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    },
    chips: (i) => chips(i).map((a) => a['data-name'] + ' · ' + a['data-muscle']),
    pick(i, label) {
      const chip = chips(i).find((a) => a['data-name'] + ' · ' + a['data-muscle'] === label);
      assert.ok(chip, 'row ' + i + ' offers the chip ' + label + ' (offered: ' + chips(i).map((a) => a['data-name'] + ' · ' + a['data-muscle']).join(', ') + ')');
      run(chip.onclick, { getAttribute: (k) => chip[k] });
    },
    // Types the name one key at a time, as the input's oninput does, then commits it
    // with the input's onchange (as leaving the field does), unless commit is false.
    type(i, text, commit = true) {
      const input = nameInput(i);
      const el = { value: '' };
      for (const ch of text) { el.value += ch; run(input.oninput, el); }
      if (commit) run(input.onchange, el);
    }
  };
}

function expectRow(r, i, want, why) {
  assert.equal(r.muscles(i), want, why);
  console.log('OK  ', want.padEnd(58), '-', why);
}

// --- the reported case ------------------------------------------------------
let r = review(['Panca piana', 'Kickback', 'Alzate laterali', 'French press']);
expectRow(r, 1, 'Kickback al Cavo | GLUTEI | GLUTEI', 'a bare "Kickback" imports as the glute kickback');
assert.ok(r.chips(1).includes('Kickback tricipiti · TRICIPITI'), 'the review offers the triceps kickback');
r.pick(1, 'Kickback tricipiti · TRICIPITI');
expectRow(r, 1, 'Kickback tricipiti | TRICIPITI | TRICIPITI', 'picking "Kickback tricipiti · TRICIPITI" gives the row the triceps');
expectRow(r, 0, 'Panca Piana con Bilanciere | PETTO | PETTO+TRICIPITI+DELTOIDI', 'other rows are untouched');
expectRow(r, 3, 'French Press con Bilanciere EZ | TRICIPITI | TRICIPITI', 'other rows are untouched');

// The reviewed program is what gets stored and counted.
assert.equal(r.stored(1), 'Kickback tricipiti | TRICIPITI | TRICIPITI', 'normalizeProgram stores the picked muscles');
assert.deepEqual(r.stats(1), [['BRACCIA', 3, 0]], 'the picked triceps kickback counts for the arms, not the legs');
console.log('OK  ', 'normalizeProgram + stats: 3 sets of the picked kickback count as BRACCIA only');

// --- the sheet's own name no longer decides a renamed row ------------------------------
// The importer keeps the sheet's name as the row's movement, and the stats read it
// alongside the name, so a renamed row must not keep "Plank", "Curl", "Leg press"...
r = review(['Plank']);
r.type(0, 'Panca Piana con Bilanciere');
assert.deepEqual(r.stats(0), [['PETTO', 3, 0], ['BRACCIA', 0, 3], ['SPALLE', 0, 3]], '"Plank" renamed to a bench press counts as chest, not abs');
console.log('OK  ', '"Plank" typed as "Panca Piana con Bilanciere" counts as PETTO, not ADDOME');
r = review(['Curl manubri']);
assert.ok(r.chips(0).includes('Panca Inclinata con Manubri · PETTO'), 'the review offers the incline press');
r.pick(0, 'Panca Inclinata con Manubri · PETTO');
assert.equal(r.stats(0)[0].join(','), 'PETTO,3,0', '"Curl manubri" picked as the incline press counts as chest, not arms');
console.log('OK  ', '"Curl manubri" picked as "Panca Inclinata con Manubri" counts as PETTO, not BRACCIA');
r = review(['Leg press']);
r.type(0, 'Panca Piana con Bilanciere');
assert.ok(!r.stats(0).some((m) => m[0] === 'GAMBE'), '"Leg press" renamed to a bench press counts nothing for the legs');
console.log('OK  ', '"Leg press" typed as a bench press no longer adds GAMBE');
r = review(['Crunch']);
r.type(0, 'Crunch mio');
assert.equal(r.stats(0)[0].join(','), 'ADDOME,3,0', 'a free name keeps the sheet\'s name and muscles');
console.log('OK  ', '"Crunch" typed as a free name "Crunch mio" still counts as ADDOME');

// Words in the new exercise's own name must not outvote the muscle it was picked for:
// "Nordic Curl Assistito" is a hamstring exercise even though its name says "curl".
r = review(['Leg curl nordico']);
r.type(0, 'Nordic Curl Assistito');
assert.equal(r.stored(0), 'Nordic Curl Assistito | FEMORALI | FEMORALI');
assert.equal(r.stats(0)[0].join(','), 'GAMBE,3,0', '"Nordic Curl Assistito" counts as legs, not arms');
console.log('OK  ', 'typed "Nordic Curl Assistito" counts as GAMBE, not BRACCIA');

// Confirming the importer's own mapping, or going back to the imported name, changes nothing.
for (const [label, act, keys] of [
  ['picking the chip of its own mapping', (x) => x.pick(0, 'Nordic Curl Assistito · FEMORALI'), ['name', 'movement', 'muscle_group', 'muscle_groups']],
  ['typing away and back without committing', (x) => { x.type(0, 'Nordic Curl Assistitox', false); x.type(0, 'Nordic Curl Assistito', false); }, ['name', 'movement', 'muscle_group', 'muscle_groups']],
  ['committing "Plank" and then coming back', (x) => { x.type(0, 'Plank'); x.type(0, 'Nordic Curl Assistito'); }, ['name', 'movement', 'muscle_group', 'muscle_groups']]
]) {
  const fresh = review(['Nordic hamstring']);
  const before = JSON.stringify(fresh.storedProgram());
  const statsBefore = JSON.stringify(fresh.stats(0));
  act(fresh);
  assert.equal(JSON.stringify(fresh.stats(0)), statsBefore, label + ': stats unchanged');
  assert.equal(statsBefore, JSON.stringify([['GAMBE', 3, 0]]), 'a Nordic hamstring curl counts as legs');
  const after = JSON.parse(JSON.stringify(fresh.storedProgram()));
  const beforeRow = JSON.parse(before).weeks[0].sessions[0].exercises[0];
  const afterRow = after.weeks[0].sessions[0].exercises[0];
  for (const k of keys) assert.deepEqual(afterRow[k], beforeRow[k], label + ': stored ' + k + ' unchanged');
  console.log('OK  ', ('"Nordic hamstring": ' + label).padEnd(58), '- row and stats unchanged (GAMBE)');
}

// A misclicked suggestion can be undone by typing the sheet's own name back, even when the
// importer did not know that name: the row counts exactly as imported again.
r = review(['Remata con elastico']);
const remataImported = JSON.stringify(r.storedProgram().weeks[0].sessions[0].exercises[0]);
const remataStats = JSON.stringify(r.stats(0));
r.pick(0, r.chips(0)[0]);
assert.notEqual(JSON.stringify(r.stats(0)), remataStats, 'the misclick changes the row');
r.type(0, 'Remata con elastico');
assert.equal(JSON.stringify(r.storedProgram().weeks[0].sessions[0].exercises[0]), remataImported, 'typing the sheet name back restores the imported row exactly');
assert.equal(JSON.stringify(r.stats(0)), remataStats, 'and its stats');
console.log('OK  ', 'misclicked chip on "Remata con elastico", name typed back: row and stats as imported');

// Names are compared in any alphabet: a Cyrillic free rename is a free name, the sheet's own
// Cyrillic name undoes, and a name that only shares its Latin or digit part with another
// ("Kickback трицепс", "Жим 1" / "Тяга 1") is not that other name.
r = review(['Жим лёжа']);
r.type(0, 'Panca piana');
assert.deepEqual(r.stats(0)[0], ['PETTO', 3, 0]);
r.type(0, 'Жим лёжа широким хватом');
assert.deepEqual(r.stats(0)[0], ['PETTO', 3, 0], 'a Cyrillic free name keeps the confirmed chest press');
r.type(0, 'Жим лёжа');
assert.equal(r.muscles(0).split(' | ')[1], 'TOTAL', 'typing the Cyrillic sheet name back restores the import');
console.log('OK  ', 'Cyrillic sheet row: a free Cyrillic rename keeps the confirmed PETTO; the sheet name undoes');
r = review(['French press']);
r.type(0, 'Kickback трицепс');
assert.equal(r.muscles(0).split(' | ')[1], 'TRICIPITI', '"Kickback трицепс" is not the glute "Kickback"');
r = review(['Kickback']);
r.pick(0, 'Kickback tricipiti · TRICIPITI');
r.type(0, 'Kickback трицепс');
assert.equal(r.muscles(0).split(' | ')[1], 'TRICIPITI', 'nor the sheet\'s own "Kickback"');
r = review(['Тяга 1']);
r.type(0, 'Panca piana');
r.type(0, 'Жим 1');
assert.deepEqual(r.stats(0)[0], ['PETTO', 3, 0], '"Жим 1" is not the sheet\'s "Тяга 1"');
console.log('OK  ', 'mixed-alphabet names never match their Latin/digit part alone');
r = review(['Panca piana Разгибания'], [{ name: 'Разгибания', muscle_group: 'BRACCIA' }]);
assert.ok(r.chips(0).includes('Разгибания · BRACCIA'), 'the Cyrillic library exercise is offered');
r.pick(0, 'Разгибания · BRACCIA');
assert.equal(r.muscles(0), 'Разгибания | BRACCIA | BRACCIA', 'a Cyrillic library chip gives its muscle');
console.log('OK  ', 'a picked Cyrillic library exercise ("Разгибания · BRACCIA") gives its muscle');

// A row the importer could not map gets the catalogue's muscle when its name is typed exactly.
r = review(['cuban press']);
assert.equal(r.muscles(0).split(' | ')[1], 'TOTAL', '"cuban press" is not in the import dictionary');
r.type(0, 'Cuban Press');
assert.equal(r.stats(0)[0].join(','), 'SPALLE,3,0', 'typed as the catalogue name, it counts for the shoulders');
console.log('OK  ', 'unmapped "cuban press" typed as catalogue "Cuban Press" counts as SPALLE');

// The same for rows the importer did map: typing the sheet's own name back ("Pull-ups", shown
// in the review as the original) undoes a misclick, not only the importer's canonical name.
for (const sheet of ['Pull-ups', 'Kickback', 'Chest press']) {
  const x = review([sheet]);
  const imported = JSON.stringify(x.storedProgram().weeks[0].sessions[0].exercises[0]);
  const importedStats = JSON.stringify(x.stats(0));
  const misclick = x.chips(0).find((c) => c.split(' · ')[1] !== x.muscles(0).split(' | ')[1]);
  assert.ok(misclick, sheet + ': a chip for another muscle is offered');
  x.pick(0, misclick);
  assert.notEqual(JSON.stringify(x.stats(0)), importedStats, sheet + ': the misclick changes the row');
  x.type(0, sheet);
  const row = x.storedProgram().weeks[0].sessions[0].exercises[0];
  const want = JSON.parse(imported);
  for (const k of ['movement', 'muscle_group', 'muscle_groups']) assert.deepEqual(row[k], want[k], sheet + ': ' + k + ' as imported');
  assert.equal(JSON.stringify(x.stats(0)), importedStats, sheet + ': stats as imported');
  console.log('OK  ', ('misclick on "' + sheet + '", sheet name typed back').padEnd(58), '- muscles and stats as imported');
}

// A renamed row counts like a direct import of the name it was renamed to, whatever the sheet
// called it - including a name the stats read on their own ("Plank" locks to the abs) -
// whenever the importer reads that name as the same main muscle. Every exact name and keyword
// of the import dictionary and every catalogue name and alias is checked. Otherwise (the
// importer does not know the name, or the stats' own rules put a direct import elsewhere, as
// "Nordic Curl Assistito" reading as a curl) it counts for the exercise's own muscle, except
// where those rules lock the name itself to another muscle ("Jefferson curl").
const page0 = loadPage();
const engine = page0.TrainingAnalyticsEngine;
const foldKey = page0.reviewExerciseNameKey;
const macroOf = (m) => engine.muscleContributionForExercise('', { muscle_groups: [m] }).primary[0];
const targets = [];
const owned = new Set();
function target(name, muscle, entry) { const k = foldKey(name); if (!owned.has(k)) { owned.add(k); targets.push({ name, muscle, entry }); } }
EXERCISE_DICTIONARY.forEach((e) => [e.normalized].concat(e.keywords || []).forEach((n) => target(n, e.muscle, e.normalized)));
page0.WEB_EXERCISE_CATALOG.forEach((c) => [c.name, c.en].concat(c.aliases || []).filter(Boolean).forEach((n) => target(n, c.muscle)));
let sameAsImport = 0, ownMuscle = 0;
const lockedByName = [];
for (const t of targets) {
  const want = macroOf(t.muscle);
  if (!want || ['ALTRO', 'TOTAL'].includes(String(t.muscle).toUpperCase())) continue;
  const renamed = review(['Plank']);
  renamed.type(0, t.name);
  const direct = review([t.name]);
  const directRow = direct.storedProgram().weeks[0].sessions[0].exercises[0];
  const directStats = direct.stats(0);
  // Comparable when the importer reads the text as the same exercise: the same dictionary entry
  // (it maps "Front Squat con Bilanciere" to plain "Squat con Bilanciere"), or for a catalogue
  // name the same main muscle.
  const sameExercise = (!t.entry || directRow.name === t.entry) && macroOf(directRow.muscle_group) === want;
  if (sameExercise && directStats[0] && directStats[0][0] === want) {
    const row = renamed.storedProgram().weeks[0].sessions[0].exercises[0];
    assert.deepEqual([row.muscle_group, row.muscle_groups], [directRow.muscle_group, directRow.muscle_groups], t.name + ': muscles as a direct import');
    // A direct import also renames the row to the dictionary's name ("dumbbell flyes" becomes
    // "Croci ai Cavi"), and the stats read the name too; with the same name, the same stats.
    if (foldKey(row.name) === foldKey(directRow.name)) assert.deepEqual(renamed.stats(0), directStats, t.name + ': stats as a direct import');
    else assert.equal(renamed.stats(0)[0].join(','), directStats[0].join(','), t.name + ': main muscle as a direct import');
    sameAsImport++;
    continue;
  }
  const got = renamed.stats(0)[0][0];
  const lock = engine.nameLockedMuscle(t.name, '');
  if (got !== want && lock && lock !== want) { assert.equal(got, lock, t.name + ': counts as the stats rules lock it'); lockedByName.push(t.name); continue; }
  assert.equal(got, want, t.name + ' (' + t.muscle + '): counts for its own muscle');
  ownMuscle++;
}
assert.ok(sameAsImport > 300, 'the dictionary and catalogue were checked');

// An exact exercise name means the same on every row: typed on the row the sheet itself called
// that ("Push-up diamante", which the importer reads as a plain push-up), it counts for the same
// main muscle as typed anywhere else. The one allowed difference: when the importer mapped the
// row to that very exercise, typing its name confirms the import and leaves the row exactly as
// imported, even where the stats read the sheet's raw text another way ("Nordic curl").
let ownRowChecked = 0;
const keptAsImported = [];
for (const t of targets) {
  const want = macroOf(t.muscle);
  if (!want || ['ALTRO', 'TOTAL'].includes(String(t.muscle).toUpperCase())) continue;
  const elsewhere = review(['Plank']);
  elsewhere.type(0, t.name);
  const own = review([t.name]);
  const imported = JSON.stringify(own.storedProgram().weeks[0].sessions[0].exercises[0]);
  own.type(0, t.name);
  const ownMain = (own.stats(0)[0] || [])[0];
  const elsewhereMain = (elsewhere.stats(0)[0] || [])[0];
  if (ownMain !== elsewhereMain) {
    const row = JSON.parse(JSON.stringify(own.storedProgram().weeks[0].sessions[0].exercises[0]));
    const before = JSON.parse(imported);
    assert.deepEqual([row.movement, row.muscle_group, row.muscle_groups], [before.movement, before.muscle_group, before.muscle_groups],
      t.name + ': counts ' + ownMain + ' on its own sheet row but ' + elsewhereMain + ' elsewhere, and was not simply kept as imported');
    assert.equal(macroOf(before.muscle_group), want, t.name + ': kept as imported only when the importer chose this exercise\'s muscle');
    keptAsImported.push(t.name);
    continue;
  }
  ownRowChecked++;
}
assert.ok(keptAsImported.length <= 5, 'only a handful of names are read differently from their own raw sheet text: ' + keptAsImported.join(', '));
console.log('OK  ', 'each exact name typed on its own sheet row counts as elsewhere (' + ownRowChecked + ' names); kept as imported: ' + keptAsImported.join(', '));
console.log('OK  ', '"Plank" renamed to each dictionary name/keyword and catalogue name: ' + sameAsImport + ' count exactly like a direct import, ' + ownMuscle + ' for their own muscle; locked by name: ' + lockedByName.join(', '));

// --- the Coach AI "open in review" path, where the shown and stored rows are copies -----
r = review(['Kickback'], [], true);
assert.notEqual(r.prog.weeks[0].sessions[0].exercises[0], r.prog.training.weeks[0].sessions[0].exercises[0], 'the shown and stored rows are separate copies');
r.pick(0, 'Kickback tricipiti · TRICIPITI');
assert.equal(r.stored(0), 'Kickback tricipiti | TRICIPITI | TRICIPITI', 'the stored copy gets the pick');
r.type(0, 'Kickback tricipiti mio');
assert.equal(r.muscles(0), 'Kickback tricipiti mio | TRICIPITI | TRICIPITI', 'the shown copy gets the rename');
assert.equal(r.stored(0), 'Kickback tricipiti mio | TRICIPITI | TRICIPITI', 'the stored copy keeps the picked muscles after a free rename');
assert.deepEqual(r.stats(0), [['BRACCIA', 3, 0]], 'and counts for the arms');
console.log('OK  ', 'Coach AI review copies: pick and free rename reach the stored row, counted as BRACCIA');
r = review(['Kickback'], [{ name: 'Kickback cavo', muscle_group: 'BRACCIA' }], true);
r.pick(0, 'Kickback cavo · BRACCIA');
assert.equal(r.stored(0), r.muscles(0), 'the stored copy takes the muscle the chip showed, like the shown copy');
console.log('OK  ', 'Coach AI review copies: the stored row takes the chip\'s shown muscle (' + r.stored(0) + ')');

// And the other way round: a triceps kickback picked as the glute one counts as legs.
r = review(['Kickback manubri']);
expectRow(r, 0, 'Kickback tricipiti | TRICIPITI | TRICIPITI', '"Kickback manubri" imports as the triceps kickback');
r.pick(0, 'Kickback al Cavo · GLUTEI');
expectRow(r, 0, 'Kickback al Cavo | GLUTEI | GLUTEI', 'picking the glute kickback gives the row the glutes');

// A picked suggestion carries the dictionary entry's full muscle list, as the importer writes it.
r = review(['Kickback']);
r.pick(0, 'Kickback al Cavo · GLUTEI');
r.type(0, 'Panca Piana con Bilanciere');
expectRow(r, 0, 'Panca Piana con Bilanciere | PETTO | PETTO+TRICIPITI+DELTOIDI', 'an exact dictionary name gets the entry\'s full muscle list');

// --- typed names ----------------------------------------------------------------
r = review(['Kickback', 'French press']);
r.type(1, 'Kickback tricipiti');
expectRow(r, 1, 'Kickback tricipiti | TRICIPITI | TRICIPITI', 'a typed catalogue name takes its muscles');
r = review(['French press']);
r.type(0, 'alzate LATERÀLI');
expectRow(r, 0, 'alzate LATERÀLI | DELTOIDI | DELTOIDI', 'case and accents do not matter for an exact name (a dictionary keyword)');
r = review(['French press']);
r.type(0, 'French press stretta');
expectRow(r, 0, 'French press stretta | TRICIPITI | TRICIPITI', 'a free name keeps the importer\'s muscles');
r = review(['French press']);
r.type(0, 'Alzate laterali strette');
expectRow(r, 0, 'Alzate laterali strette | TRICIPITI | TRICIPITI', 'typing through an exact name ("Alzate laterali") leaves nothing behind');
r = review(['French press']);
r.type(0, 'Alzate laterali', false);
expectRow(r, 0, 'Alzate laterali | DELTOIDI | DELTOIDI', 'an exact name shows its muscles while still typing');
r.type(0, 'Alzate laterali x', false);
expectRow(r, 0, 'Alzate laterali x | TRICIPITI | TRICIPITI', 'an uncommitted exact name does not become the baseline');

// A confirmation (a pick, or a committed name) becomes the baseline for later free names.
r = review(['Kickback']);
r.pick(0, 'Kickback tricipiti · TRICIPITI');
r.type(0, 'Kickback tricipiti lento');
expectRow(r, 0, 'Kickback tricipiti lento | TRICIPITI | TRICIPITI', 'a free name after a pick keeps the picked muscles');
r.type(0, 'Kickback al Cavo');
expectRow(r, 0, 'Kickback al Cavo | GLUTEI | GLUTEI', 'a committed exact name takes its muscles');
r.type(0, 'Kickback al Cavo lento');
expectRow(r, 0, 'Kickback al Cavo lento | GLUTEI | GLUTEI', 'a free name after a committed exact name keeps those muscles');

// --- the user's own library ----------------------------------------------------------
r = review(['Kickback'], [{ name: 'Kickback con elastico mio', muscle_group: 'BRACCIA' }, { name: 'Kickback strano', muscle_group: 'ALTRO' }]);
assert.ok(r.chips(0).includes('Kickback con elastico mio · BRACCIA'), 'library exercises are offered with their muscle');
r.pick(0, 'Kickback con elastico mio · BRACCIA');
expectRow(r, 0, 'Kickback con elastico mio | BRACCIA | BRACCIA', 'a picked library exercise gives its muscle');
r = review(['Kickback'], [{ name: 'Kickback strano', muscle_group: 'ALTRO' }]);
r.pick(0, 'Kickback strano · ALTRO');
expectRow(r, 0, 'Kickback strano | GLUTEI | GLUTEI', 'a library exercise without a muscle ("ALTRO") keeps the row\'s muscles');

// --- rows that are not reviewable keep everything -------------------------------------
r = review(['Panca piana']);
const before = r.muscles(0);
r.page.updateReviewExerciseField(0, 0, 0, 'sets', 4);
r.page.updateReviewExerciseField(0, 0, 0, 'reps', '8');
assert.equal(r.muscles(0), before, 'editing sets and reps does not touch muscles');
console.log('OK  ', 'editing sets and reps does not touch muscles');

console.log('\nImport review muscle tests passed.');
