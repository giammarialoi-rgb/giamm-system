import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

console.log('--- Running Food Diary Editing Tests ---');

const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const sources = [html, built];

// 1. Barcode scan is reachable directly from "Aggiungi Alimento" (used to only
// exist as a separate flow on the main Nutrition page).
for (const src of sources) {
  const modalStart = src.indexOf('id="add-food-modal"');
  const modalBody = src.slice(modalStart, modalStart + 1500);
  ok(modalBody.includes("scanBarcodeWithCamera('nutrition')"), '1. add-food-modal has a barcode scan button wired to the nutrition scanner');
}

// 2. Editing an existing diary entry: editFoodItem exists, is window-exported
// (required for its onclick="" to resolve), reconstructs a per-100g reference,
// and saveFoodItem updates the item in place instead of duplicating it.
for (const src of sources) {
  ok(src.includes('function editFoodItem(dayIdx, mealIdx, foodIdx)'), '2a. editFoodItem is declared');
  ok(src.includes('window.editFoodItem = editFoodItem;'), '2b. editFoodItem is exported to window (required for its onclick to resolve)');
  ok(src.includes('onclick="editFoodItem(${currentNutritionDayIndex}, ${mIdx}, ${fIdx})"'), '2c. each diary food row has an edit button wired to editFoodItem');
  const saveStart = src.indexOf('function saveFoodItem()');
  const saveBody = src.slice(saveStart, src.indexOf('\nfunction ', saveStart + 10));
  ok(saveBody.includes('window.__foodEditTarget'), '2d. saveFoodItem checks for an active edit target');
  ok(saveBody.includes('editedFoods[editTarget.foodIdx] = foodObj'), '2e. saveFoodItem overwrites the existing entry in place when editing, rather than pushing a duplicate');
}

// 3. Every saved food stores a per-100g rate, so a later quantity edit (today
// or in a future session, even without the original DB/barcode selection
// still in memory) can rescale correctly instead of staying stuck.
for (const src of sources) {
  const saveStart = src.indexOf('function saveFoodItem()');
  const saveBody = src.slice(saveStart, src.indexOf('\nfunction ', saveStart + 10));
  ok(saveBody.includes('kcalPer100') && saveBody.includes('proPer100') && saveBody.includes('carbPer100') && saveBody.includes('fatPer100'),
    '3a. saveFoodItem computes and persists per-100g rates on every saved food');
  const editStart = src.indexOf('function editFoodItem(dayIdx, mealIdx, foodIdx)');
  const editBody = src.slice(editStart, src.indexOf('\nwindow.editFoodItem', editStart));
  ok(editBody.includes('food.kcalPer100') && editBody.includes('foodQtyToGrams(qty, unit, food.name)'),
    '3b. editFoodItem falls back to deriving a per-100g rate for items saved before this field existed');
}

