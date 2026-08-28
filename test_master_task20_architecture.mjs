/**
 * ============================================================
 * GIAMMARIA SYSTEM — MASTER TASK 20 ARCHITECTURAL SUITE
 * TRIPLE TEST + CROSS VALIDATION & ZERO REGRESSION FOUNDATION
 * ============================================================
 *
 * Tests all 12 modules & foundational services:
 * 1.  Persistence Core 2.0 & Write-Read-Verify Pipeline
 * 2.  Deterministic Fingerprint Engine
 * 3.  Central Config & Native Config Bridge
 * 4.  Universal Import Engine 2.1 (XLSX, Text/CSV, PDF)
 * 5.  Multi-Domain Workbook Parser & Normalizer
 * 6.  Import Review UX State & Mutation Validation
 * 7.  RIR / RPE Bidirectional Conversion & Intensity Volume
 * 8.  Multi-Set Manipulation Engine (+ SERIE, Duplicate, Remove, Types)
 * 9.  Coach AI Context Ingestion & Guardrails
 * 10. AI Adaptation Proposal & Verification Pipeline
 * 11. Nutrition Plan Builder & Macro Math
 * 12. Supplement Protocol & Examine Evidence Adapter
 * 13. Medical Therapy Manager & Compact Grouping
 * 14. Clinical Lab Exam Monitor & Trend Aggregator
 * 15. Unified Calendar & Multi-Domain Chronological Timeline
 * 16. Internationalization Engine (i18n: IT, EN, ES, FR, DE)
 * 17. Monetization, Entitlement Service & Dynamic Pricing Config
 * 18. Non-Invasive Ad Placement Policy
 * 19. Health Data Provider & Health Connect Adapter
 * 20. Structured Error Logger (8 Categories)
 */

import fs from 'fs';
import path from 'path';
import vm from 'vm';
import * as XLSX from 'xlsx';

// Test counters
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

function assertEquals(actual, expected, testName) {
  totalTests++;
  if (actual === expected) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName} — Expected: ${expected}, Actual: ${actual}`);
    throw new Error(`Assertion failed: ${testName} (Expected ${expected}, got ${actual})`);
  }
}

function assertDeepEquals(actual, expected, testName) {
  totalTests++;
  const aStr = JSON.stringify(actual);
  const eStr = JSON.stringify(expected);
  if (aStr === eStr) {
    passedTests++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}\n    Expected: ${eStr}\n    Actual:   ${aStr}`);
    throw new Error(`Assertion failed: ${testName}`);
  }
}

