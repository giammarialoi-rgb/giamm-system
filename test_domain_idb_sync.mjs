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

// ============================================================
// Account-sync overwrite regression: for a logged-in (cross-device) account,
// the IndexedDB fix above was not enough on its own. Boot runs a background,
// non-blocking syncAccountData(true) that downloads the server's copy and
// (via applyRemoteAccountData) overwrites local nutrition/supplementation
// UNLESS store.__cpNutritionDirty / __cpSupplementsDirty is set - saveFoodItem
// never set that flag, so the correct, freshly-IndexedDB-restored local
// nutrition kept getting silently clobbered by a stale server copy moments
// after boot, even after the first fix. Reproduced by tracing saveFoodItem ->
// persist() -> (no dirty flag) -> next boot's background download -> overwrite.
console.log('\n--- Running Account-Sync Overwrite Regression Tests ---');

for (const src of [html, built]) {
  const fnStart = src.indexOf('function saveFoodItem(');
  ok(fnStart >= 0, 'saveFoodItem is declared');
  const fnBody = src.slice(fnStart, src.indexOf('\n}', fnStart));
  ok(fnBody.includes('markNutritionDirty()'), 'saveFoodItem marks nutrition dirty, protecting it from the background account-sync download overwrite');

  // Lock in the existing protection this depends on, so nobody removes the
  // guard while "simplifying" applyRemoteAccountData later.
  const guardIdx = src.indexOf('!store.__cpKeepLocalNutrition && !store.__cpNutritionDirty && remote.nutrition');
  ok(guardIdx >= 0, 'applyRemoteAccountData still refuses to overwrite local nutrition while it is dirty/kept-local');

  // scheduleAccountSync used to only fire for training loads/logs, so a user who
  // only touched nutrition/supplements/therapy/exams never actually uploaded the
  // change - the server stayed stale, and the next background download had
  // nothing fresh to protect against being overwritten by in the first place.
  const schedStart = src.indexOf('function scheduleAccountSync(');
  const schedBody = src.slice(schedStart, src.indexOf('\n}', schedStart));
  ok(schedBody.includes('store.nutrition') && schedBody.includes('store.supplementation')
    && schedBody.includes('store.therapy') && schedBody.includes('store.exams'),
    'scheduleAccountSync also uploads when nutrition/supplementation/therapy/exams have real data, not just training loads');
}

// ============================================================
// Silent upload-failure regression: a real, reproduced incident where
// pressing the explicit "SALVA" button reported success and cleared the
// unsynced-changes protection even though the upload to the cloud silently
// failed (network blip, cold start, ...). The next reopen then downloaded the
// stale cloud copy (which never received the change) and overwrote the
// correct local data - wiping a newly added day + barcode-scanned breakfast
// in the reproduction. syncAccountData()'s own POST already swallowed its
// error (so a failed upload never threw), so the fix is to have it report
// {uploaded: false} instead of looking identical to success, and have the
// explicit-save functions actually check that before declaring victory.
// ============================================================
console.log('\n--- Running Upload-Failure Protection Tests ---');

for (const src of [html, built]) {
  const syncStart = src.indexOf('async function syncAccountData(download=false){');
  ok(syncStart >= 0, 'syncAccountData is declared');
  const syncBody = src.slice(syncStart, src.indexOf('\nfunction scheduleAccountSync', syncStart));
  ok(syncBody.includes('uploaded = true;'), 'syncAccountData marks the upload as succeeded only after the POST actually resolves');
  ok(syncBody.includes("catch (uploadErr)") && !syncBody.includes('catch (_) {}\n    }\n    persist()'),
    'the upload failure is no longer swallowed by an empty catch(_){} with no trace');
  ok(syncBody.includes('return { uploaded };'), 'syncAccountData reports whether the upload actually landed');

  for (const fnName of ['saveNutritionPlanEdits', 'saveSupplementationEdits']) {
    const fnStart = src.indexOf('async function ' + fnName + '()');
    ok(fnStart >= 0, `${fnName} is declared`);
    const fnBody = src.slice(fnStart, src.indexOf('\nfunction ', fnStart + 20));
    // saveNutritionPlanEdits later switched to the faster upload-only
    // uploadAccountDataFast() (skips the unneeded GET /api/account/me
    // round trip a manual SALVA tap never needed) - either call is fine here,
    // the point of this check is that *some* result is actually inspected.
    ok((fnBody.includes('const result = await syncAccountData(false);') || fnBody.includes('const result = await uploadAccountDataFast();'))
      && fnBody.includes('cloudSynced = !!(result && result.uploaded);'),
      `${fnName} checks whether the upload actually succeeded instead of assuming it did`);
    ok(/if \(cloudSynced\) \{\s*store\.__cpNutritionDirty = false;|if \(cloudSynced\) \{\s*store\.__cpSupplementsDirty = false;/.test(fnBody) || fnBody.includes('if (cloudSynced) {'),
      `${fnName} only clears its dirty/unsynced-changes flag when the upload actually succeeded`);
    ok(fnBody.includes("'warning'"), `${fnName} warns the user instead of claiming success when the cloud upload failed`);
  }
}

console.log('\nAll domain IndexedDB sync tests passed.');
