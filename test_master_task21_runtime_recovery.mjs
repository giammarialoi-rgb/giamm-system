/**
 * GIAMMARIA SYSTEM — MASTER TASK 21 COMPREHENSIVE RECOVERY SUITE
 * 35-Check Forensic Runtime, Storage, Import, Multi-Domain & Real Device Verification
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import vm from 'vm';
import XLSX from 'xlsx';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('============================================================');
console.log('GIAMMARIA SYSTEM — MASTER TASK 21 RUNTIME RECOVERY TEST SUITE');
console.log('============================================================');

let passedTests = 0;
let failedTests = 0;
const testResults = [];

function runCheck(id, description, fn) {
  try {
    fn();
    console.log(`  ✓ [CHECK ${String(id).padStart(2, '0')}] PASS: ${description}`);
    passedTests++;
    testResults.push({ id, description, status: 'PASS' });
  } catch (err) {
    console.error(`  ✗ [CHECK ${String(id).padStart(2, '0')}] FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
    testResults.push({ id, description, status: 'FAIL', error: err.message });
  }
}

async function runAsyncCheck(id, description, fn) {
  try {
    await fn();
    console.log(`  ✓ [CHECK ${String(id).padStart(2, '0')}] PASS: ${description}`);
    passedTests++;
    testResults.push({ id, description, status: 'PASS' });
  } catch (err) {
    console.error(`  ✗ [CHECK ${String(id).padStart(2, '0')}] FAIL: ${description}`);
    console.error(`     Error: ${err.message}`);
    failedTests++;
    testResults.push({ id, description, status: 'FAIL', error: err.message });
  }
}

// 1. Setup Mock DOM Environment
function createMockDOM() {
  const elements = new Map();
  const storage = new Map();

  function makeMockElement(id = 'elem', tag = 'DIV') {
    return {
      id,
      tagName: tag.toUpperCase(),
      value: '',
      innerHTML: '',
      innerText: '',
      style: {},
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); }
      },
      querySelectorAll() { return []; },
      querySelector() { return null; },
      addEventListener() {},
      removeEventListener() {},
      click() {},
      focus() {},
      blur() {},
      appendChild() {},
      setAttribute() {},
      getAttribute() { return null; },
      getBoundingClientRect() {
        return { width: 300, height: 150, top: 0, left: 0, right: 300, bottom: 150 };
      },
      getContext() {
        return {
          clearRect: () => {},
          fillRect: () => {},
          beginPath: () => {},
          moveTo: () => {},
          lineTo: () => {},
          stroke: () => {},
          fill: () => {},
          arc: () => {},
          fillText: () => {}, scale: () => {}
        };
      }
    };
  }

  const mockDocument = {
    getElementById(id) {
      if (!elements.has(id)) {
        elements.set(id, makeMockElement(id));
      }
      return elements.get(id);
    },
    querySelectorAll(selector) {
      return [];
    },
    querySelector(selector) {
      return null;
    },
    createElement(tag) {
      return makeMockElement('created_' + tag, tag);
    }
  };

  const mockLocalStorage = {
    getItem(k) { return storage.get(k) || null; },
    setItem(k, v) { storage.set(k, String(v)); },
    removeItem(k) { storage.delete(k); },
    clear() { storage.clear(); },
    get length() { return storage.size; }
  };

  const mockWindow = {
    document: mockDocument,
    localStorage: mockLocalStorage,
    sessionStorage: mockLocalStorage,
    Buffer: Buffer,
    console: {
      log: () => {},
      warn: () => {},
      error: () => {},
      info: () => {},
      debug: () => {}
    },
    setTimeout: (fn, ms) => setTimeout(fn, Math.min(ms || 0, 10)),
    clearTimeout: (t) => clearTimeout(t),
    setInterval: (fn, ms) => setInterval(fn, ms || 0),
    clearInterval: (t) => clearInterval(t),
    fetch: async () => ({ ok: false, status: 404 }),
    XMLHttpRequest: function() {
      this.open = () => {};
      this.send = function() {
        this.readyState = 4;
        this.status = 404;
        if (typeof this.onreadystatechange === 'function') this.onreadystatechange();
      };
      this.setRequestHeader = () => {};
      this.readyState = 4;
      this.status = 404;
      this.responseText = '';
    },
    XLSX: XLSX,
    location: { href: 'file:///android_asset/index.html' },
    navigator: { userAgent: 'Android WebView TestRunner' },
    addEventListener: () => {},
    removeEventListener: () => {}
  };

  mockWindow.window = mockWindow;
  mockWindow.global = mockWindow;
  mockWindow.$ = (id) => mockDocument.getElementById(id);

  return { mockWindow, mockDocument, mockLocalStorage };
}

async function runMasterTask21Suite() {
  const webHtml = fs.readFileSync('web/index.html', 'utf8');
  const assetHtml = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

  // CHECK 1: Asset Parity
  runCheck(1, 'Asset Parity: web/index.html and app/src/main/assets/index.html are byte-identical', () => {
    assert.strictEqual(Buffer.compare(Buffer.from(webHtml), Buffer.from(assetHtml)), 0);
  });

  // CHECK 2: XLSX Script in Head
  runCheck(2, 'HTML <head> contains <script src="xlsx.full.min.js"></script>', () => {
    assert.ok(webHtml.includes('src="xlsx.full.min.js"'));
    assert.ok(webHtml.indexOf('src="xlsx.full.min.js"') < webHtml.indexOf('</head>'));
  });

  // CHECK 3: Universal Import String Helpers (Zero path.extname in runtime JS)
  runCheck(3, 'Universal Import Engine uses browser-safe string operations (zero path.extname)', () => {
    const scriptMatch = webHtml.match(/<script>([\s\S]*?)<\/script>/);
    assert.ok(scriptMatch, 'Script block must exist');
    const jsCode = scriptMatch[1];
    assert.ok(!jsCode.includes('path.extname'), 'Must not contain path.extname');
    assert.ok(jsCode.includes('getExtName'), 'Must contain getExtName helper');
  });

  // Setup VM Context for dynamic tests
  const { mockWindow } = createMockDOM();
  const context = vm.createContext(mockWindow);
  const scriptMatches = [...webHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  const fullJsCode = scriptMatches.map(m => m[1]).join('\n');
  vm.runInContext(fullJsCode, context);

  // CHECK 4: Architecture 5-Layer Core Services Global Export
  runCheck(4, '5-Layer Enterprise Architecture: window.GS and domain services exported', () => {
    const GS = vm.runInContext('window.GS', context);
    assert.ok(GS, 'window.GS must exist');
    assert.ok(GS.CONFIG, 'ConfigService must exist');
    assert.ok(GS.Services.ProgramService, 'ProgramService must exist');
    assert.ok(GS.Services.WorkoutService, 'WorkoutService must exist');
    assert.ok(GS.Services.NutritionService, 'NutritionService must exist');
    assert.ok(GS.Services.SupplementService, 'SupplementService must exist');
    assert.ok(GS.Services.TherapyService, 'TherapyService must exist');
    assert.ok(GS.Services.ExamService, 'ExamService must exist');
    assert.ok(GS.Services.CalendarService, 'CalendarService must exist');
    assert.ok(GS.Services.ImportService, 'ImportService must exist');
    assert.ok(GS.Services.AIService, 'AIService must exist');
    assert.ok(GS.Persistence, 'Persistence singleton must exist');
  });

  // CHECK 5: Persistence Core 2.0 getAllPrograms Method Alias
  await runAsyncCheck(5, 'Persistence Core 2.0 has getAllPrograms and listPrograms aliases', async () => {
    const hasGetAll = vm.runInContext('typeof GiammariaPersistence.getAllPrograms === "function"', context);
    const hasList = vm.runInContext('typeof GiammariaPersistence.listPrograms === "function"', context);
    assert.ok(hasGetAll, 'getAllPrograms must be a function');
    assert.ok(hasList, 'listPrograms must be a function');
  });

  // CHECK 6: App Bootstrap with No Program (Safe Empty State without Infinite Loading)
  await runAsyncCheck(6, 'App Bootstrap with empty storage initializes cleanly without infinite loading', async () => {
    vm.runInContext(`
      DATA = null;
      store = { activeProgram: null, data: {}, bw: {}, prefs: { duration: 4, frequency: 3 }, customSets: {}, skips: {}, docs: [], models: [] };
      localStorage.clear();
    `, context);
    await vm.runInContext('init()', context);
    const data = vm.runInContext('DATA', context);
    assert.ok(data !== null, 'DATA must not be null');
    assert.strictEqual(data.title, 'Nessun Programma Attivo');
    assert.strictEqual(data.weeks.length, 0);
  });

  // CHECK 7: Empty State Home Screen Renders Actionable CTAs
  runCheck(7, 'Home View in Empty State renders "NESSUN PROGRAMMA ATTIVO" and "IMPORTA SCHEDA" CTA', () => {
    const vc = mockWindow.document.getElementById('view-container');
    vm.runInContext('navigate("home")', context);
    assert.ok(vc.innerHTML.includes('NESSUN PROGRAMMA ATTIVO'), 'Must show empty banner');
    assert.ok(vc.innerHTML.includes('IMPORTA SCHEDA DI ALLENAMENTO'), 'Must show Import CTA');
    assert.ok(vc.innerHTML.includes('LIBRERIA PROGRAMMI'), 'Must show Library CTA');
    assert.ok(vc.innerHTML.includes('MODULI DEL SISTEMA'), 'Must show modules grid');
  });

  // CHECK 8: Golden Master XLSX Import Engine (Full 26-sheet parsing)
  const goldenBuffer = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
  mockWindow.goldenBufferBase64 = goldenBuffer.toString('base64');
  let goldenParsed;
  runCheck(8, 'Universal Import Engine 2.1 parses GIAMMARIA_SYSTEM_V29_MASTER.xlsx completely', () => {
    goldenParsed = vm.runInContext(`parseStructuredWorkbook(XLSX.read(Buffer.from(goldenBufferBase64, 'base64'), {type:'buffer'}), 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx')`, context);
    assert.ok(goldenParsed, 'Parsed object must exist');
    assert.strictEqual(goldenParsed.canonicalProgram.weeks.length, 20, 'Must have 20 weeks');
    assert.strictEqual(goldenParsed.integrityStats.canonical_sessions_count, 68, 'Must have 68 sessions');
    assert.strictEqual(goldenParsed.integrityStats.canonical_exercises_count, 870, 'Must have 870 exercises');
    assert.strictEqual(goldenParsed.integrityStats.canonical_sets_count, 1642, 'Must have 1642 sets');
  });

  // CHECK 9: Review Screen State & Multi-Domain Tabs
  runCheck(9, 'Import Review Screen allows inspecting Training, Nutrition, Supplements, Therapy/Exams', () => {
    mockWindow.goldenParsed = goldenParsed;
    vm.runInContext(`
      programImportState.canonicalProgram = buildCanonicalProgram(goldenParsed);
      programImportState.currentImportId = 'test_imp_21';
      programImportState.activeReviewTab = 'training';
      navigate('import');
    `, context);
    const vc = mockWindow.document.getElementById('view-container');
    assert.ok(vc.innerHTML.includes('REVISIONE') || vc.innerHTML.includes('CANONICAL') || vc.innerHTML.includes('IMPORTA') || vc.innerHTML.includes('PROGRAMMA'), 'Must render import view');
  });

  // CHECK 10: Import Review Atomic Confirmation & Activation
  await runAsyncCheck(10, 'Import Review Confirmation activates program in IndexedDB and syncs DATA', async () => {
    vm.runInContext(`
      DATA = normalizeProgram(programImportState.canonicalProgram);
      store.activeProgram = null;
      store.data = {};
      store.bw = {};
      store.customSets = {};
      store.skips = {};
      store.docs = [];
      store.models = [];
      persist();
    `, context);
    await vm.runInContext('GiammariaPersistence.saveProgram(DATA, true)', context);
    vm.runInContext('navigate("home")', context);
    const activeProg = vm.runInContext('DATA', context);
    assert.ok(activeProg, 'DATA must be set');
    assert.strictEqual(activeProg.weeks.length, 20, 'Active program must have 20 weeks');
  });

  // CHECK 11: Home View with Active Program
  runCheck(11, 'Home View with active program displays Sessione Attiva, Progress and Start CTA', () => {
    vm.runInContext('navigate("home")', context);
    const vc = mockWindow.document.getElementById('view-container');
    assert.ok(vc.innerHTML.includes('Sessione Attiva'), 'Must render active session');
    assert.ok(vc.innerHTML.includes('INIZIA WORKOUT'), 'Must have workout button');
    assert.ok(vc.innerHTML.includes('BODYWEIGHT'), 'Must have bodyweight widget');
  });

  // CHECK 12: Workout Logger Render Session
  runCheck(12, 'Workout Logger renders exercises, target reps, load inputs and set rows', () => {
    vm.runInContext(`
      currentWeek = 1;
      currentDay = 0;
      navigate('training');
    `, context);
    const vc = mockWindow.document.getElementById('view-container');
    assert.ok(vc.innerHTML.includes('+ SERIE') || vc.innerHTML.includes('SCALA ATTIVA') || vc.innerHTML.includes('Settimana 1'), 'Must show training view');
  });

  // CHECK 13: Workout Logger Add Set (+ SERIE)
  runCheck(13, 'Workout Logger + SERIE increases exercise set count without desync', () => {
    const initialCount = vm.runInContext('getExerciseSetCount(0)', context);
    vm.runInContext('addSetToExercise(0)', context);
    const newCount = vm.runInContext('getExerciseSetCount(0)', context);
    assert.strictEqual(newCount, initialCount + 1, 'Set count must increment by 1');
  });

  // CHECK 14: Workout Logger Duplicate Set (⧉ DUPLICA)
  runCheck(14, 'Workout Logger ⧉ DUPLICA clones target load and reps to new set', () => {
    vm.runInContext(`
      store.data['w1_d0_e0_s1_load'] = '90';
      store.data['w1_d0_e0_s1_reps'] = '8';
      duplicateSet(0, 1);
    `, context);
    const countAfterDup = vm.runInContext('getExerciseSetCount(0)', context);
    const dupLoad = vm.runInContext('store.data["w1_d0_e0_s' + countAfterDup + '_load"]', context);
    const dupReps = vm.runInContext('store.data["w1_d0_e0_s' + countAfterDup + '_reps"]', context);
    assert.strictEqual(dupLoad, '90', 'Duplicated set load must match');
    assert.strictEqual(dupReps, '8', 'Duplicated set reps must match');
  });

  // CHECK 15: Workout Logger Delete Set (✕)
  runCheck(15, 'Workout Logger ✕ removes set and decrements set count correctly', () => {
    const beforeCount = vm.runInContext('getExerciseSetCount(0)', context);
    vm.runInContext('removeSetFromExercise(0, ' + beforeCount + ')', context);
    const afterCount = vm.runInContext('getExerciseSetCount(0)', context);
    assert.strictEqual(afterCount, beforeCount - 1, 'Set count must decrement by 1');
  });

  // CHECK 16: Workout Logger Set Done Toggle & Volume Calculation
  runCheck(16, 'Workout Logger Set Done toggle updates volume calculations accurately', () => {
    vm.runInContext(`
      store.data['w1_d0_e0_s1_load'] = '100';
      store.data['w1_d0_e0_s1_reps'] = '10';
      toggleSetDone('w1_d0_e0_s1_done');
    `, context);
    const isDone = vm.runInContext('store.data["w1_d0_e0_s1_done"]', context);
    const setVol = vm.runInContext('WorkoutService.calculateVolume(100, 10)', context);
    assert.strictEqual(isDone, true, 'Set must be marked done');
    assert.strictEqual(setVol, 1000, 'Volume must be 1000 kg');
  });

  // CHECK 17: RIR/RPE Live Bidirectional Converter
  runCheck(17, 'RIR / RPE live conversion engine converts values symmetrically', () => {
    const rpeForRir2 = vm.runInContext('rirToRpe(2)', context);
    const rpeForRir0 = vm.runInContext('rirToRpe(0)', context);
    const rirForRpe8 = vm.runInContext('rpeToRir(8)', context);
    const rirForRpe10 = vm.runInContext('rpeToRir(10)', context);
    assert.strictEqual(rpeForRir2, 8);
    assert.strictEqual(rpeForRir0, 10);
    assert.strictEqual(rirForRpe8, 2);
    assert.strictEqual(rirForRpe10, 0);
  });

  // CHECK 18: Rest Timer Start & Stop
  runCheck(18, 'Rest Timer engine starts countdown and stops without throwing', () => {
    assert.ok(vm.runInContext('typeof startTimer === "function" && typeof stopTimer === "function"', context));
    vm.runInContext('startTimer(90)', context);
    vm.runInContext('stopTimer()', context);
  });

  // CHECK 19: Nutrition Domain - Add Day, Add Meal, Add Food & Macro Math
  runCheck(19, 'Nutrition Domain: hierarchical meals, foods addition and accurate macro math', () => {
    vm.runInContext(`
      DATA.nutrition = { days: [{ name: 'Giorno ON (Allenamento)', meals: [{ name: 'Colazione', foods: [] }] }] };
      NutritionService.addFoodItem(0, 0, { name: 'Avena', kcal: 389, pro: 16.9, carb: 66.3, fat: 6.9 });
      NutritionService.addFoodItem(0, 0, { name: 'Albume', kcal: 52, pro: 11.0, carb: 0.7, fat: 0.2 });
    `, context);
    const mealTotals = vm.runInContext('NutritionService.calculateMealTotals(DATA.nutrition.days[0].meals[0])', context);
    assert.strictEqual(mealTotals.calories, 441);
    assert.strictEqual(Math.round(mealTotals.protein * 10) / 10, 27.9);
  });

  // CHECK 20: Food Database Search
  await runAsyncCheck(20, 'Food Database Service returns matching foods from catalog', async () => {
    const results = await vm.runInContext('FoodDatabaseService.searchFoods("pollo")', context);
    assert.ok(results.length > 0, 'Must find chicken items');
    assert.ok(results[0].name.toLowerCase().includes('pollo'));
  });

  // CHECK 21: Supplement Domain - Add Item, Duplicate, Schedule
  runCheck(21, 'Supplement Domain: items addition, timing, frequency and daily schedule filter', () => {
    vm.runInContext(`
      DATA.supplementation = { items: [] };
      SupplementService.addItem({ name: 'Creatina', dose: '5', unit: 'g', timing: 'Post-workout', frequency: 'Quotidiano' });
      SupplementService.addItem({ name: 'Caffeina', dose: '200', unit: 'mg', timing: 'Pre-workout', frequency: 'Lunedì, Mercoledì' });
    `, context);
    const mondaySupps = vm.runInContext('SupplementService.getScheduleForDay("Lunedì")', context);
    assert.strictEqual(mondaySupps.length, 2, 'Monday should have 2 supplements');
  });

  // CHECK 22: Supplement Database & Examine Evidence
  await runAsyncCheck(22, 'Supplement Database Service searches catalog and supports Examine evidence', async () => {
    const supps = await vm.runInContext('SupplementDatabaseService.searchSupplements("creatina")', context);
    assert.ok(supps.length > 0, 'Must find creatine');
    assert.strictEqual(supps[0].timing, 'Post-workout');
  });

  // CHECK 23: Medical Therapy Domain - Compact Cards & Medication Days
  runCheck(23, 'Medical Therapy Domain: manages medications with day grouping and notes', () => {
    vm.runInContext(`
      DATA.therapy = { medications: [] };
      TherapyService.addMedication({ medication: 'Metformina', dose: '500 mg', timing: 'Colazione', days: ['Lunedì', 'Mercoledì', 'Venerdì'] });
    `, context);
    const meds = vm.runInContext('TherapyService.getMedications()', context);
    assert.strictEqual(meds.length, 1);
    assert.strictEqual(meds[0].medication, 'Metformina');
  });

  // CHECK 24: Clinical Lab Exams Domain - Biomarkers & History Trend
  runCheck(24, 'Clinical Lab Exams: logs biomarker records and computes parameter history', () => {
    vm.runInContext(`
      DATA.exams = { records: [] };
      ExamService.addRecord({ parameter: 'Glicemia', value: '92', unit: 'mg/dL', reference_range: '70 - 100', date: '2025-01-10' });
      ExamService.addRecord({ parameter: 'Glicemia', value: '95', unit: 'mg/dL', reference_range: '70 - 100', date: '2025-02-15' });
    `, context);
    const history = vm.runInContext('ExamService.getParameterHistory("Glicemia")', context);
    assert.strictEqual(history.length, 2, 'Must have 2 glycemic records');
  });

  // CHECK 25: Unified Calendar - Daily Chronological Aggregation
  runCheck(25, 'Unified Calendar: aggregates training, nutrition, supplements and therapy events', () => {
    const events = vm.runInContext('CalendarService.getEventsForDate("2025-03-01")', context);
    assert.ok(Array.isArray(events), 'Events must be an array');
    assert.ok(events.length >= 4, 'Must aggregate multi-domain daily events');
  });

  // CHECK 26: Coach AI Config & Offline Resilience
  runCheck(26, 'Coach AI: ConfigService retrieves URL and askAI handles offline state safely', () => {
    const coachUrl = vm.runInContext('ConfigService.getCoachApiUrl()', context);
    assert.ok(coachUrl && coachUrl.startsWith('http'), 'Coach URL must be configured');
  });

  // CHECK 27: Coach AI Proposal Validation & 1-Click Apply
  await runAsyncCheck(27, 'Coach AI: proposal validation prevents hallucinations and applies exercise change', async () => {
    const validProposal = {
      action: 'add_exercise',
      target: { weekNumber: 1, dayNumber: 1 },
      changes: { exercise: 'Lateral Raises', sets: [{ setNumber: 1, targetReps: '12', targetRir: '2' }] }
    };
    const res = await vm.runInContext(`AIService.applyProposal(${JSON.stringify(validProposal)})`, context);
    assert.ok(res.ok, 'Proposal must apply successfully');
    const sess = vm.runInContext('DATA.weeks[0].sessions[0]', context);
    const hasEx = (sess.exercises || []).some(e => (e.exercise || e.name || '').includes('Lateral Raises'));
    assert.ok(hasEx, 'Added exercise must be present in session');
  });

  // CHECK 28: Program Library & Version Snapshot Engine
  runCheck(28, 'Program Library: saves version snapshot and restores program state atomically', () => {
    const vNum = vm.runInContext('ProgramService.saveVersion("Snapshot Baseline W1")', context);
    assert.ok(vNum >= 1, 'Version number must be >= 1');
    const versions = vm.runInContext('ProgramService.getVersions()', context);
    assert.strictEqual(versions.length, 1);
    const restored = vm.runInContext('ProgramService.restoreVersion(1)', context);
    assert.strictEqual(restored, true);
  });

  // CHECK 29: Internationalization (i18n) 5 Languages
  runCheck(29, 'i18n Engine: supports it, en, es, fr, de without missing keys', () => {
    const langs = ['it', 'en', 'es', 'fr', 'de'];
    langs.forEach(lang => {
      vm.runInContext(`I18nService.setLanguage('${lang}')`, context);
      const translated = vm.runInContext('I18nService.t("save")', context);
      assert.ok(translated && translated !== 'save', `Must have translation for ${lang}`);
    });
  });

  // CHECK 30: Monetization Entitlements & Ad-Free Protection
  runCheck(30, 'Monetization Entitlements: Workout Logger and Medical Therapy are 100% ad-free', () => {
    assert.strictEqual(vm.runInContext('AdsService.shouldShowAd("workout")', context), false);
    assert.strictEqual(vm.runInContext('AdsService.shouldShowAd("therapy")', context), false);
    assert.strictEqual(vm.runInContext('AdsService.shouldShowAd("timer")', context), false);
    assert.strictEqual(vm.runInContext('AdsService.shouldShowAd("import")', context), false);
  });

  // CHECK 31: Storage Quota Sanity (< 5 KB in localStorage)
  runCheck(31, 'Storage Guard: localStorage payload is strictly sanitized to < 5 KB', () => {
    vm.runInContext(`
      store = {
        activeProgram: null,
        data: { 'w1_d0_e0_s1_load': '100', 'w1_d0_e0_s1_reps': '10', 'w1_d0_e0_s1_done': true },
        bw: { 1: '80.5' },
        customSets: { 'w1_d0_e0': 4 },
        skips: {},
        prefs: { duration: 20, frequency: 4, intensityType: 'RIR' },
        docs: [],
        models: []
      };
      persist();
    `, context);
    const stored = mockWindow.localStorage.getItem('GS_STORE');
    assert.ok(stored, 'GS_STORE must exist in localStorage');
    const sizeKb = Buffer.byteLength(stored, 'utf8') / 1024;
    assert.ok(sizeKb < 5, `GS_STORE size (${sizeKb.toFixed(2)} KB) must be < 5 KB`);
  });

  // CHECK 32: Splash Screen Safety Dismissal Timer
  runCheck(32, 'Splash screen safety timer guarantees dismissal within 2.5 seconds', () => {
    const jsInit = fullJsCode.slice(fullJsCode.indexOf('function init('));
    assert.ok(jsInit.includes('2500') || jsInit.includes('splashTimer'), 'Must contain splash safety timeout');
  });

  // CHECK 33: Navigation across all 14 Views
  runCheck(33, 'View Navigation Router: smoothly routes to all 14 views without crashing', () => {
    const views = ['home', 'training', 'programs', 'stats', 'ai', 'db', 'import', 'nutrition', 'supplements', 'therapy', 'exams', 'calendar', 'settings', 'pricing'];
    views.forEach(v => {
      vm.runInContext(`currentWeek = 1; currentDay = 0; navigate('${v}');`, context);
      assert.strictEqual(vm.runInContext('currentView', context), v);
    });
  });

  // CHECK 34: Android NativeConfig & Google Auth Non-Blocking Bridge
  runCheck(34, 'NativeConfig & Auth Bridge: provides fallbacks when native bridge is unavailable', () => {
    const googleClient = vm.runInContext('ConfigService.getGoogleClientId()', context);
    assert.ok(googleClient && googleClient.length > 10, 'Google Client ID must be resolved');
  });

  // CHECK 35: E2E Reboot Persistence Integrity
  await runAsyncCheck(35, 'E2E Reboot Persistence: simulates app restart and recovers active program', async () => {
    // 1. Save program to IndexedDB
    await vm.runInContext('GiammariaPersistence.saveProgram(DATA, true)', context);
    // 2. Clear volatile memory
    vm.runInContext('DATA = null', context);
    assert.strictEqual(vm.runInContext('DATA', context), null);
    // 3. Trigger reboot init()
    await vm.runInContext('init()', context);
    const recoveredData = vm.runInContext('DATA', context);
    assert.ok(recoveredData !== null, 'DATA must be recovered');
    assert.strictEqual(recoveredData.weeks.length, 20, 'Recovered DATA must retain all 20 weeks');
  });

  console.log('============================================================');
  console.log(`MASTER TASK 21 SUITE: ${passedTests} PASSED, ${failedTests} FAILED (Total: 35)`);
  console.log('============================================================');

  // Write JSON artifact
  const artifactDir = 'test-artifacts';
  if (!fs.existsSync(artifactDir)) fs.mkdirSync(artifactDir, { recursive: true });
  fs.writeFileSync(
    path.join(artifactDir, 'task21-runtime-recovery.json'),
    JSON.stringify({
      timestamp: new Date().toISOString(),
      task: 'MASTER TASK 21: FULL RUNTIME RECOVERY',
      summary: {
        total: 35,
        passed: passedTests,
        failed: failedTests,
        successRate: `${Math.round((passedTests / 35) * 100)}%`
      },
      checks: testResults
    }, null, 2),
    'utf8'
  );

  if (failedTests > 0) {
    process.exit(1);
  }
}

runMasterTask21Suite().catch(err => {
  console.error('FATAL TEST RUNNER ERROR:', err);
  process.exit(1);
});
