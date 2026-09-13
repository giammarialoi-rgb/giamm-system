import assert from 'assert';
import fs from 'fs';
import vm from 'vm';
import XLSX from 'xlsx';
import {
  parseStructuredWorkbook,
  parseCanonicalProgramFromText,
  parseNutritionSheet,
  parseSupplementationSheet,
  parseTherapyExamsSheet,
  normalizeExerciseName,
  parseExerciseDetails,
  classifySheetType
} from './universal-import-engine.mjs';
import {
  GiammariaPersistenceCore,
  MemoryIndexedDB,
  getDeterministicFingerprint
} from './persistence-core.mjs';

console.log('============================================================');
console.log('GIAMMARIA SYSTEM — MASTER TASK ⑱ FORENSIC SUITE');
console.log('REAL DEVICE IMPORT & E2E DATA INTEGRITY CERTIFICATION');
console.log('============================================================\n');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function runTest(description, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${description} FAILED:`);
    console.error(`    ${err.stack || err.message}`);
    failedTests++;
  }
}

async function runAsyncTest(description, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${description}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${description} FAILED:`);
    console.error(`    ${err.stack || err.message}`);
    failedTests++;
  }
}

// ============================================================
// FASE 1: AUDIT OF HTML & STORAGE PERSISTENCE
// ============================================================
console.log('[FASE 1] Audit Pre-Implementazione & Storage Separation...');

const webHtml = fs.readFileSync('web/index.html', 'utf8');
const assetHtml = fs.readFileSync('app/src/main/assets/index.html', 'utf8');

runTest('Asset Parity: web/index.html and app/src/main/assets/index.html are byte-identical', () => {
  assert.strictEqual(Buffer.compare(Buffer.from(webHtml), Buffer.from(assetHtml)), 0);
});

runTest('Zero direct large localStorage writes: localStorage.setItem sanitized for GS_STORE', () => {
  const matches = [...webHtml.matchAll(/localStorage\.setItem\s*\(([^)]+)\)/g)];
  assert.ok(matches.length > 0, 'Should have setItem calls');
  matches.forEach(m => {
    assert.ok(m[1].includes('sanitized') || m[1].includes('store'), 'Must sanitize store');
  });
});

// ============================================================
// FASE 2: DIRECT GOLDEN XLSX FORENSIC AUDIT
// ============================================================
console.log('\n[FASE 2] Direct Golden XLSX Audit (GIAMMARIA_SYSTEM_V29_MASTER.xlsx)...');

const goldenPath = 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx';
const goldenWb = XLSX.readFile(goldenPath, { cellDates: true, cellNF: true, cellFormula: true });

runTest('Golden Workbook contains exactly 26 sheets', () => {
  assert.strictEqual(goldenWb.SheetNames.length, 26);
});

const backendResult = parseStructuredWorkbook(goldenWb, goldenPath);
const goldenProg = backendResult.canonicalProgram;
const goldenStats = backendResult.integrityStats;

runTest('Canonical Model extracted 20 weeks', () => {
  assert.strictEqual(goldenProg.weeks.length, 20);
});

runTest('Canonical Model extracted 68 sessions', () => {
  assert.strictEqual(goldenStats.canonical_sessions_count, 68);
});

runTest('Canonical Model extracted 870 exercises', () => {
  assert.strictEqual(goldenStats.canonical_exercises_count, 870);
});

runTest('Canonical Model extracted 1642 canonical sets', () => {
  assert.strictEqual(goldenStats.canonical_sets_count, 1642);
});

runTest('Start Exercise Sample (W1 S1 E1) intact with valid sets and no NaN', () => {
  const e1 = goldenProg.weeks[0].sessions[0].exercises[0];
  assert.strictEqual(e1.name, 'UPPER A  •  PETTO + DORSO');
  assert.strictEqual(e1.sets.length, 8);
  assert.strictEqual(typeof e1.sets[0].set_number, 'number');
  assert.ok(!isNaN(e1.sets[0].target_rir));
  assert.ok(!isNaN(e1.sets[0].target_rpe));
  assert.strictEqual(e1.sets[0].target_load, null);
});

runTest('Mid Exercise Sample (W10 S2 E1) intact with 2 sets, RIR 3, RPE 7', () => {
  const midEx = goldenProg.weeks[9].sessions[1].exercises[0];
  assert.strictEqual(midEx.name, 'Squat con Bilanciere');
  assert.strictEqual(midEx.sets.length, 2);
  assert.strictEqual(midEx.rir_target, 3);
  assert.strictEqual(midEx.rpe_target, 7);
});

