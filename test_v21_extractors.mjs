import fs from 'fs';
import * as XLSX from 'xlsx';
import assert from 'assert';
import {
  parseStructuredWorkbook,
  parseCanonicalProgramFromText,
  classifySheetType,
  parseNutritionSheet,
  parseSupplementationSheet,
  parseTherapyExamsSheet
} from './universal-import-engine.mjs';

console.log("=== TESTING IMPORT ENGINE 2.1 ===");

// 1. Test Golden File (GIAMMARIA_SYSTEM_V29_MASTER.xlsx)
const goldenBuf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const goldenWb = XLSX.read(goldenBuf, { type: 'buffer', cellDates: true, cellNF: true });
const goldenRes = parseStructuredWorkbook(goldenWb, 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx');

console.log("\n[Golden File Extraction Stats]");
console.log("- Source sheets:", goldenRes.integrityStats.source_sheets_count);
console.log("- Canonical weeks:", goldenRes.canonicalProgram.weeks.length);
console.log("- Canonical sessions:", goldenRes.integrityStats.canonical_sessions_count);
console.log("- Canonical exercises:", goldenRes.integrityStats.canonical_exercises_count);
console.log("- Canonical sets:", goldenRes.integrityStats.canonical_sets_count);

assert.strictEqual(goldenRes.integrityStats.source_sheets_count, 26);
assert.strictEqual(goldenRes.canonicalProgram.weeks.length, 20);
assert.strictEqual(goldenRes.integrityStats.canonical_sessions_count, 68);
assert.strictEqual(goldenRes.integrityStats.canonical_exercises_count, 870);
assert.strictEqual(goldenRes.integrityStats.canonical_sets_count, 1642);

console.log("✓ GOLDEN FILE TRAINING EXTRACTION: 100% NON-REGRESSION (20w, 68s, 870ex, 1642st)");

// 2. Test Complex Synthetic Workbook (Training + Nutrition + Supps + Therapy + Exams)
const synthBuf = fs.readFileSync('synthetic_complex_test.xlsx');
const synthWb = XLSX.read(synthBuf, { type: 'buffer', cellDates: true, cellNF: true });
const synthRes = parseStructuredWorkbook(synthWb, 'synthetic_complex_test.xlsx');

console.log("\n[Synthetic Complex Extraction Stats]");
console.log("- Nutrition days count:", synthRes.integrityStats.nutrition_days_count);
console.log("- Nutrition meals count:", synthRes.integrityStats.nutrition_meals_count);
console.log("- Nutrition foods count:", synthRes.integrityStats.nutrition_foods_count);
console.log("- Supplement items count:", synthRes.integrityStats.supplement_items_count);
console.log("- Therapy medications count:", synthRes.integrityStats.therapy_medications_count);
console.log("- Exam records count:", synthRes.integrityStats.exam_records_count);

assert.strictEqual(synthRes.canonicalProgram.nutrition.present, true);
assert.strictEqual(synthRes.canonicalProgram.nutrition.days.length, 2); // Lunedì, Martedì
assert.strictEqual(synthRes.canonicalProgram.supplementation.present, true);
assert.strictEqual(synthRes.canonicalProgram.supplementation.items.length, 6);
assert.strictEqual(synthRes.canonicalProgram.therapy.present, true);
assert.strictEqual(synthRes.canonicalProgram.therapy.medications.length, 3); // Farmaco X (grouped), Farmaco Y, Farmaco Z
assert.strictEqual(synthRes.canonicalProgram.exams.present, true);
assert.strictEqual(synthRes.canonicalProgram.exams.records.length, 8); // 8 bloodwork parameters

// Check specific foods and macros
const lunedi = synthRes.canonicalProgram.nutrition.days[0];
assert.strictEqual(lunedi.day, "LUNEDÌ");
const colazione = lunedi.meals[0];
assert.strictEqual(colazione.name, "Colazione");
const albume = colazione.foods[0];
console.log("\nSample Food Item (Albume):", albume);
assert.strictEqual(albume.food, "Albume d'uovo");
assert.strictEqual(albume.quantity, 250);
assert.strictEqual(albume.unit, "g");
assert.strictEqual(albume.kcal, 130);
assert.strictEqual(albume.protein_g, 27);
assert.strictEqual(albume.carbs_g, 1.5);
assert.strictEqual(albume.fat_g, 0.5);

// Check Therapy smart grouping
const farmacoX = synthRes.canonicalProgram.therapy.medications.find(m => m.medication === "Farmaco X");
console.log("\nSample Grouped Therapy Medication (Farmaco X):", farmacoX);
assert.ok(farmacoX);
assert.deepStrictEqual(farmacoX.days, ["Lunedì", "Mercoledì", "Venerdì"]);
assert.strictEqual(farmacoX.duration_weeks, 8);

// Check Exam record
const testosterone = synthRes.canonicalProgram.exams.records.find(r => r.parameter === "Testosterone Totale");
console.log("\nSample Exam Record (Testosterone):", testosterone);
assert.ok(testosterone);
assert.strictEqual(testosterone.value, "650");
assert.strictEqual(testosterone.unit, "ng/dL");
assert.strictEqual(testosterone.reference_range, "300 - 1000");

console.log("\n✓ ALL 2.1 SEMANTIC EXTRACTORS VERIFIED SUCCESSFULLY!");
