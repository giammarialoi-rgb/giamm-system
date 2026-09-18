// Runs the real importer normalizeExerciseName - the module, and the bundled copy
// the app actually runs inside web/index.html and the Android index.html - and
// asserts what it returns for kickbacks.
//
// Guards the kickback mix-up on import: the glute entry's bare "kickback"
// keyword caught every kickback, so "Kickback tricipiti", "Triceps kickback" and
// the dumbbell kickback were renamed to the glute "Kickback al Cavo".
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeExerciseName, EXERCISE_DICTIONARY } from './universal-import-engine.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));

function functionSource(src, name, file) {
  const at = src.indexOf('function ' + name + '(');
  assert.ok(at !== -1, name + ' not found in ' + file);
  let depth = 0;
  for (let i = src.indexOf('{', at); i < src.length; i++) {
    if (src[i] === '{') depth++;
    else if (src[i] === '}' && --depth === 0) return src.slice(at, i + 1);
  }
  throw new Error('unterminated ' + name + ' in ' + file);
}

function bundledNormalizer(file) {
  const src = fs.readFileSync(path.join(root, file), 'utf8');
  const dict = src.match(/var EXERCISE_DICTIONARY = (\[[\s\S]*?\n\]);/);
  assert.ok(dict, 'EXERCISE_DICTIONARY not found in ' + file);
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext([
    'var EXERCISE_DICTIONARY = ' + dict[1] + ';',
    functionSource(src, 'kickbackDictionaryEntry', file),
    functionSource(src, 'normalizeExerciseName', file)
  ].join('\n'), sandbox);
  return sandbox.normalizeExerciseName;
}

const normalizers = [
  ['universal-import-engine.mjs', normalizeExerciseName],
  ['web/index.html', bundledNormalizer('web/index.html')],
  ['app/src/main/assets/index.html', bundledNormalizer('app/src/main/assets/index.html')]
];

function expect(raw, name, muscle, why) {
  for (const [file, normalize] of normalizers) {
    const r = normalize(raw);
    assert.equal(r.name_normalized, name, JSON.stringify(raw) + ' name via ' + file + ' - ' + why);
    assert.equal(r.muscle, muscle, JSON.stringify(raw) + ' muscle via ' + file + ' - ' + why);
    assert.equal(r.name_original, String(raw).trim().replace(/^\d+[.\s\-)]+/, '').trim(), JSON.stringify(raw) + ' keeps the original name');
  }
  console.log('OK  ', JSON.stringify(raw).padEnd(34), name.padEnd(24), muscle, '-', why);
}

const DUMBBELL = 'Kickback tricipiti';
const CABLE = 'Kickback cavo tricipiti';
const GLUTE = 'Kickback al Cavo';

// --- previously renamed to the glute kickback ------------------------------
expect('Kickback tricipiti', DUMBBELL, 'TRICIPITI', 'names the triceps');
expect('KICKBACK TRICIPITI', DUMBBELL, 'TRICIPITI', 'case does not matter');
expect('3. Kickback tricipiti', DUMBBELL, 'TRICIPITI', 'numbered program row');
expect('Triceps kickback', DUMBBELL, 'TRICIPITI', 'English, names the triceps');
expect('Tricep kickback', DUMBBELL, 'TRICIPITI', 'English, singular');
expect('Kickback manubri', DUMBBELL, 'TRICIPITI', 'dumbbell kickback is the triceps exercise');
expect('Kickback con manubrio', DUMBBELL, 'TRICIPITI', 'dumbbell kickback is the triceps exercise');
expect('Dumbbell kickback', DUMBBELL, 'TRICIPITI', 'dumbbell kickback is the triceps exercise');
expect('DB kickback', DUMBBELL, 'TRICIPITI', 'dumbbell abbreviation');
expect('Kickback cavo tricipiti', CABLE, 'TRICIPITI', 'catalogue name, cable and triceps');
expect('Kickback tricipiti ai cavi', CABLE, 'TRICIPITI', 'cable and triceps, other word order');
expect('Kickback al cavo per tricipiti', CABLE, 'TRICIPITI', 'cable and triceps, in a word order no keyword covers');
expect('Cable triceps kickback', CABLE, 'TRICIPITI', 'English catalogue name');
// Arm words don't make a kickback the triceps one: glute kickbacks use them too.
expect('Kickback un braccio', GLUTE, 'GLUTEI', 'an arm word alone is not triceps');
expect('Single arm kickback', GLUTE, 'GLUTEI', 'an arm word alone is not triceps');
expect('Kickback in quadrupedia (braccia tese) 3x15', GLUTE, 'GLUTEI', 'quadruped glute kickback on straight arms');
expect('Quadruped kickback, straight arms', GLUTE, 'GLUTEI', 'quadruped glute kickback on straight arms');
expect('Donkey kickback (arms extended)', GLUTE, 'GLUTEI', 'quadruped glute kickback on straight arms');