runTest('End Exercise Sample (W20 S1 Last) intact', () => {
  const lastSession = goldenProg.weeks[19].sessions[0];
  const lastEx = lastSession.exercises[lastSession.exercises.length - 1];
  assert.strictEqual(lastEx.name, 'Pallof press');
  assert.strictEqual(lastEx.sets.length, 1);
});

// ============================================================
// FASE 3: ALIMENTAZIONE VALIDATION (NO INVENTED MACROS)
// ============================================================
console.log('\n[FASE 3] Alimentazione: Multi-Day, Multi-Meal, Accurate Foods & Macros...');

const complexWb = XLSX.readFile('synthetic_complex_test.xlsx');
const complexParsed = parseStructuredWorkbook(complexWb, 'synthetic_complex_test.xlsx');
const cProg = complexParsed.canonicalProgram;

runTest('Nutrition parsed 2 days with 9 meals and 20 foods', () => {
  assert.strictEqual(cProg.nutrition.days.length, 2);
  const mealsCount = cProg.nutrition.days.reduce((s, d) => s + d.meals.length, 0);
  const foodsCount = cProg.nutrition.days.reduce((s, d) => s + d.meals.reduce((ms, m) => ms + m.foods.length, 0), 0);
  assert.strictEqual(mealsCount, 9);
  assert.strictEqual(foodsCount, 20);
});

runTest('Nutrition Meal Hierarchy: Day -> Meal -> Food -> Accurate Quantity/Unit/Macros', () => {
  const lunedi = cProg.nutrition.days[0];
  assert.strictEqual(lunedi.day_name, 'LUNEDÌ');
  const colazione = lunedi.meals[0];
  assert.strictEqual(colazione.meal_name, 'Colazione');
  const albume = colazione.foods[0];
  assert.strictEqual(albume.name, "Albume d'uovo");
  assert.strictEqual(albume.quantity, 250);
  assert.strictEqual(albume.unit, 'g');
  assert.strictEqual(albume.kcal, 130);
  assert.strictEqual(albume.protein_g, 27);
});

runTest('Golden workbook has no invented nutrition when no nutrition sheet is present', () => {
  assert.strictEqual(goldenProg.nutrition.days.length, 0);
  assert.strictEqual(goldenProg.nutrition.present, false);
});

// ============================================================
// FASE 4: INTEGRAZIONE VALIDATION
// ============================================================
console.log('\n[FASE 4] Integrazione: Accurate Doses, Timings, Notes...');

runTest('Supplements parsed 6 real items without shifted fields', () => {
  assert.strictEqual(cProg.supplementation.items.length, 6);
  const creatina = cProg.supplementation.items.find(i => i.name === 'Creatina Monoidrato');
  assert.ok(creatina);
  assert.strictEqual(creatina.dose, 5);
  assert.strictEqual(creatina.unit, 'g');
  assert.strictEqual(creatina.timing, 'Post-workout');
  assert.strictEqual(creatina.frequency, 'Quotidiano');
});

// ============================================================
// FASE 5: TERAPIA & ESAMI VALIDATION (MOBILE FIRST & SINTETICA)
// ============================================================
console.log('\n[FASE 5] Terapia & Esami: Compact Mobile-First Cards & Day Grouping...');

runTest('Therapy parsed 3 grouped medications with days array', () => {
  assert.strictEqual(cProg.therapy.medications.length, 3);
  const fx = cProg.therapy.medications.find(m => m.medication === 'Farmaco X');
  assert.ok(fx);
  assert.strictEqual(fx.duration_weeks, 8);
  assert.deepStrictEqual(fx.days, ['Lunedì', 'Mercoledì', 'Venerdì']);
});

runTest('Clinical Exams separated from therapy with 8 records', () => {
  assert.strictEqual(cProg.exams.records.length, 8);
  const testRecord = cProg.exams.records.find(r => r.parameter === 'Testosterone Totale');
  assert.ok(testRecord);
  assert.strictEqual(testRecord.value, '650');
  assert.strictEqual(testRecord.unit, 'ng/dL');
});

// ============================================================
// FASE 6: ZERO DATA CORRUPTION RECURSIVE SCAN
// ============================================================
console.log('\n[FASE 6] Zero Data Corruption Recursive Scan...');

