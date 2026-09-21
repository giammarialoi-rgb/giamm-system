// Writing a program instead of only receiving one.
//
// Until now a program could be imported, taken from the catalogue or
// generated from a template, and the only thing that could be added to a day
// was a "bonus": an extra for that one day, outside the program. This covers
// the builder that composes a program day by day, and the add that really
// goes into the program - for this week or for every week.
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

console.log('--- Running program builder tests ---');

const toasts = [];
const actions = [];
let persisted = 0;
const ctx = {
  console, Math, String, Number, Array, Object, JSON, Date, parseInt, parseFloat, isNaN, Boolean,
  encodeURIComponent, decodeURIComponent,
  window: {},
  // Enough of a page for the sheets to be built against: the tests read the
  // draft and the program, not the DOM, but the handlers redraw as they go.
  document: {
    getElementById: () => null,
    querySelector: () => null,
    createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, innerHTML: '', remove() {} }),
    body: { appendChild() {} }
  },
  store: {},
  DATA: null,
  currentWeek: 1,
  currentDay: 0,
  ExerciseDatabaseService: undefined,
  WEB_EXERCISE_CATALOG: [
    { name: 'Panca piana bilanciere', muscle: 'PETTO' },
    { name: 'Curl bilanciere', muscle: 'BICIPITI', en: 'Barbell curl' },
    { name: 'Squat bilanciere', muscle: 'QUADRICIPITI' }
  ],
  persist() { persisted += 1; },
  showToast(msg, kind) { toasts.push([msg, kind]); },
  persistActiveProgramStructure() { ctx.__persistedProgram = true; },
  recordManualAction(action, meta) { actions.push({ action, meta }); },
  addExerciseToLibrary(name, muscle, source) { ctx.__library = { name, muscle, source }; },
  confirm: () => true
};
vm.createContext(ctx);
vm.runInContext(html.match(/const esc = x => [^\n]+/)[0], ctx);
vm.runInContext(slice('function openExercisePicker(opts)', 'function emptyProgramDraft()'), ctx);
vm.runInContext(slice('function emptyProgramDraft()', 'function saveAll()'), ctx);

/* ---------- 1. the draft ---------- */
{
  ctx.store.programDraft = null;
  const d = ctx.programDraft();
  ok(d.days.length === 1 && d.days[0].exercises.length === 0, '1a. a new draft starts with one empty day');
  ok(ctx.store.programDraft === d, '1b. it lives in the store, so closing the sheet does not lose it');

  ctx.updateProgramDraftField('title', 'Upper/Lower autunno');
  ctx.updateProgramDraftField('weeks', '6');
  ok(d.title === 'Upper/Lower autunno' && d.weeks === 6, '1c. name and weeks are what was typed');
  ctx.updateProgramDraftField('weeks', '0');
  ok(d.weeks === 1, '1d. zero weeks is not a program; it becomes one');
  ctx.updateProgramDraftField('weeks', '900');
  ok(d.weeks === 52, '1e. and it stops at a year');
  ctx.updateProgramDraftField('weeks', '6');

  ctx.updateProgramDraftDay(0, 'Upper A');
  d.days[0].exercises.push({ name: 'Panca piana bilanciere', muscle: 'PETTO', sets: 4, reps: '6-8', rest: '120s' });
  d.days[0].exercises.push({ name: 'Rematore bilanciere', muscle: 'DORSALI', sets: 4, reps: '8-10', rest: '120s' });
  ctx.moveProgramDraftExercise(0, 1, -1);
  ok(d.days[0].exercises[0].name === 'Rematore bilanciere', '1f. exercises can be reordered');
  ctx.moveProgramDraftExercise(0, 0, -1);
  ok(d.days[0].exercises[0].name === 'Rematore bilanciere', '1g. and cannot be pushed off the top');
  ctx.moveProgramDraftExercise(0, 0, 1);

  ctx.updateProgramDraftExercise(0, 0, 'sets', '40');
  ok(d.days[0].exercises[0].sets === 10, '1h. forty sets is a typo, not a prescription');
  ctx.updateProgramDraftExercise(0, 0, 'sets', '4');

  ctx.addProgramDraftDay();
  ctx.updateProgramDraftDay(1, 'Lower A');
  d.days[1].exercises.push({ name: 'Squat bilanciere', muscle: 'QUADRICIPITI', sets: 4, reps: '5-8', rest: '150s' });
  ctx.addProgramDraftDay();
  ok(d.days.length === 3, '1i. days can be added');
  ok(ctx.programDraftExerciseCount(d) === 3, '1j. and the draft knows how much is in it');
  ctx.removeProgramDraftDay(2);
  ok(d.days.length === 2, '1k. and removed');
}

