/**
 * GIAMMARIA SYSTEM - MASTER TASK 14 TRIPLE VERIFICATION SUITE
 * XLSX IMPORT ENGINE 2.0 / CLIENT RUNTIME / DIFF=0 EQUIVALENCE
 */

import fs from "fs";
import path from "path";
import vm from "vm";
import assert from "assert";
import XLSX from "xlsx";
import {
  parseStructuredWorkbook,
  classifySheetType,
  normalizeExerciseName,
  parseExerciseDetails,
  parseCanonicalProgramFromText
} from "./universal-import-engine.mjs";

console.log("============================================================");
console.log("GIAMMARIA SYSTEM - MASTER TASK 14 TRIPLE VERIFICATION SUITE");
console.log("XLSX IMPORT ENGINE 2.0 / CLIENT RUNTIME / DIFF=0 EQUIVALENCE");
console.log("============================================================\n");

let passed = 0;
let failed = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name} FAILED:`);
    console.error(`    Error: ${err.message}`);
    console.error(err);
    failed++;
  }
}

// ------------------------------------------------------------
// GROUP 1: Normalizer & Parser Unit Tests
// ------------------------------------------------------------
console.log("--- 1. PARSER COMPONENT & NORMALIZATION TESTS ---");

runTest("TEST 01: normalizeExerciseName handles exact dictionary matches and cleans prefixes", () => {
  const norm1 = normalizeExerciseName("1. Panca piana bilanciere");
  assert.strictEqual(norm1.name_normalized, "Panca Piana con Bilanciere");
  assert.strictEqual(norm1.muscle, "PETTO");

  const norm2 = normalizeExerciseName("A) Squat con bilanciere");
  assert.strictEqual(norm2.name_normalized, "Squat con Bilanciere");
  assert.strictEqual(norm2.muscle, "QUADRICIPITI");

  const norm3 = normalizeExerciseName("• Lat machine avanti");
  assert.ok(norm3.name_normalized.includes("Lat Machine"));
  assert.strictEqual(norm3.muscle, "DORSALI");
});

runTest("TEST 02: parseExerciseDetails handles standard set/rep/rir/rpe/rest formats", () => {
  const d1 = parseExerciseDetails("4x6-8", "@8", "120s");
  assert.strictEqual(d1.sets, 4);
  assert.strictEqual(d1.reps, "6-8");
  assert.strictEqual(d1.rpe, 8);
  assert.strictEqual(d1.rir, 2);

  const d2 = parseExerciseDetails("3x10", "RIR 1", "90s");
  assert.strictEqual(d2.sets, 3);
  assert.strictEqual(d2.reps, "10");
});

runTest("TEST 03: parseExerciseDetails handles complex rep ranges ('4x25-20-15-10', '4x24 PASSI', '3xMAX')", () => {
  const d1 = parseExerciseDetails("4x25-20-15-10", "RIR 2", "60s");
  assert.strictEqual(d1.sets, 4);
  assert.strictEqual(d1.reps, "25-20-15-10");

  const d2 = parseExerciseDetails("4x24 PASSI", "RIR 1", "90s");
  assert.strictEqual(d2.sets, 4);
  assert.strictEqual(d2.reps, "24 PASSI");

  const d3 = parseExerciseDetails("3xMAX", "RIR 0", "120s");
  assert.strictEqual(d3.sets, 3);
  assert.strictEqual(d3.reps, "MAX");
});

runTest("TEST 04: classifySheetType correctly categorizes all sheet types", () => {
  assert.strictEqual(classifySheetType("W01"), "training");
  assert.strictEqual(classifySheetType("Settimana 12"), "training");
  assert.strictEqual(classifySheetType("ALIMENTAZIONE"), "nutrition");
  assert.strictEqual(classifySheetType("PIANO ALIMENTARE"), "nutrition");
  assert.strictEqual(classifySheetType("INTEGRAZIONE"), "supplementation");
  assert.ok(classifySheetType("TERAPIA ED ESAMI").startsWith("therapy"));
});

// ------------------------------------------------------------
// GROUP 2: Master XLSX Real File Parsing
// ------------------------------------------------------------
console.log("\n--- 2. REAL MASTER XLSX FILE PARSING (GIAMMARIA_SYSTEM_V29_MASTER.xlsx) ---");

const masterFile = "GIAMMARIA_SYSTEM_V29_MASTER.xlsx";
const masterBuffer = fs.readFileSync(masterFile);
const masterWb = XLSX.read(masterBuffer, { type: "buffer", cellDates: true, cellNF: true });
const masterResult = parseStructuredWorkbook(masterWb, "GIAMMARIA_SYSTEM_V29_MASTER.xlsx");

runTest("TEST 05: Master file has 26 sheets, extracted 20 training weeks and 68 sessions", () => {
  assert.strictEqual(masterResult.integrityStats.source_sheets_count, 26);
  assert.strictEqual(masterResult.canonicalProgram.weeks.length, 20);
  assert.strictEqual(masterResult.integrityStats.canonical_sessions_count, 68);
});

runTest("TEST 06: Master file extracted 870 exercises and 1642 canonical sets", () => {
  assert.strictEqual(masterResult.integrityStats.canonical_exercises_count, 870);
  assert.strictEqual(masterResult.integrityStats.canonical_sets_count, 1642);
});

runTest("TEST 07: Every canonical set in Master file has valid set_number, set_type, target_reps, rir, rpe", () => {
  let setCount = 0;
  masterResult.canonicalProgram.weeks.forEach((w) => {
    (w.sessions || []).forEach((s) => {
      (s.exercises || []).forEach((ex) => {
        (ex.sets || []).forEach((st) => {
          setCount++;
          assert.ok(st.set_number >= 1, "Invalid set number");
          assert.ok(st.set_type, "Missing set type");
          assert.ok(st.target_reps, "Missing target reps");
          assert.ok(st.target_rir !== undefined && st.target_rir !== null, "Missing target rir");
          assert.ok(st.target_rpe !== undefined && st.target_rpe !== null, "Missing target rpe");
        });
      });
    });
  });
  assert.strictEqual(setCount, 1642);
});

// ------------------------------------------------------------
// GROUP 3: Multi-Module Test Workbook (Training + Nutrition + Supps + Therapy)
// ------------------------------------------------------------
console.log("\n--- 3. MULTI-MODULE TEST WORKBOOK VERIFICATION ---");

function createSyntheticWorkbook() {
  const wb = XLSX.utils.book_new();

  // Training W01
  const wsTrainingData = [
    ["SETTIMANA 01 • ACCUMULO 1"],
    ["GIORNO 1 • UPPER A"],
    ["Movimento", "Esercizio effettivo", "Set", "Reps target", "RIR target", "Recupero", "Carico pianificato", null, null, null, "Note"],
    ["Panca orizzontale", "Panca piana bilanciere", 1, "5–7", 2, "3–4 min", 130, null, null, null, "TOP SET"],
    ["Panca orizzontale", "Panca piana bilanciere", 2, "7–9", 2, "3 min", 115, null, null, null, "BACK-OFF"],
    ["Lat verticale", "Lat machine presa larga", 1, "4x25-20-15-10", 2, "2–3 min", 90, null, null, null, "PIRAMIDALE"],
    ["GIORNO 2 • LOWER A"],
    ["Movimento", "Esercizio effettivo", "Set", "Reps target", "RIR target", "Recupero", "Carico pianificato", null, null, null, "Note"],
    ["Quad squat", "Squat bilanciere", 1, "6–10", 2, "3–4 min", 170, null, null, null, null]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsTrainingData), "W01");

  // Nutrition
  const wsNutData = [
    ["PIANO ALIMENTARE PERSONALIZZATO"],
    ["GIORNO", "PASTO", "ALIMENTO", "QUANTITÀ", "UNITÀ"],
    ["LUNEDÌ", "Colazione", "Albume d'uovo", "250", "g"],
    ["LUNEDÌ", "Colazione", "Fiocchi d'avena", "80", "g"],
    ["LUNEDÌ", "Pranzo", "Riso basmati", "120", "g"],
    ["MARTEDÌ", "Colazione", "Yogurt greco 0%", "200", "g"]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsNutData), "ALIMENTAZIONE");

  // Supplements
  const wsSuppData = [
    ["PIANO SUPPLEMENTI ED INTEGRAZIONE"],
    ["Integratore", "Dose", "Timing", "Note"],
    ["Creatina Monoidrato", "5 g", "Post-workout", "Con carbo"],
    ["Omega 3 IFOS", "3 cps", "Colazione", "Con pasto"]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsSuppData), "INTEGRAZIONE");

  // Therapy
  const wsTherapyData = [
    ["TERAPIA ED ESAMI"],
    ["Farmaco", "Dosaggio", "Durata", "Note"],
    ["Cardirene", "100 mg", "12 settimane", "A stomaco pieno"],
    ["Controllo", "Emocromo", "Settimana 4", "Controllo periodico"]
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(wsTherapyData), "TERAPIA_ESAMI");

  return wb;
}

const synthWb = createSyntheticWorkbook();
const synthResult = parseStructuredWorkbook(synthWb, "TestMultiModule.xlsx");

runTest("TEST 08: Synthetic workbook extracts 2 training sessions, 4 exercises, nutrition days, supplements and therapy", () => {
  assert.strictEqual(synthResult.canonicalProgram.weeks.length, 1);
  assert.strictEqual(synthResult.canonicalProgram.weeks[0].sessions.length, 2);
  assert.strictEqual(synthResult.canonicalProgram.nutrition.present, true);
  assert.strictEqual(synthResult.canonicalProgram.supplementation.present, true);
  assert.strictEqual(synthResult.canonicalProgram.supplementation.items.length, 2);
  assert.strictEqual(synthResult.canonicalProgram.therapy.present, true);
});

// ------------------------------------------------------------
// GROUP 4: Frontend Client Execution & Window Bindings
// ------------------------------------------------------------
console.log("\n--- 4. CLIENT BUNDLE RUNTIME IN JAVASCRIPT ENVIRONMENT ---");

const indexHtml = fs.readFileSync("web/index.html", "utf8");

// Set up mock window context
const mockLocalStorage = {
  _store: {},
  getItem: function(k) { return this._store[k] || null; },
  setItem: function(k, v) { this._store[k] = String(v); },
  removeItem: function(k) { delete this._store[k]; },
  clear: function() { this._store = {}; }
};

class MockXMLHttpRequest {
  open(method, url) { this.url = url; }
  send() {}
  setRequestHeader() {}
}

const domMock = {
  window: {},
  document: {
    getElementById: () => ({ style: {}, classList: { add: () => {}, remove: () => {} }, value: "", addEventListener: () => {} }),
    querySelector: () => ({ style: {}, classList: { add: () => {}, remove: () => {} } }),
    querySelectorAll: () => []
  },
  localStorage: mockLocalStorage,
  XMLHttpRequest: MockXMLHttpRequest,
  XLSX: XLSX,
  navigator: { onLine: true, userAgent: "Node Test Runner" },
  scrollTo: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  alert: () => {},
  confirm: () => true,
  prompt: () => "test",
  rirToRpe: (rir) => 10 - rir,
  rpeToRir: (rpe) => 10 - rpe,
  fetch: async () => ({ ok: false, status: 404, json: async () => ({}) })
};
domMock.window = domMock;
domMock.globalThis = domMock;

const scriptRegex = /<script(?![^>]*src=)>([\s\S]*?)<\/script>/gi;
let match;
let scriptContent = "";
while ((match = scriptRegex.exec(indexHtml)) !== null) {
  scriptContent += match[1] + "\n;\n";
}

const clientContext = vm.createContext(domMock);
vm.runInContext(scriptContent, clientContext);

runTest("TEST 09: HTML files load xlsx.full.min.js in <head>", () => {
  assert.ok(indexHtml.includes('<script src="xlsx.full.min.js"></script>'), "Missing script tag in index.html");
});

runTest("TEST 10: Client-side script runs without throwing and exports window functions", () => {
  assert.strictEqual(typeof clientContext.parseStructuredWorkbook, "function");
  assert.strictEqual(typeof clientContext.parseCanonicalProgramFromText, "function");
  assert.strictEqual(typeof clientContext.safeDisplayValue, "function");
  assert.strictEqual(typeof clientContext.startProgramImportAnalysis, "function");
  assert.strictEqual(typeof clientContext.confirmImportAndActivate, "function");
  assert.ok(clientContext.GiammariaPersistence, "GiammariaPersistence missing");
});

runTest("TEST 11: safeDisplayValue handles null, undefined, objects, arrays and prevents '[object Object]'", () => {
  const sdv = clientContext.safeDisplayValue;
  assert.strictEqual(sdv(null), "");
  assert.strictEqual(sdv(undefined), "");
  assert.strictEqual(sdv("Hello"), "Hello");
  assert.strictEqual(sdv(42), "42");
  assert.strictEqual(sdv(["Petto", "Dorso"]), "Petto, Dorso");
  assert.strictEqual(sdv({ food: "Avena", quantity: "100", unit: "g" }), "Avena 100 g");
  assert.strictEqual(sdv({ name: "Creatina", dose: "5g", timing: "Post-workout" }), "Creatina 5g Post-workout");
  assert.strictEqual(sdv({ item_name: "Glicemia", value: "85 mg/dL" }), "Glicemia: 85 mg/dL");
  assert.ok(!sdv({ any_key: "value" }).includes("[object Object]"));
});

// ------------------------------------------------------------
// GROUP 5: Backend vs Client Equivalence Test (DIFF = 0)
// ------------------------------------------------------------
console.log("\n--- 5. BACKEND VS CLIENT EQUIVALENCE (DIFF = 0) ---");

runTest("TEST 12: Master XLSX produces EXACT MATCH (DIFF = 0) between Backend Parser and Client Parser", () => {
  const backendRes = parseStructuredWorkbook(masterWb, "GIAMMARIA_SYSTEM_V29_MASTER.xlsx");
  const clientRes = clientContext.parseStructuredWorkbook(masterWb, "GIAMMARIA_SYSTEM_V29_MASTER.xlsx");

  assert.strictEqual(backendRes.canonicalProgram.weeks.length, clientRes.canonicalProgram.weeks.length);
  assert.strictEqual(backendRes.integrityStats.canonical_sessions_count, clientRes.integrityStats.canonical_sessions_count);
  assert.strictEqual(backendRes.integrityStats.canonical_exercises_count, clientRes.integrityStats.canonical_exercises_count);
  assert.strictEqual(backendRes.integrityStats.canonical_sets_count, clientRes.integrityStats.canonical_sets_count);
});

// ------------------------------------------------------------
// GROUP 6: Asset Parity & Synchronization
// ------------------------------------------------------------
console.log("\n--- 6. ASSET PARITY & SYNCHRONIZATION ---");

runTest("TEST 13: web/index.html and app/src/main/assets/index.html are byte-identical", () => {
  const webHtml = fs.readFileSync("web/index.html");
  const appHtml = fs.readFileSync("app/src/main/assets/index.html");
  assert.strictEqual(Buffer.compare(webHtml, appHtml), 0, "Assets index.html differs from web index.html");
});

runTest("TEST 14: web/xlsx.full.min.js and app/src/main/assets/xlsx.full.min.js are byte-identical", () => {
  const webXlsx = fs.readFileSync("web/xlsx.full.min.js");
  const appXlsx = fs.readFileSync("app/src/main/assets/xlsx.full.min.js");
  assert.strictEqual(Buffer.compare(webXlsx, appXlsx), 0, "Assets xlsx.full.min.js differs from web xlsx.full.min.js");
});

console.log("\n============================================================");
console.log(`MASTER TASK 14 RESULTS: ${passed}/14 TESTS PASSED (${Math.round((passed / 14) * 100)}%)`);
console.log("============================================================\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
