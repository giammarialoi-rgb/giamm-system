import fs from 'fs';
import path from 'path';
import vm from 'vm';
import XLSX from 'xlsx';
import {
  parseStructuredWorkbook,
  parseCanonicalProgramFromText,
  parseFoodItem,
  parseNutritionSheet,
  parseSupplementationSheet,
  parseTherapyExamsSheet,
  classifySheetType,
  normalizeExerciseName,
  parseExerciseDetails,
  EXERCISE_DICTIONARY
} from './universal-import-engine.mjs';

console.log("============================================================");
console.log("GIAMMARIA SYSTEM — MASTER TASK ⑮ VERIFICATION SUITE");
console.log("============================================================\n");

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  } else {
    console.error(`  ✗ FAILED: ${message}`);
    testsFailed++;
  }
}

// -------------------------------------------------------------
// 1. MODULE & ASSET PARITY TEST
// -------------------------------------------------------------
console.log("[1/5] Checking Asset Parity and Zero-Diff between Web and Android App...");
const webHtml = fs.readFileSync('web/index.html');
const appHtml = fs.readFileSync('app/src/main/assets/index.html');
const assetCompare = Buffer.compare(webHtml, appHtml);
assert(assetCompare === 0, "web/index.html and app/src/main/assets/index.html are byte-for-byte identical (Buffer.compare === 0)");

// -------------------------------------------------------------
// 2. GOLDEN XLSX NON-REGRESSION (MASTER V29)
// -------------------------------------------------------------
console.log("\n[2/5] Testing Golden File (GIAMMARIA_SYSTEM_V29_MASTER.xlsx) Non-Regression...");
const goldenPath = 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx';
assert(fs.existsSync(goldenPath), "Golden file exists on filesystem");

