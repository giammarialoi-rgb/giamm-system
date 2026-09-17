import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// Asked live: "why is there a leftover 3200kcal target next to my logged
// totals, where did it come from, where can I change it?" - daily_calories_
// target/protein/carbs/fats_target are set whenever a plan is generated
// (auto or precise) via the wizard, but there was no way to edit or clear
// just the target without regenerating a whole plan (which also wipes any
// manually-logged foods). Adds a direct edit/clear control instead.
console.log('--- Running Nutrition Target-Edit Tests ---');

const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');

// 1. The pencil control next to the target in the totals card, and the edit
// modal's own buttons, all reference functions by name via onclick="" - in
// this codebase that requires an explicit `window.fnName = fnName;` export
// right after the declaration (confirmed live: a plain top-level function
// statement alone was NOT reachable as window.fnName here, unlike in an
// ordinary classic script - clicking silently did nothing, no console error).
// Every function referenced from an onclick="" in the code touched by this
// feature must have a matching export, or the button silently does nothing.
for (const src of [html, built]) {
  const onclickFns = ['openEditNutritionTargetsModal', 'recalcEditNutritionTargetsFromProfile', 'saveEditNutritionTargets', 'clearEditNutritionTargets'];
  for (const fn of onclickFns) {
    ok(src.includes('onclick="' + fn + '()"'), '1a. onclick="' + fn + '()" is wired up somewhere');
    ok(src.includes('window.' + fn + ' = ' + fn + ';'), '1b. ' + fn + ' is explicitly exported on window (onclick="" cannot resolve a merely-declared function in this codebase)');
  }
}

// 2. The edit function itself: reads current targets into the modal, and the
// save/clear paths only ever touch the four target fields - never days/foods,
// so logged meals survive editing or clearing the target.
{
  const fnStart = html.indexOf('function applyNutritionTargets(kcal, pro, carb, fat)');
  ok(fnStart >= 0, '2a. applyNutritionTargets is declared');
  const fnBody = html.slice(fnStart, html.indexOf('\nfunction saveEditNutritionTargets', fnStart));
  ok(fnBody.includes('DATA.nutrition.daily_calories_target = kcal') &&
    fnBody.includes('DATA.nutrition.daily_protein_target = pro') &&
    fnBody.includes('DATA.nutrition.daily_carbs_target = carb') &&
    fnBody.includes('DATA.nutrition.daily_fats_target = fat'),
    '2b. it sets all four target fields directly');
  ok(!fnBody.includes('.days ='), '2c. it never touches DATA.nutrition.days - logged/prescribed foods are untouched');
  ok(fnBody.includes('store.__cpNutritionDirty = true'), '2d. it marks nutrition dirty so the SALVA button appears and a later sync does not silently discard the change');
}

// 3. clearEditNutritionTargets removes the target entirely (all four fields
// null) rather than just zeroing kcal, so the "/ 0 kcal" suffix does not
// linger - renderNutrition only omits the suffix when targetKcal is falsy.
{
  const fnStart = html.indexOf('function clearEditNutritionTargets()');
  const fnBody = html.slice(fnStart, html.indexOf('\n}', fnStart) + 2);
  ok(fnBody.includes('applyNutritionTargets(null, null, null, null)'), '3a. clearing passes null for all four fields');
}

// 4. Kcal <-> macro auto-balance: asked live to make kcal and macros stay
// proportioned (e.g. kcal=1000 + carb=500g is impossible - that alone is
// already 2000kcal). Editing kcal rescales macros keeping their split;
// editing a macro clamps it to the kcal budget and redistributes the rest.
for (const src of [html, built]) {
  ok(src.includes('oninput="onEditNutritionKcalInput()"'), '4a. kcal input wires the rescale-on-kcal-change handler');
  ok(src.includes("oninput=\"onEditNutritionMacroInput(\\'p\\')\"") &&
    src.includes("oninput=\"onEditNutritionMacroInput(\\'c\\')\"") &&
    src.includes("oninput=\"onEditNutritionMacroInput(\\'f\\')\""),
    '4b. all three macro inputs wire the rebalance-on-macro-change handler');
  ok(src.includes('window.onEditNutritionKcalInput = onEditNutritionKcalInput;'), '4c. onEditNutritionKcalInput is exported on window');
  ok(src.includes('window.onEditNutritionMacroInput = onEditNutritionMacroInput;'), '4d. onEditNutritionMacroInput is exported on window');
}
{
  const fnStart = html.indexOf('function onEditNutritionMacroInput(which)');
  const fnBody = html.slice(fnStart, html.indexOf('\nfunction applyNutritionTargets', fnStart));
  ok(fnBody.includes('if (editedCal > kcal) grams[which] = Math.floor(kcal / perGramCal[which]);'),
    '4e. a macro that alone exceeds the kcal target gets clamped to fit inside it');
  ok(fnBody.includes('const remaining = Math.max(0, kcal - grams[which] * perGramCal[which]);'),
    '4f. the other two macros are redistributed from what is left of the kcal budget');
  ok(!/DATA\.nutrition\.days|store\.nutrition\.days/.test(fnBody), '4g. rebalancing never touches logged/prescribed foods');
}

// 5. Optional end-of-day step count (spec: "tracciamento generale"). Lives
// in the same already-synced, already coach/client-isolated per-day
// container as confirmNutritionDay (store.nutritionDaily[today]) so it
// never needs its own sync wiring and can never collide with meal data.
for (const src of [html, built]) {
  ok(src.includes('id="nutrition-steps-input"'), '5a. the optional steps input is rendered in the nutrition header');
  ok(src.includes('onclick="saveNutritionSteps()"'), '5b. onclick="saveNutritionSteps()" is wired up');
  ok(src.includes('window.saveNutritionSteps = saveNutritionSteps;'), '5c. saveNutritionSteps is explicitly exported on window');
}
{
  const fnStart = html.indexOf('function saveNutritionSteps()');
  const fnBody = html.slice(fnStart, html.indexOf('\nwindow.saveNutritionSteps', fnStart));
  ok(fnBody.includes("store.nutritionDaily[key] = existing;"), '5d. steps are written into the per-day nutritionDaily entry');
  ok(!/DATA\.nutrition|\.days\s*=|\.meals\s*=|\.foods\s*=/.test(fnBody), '5e. saving steps never touches nutrition plan/meal/food data');
  ok(fnBody.includes('store.health.steps = steps'), '5f. steps also mirror into store.health for the home recovery-estimate widget');
}

console.log('\nAll nutrition target-edit tests passed.');