// 4. Root cause of "quantity never recalculates, kcal stuck at the per-100g
// value regardless of qty": applyBarcodeProduct wrote to window.activeSelectedFoodRef,
// but recalcFoodMacrosFromDb()/saveFoodItem() read the bare (let-scoped)
// activeSelectedFoodRef - a different binding - so the product was invisible
// to the recalculation, and the qty field silently did nothing.
for (const src of sources) {
  ok(!src.includes('window.activeSelectedFoodRef ='), '4a. nothing assigns to window.activeSelectedFoodRef anymore (the bare binding is what recalculation actually reads)');
  const applyStart = src.indexOf("function applyBarcodeProduct(product, kind)");
  const applyBody = src.slice(applyStart, src.indexOf('\nfunction addLastScannedFoodToDiary', applyStart));
  ok(/(?<!window\.)\bactiveSelectedFoodRef\s*=\s*\{/.test(applyBody), '4b. applyBarcodeProduct assigns the bare activeSelectedFoodRef binding');
  const diaryStart = src.indexOf('function addLastScannedFoodToDiary()');
  const diaryBody = src.slice(diaryStart, src.indexOf('\n}', diaryStart + 20) + 1);
  ok(diaryBody.includes('activeSelectedFoodRef = p;') && !diaryBody.includes('window.activeSelectedFoodRef = p'),
    '4c. addLastScannedFoodToDiary assigns the bare activeSelectedFoodRef binding too');
  ok(diaryBody.includes('recalcFoodMacrosFromDb()'), '4d. addLastScannedFoodToDiary rescales macros to the serving size immediately instead of showing the unscaled per-100g numbers');
}

// 5. Scanning a barcode from the main Nutrition page used to always drop the
// product into meal index 0 regardless of intent - now it asks which meal.
for (const src of sources) {
  const diaryStart = src.indexOf('function addLastScannedFoodToDiary()');
  const diaryBody = src.slice(diaryStart, src.indexOf('\n}', diaryStart + 20) + 1);
  ok(diaryBody.includes('openMealTargetModal('), '5a. addLastScannedFoodToDiary asks which meal via the shared target picker');
  ok(!/openAddFoodModal\(currentNutritionDayIndex,\s*0\)/.test(diaryBody), '5b. no longer hardcodes meal index 0');
  ok(src.includes('function openMealTargetModal(preselectedMealName, onSelect, opts)'), '5c. the meal-target picker accepts a reusable onSelect callback and options');
}

// 6. "Duplica pasto": copy a meal's foods into a chosen day/meal, creating
// the day and/or meal if they don't exist yet, without touching the source.
for (const src of sources) {
  ok(src.includes('function duplicateMealItem(dayIdx, mealIdx)'), '6a. duplicateMealItem is declared');
  ok(src.includes('window.duplicateMealItem = duplicateMealItem;'), '6b. duplicateMealItem is exported to window');
  ok(src.includes('onclick="duplicateMealItem(${currentNutritionDayIndex}, ${mIdx})"'), '6c. each meal card has a Duplica button');
  ok(src.includes('function openDuplicateMealDayModal()') && src.includes('function pickDuplicateMealDay(dayName, existingDayIdx)'),
    '6d. the day picker and its selection handler are declared');
  const finishStart = src.indexOf('function finishDuplicateMeal(mealName)');
  const finishBody = src.slice(finishStart, src.indexOf('\nwindow.finishDuplicateMeal', finishStart));
  ok(finishBody.includes('JSON.parse(JSON.stringify(sourceMeal.foods'), '6e. duplicated foods are deep-cloned, not shared by reference with the source meal');
  ok(finishBody.includes('ensureTargetMealSlot(targetDayIdx, mealName)'), '6f. the target meal is created by name if it does not already exist in the target day');
  ok(finishBody.includes("DATA.nutrition.days.push({ day: targetInfo.dayName"), '6g. the target day is created if it does not already exist');
  // The day must NOT be created while the meal-name picker is still open (only on confirm) -
  // pickDuplicateMealDay must not itself push into DATA.nutrition.days.
  const pickStart = src.indexOf('function pickDuplicateMealDay(dayName, existingDayIdx)');
  const pickBody = src.slice(pickStart, src.indexOf('\nwindow.pickDuplicateMealDay', pickStart));
  ok(!pickBody.includes('DATA.nutrition.days.push'), '6h. picking a not-yet-existing day does not create it until the meal is actually confirmed');
}

// 7. "Aggiungi Pasto" used to be a raw prompt() for a free-text meal name -
// now it offers the same standard-meal-name picker as the other flows, and
// finds-or-creates the meal by name (so picking an existing name doesn't
// duplicate it, and an existing meal's foods are never touched).
for (const src of sources) {
  const fnStart = src.indexOf('function addNutritionMeal(dayIdx)');
  ok(fnStart >= 0, '7a. addNutritionMeal is declared');
  const fnBody = src.slice(fnStart, src.indexOf('\n}', fnStart) + 1);
  ok(!fnBody.includes('= prompt('), '7b. addNutritionMeal no longer uses a raw prompt() for the meal name');
  ok(fnBody.includes('openMealTargetModal(') && fnBody.includes('ensureTargetMealSlot(dayIdx, mealName)'),
    '7c. addNutritionMeal reuses the shared meal picker and finds-or-creates the meal by name');
}

// 8. The top-of-page nutrition SALVA button used to only show a toast, which
// wasn't read as a firm confirmation - it should match the bottom-right
// global SALVA button's unmistakable alert().
for (const src of sources) {
  const fnStart = src.indexOf('async function saveNutritionPlanEdits()');
  const fnBody = src.slice(fnStart, src.indexOf('\n}', fnStart) + 1);
  ok(fnBody.includes("alert('Alimentazione salvata correttamente.')"), '8a. saveNutritionPlanEdits confirms success with an unmissable alert(), matching saveAll()');
  ok(fnBody.includes('cloudSynced'), '8b. the confirmation still distinguishes a real cloud save from a local-only one');
}

// 9. "Esporta Alimentazione": a nutrition-only PDF export, reusing the
// existing PDF builder's already-built "PIANO ALIMENTARE" section instead of
// requiring the user to go through the training PDF export and tick a box.
for (const src of sources) {
  ok(src.includes('function exportNutritionPdf()'), '9a. exportNutritionPdf is declared');
  ok(src.includes('window.exportNutritionPdf = exportNutritionPdf;'), '9b. exportNutritionPdf is exported to window');
  ok(src.includes('onclick="exportNutritionPdf()"'), '9c. the Nutrition page has an Esporta Alimentazione button');
  const fnStart = src.indexOf('function exportNutritionPdf()');
  const fnBody = src.slice(fnStart, src.indexOf('\nwindow.exportNutritionPdf', fnStart));
  ok(fnBody.includes('skipTraining: true'), '9d. exportNutritionPdf skips the training-weeks section instead of requiring a training program');
  // The training-weeks loop must actually respect skipTraining, and existing
  // training-PDF callers (which never pass it) must be completely unaffected.
  const buildStart = src.indexOf('function buildWorkoutPdfBytes(opts)');
  const loopStart = src.indexOf('for (var wi = startW; wi <= endW', buildStart);
  ok(loopStart >= 0 && src.slice(loopStart, loopStart + 60).includes('!opts.skipTraining'),
    '9e. the training-weeks loop is skipped only when skipTraining is explicitly set');
}

console.log('\nAll food diary editing tests passed.');
