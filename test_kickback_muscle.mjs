// Runs the real muscle heuristics (web/training-analytics-engine.js) and the real
// page functions that remember an exercise's muscle (cut out of
// web/index.base.html), and asserts what they return. Nothing here
// string-matches the source.
//
// Guards the kickback mix-up: a bare "kickback" hint sat in the triceps row, so
// glute kickbacks ("Kickback cavo", "Kickback al Cavo", "Kickback elastico"...)
// were counted as BRACCIA in stats, and the page remembered that guess per name.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const base = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');

function sourceOf(name) {
  const at = base.indexOf('function ' + name + '(');
  assert.ok(at !== -1, name + ' not found in web/index.base.html');
  let depth = 0;
  for (let i = base.indexOf('{', at); i < base.length; i++) {
    if (base[i] === '{') depth++;
    else if (base[i] === '}' && --depth === 0) return base.slice(at, i + 1);
  }
  throw new Error('unterminated ' + name);
}

function constOf(name, end) {
  const at = base.indexOf('const ' + name + ' =');
  assert.ok(at !== -1, name + ' not found in web/index.base.html');
  return base.slice(at, base.indexOf(end, at) + end.length);
}

const sandbox = { console };
sandbox.window = sandbox;
sandbox.self = sandbox;
vm.createContext(sandbox);
for (const file of ['exercise-catalog-extra.js', 'training-analytics-engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, 'web', file), 'utf8'), sandbox);
}
vm.runInContext([
  'var store = { exMuscleByName: {}, exMuscle: {} };',
  constOf('MUSCLE_TAXONOMY', '};'),
  constOf('MACRO_MUSCLE_GROUPS', '];'),
  sourceOf('normalizeMacroMuscleGroup'),
  sourceOf('foldExerciseMuscleName'),
  sourceOf('rememberExerciseMuscle'),
  sourceOf('correctRememberedKickbackMuscles'),
  sourceOf('lookupCatalogExerciseMuscle'),
  sourceOf('lookupKnowledgeExerciseMuscle'),
  sourceOf('storedExerciseMuscleRecord'),
  sourceOf('getExerciseMuscleGroups'),
  'function setStore(s) { store = s; }',
  'function getStore() { return store; }'
].join('\n'), sandbox);

const TAE = sandbox.TrainingAnalyticsEngine;
assert.ok(TAE && typeof TAE.muscleContributionForExercise === 'function', 'engine loaded');
const plain = (v) => JSON.parse(JSON.stringify(v));

function contribution(name) {
  const c = TAE.muscleContributionForExercise(name, {});
  return { primary: plain(c.primary), secondary: plain(c.secondary) };
}

// --- engine heuristics ----------------------------------------------------
function expectGlute(name) {
  const c = contribution(name);
  assert.deepEqual(c.primary, ['GAMBE'], JSON.stringify(name) + ' primary');
  assert.ok(!c.secondary.includes('BRACCIA'), JSON.stringify(name) + ' must not pick up BRACCIA as secondary');
  console.log('OK  ', JSON.stringify(name).padEnd(30), 'GAMBE');
}
function expectTriceps(name) {
  const c = contribution(name);
  assert.deepEqual(c.primary, ['BRACCIA'], JSON.stringify(name) + ' primary');
  assert.ok(!c.secondary.includes('GAMBE'), JSON.stringify(name) + ' must not pick up GAMBE as secondary');
  console.log('OK  ', JSON.stringify(name).padEnd(30), 'BRACCIA');
}

['Kickback cavo', 'Kickback al Cavo', 'Kickback', 'Kickback ai cavi', 'Kickback elastico',
  'Cable kickback', 'Cable Kickback', 'Glute kickback', 'Kickback glutei', 'Kickback cavo glutei',
  'kickback cavo'].forEach(expectGlute);

['Kickback tricipiti', 'Kickback cavo tricipiti', 'Triceps kickback', 'Cable triceps kickback',
  'Kickback tricipiti ai cavi', 'Tricep kickback'].forEach(expectTriceps);

// The dumbbell kickback is the triceps exercise (confirmed by the product owner).
['Kickback manubri', 'Dumbbell kickback'].forEach(expectTriceps);

// A movement naming the triceps also keeps a bare kickback on the arms.
assert.deepEqual(plain(TAE.muscleContributionForExercise('Kickback', { movement: 'Tricipiti' }).primary), ['BRACCIA']);
console.log('OK  ', '"Kickback" + movement Tricipiti'.padEnd(30), 'BRACCIA');

// Neighbours of the rows that changed stay as they were.
assert.deepEqual(contribution('French press').primary, ['BRACCIA']);
assert.deepEqual(contribution('Pushdown al cavo').primary, ['BRACCIA']);
assert.deepEqual(contribution('Hip thrust').primary, ['GAMBE']);
assert.deepEqual(contribution('Donkey calf raise').primary, ['GAMBE']);
assert.deepEqual(contribution('Curl manubri').primary, ['BRACCIA']);
console.log('OK   unrelated arm and glute exercises unchanged');

// --- per-muscle stats -----------------------------------------------------
const byMuscle = plain(TAE.buildByMuscle([{ name: 'Kickback cavo', volume: 400, reps: 12, week: 1 }]));
assert.deepEqual(byMuscle.map((m) => m.id), ['GAMBE'], 'glute kickback sets count toward GAMBE only, not BRACCIA');
assert.equal(byMuscle[0].directSets, 1);
console.log('OK   buildByMuscle counts "Kickback cavo" as GAMBE only');

// --- page: fresh classification is remembered as GAMBE --------------------
sandbox.setStore({ exMuscleByName: {}, exMuscle: {} });
assert.deepEqual(plain(sandbox.getExerciseMuscleGroups('Kickback al Cavo', '', [])), ['GAMBE']);
assert.equal(sandbox.getStore().exMuscleByName['kickback al cavo'].muscle, 'GAMBE');
console.log('OK   getExerciseMuscleGroups("Kickback al Cavo") -> GAMBE, remembered as GAMBE');

// --- page: stale remembered guesses are corrected, choices are not --------
const stale = {
  'kickback cavo': { muscle: 'BRACCIA', source: 'triangulated', at: 1 },
  'kickback': { muscle: 'BRACCIA', source: 'name', at: 1 },
  'cable kickback': { muscle: 'BRACCIA', source: 'triangulated', at: 1 },
  'kickback al cavo': { muscle: 'BRACCIA', source: 'manual', at: 1 },
  'kickback elastico': { muscle: 'BRACCIA', source: 'slot', at: 1 },
  'kickback ai cavi': { muscle: 'BRACCIA', source: 'research', at: 1 },
  'kickback tricipiti': { muscle: 'BRACCIA', source: 'triangulated', at: 1 },
  'kickback manubri': { muscle: 'BRACCIA', source: 'triangulated', at: 1 },
  'french press': { muscle: 'BRACCIA', source: 'triangulated', at: 1 },
  'hip thrust': { muscle: 'GAMBE', source: 'triangulated', at: 1 }
};
sandbox.setStore({ exMuscleByName: JSON.parse(JSON.stringify(stale)), exMuscle: {} });
sandbox.correctRememberedKickbackMuscles();
let after = plain(sandbox.getStore().exMuscleByName);
for (const key of ['kickback cavo', 'kickback', 'cable kickback']) {
  assert.equal(after[key].muscle, 'GAMBE', key + ' corrected');
  assert.equal(after[key].source, stale[key].source, key + ' keeps its source');
}
for (const key of ['kickback al cavo', 'kickback elastico', 'kickback ai cavi', 'kickback tricipiti', 'kickback manubri', 'french press', 'hip thrust']) {
  assert.deepEqual(after[key], stale[key], key + ' untouched');
}
console.log('OK   stale triangulated/name BRACCIA kickbacks -> GAMBE; manual, slot, research and triceps entries untouched');

const firstPass = JSON.stringify(after);
sandbox.correctRememberedKickbackMuscles();
assert.equal(JSON.stringify(plain(sandbox.getStore().exMuscleByName)), firstPass, 'correction is idempotent');
console.log('OK   correction is idempotent');

assert.deepEqual(plain(sandbox.getExerciseMuscleGroups('Kickback cavo', '', [])), ['GAMBE']);
assert.deepEqual(plain(sandbox.getExerciseMuscleGroups('Kickback al Cavo', '', [])), ['BRACCIA'], 'a manual choice still wins');
console.log('OK   after correction the page reads "Kickback cavo" as GAMBE; manual choice still wins');

console.log('\nKickback muscle tests passed.');
