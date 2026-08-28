/**
 * GIAMMARIA SYSTEM — MASTER TASK ⑲ RECOVERY SUITE
 * Complete Full-App Functional Regression Recovery & Multi-Domain Certification
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as XLSX from 'xlsx';
import vm from 'vm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('============================================================');
console.log('GIAMMARIA SYSTEM — MASTER TASK ⑲ RECOVERY SUITE');
console.log('FULL APP FUNCTIONAL INTEGRITY & ZERO REGRESSION TEST');
console.log('============================================================\n');

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  ❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`  ✓ ${message}`);
    passedTests++;
  }
}

// -----------------------------------------------------------------
// 1. SETUP SANDBOX WITH BROWSER & DOM ENVIRONMENT
// -----------------------------------------------------------------
const indexHtml = fs.readFileSync(path.join(__dirname, 'web', 'index.html'), 'utf8');

// Parse raw canonical program from Golden Master
const goldenBuffer = fs.readFileSync(path.join(__dirname, 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx'));
const goldenWb = XLSX.read(goldenBuffer, { type: 'buffer' });

// Create realistic in-memory IndexedDB and localStorage sandbox
function createMockDOM() {
  const elements = new Map();

  function makeEl(id, tagName = 'div') {
    return {
      id,
      tagName,
      innerHTML: '',
      textContent: '',
      value: '',
      style: {},
      classList: {
        _classes: new Set(),
        add(c) { this._classes.add(c); },
        remove(c) { this._classes.delete(c); },
        contains(c) { return this._classes.has(c); }
      },
      querySelectorAll: (sel) => [],
      querySelector: (sel) => null,
      appendChild: function(child) { return child; },
      removeChild: function(child) { return child; },
      scrollTop: 0,
      scrollHeight: 100,
      width: 400,
      height: 200,
      getContext: (type) => ({
        clearRect: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        stroke: () => {},
        fill: () => {},
        fillRect: () => {},
        fillText: () => {},
        arc: () => {},
        fillStyle: '#000',
        strokeStyle: '#000',
        lineWidth: 1,
        font: '10px sans-serif',
        textAlign: 'center'
      }),
      addEventListener: () => {},
      removeEventListener: () => {}
    };
  }

  const domStorage = new Map();
  const idbStore = new Map();

  const mockWindow = {
    setTimeout: (fn, ms) => setTimeout(fn, ms),
    clearTimeout: (id) => clearTimeout(id),
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id),
    addEventListener: () => {},
    removeEventListener: () => {},
    console: console,
    XLSX: XLSX,
    Blob: Blob,
    URL: {
      createObjectURL: () => 'blob:mock-url',
      revokeObjectURL: () => {}
    },
    localStorage: {
      getItem: (k) => domStorage.get(k) || null,
      setItem: (k, v) => domStorage.set(k, String(v)),
      removeItem: (k) => domStorage.delete(k),
      clear: () => domStorage.clear()
    },
    indexedDB: {
      open: (name, version) => {
        const req = {
          result: {
            objectStoreNames: { contains: (s) => true },
            createObjectStore: (s) => ({ createIndex: () => {} }),
            transaction: (stores, mode) => ({
              objectStore: (s) => ({
                get: (k) => {
                  const r = { onsuccess: null, onerror: null, result: idbStore.get(`${s}_${k}`) };
                  setTimeout(() => { if (r.onsuccess) r.onsuccess({ target: r }); }, 1);
                  return r;
                },
                put: (val, k) => {
                  const key = k || val.id || 'default';
                  idbStore.set(`${s}_${key}`, val);
                  const r = { onsuccess: null, onerror: null, result: key };
                  setTimeout(() => { if (r.onsuccess) r.onsuccess({ target: r }); }, 1);
                  return r;
                },
                delete: (k) => {
                  idbStore.delete(`${s}_${k}`);
                  const r = { onsuccess: null, onerror: null, result: true };
                  setTimeout(() => { if (r.onsuccess) r.onsuccess({ target: r }); }, 1);
                  return r;
                },
                getAll: () => {
                  const res = [];
                  for (const [k, v] of idbStore.entries()) {
                    if (k.startsWith(`${s}_`)) res.push(v);
                  }
                  const r = { onsuccess: null, onerror: null, result: res };
                  setTimeout(() => { if (r.onsuccess) r.onsuccess({ target: r }); }, 1);
                  return r;
                }
              })
            })
          },
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null
        };
        setTimeout(() => {
          if (req.onsuccess) req.onsuccess({ target: req });
        }, 1);
        return req;
      }
    },
    document: {
      getElementById: (id) => {
        if (!elements.has(id)) elements.set(id, makeEl(id));
        return elements.get(id);
      },
      querySelectorAll: (sel) => [],
      querySelector: (sel) => null,
      createElement: (tag) => makeEl('created_' + Math.random(), tag),
      body: makeEl('body')
    },
    alert: (msg) => { console.log('  [MOCK_ALERT]', msg); },
    confirm: (msg) => true,
    prompt: (msg) => 'mock_prompt'
  };

  mockWindow.window = mockWindow;
  mockWindow.document.defaultView = mockWindow;
  return { mockWindow, domStorage, idbStore, elements };
}

async function runRecoveryTests() {
  const { mockWindow } = createMockDOM();
  const context = vm.createContext(mockWindow);

  // Extract scripts from web/index.html
  const scriptMatches = [...indexHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
  const fullJsCode = scriptMatches.map(m => m[1]).join('\n');

  vm.runInContext(fullJsCode, context);

  // -------------------------------------------------------------
  // TEST 1: APP BOOTSTRAP & GLOBALS
  // -------------------------------------------------------------
  console.log('[1/19] Testing App Bootstrap & Global Architecture...');
  assert(typeof vm.runInContext('init', context) === 'function', 'init() function is defined');
  assert(typeof vm.runInContext('navigate', context) === 'function', 'navigate() function is defined');
  assert(typeof vm.runInContext('render', context) === 'function', 'render() function is defined');
  assert(typeof vm.runInContext('GiammariaPersistence', context) !== 'undefined', 'GiammariaPersistence singleton is defined');
  assert(typeof vm.runInContext('parseStructuredWorkbook', context) === 'function', 'parseStructuredWorkbook is defined');

  // Initialize store and mock DATA
  vm.runInContext(`
    store = {
      data: {},
      subs: {},
      bw: { 1: '82.5' },
      prefs: { intensityType: 'RIR', duration: 4, frequency: 4 },
      loadTypes: {},
      tempos: {},
      skips: {},
      bonus: {},
      customSets: {},
      docs: [],
      models: [],
      activeProgram: null,
      exIntensity: {},
      accountToken: null,
      accountUser: null,
      chatHistory: []
    };
    DATA = {
      title: 'GIAMMARIA SYSTEM V29',
      duration_weeks: 4,
      training_frequency: 4,
      weeks: [
        {
          weekNumber: 1,
          title: 'Settimana 1 - Accumulo',
          sessions: [
            {
              title: 'Giorno 1 - Upper A',
              exercises: [
                {
                  name: 'Panca Piana Bilanciere',
                  movement: 'Petto',
                  repsTarget: '8-10',
                  rirTarget: 2,
                  rpeTarget: 8,
                  rest: '180s',
                  setCount: 3,
                  sets: [
                    { set_number: 1, set_type: 'work', target_reps: '8-10', rir: 2, rpe: 8 },
                    { set_number: 2, set_type: 'work', target_reps: '8-10', rir: 2, rpe: 8 },
                    { set_number: 3, set_type: 'work', target_reps: '8-10', rir: 2, rpe: 8 }
                  ]
                }
              ]
            }
          ]
        }
      ],
      nutrition: { present: false, days: [] },
      supplementation: { present: false, items: [] },
      therapy: { present: false, medications: [] },
      exams: { present: false, records: [] }
    };
  `, context);

  // -------------------------------------------------------------
  // TEST 2: HOME VIEW
  // -------------------------------------------------------------
  console.log('\n[2/19] Testing Home View...');
  const viewContainer = context.document.getElementById('view-container');
  vm.runInContext('renderHome($("view-container"))', context);
  assert(viewContainer.innerHTML.includes('SYSTEM DASHBOARD'), 'Home renders SYSTEM DASHBOARD');
  assert(viewContainer.innerHTML.includes('Sessione Attiva'), 'Home renders Sessione Attiva card');
  assert(viewContainer.innerHTML.includes('INIZIA WORKOUT'), 'Home contains INIZIA WORKOUT button');
  assert(viewContainer.innerHTML.includes('IMPORTA'), 'Home contains direct IMPORTA button');
  assert(viewContainer.innerHTML.includes('BODYWEIGHT'), 'Home displays Bodyweight');

  // -------------------------------------------------------------
  // TEST 3: WORKOUT / TRAINING VIEW
  // -------------------------------------------------------------
  console.log('\n[3/19] Testing Workout / Training View...');
  vm.runInContext('renderTraining($("view-container"))', context);
  assert(viewContainer.innerHTML.includes('Panca Piana Bilanciere'), 'Training view renders exercise name');
  assert(viewContainer.innerHTML.includes('Target:'), 'Training view renders Target reps');
  assert(viewContainer.innerHTML.includes('Rest:'), 'Training view renders Rest interval');
  assert(viewContainer.innerHTML.includes('+ SERIE'), 'Training view has + SERIE button');

  // -------------------------------------------------------------
  // TEST 4: PROGRAM MANAGEMENT / LIBRERIA
  // -------------------------------------------------------------
  console.log('\n[4/19] Testing Program Management & Library View...');
  assert(typeof vm.runInContext('renderPrograms', context) === 'function', 'renderPrograms() is defined');
  vm.runInContext('renderPrograms($("view-container"))', context);
  assert(viewContainer.innerHTML.includes('LIBRERIA PROGRAMMI'), 'renderPrograms renders LIBRERIA PROGRAMMI');
  assert(viewContainer.innerHTML.includes('Programma Attivo'), 'renderPrograms renders Programma Attivo');
  assert(viewContainer.innerHTML.includes('ALLENAMENTO'), 'renderPrograms renders domain status');
  assert(typeof vm.runInContext('exportActiveProgram', context) === 'function', 'exportActiveProgram is defined');

  // -------------------------------------------------------------
  // TEST 5: PERFORMANCE & STATS
  // -------------------------------------------------------------
  console.log('\n[5/19] Testing Performance & Statistics View...');
  assert(typeof vm.runInContext('renderStats', context) === 'function', 'renderStats() is defined');
  vm.runInContext('renderStats($("view-container"))', context);
  assert(viewContainer.innerHTML.includes('PERFORMANCE LAB'), 'renderStats renders PERFORMANCE LAB');
  assert(viewContainer.innerHTML.includes('stats-muscle-group'), 'renderStats includes muscle group filter');
  assert(typeof vm.runInContext('renderStatsData', context) === 'function', 'renderStatsData() is defined');

  // -------------------------------------------------------------
  // TEST 6: USER / PROFILE / ACCOUNT MODAL
  // -------------------------------------------------------------
  console.log('\n[6/19] Testing User / Profile / Account Modal...');
  assert(typeof vm.runInContext('openAccount', context) === 'function', 'openAccount() is defined');
  assert(typeof vm.runInContext('closeAccount', context) === 'function', 'closeAccount() is defined');
  assert(typeof vm.runInContext('startGoogleAuth', context) === 'function', 'startGoogleAuth() is defined');
  assert(typeof vm.runInContext('startAppleAuth', context) === 'function', 'startAppleAuth() is defined');

  // -------------------------------------------------------------
  // TEST 7: COACH AI
  // -------------------------------------------------------------
  console.log('\n[7/19] Testing Coach AI View & Proposals...');
  assert(typeof vm.runInContext('renderAI', context) === 'function', 'renderAI() is defined');
  vm.runInContext('renderAI($("view-container"))', context);
  assert(viewContainer.innerHTML.includes('COACH AI'), 'renderAI renders COACH AI');
  assert(typeof vm.runInContext('askAI', context) === 'function', 'askAI() is defined');
  assert(typeof vm.runInContext('applyCoachProposal', context) === 'function', 'applyCoachProposal() is defined');
  assert(typeof vm.runInContext('cancelCoachProposal', context) === 'function', 'cancelCoachProposal() is defined');

  // -------------------------------------------------------------
  // TEST 8: TRAINING LOGGER SETS & DATA
  // -------------------------------------------------------------
  console.log('\n[8/19] Testing Training Logger Set Operations...');
  vm.runInContext("updateData('w1_d0_e0_s1_load', '100')", context);
  vm.runInContext("updateData('w1_d0_e0_s1_reps', '8')", context);
  vm.runInContext("updateData('w1_d0_e0_s1_rir', '2')", context);
  vm.runInContext("toggleSetDone('w1_d0_e0_s1_done')", context);
  assert(vm.runInContext("store.data['w1_d0_e0_s1_load']", context) === '100', 'Load updated to 100 kg');
  assert(vm.runInContext("store.data['w1_d0_e0_s1_reps']", context) === '8', 'Reps updated to 8');
  assert(vm.runInContext("store.data['w1_d0_e0_s1_done']", context) === true, 'Set marked as done');

  // -------------------------------------------------------------
  // TEST 9: RIR / RPE LIVE CONVERSION
  // -------------------------------------------------------------
  console.log('\n[9/19] Testing RIR/RPE Live Conversion Engine...');
  assert(vm.runInContext('rirToRpe(2)', context) === 8, 'RPE for RIR 2 is 8 (10 - 2)');
  assert(vm.runInContext('rirToRpe(0)', context) === 10, 'RPE for RIR 0 is 10 (cedimento)');
  assert(vm.runInContext('rpeToRir(9)', context) === 1, 'RIR for RPE 9 is 1 (10 - 9)');
  assert(typeof vm.runInContext('toggleIntensityType', context) === 'function', 'toggleIntensityType is defined');

  // -------------------------------------------------------------
  // TEST 10: TIMER
  // -------------------------------------------------------------
  console.log('\n[10/19] Testing Rest Timer Engine...');
  assert(typeof vm.runInContext('startTimer', context) === 'function', 'startTimer is defined');
  assert(typeof vm.runInContext('stopTimer', context) === 'function', 'stopTimer is defined');

  // -------------------------------------------------------------
  // TEST 11: VOLUME CALCULATION
  // -------------------------------------------------------------
  console.log('\n[11/19] Testing Volume Calculation...');
  // 100 kg * 8 reps = 800 kg volume
  const load = parseFloat(vm.runInContext("store.data['w1_d0_e0_s1_load']", context));
  const reps = parseInt(vm.runInContext("store.data['w1_d0_e0_s1_reps']", context), 10);
  const vol = load * reps;
  assert(vol === 800, 'Volume for set 1 is 800 kg');

  // -------------------------------------------------------------
  // TEST 12: TONNELLAGGIO & INTENSITY VOLUME
  // -------------------------------------------------------------
  console.log('\n[12/19] Testing Tonnellaggio & Effective Intensity Volume...');
  const rir = parseInt(vm.runInContext("store.data['w1_d0_e0_s1_rir']", context), 10);
  const intensVol = load * (reps + rir);
  assert(intensVol === 1000, 'Intensity Volume for set 1 is 1000 kg (100 * (8 + 2))');

  // -------------------------------------------------------------
  // TEST 13: PERSISTENCE & INDEXEDDB CORE 2.0
  // -------------------------------------------------------------
  console.log('\n[13/19] Testing Persistence Core 2.0 & Storage Sanity...');
  const saveRes = await vm.runInContext('GiammariaPersistence.saveActiveProgram(DATA)', context);
  assert(saveRes.id != null, 'Active program saved to IndexedDB with valid ID');
  assert(saveRes.fingerprint != null, 'Active program generated deterministic fingerprint');
  const sanitized = vm.runInContext('GiammariaPersistence.sanitizeStoreForLocalStorage(store)', context);
  assert(sanitized.activeProgram === null, 'localStorage store has activeProgram: null');

  // -------------------------------------------------------------
  // TEST 14: GOLDEN XLSX PARSING
  // -------------------------------------------------------------
  console.log('\n[14/19] Testing Universal Import Engine 2.1 on Golden XLSX...');
  const parseRes = vm.runInContext('parseStructuredWorkbook', context)(goldenWb, 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
  const canonical = parseRes.canonicalProgram || parseRes.program;
  assert(canonical.weeks.length === 20, 'Golden XLSX parsed 20 weeks');
  assert(parseRes.stats.canonical_exercises_count === 870, 'Golden XLSX parsed 870 exercises');
  assert(parseRes.stats.canonical_sets_count === 1642, 'Golden XLSX parsed 1642 sets');

  // -------------------------------------------------------------
  // TEST 15: IMPORT REVIEW UX
  // -------------------------------------------------------------
  console.log('\n[15/19] Testing Import Review Screen & Field Editing...');
  context.window.programImportState = {
    canonicalProgram: canonical,
    stats: parseRes.stats,
    warnings: parseRes.warnings,
    errors: parseRes.errors,
    activeReviewTab: 'training'
  };
  vm.runInContext('renderImport($("view-container"))', context);
  assert(viewContainer.innerHTML.includes('REVISIONE PROGRAMMA IMPORTATO'), 'Review renders header');
  assert(viewContainer.innerHTML.includes('CONFERMA E ATTIVA'), 'Review renders confirmation button');
  vm.runInContext("updateReviewTitle('Nuovo Titolo Master')", context);
  assert(context.window.programImportState.canonicalProgram.title === 'Nuovo Titolo Master', 'Title updated in review');

  // -------------------------------------------------------------
  // TEST 16: NUTRITION DOMAIN
  // -------------------------------------------------------------
  console.log('\n[16/19] Testing Nutrition Multi-Day Hierarchy...');
  const syntheticBuffer = fs.readFileSync(path.join(__dirname, 'synthetic_complex_test.xlsx'));
  const syntheticWb = XLSX.read(syntheticBuffer, { type: 'buffer' });
  const complexRes = vm.runInContext('parseStructuredWorkbook', context)(syntheticWb, 'synthetic_complex_test.xlsx');
  const complexCanonical = complexRes.canonicalProgram || complexRes.program;

  assert(complexCanonical.nutrition.present === true, 'Nutrition present in complex workbook');
  assert(complexCanonical.nutrition.days.length === 2, 'Nutrition extracted 2 days');
  assert(complexCanonical.nutrition.days[0].meals.length > 0, 'Nutrition has meals inside days');
  assert(complexCanonical.nutrition.days[0].meals[0].items.length > 0, 'Meals have food items with macros');

  // -------------------------------------------------------------
  // TEST 17: SUPPLEMENTATION DOMAIN
  // -------------------------------------------------------------
  console.log('\n[17/19] Testing Supplementation Domain...');
  assert(complexCanonical.supplementation.present === true, 'Supplementation present in complex workbook');
  assert(complexCanonical.supplementation.items.length === 6, 'Extracted 6 supplement items');

  // -------------------------------------------------------------
  // TEST 18: THERAPY DOMAIN
  // -------------------------------------------------------------
  console.log('\n[18/19] Testing Therapy Mobile-First Domain...');
  assert(complexCanonical.therapy.present === true, 'Therapy present in complex workbook');
  assert(complexCanonical.therapy.medications.length === 3, 'Extracted 3 grouped medications');
  assert(Array.isArray(complexCanonical.therapy.medications[0].days), 'Medication days is an array');

  // -------------------------------------------------------------
  // TEST 19: CLINICAL EXAMS DOMAIN
  // -------------------------------------------------------------
  console.log('\n[19/19] Testing Clinical Exams Domain...');
  assert(complexCanonical.exams.present === true, 'Clinical exams present in complex workbook');
  const examRecords = complexCanonical.exams.records || complexCanonical.exams.items || [];
  assert(examRecords.length === 8, 'Extracted 8 clinical lab records');

  console.log('\n============================================================');
  console.log(`MASTER TASK ⑲ RECOVERY SUITE: ${passedTests} PASSED, 0 FAILED (Total: ${totalTests})`);
  console.log('============================================================\n');

  process.exit(0);
}

runRecoveryTests().catch(err => {
  console.error('[TEST ERROR]', err);
  process.exit(1);
});
