// Runs web/nutrition-merge.js for real and asserts what it returns, and runs
// the server's account merge on top of it.
//
// Guards the food-diary loss: every copy of the plan (program envelope in
// IndexedDB, the local blob, the cloud record, another phone) used to replace
// the others whole, so whichever stale copy was written last silently took
// every meal logged since.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mergeAccountDataBlobs } from './server/account/index.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const sandbox = {};
sandbox.self = sandbox;
vm.runInNewContext(fs.readFileSync(path.join(root, 'web/domain-merge.js'), 'utf8'), sandbox);
const M = sandbox.NurvanNutritionMerge;

function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}
const clone = (v) => JSON.parse(JSON.stringify(v));
const names = (n, d = 0, m = 0) => (((n.days[d] || {}).meals || [])[m] || { foods: [] }).foods.map((f) => f.name);

function legacyPlan() {
  return {
    plan_name: 'Diario', present: true, daily_calories_target: 2200,
    days: [
      { day: 'Venerdì', date: '2026-09-18', meals: [{ name: 'Pranzo', foods: [{ name: 'Riso', quantity: 80, unit: 'g' }] }] },
      { day: 'Sabato', date: '2026-09-19', meals: [{ name: 'Colazione', foods: [{ name: 'Yogurt', quantity: 150, unit: 'g' }] }] }
    ]
  };
}

// A device: its copy of the plan plus the snapshot persist() keeps.
function device(plan) {
  const n = clone(plan);
  const snap = M.stamp(n, null);
  return { n, snap, save(now) { this.snap = M.stamp(this.n, this.snap, now); } };
}

// --- two copies of the same old plan agree on ids without talking ----------
{
  const a = M.ensureIds(clone(legacyPlan()), false);
  const b = M.ensureIds(clone(legacyPlan()), false);
  ok(JSON.stringify(a) === JSON.stringify(b), 'the same pre-existing plan gets the same ids on every copy');
  const merged = M.merge(a, b);
  ok(merged.days.length === 2 && names(merged).join() === 'Riso', 'merging two identical copies duplicates nothing');
}

// --- the reported loss: a stale copy written after a newer one ------------
{
  const phone = device(legacyPlan());
  const stale = clone(phone.n); // e.g. the program envelope saved before lunch was logged
  phone.n.days[1].meals[0].foods.push({ name: 'Banana', quantity: 120, unit: 'g' });
  phone.save(1000);
  const afterReload = M.merge(stale, phone.n);
  ok(names(afterReload, 1).join() === 'Yogurt,Banana', 'a meal logged after a stale copy was taken survives merging with it (newer copy arriving last)');
  const reversed = M.merge(phone.n, stale);
  ok(names(reversed, 1).join() === 'Yogurt,Banana', 'and survives when the stale copy arrives last');
}

// --- deletions stay deleted -------------------------------------------------
{
  const phone = device(legacyPlan());
  const old = clone(phone.n);
  phone.n.days[0].meals[0].foods.splice(0, 1);
  phone.save(2000);
  ok(Object.keys(phone.n.deleted).length === 1, 'deleting a food records a tombstone');
  ok(names(M.merge(old, phone.n)).length === 0 && names(M.merge(phone.n, old)).length === 0,
    'a deleted food does not come back from an older copy, whichever arrives last');
  phone.n.days.splice(1, 1);
  phone.save(2100);
  ok(M.merge(old, phone.n).days.length === 1, 'a deleted day does not come back either');
}

// --- two phones edit at the same time: both edits kept ----------------------
{
  const base = device(legacyPlan());
  const phone = { n: clone(base.n), snap: base.snap, save: base.save };
  const pc = { n: clone(base.n), snap: base.snap, save: base.save };
  phone.n.days[1].meals[0].foods.push({ name: 'Uova', quantity: 2, unit: 'pz' });
  phone.save(3000);
  pc.n.days.push({ day: 'Domenica', date: '2026-09-20', meals: [{ name: 'Cena', foods: [{ name: 'Pizza', quantity: 1, unit: 'pz' }] }] });
  pc.n.days[0].meals[0].foods[0].quantity = 100;
  pc.save(3100);
  const cloud = M.merge(phone.n, pc.n);
  ok(names(cloud, 1).join() === 'Yogurt,Uova', 'food added on the phone is kept');
  ok(cloud.days.length === 3 && names(cloud, 2).join() === 'Pizza', 'day added on the PC is kept');
  ok(cloud.days[0].meals[0].foods[0].quantity === 100, 'the newer edit to an existing food wins');
  const twoEggs = M.merge(M.merge(base.n, phone.n), phone.n);
  ok(names(twoEggs, 1).join() === 'Yogurt,Uova', 'merging the same copy twice adds nothing');
}

