// Executes the real captureCoachMasterForClientView from web/coach-practice-ui.js.
// Guards the case that silently reverted a coach's own program: a backup left
// behind by a session that did not exit cleanly used to be kept instead of
// refreshed, so the next exit restored that stale snapshot over edits the coach
// had made to their personal program in between.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

const target = process.argv[2] || 'web/coach-practice-ui.js';
const source = fs.readFileSync(path.resolve(root, target), 'utf8');

function loadHarness() {
  const sandbox = {
    store: null,
    DATA: null,
    currentWeek: 1,
    currentDay: 0,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    // The file touches browser globals at load time; these only need to exist.
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    document: { querySelector: () => null, addEventListener() {}, getElementById: () => null },
    location: { pathname: '/', search: '' },
    navigator: {}
  };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  // Top-level function declarations are hoisted, so they exist even though
  // running this file outside a browser throws partway through.
  try {
    vm.runInContext(source, sandbox);
  } catch (_) {
    /* expected: the module does browser work at load time */
  }
  return sandbox;
}

const sb = loadHarness();
ok(typeof sb.captureCoachMasterForClientView === 'function', 'captureCoachMasterForClientView is defined');
ok(typeof sb.snapshotCoachMaster === 'function', 'snapshotCoachMaster is defined');

function coachStore(programTitle) {
  return {
    coachViewingClient: false,
    coachAssigning: null,
    activeProgramId: 'personal',
    activeProgram: { id: 'personal', title: programTitle, weeks: [{ week: 1 }] },
    profile: { name: 'Coach' },
    data: {}, customSets: {}, subs: {}, skips: {}, logs: [], intelTargets: {},
    bodyChecks: [], nutritionDaily: {}, bw: {}, exMuscle: {}, loadTypes: {},
    tempos: {}, bonus: {}, warmups: {}, warmupProgress: {}, warmupAssignment: null
  };
}

// --- A. entering a client from the personal app: snapshot must be taken ---
{
  sb.store = coachStore('Personale v1');
  sb.DATA = sb.store.activeProgram;
  sb.window.__cpCoachViewBackup = null;
  sb.captureCoachMasterForClientView();
  ok(!!sb.window.__cpCoachViewBackup, 'A: entering from personal takes a snapshot');
  ok(sb.window.__cpCoachViewBackup.activeProgram.title === 'Personale v1', 'A: snapshot captures the coach program');
}

// --- B. the regression: stale backup must be refreshed, not reused ---
{
  sb.store = coachStore('Personale v1');
  sb.DATA = sb.store.activeProgram;
  sb.window.__cpCoachViewBackup = null;
  sb.captureCoachMasterForClientView();          // first client session

  // session ends badly: the backup is left behind in memory
  sb.store.coachViewingClient = false;
  sb.store.coachAssigning = null;

  // coach goes back to the personal app and renames exercises
  sb.store.activeProgram = { id: 'personal', title: 'Personale v2 (rinominati)', weeks: [{ week: 1 }] };
  sb.DATA = sb.store.activeProgram;

  sb.captureCoachMasterForClientView();          // opens another client
  ok(
    sb.window.__cpCoachViewBackup.activeProgram.title === 'Personale v2 (rinominati)',
    'B: a stale backup is refreshed, so later personal edits survive the next exit'
  );
}

// --- C. switching client to client: existing backup must NOT be overwritten ---
{
  sb.store = coachStore('Personale v1');
  sb.DATA = sb.store.activeProgram;
  sb.window.__cpCoachViewBackup = null;
  sb.captureCoachMasterForClientView();

  // now inside a client session, the live store holds the client's program
  sb.store.coachViewingClient = true;
  sb.store.activeProgram = { id: 'client-a', title: 'Scheda di Marco', weeks: [{ week: 1 }] };
  sb.DATA = sb.store.activeProgram;

  sb.captureCoachMasterForClientView();          // switch to another client
  ok(
    sb.window.__cpCoachViewBackup.activeProgram.title === 'Personale v1',
    'C: switching client to client keeps the coach master, never the previous client'
  );
}

// --- D. orphaned session with no backup: must not adopt client data ---
{
  sb.store = coachStore('irrelevant');
  sb.store.coachViewingClient = true;
  sb.store.activeProgram = { id: 'client-b', title: 'Scheda di Luca', weeks: [{ week: 1 }] };
  sb.DATA = sb.store.activeProgram;
  sb.window.__cpCoachViewBackup = null;

  sb.captureCoachMasterForClientView();
  ok(
    !sb.window.__cpCoachViewBackup,
    'D: an orphaned session captures nothing rather than making client data the coach master'
  );
}

console.log('\nAll coach master snapshot tests passed.');
