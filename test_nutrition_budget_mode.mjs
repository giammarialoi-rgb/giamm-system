import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { domainHasContent } from './server/account/index.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// New feature, requested live: when assigning nutrition, the coach can pick
// "SOLO BUDGET" instead of a foods-based plan - just a daily kcal/macro
// target, with the client inserting their own food choices against it (same
// search/barcode/photo tools as before, just with no prescribed meals).
console.log('--- Running Nutrition Budget-Mode Tests ---');

const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const uiSrc = fs.readFileSync(path.join(root, 'web/coach-practice-ui.js'), 'utf8');
const coachPractice = fs.readFileSync(path.join(root, 'coach-practice.mjs'), 'utf8');

// 1. domainHasContent (server-side merge policy, used by /api/account/sync
// and /api/account/data) must recognize a target-only nutrition object as
// real content - otherwise a budget assignment can be silently dropped or
// overwritten by a stale, richer-looking local blob on the client's own sync.
{
  ok(domainHasContent({ daily_calories_target: 2200, days: [] }), '1a. a budget plan (target set, no days) counts as content');
  ok(!domainHasContent({ daily_calories_target: null, days: [] }), '1b. an actually-empty nutrition object still counts as no content');
  ok(domainHasContent({ days: [{ meals: [{ foods: [{ name: 'x' }] }] }] }), '1c. an ordinary foods-based plan still counts as content (no regression)');
}

// 2. detectAssignKinds (coach-practice.mjs, /api/coach/clients/:id/assign)
// must flag "nutrition" for a target-only patch, or the assignment silently
// carries no nutrition kind and mergeAssignClientData never copies it in.
{
  const fnStart = coachPractice.indexOf('function detectAssignKinds(patch)');
  ok(fnStart >= 0, '2a. detectAssignKinds is declared');
  const fnBody = coachPractice.slice(fnStart, coachPractice.indexOf('\n  }', fnStart) + 4);
  ok(fnBody.includes('nutr.daily_calories_target'), '2b. detectAssignKinds also checks the target fields, not just days.length');
}

// 3. Client-side "has sandbox content" detection (coach-practice-ui.js,
// drives whether the coach's assign button is enabled at all) needs the same
// fix, or confirmAssignSandbox blocks a budget-only assignment with "nessun
// contenuto da assegnare" even though the coach did set a real target.
{
  ok(uiSrc.includes('function nutritionHasSandboxContent(n)'), '3a. nutritionHasSandboxContent helper is declared');
  ok(uiSrc.includes('daily_calories_target != null'), '3b. it treats a set kcal target as real content');
  ok(uiSrc.includes('nutritionHasSandboxContent(DATA && DATA.nutrition) || nutritionHasSandboxContent(store.nutrition)'),
    '3c. detectSandboxKinds uses the fixed helper for the nutrition kind');
}

// 4. preferFilledNutrition (coach-practice-ui.js, used when reconciling the
// coach's local view against the client's synced data) must not score a
// budget plan as 0 - equal to "no plan at all" - or it can lose a tie to a
// stale cached plan and silently revert the assignment in the coach's UI.
{
  const fnStart = uiSrc.indexOf('function preferFilledNutrition(a, b)');
  const fnBody = uiSrc.slice(fnStart, uiSrc.indexOf('\n}', fnStart) + 2);
  ok(fnBody.includes('hasTargets'), '4a. preferFilledNutrition scoring accounts for a target-only plan');
}

// 5. The wizard: a third "SOLO BUDGET" mode alongside AUTOMATICO/PRECISO,
// with its own confirm handler that skips buildWeeklyNutritionPlan (which
// always fabricates real meals) and instead writes only the target fields.
for (const src of [html, built]) {
  ok(src.includes("setGenNutritionMode(\\'budget\\')"), '5a. the wizard has a SOLO BUDGET mode button');
  ok(src.includes('function confirmGenerateBudgetNutritionPlan(st, restrictions)'), '5b. confirmGenerateBudgetNutritionPlan is declared');
  const fnStart = src.indexOf('function confirmGenerateBudgetNutritionPlan(st, restrictions)');
  const fnBody = src.slice(fnStart, src.indexOf('\nasync function saveNutritionPlanEdits', fnStart));
  ok(fnBody.includes("mode: 'budget'"), '5c. the generated plan is tagged mode: budget for downstream UI branching');
  ok(fnBody.includes('present: true'), '5d. present is explicitly true, so the days-less plan is never treated as cleared');
  ok(fnBody.includes('days: []'), '5e. no foods are fabricated - days starts empty');
  ok(fnBody.includes('daily_calories_target: t.tdee') && fnBody.includes('daily_protein_target: t.protein') &&
    fnBody.includes('daily_carbs_target: t.carbs') && fnBody.includes('daily_fats_target: t.fat'),
    '5f. all four target fields are set from computeNutritionTargetsFromProfile');
  ok(!fnBody.includes('buildWeeklyNutritionPlan'), '5g. the food-generating builder is never called for a budget plan');
}

// 6. setGenNutritionMode hides the day-count/combo/meal-count/free-meal
// sections in budget mode (they only make sense for a foods-based plan) and
// still shows the macro-% box so the coach can set a precise P/C/F split.
for (const src of [html, built]) {
  const fnStart = src.indexOf('function setGenNutritionMode(mode)');
  const fnBody = src.slice(fnStart, src.indexOf('\n}', fnStart) + 2);
  ok(fnBody.includes("m === 'budget' ? 'none' : ''"), '6a. day/combo/meal/free-meal boxes are hidden in budget mode');
  ok(fnBody.includes("(m === 'precise' || m === 'budget')"), '6b. the macro-% box is shown for both precise and budget modes');
}

// 7. ensureBudgetNutritionToday: a budget plan has no prescribed days, so the
// client needs a fresh "today" day auto-created to log food into and to let
// the existing logged-vs-target totals card render at all.
for (const src of [html, built]) {
  ok(src.includes('function ensureBudgetNutritionToday()'), '7a. ensureBudgetNutritionToday is declared');
  const fnStart = src.indexOf('function ensureBudgetNutritionToday()');
  const fnBody = src.slice(fnStart, src.indexOf('\nfunction nutritionConfirmStatus', fnStart));
  ok(fnBody.includes("DATA.nutrition.mode !== 'budget'"), '7b. it only acts on budget-mode plans, never touching a normal prescribed plan');
  ok(fnBody.includes('meals: [{ name: \'Pasti liberi\', foods: [] }]'), '7c. the auto-created day starts with an empty free-logging meal, no fabricated foods');
  const renderStart = src.indexOf('function renderNutrition(c)');
  const renderBody = src.slice(renderStart, renderStart + 3000);
  ok(renderBody.includes('ensureBudgetNutritionToday()'), '7d. renderNutrition actually calls it, so a budget plan is never stuck on the generic empty-state screen');
}

// 8. The "did you eat what was prescribed" adherence card doesn't apply when
// nothing was prescribed - it must not show for a budget plan.
for (const src of [html, built]) {
  const fnStart = src.indexOf('function nutritionConfirmCardHtml()');
  const fnBody = src.slice(fnStart, fnStart + 300);
  ok(fnBody.includes("DATA.nutrition.mode === 'budget'") && fnBody.includes("return ''"),
    '8a. nutritionConfirmCardHtml short-circuits for budget-mode plans');
}

console.log('\nAll nutrition budget-mode tests passed.');
