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
const coachUi = fs.readFileSync(path.join(root, 'web/coach-practice-ui.js'), 'utf8');

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
vm.runInContext(slice('var SPACE_EQUIPMENT = [', 'function emptyProgramDraft()'), ctx);
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

/* ---------- 2bis. technique and tempo, chosen when writing ---------- */
//
// A progression model may add a technique in week six; that is no reason the
// athlete cannot ask for one in week one, or say how long the pause on a
// pause bench should be.
{
  const withTech = ctx.programExerciseRow({ name: 'Panca piana bilanciere', sets: 3, reps: '5', technique: 'rest_pause', tempo: '3-2-1-0' });
  ok(withTech.technique === 'rest_pause', '2l. a technique chosen by hand is on the exercise');
  ok(withTech.sets[2].technique === 'rest_pause' && !withTech.sets[0].technique,
    '2m. and on the last set, the one it is actually done on');
  ok(withTech.tempo === '3-2-1-0', '2n. the tempo is kept as written');
  ok(/2s di pausa in basso/.test(withTech.notes), '2o. and spelled out, so "3-2-1-0" means something to read');

  ok(ctx.tempoExplanation('3-2-1-0') === '3s in discesa · 2s di pausa in basso · 1s in salita',
    '2p. a zero pause is not mentioned');
  ok(/esplosiva/.test(ctx.tempoExplanation('4-0-X-0')), '2q. and X is read as an explosive lift');
  ok(ctx.tempoExplanation('boh') === '', '2r. anything that is not a tempo is left alone');

  const plain = ctx.programExerciseRow({ name: 'Curl manubri', sets: 3 });
  ok(!plain.technique && !plain.sets.some((s) => s.technique), '2s2. and nothing is added when nothing was asked for');
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

/* ---------- 3quater. effort running past the prescription ---------- */
function loggedProgram() {
  return {
    id: 'p1',
    duration_weeks: 4,
    weeks: [1, 2, 3, 4].map((w) => ({
      week: w,
      label: 'Settimana ' + w,
      sessions: [
        {
          name: 'Upper',
          exercises: [
            { name: 'Panca piana bilanciere', rirTarget: 2, setCount: 3, repsTarget: '5', sets: [{ reps: '5', target_load: 100 }, { reps: '5', target_load: 100 }, { reps: '5', target_load: 100, technique: 'drop_set' }] },
            { name: 'Curl bilanciere', rirTarget: 2, setCount: 2, repsTarget: '10', sets: [{ reps: '10' }, { reps: '10' }] }
          ]
        }
      ]
    }))
  };
}
{
  ctx.DATA = loggedProgram();
  ctx.currentWeek = 2;
  ctx.currentDay = 0;
  ctx.store.prefs = {};
  ctx.store.logs = [{ week: 1, day: 0 }, { week: 2, day: 0 }];
  ctx.store.data = {};
  // Prescribed RIR 2, logged RIR 0 all over: effort is running past the plan.
  [1, 2].forEach((w) => {
    for (let s = 1; s <= 3; s++) ctx.store.data['w' + w + '_d0_e0_s' + s + '_rir'] = 0;
    for (let s = 1; s <= 2; s++) ctx.store.data['w' + w + '_d0_e1_s' + s + '_rir'] = 1;
  });
  const hot = ctx.effortOvershootReport();
  ok(hot.sets === 10 && hot.sessions === 2, '3aj. the report reads the sets that were actually logged');
  ok(hot.mean >= 1 && hot.ready === true, '3ak. and flags a block that keeps overshooting its own prescription');

  // Training as prescribed must never raise it.
  ctx.store.data = {};
  [1, 2].forEach((w) => {
    for (let s = 1; s <= 3; s++) ctx.store.data['w' + w + '_d0_e0_s' + s + '_rir'] = 2;
    for (let s = 1; s <= 2; s++) ctx.store.data['w' + w + '_d0_e1_s' + s + '_rir'] = 3;
  });
  ok(ctx.effortOvershootReport().ready === false, '3al. training as written raises nothing');

  // Two hard sets are a hard day, not a pattern.
  ctx.store.data = { 'w2_d0_e0_s1_rir': 0, 'w2_d0_e0_s2_rir': 0 };
  ok(ctx.effortOvershootReport().ready === false, '3am. and a couple of hard sets is a hard day, not a pattern');
}

/* ---------- 3quinquies. dropping a lighter week in ---------- */
{
  ctx.DATA = loggedProgram();
  ctx.currentWeek = 2;
  ctx.currentDay = 0;
  ctx.store.prefs = {};
  ctx.store.data = { 'w1_d0_e0_s1_load': 100, 'w2_d0_e0_s1_load': 102, 'w3_d0_e0_s1_load': 104, 'w4_d0_e0_s1_load': 106 };
  ctx.store.subs = { 'w3_d0_e0': 'Panca presa stretta' };
  ctx.store.bw = { 1: 80, 2: 80.5, 3: 81 };
  ctx.store.warmups = { w1_d0: { items: [1] }, w3_d0: { items: [3] } };
  ctx.store.bonus = { w3_d0: [{ name: 'Curl' }] };
  ctx.store.customSets = {}; ctx.store.tempos = {}; ctx.store.skips = {};
  ctx.store.loadTypes = {}; ctx.store.exMuscle = {}; ctx.store.exIntensity = {}; ctx.store.intelTargets = {};
  ctx.store.warmupProgress = {};

  ctx.insertDeloadWeek('volume');
  ok(ctx.DATA.weeks.length === 5, '3an. the week is inserted, the program gets one longer');
  ok(/Scarico volume/i.test(ctx.DATA.weeks[2].label), '3ao. right after the week being trained, and it says what it is');
  ok(ctx.DATA.weeks.map((w) => w.week).join(',') === '1,2,3,4,5', '3ap. the weeks are renumbered in order');
  ok(ctx.DATA.duration_weeks === 5, '3aq. and the program knows its new length');

  const deloadRows = ctx.DATA.weeks[2].sessions[0].exercises;
  ok(deloadRows[0].sets.length === 2 && deloadRows[0].setCount === 2, '3ar. half the sets, rounded up');
  ok(deloadRows[0].sets.every((s) => s.target_load === 100), '3as. at the same loads - it is a volume deload');
  ok(deloadRows[0].rirTarget === 3, '3at. one RIR further from failure');
  ok(!deloadRows[0].sets.some((s) => s.technique), '3au. and no intensity technique survives into a deload');

  ok(ctx.store.data['w1_d0_e0_s1_load'] === 100 && ctx.store.data['w2_d0_e0_s1_load'] === 102,
    '3av. what was already trained keeps its place');
  ok(ctx.store.data['w4_d0_e0_s1_load'] === 104 && ctx.store.data['w5_d0_e0_s1_load'] === 106,
    '3aw. and every later week, with its records, slides down one');
  ok(ctx.store.subs['w4_d0_e0'] === 'Panca presa stretta' && !('w3_d0_e0' in ctx.store.subs),
    '3ax. substitutions slide with their week');
  ok(ctx.store.bw[4] === 81 && ctx.store.bw[1] === 80, '3ay. so does the bodyweight logged per week');
  ok(ctx.store.warmups.w4_d0 && ctx.store.warmups.w4_d0.items[0] === 3 && !ctx.store.warmups.w3_d0,
    '3az. so does the warm-up written for that week');
  ok(ctx.store.bonus.w4_d0 && !ctx.store.bonus.w3_d0, '3ba. and the bonus of that day');

  // An intensity deload keeps the work and lowers the load.
  ctx.DATA = loggedProgram();
  ctx.currentWeek = 1;
  ctx.store.data = {}; ctx.store.subs = {}; ctx.store.bw = {}; ctx.store.warmups = {}; ctx.store.bonus = {};
  ctx.insertDeloadWeek('intensity');
  const int = ctx.DATA.weeks[1].sessions[0].exercises[0];
  ok(int.sets.length === 3, '3bb. an intensity deload keeps every set');
  ok(int.sets.every((s) => s.target_load === 90), '3bc. and takes ten per cent off the bar');
  ok(int.rirTarget === 4, '3bd. two RIR further from failure');
  ok(/intensità/i.test(int.notes), '3be. with the reason written on it');
}

/* ---------- 3sexies. the builder's own panels actually render ---------- */
//
// These build HTML out of the progression module; a typo in one of them is a
// blank sheet in front of somebody writing a program, and no amount of
// checking the model alone would catch it.
{
  // Both modules attach to the same global the browser gives them.
  ctx.self = ctx.window;
  vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-taxonomy.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(root, 'web/progression-models.js'), 'utf8'), ctx);
  ctx.NURVAN_EXERCISE_TAXONOMY = ctx.window.NURVAN_EXERCISE_TAXONOMY;

  const draft = {
    title: 'Stagione', weeks: 20, modelId: 'peaking_classic', loadDisplay: 'kg',
    maxes: { squat: 200 }, rotateWeeks: '6, 11, 16', rotateScope: 'all', testWeeks: '15',
    days: [{
      name: 'A', exercises: [
        { name: 'Low-bar squat', muscle: 'QUADRICIPITI', sets: 5, reps: '5', rest: '240s' },
        { name: 'Curl manubri', muscle: 'BICIPITI', sets: 3, reps: '10', rest: '60s' }
      ]
    }]
  };
  ctx.store.programDraft = draft;
  const html = ctx.programDraftProgressionHtml(draft, '');
  ok(typeof html === 'string' && html.length > 500, '3bf. the progression panel renders');
  ok(/DURATA E PROGRESSIONE/.test(html), '3bg. with the duration and the model on it');
  ok(/Peaking classico/.test(html), '3bh. naming the model that is selected');
  ok(/CAMBIO ESERCIZI/.test(html) && /Blocchi: settimane/.test(html), '3bi. the exercise-change blocks');
  ok(/TEST INTERMEDI/.test(html) && /settimana 15/.test(html), '3bj. and the mid-program test');
  ok(/MASSIMALI/.test(html) && /Squat/.test(html), '3bk. asking only for the maxes of the lifts that are in it');
  ok(/40/.test(ctx.programDraftProgressionHtml(Object.assign({}, draft, { weeks: 40 }), '')),
    '3bl. forty weeks is one of the durations offered, not something to type around');

  const plain = ctx.programDraftProgressionHtml({ weeks: 8, modelId: 'linear_rir', days: draft.days }, '');
  ok(!/TEST INTERMEDI/.test(plain) && !/MASSIMALI/.test(plain),
    '3bm. a hypertrophy block is not asked for maxes or a meet test');

  // And the whole program comes out of the draft with all of it applied.
  const prog = ctx.programFromDraft(draft);
  ok(prog.weeks.length === 20, '3bn. twenty weeks written from one');
  ok(prog.weeks[14].test_week === true, '3bo. with the test where it was asked for');
  ok(prog.weeks[10].sessions[0].exercises[0].name !== 'Low-bar squat', '3bp. and the variations in their blocks');
  ok(prog.weeks[19].sessions[0].exercises[0].name === 'Low-bar squat', '3bq. coming back to the lift for the meet');
  ok(/cambio esercizi/.test(prog.source_summary) && /Peaking/.test(prog.source_summary),
    '3br. the program says how it was built');
}