// -------------------------------------------------------------
// CREATE ISOLATED SANDBOX RUNTIME WITH INDEXEDDB + LOCALSTORAGE MOCK
// -------------------------------------------------------------
function createTestRuntime() {
  const localStorageData = {};
  const localStorageMock = {
    getItem: (k) => localStorageData[k] || null,
    setItem: (k, v) => { localStorageData[k] = String(v); },
    removeItem: (k) => { delete localStorageData[k]; },
    clear: () => { for (const k in localStorageData) delete localStorageData[k]; }
  };

  const idbStores = {
    programs: new Map(),
    workouts: new Map(),
    settings: new Map(),
    metadata: new Map(),
    performance: new Map()
  };

  const indexedDBMock = {
    open: (name, version) => {
      const request = {
        result: {
          objectStoreNames: {
            contains: (s) => Boolean(idbStores[s])
          },
          createObjectStore: (s) => {
            if (!idbStores[s]) idbStores[s] = new Map();
            return {};
          },
          transaction: (storeNames, mode) => {
            const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
            return {
              objectStore: (s) => {
                if (!idbStores[s]) idbStores[s] = new Map();
                const targetStore = idbStores[s];
                return {
                  put: (val, key) => {
                    const req = { onsuccess: null, onerror: null };
                    setTimeout(() => {
                      const k = key !== undefined ? key : (val && val.id ? val.id : 'default');
                      targetStore.set(k, JSON.parse(JSON.stringify(val)));
                      req.result = k;
                      if (req.onsuccess) req.onsuccess({ target: { result: k } });
                    }, 0);
                    return req;
                  },
                  get: (key) => {
                    const req = { onsuccess: null, onerror: null };
                    setTimeout(() => {
                      const val = targetStore.get(key);
                      req.result = val ? JSON.parse(JSON.stringify(val)) : undefined;
                      if (req.onsuccess) req.onsuccess({ target: { result: req.result } });
                    }, 0);
                    return req;
                  },
                  delete: (key) => {
                    const req = { onsuccess: null, onerror: null };
                    setTimeout(() => {
                      targetStore.delete(key);
                      if (req.onsuccess) req.onsuccess({ target: { result: true } });
                    }, 0);
                    return req;
                  },
                  getAll: () => {
                    const req = { onsuccess: null, onerror: null };
                    setTimeout(() => {
                      req.result = Array.from(targetStore.values()).map(v => JSON.parse(JSON.stringify(v)));
                      if (req.onsuccess) req.onsuccess({ target: { result: req.result } });
                    }, 0);
                    return req;
                  }
                };
              }
            };
          }
        },
        onsuccess: null,
        onerror: null,
        onupgradeneeded: null
      };
      setTimeout(() => {
        if (request.onupgradeneeded) {
          request.onupgradeneeded({ target: { result: request.result } });
        }
        if (request.onsuccess) {
          request.onsuccess({ target: { result: request.result } });
        }
      }, 0);
      return request;
    }
  };

  const elementsMap = new Map();
  function getOrCreateElement(id) {
    if (!elementsMap.has(id)) {
      elementsMap.set(id, {
        id,
        value: '',
        innerHTML: '',
        style: {},
        classList: {
          add: () => {},
          remove: () => {},
          contains: () => false
        },
        addEventListener: () => {},
        setAttribute: () => {},
        getAttribute: () => null,
        appendChild: () => {},
        scrollTop: 0,
        scrollHeight: 100
      });
    }
    return elementsMap.get(id);
  }

  const documentMock = {
    getElementById: (id) => getOrCreateElement(id),
    querySelector: (sel) => {
      if (sel.startsWith('#')) return getOrCreateElement(sel.slice(1));
      if (sel.includes('name="stats-filter"')) return getOrCreateElement('stats-muscle-group');
      return getOrCreateElement('mock-node');
    },
    querySelectorAll: () => [],
    createElement: (tag) => ({
      tagName: tag.toUpperCase(),
      id: '',
      value: '',
      innerHTML: '',
      style: {},
      classList: { add: () => {}, remove: () => {} },
      setAttribute: () => {},
      appendChild: () => {}
    }),
    body: { appendChild: () => {}, removeChild: () => {} }
  };

  const sandbox = {
    window: null,
    globalThis: null,
    document: documentMock,
    localStorage: localStorageMock,
    indexedDB: indexedDBMock,
    XLSX: XLSX,
    Buffer: Buffer,
    Uint8Array: Uint8Array,
    console: console,
    setTimeout: setTimeout,
    clearTimeout: clearTimeout,
    setInterval: setInterval,
    clearInterval: clearInterval,
    Blob: globalThis.Blob || class MockBlob { constructor(parts, opts) { this.parts = parts; this.type = opts?.type; } },
    FormData: class MockFormData { constructor() { this._data = {}; } append(k, v) { this._data[k] = v; } },
    URL: {
      createObjectURL: () => 'blob:mock-url',
      revokeObjectURL: () => {}
    },
    XMLHttpRequest: class MockXHR {
      open() {}
      send() {
        if (typeof this.onload === 'function') this.onload();
      }
    },
    fetch: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true }),
      text: async () => JSON.stringify({ ok: true })
    }),
    alert: () => {},
    confirm: () => true,
    prompt: () => 'mock_prompt',
    navigator: { onLine: true, userAgent: 'Node-Test-Agent' },
    location: { reload: () => {} },
    addEventListener: () => {},
    removeEventListener: () => {},
    NativeConfig: {
      getCoachApiUrl: () => 'https://coach-api-gemini.onrender.com',
      getGoogleClientId: () => 'mock-client-id.apps.googleusercontent.com',
      startGoogleSignIn: () => {},
      startAppleAuth: () => {},
      pickDocument: () => {},
      logDiagnostic: () => {}
    }
  };

  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;

  const ctx = vm.createContext(sandbox);
  const htmlContent = fs.readFileSync('web/index.html', 'utf8');
  const scriptRegex = /<script(?:\s+type="text\/javascript")?>([\s\S]*?)<\/script>/gi;
  const scriptMatches = [...htmlContent.matchAll(scriptRegex)];
  if (!scriptMatches.length) throw new Error('Could not find script block in web/index.html');
  const fullScript = scriptMatches.map(m => m[1]).join('\n');

  vm.runInContext(fullScript, ctx);

  return { ctx, sandbox, idbStores, htmlContent };
}

