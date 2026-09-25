// The coach navigation gate must stay armed while an assignment is open.
//
// It used to disarm itself there (`store.coachSessionActive && !store.coachAssigning`).
// beginAssignSandbox navigates into the personal training/import views, so with
// the gate off the coach could carry on into the rest of the personal app while
// DATA and store.activeProgram still held the client's draft - and everything
// there reads as the coach's own program. Reported as assigning a program to a
// client replacing the coach's personal one.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

const src = fs.readFileSync(
  path.resolve(root, process.argv[2] || 'web/coach-practice-ui.js'),
  'utf8'
);

function bodyOf(needle, chars) {
  const i = src.indexOf(needle);
  assert.ok(i !== -1, `anchor not found: ${needle}`);
  return src.slice(i, i + chars);
}

// --- the gate itself ---
{
  const gate = bodyOf('navigate = function (v, e) {', 1800);
  ok(
    /store\.coachSessionActive\s*&&\s*!window\.__cpExitingCoach/.test(gate),
    'the navigate gate is armed whenever a coach session is active'
  );
  ok(
    !/coachSessionActive\s*&&\s*!store\.coachAssigning/.test(gate),
    'the gate no longer disarms itself while an assignment is open'
  );
}

// --- the domains an assignment needs are still reachable ---
{
  const gate = bodyOf('navigate = function (v, e) {', 3000);
  ok(
    /\(store\.coachViewingClient \|\| store\.coachAssigning\) && clientDomains\[raw\]/.test(gate),
    'client domains stay allowed during an assignment'
  );
  // There are two clientDomains maps; this must be the one inside the navigate
  // wrapper, not gatePracticeView's narrower copy.
  const wrapperAt = src.indexOf('navigate = function (v, e) {');
  const domainsAt = src.indexOf('const clientDomains = { training: 1', wrapperAt);
  assert.ok(domainsAt !== -1, 'clientDomains not found inside the navigate wrapper');
  const domains = src.slice(domainsAt, domainsAt + 220);
  for (const d of ['training', 'nutrition', 'import', 'programs']) {
    ok(new RegExp(`\\b${d}: 1`).test(domains), `"${d}" is reachable while assigning`);
  }
}

// --- leaving for the personal app mid-assignment is refused ---
{
  const gate = bodyOf('navigate = function (v, e) {', 4200);
  const refusal = /store\.coachAssigning && \(raw === 'home' \|\| raw === 'settings'\)[\s\S]{0,700}?return;/.exec(gate);
  ok(!!refusal, 'home/settings during an assignment is refused instead of silently leaving');
  ok(
    /__cpAssignBarExpanded = true/.test(refusal[0]),
    'the refusal expands the assign banner, so the reason and the way out are on screen'
  );
  ok(
    !/coachSessionActive = false/.test(refusal[0]),
    'the refusal does not turn the coach session off - that is the path that loses data'
  );
}

// --- outside an assignment, leaving still works ---
{
  const gate = bodyOf('navigate = function (v, e) {', 7000);
  ok(
    /if \(raw === 'home' \|\| raw === 'settings'\) \{[\s\S]{0,1200}?\n\s*store\.coachSessionActive = false;\s*\n\s*store\.coachViewingClient = false;\s*\n\s*\}/.test(gate),
    'without an assignment open, home/settings still exits coach mode'
  );
  ok(
    /if \(store\.coachViewingClient\) \{[\s\S]{0,400}?Promise\.resolve\(leaveCoachClientView\(true\)\)\.then\(go, go\);/.test(gate),
    'and from an athlete view it puts the coach\'s own area back first'
  );
}

// --- the sandbox announces itself ---
{
  const begin = bodyOf('function beginAssignSandbox', 700);
  ok(
    /__cpAssignBarExpanded = true/.test(begin),
    'the assign banner opens expanded, so a client draft is not mistaken for the coach program'
  );
}

console.log('\nAll coach assign gate tests passed.');