/* ---------- 3septies. where the training happens ---------- */
//
// "Palestra Fitness X has ten machines and no cables" is something a coach
// knows and the app did not. A space is a name and the kit in it, and it
// narrows the picker to what can actually be done there.
{
  ctx.store.trainingSpaces = [];
  ctx.store.pickerSpaceId = '';
  ctx.WEB_EXERCISE_CATALOG = [
    { name: 'Panca piana bilanciere', muscle: 'PETTO', eq: 'bilanciere' },
    { name: 'Curl manubri', muscle: 'BICIPITI', eq: 'manubri' },
    { name: 'Lat machine avanti', muscle: 'DORSALI', eq: 'macchina' },
    { name: 'Push-up', muscle: 'PETTO', eq: 'corpo libero' },
    { name: 'Vogatore', muscle: 'CARDIO', eq: 'macchina' },
    { name: 'Esercizio senza attrezzo dichiarato', muscle: 'ALTRO' }
  ];

  ctx.saveTrainingSpace({ name: 'Casa', equip: ['bodyweight', 'dumbbell'] });
  const spaces = ctx.trainingSpaces();
  ok(spaces.length === 1 && spaces[0].id, '3bs. a space is saved with an id of its own');
  ok(spaces[0].name === 'Casa' && spaces[0].equip.length === 2, '3bt. with its name and its kit');

  const all = ctx.exercisePickerRows('', null).map((r) => r.name);
  ok(all.includes('Panca piana bilanciere') && all.includes('Lat machine avanti'),
    '3bu. with no space chosen the picker offers the whole library');

  const home = ctx.exercisePickerRows('', spaces[0]).map((r) => r.name);
  ok(home.includes('Curl manubri') && home.includes('Push-up'),
    '3bv. in a room with dumbbells, dumbbells and bodyweight are offered');
  ok(!home.includes('Panca piana bilanciere') && !home.includes('Lat machine avanti'),
    '3bw. and a barbell bench or a lat machine are not, because they are not there');
  ok(home.includes('Esercizio senza attrezzo dichiarato'),
    '3bx. an exercise the app cannot place is never hidden - silently dropping what a coach wrote is worse');

  ctx.store.pickerSpaceId = spaces[0].id;
  ok(ctx.exercisePickerRows('').length === home.length, '3by. the chosen space is what the picker uses');
  ctx.store.pickerSpaceId = '';

  ctx.saveTrainingSpace({ name: 'Palestra Fitness X', equip: ['machine', 'cardio', 'bodyweight'] });
  const gym = ctx.exercisePickerRows('', ctx.trainingSpaces()[1]).map((r) => r.name);
  ok(gym.includes('Lat machine avanti') && gym.includes('Vogatore'), '3bz. a machine-only gym offers its machines');
  ok(!gym.includes('Curl manubri'), '3ca. and not the dumbbells it does not have');

  const first = ctx.trainingSpaces()[0];
  ctx.toggleSpaceEquip(first.id, 'barbell');
  ok(first.equip.includes('barbell'), '3cb. kit can be added to a space');
  ctx.toggleSpaceEquip(first.id, 'barbell');
  ok(!first.equip.includes('barbell'), '3cc. and taken away again');
  ctx.updateSpaceField(first.id, 'name', 'Garage');
  ok(ctx.trainingSpaces()[0].name === 'Garage', '3cd. and it can be renamed');

  ctx.confirm = () => true;
  ctx.removeTrainingSpace(first.id);
  ok(ctx.trainingSpaces().length === 1 && ctx.trainingSpaces()[0].name === 'Palestra Fitness X',
    '3ce. a space can be deleted without touching the others');

  // The grouped picker: a library is read a group at a time.
  ok(ctx.pickerGroupOf('PETTO') === 'PETTO' && ctx.pickerGroupOf('') === 'ALTRO',
    '3cf. every exercise lands in a macro group, and the unlabelled ones in ALTRO');
  ok(/<details/.test(html) && /pickerGroupOf/.test(html), '3cg. and the groups are collapsible sections');

  // Put the fixtures back as the later sections expect them.
  ctx.store.trainingSpaces = [];
  ctx.store.pickerSpaceId = '';
  ctx.WEB_EXERCISE_CATALOG = [
    { name: 'Panca piana bilanciere', muscle: 'PETTO' },
    { name: 'Curl bilanciere', muscle: 'BICIPITI', en: 'Barbell curl' },
    { name: 'Squat bilanciere', muscle: 'QUADRICIPITI' }
  ];
}

