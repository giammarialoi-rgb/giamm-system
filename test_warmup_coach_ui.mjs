import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// Coach OS UI for the Warm-Up Engine: create/generate/pick-from-library a
// draft, save it as a reusable template, and assign it to the currently-
// viewed client with a mandatory/optional choice. Verified live in-browser
// this session (generate-from-client-session, reorder, remove, add-from-
// library all confirmed against real DOM state); this file locks in the
// wiring so it can't silently regress.
console.log('--- Running Warm-Up Coach UI Tests ---');

const uiSrc = fs.readFileSync(path.join(root, 'web/coach-practice-ui.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');

// 1. Every onclick-referenced coach function is exported (same rule as the
// personal editor - confirmed this session that a bare declaration is not
// reachable from onclick="" in this codebase).
{
  // openCoachWarmupAssignModal's onclick lives in index.base.html (the
  // training-session card is where the coach triggers it from); every other
  // function's onclick lives inside coach-practice-ui.js's own modals.
  ok(new RegExp('onclick="openCoachWarmupAssignModal\\(').test(html), '1a. onclick="openCoachWarmupAssignModal()" is wired up in index.base.html');
  ok(uiSrc.includes('window.openCoachWarmupAssignModal = openCoachWarmupAssignModal;'), '1b. openCoachWarmupAssignModal is explicitly exported on window');

  const onclickFns = [
    'moveCoachDraftItem', 'removeCoachDraftItem',
    'clearCoachWarmupDraft', 'generateCoachWarmupDraftFromClientSession',
    'openCoachWarmupTemplatePicker', 'pickCoachWarmupTemplate',
    'openCoachWarmupExercisePicker', 'addCoachDraftLibraryExercise',
    'saveCoachWarmupAsTemplate', 'assignCoachWarmupToClient', 'deactivateCoachWarmupAssignment'
  ];
  for (const fn of onclickFns) {
    ok(new RegExp('onclick="' + fn + '\\(').test(uiSrc), '1a. onclick="' + fn + '(...)" is wired up');
    ok(uiSrc.includes('window.' + fn + ' = ' + fn + ';'), '1b. ' + fn + ' is explicitly exported on window');
  }
  ok(new RegExp('oninput="updateCoachDraftItemField\\(').test(uiSrc), '1c. oninput="updateCoachDraftItemField(...)" is wired up on the draft item fields');
  ok(uiSrc.includes('window.updateCoachDraftItemField = updateCoachDraftItemField;'), '1d. updateCoachDraftItemField is exported on window');
}

// 2. Entry point: the training-session warm-up card offers the coach an
// assign/manage action only while actually viewing a client (never shown to
// a personal/athlete user, and never lets a personal user reach coach-only
// endpoints).
for (const src of [html, built]) {
  ok(src.includes('onclick="openCoachWarmupAssignModal()"'), '2a. the training-session card wires the coach entry point');
  ok(/if \(store && store\.coachViewingClient\) \{\s*\n\s*html \+= '<div style="margin-top:8px/.test(src),
    '2b. the coach-only controls only render inside a store.coachViewingClient check');
}

// 3. Each network call in the coach UI hits the correct, already-tested
// backend route (test_warmup_coach_backend.mjs verifies those routes exist
// and are requireCoach-gated) - this locks the two sides together so they
// can't silently drift apart.
{
  ok(uiSrc.includes("practiceFetch('/api/coach/warmup-templates', { method: 'GET'"), '3a. modal load fetches the template library');
  ok(uiSrc.includes("practiceFetch('/api/coach/clients/' + clientId + '/warmup', { method: 'GET'"), '3b. modal load fetches the client\'s current assignment + completions');
  const saveStart = uiSrc.indexOf('async function saveCoachWarmupAsTemplate()');
  const saveBody = uiSrc.slice(saveStart, uiSrc.indexOf('\n}', saveStart) + 2);
  ok(saveBody.includes("practiceFetch('/api/coach/warmup-templates'") && saveBody.includes("method: 'POST'"),
    '3c. saveCoachWarmupAsTemplate posts to the template-create route');
  const assignStart = uiSrc.indexOf('async function assignCoachWarmupToClient()');
  const assignBody = uiSrc.slice(assignStart, uiSrc.indexOf('\n}', assignStart) + 2);
  ok(assignBody.includes("practiceFetch('/api/coach/clients/' + clientId + '/warmup-assign'"), '3d. assignCoachWarmupToClient posts to the assign route');
  const deactivateStart = uiSrc.indexOf('async function deactivateCoachWarmupAssignment()');
  const deactivateBody = uiSrc.slice(deactivateStart, uiSrc.indexOf('\n}', deactivateStart) + 2);
  ok(deactivateBody.includes("practiceFetch('/api/coach/clients/' + clientId + '/warmup-deactivate'"), '3e. deactivateCoachWarmupAssignment posts to the deactivate route');
  ok(!/practiceFetch\(['"]\/api\/client\/warmup/.test(uiSrc), '3f. no coach UI function calls the client-facing routes - the surfaces stay separate');
}

// 4. generateCoachWarmupDraftFromClientSession reuses the exact same engine
// as the personal/athlete side (WarmUpEngine.generate) - not a second,
// diverging generation path (spec section 11: no second source of truth).
{
  const fnStart = uiSrc.indexOf('function generateCoachWarmupDraftFromClientSession()');
  const fnBody = uiSrc.slice(fnStart, uiSrc.indexOf('\n}', fnStart) + 2);
  ok(fnBody.includes('WarmUpEngine.generate('), '4a. reuses WarmUpEngine.generate - no separate coach-only generation algorithm');
  ok(fnBody.includes('dayObj.exercises || dayObj.rows'), '4b. reads the same exercise-list shape renderTraining() already uses');
}

// 5. Assignment always carries an explicit assignmentType, defaulting to
// optional (spec section 14: "Default: FACOLTATIVO").
{
  const openStart = uiSrc.indexOf('async function openCoachWarmupAssignModal()');
  const openBody = uiSrc.slice(openStart, uiSrc.indexOf('\n}', openStart) + 2);
  ok(openBody.includes("assignmentType: 'optional'"), '5a. a fresh draft defaults assignmentType to optional');
}

console.log('\nAll warm-up coach UI tests passed.');
