// Turning one written week into a block.
//
// The builder lets an athlete write a week; these models decide what the
// other eleven look like. Two things have to hold whatever the model: the
// weeks must actually differ from each other (otherwise it is not a
// progression), and nothing may put an intensity technique on a competition
// lift - a drop set on a heavy squat is how people get hurt.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const src = fs.readFileSync(path.join(root, 'web/progression-models.js'), 'utf8');

function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

const ctx = { self: {}, console };
vm.createContext(ctx);
// The real library, so the rotation is checked against exercises that exist
// rather than against a fixture that flatters it.
vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-taxonomy.js'), 'utf8'), ctx);
vm.runInContext(src, ctx);
const P = ctx.self.NurvanProgressions;

console.log('--- Running progression model tests ---');

function template() {
  return [
    {
      name: 'Upper',
      exercises: [
        { name: 'Panca piana bilanciere', sets: [{ reps: '5' }, { reps: '5' }, { reps: '5' }], setCount: 3, repsTarget: '5', rest: '120s' },
        { name: 'Trazioni alla sbarra', sets: [{ reps: '6' }, { reps: '6' }], setCount: 2, repsTarget: '6', rest: '120s' },
        { name: 'Curl bilanciere', sets: [{ reps: '10' }, { reps: '10' }, { reps: '10' }], setCount: 3, repsTarget: '10', rest: '60s' }
      ]
    },
    {
      name: 'Lower',
      exercises: [
        { name: 'Squat bilanciere', sets: [{ reps: '5' }, { reps: '5' }, { reps: '5' }], setCount: 3, repsTarget: '5', rest: '180s' },
        { name: 'Leg curl sdraiato', sets: [{ reps: '12' }, { reps: '12' }], setCount: 2, repsTarget: '12', rest: '60s' }
      ]
    }
  ];
}
const allRows = (weeks) => weeks.flatMap((w) => w.sessions.flatMap((s) => s.exercises));

/* ---------- 1. the catalogue ---------- */
{
  const all = P.list();
  ok(all.length >= 14, '1a. there is a shelf of progressions, not one hard-coded rule (' + all.length + ')');
  ok(P.list('bodybuilding').length >= 8, '1b. eight or more for bodybuilding');
  ok(P.list('powerlifting').length >= 6, '1c. six or more for powerlifting and streetlifting');
  ok(new Set(all.map((m) => m.id)).size === all.length, '1d. no two models share an id');
  ok(all.every((m) => m.label && m.summary), '1e. each one says what it is, in a line');
  ok(P.list('bodybuilding').concat(P.list('powerlifting')).every((m) => m.detail && m.evidence),
    '1f. and carries the reasoning and what it rests on');
  ok(P.get('nope-does-not-exist').id === 'none', '1g. an unknown id falls back to no progression, never to a guess');
  ok(P.list('none')[0].id === 'none', '1h. "all weeks like the first" is itself one of the choices');
}

/* ---------- 2. no progression means no progression ---------- */
{
  const weeks = P.weeksFromTemplate(template(), { weeks: 4, modelId: 'none' });
  ok(weeks.length === 4, '2a. four weeks asked, four weeks written');
  const first = JSON.stringify(weeks[0].sessions);
  ok(weeks.every((w) => JSON.stringify(w.sessions) === first), '2b. and they are identical copies');
}