// --- glute kickbacks stay the glute lift --------------------------------------
expect('Kickback', GLUTE, 'GLUTEI', 'bare kickback is the glute lift');
expect('Kickback cavo', GLUTE, 'GLUTEI', 'catalogue glute name');
expect('Kickback al Cavo', GLUTE, 'GLUTEI', 'dictionary glute name');
expect('Kickback ai cavi', GLUTE, 'GLUTEI', 'cable, no triceps named');
expect('Kickback elastico', GLUTE, 'GLUTEI', 'elastic band kickback');
expect('Cable kickback', GLUTE, 'GLUTEI', 'catalogue English glute name');
expect('Glute kickback', GLUTE, 'GLUTEI', 'names the glutes');
expect('Kickback glutei', GLUTE, 'GLUTEI', 'names the glutes');
expect('Glute kickback con manubrio', GLUTE, 'GLUTEI', 'names the glutes, so the dumbbell does not make it triceps');
expect('Donkey kickback', GLUTE, 'GLUTEI', 'glute lift');
expect('Kickback gluteo con manubrio', GLUTE, 'GLUTEI', 'names the glutes');
expect('Glutes kickback with dumbbell', GLUTE, 'GLUTEI', 'names the glutes');
expect('Donkey kickback sugli avambracci', GLUTE, 'GLUTEI', '"avambracci" (forearms) is not an arm word');
expect('Kickback in quadrupedia (appoggio sugli avambracci)', GLUTE, 'GLUTEI', '"avambracci" (forearms) is not an arm word');

// --- neighbours are untouched --------------------------------------------------
expect('French press', 'French Press con Bilanciere EZ', 'TRICIPITI', 'unrelated triceps exercise');
expect('Pushdown ai cavi', 'Pushdown ai Cavi con Corda', 'TRICIPITI', 'unrelated triceps exercise');
expect('Hip thrust', 'Hip Thrust con Bilanciere', 'GLUTEI', 'unrelated glute exercise');
expect('Curl con manubri', 'Curl Alternato con Manubri', 'BICIPITI', 'dumbbells alone do not mean kickback');

// --- the triceps entries are catalogue exercises, not new ones ----------------
const sandbox = {};
sandbox.window = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-catalog-extra.js'), 'utf8'), sandbox);
const catalogue = sandbox.WEB_EXERCISE_CATALOG;
assert.ok(Array.isArray(catalogue) && catalogue.length > 0, 'exercise catalogue loaded');
for (const name of [DUMBBELL, CABLE]) {
  const entry = EXERCISE_DICTIONARY.find((e) => e.normalized === name);
  assert.ok(entry, name + ' is in the import dictionary');
  const row = catalogue.find((r) => r.name === name);
  assert.ok(row, name + ' is the exact catalogue name, so no new exercise id appears');
  assert.equal(row.muscle, entry.muscle, name + ' has the catalogue muscle');
  assert.ok(entry.keywords.every((k) => k.includes('kickback')), name + ' keywords all contain "kickback", so line detection is unchanged');
}
console.log('OK   triceps entries use the catalogue names and muscle');

// --- importer and stats engine agree ------------------------------------------
const engine = { console };
engine.window = engine;
engine.self = engine;
vm.createContext(engine);
vm.runInContext(fs.readFileSync(path.join(root, 'web/training-analytics-engine.js'), 'utf8'), engine);
const TAE = engine.TrainingAnalyticsEngine;
const MACRO = { TRICIPITI: 'BRACCIA', GLUTEI: 'GAMBE' };
for (const raw of ['Kickback tricipiti', 'Triceps kickback', 'Kickback manubri', 'Dumbbell kickback', 'Kickback cavo tricipiti',
  'Kickback tricipiti ai cavi', 'Kickback', 'Kickback cavo', 'Kickback al Cavo', 'Kickback ai cavi', 'Kickback elastico', 'Cable kickback',
  'Glute kickback', 'Glute kickback con manubrio', 'Kickback un braccio', 'Single arm kickback', 'Kickback in quadrupedia (braccia tese) 3x15',
  'Kickback gluteo con manubrio', 'Glutes kickback with dumbbell', 'Glutes DB kickback', 'Donkey kickback sugli avambracci',
  'Kickback in quadrupedia (appoggio sugli avambracci)']) {
  const imported = normalizeExerciseName(raw);
  const stats = TAE.muscleContributionForExercise(raw, {}).primary[0];
  assert.equal(stats, MACRO[imported.muscle], JSON.stringify(raw) + ': importer says ' + imported.muscle + ', stats say ' + stats);
  assert.equal(TAE.muscleContributionForExercise(imported.name_normalized, {}).primary[0], stats, JSON.stringify(raw) + ': the imported name keeps the same stats muscle');
}
console.log('OK   importer muscle matches the stats engine for every kickback name');

console.log('\nImport kickback name tests passed.');