function scanForCorruption(obj, path = '') {
  const issues = [];
  if (obj === null || obj === undefined) return issues;
  if (typeof obj === 'string') {
    if (obj.includes('[object Object]')) issues.push(`${path}: contains '[object Object]'`);
    if (obj === 'undefined') issues.push(`${path}: contains literal 'undefined'`);
    if (obj === 'NaN') issues.push(`${path}: contains literal 'NaN'`);
    if (obj.includes('\ufffd')) issues.push(`${path}: contains replacement character`);
  } else if (typeof obj === 'number') {
    if (isNaN(obj)) issues.push(`${path}: is NaN`);
  } else if (Array.isArray(obj)) {
    obj.forEach((item, idx) => {
      issues.push(...scanForCorruption(item, `${path}[${idx}]`));
    });
  } else if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      issues.push(...scanForCorruption(v, `${path}.${k}`));
    }
  }
  return issues;
}

runTest('Golden Canonical Model has 0 corruption issues across entire tree', () => {
  const issues = scanForCorruption(goldenProg, 'goldenProg');
  assert.strictEqual(issues.length, 0, `Corruption issues found: ${issues.join(', ')}`);
});

runTest('Complex Canonical Model has 0 corruption issues across entire tree', () => {
  const issues = scanForCorruption(cProg, 'complexProg');
  assert.strictEqual(issues.length, 0, `Corruption issues found: ${issues.join(', ')}`);
});

// ============================================================
// FASE 7: BACKEND VS CLIENT EQUIVALENCE (DIFF = 0)
// ============================================================
console.log('\n[FASE 7] Backend vs Client Equivalence (DIFF = 0)...');

// Setup Node.js VM Sandbox with Client Scripts
const createMockElement = () => ({
  innerHTML: '',
  style: {},
  classList: {
    add: () => {},
    remove: () => {},
    contains: () => false
  },
  setAttribute: () => {},
  appendChild: () => {},
  addEventListener: () => {}
});

const domMock = {
  window: {
    addEventListener: () => {},
    removeEventListener: () => {}
  },
  document: {
    createElement: createMockElement,
    getElementById: () => createMockElement(),
    querySelectorAll: () => []
  },
  navigator: { userAgent: 'NodeTestEnv' },
  console: console,
  XLSX: XLSX,
  currentView: 'home',
  showToast: () => {},
  navigate: () => {},
  render: () => {},
  localStorage: {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  XMLHttpRequest: class {
    open() {}
    send() {}
    setRequestHeader() {}
  }
};
domMock.window = domMock;
domMock.self = domMock;

const scriptRegex = /<script(?![^>]*src=)>([\s\S]*?)<\/script>/gi;
let match;
let scriptContent = '';
while ((match = scriptRegex.exec(webHtml)) !== null) {
  scriptContent += match[1] + '\n;\n';
}

const clientContext = vm.createContext(domMock);
vm.runInContext(scriptContent, clientContext);

const clientParsed = clientContext.parseStructuredWorkbook(goldenWb, goldenPath);
const clientProg = clientParsed.canonicalProgram;

function deepDiff(obj1, obj2, path = '') {
  const diffs = [];
  if (obj1 === obj2) return diffs;
  if (typeof obj1 !== typeof obj2) {
    diffs.push({ path, b: typeof obj1, c: typeof obj2 });
    return diffs;
  }
  if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) {
    if (obj1 !== obj2) diffs.push({ path, b: obj1, c: obj2 });
    return diffs;
  }
  if (Array.isArray(obj1) !== Array.isArray(obj2)) {
    diffs.push({ path, b: 'Array', c: 'Object' });
    return diffs;
  }
  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) {
      diffs.push({ path: `${path}.length`, b: obj1.length, c: obj2.length });
    }
    const maxLen = Math.max(obj1.length, obj2.length);
    for (let i = 0; i < maxLen; i++) {
      diffs.push(...deepDiff(obj1[i], obj2[i], `${path}[${i}]`));
    }
    return diffs;
  }
  const keys = Array.from(new Set([...Object.keys(obj1), ...Object.keys(obj2)]));
  for (const k of keys) {
    diffs.push(...deepDiff(obj1[k], obj2[k], `${path}.${k}`));
  }
  return diffs;
}

runTest('Backend vs Client Canonical Program: DIFF = 0', () => {
  const diffs = deepDiff(goldenProg, clientProg, 'program');
  assert.strictEqual(diffs.length, 0, `Differences found: ${JSON.stringify(diffs, null, 2)}`);
});