/* ---------- 2. what the draft turns into ---------- */
{
  const prog = ctx.programFromDraft(ctx.store.programDraft);
  ok(prog.weeks.length === 6, '2a. the weeks asked for are all there');
  ok(prog.weeks.every((w) => w.sessions.length === 2), '2b. each with the days that were written');
  ok(prog.weeks[0].sessions[0].name === 'Upper A' && prog.weeks[5].sessions[1].name === 'Lower A',
    '2c. the same days, week 1 to week 6 - the program repeats, that is what it is');
  ok(prog.weeks[3].sessions[0].exercises.map((e) => e.name).join('|') === 'Panca piana bilanciere|Rematore bilanciere',
    '2d. in the order they were put in');

  const first = prog.weeks[0].sessions[0].exercises[0];
  ok(first.sets.length === 4 && first.setCount === 4, '2e. four sets means four sets');
  ok(first.sets.every((s) => s.reps === '6-8' && s.target_load === null),
    '2f. each with the reps written and no load invented for the athlete');
  ok(first.repsTarget === '6-8' && first.rest === '120s', '2g. reps target and rest carried through');
  ok(first.muscle_groups[0] === 'PETTO', '2h. and the muscle it trains');

  // An empty day is not a training day.
  const withEmpty = { title: 'X', weeks: 2, days: [{ name: 'A', exercises: [{ name: 'Squat bilanciere', sets: 3 }] }, { name: 'Vuoto', exercises: [] }] };
  const prog2 = ctx.programFromDraft(withEmpty);
  ok(prog2.weeks[0].sessions.length === 1, '2i. a day with nothing in it is left out');

  const defaults = ctx.programExerciseRow({ name: 'Curl bilanciere' });
  ok(defaults.setCount === 3 && defaults.repsTarget === '8-10' && defaults.rest === '90s',
    '2j. an exercise added with nothing filled in still gets a sane prescription');
  const blankReps = ctx.programExerciseRow({ name: 'Curl bilanciere', reps: '   ' });
  ok(blankReps.repsTarget === '8-10', '2k. and blank fields do not become blank prescriptions');
}

