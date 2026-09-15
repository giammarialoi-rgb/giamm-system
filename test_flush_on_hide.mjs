import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// Real incident: food logged around 2-2:30pm on an iPhone via Safari, gone
// later the same day. iOS Safari suspends a backgrounded tab's JS far more
// aggressively than desktop/Android - switching apps (a call, a message,
// anything) can freeze the tab within a couple hundred milliseconds. Every
// domain write (nutrition, supplements, therapy, exams, workout logs,
// rewards) and the cloud upload were all debounced 600-1500ms after
// persist(), on the assumption the tab would stay alive that long. The
// optimistic "Alimento aggiunto" toast already fired by then, so nothing
// looked wrong - the durable write itself just never got to run.
console.log('--- Running Flush-On-Hide Tests ---');

const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');

const scheduleFns = [
  ['scheduleWorkoutLogsIdbSync', 'saveWorkoutLogsSnapshot'],
  ['scheduleRewardsIdbSync', 'saveRewardsSnapshot'],
  ['scheduleNutritionIdbSync', 'saveNutrition'],
  ['scheduleSupplementsIdbSync', 'saveSupplements'],
  ['scheduleTherapyIdbSync', 'saveTherapy'],
  ['scheduleExamsIdbSync', 'saveExams']
];

for (const src of [html, built]) {
  for (const [fnName, saveCall] of scheduleFns) {
    const fnStart = src.indexOf('function ' + fnName + '(immediate)');
    ok(fnStart >= 0, `${fnName} accepts an immediate flag instead of always debouncing`);
    const fnBody = src.slice(fnStart, src.indexOf('\n}', fnStart) + 2);
    ok(fnBody.includes('if (immediate) { run(); return; }'),
      `${fnName} runs its save synchronously right away when immediate is set, skipping the debounce`);
    ok(fnBody.includes('GiammariaPersistence.' + saveCall), `${fnName} still calls GiammariaPersistence.${saveCall}`);
  }

  const accStart = src.indexOf('function scheduleAccountSync(immediate)');
  ok(accStart >= 0, 'scheduleAccountSync also accepts an immediate flag');
  const accBody = src.slice(accStart, src.indexOf('\n}', accStart) + 2);
  ok(accBody.includes('if (immediate) { run(); return; }'), 'scheduleAccountSync skips its 1.5s debounce when flushed immediately');

  ok(src.includes('function flushPendingPersistSyncs()'), 'flushPendingPersistSyncs is declared');
  const flushStart = src.indexOf('function flushPendingPersistSyncs()');
  const flushBody = src.slice(flushStart, src.indexOf('\n}', flushStart) + 2);
  for (const [fnName] of scheduleFns) {
    ok(flushBody.includes(fnName + '(true)'), `flushPendingPersistSyncs flushes ${fnName} immediately`);
  }
  ok(flushBody.includes('scheduleAccountSync(true)'), 'flushPendingPersistSyncs also flushes the cloud upload immediately');

  // visibilitychange->hidden is the reliable signal on iOS Safari (unlike
  // beforeunload, which it frequently skips) that a tab is about to be
  // suspended - pagehide is a second safety net for outright navigation/close.
  ok(/document\.addEventListener\('visibilitychange', function \(\) \{\s*if \(document\.visibilityState === 'hidden'\) flushPendingPersistSyncs\(\);/.test(src),
    'a visibilitychange listener flushes pending syncs the moment the tab is hidden');
  ok(src.includes("window.addEventListener('pagehide', flushPendingPersistSyncs)"),
    'a pagehide listener also flushes pending syncs as a second safety net');
}

console.log('\nAll flush-on-hide tests passed.');