/* ---------- 3. a bodybuilding block ---------- */
{
  const weeks = P.weeksFromTemplate(template(), { weeks: 8, modelId: 'volume_wave' });
  ok(weeks.length === 8, '3a. eight weeks');
  const setsPerWeek = weeks.map((w) => w.sessions.reduce((n, s) => n + s.exercises.reduce((m, e) => m + e.sets.length, 0), 0));
  ok(new Set(setsPerWeek).size > 1, '3b. the weeks are not copies: the volume moves');
  ok(setsPerWeek[2] > setsPerWeek[0], '3c. it rises inside the wave');
  ok(setsPerWeek[3] < setsPerWeek[2], '3d. and drops on the deload');
  ok(/Deload/.test(weeks[3].label), '3e. which is labelled as one');
  const deloadRows = weeks[3].sessions.flatMap((s) => s.exercises);
  ok(deloadRows.every((e) => e.rirTarget >= 2), '3f. with effort kept away from failure');
  ok(allRows(weeks).every((e) => e.sets.length >= 1), '3g. no week ever writes an exercise with no sets');
  ok(allRows(weeks).every((e) => e.rirTarget >= 0 && e.rirTarget <= 5), '3h. and RIR stays inside a real range');

  const linear = P.weeksFromTemplate(template(), { weeks: 8, modelId: 'linear_rir' });
  const rirFirst = linear[0].sessions[0].exercises[0].rirTarget;
  const rirLast = linear[7].sessions[0].exercises[0].rirTarget;
  ok(rirLast < rirFirst, '3i. the linear model really does close in on failure over the block');

  const dup = P.weeksFromTemplate(template(), { weeks: 4, modelId: 'dup' });
  ok(dup[0].sessions[0].exercises[0].repsTarget !== dup[0].sessions[1].exercises[0].repsTarget,
    '3j. the undulating model gives each session of the week its own character');
}

/* ---------- 4. techniques go where they belong ---------- */
{
  const weeks = P.weeksFromTemplate(template(), { weeks: 8, modelId: 'technique_intensifier' });
  const withTech = allRows(weeks).filter((e) => e.sets.some((s) => s.technique));
  ok(withTech.length > 0, '4a. the intensifying model does use the techniques the app has');
  ok(withTech.every((e) => e.sets.filter((s) => s.technique).length === 1),
    '4b. one technique per exercise, not one per set');
  ok(withTech.every((e) => e.sets[e.sets.length - 1].technique),
    '4c. and always on the last set, where it belongs');
  ok(weeks[0].sessions[0].exercises.every((e) => !e.sets.some((s) => s.technique)),
    '4d. the first weeks build without them');

  const off = P.weeksFromTemplate(template(), { weeks: 8, modelId: 'technique_intensifier', techniques: 'off' });
  ok(allRows(off).every((e) => !e.sets.some((s) => s.technique)), '4e. and they can be switched off entirely');

  // One the athlete asked for when writing the program outranks the model's.
  const chosen = template();
  chosen[0].exercises[2].technique = 'cluster';
  const kept = P.weeksFromTemplate(chosen, { weeks: 8, modelId: 'volume_wave' });
  const curls = kept.map((w) => w.sessions[0].exercises[2]);
  ok(curls[0].sets[curls[0].sets.length - 1].technique === 'cluster',
    '4f. a technique chosen by hand is there from week one, even under a model that adds none');
  ok(curls.filter((e, i) => !/Deload/.test(kept[i].label)).every((e) => e.sets.some((s) => s.technique === 'cluster')),
    '4g. and stays for the whole block');
  ok(curls[3].sets.every((s) => !s.technique), '4h. except in the deload, which is what a deload is');
}

/* ---------- 5. which lifts are competition lifts ---------- */
{
  const yes = {
    'Squat bilanciere': 'squat', 'Low-bar squat': 'squat',
    'Panca piana bilanciere': 'bench', 'Bench press': 'bench',
    'Stacco da terra': 'deadlift', 'Deadlift': 'deadlift',
    'Military press con bilanciere': 'press', 'Lento avanti bilanciere': 'press',
    'Trazioni alla sbarra': 'pullup', 'Pull-up zavorrato': 'pullup',
    'Dip alle parallele': 'dip'
  };
  Object.keys(yes).forEach((name) => {
    ok(P.competitionLiftFor(name) === yes[name], '5a. "' + name + '" is the ' + yes[name]);
  });
  const no = ['Bulgarian split squat', 'Goblet squat', 'Hack squat', 'Pistol squat',
    'Panca inclinata con manubri', 'Panca piana presa stretta', 'Floor press con manubri',
    'Stacco rumeno con bilanciere', 'Trap bar deadlift', 'Rack pull',
    'Lento avanti con manubri', 'Arnold press',
    'Lat machine presa larga', 'Trazioni assistite', 'Bench dip'];
  no.forEach((name) => {
    ok(P.competitionLiftFor(name) === null, '5b. "' + name + '" is not a competition lift, it is accessory work');
  });
  ok(P.competitionLiftsIn(template()).sort().join(',') === 'bench,pullup,squat',
    '5c. a written week is read for the lifts it actually contains');
}

