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

function contribution(name, meta) {
  const c = TAE.muscleContributionForExercise(name, meta || {});
  return { primary: plain(c.primary), secondary: plain(c.secondary) };
}

// --- engine heuristics ----------------------------------------------------
function expectGlute(name, meta) {
  const c = contribution(name, meta);
  assert.deepEqual(c.primary, ['GAMBE'], JSON.stringify(name) + ' primary');
  assert.ok(!c.secondary.includes('BRACCIA'), JSON.stringify(name) + ' must not pick up BRACCIA as secondary');
  console.log('OK  ', JSON.stringify(name).padEnd(30), 'GAMBE');
}
function expectTriceps(name, meta) {
  const c = contribution(name, meta);
  assert.deepEqual(c.primary, ['BRACCIA'], JSON.stringify(name) + ' ' + JSON.stringify(meta || {}) + ' primary');
  assert.ok(!c.secondary.includes('GAMBE'), JSON.stringify(name) + ' ' + JSON.stringify(meta || {}) + ' must not pick up GAMBE as secondary');
  console.log('OK  ', (JSON.stringify(name) + (meta ? ' ' + JSON.stringify(meta) : '')).padEnd(30), 'BRACCIA');
}

['Kickback cavo', 'Kickback al Cavo', 'Kickback', 'Kickback ai cavi', 'Kickback elastico',
  'Cable kickback', 'Cable Kickback', 'Glute kickback', 'Kickback glutei', 'Kickback cavo glutei',
  'kickback cavo'].forEach((n) => expectGlute(n));

['Kickback tricipiti', 'Kickback cavo tricipiti', 'Triceps kickback', 'Cable triceps kickback',
  'Kickback tricipiti ai cavi', 'Tricep kickback'].forEach((n) => expectTriceps(n));

// The dumbbell kickback is the triceps exercise (confirmed by the product owner).
['Kickback manubri', 'Dumbbell kickback'].forEach((n) => expectTriceps(n));

// Kickbacks worded with arms were triceps before and stay so.
['Kickback braccia', 'Kickback un braccio', 'Single arm kickback'].forEach((n) => expectTriceps(n));

// A movement or muscle group naming the triceps or arms keeps a bare kickback on the arms,
// without a GAMBE secondary (the bonus-exercise shape is movement + muscle_groups = macro).
expectTriceps('Kickback', { movement: 'Tricipiti' });
expectTriceps('Kickback', { movement: 'BRACCIA' });
expectTriceps('Kickback', { movement: 'BRACCIA', muscle_groups: ['BRACCIA'] });
expectTriceps('Kickback cavo', { movement: 'TRICIPITI', muscle_groups: ['TRICIPITI'] });

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

// --- a remembered arms guess for a glute kickback is not trusted ------------
// Stats pass the remembered record straight into the engine.
const guess = (muscle, source) => ({ storedMuscle: muscle, storedSource: source });
expectGlute('Kickback cavo', guess('BRACCIA', 'triangulated'));
expectGlute('Kickback', guess('BRACCIA', 'name'));
assert.deepEqual(contribution('Kickback cavo', { storedMuscle: 'BRACCIA' }).primary, ['GAMBE'], 'a record without a source counts as a guess');
for (const source of ['manual', 'slot', 'research', 'encyclopedia']) {
  assert.deepEqual(contribution('Kickback cavo', guess('BRACCIA', source)).primary, ['BRACCIA'], 'a ' + source + ' choice is kept');
}
assert.deepEqual(contribution('Kickback tricipiti', guess('BRACCIA', 'triangulated')).primary, ['BRACCIA'], 'a triceps kickback keeps its arms record');
assert.deepEqual(contribution('Kickback manubri', guess('BRACCIA', 'triangulated')).primary, ['BRACCIA'], 'a dumbbell kickback keeps its arms record');
assert.deepEqual(contribution('French press', guess('GAMBE', 'triangulated')).primary, ['GAMBE'], 'records for other exercises are trusted as before');
assert.deepEqual(contribution('Kickback', Object.assign(guess('BRACCIA', 'triangulated'), { movement: 'BRACCIA', muscle_groups: ['BRACCIA'] })).primary, ['BRACCIA'],
  'an ignored guess falls back to the row\'s own movement and groups');
assert.deepEqual(contribution('Kickback', Object.assign(guess('GAMBE', 'triangulated'), { movement: 'BRACCIA', muscle_groups: ['BRACCIA'] })).primary, ['BRACCIA'],
  'a remembered GAMBE guess does not override a row that says arms either');
console.log('OK   engine ignores app-made guesses for kickbacks, keeps choices');