// --- identical foods logged separately are two foods ------------------------
{
  const base = device(legacyPlan());
  const a = { n: clone(base.n), snap: base.snap, save: base.save };
  const b = { n: clone(base.n), snap: base.snap, save: base.save };
  a.n.days[0].meals[0].foods.push({ name: 'Mela', quantity: 1, unit: 'pz' });
  b.n.days[0].meals[0].foods.push({ name: 'Mela', quantity: 1, unit: 'pz' });
  a.save(4000); b.save(4001);
  ok(names(M.merge(a.n, b.n)).filter((x) => x === 'Mela').length === 2, 'the same food logged on two devices counts twice, not once');
}

// --- an edit made after a deletion elsewhere is not lost --------------------
{
  const base = device(legacyPlan());
  const a = { n: clone(base.n), snap: base.snap, save: base.save };
  const b = { n: clone(base.n), snap: base.snap, save: base.save };
  a.n.days.splice(1, 1); a.save(5000);
  b.n.days[1].meals[0].foods.push({ name: 'Noci', quantity: 30, unit: 'g' }); b.save(6000);
  const merged = M.merge(a.n, b.n);
  ok(merged.days.length === 2 && names(merged, 1).includes('Noci'), 'a day deleted on one phone keeps the food added to it later on another');
}

// --- a new day that looks like a deleted one is not taken for it ------------
{
  const phone = device(legacyPlan());
  phone.n.days.splice(1, 1);
  phone.save(5500);
  // rebuilt by code, or from an old copy: no ids, same date and meal as the deleted day
  const rebuilt = { days: [{ day: 'Sabato', date: '2026-09-19', meals: [{ name: 'Colazione', foods: [{ name: 'Yogurt', quantity: 150, unit: 'g' }] }] }] };
  const merged = M.merge(phone.n, rebuilt);
  ok(merged.days.some((d) => d.date === '2026-09-19'), 'a day without an id is never dropped by a tombstone that happens to match it');
}

// --- plan-level fields and saved foods -------------------------------------
{
  const base = device(legacyPlan());
  const a = { n: clone(base.n), snap: base.snap, save: base.save };
  const b = { n: clone(base.n), snap: base.snap, save: base.save };
  a.n.daily_calories_target = 2500; a.save(7000);
  b.n.customFoods = [{ id: 'custom_x', name: 'Barretta', kcal: 200 }]; b.save(6000);
  const merged = M.merge(a.n, b.n);
  ok(merged.daily_calories_target === 2500, 'the newer target wins even when the other copy arrives last');
  ok(merged.customFoods.length === 1 && merged.customFoods[0].name === 'Barretta', 'a saved food from the other copy is kept');
}

// --- meal.items no longer resurrects deleted foods --------------------------
{
  const phone = device(legacyPlan());
  const meal = phone.n.days[0].meals[0];
  ok(meal.items === meal.foods, 'items and foods are the same list after preparing the plan');
  const reloaded = JSON.parse(JSON.stringify(phone.n));
  reloaded.days[0].meals[0].foods = [];
  const merged = M.merge(reloaded, reloaded);
  ok(merged.days[0].meals[0].foods.length === 0, 'an emptied meal stays empty even though its stored alias still lists the foods');
}

// --- the server keeps both sides ------------------------------------------
{
  const base = device(legacyPlan());
  const phone = { n: clone(base.n), snap: base.snap, save: base.save };
  const stalePc = clone(base.n);
  phone.n.days[1].meals[0].foods.push({ name: 'Banana', quantity: 120, unit: 'g' });
  phone.save(8000);
  let cloud = mergeAccountDataBlobs({}, { nutrition: phone.n, activeProgram: { weeks: [{}], nutrition: phone.n } });
  cloud = mergeAccountDataBlobs(cloud, { nutrition: stalePc, activeProgram: { weeks: [{}], nutrition: stalePc } });
  ok(names(cloud.nutrition, 1).join() === 'Yogurt,Banana', 'server: a stale device uploading afterwards no longer erases the meal');
  ok(names(cloud.activeProgram.nutrition, 1).join() === 'Yogurt,Banana', 'server: nor the copy bundled in the program');

  const oldCloud = { nutrition: legacyPlan() };
  const firstUpload = mergeAccountDataBlobs(oldCloud, { nutrition: phone.n });
  ok(firstUpload.nutrition.days.length === 2 && names(firstUpload.nutrition, 1).join() === 'Yogurt,Banana',
    'server: the first upload from an updated app over an old cloud copy duplicates nothing');

  const legacyOnly = mergeAccountDataBlobs({ nutrition: legacyPlan() }, { nutrition: { days: [], cleared: true } });
  ok(legacyOnly.nutrition.cleared === true, 'server: an old app\'s explicit clear still clears');
  const emptyIncoming = mergeAccountDataBlobs({ nutrition: phone.n }, { nutrition: null });
  ok(names(emptyIncoming.nutrition, 1).join() === 'Yogurt,Banana', 'server: a sync with no nutrition in it keeps the plan');
}

console.log('\nAll nutrition merge tests passed.');