// ============================================================
// FASE 8 & 9: REVIEW -> ACTIVATION -> PERSISTENCE FORENSIC
// ============================================================
console.log('\n[FASE 8 & 9] Review -> Activation -> IndexedDB Forensic...');

await runAsyncTest('Interactive Edit in Review UX preserves user modifications in state', async () => {
  clientContext.programImportState = {
    currentImportId: 'test_import',
    canonicalProgram: JSON.parse(JSON.stringify(cProg)),
    warnings: [],
    errors: [],
    activeTab: 'training'
  };

  // Edit exercise
  clientContext.updateReviewExerciseField(0, 0, 0, 'rir', 1.5);
  assert.strictEqual(clientContext.programImportState.canonicalProgram.weeks[0].sessions[0].exercises[0].rir_target, 1.5);

  // Edit food
  clientContext.updateReviewMealItem(0, 0, 0, 'quantity', 300);
  assert.strictEqual(clientContext.programImportState.canonicalProgram.nutrition.days[0].meals[0].foods[0].quantity, 300);

  // Edit supplement
  clientContext.updateReviewSupplementItem(0, 'dose', 10);
  assert.strictEqual(clientContext.programImportState.canonicalProgram.supplementation.items[0].dose, 10);

  // Edit therapy
  clientContext.updateReviewTherapyMedication(0, 'duration_weeks', 12);
  assert.strictEqual(clientContext.programImportState.canonicalProgram.therapy.medications[0].duration_weeks, 12);

  // Edit exam
  clientContext.updateReviewExamRecord(0, 'value', '16.0');
  assert.strictEqual(clientContext.programImportState.canonicalProgram.exams.records[0].value, '16.0');
});

await runAsyncTest('Confirm and Activate saves to IndexedDB and sanitizes localStorage', async () => {
  // Trigger confirmImportAndActivate
  await clientContext.confirmImportAndActivate();

  // Verify active program exists in IndexedDB
  const activeProg = await clientContext.GiammariaPersistence.loadActiveProgram();
  assert.ok(activeProg, 'Active program must exist in IndexedDB');
  assert.strictEqual(activeProg.weeks.length, cProg.weeks.length);

  // Verify localStorage payload is clean & lightweight
  const rawLs = clientContext.localStorage.getItem('GS_STORE');
  assert.ok(rawLs, 'GS_STORE must exist in localStorage');
  const lsObj = JSON.parse(rawLs);
  assert.strictEqual(lsObj.activeProgram, null);
  assert.strictEqual(lsObj.activeAthleteProgram, null);
  assert.ok(rawLs.length < 50000, `localStorage GS_STORE must be < 50KB (actual: ${rawLs.length} bytes)`);
});

// ============================================================
// FASE 10: QUOTA STRESS TEST (3 CYCLES OF MASSIVE PROGRAM)
// ============================================================
console.log('\n[FASE 10] Quota Stress Test (3 Cycles of Massive 40-Week Program)...');

await runAsyncTest('3x Massive Save/Read/Reload Cycles with Zero Quota Errors', async () => {
  const pCore = new GiammariaPersistenceCore({ customDb: new MemoryIndexedDB() });
  await pCore.init();

  // Build massive 40-week program
  const massiveProg = JSON.parse(JSON.stringify(goldenProg));
  massiveProg.id = 'massive_40_weeks_prog';
  massiveProg.weeks = [
    ...goldenProg.weeks,
    ...goldenProg.weeks.map(w => ({ ...w, week_number: w.week_number + 20, label: `Settimana ${w.week_number + 20}` }))
  ];
  massiveProg.duration_weeks = massiveProg.weeks.length;

  for (let cycle = 1; cycle <= 3; cycle++) {
    const saveRes = await pCore.saveProgram(massiveProg);
    assert.strictEqual(saveRes.id, massiveProg.id);
    const loaded = await pCore.loadProgram(massiveProg.id);
    assert.strictEqual(loaded.weeks.length, 40);
    const fpPre = getDeterministicFingerprint(massiveProg);
    const fpPost = getDeterministicFingerprint(loaded);
    assert.strictEqual(fpPre, fpPost);
  }
});

console.log('\n============================================================');
console.log(`MASTER TASK ⑱ SUITE: ${passedTests} PASSED, ${failedTests} FAILED (Total: ${totalTests})`);
console.log('============================================================\n');

if (failedTests > 0) {
  process.exit(1);
}
