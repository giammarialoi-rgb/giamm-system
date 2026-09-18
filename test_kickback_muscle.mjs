// Runs the real muscle heuristics and stats pipeline (web/training-analytics-engine.js)
// and the real page functions that resolve and remember an exercise's muscle (cut out
// of web/index.base.html), and asserts what they return. Nothing here string-matches
// the source.
//
// Guards the kickback mix-up: a bare "kickback" hint sat in the triceps row, so glute
// kickbacks ("Kickback cavo", "Kickback al Cavo", "Kickback elastico"...) were counted
// as BRACCIA in stats, and the page remembered that guess per name. A kickback's muscle
// now comes from its own row: that slot's choice, its movement and muscle groups, then
// its wording. A muscle remembered for the name counts only if the user set it by hand.
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
  sourceOf('primaryExerciseMuscle'),
  sourceOf('resolveExerciseMacroGroups'),
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
function label(name, meta) { return JSON.stringify(name) + (meta ? ' ' + JSON.stringify(meta) : ''); }
function expectGlute(name, meta) {
  const c = contribution(name, meta);
  assert.deepEqual(c.primary, ['GAMBE'], label(name, meta) + ' primary');
  assert.ok(!c.secondary.includes('BRACCIA'), label(name, meta) + ' must not pick up BRACCIA as secondary');
  console.log('OK  ', label(name, meta).padEnd(30), 'GAMBE');
}
function expectTriceps(name, meta) {
  const c = contribution(name, meta);
  assert.deepEqual(c.primary, ['BRACCIA'], label(name, meta) + ' primary');
  assert.ok(!c.secondary.includes('GAMBE'), label(name, meta) + ' must not pick up GAMBE as secondary');
  console.log('OK  ', label(name, meta).padEnd(30), 'BRACCIA');
}

['Kickback cavo', 'Kickback al Cavo', 'Kickback', 'Kickback ai cavi', 'Kickback elastico',
  'Cable kickback', 'Cable Kickback', 'Glute kickback', 'Kickback glutei', 'Kickback cavo glutei',
  'kickback cavo'].forEach((n) => expectGlute(n));

// A name that says glutes stays glutes, whatever equipment or arm position it names.
['Glute kickback con manubrio', 'Kickback gluteo con manubrio', 'Glutes kickback with dumbbell', 'Glutes DB kickback',
  'Gluteus kickback dumbbell', 'Kickback gluteo braccio teso'].forEach((n) => expectGlute(n));

// "avambracci" (forearms, the donkey kickback's support) is not an arm word.
['Donkey kickback sugli avambracci', 'Kickback sugli avambracci', 'Kickback in quadrupedia (appoggio sugli avambracci)'].forEach((n) => expectGlute(n));

['Kickback tricipiti', 'Kickback cavo tricipiti', 'Triceps kickback', 'Cable triceps kickback',
  'Kickback tricipiti ai cavi', 'Tricep kickback'].forEach((n) => expectTriceps(n));

// The dumbbell kickback is the triceps exercise (confirmed by the product owner).
['Kickback manubri', 'Dumbbell kickback'].forEach((n) => expectTriceps(n));

// Arm words don't make a kickback the triceps one: glute kickbacks use them too.
['Kickback braccia', 'Kickback un braccio', 'Single arm kickback', 'Kickback in quadrupedia (braccia tese) 3x15',
  'Donkey kickback a braccia distese', 'Quadruped kickback, straight arms', 'Donkey kickback (arms extended)'].forEach((n) => expectGlute(n));

// The row's own movement or muscle groups decide, and a kickback never counts for both.
expectTriceps('Kickback', { movement: 'Tricipiti' });
expectTriceps('Kickback', { movement: 'BRACCIA' });
expectTriceps('Kickback', { movement: 'Braccia' });
expectGlute('Kickback', { movement: 'Braccia tese' });
expectTriceps('Kickback', { movement: 'BRACCIA', muscle_groups: ['BRACCIA'] });
expectTriceps('Kickback cavo', { movement: 'TRICIPITI', muscle_groups: ['TRICIPITI'] });
expectTriceps('Kickback', { muscle_groups: ['TRICIPITI'] });
expectTriceps('Kickback', { muscle_group: 'TRICIPITI', muscle_groups: ['TRICIPITI'], movement: 'Isolamento' });
expectTriceps('Kickback', { storedMuscle: 'BRACCIA', storedSource: 'manual' });
expectTriceps('Kickback', { storedMuscle: 'BRACCIA', storedSource: 'slot' });
expectGlute('Kickback manubri', { muscle_groups: ['GLUTEI'] });

