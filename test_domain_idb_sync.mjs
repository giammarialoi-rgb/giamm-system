import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// Regression coverage for a critical data-loss bug: nutrition/supplementation/
// therapy/exams are deliberately stripped out of the localStorage snapshot
// (sanitizeStoreForLocalStorage keeps only a lightweight store there; the real
// payload belongs in IndexedDB), but saveFoodItem/deleteFoodItem/
// saveSupplementItem/saveTherapyItem/saveExamRecord/the "add day" wizard only
// ever called persist() - never the GiammariaPersistence.saveNutrition/
// saveSupplements/saveTherapy/saveExams call that actually reaches IndexedDB.
// Reproduced live: add a nutrition day, log a food, reload the page -> the
// entire day was gone. Fixed by scheduling a debounced IDB sync for all four
// domains from persist() itself (mirroring the pattern already used for
// workout logs and rewards), so every future screen gets this for free
// instead of needing to remember an explicit save call.
console.log('--- Running Domain IndexedDB Sync Tests ---');

const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');

for (const src of [html, built]) {
  ok(/scheduleWorkoutLogsIdbSync\(\);\s*\n\s*scheduleRewardsIdbSync\(\);\s*\n\s*scheduleNutritionIdbSync\(\);\s*\n\s*scheduleSupplementsIdbSync\(\);\s*\n\s*scheduleTherapyIdbSync\(\);\s*\n\s*scheduleExamsIdbSync\(\);/.test(src),
    'persist() schedules IDB sync for nutrition, supplementation, therapy and exams alongside the existing workout logs/rewards sync');
}

const domains = [
  ['scheduleNutritionIdbSync', 'saveNutrition', 'store.nutrition'],
  ['scheduleSupplementsIdbSync', 'saveSupplements', 'store.supplementation'],
  ['scheduleTherapyIdbSync', 'saveTherapy', 'store.therapy'],
  ['scheduleExamsIdbSync', 'saveExams', 'store.exams']
];

for (const [fnName, saveFn, storeField] of domains) {
  for (const src of [html, built]) {
    ok(src.includes('function ' + fnName + '('), `${fnName} is declared`);
    const fnStart = src.indexOf('function ' + fnName + '(');
    const fnBody = src.slice(fnStart, fnStart + 800);
    ok(fnBody.includes('GiammariaPersistence.' + saveFn), `${fnName} calls GiammariaPersistence.${saveFn}`);
    ok(fnBody.includes(storeField), `${fnName} reads ${storeField}`);
    ok(fnBody.includes('coachAssigning') && fnBody.includes('coachViewingClient'),
      `${fnName} skips syncing while acting as a coach on someone else's data`);
  }
}

// The four save calls already scattered at explicit call sites (clear, import,
// generate plan, ...) must keep working too - this is additive, not a replacement.
ok(html.includes('GiammariaPersistence.saveNutrition(DATA.nutrition)'), 'existing explicit saveNutrition call sites are untouched');

// Quantity/unit fixes from the same investigation: an explicit "Pezzo/i" unit
// (1 uovo, 4 fette) so users are not limited to grams or a generic "porzione",
// and the portion-size guess distinguishes egg white/yolk/whole egg.
ok(html.includes('id="food-unit-input"') && html.includes('value="pezzi">Pezzo/i'), 'manual food entry offers a Pezzo/i unit (e.g. 1 uovo, 4 fette)');
ok(html.includes("u === 'pezzi' || u === 'pezzo' || u === 'fetta' || u === 'fette'"), 'foodQtyToGrams converts the pezzi/fetta unit using the food-aware portion guess');
ok(html.includes("if (/albume/.test(n)) return 33") && html.includes("if (/tuorlo/.test(n)) return 18"), 'guessPortionGrams distinguishes egg white/yolk from a whole egg (uovo)');

console.log('\nAll domain IndexedDB sync tests passed.');