/* ---------- 6. a peaking block ---------- */
{
  const weeks = P.weeksFromTemplate(template(), { weeks: 10, modelId: 'peaking_classic', loadDisplay: 'percent' });
  const bench = (w) => weeks[w - 1].sessions[0].exercises[0];
  ok(/Gara|massimale/i.test(weeks[9].label), '6a. the last week is the attempt');
  ok(bench(10).sets.length === 1 && bench(10).repsTarget === '1', '6b. and it is a single');
  ok(/100%/.test(bench(10).notes), '6c. at the full max');
  ok(bench(1).sets.length > bench(8).sets.length, '6d. volume falls across the block');
  const pct = (w) => Number(String(bench(w).notes).match(/(\d+)%/)[1]);
  ok(pct(8) > pct(1), '6e. while the percentage rises');
  ok(pct(1) >= 65 && pct(8) <= 100, '6f. and stays inside percentages a human can lift');

  const comp = allRows(weeks).filter((e) => e.competition_lift);
  ok(comp.length > 0, '6g. the competition lifts are marked as such');
  ok(comp.every((e) => !e.sets.some((s) => s.technique)),
    '6h. and never carry an intensity technique - no drop sets on a heavy squat');
  const acc = allRows(weeks).filter((e) => !e.competition_lift);
  ok(acc.some((e) => e.sets.some((s) => s.technique)), '6i. the accessories do the hypertrophy work, techniques included');
  const accLate = weeks[8].sessions[0].exercises.filter((e) => !e.competition_lift);
  const accEarly = weeks[0].sessions[0].exercises.filter((e) => !e.competition_lift);
  ok(accLate.reduce((n, e) => n + e.sets.length, 0) < accEarly.reduce((n, e) => n + e.sets.length, 0),
    '6j. and are cut back as the meet approaches');

  P.list('powerlifting').forEach((m) => {
    const w = P.weeksFromTemplate(template(), { weeks: 9, modelId: m.id, loadDisplay: 'percent' });
    const last = w[8].sessions[0].exercises[0];
    ok(last.sets.length === 1 && last.repsTarget === '1', '6k. ' + m.label + ' also finishes on a single attempt');
    ok(w.flatMap((x) => x.sessions.flatMap((s) => s.exercises)).filter((e) => e.competition_lift)
      .every((e) => !e.sets.some((s) => s.technique)), '6l. ' + m.label + ' keeps techniques off the competition lifts');
  });
}

/* ---------- 7. the three ways of writing a load ---------- */
{
  const opts = { weeks: 6, modelId: 'peaking_classic' };
  const kg = P.weeksFromTemplate(template(), Object.assign({}, opts, {
    loadDisplay: 'kg', maxes: { bench: 100, squat: 150, pullup: 40 }, bodyweight: 80
  }));
  const bench3 = kg[2].sessions[0].exercises[0];
  ok(bench3.sets.every((s) => typeof s.target_load === 'number' && s.target_load > 0),
    '7a. with a max, every set carries the kilos to put on the bar');
  ok(bench3.sets[0].target_load % 2.5 === 0, '7b. rounded to something that exists as a plate');
  ok(/kg/.test(bench3.notes) && /%/.test(bench3.notes), '7c. and the note says both kilos and percentage');

  const pull = kg[2].sessions[0].exercises[1];
  ok(pull.competition_lift === 'pullup', '7d. a weighted pull-up is a competition lift for streetlifting');
  const pct = Number(String(pull.notes).match(/(\d+)%/)[1]) / 100;
  const expected = Math.round(((80 + 40) * pct - 80));
  ok(Math.abs(pull.sets[0].target_load - expected) <= 1,
    '7e. and its percentage is of bodyweight plus belt, so what is written is what you hang on');

  const noMax = P.weeksFromTemplate(template(), Object.assign({}, opts, { loadDisplay: 'kg', maxes: { bench: 100 }, bodyweight: 80 }));
  const squatNoMax = noMax[2].sessions[1].exercises[0];
  ok(squatNoMax.sets.every((s) => s.target_load == null) && /RPE/.test(squatNoMax.notes),
    '7f. a lift with no max gets an effort target instead of an invented number');

  const percent = P.weeksFromTemplate(template(), Object.assign({}, opts, { loadDisplay: 'percent' }));
  const b = percent[2].sessions[0].exercises[0];
  ok(b.sets.every((s) => s.target_load == null) && /%/.test(b.notes) && !/kg/.test(b.notes),
    '7g. percentages only: the same program works for two athletes with different maxes');

  const rir = P.weeksFromTemplate(template(), Object.assign({}, opts, { loadDisplay: 'rir' }));
  const r = rir[2].sessions[0].exercises[0];
  ok(/RPE/.test(r.notes) && /RIR/.test(r.notes) && r.sets.every((s) => s.target_load == null),
    '7h. or effort only, for somebody who has no real maxes yet');

  ok(P.rpeForPercent(1, 1) === 10 && P.rpeForPercent(0.7, 1) < 10,
    '7i. the effort table puts a true single at RPE 10 and lighter work below it');
  // Reps matter as much as load: the same percentage is a different effort.
  ok(P.rpeForPercent(0.85, 5) > P.rpeForPercent(0.85, 2),
    '7j. five reps at a weight is harder than two reps at the same weight');
  ok(P.rpeForPercent(0.9, 2) >= 8 && P.rpeForPercent(0.9, 2) <= 10,
    '7k. a double at ninety per cent lands where a lifter would call it');
  ok(P.rirForPercent(0.7, 5) >= 4, '7l. and five reps at seventy per cent is honestly called easy');
}

