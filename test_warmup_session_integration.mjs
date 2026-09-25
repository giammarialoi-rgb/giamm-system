import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// The Warm-Up Engine is wired into the real Workout Session (not a separate
// app): renderTraining() now shows an interactive warm-up card in place of
// the old dead, read-only DATA.warmup block, with a player, personal editor,
// and locked-assignment guard - all additive, existing set-logging code
// untouched.
console.log('--- Running Warm-Up Session-Integration Tests ---');

const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const uiSrc = fs.readFileSync(path.join(root, 'web/coach-practice-ui.js'), 'utf8');

// 1. Script tags present, and the old dead static block is gone.
for (const src of [html, built]) {
  ok(src.includes('<script src="warmup-exercise-library.js"></script>'), '1a. warmup-exercise-library.js is loaded');
  ok(src.includes('<script src="warmup-engine.js"></script>'), '1b. warmup-engine.js is loaded');
  ok(!/DATA\.warmup && DATA\.warmup\.present/.test(src), '1c. the old dead, read-only DATA.warmup render block is gone');
  ok(src.includes('warmupSessionCardHtml(currentWeek, currentDay, exerciseList)'), '1d. renderTraining renders the new interactive warm-up card');
  ok(/try\s*\{\s*h \+= warmupSessionCardHtml/.test(src), '1e. the warm-up card render is wrapped in try/catch, so a warm-up bug can never break the training session view');
}

// 2. Every function referenced via onclick="" in the new warm-up markup has
// a matching window export (this codebase requires it - a plain top-level
// function declaration is not reachable from an inline onclick attribute
// here, confirmed live during the nutrition-target-edit feature this
// session: the button silently does nothing, no console error).
{
  const onclickFns = [
    'openWarmupPlayer', 'openWarmupEditor', 'regenerateWarmup', 'skipWarmup',
    'openWarmupExercisePicker', 'addWarmupLibraryExercise',
    'moveWarmupItem', 'removeWarmupItem', 'saveWarmupEdits',
    'warmupPlayerCompleteItem', 'warmupPlayerSkipItem', 'closeWarmupPlayer'
  ];
  for (const fn of onclickFns) {
    for (const src of [html, built]) {
      ok(new RegExp('onclick="' + fn + '\\(').test(src), '2a. onclick="' + fn + '(...)" is wired up in ' + (src === html ? 'index.base.html' : 'index.html'));
      ok(src.includes('window.' + fn + ' = ' + fn + ';'), '2b. ' + fn + ' is explicitly exported on window');
    }
  }
  // updateWarmupItemField is wired via oninput="" on the sets/reps/duration/
  // rest fields, not onclick="" - same window-export rule applies either way.
  for (const src of [html, built]) {
    ok(new RegExp('oninput="updateWarmupItemField\\(').test(src), '2a. oninput="updateWarmupItemField(...)" is wired up on the item fields');
    ok(src.includes('window.updateWarmupItemField = updateWarmupItemField;'), '2b. updateWarmupItemField is explicitly exported on window');
  }
  // createWarmupFromScratch has no onclick of its own (openWarmupEditor calls
  // it directly as a same-scope JS fallback when no warm-up exists yet for
  // the session) but is still exported, matching this codebase's convention
  // of exporting anything that could plausibly need calling from an onclick.
  for (const src of [html, built]) {
    ok(src.includes('window.createWarmupFromScratch = createWarmupFromScratch;'), '2c. createWarmupFromScratch is exported on window');
  }
}

// 3. Personal domain sync: warmups/warmupProgress ride the same JSONB blob
// sync as nutrition/bw/etc. - both the upload (accountPayload) and the
// download (applyRemoteAccountData) sides must carry the two new fields, or
// a warm-up created on one device would never reach another.
{
  const payloadStart = html.indexOf('function accountPayload(opts)');
  const payloadBody = html.slice(payloadStart, html.indexOf('\nfunction applyRemoteAccountData', payloadStart));
  ok(payloadBody.includes('warmups: warmupsSrc || {}'), '3a. accountPayload uploads store.warmups');
  ok(payloadBody.includes('warmupProgress: warmupProgressSrc || {}'), '3b. accountPayload uploads store.warmupProgress');
  const applyStart = html.indexOf('function applyRemoteAccountData(remote, preferLocal)');
  const applyBody = html.slice(applyStart, applyStart + 5000);
  // Key by key with the other maps: the most recent edit wins (mapStamps);
  // without times on either side, as before, the cloud only fills what is missing.
  ok(/\['bw', 'skips', 'subs', 'loadTypes', 'tempos', 'exIntensity', 'maxTests', 'bonus', 'exMuscle', 'warmups', 'warmupProgress'\]\s+\.forEach\(function \(f\) \{ mergeStampedMap\(f, remote\); \}\);/.test(applyBody), '3c. applyRemoteAccountData merges remote.warmups key by key, like bw/skips/etc.');
  ok(/'warmups', 'warmupProgress'\]/.test(applyBody), '3d. applyRemoteAccountData merges remote.warmupProgress');
}