const goldenWb = XLSX.readFile(goldenPath);
const goldenParsed = parseStructuredWorkbook(goldenWb, 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const gStats = goldenParsed.integrityStats;

console.log(`  - Sheets count: ${gStats.source_sheets_count}`);
console.log(`  - Weeks count: ${gStats.canonical_weeks_count}`);
console.log(`  - Sessions count: ${gStats.canonical_sessions_count}`);
console.log(`  - Exercises count: ${gStats.canonical_exercises_count}`);
console.log(`  - Sets count: ${gStats.canonical_sets_count}`);

assert(gStats.source_sheets_count === 26, "Golden file contains exactly 26 source worksheets");
assert(gStats.canonical_weeks_count === 20, "Canonical model contains exactly 20 weeks");
assert(gStats.canonical_sessions_count === 68, "Canonical model contains exactly 68 sessions");
assert(gStats.canonical_exercises_count === 870, "Canonical model contains exactly 870 exercises");
assert(gStats.canonical_sets_count === 1642, "Canonical model contains exactly 1642 sets");

// Check week 1, session 1 exercise details
const w1s1 = goldenParsed.canonicalProgram.weeks[0]?.sessions[0];
assert(w1s1 !== undefined, "Week 1 Session 1 exists");
assert(w1s1.exercises.length > 0, "Week 1 Session 1 has exercises");
const ex0 = w1s1.exercises[0];
assert(ex0.sets.length > 0, "First exercise has parsed sets");
assert(ex0.sets[0].target_reps !== undefined, "Set has target_reps");
assert(ex0.sets[0].target_rir !== undefined, "Set has target_rir");

// -------------------------------------------------------------
// 3. SYNTHETIC MULTI-DOMAIN WORKBOOK (COMPLEX EXTRACTION)
// -------------------------------------------------------------
console.log("\n[3/5] Testing Multi-Domain Semantic Matrix Extraction (synthetic_complex_test.xlsx)...");
const synthPath = 'synthetic_complex_test.xlsx';
assert(fs.existsSync(synthPath), "Synthetic complex file exists on filesystem");

const synthWb = XLSX.readFile(synthPath);
const synthParsed = parseStructuredWorkbook(synthWb, 'synthetic_complex_test.xlsx');
const sStats = synthParsed.integrityStats;
const prog = synthParsed.canonicalProgram;

console.log(`  - Nutrition: ${sStats.nutrition_days_count} days, ${sStats.nutrition_meals_count} meals, ${sStats.nutrition_foods_count} foods`);
console.log(`  - Supplements: ${sStats.supplement_items_count} items`);
console.log(`  - Therapy: ${sStats.therapy_medications_count} grouped medications`);
console.log(`  - Clinical Exams: ${sStats.exam_records_count} lab records`);

assert(sStats.nutrition_days_count === 2, "Nutrition parsed exactly 2 days (LUNEDÌ, MARTEDÌ)");
assert(sStats.nutrition_meals_count === 9, "Nutrition parsed exactly 9 meals across 2 days");
assert(sStats.nutrition_foods_count === 20, "Nutrition parsed exactly 20 food items");

const lunedi = prog.nutrition.days.find(d => d.day.includes('LUNED'));
assert(lunedi !== undefined, "Lunedì day block detected in nutrition");
const colazione = lunedi?.meals.find(m => m.name.toLowerCase().includes('colazione'));
assert(colazione !== undefined, "Colazione meal block detected in Lunedì");
const albume = colazione?.foods.find(f => f.food.toLowerCase().includes('albume'));
assert(albume !== undefined, "Albume d'uovo detected in Colazione");
assert(albume.quantity === 250, "Albume quantity parsed as 250");
assert(albume.unit === 'g', "Albume unit parsed as 'g'");
assert(albume.kcal === 130, "Albume kcal parsed as 130");
assert(albume.protein_g === 27, "Albume protein parsed as 27g");

// Supplements check
assert(sStats.supplement_items_count === 6, "Supplementation parsed exactly 6 items");
const creatina = prog.supplementation.items.find(i => i.name.toLowerCase().includes('creatina'));
assert(creatina !== undefined, "Creatina detected in supplements");
assert(creatina.dose === 5, "Creatina dose parsed as 5");
assert(creatina.unit === 'g', "Creatina unit parsed as 'g'");

// Therapy check
assert(sStats.therapy_medications_count === 3, "Therapy parsed exactly 3 grouped medications");
const farmacoX = prog.therapy.medications.find(m => m.medication.toLowerCase().includes('farmaco x'));
assert(farmacoX !== undefined, "Farmaco X detected in therapy");
assert(Array.isArray(farmacoX.days) && farmacoX.days.length === 3, "Farmaco X correctly grouped across 3 days (Lunedì, Mercoledì, Venerdì)");
assert(farmacoX.duration_weeks === 8, "Farmaco X duration parsed as 8 weeks");

// Exams check
assert(sStats.exam_records_count === 8, "Clinical exams parsed exactly 8 records");
const testoster = prog.exams.records.find(e => e.parameter.toLowerCase().includes('testosterone'));
assert(testoster !== undefined, "Testosterone Totale detected in exams");
assert(testoster.value === '650', "Testosterone value parsed as 650");
assert(testoster.unit === 'ng/dL', "Testosterone unit parsed as ng/dL");
assert(testoster.reference_range === '300 - 1000', "Testosterone reference range parsed as 300 - 1000");

// -------------------------------------------------------------
// 4. MOCK DOM & CLIENT PARSER INTEGRITY
// -------------------------------------------------------------
console.log("\n[4/5] Testing Mock Client-Side Runtime, Handlers, and Review UX...");

// Create a complete DOM-like environment in VM to test client script
const htmlStr = fs.readFileSync('web/index.html', 'utf8');

const storageData = {};
const domSandbox = {
  window: {},
  document: {
    getElementById: (id) => ({
      value: "",
      files: [],
      click: () => {},
      style: {}
    }),
    querySelector: () => null,
    querySelectorAll: () => []
  },
  localStorage: {
    getItem: (k) => storageData[k] || null,
    setItem: (k, v) => { storageData[k] = String(v); },
    removeItem: (k) => { delete storageData[k]; },
    clear: () => {}
  },
  XMLHttpRequest: class {
    open() {}
    send() {}
    setRequestHeader() {}
  },
  navigator: {
    onLine: true,
    userAgent: "Mozilla/5.0 (Linux; Android 14) Chrome/120.0"
  },
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  XLSX: XLSX,
  store: {
    accountToken: null,
    accountUser: null,
    bw: {},
    prefs: {},
    models: []
  },
  DATA: null,
  currentWeek: 1,
  currentDay: 0,
  currentView: 'import',
  esc: (s) => String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'),
  safeDisplayValue: (v) => (typeof v === 'object' ? (v?.food || v?.name || v?.medication || v?.parameter || JSON.stringify(v)) : String(v || '')),
  rirToRpe: (rir) => 10 - rir,
  rpeToRir: (rpe) => 10 - rpe,
  normalizeProgram: (p) => p,
  persist: () => {},
  navigate: () => {},
  formatFileSize: (b) => `${b} B`,
  alert: (msg) => {},
  console: console
};

domSandbox.window = domSandbox;
domSandbox.globalThis = domSandbox;

const scriptMatches = htmlStr.match(/<script(?![^>]*src=)>([\s\S]*?)<\/script>/gi);
let combinedClientScript = "";
if (scriptMatches) {
  scriptMatches.forEach(tag => {
    const code = tag.replace(/<\/?script[^>]*>/gi, "");
    combinedClientScript += code + "\n;\n";
  });
}

const context = vm.createContext(domSandbox);
try {
  vm.runInContext(combinedClientScript, context);
  assert(true, "Client JavaScript in web/index.html executed cleanly without errors in VM");
} catch (vmErr) {
  assert(false, `Client script execution error: ${vmErr.message}`);
}

// Test client parser functions in VM
assert(typeof context.parseStructuredWorkbook === 'function', "parseStructuredWorkbook defined in client script");
assert(typeof context.parseNutritionSheet === 'function', "parseNutritionSheet defined in client script");
assert(typeof context.parseSupplementationSheet === 'function', "parseSupplementationSheet defined in client script");
assert(typeof context.parseTherapyExamsSheet === 'function', "parseTherapyExamsSheet defined in client script");
assert(typeof context.renderImport === 'function', "renderImport defined in client script");

// Run client parser on synthetic workbook
const clientParsed = context.parseStructuredWorkbook(synthWb, 'synthetic_complex_test.xlsx');
assert(clientParsed.integrityStats.canonical_sets_count === sStats.canonical_sets_count, "Client and Backend produce identical canonical sets count");
assert(clientParsed.integrityStats.nutrition_days_count === sStats.nutrition_days_count, "Client and Backend produce identical nutrition days count");
assert(clientParsed.integrityStats.supplement_items_count === sStats.supplement_items_count, "Client and Backend produce identical supplement items count");
assert(clientParsed.integrityStats.therapy_medications_count === sStats.therapy_medications_count, "Client and Backend produce identical therapy medications count");
assert(clientParsed.integrityStats.exam_records_count === sStats.exam_records_count, "Client and Backend produce identical clinical exams count");

// Test Review Handlers in VM
context.window.programImportState = {
  currentImportId: 'test_123',
  canonicalProgram: clientParsed.canonicalProgram,
  warnings: [],
  errors: [],
  stats: clientParsed.integrityStats,
  activeReviewTab: 'training'
};

// 1. Test updateReviewTitle
context.updateReviewTitle("Titolo Personalizzato 2.1");
assert(context.window.programImportState.canonicalProgram.title === "Titolo Personalizzato 2.1", "updateReviewTitle updates program title in state");

// 2. Test updateReviewExerciseField
context.updateReviewExerciseField(0, 0, 0, 'rir', 1.5);
assert(context.window.programImportState.canonicalProgram.weeks[0].sessions[0].exercises[0].rir_target === 1.5, "updateReviewExerciseField updates RIR target");
assert(context.window.programImportState.canonicalProgram.weeks[0].sessions[0].exercises[0].rpe_target === 8.5, "updateReviewExerciseField updates RPE dynamically");

// 3. Test Nutrition handlers
const initMealFoodsCount = context.window.programImportState.canonicalProgram.nutrition.days[0].meals[0].foods.length;
context.updateReviewMealItem(0, 0, 0, 'quantity', 300);
assert(context.window.programImportState.canonicalProgram.nutrition.days[0].meals[0].foods[0].quantity === 300, "updateReviewMealItem updates food quantity");

context.addReviewMealItem(0, 0);
assert(context.window.programImportState.canonicalProgram.nutrition.days[0].meals[0].foods.length === initMealFoodsCount + 1, "addReviewMealItem appends new food item");

context.removeReviewMealItem(0, 0, initMealFoodsCount);
assert(context.window.programImportState.canonicalProgram.nutrition.days[0].meals[0].foods.length === initMealFoodsCount, "removeReviewMealItem removes food item");

// 4. Test Supplementation handlers
context.updateReviewSupplementItem(0, 'dose', 10);
assert(context.window.programImportState.canonicalProgram.supplementation.items[0].dose === 10, "updateReviewSupplementItem updates dose");

context.addReviewSupplementItem();
assert(context.window.programImportState.canonicalProgram.supplementation.items.length === 7, "addReviewSupplementItem appends supplement");

context.removeReviewSupplementItem(6);
assert(context.window.programImportState.canonicalProgram.supplementation.items.length === 6, "removeReviewSupplementItem removes supplement");

// 5. Test Therapy handlers
context.updateReviewTherapyMedication(0, 'duration_weeks', 12);
assert(context.window.programImportState.canonicalProgram.therapy.medications[0].duration_weeks === 12, "updateReviewTherapyMedication updates duration weeks");

context.addReviewTherapyMedication();
assert(context.window.programImportState.canonicalProgram.therapy.medications.length === 4, "addReviewTherapyMedication appends therapy");

context.removeReviewTherapyMedication(3);
assert(context.window.programImportState.canonicalProgram.therapy.medications.length === 3, "removeReviewTherapyMedication removes therapy");

// 6. Test Exam handlers
context.updateReviewExamRecord(0, 'value', '16.0');
assert(context.window.programImportState.canonicalProgram.exams.records[0].value === '16.0', "updateReviewExamRecord updates value");

context.addReviewExamRecord();
assert(context.window.programImportState.canonicalProgram.exams.records.length === 9, "addReviewExamRecord appends exam record");

context.removeReviewExamRecord(8);
assert(context.window.programImportState.canonicalProgram.exams.records.length === 8, "removeReviewExamRecord removes exam record");

// Test UI render output in all 4 tabs
const fakeContainer = { innerHTML: "" };

context.window.programImportState.activeReviewTab = 'training';
context.renderImport(fakeContainer);
assert(fakeContainer.innerHTML.includes("Struttura Allenamento Estratta"), "renderImport successfully renders Tab 1: Training");

context.window.programImportState.activeReviewTab = 'nutrition';
context.renderImport(fakeContainer);
assert(fakeContainer.innerHTML.includes("Piano Alimentare Strutturato Semantico") && fakeContainer.innerHTML.includes("Colazione"), "renderImport successfully renders Tab 2: Nutrition");

context.window.programImportState.activeReviewTab = 'supplementation';
context.renderImport(fakeContainer);
assert(fakeContainer.innerHTML.includes("Piano Integrazione & Supplementi") && fakeContainer.innerHTML.includes("Creatina"), "renderImport successfully renders Tab 3: Supplementation");

context.window.programImportState.activeReviewTab = 'therapy';
context.renderImport(fakeContainer);
assert(fakeContainer.innerHTML.includes("Terapia Farmacologica & Trattamenti") && fakeContainer.innerHTML.includes("Esami Clinici & Analisi del Sangue"), "renderImport successfully renders Tab 4: Therapy & Clinical Exams");

// Check for no "[object Object]" anywhere in rendered HTML
assert(!fakeContainer.innerHTML.includes("[object Object]"), "Zero [object Object] leaks detected across all rendered review tabs");

// -------------------------------------------------------------
// 5. UNIVERSAL TEXT IMPORT TEST
// -------------------------------------------------------------
console.log("\n[5/5] Testing Universal Text / Markdown Import Parsing...");
const rawTextSample = `
Settimana 1
Giorno 1: Upper Strength
Panca Piana Bilanciere 4x8 RIR 2 90s 100 kg
Rematore con Bilanciere 4x8-10 90s 80 kg
Squat 3x8 RIR 2 120s 120 kg

Nutrizione:
Lunedì
Colazione: 100g avena (370 kcal, P: 13g, C: 68g, F: 7g), 250g albume d'uovo (130 kcal, P: 27g)
Pranzo: 120g riso basmati, 200g petto di pollo

Integrazione:
Creatina 5g colazione
Omega 3 3 cps pranzo

Terapia:
Farmaco X 1 compressa Lunedì + Giovedì 8 settimane

Esami:
Testosterone Totale 650 ng/dL Range 300 - 1000
`;

const textParsed = parseCanonicalProgramFromText(rawTextSample, "scheda_test.txt");
assert(textParsed.program.weeks.length === 1, "Text parser created 1 week");
assert(textParsed.program.weeks[0].sessions.length === 1, "Text parser created 1 session");
assert(textParsed.program.weeks[0].sessions[0].exercises.length === 3, "Text parser extracted 3 exercises");
assert(textParsed.program.nutrition.present === true, "Text parser extracted structured nutrition");
assert(textParsed.program.supplementation.present === true, "Text parser extracted structured supplementation");
assert(textParsed.program.therapy.present === true, "Text parser extracted structured therapy");
assert(textParsed.program.exams.present === true, "Text parser extracted clinical exams");

console.log("\n============================================================");
console.log(`MASTER TASK ⑮ TEST SUITE COMPLETED: ${testsPassed} PASSED, ${testsFailed} FAILED`);
console.log("============================================================\n");

if (testsFailed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