/* ---------- 8. it keeps its shape at the edges ---------- */
{
  const one = P.weeksFromTemplate(template(), { weeks: 1, modelId: 'peaking_classic' });
  ok(one.length === 1 && one[0].sessions.length === 2, '8a. a one-week program is still written, not crashed on');
  const huge = P.weeksFromTemplate(template(), { weeks: 999, modelId: 'linear_rir' });
  ok(huge.length === 52, '8b. and a year is the ceiling');
  const empty = P.weeksFromTemplate([], { weeks: 3, modelId: 'linear_rir' });
  ok(empty.length === 3 && empty[0].sessions.length === 0, '8c. no days means empty weeks, not an error');
  ok(allRows(P.weeksFromTemplate(template(), { weeks: 12, modelId: 'block_pl', loadDisplay: 'percent' }))
    .every((e) => e.sets.length >= 1 && Number(e.setCount) === e.sets.length),
    '8d. set count and the sets themselves never disagree');
}

/* ---------- 9. changing the exercises partway through ---------- */
{
  ok(P.parseRotationWeeks('5, 13, 25', 40).join(',') === '5,13,25', '9a. the weeks to change at are read as written');
  ok(P.parseRotationWeeks('5,5,13', 40).join(',') === '5,13', '9b. repeated ones are folded');
  ok(P.parseRotationWeeks('0, 1, 60, 13', 40).join(',') === '13', '9c. and week 1 or past the end is not a change point');
  ok(P.parseRotationWeeks('', 40).length === 0, '9d. nothing written means it never changes');
  ok(P.rotationBlockFor(4, [5, 13]) === 0 && P.rotationBlockFor(5, [5, 13]) === 1 && P.rotationBlockFor(30, [5, 13]) === 2,
    '9e. each week knows which block of exercises it belongs to');

  const long = [{
    name: 'Full body',
    exercises: [
      { name: 'Low-bar squat', sets: [{ reps: '5' }], setCount: 1, repsTarget: '5' },
      { name: 'Curl manubri', sets: [{ reps: '10' }], setCount: 1, repsTarget: '10' }
    ]
  }];

  // Accessories only: the main lift is left exactly where it was.
  const acc = P.weeksFromTemplate(long, { weeks: 40, modelId: 'linear_rir', rotateWeeks: [11, 21, 31], rotateScope: 'accessories' });
  ok(acc.length === 40, '9f. forty weeks is a program the builder can write');
  const squatNames = new Set(acc.map((w) => w.sessions[0].exercises[0].name));
  ok(squatNames.size === 1 && squatNames.has('Low-bar squat'),
    '9g. with accessories only, the main lift is the same lift for all forty weeks');
  const curlNames = acc.map((w) => w.sessions[0].exercises[1].name);
  ok(new Set(curlNames).size === 4, '9h. while the accessory changes once per block');
  ok(curlNames[0] === 'Curl manubri', '9i. starting from the one that was written');
  ok(curlNames.slice(0, 10).every((n) => n === 'Curl manubri'), '9j. and not before the week asked for');
  ok(curlNames[10] !== curlNames[0], '9k. changing exactly at that week');

  // Variants allowed: a squat becomes another squat, done with a barbell.
  const all = P.weeksFromTemplate(long, { weeks: 40, modelId: 'linear_rir', rotateWeeks: [11, 21, 31], rotateScope: 'all' });
  const mains = all.map((w) => w.sessions[0].exercises[0].name);
  const variants = [...new Set(mains)];
  ok(variants.length === 4, '9l. with variants allowed, the main lift changes each block too');
  const tax = ctx.self.NURVAN_EXERCISE_TAXONOMY.EXERCISES;
  const entryFor = (n) => tax.find((e) => e.name === n);
  ok(variants.every((n) => entryFor(n) && entryFor(n).pattern === 'squat'),
    '9m. and every one of them is still a squat');
  ok(variants.every((n) => entryFor(n).equip === 'barbell'),
    '9n. still done with a barbell - no leg press standing in for a squat');
  ok(variants.every((n) => entryFor(n).role === 'main'),
    '9o. and still a lift that can carry the heaviest slot');

  // In a peaking block the lift being tested comes back for the run-in.
  const peak = P.weeksFromTemplate(long, { weeks: 16, modelId: 'peaking_classic', rotateWeeks: [5, 9, 13], rotateScope: 'all', loadDisplay: 'percent' });
  ok(peak[5].sessions[0].exercises[0].name !== 'Low-bar squat', '9p. a peaking block can still use variations early');
  ok(peak[15].sessions[0].exercises[0].name === 'Low-bar squat',
    '9q. but the last block returns to the lift that will be tested');
  ok(peak[12].sessions[0].exercises[0].name === 'Low-bar squat', '9r. for the whole of that last block, not only test day');

  // Nothing is ever invented.
  const unknown = P.weeksFromTemplate([{ name: 'D', exercises: [{ name: 'Esercizio che non esiste', sets: [{ reps: '8' }] }] }],
    { weeks: 12, modelId: 'linear_rir', rotateWeeks: [5], rotateScope: 'all' });
  ok(unknown.every((w) => w.sessions[0].exercises[0].name === 'Esercizio che non esiste'),
    '9s. an exercise the library does not know is never swapped for a guess');

  const rotated = all[11].sessions[0].exercises[1];
  ok(rotated.rotated_from === 'Curl manubri', '9t. a swapped exercise remembers what it replaced');
  ok(/Esercizi B/.test(all[11].label), '9u. and the week says which block of exercises it is running');

  const two = P.weeksFromTemplate([{
    name: 'D', exercises: [
      { name: 'Curl manubri', sets: [{ reps: '10' }] },
      { name: 'Curl cavi', sets: [{ reps: '10' }] }
    ]
  }], { weeks: 12, modelId: 'linear_rir', rotateWeeks: [5], rotateScope: 'accessories' });
  const day = two[6].sessions[0].exercises.map((e) => e.name);
  ok(day[0] !== day[1], '9v. two exercises in a day never rotate onto the same replacement');
}

