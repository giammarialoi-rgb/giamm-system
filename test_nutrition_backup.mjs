import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GiammariaPersistenceEngine, NUTRITION_BACKUP_MAX } from './persistence-core.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// A real, reported data-loss incident ("avevo segnato un giorno e mezzo ed è
// completamente sparito") happened right after a deploy, and the exact
// mechanism could not be conclusively pinned down from code review alone -
// the sync/merge protections (dirty flags) all check out on paper, several
// times over across this project's history. Training already has a safety
// net for this class of problem (workoutUndo, with its own "ANNULLA ULTIMA
// MODIFICA" button) but it is in-memory only - stripped from the localStorage
// snapshot (see persist()'s `delete sanitized.workoutUndo`) - so it can't
// help with a loss discovered only after a reload, which is exactly when
// nutrition data-loss reports keep happening. This is nutrition's own,
// DURABLE (survives reload/app-restart) equivalent: every place that is
// about to replace local nutrition with something from a remote sync or a
// legacy-plan reset now backs up the value being replaced first, and the
// backups can be listed and restored from the app.
console.log('--- Running Nutrition Backup Safety Net Tests ---');

// 1. Pure engine behavior against the in-memory IndexedDB fallback (used
// automatically when no real indexedDB is present, e.g. here in Node).
{
  const p = new GiammariaPersistenceEngine();
  const r1 = await p.backupNutrition({ days: [{ day: 'Lunedì', meals: [{ name: 'Cena', foods: [{ name: 'Pasta' }] }] }] });
  ok(r1.success === true, '1a. backupNutrition succeeds for a plan with real days');

  const rEmpty = await p.backupNutrition({ days: [] });
  ok(rEmpty.success === false, '1b. backupNutrition refuses to store a backup with no real content (nothing worth recovering)');

  await p.backupNutrition({ days: [{ day: 'Martedì' }, { day: 'Mercoledì' }] });
  const list = await p.listNutritionBackups();
  ok(list.length === 2, '1c. listNutritionBackups returns every stored backup');
  ok(list[0].dayCount === 2, '1d. the most recent backup sorts first');

  const restored = await p.getNutritionBackup(list[0].id);
  ok(Array.isArray(restored.days) && restored.days.length === 2, '1e. getNutritionBackup returns the exact stored plan');

  // Rotation: keep only the newest NUTRITION_BACKUP_MAX backups, so this
  // can't grow without bound across a long-lived account.
  const p2 = new GiammariaPersistenceEngine();
  for (let i = 0; i < NUTRITION_BACKUP_MAX + 3; i++) {
    await p2.backupNutrition({ days: [{ day: 'Giorno ' + i }] });
    await new Promise((r) => setTimeout(r, 2)); // distinct timestamps -> distinct ids
  }
  const list2 = await p2.listNutritionBackups();
  ok(list2.length === NUTRITION_BACKUP_MAX, '1f. old backups beyond the cap are pruned, newest kept');
}

// 2. A backup also carrying only customFoods (no days) still counts as real
// content worth keeping - the personal food library can outlive every day.
{
  const p = new GiammariaPersistenceEngine();
  const r = await p.backupNutrition({ days: [], customFoods: [{ name: 'Formaggio Modditzosu' }] });
  ok(r.success === true, '2. backupNutrition also protects a customFoods-only plan');
}

// 3. Static checks: every place that replaces local nutrition with a
// remote/reset value must back up what it is about to discard first.
const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
for (const src of [html, built]) {
  const backupCallCount = (src.match(/GiammariaPersistence\.backupNutrition\(/g) || []).length;
  ok(backupCallCount >= 5, '3a. backupNutrition is called at every nutrition-overwrite site (takeRemote branch, domain-only branch, both legacy-wipe resets, and the manual restore flow)');

  ok(src.includes('function openNutritionBackupsModal()') && src.includes('window.openNutritionBackupsModal = openNutritionBackupsModal'),
    '3b. the backup-recovery modal is declared and exported');
  ok(src.includes('function restoreNutritionBackup(id)') || src.includes('async function restoreNutritionBackup(id)'),
    '3c. restoreNutritionBackup is declared');
  ok(src.includes('onclick="openNutritionBackupsModal()"'), '3d. the nutrition page has a visible entry point to the backup list');

  const restoreStart = src.indexOf('async function restoreNutritionBackup(id)');
  const restoreBody = src.slice(restoreStart, src.indexOf('\nwindow.restoreNutritionBackup', restoreStart));
  ok(restoreBody.includes('markNutritionDirty()'), '3e. restoring a backup marks nutrition dirty so a stale remote sync cannot immediately re-overwrite it');
}

// 4. A real, independently-found bug: the "upload failed" branch of
// saveNutritionPlanEdits set __cpKeepLocalNutrition to false while its own
// comment said "Keep it dirty/protected" - the opposite of its stated
// intent. __cpNutritionDirty alone still guarded every read site, so this
// wasn't provably the cause of any specific incident, but it removed one of
// the two protection layers for no reason and is fixed regardless.
for (const src of [html, built]) {
  const fnStart = src.indexOf('async function saveNutritionPlanEdits()');
  const fnBody = src.slice(fnStart, src.indexOf('\nfunction ', fnStart + 20));
  ok(/Keep it dirty\/protected[\s\S]*?store\.__cpKeepLocalNutrition = true;/.test(fnBody),
    '4. the failed-cloud-upload branch now actually keeps the local-protection flag true, matching its own comment');
}

console.log('\nAll nutrition backup safety net tests passed.');
