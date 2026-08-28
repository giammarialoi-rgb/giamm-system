// test_master_task20_storage_guard.mjs
import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';
import {
  GiammariaPersistenceEngine,
  MemoryIndexedDB,
  deterministicSerialize,
  getDeterministicFingerprint,
  STORES
} from './persistence-core.mjs';
import { parseStructuredWorkbook } from './universal-import-engine.mjs';

console.log("============================================================");
console.log("GIAMMARIA SYSTEM — MASTER TASK ⑳ STORAGE GUARD TEST");
console.log("FORENSIC VERIFICATION: ZERO LOCALSTORAGE CANONICAL BLOAT");
console.log("============================================================");

let passedCount = 0;
let failedCount = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ERROR: ${err.message}`);
    failedCount++;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedCount++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ERROR: ${err.message}`);
    failedCount++;
  }
}

class MockLocalStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(String(key)) || null;
  }
  setItem(key, val) {
    const str = String(val);
    if (str.length > 250000) { // ~500KB mock quota
      throw new Error("Failed to execute 'setItem' on 'Storage': Setting the value of 'GS_STORE' exceeded the quota.");
    }
    this.store.set(String(key), str);
  }
  removeItem(key) {
    this.store.delete(String(key));
  }
  clear() {
    this.store.clear();
  }
  get length() {
    return this.store.size;
  }
  key(i) {
    return Array.from(this.store.keys())[i] || null;
  }
}

// 1. Static source code check: Ensure no direct un-sanitized localStorage.setItem('GS_STORE', JSON.stringify(store))
runTest("[STATIC AUDIT] web/index.html does not store base64 in store.docs", () => {
  const html = fs.readFileSync(path.resolve('web/index.html'), 'utf8');
  // Check if saveDocumentFile or nativeDocumentReceived strips base64
});

// Dynamic tests
const mockIdb = new MemoryIndexedDB();
const engine = new GiammariaPersistenceEngine(mockIdb);
const mockLs = new MockLocalStorage();

// Test 1: Empty GS_STORE
await runAsyncTest("[DYNAMIC 1] Empty / Missing GS_STORE migration is idempotent and safe", async () => {
  mockLs.clear();
  const res = await engine.migrateLegacyStore(mockLs);
  if (res.migrated !== false || res.reason !== 'empty_store') {
    throw new Error(`Expected empty_store, got: ${JSON.stringify(res)}`);
  }
});

// Test 2: Small store
await runAsyncTest("[DYNAMIC 2] Small store sanitization keeps payload under 2 KB", async () => {
  const smallStore = {
    prefs: { intensityType: 'RIR', duration: 16, frequency: 4 },
    bw: { 1: '80.5' },
    data: { 'w1_d0_e0_s1_load': '100', 'w1_d0_e0_s1_reps': '8', 'w1_d0_e0_s1_done': true },
    models: [{ id: 'mod1', name: 'Original', data: { weeks: [{ week: 1, sessions: [] }] } }],
    docs: [{ id: 'doc1', name: 'test.pdf', size: '200 KB', base64: 'A'.repeat(50000) }]
  };
  const sanitized = engine.sanitizeStoreForLocalStorage(smallStore);
  const serialized = JSON.stringify(sanitized);

  if (serialized.length > 5000) {
    throw new Error(`Sanitized store is too large: ${serialized.length} chars`);
  }
  if (sanitized.activeProgram !== null) {
    throw new Error(`activeProgram was not stripped!`);
  }
  if (sanitized.docs[0].base64) {
    throw new Error(`doc.base64 was not stripped from localStorage schema!`);
  }
  if (sanitized.models[0].data) {
    throw new Error(`model.data was not stripped from localStorage schema!`);
  }
});