// 4. Coach/client isolation triad: warmups/warmupProgress must be in the
// same reset/snapshot/restore/apply set as every other personal field, or
// this reintroduces exactly the class of bug fixed earlier this session
// (coach's own data leaking into - or client data leaking out of - the
// assignment sandbox).
{
  const resetStart = uiSrc.indexOf('function resetSandboxSessionState()');
  const resetBody = uiSrc.slice(resetStart, uiSrc.indexOf('\n}', resetStart) + 2);
  ok(resetBody.includes('store.warmups = ') && resetBody.includes('store.warmupProgress = '), '4a. resetSandboxSessionState clears both new fields');
  // There is no snapshot to back these up into any more: the coach's copy lives
  // in its own memory area that a client session never writes to. What has to
  // hold instead is that both fields are domain fields, so store.warmups inside
  // a session reaches the client's area and not the coach's.
  const baseSrc = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  const listStart = baseSrc.indexOf('var NURVAN_DOMAIN_FIELDS');
  const domainList = baseSrc.slice(listStart, baseSrc.indexOf('];', listStart));
  ok(/'warmups'/.test(domainList) && /'warmupProgress'/.test(domainList),
    '4b. both new fields are domain fields, so they follow the active memory area');
  const restoreStart = uiSrc.indexOf('function restoreCoachMaster(backup)');
  const restoreBody = uiSrc.slice(restoreStart, uiSrc.indexOf('\n}', restoreStart) + 2);
  ok(restoreBody.includes('nurvanLeaveClientArea()'),
    '4c. ending a session switches back to the personal area rather than copying fields back');
  const applyClientStart = uiSrc.indexOf('function applyClientPayloadToLocal(payload)');
  const applyClientBody = uiSrc.slice(applyClientStart, uiSrc.indexOf('\nfunction ', applyClientStart + 20));
  ok(applyClientBody.includes('store.warmups = payload.warmups'), '4d. the live coach-viewing-client path sources warmups from the client\'s own synced payload');
}

// 5. Lock enforcement (spec section 15): a coach-assigned, active warm-up
// must refuse structural edits/regeneration at the function level, not just
// hide UI buttons - the guard has to be in the code path itself.
{
  const editStart = html.indexOf('function openWarmupEditor(week, day)');
  const editBody = html.slice(editStart, html.indexOf('\n}', editStart) + 2);
  ok(editBody.includes('store.warmupAssignment && store.warmupAssignment.active') && editBody.trim().split('\n')[1].includes('return'),
    '5a. openWarmupEditor refuses to open when a coach assignment is active - the very first check, not a UI-only omission');
  const regenStart = html.indexOf('function regenerateWarmup(week, day)');
  const regenBody = html.slice(regenStart, html.indexOf('\n}', regenStart) + 2);
  ok(regenBody.includes('store.warmupAssignment && store.warmupAssignment.active'), '5b. regenerateWarmup refuses to overwrite an active coach assignment');
  const cardStart = html.indexOf('function warmupSessionCardHtml(week, day, exerciseList)');
  const cardEnd = html.indexOf('\nwindow.warmupSessionCardHtml', cardStart);
  const cardBody = html.slice(cardStart, cardEnd);
  // The function has two separate onclick="openWarmupEditor(...)" references
  // (an empty-warmup early-return "AGGIUNGI ESERCIZI" prompt, and the real
  // MODIFICA button) - what matters here is the *populated* card's button
  // row specifically, so anchor on the isLocked gate closest to the end of
  // the function (the real button row), not the first textual occurrence.
  const gateIdx = cardBody.lastIndexOf('if (!isLocked) {');
  ok(gateIdx >= 0, '5c. the populated-warmup button row gates MODIFICA/RICREA behind !isLocked');
  const lockedBranch = cardBody.slice(gateIdx);
  const isLockedTrueBranchEnd = lockedBranch.indexOf("} else if (!isMandatory) {");
  const editableBranch = lockedBranch.slice(0, isLockedTrueBranchEnd);
  const readonlyBranch = lockedBranch.slice(isLockedTrueBranchEnd);
  ok(editableBranch.includes('onclick="openWarmupEditor') && editableBranch.includes('onclick="regenerateWarmup'),
    '5d. MODIFICA/RICREA render inside the !isLocked branch');
  ok(!readonlyBranch.includes('onclick="openWarmupEditor(') && !readonlyBranch.includes('onclick="regenerateWarmup('),
    '5e. the locked (coach-assigned) branch never renders MODIFICA/RICREA - only SALTA when optional');
}