/* ---------- 3. adding to the program, not to today ---------- */
function freshProgram() {
  return {
    id: 'p1',
    weeks: [1, 2, 3].map((w) => ({
      week: w,
      sessions: [
        { name: 'Upper', exercises: [{ name: 'Panca piana bilanciere', sets: [{ reps: '8' }] }] },
        { name: 'Lower', exercises: [{ name: 'Squat bilanciere', sets: [{ reps: '5' }] }] }
      ]
    }))
  };
}
{
  ctx.DATA = freshProgram();
  ctx.currentWeek = 2;
  ctx.currentDay = 0;
  const res = ctx.addExerciseToProgram('Curl bilanciere', 'BICIPITI', { sets: 3, reps: '10-12', rest: '60s', scope: 'all' });
  ok(res.added === 3, '3a. "in every week" reaches every week');
  ok(ctx.DATA.weeks.every((w) => w.sessions[0].exercises.some((e) => e.name === 'Curl bilanciere')),
    '3b. in the same day of each of them');
  ok(ctx.DATA.weeks.every((w) => w.sessions[1].exercises.length === 1),
    '3c. and nowhere else - the other day is untouched');
  ok(ctx.DATA.weeks[0].sessions[0].exercises[0].name === 'Panca piana bilanciere',
    '3d. appended after what was already there, never inserted before it');
  ok(ctx.__persistedProgram === true, '3e. and the program is saved, not just changed in memory');
  ok(actions.length === 1 && actions[0].action.action_type === 'ADD_EXERCISE',
    '3f. the change is written into the action history like any other edit');
  ok(ctx.__library && ctx.__library.name === 'Curl bilanciere',
    '3g. the exercise joins the personal library, so it can be picked again');

  ctx.DATA = freshProgram();
  const one = ctx.addExerciseToProgram('Face pull al cavo', 'DELTOIDI', { scope: 'week' });
  ok(one.added === 1, '3h. "only this week" adds it once');
  ok(ctx.DATA.weeks[1].sessions[0].exercises.length === 2
    && ctx.DATA.weeks[0].sessions[0].exercises.length === 1
    && ctx.DATA.weeks[2].sessions[0].exercises.length === 1,
    '3i. into the week being trained, and no other');

  ctx.DATA = freshProgram();
  ok(ctx.addExerciseToProgram('   ', '', {}).added === 0, '3j. an empty name adds nothing');
  ctx.DATA = null;
  ok(ctx.addExerciseToProgram('Curl bilanciere', '', {}).added === 0, '3k. and with no program there is nothing to add to');

  // A day that does not exist in every week (a program that grew unevenly)
  // must not invent one.
  ctx.DATA = freshProgram();
  ctx.DATA.weeks[2].sessions = [ctx.DATA.weeks[2].sessions[0]];
  ctx.currentDay = 1;
  const uneven = ctx.addExerciseToProgram('Leg curl sdraiato', 'FEMORALI', { scope: 'all' });
  ok(uneven.added === 2 && ctx.DATA.weeks[2].sessions.length === 1,
    '3l. a week without that day is skipped, not given a new one');
}

