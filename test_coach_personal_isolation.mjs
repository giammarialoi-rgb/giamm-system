// Three lists have to agree, or a coach's own data gets overwritten by a
// client's:
//
//   snapshotCoachMaster()   - what is captured when a client session opens
//   persist()               - what is written back over the live store while
//                             that session is open, so the coach's personal
//                             record on disk stays the coach's
//   restoreCoachMaster()    - what is put back when the session ends
//
// persist() used to cover only 16 of the 26 fields the snapshot captured.
// nutritionDaily was among the missing ten, so while a client session was open
// the client's food diary was written into the coach's personal record. A clean
// exit hid it by restoring from memory; a reload or crash did not, and the
// coach lost their own diary. Field lists drift silently, so assert they match.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

const indexHtml = fs.readFileSync(path.resolve(root, process.argv[2] || 'web/index.base.html'), 'utf8');
const coachUi = fs.readFileSync(path.resolve(root, process.argv[3] || 'web/coach-practice-ui.js'), 'utf8');

function sliceBetween(source, startNeedle, endNeedle) {
  const from = source.indexOf(startNeedle);
  assert.ok(from !== -1, `anchor not found: ${startNeedle}`);
  const to = source.indexOf(endNeedle, from);
  assert.ok(to !== -1, `end anchor not found after: ${startNeedle}`);
  return source.slice(from, to);
}

// Bookkeeping fields that are intentionally not part of the personal payload.
const NOT_PAYLOAD = new Set(['DATA', 'currentWeek', 'currentDay']);
// Session locks persist() deliberately forces off; they are not restored data.
const SESSION_LOCKS = new Set(['coachAssigning', 'coachViewingClient', 'coachSessionActive']);

const snapshotFields = new Set(
  [...sliceBetween(coachUi, 'function snapshotCoachMaster', '\n}').matchAll(/^\s{4}(\w+):/gm)]
    .map(m => m[1])
    .filter(f => !NOT_PAYLOAD.has(f))
);

const persistFields = new Set(
  [...sliceBetween(indexHtml, 'const bak = window.__cpAssignBackup', '\n      } else {').matchAll(/^\s{10}(\w+):/gm)]
    .map(m => m[1])
    .filter(f => !SESSION_LOCKS.has(f))
);

const restoreFields = new Set(
  [...sliceBetween(coachUi, 'async function restoreCoachMaster', '\n}').matchAll(/^\s{2}store\.(\w+)\s*=/gm)]
    .map(m => m[1])
    .filter(f => !NOT_PAYLOAD.has(f))
);

ok(snapshotFields.size >= 20, `snapshotCoachMaster captures ${snapshotFields.size} fields`);
ok(persistFields.size >= 20, `persist() protects ${persistFields.size} fields`);
ok(restoreFields.size >= 20, `restoreCoachMaster restores ${restoreFields.size} fields`);

// The field that actually cost a user their food diary.
ok(persistFields.has('nutritionDaily'), 'persist() protects nutritionDaily (the food diary)');
ok(restoreFields.has('nutritionDaily'), 'restoreCoachMaster restores nutritionDaily');

for (const field of snapshotFields) {
  ok(persistFields.has(field), `persist() protects "${field}" while a client session is open`);
}
for (const field of snapshotFields) {
  ok(restoreFields.has(field), `restoreCoachMaster restores "${field}" when the session ends`);
}

// With no snapshot to restore from, persist() must not write at all: it cannot
// tell the coach's data from the client's, and the last good record on disk is
// worth more than a possibly-poisoned new one.
{
  const guarded = sliceBetween(indexHtml, 'const bak = window.__cpAssignBackup', 'if (sanitized && typeof sanitized');
  ok(/\}\s*else\s*\{[\s\S]*?return;/.test(guarded), 'persist() refuses to write when a client session has no coach snapshot');
}
{
  const emergency = sliceBetween(indexHtml, 'localStorage quota exceeded', 'const sanitizedStore');
  ok(/coachViewingClient\)\s*\{[\s\S]*?return;/.test(emergency), 'the emergency minimal write is skipped during a client session');
}

console.log('\nAll coach/personal isolation tests passed.');