// 6. Player completion math: idx reaching the item count is what marks a
// session "completed" (not e.g. a fixed threshold), so a warm-up with any
// item count completes correctly.
{
  const fnStart = html.indexOf('function persistWarmupPlayerProgress(status)');
  const fnBody = html.slice(fnStart, html.indexOf('\n}', fnStart) + 2);
  ok(fnBody.includes("completedCount >= total && total > 0 ? 'completed' : 'partial'"),
    '6a. status is derived from actual completed-count vs total, not a hardcoded item count');
}

// 7. Client-side sync of a coach-assigned warm-up: fetched at boot, cached
// in store.warmupAssignment, and given absolute priority over any local
// auto-generated/personal plan (spec section 31). Completion is synced back
// to the coach through the one narrow, idempotent write endpoint.
{
  ok(html.includes('async function fetchWarmupAssignment()'), '7a. fetchWarmupAssignment is declared');
  const fetchStart = html.indexOf('async function fetchWarmupAssignment()');
  const fetchBody = html.slice(fetchStart, html.indexOf('\nwindow.fetchWarmupAssignment', fetchStart));
  ok(fetchBody.includes("accountRequest('/api/client/warmup'"), '7b. it calls the read-only client warm-up endpoint');
  ok(fetchBody.includes('store.warmupAssignment = payload.assignment'), '7c. it caches the result on store.warmupAssignment');
  ok(fetchBody.includes('store.coachViewingClient || store.coachAssigning'), '7d. it skips fetching while the coach sandbox is active (never fetches with the coach\'s own token as if it were a client)');

  const getOrCreateStart = html.indexOf('function getOrCreateWarmupForSession(week, day, exerciseList)');
  const getOrCreateBody = html.slice(getOrCreateStart, html.indexOf('\n}', getOrCreateStart) + 2);
  ok(getOrCreateBody.indexOf('store.warmupAssignment') < getOrCreateBody.indexOf('store.warmups[key]'),
    '7e. a coach assignment is checked and returned before any local/auto-generated warm-up (priority order from spec section 31)');

  ok(html.includes('function syncWarmupCompletionToCoach('), '7f. syncWarmupCompletionToCoach is declared');
  const syncStart = html.indexOf('function syncWarmupCompletionToCoach(');
  const syncBody = html.slice(syncStart, html.indexOf('\n}', syncStart) + 2);
  ok(syncBody.includes("'/api/client/warmup/complete'"), '7g. it posts to the one narrow completion-write endpoint');
  ok(syncBody.includes('.catch(function (err)'), '7h. a failed sync (offline) is caught, never thrown - local progress is already persisted separately');

  const progressStart = html.indexOf('function persistWarmupPlayerProgress(status)');
  const progressBody = html.slice(progressStart, html.indexOf('\n}', progressStart) + 2);
  ok(progressBody.includes('warmup.fromAssignment') && progressBody.includes('syncWarmupCompletionToCoach('),
    '7i. every progress update for an assignment-sourced warm-up triggers a sync attempt, not just the final completion');
}

console.log('\nAll warm-up session-integration tests passed.');
