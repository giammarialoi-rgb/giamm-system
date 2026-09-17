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
// Standing rule reaffirmed explicitly: none of this may touch the coach's own
// personal training data. That used to rest on snapshotCoachMaster() /
// restoreCoachMaster() backing it up and putting it back around each sandbox
// session; it now rests on the coach's data living in its own memory area that
// a sandbox never writes to at all.
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

// 2. There is no snapshot to diverge from any more. What matters instead is
// that every field resetSandboxSessionState() clears is a DOMAIN field.
// Domain fields are accessors onto whichever memory area is active, so
// clearing one during an assignment empties the client's copy. A field that is
// not in the domain list lives on the shared identity object, and clearing it
// there would take it away from the coach as well.
{
  const listStart = html.indexOf('var NURVAN_DOMAIN_FIELDS');
  ok(listStart >= 0, '2a. the domain field list is declared');
  const domainList = html.slice(listStart, html.indexOf('];', listStart));
  const fnStart = uiSrc.indexOf('function resetSandboxSessionState()');
  const fnBody = uiSrc.slice(fnStart, uiSrc.indexOf('\n}', fnStart) + 2);
  const cleared = [...fnBody.matchAll(/store\.(\w+)\s*=/g)].map(m => m[1]);
  ok(cleared.length >= 15, `2b. resetSandboxSessionState clears ${cleared.length} fields`);
  for (const field of cleared) {
    ok(new RegExp("'" + field + "'").test(domainList),
      `2c. "${field}" is a domain field, so clearing it cannot reach the coach's copy`);
  }
  ok(/const left = \(typeof nurvanLeaveClientArea === 'function'\) && nurvanLeaveClientArea\(\)/.test(uiSrc),
    '2d. leaving a client session is a switch back to the personal area, not a copy-back');
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