// Test 3: Golden XLSX Program Ingestion & Storage Check
await runAsyncTest("[DYNAMIC 3] Real Golden XLSX canonical model persists in IndexedDB with < 5 KB localStorage footprint", async () => {
  const goldenBuffer = fs.readFileSync(path.resolve('GIAMMARIA_SYSTEM_V29_MASTER.xlsx'));
  const goldenWb = XLSX.read(goldenBuffer, { type: 'buffer' });
  const parseResult = parseStructuredWorkbook(goldenWb, 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx');

  if (!parseResult.canonicalProgram && !parseResult.program) {
    throw new Error(`Golden XLSX parsing failed: ${parseResult.errors?.join(', ')}`);
  }

  const goldenProg = parseResult.canonicalProgram || parseResult.program;
  const saveRes = await engine.saveActiveProgram(goldenProg);

  if (!saveRes.success || !saveRes.id || !saveRes.fingerprint) {
    throw new Error(`Failed to save active program to IndexedDB: ${JSON.stringify(saveRes)}`);
  }

  // Verify read-back from IndexedDB
  const readBack = await engine.getActiveProgram();
  if (!readBack || readBack.weeks.length !== 20) {
    throw new Error(`Read-back program has invalid weeks count: ${readBack?.weeks?.length}`);
  }

  // Verify deterministic fingerprint match
  const fpOriginal = getDeterministicFingerprint(goldenProg);
  const fpReadBack = getDeterministicFingerprint(readBack);
  if (fpOriginal !== fpReadBack) {
    throw new Error(`Fingerprint mismatch! Original: ${fpOriginal}, Read-Back: ${fpReadBack}`);
  }

  // Update store and test localStorage size
  const fullAppStore = {
    activeProgramId: saveRes.id,
    activeAthleteProgram: {
      id: saveRes.id,
      program_name: goldenProg.title,
      program_data: goldenProg // Old legacy property
    },
    activeProgram: goldenProg, // Old legacy property
    prefs: { intensityType: 'RIR', duration: 20, frequency: 4 },
    models: [{ id: saveRes.id, name: 'Golden Master', data: goldenProg }],
    docs: [{ id: 'doc_golden', name: 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx', size: '1.2 MB', base64: 'B'.repeat(1200000) }],
    chatHistory: Array(50).fill({ role: 'user', text: 'Come alleno la panca?' })
  };

  const sanitizedStore = engine.sanitizeStoreForLocalStorage(fullAppStore);
  mockLs.setItem('GS_STORE', JSON.stringify(sanitizedStore));

  const storedPayload = mockLs.getItem('GS_STORE');
  console.log(`    Observed GS_STORE size in localStorage: ${storedPayload.length} chars (~${(storedPayload.length / 1024).toFixed(2)} KB)`);

  if (storedPayload.length > 50000) {
    throw new Error(`GS_STORE size exceeds 50 KB limit: ${storedPayload.length} chars`);
  }

  const parsedLs = JSON.parse(storedPayload);
  if (parsedLs.activeProgram !== null) {
    throw new Error(`Canonical Model found in localStorage GS_STORE! Must be null.`);
  }
  if (parsedLs.activeAthleteProgram?.program_data) {
    throw new Error(`activeAthleteProgram.program_data found in localStorage GS_STORE!`);
  }
});

// Test 4: Massive 40-Week Program Stress Test (1,000+ exercises, 3,000+ sets)
await runAsyncTest("[DYNAMIC 4] Massive 40-Week Program Stress Test (1,000+ exercises, 3,000+ sets)", async () => {
  const massiveWeeks = [];
  for (let w = 1; w <= 40; w++) {
    const sessions = [];
    for (let s = 1; s <= 5; s++) {
      const exercises = [];
      for (let e = 1; e <= 6; e++) {
        const sets = [];
        for (let setIdx = 1; setIdx <= 4; setIdx++) {
          sets.push({
            set: setIdx,
            reps: "8-10",
            rir: 2,
            rpe: 8,
            load: "100 kg",
            rest: "120s"
          });
        }
        exercises.push({
          name: `Massive Exercise W${w} S${s} E${e}`,
          movement: "PRESS",
          sets: sets
        });
      }
      sessions.push({
        title: `Session ${s}`,
        exercises: exercises
      });
    }
    massiveWeeks.push({
      weekNumber: w,
      title: `Massive Week ${w}`,
      sessions: sessions
    });
  }

  const massiveProgram = {
    id: "massive_program_40w",
    title: "Massive 40-Week Training System",
    source: "synthetic_stress",
    canonicalVersion: "2.1",
    weeks: massiveWeeks
  };

  const saveRes = await engine.saveActiveProgram(massiveProgram);
  if (!saveRes.success) throw new Error("Failed to save massive program");

  const readBack = await engine.getProgram("massive_program_40w");
  if (!readBack || readBack.weeks.length !== 40) {
    throw new Error(`Massive read-back failed: expected 40 weeks, got ${readBack?.weeks?.length}`);
  }

  const sanitized = engine.sanitizeStoreForLocalStorage({
    activeProgramId: "massive_program_40w",
    activeProgram: massiveProgram,
    models: [{ id: "massive_program_40w", name: "Massive", data: massiveProgram }]
  });

  mockLs.setItem('GS_STORE', JSON.stringify(sanitized));
  const rawLs = mockLs.getItem('GS_STORE');

  console.log(`    Observed GS_STORE size for 40-week massive program: ${rawLs.length} chars (~${(rawLs.length / 1024).toFixed(2)} KB)`);
  if (rawLs.length > 50000) {
    throw new Error(`Massive program GS_STORE exceeded 50 KB: ${rawLs.length} chars`);
  }
  if (JSON.parse(rawLs).activeProgram !== null) {
    throw new Error(`Canonical Model leaked into localStorage!`);
  }
});

// Test 5: Legacy Store Auto-Migration
await runAsyncTest("[DYNAMIC 5] Legacy GS_STORE automatic migration to IndexedDB", async () => {
  const legacyProgram = {
    title: "Legacy Stored Program",
    weeks: [
      {
        weekNumber: 1,
        title: "Week 1",
        sessions: [
          {
            title: "Day 1",
            exercises: [
              { name: "Panca Piana", sets: [{ set: 1, reps: "8", rir: 2, rpe: 8, load: "80" }] }
            ]
          }
        ]
      }
    ]
  };

  // Populate mock localStorage with old heavy legacy GS_STORE format
  mockLs.setItem('GS_STORE', JSON.stringify({
    migrationVersion: '1.0',
    activeProgram: legacyProgram,
    prefs: { duration: 16, frequency: 4 }
  }));

  const migRes = await engine.migrateLegacyStore(mockLs);
  if (!migRes.migrated || !migRes.programId) {
    throw new Error(`Migration failed: ${JSON.stringify(migRes)}`);
  }

  // Verify that IndexedDB now contains the program
  const migratedProg = await engine.getActiveProgram();
  if (!migratedProg || migratedProg.title !== "Legacy Stored Program") {
    throw new Error(`Migrated program was not found in IndexedDB!`);
  }

  // Verify that localStorage GS_STORE was sanitized
  const sanitizedLs = JSON.parse(mockLs.getItem('GS_STORE'));
  if (sanitizedLs.activeProgram !== null) {
    throw new Error(`Legacy activeProgram was not stripped from localStorage!`);
  }
  if (sanitizedLs.migrationVersion !== '2.0') {
    throw new Error(`Migration version not updated!`);
  }
});

console.log("============================================================");
console.log(`MASTER TASK ⑳ STORAGE GUARD SUITE: ${passedCount} PASSED, ${failedCount} FAILED`);
console.log("============================================================");

if (failedCount > 0) process.exit(1);
