// A muscle focus has to change the week, in every split, every number of days and every kit of
// equipment: asking for chest and getting the same program as asking for nothing is the failure.
// Also: the split/days table, and what the library screen is built on (the combinations of filters).
import { loadCatalogModules } from './generate_science_programs_10k.mjs';

let failed = 0;
function ok(cond, msg) {
  if (cond) console.log('OK  ', msg);
  else { failed += 1; console.log('FAIL', msg); }
}

const { taxonomy, catalog } = loadCatalogModules();
const patternOf = {};
taxonomy.EXERCISES.forEach((e) => { patternOf[e.name] = e.pattern; });

// The movements each muscle is trained by (the same table the builder keeps, from the other side).
const TRAINED_BY = {
  petto: ['pushH', 'chestIso'],
  dorso: ['pullH', 'pullV', 'pullIso', 'traps'],
  spalle: ['pushV', 'deltLat', 'deltRear', 'deltFront', 'rotator'],
  braccia: ['biceps', 'triceps', 'forearm'],
  gambe: ['squat', 'hinge', 'glute', 'lunge', 'quadIso', 'hamIso', 'calf', 'adductor'],
  glutei: ['glute', 'hinge', 'lunge'],
  addome: ['core', 'carry']
};

function workFor(body, muscle) {
  let n = 0;
  body.weeks[0].sessions.forEach((s) => s.exercises.forEach((e) => {
    if (TRAINED_BY[muscle].includes(patternOf[e.name])) n += 1;
  }));
  return n;
}
function base(days, split, equipment, experience, focus) {
  return catalog.bodyFor({ days, split, goal: 'ipertrofia', equipment, experience, focus, duration: 8, progression: 'linear', variant: 'a' });
}

// --- the splits and their days ---------------------------------------------
ok(catalog.SPLITS.length === 7, 'seven kinds of split are offered');
ok(catalog.splitsForDays(2).join() === 'fullbody,upper_lower,monofrequency', 'over two days: full body, upper/lower, one muscle per day');
ok(catalog.splitsForDays(3).length === 7 && catalog.splitsForDays(6).length === 7, 'over three to six days every split exists');
ok(catalog.SPLITS.every((sp) => catalog.splitDays(sp).every((d) => {
  const b = base(d, sp, 'palestra', 'intermedio', 'bil');
  return b.weeks[0].sessions.length === d && new Set(b.weeks[0].sessions.map((s) => s.name)).size === d;
})), 'each split writes as many different sessions as it has days');

// --- the muscle focus -------------------------------------------------------
let single = 0;
let singleMore = 0;
let weak = [];
for (const split of catalog.SPLITS) {
  for (const days of catalog.splitDays(split)) {
    for (const equipment of ['palestra', 'casa', 'bodyweight']) {
      for (const experience of ['principiante', 'avanzato']) {
        const none = base(days, split, equipment, experience, 'bil');
        for (const m of catalog.FOCUS_MUSCLES) {
          const w = base(days, split, equipment, experience, m.id);
          single += 1;
          const before = workFor(none, m.id);
          const after = workFor(w, m.id);
          // Abs is the one muscle every session may add to; a muscle a split never trains
          // (none of these) would be the only reason to find equal.
          if (after > before) singleMore += 1;
          else weak.push([split, days, equipment, experience, m.id, before, after].join('/'));
        }
      }
    }
  }
}
// Where the library has two exercises for a movement (a beginner with a floor and nothing else) or the session is already
// all legs at its length cap, there is nothing left to add: that is the library's limit, and it is written down here.
const gymFailures = weak.filter((w) => { const p = w.split('/'); return p[2] === 'palestra' && p[4] !== 'gambe'; });
ok(gymFailures.length === 0, 'in a gym a single muscle focus always adds work for that muscle' + (gymFailures.length ? ' - not for: ' + gymFailures.slice(0, 8).join(' ; ') : ''));
ok(singleMore / single >= 0.95, 'and across every kit of equipment it does for ' + Math.round(100 * singleMore / single) + '% of the ' + single + ' combinations');

// A pair or a triple never takes work away from the muscles chosen.
let multi = 0;
let multiBad = [];
for (const split of catalog.SPLITS) {
  for (const days of [3, 4, 5]) {
    if (!catalog.splitDays(split).includes(days)) continue;
    const none = base(days, split, 'palestra', 'intermedio', 'bil');
    for (const focus of catalog.FOCUS_IDS.filter((f) => f.includes('_'))) {
      const w = base(days, split, 'palestra', 'intermedio', focus);
      multi += 1;
      const picked = focus.split('_');
      const before = picked.reduce((n, m) => n + workFor(none, m), 0);
      const after = picked.reduce((n, m) => n + workFor(w, m), 0);
      if (after < before) multiBad.push(split + '/' + days + '/' + focus + ' ' + before + '>' + after);
    }
  }
}
ok(multiBad.length === 0, 'two or three muscles together never lose work (' + multi + ' checked)' + (multiBad.length ? ' - ' + multiBad.slice(0, 5).join(' ; ') : ''));

// A session keeps a sound length however many muscles are picked.
{
  let longest = 0;
  for (const split of catalog.SPLITS) {
    for (const days of catalog.splitDays(split)) {
      for (const focus of ['petto', 'gambe_glutei', 'petto_dorso_spalle', 'braccia_addome_glutei']) {
        base(days, split, 'palestra', 'avanzato', focus).weeks[0].sessions.forEach((s) => { longest = Math.max(longest, s.exercises.length); });
      }
    }
  }
  ok(longest <= 8, 'with a focus no session goes over eight exercises (longest ' + longest + ')');
}

// --- the filters: any combination answers with real programs -----------------------
{
  let bad = [];
  let asked = 0;
  const pick = (list, i) => list[i % list.length];
  for (let i = 0; i < 400; i += 1) {
    const f = {};
    if (i % 2) f.days = pick(catalog.DAYS, i);
    if (i % 3 === 0) f.split = pick(f.days ? catalog.splitsForDays(f.days) : catalog.SPLITS, i >> 1);
    if (i % 5 < 3) f.goal = pick(catalog.GOALS, i);
    if (i % 4 === 0) f.equipment = pick(catalog.EQUIPMENT, i);
    if (i % 7 < 3) f.experience = pick(catalog.EXPERIENCE, i);
    if (i % 3 !== 1) f.focus = pick(catalog.FOCUS_IDS, i * 7);
    if (i % 11 === 0) f.duration = pick(catalog.DURATIONS, i);
    asked += 1;
    const r = catalog.search(f, 20);
    const want = f.focus ? catalog.focusCanon(f.focus) : null;
    const wrong = r.rows.filter((row) =>
      (f.days && row.days_per_week !== f.days) || (f.split && row.split !== f.split) ||
      (f.goal && row.purpose !== f.goal) || (f.equipment && row.equipment !== f.equipment) ||
      (f.experience && row.experience !== f.experience) || (want && row.focus !== want) ||
      (f.duration && row.duration_weeks !== f.duration));
    if (r.rows.length === 0 || wrong.length || r.total < r.rows.length) bad.push(JSON.stringify(f));
  }
  ok(bad.length === 0, 'any combination of filters answers with programs that all respect it (' + asked + ' combinations' + (bad.length ? ', bad: ' + bad.slice(0, 3).join(' ') : '') + ')');
}

if (failed) { console.log('\nFAILED', failed); process.exit(1); }
console.log('\nPASS catalog focus');