// Neighbours of the rows that changed stay as they were.
assert.deepEqual(contribution('French press').primary, ['BRACCIA']);
assert.deepEqual(contribution('French press', { muscle_groups: ['PETTO'] }), { primary: ['PETTO'], secondary: ['BRACCIA'] });
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

// --- remembered muscles, as the stats read them ---------------------------
const rec = (s, name, eK) => plain(TAE.storedMuscleRecord(s, name, eK));
const named = (muscle, source) => ({ exMuscle: {}, exMuscleByName: { kickback: { muscle, source, at: 1 } } });
for (const source of ['triangulated', 'name', 'slot', 'research', 'encyclopedia', 'bonus', 'replace', undefined]) {
  assert.equal(rec(named('BRACCIA', source), 'Kickback', 'w1_d0_e0'), null, 'a by-name ' + source + ' record is not used for a kickback');
}
assert.equal(rec({ exMuscle: {}, exMuscleByName: { kickback: 'BRACCIA' } }, 'Kickback', 'w1_d0_e0'), null, 'a legacy string record is not used for a kickback');
assert.deepEqual(rec(named('BRACCIA', 'manual'), 'Kickback', 'w1_d0_e0'), { muscle: 'BRACCIA', source: 'manual' }, 'a manual record is used');
assert.deepEqual(rec({ exMuscle: { w1_d0_e0: 'BRACCIA' }, exMuscleByName: {} }, 'Kickback', 'w1_d0_e0'), { muscle: 'BRACCIA', source: 'slot' }, 'the slot\'s own choice is used');
assert.deepEqual(rec({ exMuscle: {}, exMuscleByName: { 'french press': { muscle: 'PETTO', source: 'triangulated' } } }, 'French press', 'w1_d0_e0'),
  { muscle: 'PETTO', source: 'triangulated' }, 'records for other exercises are used as before');
console.log('OK   stats use only manual by-name records and the slot\'s own choice for kickbacks');

// --- the stats pipeline end to end ----------------------------------------
function logged(sets) {
  const data = {};
  sets.forEach(([eK, n]) => { for (let s = 1; s <= n; s++) { data[eK + '_s' + s + '_load'] = 10; data[eK + '_s' + s + '_reps'] = 12; } });
  return data;
}
function statsByMuscle(storeState, program) {
  const s = Object.assign({ subs: {}, skips: {}, prefs: { intensityType: 'RIR' } }, storeState);
  return plain(TAE.buildByMuscle(TAE.normalizeSets(s, program, {}))).map((m) => [m.id, m.directSets, m.indirectSets]).sort();
}
// Two rows called "Kickback": the first set to arms on its slot, the second a glute row.
// A stale by-name record left from the old rules must not matter either.
const twoKickbacks = { weeks: [{ sessions: [{ exercises: [{ name: 'Kickback' }] }, { exercises: [{ name: 'Kickback' }] }] }] };
for (const byName of [{}, { kickback: { muscle: 'BRACCIA', source: 'slot', at: 1 } }, { kickback: { muscle: 'BRACCIA', source: 'triangulated', at: 1 } }]) {
  assert.deepEqual(statsByMuscle({ data: logged([['w1_d0_e0', 3], ['w1_d1_e0', 3]]), exMuscle: { w1_d0_e0: 'BRACCIA' }, exMuscleByName: byName }, twoKickbacks),
    [['BRACCIA', 3, 0], ['GAMBE', 3, 0]], 'slot row counts arms, glute row counts legs, with by-name record ' + JSON.stringify(byName));
}
// A slot replaced by "Kickback" and set to arms keeps the original row's movement.
const pushdownRow = { weeks: [{ sessions: [{ exercises: [{ name: 'Pushdown corda', movement: 'Pushdown corda' }] }] }] };
assert.deepEqual(statsByMuscle({ data: logged([['w1_d0_e0', 2]]), subs: { w1_d0_e0: 'Kickback' }, exMuscle: { w1_d0_e0: 'BRACCIA' },
  exMuscleByName: { kickback: { muscle: 'BRACCIA', source: 'manual', at: 1 } }, skips: {}, prefs: { intensityType: 'RIR' } }, pushdownRow),
[['BRACCIA', 2, 0]], 'an arms choice counts no half set to legs');
console.log('OK   normalizeSets + buildByMuscle: each kickback row counts for its own muscle only');