// --- page: lookups, remembering, and the review's flip scenarios -----------
function page(stale) {
  sandbox.setStore({ exMuscleByName: JSON.parse(JSON.stringify(stale || {})), exMuscle: {} });
  return {
    groups: (name, movement, groups) => plain(sandbox.getExerciseMuscleGroups(name, movement || '', groups || [])),
    record: (key) => plain(sandbox.getStore().exMuscleByName[key] || null)
  };
}

let p = page();
assert.deepEqual(p.groups('Kickback al Cavo'), ['GAMBE']);
assert.equal(p.record('kickback al cavo').muscle, 'GAMBE');
console.log('OK   getExerciseMuscleGroups("Kickback al Cavo") -> GAMBE, remembered as GAMBE');

// A stale guess is replaced by the re-derived result the first time the page looks.
p = page({
  'kickback cavo': { muscle: 'BRACCIA', source: 'triangulated', at: 1 },
  'kickback': { muscle: 'BRACCIA', source: 'name', at: 1 }
});
assert.deepEqual(p.groups('Kickback cavo'), ['GAMBE']);
assert.equal(p.record('kickback cavo').muscle, 'GAMBE', 'stale guess replaced in the store');
assert.deepEqual(p.groups('Kickback'), ['GAMBE']);
assert.equal(p.record('kickback').muscle, 'GAMBE');
console.log('OK   stale triangulated/name BRACCIA guesses are re-derived and replaced on lookup');

// Choices are never overridden.
p = page({
  'kickback al cavo': { muscle: 'BRACCIA', source: 'manual', at: 1 },
  'kickback ai cavi': { muscle: 'BRACCIA', source: 'research', at: 1 }
});
assert.deepEqual(p.groups('Kickback al Cavo'), ['BRACCIA'], 'a manual choice still wins');
assert.deepEqual(p.record('kickback al cavo'), { muscle: 'BRACCIA', source: 'manual', at: 1 });
assert.deepEqual(p.groups('Kickback ai cavi'), ['BRACCIA'], 'a research record is not a name guess');
console.log('OK   manual and research records are kept');

// Review scenarios: an explicit arms choice must survive every later lookup, not flip to GAMBE.
for (const [name, movement, groups] of [
  ['Kickback', 'BRACCIA', ['BRACCIA']],          // bonus exercise saved with the "Braccia" macro
  ['Kickback', 'TRICIPITI', ['TRICIPITI']],      // program row with muscle group TRICIPITI
  ['Kickback cavo', 'TRICIPITI', ['TRICIPITI']],
  ['Kickback un braccio', 'TRICIPITI', ['TRICIPITI']]
]) {
  p = page();
  for (let round = 0; round < 4; round++) {
    assert.deepEqual(p.groups(name, movement, groups), ['BRACCIA'], name + ' / ' + movement + ' lookup ' + (round + 1));
  }
  const rec = p.record(sandbox.foldExerciseMuscleName(name));
  assert.equal(rec.muscle, 'BRACCIA', name + ' / ' + movement + ' stays remembered as BRACCIA');
  const stats = contribution(name, { movement, muscle_groups: groups, storedMuscle: rec.muscle, storedSource: rec.source });
  assert.deepEqual(stats.primary, ['BRACCIA'], name + ' / ' + movement + ' stats primary');
  assert.ok(!stats.secondary.includes('GAMBE'), name + ' / ' + movement + ' stats secondary');
  console.log('OK  ', (name + ' / ' + movement).padEnd(30), 'stays BRACCIA across lookups and in stats');
}

// Name-only lookups of the same glute kickback stay GAMBE across repeated lookups too.
p = page();
for (let round = 0; round < 4; round++) assert.deepEqual(p.groups('Kickback cavo'), ['GAMBE']);
console.log('OK   "Kickback cavo" stays GAMBE across lookups');

// One name, two contexts: a bonus "Kickback" saved as Braccia and a name-only lookup of
// "Kickback" elsewhere. Whatever order they run in, each keeps its own answer.
p = page();
for (let round = 0; round < 3; round++) {
  assert.deepEqual(p.groups('Kickback', 'BRACCIA', ['BRACCIA']), ['BRACCIA'], 'arms row, round ' + (round + 1));
  assert.deepEqual(p.groups('Kickback'), ['GAMBE'], 'name only, round ' + (round + 1));
}
const last = p.record('kickback');
assert.deepEqual(contribution('Kickback', { movement: 'BRACCIA', muscle_groups: ['BRACCIA'], storedMuscle: last.muscle, storedSource: last.source }).primary, ['BRACCIA']);
assert.deepEqual(contribution('Kickback', { storedMuscle: last.muscle, storedSource: last.source }).primary, ['GAMBE']);
console.log('OK   interleaved arms-row and name-only lookups of "Kickback" never flip each other');

console.log('\nKickback muscle tests passed.');