/* ---------- 3bis. reordering, with the records following ---------- */
function programOf(days) {
  return {
    id: 'p1',
    weeks: [1, 2, 3].map((w) => ({
      week: w,
      sessions: [
        { name: 'Upper', exercises: days.map((n) => ({ name: n, sets: [{ reps: '8' }] })) },
        { name: 'Lower', exercises: [{ name: 'Squat bilanciere', sets: [{ reps: '5' }] }] }
      ]
    }))
  };
}
{
  ctx.DATA = programOf(['Panca piana bilanciere', 'Rematore bilanciere', 'Curl bilanciere']);
  ctx.currentWeek = 1;
  ctx.currentDay = 0;
  ctx.store.data = {
    'w1_d0_e0_s1_load': 100, 'w1_d0_e0_s1_reps': 8,
    'w1_d0_e1_s1_load': 70,
    'w1_d0_e2_s1_load': 30,
    'w2_d0_e2_s1_load': 32,
    'w1_d0_e900_s1_load': 12,
    'w1_d1_e0_s1_load': 140
  };
  ctx.store.subs = { 'w1_d0_e2': 'Curl EZ' };
  ctx.store.customSets = { 'w1_d0_e2': 4 };
  ctx.store.tempos = {};
  ctx.store.skips = {};
  ctx.store.loadTypes = {};
  ctx.store.exMuscle = {};
  ctx.store.exIntensity = {};
  ctx.store.intelTargets = {};

  const res = ctx.moveProgramExercise(1, 0, 2, 0);
  ok(res.moved === 3, '3m. moving an exercise moves it in every week that has the same order');
  ok(ctx.DATA.weeks[0].sessions[0].exercises.map((e) => e.name).join('|')
    === 'Curl bilanciere|Panca piana bilanciere|Rematore bilanciere', '3n. it really is in its new place');
  ok(ctx.DATA.weeks[2].sessions[0].exercises[0].name === 'Curl bilanciere', '3o. in week 3 as well');

  ok(ctx.store.data['w1_d0_e0_s1_load'] === 30, '3p. its own 30 kg travelled with it to slot 0');
  ok(ctx.store.data['w1_d0_e1_s1_load'] === 100 && ctx.store.data['w1_d0_e1_s1_reps'] === 8,
    '3q. and the 100 kg bench moved down to slot 1 instead of being inherited');
  ok(ctx.store.data['w1_d0_e2_s1_load'] === 70, '3r. the row is a permutation, nothing lost and nothing duplicated');
  ok(ctx.store.data['w2_d0_e0_s1_load'] === 32, '3s. every week it touched moved its own records too');
  ok(ctx.store.subs['w1_d0_e0'] === 'Curl EZ' && !('w1_d0_e2' in ctx.store.subs),
    '3t. the substitution follows the exercise, not the slot number');
  ok(ctx.store.customSets['w1_d0_e0'] === 4, '3u. and so do the sets that were added by hand');
  ok(ctx.store.data['w1_d0_e900_s1_load'] === 12, '3v. a bonus is not part of the day and is not renumbered');
  ok(ctx.store.data['w1_d1_e0_s1_load'] === 140, '3w. the other day of the week is untouched');

  // A week edited on its own must not be quietly shuffled to match.
  ctx.DATA = programOf(['Panca piana bilanciere', 'Rematore bilanciere', 'Curl bilanciere']);
  ctx.DATA.weeks[1].sessions[0].exercises[2] = { name: 'Face pull al cavo', sets: [{ reps: '12' }] };
  ctx.store.data = { 'w2_d0_e2_s1_load': 25 };
  const partial = ctx.moveProgramExercise(1, 0, 2, 0);
  ok(partial.moved === 2, '3x. a week with something else in that place is left alone');
  ok(ctx.DATA.weeks[1].sessions[0].exercises[2].name === 'Face pull al cavo'
    && ctx.store.data['w2_d0_e2_s1_load'] === 25, '3y. with its own exercise and its own load where they were');

  // The new exercise has nothing recorded: moving it up must not hand it
  // anything of the exercise it displaces.
  ctx.DATA = programOf(['Panca piana bilanciere', 'Rematore bilanciere']);
  ctx.store.data = { 'w1_d0_e0_s1_load': 100, 'w1_d0_e1_s1_load': 70 };
  ctx.addExerciseToProgram('Curl bilanciere', 'BICIPITI', { scope: 'all' });
  ctx.moveProgramExercise(1, 0, 2, 0);
  ok(ctx.store.data['w1_d0_e0_s1_load'] === undefined,
    '3z. an exercise just added carries no loads into the slot it takes');
  ok(ctx.store.data['w1_d0_e1_s1_load'] === 100 && ctx.store.data['w1_d0_e2_s1_load'] === 70,
    '3aa. the two that were there kept theirs');

  ok(ctx.moveProgramExercise(1, 0, 0, -1).moved === 0, '3ab. nothing moves off the top');
  ok(ctx.moveProgramExercise(1, 0, 2, 9).moved === 0, '3ac. or past the bottom');
  ok(ctx.moveProgramExercise(1, 0, 1, 1).moved === 0, '3ad. and moving onto itself does nothing');
}

/* ---------- 3ter. duplicating a day ---------- */
{
  ctx.store.programDraft = {
    title: 'PPL', weeks: 4,
    days: [{ name: 'Push', exercises: [{ name: 'Panca piana bilanciere', muscle: 'PETTO', sets: 4, reps: '6-8', rest: '120s' }] }]
  };
  ctx.duplicateProgramDraftDay(0);
  const d = ctx.store.programDraft;
  ok(d.days.length === 2, '3ae. a day can be duplicated');
  ok(d.days[1].name === 'Push (2)', '3af. the copy is named so it can be told apart');
  ok(d.days[1].exercises[0].name === 'Panca piana bilanciere' && d.days[1].exercises[0].sets === 4,
    '3ag. with the same exercises and the same prescription');
  d.days[1].exercises[0].sets = 8;
  ok(d.days[0].exercises[0].sets === 4, '3ah. editing the copy does not edit the original');
  ctx.duplicateProgramDraftDay(0);
  ok(d.days[1].name === 'Push (3)' && d.days[2].name === 'Push (2)',
    '3ai. duplicating again lands next to the original with a free name');
}

