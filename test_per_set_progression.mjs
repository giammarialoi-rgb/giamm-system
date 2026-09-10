/**
 * Quick check: per-set progression never copies top set onto set 2.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('web/index.base.html', 'utf8');
const extract = (name) => {
  const re = new RegExp('function ' + name + '\\([\\s\\S]*?\\n\\}\\n(?=function |async function |let |const |var |window\\.)');
  const m = html.match(re);
  assert.ok(m, 'missing ' + name);
  return m[0];
};

const code = [
  extract('roundLoadStep'),
  extract('applyProgressionToLoad'),
  extract('isLightProgressionLoad'),
  extract('progressionAddKg'),
  extract('workoutProgressionPolicy'),
  extract('loadsNearlyEqual'),
  `function uniquePositiveLoads(sets) {
    const loads = (sets || []).map(function (s) { return parseFloat(String(s.load).replace(',', '.')); }).filter(function (n) { return Number.isFinite(n) && n > 0; });
    const uniq = [];
    loads.forEach(function (n) { if (uniq.indexOf(n) < 0) uniq.push(n); });
    return uniq;
  }`,
  `var currentWeek = 4, currentDay = 0;
   var store = { data: {
     'w3_d0_e0_s1_load': 132.5, 'w3_d0_e0_s1_reps': 5, 'w3_d0_e0_s1_rir': 2,
     'w3_d0_e0_s2_load': 120, 'w3_d0_e0_s2_reps': 8, 'w3_d0_e0_s2_rir': 2,
     'w3_d0_e0_s3_load': 120, 'w3_d0_e0_s3_reps': 8, 'w3_d0_e0_s3_rir': 1
   }};
   function normalizeExerciseKey(s){ return String(s||'').toLowerCase().trim(); }
   function exerciseNameAt(){ return 'panca piana'; }
   function collectSetLogsAtWeek(week, day, exIdx) {
     const out = [];
     for (let s = 1; s <= 10; s++) {
       const load = store.data['w'+week+'_d'+day+'_e'+exIdx+'_s'+s+'_load'];
       const reps = store.data['w'+week+'_d'+day+'_e'+exIdx+'_s'+s+'_reps'];
       const rir = store.data['w'+week+'_d'+day+'_e'+exIdx+'_s'+s+'_rir'];
       if (load == null || load === '') continue;
       out.push({ set: s, load, reps, rir });
     }
     return out;
   }
   function collectPrevWeekSetLogs(exIdx){ return collectSetLogsAtWeek(currentWeek-1, currentDay, exIdx); }
   `,
  extract('suggestedLoadForSet'),
  extract('suggestedRepsForSet')
].join('\n');

const ctx = {};
vm.createContext(ctx);
vm.runInContext(code, ctx);

const s1 = ctx.suggestedLoadForSet(0, 1, { name: 'Panca piana', repsTarget: '5-8' });
const s2 = ctx.suggestedLoadForSet(0, 2, { name: 'Panca piana', repsTarget: '5-8' });
console.log('suggested', s1, s2);
assert.equal(s1, 135); // 132.5 + 2.5
assert.equal(s2, 122.5); // 120 + 2.5 — NOT 135
assert.notEqual(s1, s2);

const r1 = ctx.suggestedRepsForSet(0, 1, { name: 'Panca piana', repsTarget: '5-8' });
const r2 = ctx.suggestedRepsForSet(0, 2, { name: 'Panca piana', repsTarget: '5-8' });
assert.equal(r1, 5);
assert.equal(r2, 8);
console.log('ok per-set progression');
