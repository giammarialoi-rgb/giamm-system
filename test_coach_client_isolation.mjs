import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// Two related coach-workflow bugs, both reported live: (1) the coach's own
// personal body weight (and several other personal fields) leaked into the
// "assign a new client" sandbox - visible as if it belonged to the client
// being set up, even though it's never supposed to be shared at all; (2)
// picking a training-program suggestion for a new client ignored both the
// client's gender and the training-days-per-week they were just given,
// surfacing e.g. women's 4-day programs for a man who trains 3 days.
// Standing rule reaffirmed explicitly: none of this may touch the coach's
// own personal training data - snapshotCoachMaster()/restoreCoachMaster()
// already back it up and restore it around every sandbox session untouched;
// this only closes a gap in what gets cleared while the sandbox is active.
console.log('--- Running Coach/Client Isolation Tests ---');

const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const uiSrc = fs.readFileSync(path.join(root, 'web/coach-practice-ui.js'), 'utf8');

// 1. resetSandboxSessionState now clears every personal field snapshotCoachMaster
// backs up (previously only cleared data/customSets/subs/skips/logs/intelTargets),
// so none of the coach's own logged data can leak into a client-assignment sandbox.
{
  const fnStart = uiSrc.indexOf('function resetSandboxSessionState()');
  ok(fnStart >= 0, '1a. resetSandboxSessionState is declared');
  const fnBody = uiSrc.slice(fnStart, uiSrc.indexOf('\n}', fnStart) + 2);
  for (const field of ['data', 'customSets', 'subs', 'skips', 'logs', 'intelTargets', 'bw', 'bodyChecks', 'nutritionDaily', 'exMuscle', 'loadTypes', 'tempos', 'bonus', 'warmups', 'warmupProgress', 'warmupAssignment']) {
    ok(fnBody.includes('store.' + field + ' = '), `1b. resetSandboxSessionState clears store.${field}`);
  }
}

// 2. snapshotCoachMaster/restoreCoachMaster remain the source of truth for
// what "the coach's personal data" even means here - the reset list above
// must be a subset of what gets backed up and restored, never diverging
// (never clearing something that isn't safely restorable on cancel/exit).
{
  const snapStart = uiSrc.indexOf('function snapshotCoachMaster()');
  const snapBody = uiSrc.slice(snapStart, uiSrc.indexOf('\n}', snapStart) + 2);
  const restoreStart = uiSrc.indexOf('function restoreCoachMaster(backup)');
  const restoreBody = uiSrc.slice(restoreStart, uiSrc.indexOf('\n}', restoreStart) + 2);
  for (const field of ['bw', 'bodyChecks', 'nutritionDaily', 'exMuscle', 'loadTypes', 'tempos', 'bonus', 'warmups', 'warmupProgress', 'warmupAssignment']) {
    ok(snapBody.includes('bw: store.bw' === field ? '' : field) || snapBody.includes(field + ':'), `2a. snapshotCoachMaster backs up ${field}`);
    ok(restoreBody.includes('store.' + field + ' = backup.' + field), `2b. restoreCoachMaster restores ${field} from the backup`);
  }
}

// 3. resetSandboxSessionState is only ever called from the coachAssigning
// sandbox flows, never from the separate coachViewingClient live-session
// path (which populates all of these from the client's own synced data via
// applyClientPayloadToLocal instead) - confirms clearing them is always safe.
{
  const callSites = (uiSrc.match(/resetSandboxSessionState\(\);/g) || []).length;
  ok(callSites === 3, '3a. resetSandboxSessionState has exactly the three known call sites (beginAssignSandbox, seedAssignSandboxFromClient, the coach-library assign picker)');
  const applyStart = uiSrc.indexOf('function applyClientPayloadToLocal(payload)');
  const applyBody = uiSrc.slice(applyStart, uiSrc.indexOf('\nfunction ', applyStart + 20));
  ok(applyBody.includes('store.bw = payload.bw'), '3b. the live-session client-view path already correctly sources bw from the client\'s own payload, independently of this fix');
  ok(applyBody.includes('store.warmups = payload.warmups'), '3d. the live-session client-view path sources the client\'s own warm-ups from their payload, same as every other personal field');
  ok(!applyBody.includes('resetSandboxSessionState'), '3c. applyClientPayloadToLocal does not call resetSandboxSessionState - the two paths are properly independent');
}

// 4. suggestProgramsForProfile: gender is now actually checked (it never was
// before), and the day-count signal comes from the client's own intake while
// setting up a client, not store.prefs.frequency (a leftover/default from
// whichever program was last being edited in this session - unrelated to a
// brand new client, and the reported cause of "4 giorni" suggestions for a
// client told to train 3).
for (const src of [html, built]) {
  const fnStart = src.indexOf('function suggestProgramsForProfile(profile)');
  ok(fnStart >= 0, '4a. suggestProgramsForProfile is declared');
  const fnBody = src.slice(fnStart, src.indexOf('\nfunction openProgramTemplateCreate', fnStart));
  ok(/femmin/.test(fnBody) && /masch\|uomo/.test(fnBody), '4b. gender is derived from profile.sex using the same convention as the rest of the app (mapIntakeToCatalogFilters)');
  ok(fnBody.includes(".filter((p) => !audience || !p.audience || p.audience === audience)"),
    '4c. programs tagged for the other gender are excluded from suggestions outright, not just de-prioritized');
  ok(fnBody.includes('store.coachWorkspace.intake.sessionsPerWeek'),
    '4d. while setting up a client, the day count comes from that client\'s own intake, not the coach\'s leftover session state');
  ok(fnBody.includes('inCoachClientContext ? 0 :'),
    '4e. outside a coach/client context (the personal profile), store.prefs.frequency is still used as before - this only changes the client-assignment case');
}

console.log('\nAll coach/client isolation tests passed.');