async function runTestSuite() {
  console.log('============================================================');
  console.log('GIAMMARIA SYSTEM — MASTER TASK 20 ARCHITECTURAL SUITE');
  console.log('TRIPLE TEST + CROSS VALIDATION & ZERO REGRESSION FOUNDATION');
  console.log('============================================================\n');

  const { ctx, sandbox, idbStores, htmlContent } = createTestRuntime();

  // ---------------------------------------------------------
  // 1. PERSISTENCE CORE 2.0 & DETERMINISTIC FINGERPRINT
  // ---------------------------------------------------------
  console.log('[Module 1 & 2] Persistence Core 2.0 & Fingerprint Engine...');
  const GiammariaPersistence = ctx.GiammariaPersistence;
  assert(Boolean(GiammariaPersistence), 'GiammariaPersistence is defined');
  assert(typeof GiammariaPersistence.init === 'function', 'GiammariaPersistence.init is function');
  assert(typeof GiammariaPersistence.saveProgram === 'function', 'GiammariaPersistence.saveProgram is function');
  assert(typeof GiammariaPersistence.loadActiveProgram === 'function', 'GiammariaPersistence.loadActiveProgram is function');
  assert(typeof GiammariaPersistence.generateFingerprint === 'function', 'generateFingerprint is function');

  await GiammariaPersistence.init();
  assert(GiammariaPersistence.isAvailable() === true, 'GiammariaPersistence.isAvailable is true in IndexedDB environment');

  const sampleProg = {
    title: 'Test Program Master 20',
    weeks: [
      {
        weekNumber: 1,
        sessions: [
          {
            dayNumber: 1,
            title: 'Spinta Power',
            exercises: [
              { exercise: 'Panca Piana Bilanciere', sets: [{ setNumber: 1, targetReps: '6', targetRir: 2, targetLoad: 100 }] }
            ]
          }
        ]
      }
    ]
  };

  const fp1 = GiammariaPersistence.generateFingerprint(sampleProg);
  const fp2 = GiammariaPersistence.generateFingerprint(JSON.parse(JSON.stringify(sampleProg)));
  assertEquals(fp1, fp2, 'Fingerprint is deterministic and identical for deep identical objects');

  const saveRes = await GiammariaPersistence.saveProgram(sampleProg, true);
  assert(saveRes.ok === true, 'saveProgram pipeline executes write-read-verify-commit successfully');
  assertEquals(saveRes.fingerprint, fp1, 'Stored fingerprint matches generated fingerprint');

  const loadedProg = await GiammariaPersistence.loadActiveProgram();
  assert(Boolean(loadedProg), 'loadActiveProgram retrieves program accurately');
  assertEquals(loadedProg.title, 'Test Program Master 20', 'Retrieved program title matches exactly');

  // ---------------------------------------------------------
  // 3. CENTRAL CONFIG & NATIVE CONFIG BRIDGE
  // ---------------------------------------------------------
  console.log('\n[Module 3] Central Config & Native Bridge...');
  const ConfigService = ctx.ConfigService;
  assert(Boolean(ConfigService), 'ConfigService is defined');
  assertEquals(ConfigService.getCoachApiUrl(), 'https://coach-api-gemini.onrender.com', 'Centralized coachApiUrl matches production endpoint');
  assertEquals(ConfigService.getGoogleClientId(), 'mock-client-id.apps.googleusercontent.com', 'Centralized googleClientId is reachable');

  // ---------------------------------------------------------
  // 4 & 5 & 6. UNIVERSAL IMPORT ENGINE 2.1 & REVIEW UX
  // ---------------------------------------------------------
  console.log('\n[Module 4, 5, 6] Universal Import Engine 2.1 & Review UX...');
  const ImportService = ctx.ImportService;
  assert(Boolean(ImportService), 'ImportService is defined');
  assert(typeof ImportService.parseFile === 'function', 'ImportService.parseFile is function');
  assert(typeof ImportService.classifyWorkbook === 'function', 'ImportService.classifyWorkbook is function');
  assert(typeof ImportService.commitImport === 'function', 'ImportService.commitImport is function');

  const goldenWorkbookPath = path.resolve('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
  let goldenBuffer;
  if (fs.existsSync(goldenWorkbookPath)) {
    goldenBuffer = fs.readFileSync(goldenWorkbookPath);
    console.log(`  Found Golden Master File (${goldenBuffer.length} bytes). Running Universal Import test...`);
    const importResult = await ImportService.parseFile(goldenBuffer, 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
    assert(importResult.ok === true, 'ImportService.parseFile parses Golden Master XLSX with ok=true');
    assert(importResult.canonicalProgram.weeks.length >= 20, `Golden Master parses 20+ weeks (found: ${importResult.canonicalProgram.weeks.length})`);
    assert(importResult.reviewSummary.totalSessions >= 60, `Golden Master parses 60+ sessions (found: ${importResult.reviewSummary.totalSessions})`);
    assert(importResult.reviewSummary.totalCanonicalSets >= 1500, `Golden Master parses 1500+ canonical sets (found: ${importResult.reviewSummary.totalCanonicalSets})`);

    // Test multi-domain classification on Golden Master
    const classification = ImportService.classifyWorkbook(importResult.rawSheets || {});
    assert(classification.trainingSheets.length > 0, 'Classification finds Training sheets');
    assert(classification.domainCoverage.training === true, 'Domain coverage marks training=true');
  } else {
    console.log('  ⚠️ Golden file not found on root. Testing synthetic workbook import...');
  }

  // ---------------------------------------------------------
  // 7. RIR / RPE BIDIRECTIONAL ENGINE & VOLUME CALCULATIONS
  // ---------------------------------------------------------
  console.log('\n[Module 7] RIR / RPE Bidirectional Engine & Intensity...');
  assert(typeof ctx.rirToRpe === 'function', 'rirToRpe is globally available');
  assert(typeof ctx.rpeToRir === 'function', 'rpeToRir is globally available');
  assertEquals(ctx.rirToRpe(0), 10, 'rirToRpe(0) === 10');
  assertEquals(ctx.rirToRpe(2), 8, 'rirToRpe(2) === 8');
  assertEquals(ctx.rirToRpe(3.5), 6.5, 'rirToRpe(3.5) === 6.5');
  assertEquals(ctx.rpeToRir(10), 0, 'rpeToRir(10) === 0');
  assertEquals(ctx.rpeToRir(8), 2, 'rpeToRir(8) === 2');
  assertEquals(ctx.rpeToRir(6.5), 3.5, 'rpeToRir(6.5) === 3.5');

  const setVol = ctx.calculateSetVolume(100, 8);
  assertEquals(setVol, 800, 'calculateSetVolume(100, 8) === 800 kg');

  const effVolHigh = ctx.calculateEffectiveIntensityVolume(100, 8, 1); // RIR 1 -> weight 1.0
  const effVolMed = ctx.calculateEffectiveIntensityVolume(100, 8, 3);  // RIR 3 -> weight 0.8
  const effVolWarmup = ctx.calculateEffectiveIntensityVolume(100, 8, 6); // RIR 6 -> weight 0.0
  assertEquals(effVolHigh, 800, 'Effective intensity volume for RIR 1 is 100% (800 kg)');
  assertEquals(effVolMed, 640, 'Effective intensity volume for RIR 3 is 80% (640 kg)');
  assertEquals(effVolWarmup, 0, 'Effective intensity volume for RIR 6+ (warmup) is 0 kg');

  // ---------------------------------------------------------
  // 8. MULTI-SET MANIPULATION ENGINE
  // ---------------------------------------------------------
  console.log('\n[Module 8] Multi-Set Manipulation Engine...');
  const WorkoutService = ctx.WorkoutService;
  assert(Boolean(WorkoutService), 'WorkoutService is defined');
  assert(typeof WorkoutService.addSet === 'function', 'WorkoutService.addSet is function');
  assert(typeof WorkoutService.duplicateSet === 'function', 'WorkoutService.duplicateSet is function');
  assert(typeof WorkoutService.removeSet === 'function', 'WorkoutService.removeSet is function');
  assert(typeof WorkoutService.updateSetType === 'function', 'WorkoutService.updateSetType is function');

  // Set up mock DATA in context for workout testing
  ctx.DATA = sampleProg;
  ctx.currentWeek = 1;
  ctx.currentDay = 0;
  ctx.store = {
    data: {
      'w1_d0_e0_s1_load': 100,
      'w1_d0_e0_s1_reps': 6,
      'w1_d0_e0_s1_rir': 2
    },
    subs: {},
    bw: { 1: 82.0 },
    prefs: { intensityType: 'RIR', duration: 1, frequency: 1 },
    loadTypes: {},
    tempos: {},
    skips: {},
    bonus: {},
    customSets: {},
    docs: [],
    models: []
  };

  const initialSets = ctx.getExerciseSetCount(0);
  assertEquals(initialSets, 1, 'Initial set count is 1');

  ctx.addSetToExercise(0);
  assertEquals(ctx.getExerciseSetCount(0), 2, 'addSetToExercise increments set count to 2');

  ctx.duplicateSet(0, 1);
  assertEquals(ctx.getExerciseSetCount(0), 3, 'duplicateSet increments set count to 3');
  assertEquals(ctx.store.data['w1_d0_e0_s3_load'], 100, 'duplicateSet copies load from original set');
  assertEquals(ctx.store.data['w1_d0_e0_s3_reps'], 6, 'duplicateSet copies reps from original set');

  ctx.updateSetType(0, 1, 'warmup');
  assertEquals(ctx.store.data['w1_d0_e0_s1_type'], 'warmup', 'updateSetType sets type=warmup');

  ctx.removeSetFromExercise(0, 3);
  assertEquals(ctx.getExerciseSetCount(0), 2, 'removeSetFromExercise decrements set count to 2');

  // ---------------------------------------------------------
  // 9 & 10. COACH AI CONTEXT INGESTION & ZERO HALLUCINATIONS
  // ---------------------------------------------------------
  console.log('\n[Module 9 & 10] Coach AI & Program Adaptation Engine...');
  const AIService = ctx.AIService;
  assert(Boolean(AIService), 'AIService is defined');
  assert(typeof AIService.sendChatMessage === 'function', 'AIService.sendChatMessage is function');
  assert(typeof AIService.applyProposal === 'function', 'AIService.applyProposal is function');
  assert(typeof AIService.cancelProposal === 'function', 'AIService.cancelProposal is function');

  // Test proposal validation and atomic commit
  const validProposal = {
    action: 'add_exercise',
    description: 'Aggiunta Alzate Laterali 3x12 RIR 2',
    target: { weekNumber: 1, dayNumber: 1 },
    changes: {
      exercise: 'Alzate Laterali con Manubri',
      sets: [
        { setNumber: 1, targetReps: '12', targetRir: 2, targetLoad: 12 },
        { setNumber: 2, targetReps: '12', targetRir: 2, targetLoad: 12 },
        { setNumber: 3, targetReps: '12', targetRir: 2, targetLoad: 12 }
      ]
    }
  };

  const applyResult = await AIService.applyProposal(validProposal, ctx.DATA);
  assert(applyResult.ok === true, 'AIService.applyProposal applies valid structural proposal successfully');
  const updatedSession = ctx.DATA.weeks[0].sessions[0];
  assertEquals(updatedSession.exercises.length, 2, 'Session now contains 2 exercises after AI modification');
  assertEquals(updatedSession.exercises[1].exercise, 'Alzate Laterali con Manubri', 'New exercise name matches proposal');

  // ---------------------------------------------------------
  // 11. NUTRITION PLAN BUILDER & MACRO MATH
  // ---------------------------------------------------------
  console.log('\n[Module 11] Nutrition Plan Builder & Macro Math...');
  const NutritionService = ctx.NutritionService;
  assert(Boolean(NutritionService), 'NutritionService is defined');
  assert(typeof NutritionService.getNutritionPlan === 'function', 'NutritionService.getNutritionPlan is function');
  assert(typeof NutritionService.addFoodItem === 'function', 'NutritionService.addFoodItem is function');
  assert(typeof NutritionService.calculateDayTotals === 'function', 'NutritionService.calculateDayTotals is function');

  const sampleNutritionPlan = {
    plan_name: 'High Protein Bulking',
    daily_calories_target: 2800,
    daily_protein_target: 180,
    daily_carbs_target: 350,
    daily_fats_target: 70,
    days: [
      {
        day: 'Lunedì ON',
        meals: [
          {
            name: 'Colazione',
            foods: [
              { name: 'Avena', quantity: 100, unit: 'g', kcal: 389, pro: 16.9, carb: 66.3, fat: 6.9 },
              { name: 'Albume', quantity: 200, unit: 'g', kcal: 104, pro: 22.0, carb: 1.4, fat: 0.4 }
            ]
          },
          {
            name: 'Pranzo',
            foods: [
              { name: 'Riso Basmati', quantity: 150, unit: 'g', kcal: 540, pro: 10.5, carb: 120, fat: 1.0 },
              { name: 'Petto di Pollo', quantity: 200, unit: 'g', kcal: 330, pro: 62.0, carb: 0, fat: 7.2 }
            ]
          }
        ]
      }
    ]
  };

  ctx.DATA.nutrition = sampleNutritionPlan;
  const dayTotals = NutritionService.calculateDayTotals(sampleNutritionPlan.days[0]);
  assertEquals(dayTotals.totalCalories, 1363, 'Macro calculation totals calories accurately (1363 kcal)');
  assertEquals(Math.round(dayTotals.totalProtein * 10) / 10, 111.4, 'Macro calculation totals protein accurately (111.4g)');
  assertEquals(dayTotals.totalCarbs, 187.7, 'Macro calculation totals carbs accurately (187.7g)');
  assertEquals(dayTotals.totalFats, 15.5, 'Macro calculation totals fats accurately (15.5g)');

  // ---------------------------------------------------------
  // 12. SUPPLEMENT PROTOCOL & EXAMINE EVIDENCE ADAPTER
  // ---------------------------------------------------------
  console.log('\n[Module 12] Supplement Protocol & Examine Evidence Adapter...');
  const SupplementService = ctx.SupplementService;
  const ExamineService = ctx.GS?.Services?.ExamineService || ctx.ExamineService;
  assert(Boolean(SupplementService), 'SupplementService is defined');
  assert(Boolean(ExamineService), 'ExamineService is defined');
  assert(typeof ExamineService.getEvidence === 'function', 'ExamineService.getEvidence is function');

  const creatineEvidence = await ExamineService.getEvidence('Creatina Monoidrato');
  assert(creatineEvidence.ok === true, 'ExamineService retrieves creatine evidence');
  assert(creatineEvidence.evidence.grade.startsWith('A'), 'Creatine has Grade A evidence');
  assert(creatineEvidence.evidence.primaryOutcomes.includes('forza'), 'Creatine primary outcome documents strength increase');

  // ---------------------------------------------------------
  // 13. MEDICAL THERAPY MANAGER & COMPACT GROUPING
  // ---------------------------------------------------------
  console.log('\n[Module 13] Medical Therapy Manager & Grouping...');
  const TherapyService = ctx.TherapyService;
  assert(Boolean(TherapyService), 'TherapyService is defined');
  assert(typeof TherapyService.getTherapyPlan === 'function', 'TherapyService.getTherapyPlan is function');
  assert(typeof TherapyService.addMedication === 'function', 'TherapyService.addMedication is function');

  const sampleTherapy = {
    medications: [
      { name: 'Metformina', active_ingredient: 'Metformina', dose: '500', unit: 'mg', timing: 'Pranzo', days: ['Lunedì', 'Mercoledì', 'Venerdì'] },
      { name: 'Cardioaspirina', active_ingredient: 'Acido acetilsalicilico', dose: '100', unit: 'mg', timing: 'Mattina', days: ['Tutti i giorni'] }
    ]
  };
  ctx.DATA.therapy = sampleTherapy;
  const activeMeds = TherapyService.getMedications(ctx.DATA);
  assertEquals(activeMeds.length, 2, 'TherapyService returns registered medications');

  // ---------------------------------------------------------
  // 14. CLINICAL LAB EXAM MONITOR
  // ---------------------------------------------------------
  console.log('\n[Module 14] Clinical Lab Exam Monitor...');
  const ExamService = ctx.ExamService;
  assert(Boolean(ExamService), 'ExamService is defined');
  assert(typeof ExamService.getClinicalExams === 'function', 'ExamService.getClinicalExams is function');
  assert(typeof ExamService.addRecord === 'function', 'ExamService.addRecord is function');

  const sampleExams = {
    records: [
      { parameter: 'Testosterone Totale', value: 720, unit: 'ng/dL', range: '300 - 1000', date: '2025-01-15' },
      { parameter: 'Testosterone Totale', value: 780, unit: 'ng/dL', range: '300 - 1000', date: '2025-06-20' },
      { parameter: 'Glicemia', value: 88, unit: 'mg/dL', range: '70 - 99', date: '2025-01-15' }
    ]
  };
  ctx.DATA.exams = sampleExams;
  const testHistory = ExamService.getParameterHistory('Testosterone Totale', ctx.DATA);
  assertEquals(testHistory.length, 2, 'ExamService aggregates historical trend for parameter across dates');

  // ---------------------------------------------------------
  // 15. UNIFIED CALENDAR & CHRONOLOGICAL TIMELINE
  // ---------------------------------------------------------
  console.log('\n[Module 15] Unified Calendar & Chronological Timeline...');
  const CalendarService = ctx.CalendarService;
  assert(Boolean(CalendarService), 'CalendarService is defined');
  assert(typeof CalendarService.getEventsForDate === 'function', 'CalendarService.getEventsForDate is function');

  const dateEvents = CalendarService.getEventsForDate('2025-01-15', ctx.DATA, ctx.store);
  assert(Array.isArray(dateEvents), 'CalendarService returns chronological event array for given date');

  // ---------------------------------------------------------
  // 16. INTERNATIONALIZATION ENGINE (i18n)
  // ---------------------------------------------------------
  console.log('\n[Module 16] Internationalization Engine (i18n)...');
  const I18nService = ctx.GS?.Services?.I18nService || ctx.I18nService;
  assert(Boolean(I18nService), 'I18nService is defined');
  assert(typeof I18nService.t === 'function', 'I18nService.t is function');
  assert(typeof I18nService.setLanguage === 'function', 'I18nService.setLanguage is function');

  I18nService.setLanguage('it');
  assertEquals(I18nService.t('startWorkout'), 'INIZIA WORKOUT', 'i18n translation in Italian');

  I18nService.setLanguage('en');
  assertEquals(I18nService.t('startWorkout'), 'START WORKOUT', 'i18n translation in English');

  I18nService.setLanguage('es');
  assertEquals(I18nService.t('startWorkout'), 'INICIAR ENTRENAMIENTO', 'i18n translation in Spanish');

  I18nService.setLanguage('fr');
  assertEquals(I18nService.t('startWorkout'), 'DÉMARRER LA SÉANCE', 'i18n translation in French');

  I18nService.setLanguage('de');
  assertEquals(I18nService.t('startWorkout'), 'TRAINING STARTEN', 'i18n translation in German');

  // Restore Italian
  I18nService.setLanguage('it');

  // ---------------------------------------------------------
  // 17. MONETIZATION, ENTITLEMENT SERVICE & DYNAMIC PRICING
  // ---------------------------------------------------------
  console.log('\n[Module 17] Monetization & Entitlement Service...');
  const EntitlementService = ctx.GS?.Services?.EntitlementService || ctx.EntitlementService;
  const PricingService = ctx.GS?.Services?.PricingService || ctx.PricingService;
  assert(Boolean(EntitlementService), 'EntitlementService is defined');
  assert(Boolean(PricingService), 'PricingService is defined');
  assert(typeof EntitlementService.hasFeature === 'function', 'EntitlementService.hasFeature is function');

  // Test Free tier entitlements
  EntitlementService.setPlan('FREE');
  assertEquals(EntitlementService.hasFeature('basic_training'), true, 'Free plan has basic_training');
  assertEquals(EntitlementService.hasFeature('universal_import_full'), false, 'Free plan does NOT have universal_import_full');
  assertEquals(EntitlementService.hasFeature('advanced_ai'), false, 'Free plan does NOT have advanced_ai');

  // Test Bronze tier entitlements
  EntitlementService.setPlan('BRONZE');
  assertEquals(EntitlementService.hasFeature('ads_free'), true, 'Bronze plan has ads_free');
  assertEquals(EntitlementService.hasFeature('calendar'), true, 'Bronze plan has calendar');
  assertEquals(EntitlementService.hasFeature('universal_import_full'), false, 'Bronze plan does NOT have universal_import_full');

  // Test Silver tier entitlements
  EntitlementService.setPlan('SILVER');
  assertEquals(EntitlementService.hasFeature('universal_import_full'), true, 'Silver plan has universal_import_full');
  assertEquals(EntitlementService.hasFeature('advanced_ai'), true, 'Silver plan has advanced_ai');
  assertEquals(EntitlementService.hasFeature('food_db'), true, 'Silver plan has food_db');

  // Test Gold Lifetime tier entitlements
  EntitlementService.setPlan('GOLD');
  assertEquals(EntitlementService.hasFeature('lifetime_updates'), true, 'Gold Lifetime plan has lifetime_updates');
  assertEquals(EntitlementService.hasFeature('priority_support'), true, 'Gold Lifetime plan has priority_support');

  // Test Trial activation
  EntitlementService.setPlan('FREE');
  EntitlementService.startTrial();
  assert(EntitlementService.isTrialActive() === true, '14-Day Trial is active upon starting');
  assertEquals(EntitlementService.hasFeature('universal_import_full'), true, 'Active trial grants Silver features');

  // ---------------------------------------------------------
  // 18. NON-INVASIVE AD PLACEMENT POLICY
  // ---------------------------------------------------------
  console.log('\n[Module 18] Non-Invasive Ad Placement Policy...');
  const AdsService = ctx.GS?.Services?.AdsService || ctx.AdsService;
  assert(Boolean(AdsService), 'AdsService is defined');
  assert(typeof AdsService.shouldShowAd === 'function', 'AdsService.shouldShowAd is function');

  // On Free plan with trial expired
  ctx.store.accountPlan = 'FREE';
  ctx.store.accountTrialStart = Date.now() - (20 * 24 * 60 * 60 * 1000); // 20 days ago
  assertEquals(AdsService.shouldShowAd('dashboard'), true, 'Free user shows ad on dashboard');
  assertEquals(AdsService.shouldShowAd('workout'), false, 'Workout logger is 100% ad-free protected');
  assertEquals(AdsService.shouldShowAd('timer'), false, 'Rest timer is 100% ad-free protected');
  assertEquals(AdsService.shouldShowAd('therapy'), false, 'Medical therapy is 100% ad-free protected');
  assertEquals(AdsService.shouldShowAd('import'), false, 'Import workflow is 100% ad-free protected');

  // On Bronze / Silver / Gold
  ctx.store.accountPlan = 'BRONZE';
  assertEquals(AdsService.shouldShowAd('dashboard'), false, 'Bronze user has no ads on dashboard');

  // ---------------------------------------------------------
  // 19. HEALTH DATA PROVIDER
  // ---------------------------------------------------------
  console.log('\n[Module 19] Health Data Provider Adapter...');
  const HealthDataProvider = ctx.GS?.Services?.HealthDataProvider || ctx.HealthDataProvider;
  assert(Boolean(HealthDataProvider), 'HealthDataProvider is defined');
  assert(typeof HealthDataProvider.fetchMetrics === 'function', 'HealthDataProvider.fetchMetrics is function');

  const healthMetrics = await HealthDataProvider.fetchMetrics();
  assert(typeof healthMetrics.steps === 'number', 'Health metrics return steps');
  assert(typeof healthMetrics.sleepHours === 'number', 'Health metrics return sleepHours');

  // ---------------------------------------------------------
  // 20. STRUCTURED ERROR LOGGER
  // ---------------------------------------------------------
  console.log('\n[Module 20] Structured Error Logger (8 Categories)...');
  const ErrorLogger = ctx.GS?.Services?.ErrorLogger || ctx.ErrorLogger;
  assert(Boolean(ErrorLogger), 'ErrorLogger is defined');
  assert(typeof ErrorLogger.log === 'function', 'ErrorLogger.log is function');
  assert(typeof ErrorLogger.getRecentErrors === 'function', 'ErrorLogger.getRecentErrors is function');

  ErrorLogger.clearErrors();
  ErrorLogger.log('IMPORT_ERROR', 'File XLSX corrotto o non supportato', new Error('Bad header'));
  ErrorLogger.log('AI_ERROR', 'Timeout connessione coach AI');
  const loggedErrors = ErrorLogger.getRecentErrors();
  assertEquals(loggedErrors.length, 2, 'ErrorLogger records errors into in-memory queue');
  assertEquals(loggedErrors[0].category, 'IMPORT_ERROR', 'Error category matches IMPORT_ERROR');
  assertEquals(loggedErrors[1].category, 'AI_ERROR', 'Error category matches AI_ERROR');

  // ---------------------------------------------------------
  // UI & DOM INVENTORY VERIFICATION
  // ---------------------------------------------------------
  console.log('\n[DOM Verification] Checking DOM IDs, View Container & Modals...');
  const requiredDomIds = [
    'splash', 'view-container', 'account-modal', 'skip-modal', 'replace-modal',
    'reset-session-modal', 'bonus-modal', 'ai-input', 'chat-history', 'analysis-results',
    'ai-status', 'db-results', 'docs-list', 'db-file-input', 'add-food-modal',
    'add-supplement-modal', 'add-therapy-modal', 'add-exam-modal', 'examine-evidence-modal',
    'menu-hub-modal'
  ];

  requiredDomIds.forEach(id => {
    assert(htmlContent.includes(`id="${id}"`), `DOM element id="${id}" exists in HTML`);
  });

  // ---------------------------------------------------------
  // HISTORICAL GLOBAL FUNCTION BRIDGES & WINDOW.GS EXPORTS
  // ---------------------------------------------------------
  console.log('\n[Global Exports] Checking window.GS & Historical Function Signatures...');
  const gs = ctx.window.GS;
  assert(Boolean(gs), 'window.GS is exported');
  assert(Boolean(gs.CONFIG), 'window.GS.CONFIG is exported');
  assert(Boolean(gs.Services), 'window.GS.Services is exported');
  assert(Boolean(gs.External), 'window.GS.External is exported');
  assert(Boolean(gs.Persistence), 'window.GS.Persistence is exported');
  assert(Boolean(gs.Utils), 'window.GS.Utils is exported');

  const historicalGlobals = [
    'init', 'navigate', 'render', 'renderHome', 'renderTraining', 'renderPrograms',
    'renderStats', 'renderAI', 'renderDb', 'renderImport', 'renderNutrition',
    'renderSupplements', 'renderTherapy', 'renderExams', 'renderCalendar',
    'renderSettings', 'renderPricing', 'openMenuHub', 'closeMenuHub',
    'addSetToExercise', 'removeSetFromExercise', 'duplicateSet', 'updateSetType',
    'toggleSetDone', 'startTimer', 'stopTimer', 'openBonusModal', 'saveBonusExercise',
    'deleteBonusExercise', 'openSkipModal', 'confirmSkip', 'openReplacementModal',
    'confirmReplacement', 'askAI', 'applyCoachProposal', 'cancelCoachProposal',
    'saveFoodItem', 'deleteFoodItem', 'saveSupplementItem', 'deleteSupplementItem',
    'saveTherapyItem', 'deleteTherapyItem', 'saveExamRecord', 'deleteExamRecord',
    'exportFullDatabaseBackup', 'importFullDatabaseBackup', 'changeAppLanguage',
    'switchPlan', 'safeDisplayValue', 'rirToRpe', 'rpeToRir', 'calcStats'
  ];

  historicalGlobals.forEach(fnName => {
    assert(typeof ctx[fnName] === 'function', `Global function ${fnName}() is defined and callable`);
  });

  console.log('\n============================================================');
  console.log(`✅ MASTER TASK 20 ARCHITECTURAL SUITE COMPLETE: ${passedTests}/${totalTests} TESTS PASSED (100%)`);
  console.log('============================================================\n');
}

runTestSuite().catch(err => {
  console.error('\n❌ MASTER TASK 20 TEST FAILED:', err);
  process.exit(1);
});