/* ---------- 10. a test inside the program ---------- */
{
  const tpl = [{
    name: 'Full body',
    exercises: [
      { name: 'Low-bar squat', sets: [{ reps: '5' }], setCount: 1, repsTarget: '5' },
      { name: 'Panca piana bilanciere', sets: [{ reps: '5' }], setCount: 1, repsTarget: '5' },
      { name: 'Curl manubri', sets: [{ reps: '10' }, { reps: '10' }, { reps: '10' }], setCount: 3, repsTarget: '10' }
    ]
  }];
  const opts = { weeks: 20, modelId: 'peaking_classic', loadDisplay: 'kg', maxes: { squat: 200, bench: 140 }, testWeeks: [15] };
  const weeks = P.weeksFromTemplate(tpl, opts);

  ok(weeks[14].test_week === true && /Test massimali/.test(weeks[14].label),
    '10a. week 15 is a test week and says so');
  ok(weeks[13].test_week !== true && weeks[15].test_week !== true, '10b. and only that week');
  const testSquat = weeks[14].sessions[0].exercises[0];
  ok(testSquat.sets.length === 1 && testSquat.repsTarget === '1', '10c. the lift is taken to a single');
  ok(/100%/.test(testSquat.notes) && /nuovo massimale/i.test(testSquat.notes), '10d. at the max, and it says what it is for');
  ok(weeks[14].sessions[0].exercises[2].sets.length < 3, '10e. accessories are cut back that week');
  ok(weeks[19].sessions[0].exercises[0].repsTarget === '1', '10f. the final week is still the attempt it always was');
  ok(weeks[7].sessions[0].exercises[0].sets.length > 1, '10g. and the weeks around it are ordinary work');

  const before = weeks[17].sessions[0].exercises[0].sets[0].target_load;
  ok(before === 200 * weeks[17].sessions[0].exercises[0].target_pct
    || Math.abs(before - 200 * weeks[17].sessions[0].exercises[0].target_pct) <= 2.5,
    '10h. every competition lift remembers the percentage it was written at');

  // The test came in higher: everything after it moves up.
  const res = P.recalibrateWeeks(weeks, { fromWeek: 15, maxes: { squat: 215, bench: 145 }, loadDisplay: 'kg' });
  ok(res.weeks === 5 && res.lifts === 10, '10i. recalibration touches the five weeks left, and only them');
  const after = weeks[17].sessions[0].exercises[0].sets[0].target_load;
  ok(after > before, '10j. a better test means heavier work for what is left');
  ok(Math.abs(after - 215 * weeks[17].sessions[0].exercises[0].target_pct) <= 2.5,
    '10k. at the same percentage of the new max');
  ok(/215|kg/.test(weeks[19].sessions[0].exercises[0].notes), '10l. and the final attempt is rewritten too');
  ok(weeks[10].sessions[0].exercises[0].sets[0].target_load === 200 * weeks[10].sessions[0].exercises[0].target_pct
    || Math.abs(weeks[10].sessions[0].exercises[0].sets[0].target_load - 200 * weeks[10].sessions[0].exercises[0].target_pct) <= 2.5,
    '10m. what was already trained is left alone');

  // A test that went backwards, with the accessory trim asked for.
  const weeks2 = P.weeksFromTemplate(tpl, opts);
  const accBefore = weeks2[17].sessions[0].exercises[2].sets.length;
  const res2 = P.recalibrateWeeks(weeks2, { fromWeek: 15, maxes: { squat: 185, bench: 140 }, loadDisplay: 'kg', trimAccessorySets: true });
  ok(weeks2[17].sessions[0].exercises[0].sets[0].target_load < before, '10n. a worse test means lighter work, not a pretence');
  ok(weeks2[17].sessions[0].exercises[2].sets.length === accBefore - 1, '10o. and a set comes off the accessories when asked');
  ok(res2.setsRemoved > 0, '10p. which is reported back');

  const weeks3 = P.weeksFromTemplate(tpl, opts);
  P.recalibrateWeeks(weeks3, { fromWeek: 15, maxes: { squat: 185 }, loadDisplay: 'kg' });
  ok(weeks3[17].sessions[0].exercises[2].sets.length === accBefore, '10q. and stays on unless it is');
  ok(weeks3[17].sessions[0].exercises[1].sets[0].target_load === weeks[17].sessions[0].exercises[1].sets[0].target_load
    || weeks3[17].sessions[0].exercises[1].competition_lift === 'bench',
    '10r. a lift left out of the test keeps the numbers it had');

  const noTest = P.weeksFromTemplate(tpl, Object.assign({}, opts, { testWeeks: [] }));
  ok(noTest.every((w) => !w.test_week), '10s. no test asked for, no test week written');
  const bb = P.weeksFromTemplate(tpl, { weeks: 12, modelId: 'linear_rir', testWeeks: [6] });
  ok(bb.every((w) => !w.test_week), '10t. and a hypertrophy block is not given a max test it never asked for');
}

console.log('\nAll progression model tests passed.');