// --- page: lookups and remembering -----------------------------------------
function page(byName, exMuscle) {
  sandbox.setStore({ exMuscleByName: JSON.parse(JSON.stringify(byName || {})), exMuscle: exMuscle || {} });
  return {
    groups: (name, movement, groups) => plain(sandbox.getExerciseMuscleGroups(name, movement || '', groups || [])),
    slot: (name, eK) => plain(sandbox.resolveExerciseMacroGroups(name, '', [], eK)),
    record: (key) => plain(sandbox.getStore().exMuscleByName[key] || null)
  };
}

let p = page();
assert.deepEqual(p.groups('Kickback al Cavo'), ['GAMBE']);
console.log('OK   getExerciseMuscleGroups("Kickback al Cavo") -> GAMBE');

// Old or relabelled by-name records never decide a kickback, however many lookups run.
for (const source of ['triangulated', 'name', 'slot', 'research', 'encyclopedia', 'bonus']) {
  p = page({ 'kickback cavo': { muscle: 'BRACCIA', source, at: 1 } });
  for (let round = 0; round < 3; round++) assert.deepEqual(p.groups('Kickback cavo'), ['GAMBE'], source + ' record, lookup ' + (round + 1));
}
console.log('OK   by-name triangulated/name/slot/research/encyclopedia/bonus records never decide a kickback');

p = page({ 'kickback al cavo': { muscle: 'BRACCIA', source: 'manual', at: 1 } });
for (let round = 0; round < 3; round++) assert.deepEqual(p.groups('Kickback al Cavo'), ['BRACCIA'], 'a manual choice wins, lookup ' + (round + 1));
assert.deepEqual(p.record('kickback al cavo'), { muscle: 'BRACCIA', source: 'manual', at: 1 }, 'and is never rewritten');
console.log('OK   a manual choice for the name wins and is kept');

// An explicit arms row never flips, however often it is looked up.
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
  console.log('OK  ', (name + ' / ' + movement).padEnd(30), 'stays BRACCIA across lookups');
}

// One name, several rows, any order: a slot set to arms, a glute row, a bonus row saved as
// Braccia and name-only lookups never change each other's answer.
p = page({}, { w1_d0_e0: 'BRACCIA' });
const order = ['slotA', 'rowB', 'rowB', 'bonus', 'rowB', 'slotA', 'nameOnly', 'slotA', 'rowB', 'bonus', 'nameOnly', 'rowB'];
for (const step of order) {
  if (step === 'slotA') assert.deepEqual(p.slot('Kickback', 'w1_d0_e0'), ['BRACCIA'], 'slot set to arms');
  if (step === 'rowB') assert.deepEqual(p.slot('Kickback', 'w1_d1_e0'), ['GAMBE'], 'glute row without a slot choice');
  if (step === 'bonus') assert.deepEqual(p.groups('Kickback', 'BRACCIA', ['BRACCIA']), ['BRACCIA'], 'bonus row saved as Braccia');
  if (step === 'nameOnly') assert.deepEqual(p.groups('Kickback'), ['GAMBE'], 'name-only lookup');
}
console.log('OK   interleaved slot, glute, bonus and name-only lookups of "Kickback" never flip each other');

console.log('\nKickback muscle tests passed.');
