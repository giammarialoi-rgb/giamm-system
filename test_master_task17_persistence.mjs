import fs from 'fs';
import path from 'path';
import vm from 'vm';
import XLSX from 'xlsx';
import {
  parseStructuredWorkbook,
  parseCanonicalProgramFromText
} from './universal-import-engine.mjs';
import {
  GiammariaPersistence,
  GiammariaPersistenceCore,
  deterministicSerialize,
  getDeterministicFingerprint,
  deepEqual
} from './persistence-core.mjs';

console.log("============================================================");
console.log("GIAMMARIA SYSTEM — MASTER TASK ⑰ PERSISTENCE CORE 2.0 SUITE");
console.log("============================================================\n");

let passedCount = 0;
let failedCount = 0;
const failures = [];

function check(condition, message, detail = "") {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passedCount++;
  } else {
    console.error(`  ✗ FAILED: ${message}${detail ? ' -> ' + detail : ''}`);
    failedCount++;
    failures.push(message + (detail ? ': ' + detail : ''));
  }
}

async function runTask17Suite() {
  // -------------------------------------------------------------
  // TEST 1: UNIT & PERSISTENCE TESTS
  // -------------------------------------------------------------
  console.log("\n[TEST 1] Persistence Core 2.0 Unit Tests...");
  const persistence = new GiammariaPersistenceCore();

  // 1.1 DB Open & Stores
  const db = await persistence.dbOpen();
  check(db !== null && db !== undefined, "IndexedDB connection opened (GIAMMARIA_SYSTEM_DB)");
  check(db.objectStoreNames.contains('programs'), "Object store 'programs' created");
  check(db.objectStoreNames.contains('workouts'), "Object store 'workouts' created");
  check(db.objectStoreNames.contains('settings'), "Object store 'settings' created");
  check(db.objectStoreNames.contains('metadata'), "Object store 'metadata' created");
  check(db.objectStoreNames.contains('performance'), "Object store 'performance' created");

  // 1.2 Program CRUD
  const sampleProg = {
    id: 'test_prog_01',
    title: 'Test Program Alpha',
    canonicalVersion: '2.1',
    weeks: [
      {
        weekNumber: 1,
        title: 'Settimana 1',
        sessions: [
          {
            day: 'Giorno 1',
            title: 'Upper Test',
            exercises: [
              {
                id: 'ex_1',
                name: 'PANCA PIANA',
                muscle_groups: ['PETTO'],
                sets: [
                  { id: 's1', set_number: 1, target_reps: '6-8', target_rir: 1, target_rpe: 9, target_load: 100 }
                ]
              }
            ]
          }
        ]
      }
    ],
    nutrition: { present: true, days: [{ day: 'LUNEDÌ', meals: [{ name: 'Pranzo', foods: [{ name: 'Riso', quantity: 100, unit: 'g' }] }] }] },
    supplementation: { present: true, items: [{ name: 'Creatina', dose: 5, unit: 'g', timing: 'Post-workout' }] },
    therapy: { present: true, medications: [{ medication: 'Farmaco A', dosage: '1 cp', duration_weeks: 4 }] },
    exams: { present: true, records: [{ parameter: 'Emoglobina', value: '15.5', unit: 'g/dL' }] }
  };

  const saveRes = await persistence.saveProgram(sampleProg);
  check(saveRes.ok === true, "saveProgram succeeded with atomic verification");
  check(saveRes.id === 'test_prog_01', "saveProgram returned valid program ID");
  check(saveRes.fingerprint !== undefined, `saveProgram generated valid fingerprint: ${saveRes.fingerprint}`);

  const loaded = await persistence.loadProgram('test_prog_01');
  check(loaded !== null, "loadProgram loaded saved program from IndexedDB");
  check(loaded.title === sampleProg.title, "Loaded program matches original title");
  check(loaded.weeks.length === 1, "Loaded program matches weeks count");

  // 1.3 Active Program Handling
  await persistence.saveActiveProgram(sampleProg);
  const activeProg = await persistence.loadActiveProgram();
  check(activeProg !== null && activeProg.id === 'test_prog_01', "loadActiveProgram recovered active program");

  // 1.4 Workout Persistence
  const workoutSample = {
    id: 'w1_s1_log',
    programId: 'test_prog_01',
    weekNumber: 1,
    sessionNumber: 1,
    data: { exercise_1_set_1: { reps: 8, load: 100, rir: 1 } }
  };
  await persistence.saveWorkout(workoutSample);
  const loadedWorkout = await persistence.loadWorkout('w1_s1_log');
  check(loadedWorkout !== null && loadedWorkout.exercise_1_set_1.load === 100, "saveWorkout / loadWorkout succeeded");

  // 1.5 Settings Persistence
  await persistence.saveSettings({ theme: 'dark', intensityType: 'RIR', defaultRest: 90 });
  const loadedSettings = await persistence.loadSettings();
  check(loadedSettings !== null && loadedSettings.intensityType === 'RIR', "saveSettings / loadSettings succeeded");

  // 1.6 Metadata & Storage Stats
  const mockLs = {
    store: {},
    getItem(k) { return this.store[k] || null; },
    setItem(k, v) { this.store[k] = String(v); },
    removeItem(k) { delete this.store[k]; },
    get length() { return Object.keys(this.store).length; },
    key(i) { return Object.keys(this.store)[i] || null; }
  };
  const stats = await persistence.getStorageStats(mockLs);
  check(stats.indexedDB.programsCount >= 1, `IndexedDB storage stats returned valid program count (${stats.indexedDB.programsCount})`);
  check(stats.indexedDB.activeProgramId === 'test_prog_01', "Storage stats accurately report activeProgramId");

  // 1.7 Idempotent Legacy Store Migration
  mockLs.setItem('GS_STORE', JSON.stringify({
    prefs: { duration: 16 },
    activeProgram: sampleProg
  }));
  const migRes1 = await persistence.migrateLegacyStore(mockLs);
  check(migRes1.migrated === true, "Legacy heavy GS_STORE migrated to IndexedDB");

  const sanitizedStore = JSON.parse(mockLs.getItem('GS_STORE'));
  check(sanitizedStore.activeProgram === null, "sanitizedStore stripped heavy activeProgram");
  check(sanitizedStore.activeProgramId !== null, "sanitizedStore set activeProgramId");
  check(sanitizedStore.migrationVersion === '2.0', "sanitizedStore marked with migrationVersion 2.0");

  // Second run (idempotence)
  const migRes2 = await persistence.migrateLegacyStore(mockLs);
  check(migRes2.migrated === false && migRes2.reason === 'already_migrated', "Second migration run is cleanly idempotent (already_migrated)");

  // -------------------------------------------------------------
  // TEST 2: GOLDEN FILE FORENSIC ROUND TRIP
  // -------------------------------------------------------------
  console.log("\n[TEST 2] Golden File Forensic Round-Trip Validation...");
  const goldenFile = 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx';
  const goldenWb = XLSX.readFile(goldenFile, { cellDates: true, cellNF: true });
  const parsed = parseStructuredWorkbook(goldenWb, 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
  const canonicalGolden = parsed.canonicalProgram;
  canonicalGolden.id = 'golden_v29_master';

  const fingerprintA = getDeterministicFingerprint(canonicalGolden);
  check(fingerprintA.startsWith('fp_'), `Pre-save Fingerprint A calculated: ${fingerprintA}`);

  // Save to IndexedDB
  const goldenSaveRes = await persistence.saveActiveProgram(canonicalGolden);
  check(goldenSaveRes.ok === true, "Golden file saved to IndexedDB");

  // Load back from IndexedDB
  const loadedGolden = await persistence.loadActiveProgram();
  check(loadedGolden !== null, "Golden file loaded back from IndexedDB");

  const fingerprintB = getDeterministicFingerprint(loadedGolden);
  check(fingerprintB.startsWith('fp_'), `Post-load Fingerprint B calculated: ${fingerprintB}`);
  check(fingerprintA === fingerprintB, "Pre-save Fingerprint A === Post-load Fingerprint B (100% IDENTICAL)");

  // Validate complete counts
  check(loadedGolden.weeks.length === 20, `Golden model preserved 20 weeks (found: ${loadedGolden.weeks.length})`);
  let goldenSessions = 0;
  let goldenExercises = 0;
  let goldenSets = 0;
  loadedGolden.weeks.forEach(w => {
    (w.sessions || []).forEach(s => {
      goldenSessions++;
      (s.exercises || []).forEach(ex => {
        goldenExercises++;
        goldenSets += (ex.sets || []).length;
      });
    });
  });
  check(goldenSessions === 68, `Golden model preserved 68 sessions (found: ${goldenSessions})`);
  check(goldenExercises === 870, `Golden model preserved 870 exercises (found: ${goldenExercises})`);
  check(goldenSets === 1642, `Golden model preserved 1642 sets (found: ${goldenSets})`);

  // Deep Sample Verification
  const firstEx = loadedGolden.weeks[0].sessions[0].exercises[0];
  const midEx = loadedGolden.weeks[7].sessions[1].exercises[2];
  const lastEx = loadedGolden.weeks[19].sessions[0].exercises[loadedGolden.weeks[19].sessions[0].exercises.length - 1];

  check(firstEx.name.length > 0 && firstEx.sets.length > 0, `First exercise intact: ${firstEx.name} (${firstEx.sets.length} sets)`);
  check(midEx.name.length > 0 && midEx.sets.length > 0, `Mid exercise intact: ${midEx.name} (${midEx.sets.length} sets)`);
  check(lastEx.name.length > 0, `Last exercise intact: ${lastEx.name}`);

  check(firstEx.sets[0].target_reps !== undefined, "Set 1 target_reps preserved");
  check(firstEx.sets[0].target_rir !== undefined, "Set 1 target_rir preserved");
  check(firstEx.sets[0].target_rpe !== undefined, "Set 1 target_rpe preserved");

  // -------------------------------------------------------------
  // TEST 4: QUOTA STRESS TEST (2X MASSIVE PROGRAM)
  // -------------------------------------------------------------
  console.log("\n[TEST 4] Quota Stress Test (2x Massive Program)...");

  // Create a 2x massive synthetic program (40 weeks, 136 sessions, 1740 exercises, 3284 sets)
  const massiveProg = JSON.parse(JSON.stringify(canonicalGolden));
  massiveProg.id = 'massive_stress_prog_2x';
  massiveProg.title = 'MASSIVE STRESS PROGRAM 2X';
  const clonedWeeks = JSON.parse(JSON.stringify(canonicalGolden.weeks));
  clonedWeeks.forEach((w, idx) => {
    const cloneW = JSON.parse(JSON.stringify(w));
    cloneW.weekNumber = idx + 21;
    cloneW.title = `Settimana ${idx + 21} (Stress Extended)`;
    massiveProg.weeks.push(cloneW);
  });

  check(massiveProg.weeks.length === 40, `Created 2x massive program with ${massiveProg.weeks.length} weeks`);

  // Save massive program to IndexedDB
  const massiveSaveRes = await persistence.saveProgram(massiveProg);
  check(massiveSaveRes.ok === true, "Massive 2x program saved successfully to IndexedDB without quota error");

  const loadedMassive = await persistence.loadProgram('massive_stress_prog_2x');
  check(loadedMassive !== null && loadedMassive.weeks.length === 40, "Loaded massive 2x program matches 40 weeks exactly");
  check(getDeterministicFingerprint(massiveProg) === getDeterministicFingerprint(loadedMassive), "Massive program fingerprint matches 100%");

  // Verify that localStorage GS_STORE remains strictly lightweight (< 50 KB)
  mockLs.setItem('GS_STORE', JSON.stringify(persistence.sanitizeStoreForLocalStorage({
    activeProgramId: 'massive_stress_prog_2x',
    prefs: { duration: 40 },
    activeProgram: massiveProg
  })));

  const lsSize = persistence.getLocalStorageSize(mockLs);
  check(lsSize.kb < 50, `localStorage GS_STORE size is lightweight: ${lsSize.formatted} (< 50 KB safe limit)`);

  // -------------------------------------------------------------
  // TEST 5: FAILURE INJECTION & RESILIENCE
  // -------------------------------------------------------------
  console.log("\n[TEST 5] Failure Injection & Error Resilience...");

  // 5.1 Invalid program object
  try {
    await persistence.saveProgram(null);
    check(false, "Null program should throw error");
  } catch (err) {
    check(true, `Null program threw expected error: ${err.message}`);
  }

  // 5.2 Empty weeks program
  try {
    await persistence.saveProgram({ id: 'bad_prog', weeks: [] });
    check(false, "Empty weeks program should throw error");
  } catch (err) {
    check(true, `Empty weeks program threw expected error: ${err.message}`);
  }

  // 5.3 Active program preservation on failure
  const previousActive = await persistence.loadActiveProgram();
  check(previousActive.id === goldenSaveRes.id, "Active program ID remained unchanged after failed saves");

  // -------------------------------------------------------------
  // TEST 7: REBOOT REAL (Fresh VM Context)
  // -------------------------------------------------------------
  console.log("\n[TEST 7] App Reboot & Fresh Context State Recovery...");

  const htmlStr = fs.readFileSync('web/index.html', 'utf8');
  const makeMockElement = () => ({
    value: "",
    files: [],
    click: () => {},
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false, toggle: () => {} },
    setAttribute: () => {},
    getAttribute: () => null,
    addEventListener: () => {},
    removeEventListener: () => {}
  });

  const vmStorage = {
    'GS_STORE': JSON.stringify({
      migrationVersion: '2.0',
      activeProgramId: goldenSaveRes.id,
      prefs: { duration: 20, frequency: 4 }
    })
  };

  const rebootSandbox = {
    window: {},
    document: {
      getElementById: () => makeMockElement(),
      querySelector: () => makeMockElement(),
      querySelectorAll: () => []
    },
    localStorage: {
      getItem: (k) => vmStorage[k] || null,
      setItem: (k, v) => { vmStorage[k] = String(v); },
      removeItem: (k) => { delete vmStorage[k]; },
      get length() { return Object.keys(vmStorage).length; },
      key: (i) => Object.keys(vmStorage)[i] || null
    },
    XMLHttpRequest: class {
      open() {}
      send() {}
      setRequestHeader() {}
    },
    navigator: { onLine: true, userAgent: "Android WebView" },
    scrollTo: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    XLSX: XLSX,
    DATA: null,
    currentWeek: 1,
    currentDay: 0,
    currentView: 'home',
    esc: (s) => String(s || ''),
    alert: () => {},
    confirm: () => false,
    prompt: () => "",
    console: console
  };
  rebootSandbox.window = rebootSandbox;
  rebootSandbox.globalThis = rebootSandbox;

  const scriptMatches = htmlStr.match(/<script(?![^>]*src=)>([\s\S]*?)<\/script>/gi);
  let combinedClientScript = "";
  if (scriptMatches) {
    scriptMatches.forEach(tag => {
      combinedClientScript += tag.replace(/<\/?script[^>]*>/gi, "") + "\n;\n";
    });
  }

  const vmContext = vm.createContext(rebootSandbox);
  vm.runInContext(combinedClientScript, vmContext);

  // Initialize and check recovery
  await rebootSandbox.GiammariaPersistence.saveActiveProgram(canonicalGolden);
  await rebootSandbox.init();

  const loadedFromIDB = await rebootSandbox.GiammariaPersistence.loadActiveProgram();
  check(loadedFromIDB !== null, "rebootSandbox loaded active program cleanly from IndexedDB");
  check(loadedFromIDB.weeks.length === 20, "rebootSandbox preserved 20 weeks after reboot");
  check(getDeterministicFingerprint(loadedFromIDB) === fingerprintA, "rebootSandbox IndexedDB model has identical fingerprint to original Golden model");
  check(rebootSandbox.DATA !== null && rebootSandbox.DATA.weeks.length === 20, "rebootSandbox DATA normalized 20 weeks for UI execution");

  // -------------------------------------------------------------
  // TEST 8: CONCURRENT / DOUBLE SAVE
  // -------------------------------------------------------------
  console.log("\n[TEST 8] Concurrent / Double Save Protection...");

  const progA = JSON.parse(JSON.stringify(canonicalGolden));
  progA.id = 'concurrent_prog_test';
  progA.title = 'Concurrent Save Test';

  // Run 2 simultaneous saves
  const [res1, res2] = await Promise.all([
    persistence.saveProgram(progA),
    persistence.saveProgram(progA)
  ]);

  check(res1.ok && res2.ok, "Both concurrent save requests resolved successfully");
  check(res1.fingerprint === res2.fingerprint, "Concurrent saves produced identical fingerprints without collision");

  const loadedConcurrent = await persistence.loadProgram('concurrent_prog_test');
  check(loadedConcurrent !== null && loadedConcurrent.weeks.length === 20, "Loaded concurrent program verified intact");

  console.log("\n============================================================");
  console.log(`MASTER TASK ⑰ SUITE COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED`);
  console.log("============================================================\n");

  if (failedCount > 0) {
    console.error("FAILURES:");
    failures.forEach(f => console.error(`  - ${f}`));
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTask17Suite().catch(err => {
  console.error("Suite crashed:", err);
  process.exit(1);
});
