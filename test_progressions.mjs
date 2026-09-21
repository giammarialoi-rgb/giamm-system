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

console.log('\nAll progression model tests passed.');
