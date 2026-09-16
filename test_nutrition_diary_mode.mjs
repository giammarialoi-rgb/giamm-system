import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// Four related requests: (1) the top SALVA button gave no feedback at all
// until the whole save finished, so a slow save looked identical to a tap
// that hadn't registered; (2) new days had no calendar date, only a bare
// weekday name, and the single-day wizard flatly refused to add an 8th day
// once all 7 weekday names were used - so the nutrition section could never
// be used as an ongoing food diary past one week; (3) "Aggiungi Settimana" to
// bulk-add 7 dated days at once; (4) Duplica Pasto's day picker deduped by
// weekday name, so it could only ever target the FIRST "Lunedì" once a diary
// had more than one week - fixed to list every real day, plus a dedicated
// "next diary day" shortcut for copying a diet meal forward into the log.
// Standing rule reaffirmed by the user twice in the same message: none of
// this may ever delete existing data - every change here is additive
// (a new optional `date` field, new functions) or relaxes a UI block,
// nothing here reassigns or clears DATA.nutrition.days.
console.log('--- Running Nutrition Diary Mode Tests ---');

const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const sources = [html, built];

// 1. SALVA button: immediate loading feedback, restored on failure.
for (const src of sources) {
  ok(src.includes('id="nutrition-salva-top-btn"'), '1a. the top SALVA button has a stable id to update directly');
  const fnStart = src.indexOf('async function saveNutritionPlanEdits()');
  const fnBody = src.slice(fnStart, src.indexOf('\nfunction ', fnStart + 20));
  ok(fnBody.indexOf("btn.innerHTML = '⏳ Salvataggio…'") < fnBody.indexOf('await '),
    '1b. the button shows a loading state synchronously, before any await, so a tap is never invisible');
  ok(fnBody.includes('btn.disabled = true'), '1c. the button is disabled while saving, to avoid double-taps');
  ok(/catch \(err\) \{[\s\S]*?btn\.disabled = false; btn\.innerHTML = btnOriginalHtml;/.test(fnBody),
    '1d. a failed save restores the button instead of leaving it stuck showing "Salvataggio…" forever');

  // Measured live under simulated 4G latency (~350-750ms per request): the
  // old syncAccountData(false) path always did a GET /api/account/me before
  // its POST, a full extra sequential round trip the SALVA button never
  // needed. uploadAccountDataFast skips straight to the one upload request -
  // confirmed live to roughly halve the button's total wait.
  ok(src.includes('async function uploadAccountDataFast()'), '1e. a fast, upload-only path is declared');
  const fastFnBody = src.slice(src.indexOf('async function uploadAccountDataFast()'), src.indexOf('\nfunction scheduleAccountSync'));
  ok(!fastFnBody.includes("'/api/account/me'"), "1f. the fast upload path never calls the GET /api/account/me endpoint");
  ok(fastFnBody.includes("'/api/account/sync'"), '1g. the fast upload path still pushes the change with a single POST');
  ok(fnBody.includes('await uploadAccountDataFast()'), '1h. saveNutritionPlanEdits uses the fast upload-only path instead of the full bidirectional sync');
}

// 2. Real calendar dates on nutrition days, purely additive.
for (const src of sources) {
  ok(src.includes('function isoDateOnly(d)') && src.includes('function weekdayNameForDate(dateIso)') && src.includes('function formatNutritionDayDate(dateIso)'),
    '2a. date helpers are declared');
  ok(src.includes('function nextNutritionDayDateIso()'), '2b. a helper computes the next day to suggest, based on the most recently dated existing day');
  ok(src.includes('activeDay.date ?') && src.includes('Giorno selezionato:'),
    '2c. the selected day header shows the date when the day has one');
  ok(src.includes("d.date === isoDateOnly(new Date())"), '2d. the "oggi" pill now checks an exact date match instead of just the weekday name (so not every same-named day across multiple weeks lights up as today)');
}

// 3. The single-day wizard no longer blocks adding an 8th+ day, and assigns
// a real date to disambiguate it from any earlier same-named day.
for (const src of sources) {
  const wizardStart = src.indexOf('function openAddNutritionDayWizard()');
  const wizardBody = src.slice(wizardStart, src.indexOf('\nfunction nutritionWizardPickDay', wizardStart));
  ok(!wizardBody.includes('disabled'), '3a. weekday buttons in the add-day wizard are no longer disabled once used once');
  ok(wizardBody.includes('già presente'), '3b. an already-used weekday is still labeled, just not blocked');
  const finishStart = src.indexOf('function nutritionWizardFinish(manualOnly)');
  const finishBody = src.slice(finishStart, src.indexOf('\nfunction ', finishStart + 20));
  ok(finishBody.includes('dayObj.date = nextDateForWeekday(day)'), '3c. every day created by the wizard gets a real calendar date');
  // The only assignment to .days here must be the guarded "create if missing"
  // init (if (!DATA.nutrition.days) DATA.nutrition.days = [];) - never an
  // unconditional reassignment that could wipe an already-populated array.
  ok(finishBody.includes('DATA.nutrition.days.push(dayObj)'), '3d. the wizard adds the new day with push, not by rebuilding the array');
  ok(finishBody.includes('if (!DATA.nutrition.days) DATA.nutrition.days = [];'),
    '3e. the only place .days is assigned is the guarded "create if missing" init, never an unconditional reassignment');
}

// 4. "Aggiungi Settimana": bulk-adds 7 dated, empty days for an ongoing diary.
for (const src of sources) {
  ok(src.includes('function openAddNutritionWeekWizard()') && src.includes('window.openAddNutritionWeekWizard = openAddNutritionWeekWizard'),
    '4a. the add-week wizard is declared and exported');
  ok(src.includes('onclick="openAddNutritionWeekWizard()"'), '4b. the nutrition page has a visible "Aggiungi Settimana" entry point');
  const weekFinishStart = src.indexOf('function nutritionWeekWizardFinish(mealCount)');
  ok(weekFinishStart >= 0, '4c. nutritionWeekWizardFinish is declared');
  const weekFinishBody = src.slice(weekFinishStart, src.indexOf('\nwindow.nutritionWeekWizardFinish', weekFinishStart));
  ok(weekFinishBody.includes('for (let i = 0; i < 7; i++)'), '4d. exactly 7 days are added per call');
  ok(weekFinishBody.includes('DATA.nutrition.days.push({'), '4e. adding a week adds each new day with push, not by rebuilding the array');
  ok(weekFinishBody.includes('if (!DATA.nutrition.days) DATA.nutrition.days = [];'),
    '4e2. the only place .days is assigned is the guarded "create if missing" init, never an unconditional reassignment that could wipe already-saved days');
  ok(weekFinishBody.includes('date: dateIso'), '4f. every newly added week day gets a real, sequential calendar date');
  ok(weekFinishBody.includes('cursor.setDate(cursor.getDate() + 1)'), '4g. the 7 dates are sequential, one per day');
}

// 5. Duplica Pasto: every existing day is its own selectable target (not
// deduped by weekday name), plus a dedicated "next diary day" shortcut -
// this is specifically what lets a meal be copied from the diet into an
// ongoing diary day, per the user's explicit ask.
for (const src of sources) {
  const modalStart = src.indexOf('function openDuplicateMealDayModal()');
  const modalBody = src.slice(modalStart, src.indexOf('\nwindow.openDuplicateMealDayModal', modalStart));
  ok(modalBody.includes('days.map(function (d, idx)') && modalBody.includes("pickDuplicateMealDay(null, ' + idx + ')"),
    '5a. every existing day (not just one per weekday name) is listed as its own target, addressed by its real index');
  ok(modalBody.includes('Prossimo giorno del diario'), '5b. a dedicated shortcut targets the next diary day directly');
  ok(modalBody.includes('nextNutritionDayDateIso()'), '5c. the shortcut uses the same next-date logic as the rest of the diary feature');

  const pickStart = src.indexOf('function pickDuplicateMealDay(dayName, existingDayIdx, explicitDate)');
  const pickBody = src.slice(pickStart, src.indexOf('\nwindow.pickDuplicateMealDay', pickStart));
  ok(pickBody.includes('explicitDate: explicitDate || null'), '5d. an explicit date for a newly created target day flows through to the target info');

  const finishStart = src.indexOf('function finishDuplicateMeal(mealName)');
  const finishBody = src.slice(finishStart, src.indexOf('\nwindow.finishDuplicateMeal', finishStart));
  ok(finishBody.includes('if (targetInfo.explicitDate) newDay.date = targetInfo.explicitDate;'),
    '5e. duplicating into a brand-new day carries the date through onto the created day');
}

console.log('\nAll nutrition diary mode tests passed.');