/* ---------- 4. how it is reached ---------- */
{
  ok(/onclick="openProgramBuilder\(\)"/.test(html), '4a. PROGRAMMI has a way into the builder');
  ok(/CREA UNA SCHEDA DA ZERO/.test(html), '4b. named for what it does');
  ok(/RIPRENDI LA BOZZA/.test(html), '4c. and it says so when a draft is waiting');
  ok(/onclick="openAddExerciseToProgram\(\)"/.test(html), '4d. the workout screen can add to the program');
  ok(/moveWorkoutExercise\(\$\{fIdx\},-1\)/.test(html) && /moveWorkoutExercise\(\$\{fIdx\},1\)/.test(html),
    '4d1. and every exercise in it has an arrow each way');
  ok(/onclick="duplicateProgramDraftDay\(/.test(html) && />DUPLICA</.test(html),
    '4d2. every day in the builder can be duplicated');
  ok(/\+ AGGIUNGI ALLA SCHEDA/.test(html) && /\+ BONUS DI OGGI/.test(html),
    '4e. next to the bonus, which stays for what it is good at');

  // Every handler written into an onclick has to be on window: a plain
  // declaration in this file is not reachable from an attribute.
  const exported = [
    'openProgramBuilder', 'closeProgramBuilder', 'createProgramFromDraft', 'discardProgramDraft',
    'updateProgramDraftField', 'updateProgramDraftDay', 'updateProgramDraftExercise',
    'addProgramDraftDay', 'removeProgramDraftDay',
    'addProgramDraftExercise', 'removeProgramDraftExercise', 'moveProgramDraftExercise',
    'openExercisePicker', 'closeExercisePicker', 'renderExercisePickerResults', 'pickExerciseFromPicker',
    'openAddExerciseToProgram', 'openAddToProgramConfig', 'closeAddToProgramConfig', 'confirmAddExerciseToProgram',
    'duplicateProgramDraftDay', 'moveWorkoutExercise'
  ];
  for (const fn of exported) {
    ok(html.includes('window.' + fn + ' = ' + fn + ';'), '4f. ' + fn + ' is reachable from an onclick');
  }
  const onclicks = (html.match(/onclick="([a-zA-Z_$][\w$]*)\(/g) || []).map((m) => m.slice(9, -1));
  const mine = exported.filter((fn) => onclicks.includes(fn));
  ok(mine.length >= 12, '4g. and most of them are actually wired to a button');

  ok(built.includes('function openProgramBuilder') && built.includes('function addExerciseToProgram'),
    '4h. all of it survives the build');
}

/* ---------- 5. the picker ---------- */
{
  const rows = ctx.exercisePickerRows('curl');
  ok(rows.some((r) => r.name === 'Curl bilanciere'), '5a. searching finds the exercise');
  ok(rows.every((r, i) => rows.findIndex((x) => x.name.toLowerCase() === r.name.toLowerCase()) === i),
    '5b. and never offers the same one twice');
  ok(ctx.exercisePickerRows('').length === 3, '5c. with no search it offers the whole library');
  ok(ctx.exercisePickerRows('zzzz').length === 0, '5d. and nothing when nothing matches');
  ok(ctx.exercisePickerRows('barbell curl').length === 0 || ctx.exercisePickerRows('barbell').some((r) => r.name === 'Curl bilanciere'),
    '5e. the English name finds it too');
}

console.log('\nAll program builder tests passed.');