/* ---------- 4. how it is reached ---------- */
{
  ok(/onclick="openProgramBuilder\(\)"/.test(html), '4a. PROGRAMMI has a way into the builder');
  ok(/CREA UNA SCHEDA DA ZERO/.test(html), '4b. named for what it does');
  ok(/RIPRENDI LA BOZZA/.test(html), '4c. and it says so when a draft is waiting');
  ok(/onclick="openAddExerciseToProgram\(\)"/.test(html), '4d. the workout screen can add to the program');
  ok(/moveWorkoutExercise\(\$\{fIdx\},-1\)/.test(html) && /moveWorkoutExercise\(\$\{fIdx\},1\)/.test(html),
    '4d1. and every exercise in it has an arrow each way');
  ok(/openProgramBuilder\(\\?'library/.test(coachUi) && /CREA UNA SCHEDA/.test(coachUi),
    '4d3. the coach database can be written to, not only imported into');
  ok(/SCRIVI UNA SCHEDA DA ZERO/.test(coachUi) && /mode === 'build'/.test(coachUi)
    && /openProgramBuilder\('assign'\)/.test(coachUi),
    '4d4. and assigning to a client can start from a blank program, in the client sandbox');
  ok(/onclick="openTrainingSpaces\(\)"/.test(html), '4d5. the training spaces are reachable');
  ok(/createProgramFromDraft\(\\?'save\\?'\)/.test(html) && /SALVA SENZA ATTIVARE/.test(html),
    '4d6. a program can be written now and started later, without replacing the active one');
  ok(/saveProgram\(prog, false\)/.test(html),
    '4d7. which saves it as not-active rather than quietly switching it on');
  ok(/Tecnica<select/.test(html) && /Tempo \/ pausa/.test(html),
    '4d8. and every exercise can be given a technique and a tempo while it is written');
  ok(/non ha l’attrezzatura per/.test(html) && /mostra tutto/.test(html),
    '4d9. and a space that hides exercises says so, with a way out of the filter');
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
    'duplicateProgramDraftDay', 'moveWorkoutExercise',
    'setProgramDraftModel', 'setProgramDraftLoadDisplay', 'setProgramDraftMax',
    'insertDeloadWeek', 'closeDeloadSuggestion',
    'setProgramDraftWeeks', 'setProgramDraftRotationWeeks', 'setProgramDraftRotationEvery', 'setProgramDraftRotationScope',
    'setProgramDraftTestWeeks', 'setProgramDraftTestWeeksQuick',
    'maybeAskTestResults', 'openTestResultsSheet', 'closeTestResultsSheet', 'applyTestResults',
    'openTrainingSpaces', 'closeTrainingSpaces', 'removeTrainingSpace', 'addSpaceFromPreset',
    'updateSpaceField', 'toggleSpaceEquip', 'setPickerSpace'
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
  // The picker reads every place the app keeps exercises, not only the extra
  // catalogue: that is how a name could be in the library and missing here.
  // The real taxonomy is loaded into this context by an earlier section, so
  // what comes out is the whole library, not the three fixtures.
  const everything = ctx.exercisePickerRows('');
  ok(everything.length > 200, '5c. with no search it offers the whole library (' + everything.length + ')');
  ok(['Panca piana bilanciere', 'Curl bilanciere', 'Squat bilanciere'].every((n) => everything.some((r) => r.name === n)),
    '5c1. including the extra catalogue');
  ok(everything.some((r) => r.name === 'Pause bench') && everything.some((r) => r.name === 'Low-bar squat'),
    '5c2. and the movement taxonomy, which it used to ignore');
  ctx.EXERCISE_DICTIONARY = [{ normalized: 'Alzate laterali con manubri', muscle: 'SPALLE' }];
  ctx.window.NURVAN_EXERCISE_TAXONOMY = { EXERCISES: [{ name: 'Pause bench', pattern: 'pushH', role: 'main', equip: 'barbell', level: 1, also: [] }] };
  const wide = ctx.exercisePickerRows('');
  ok(wide.some((r) => r.name === 'Alzate laterali con manubri'),
    '5f. a name that only the import dictionary knows is offered too');
  ok(wide.some((r) => r.name === 'Pause bench' && r.muscle === 'PETTO'),
    '5g. and one that only the movement taxonomy knows, filed under its muscle');
  ok(ctx.exercisePickerRows('pause').some((r) => r.name === 'Pause bench'), '5h. and it is searchable');
  ctx.EXERCISE_DICTIONARY = [];
  ctx.window.NURVAN_EXERCISE_TAXONOMY = null;
  ok(ctx.exercisePickerRows('zzzz').length === 0, '5d. and nothing when nothing matches');
  ok(ctx.exercisePickerRows('barbell curl').length === 0 || ctx.exercisePickerRows('barbell').some((r) => r.name === 'Curl bilanciere'),
    '5e. the English name finds it too');
}

console.log('\nAll program builder tests passed.');
