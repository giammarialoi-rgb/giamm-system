import fs from 'fs';
import path from 'path';
import XLSX from 'xlsx';

console.log("============================================================");
console.log("GIAMMARIA SYSTEM — MASTER TASK ⑯: GOLDEN FILE FORENSIC AUDIT");
console.log("============================================================\n");

const goldenFile = 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx';
if (!fs.existsSync(goldenFile)) {
  console.error(`ERROR: Golden file ${goldenFile} not found!`);
  process.exit(1);
}

const wb = XLSX.readFile(goldenFile, { cellDates: true, cellNF: true, cellFormula: true });
const sheetNames = wb.SheetNames;

console.log(`Analyzing Golden File: ${goldenFile}`);
console.log(`Total Worksheets Found: ${sheetNames.length}\n`);

const auditReport = {
  filename: goldenFile,
  fileSize: fs.statSync(goldenFile).size,
  totalSheets: sheetNames.length,
  sheets: [],
  macroAreaClassification: {
    training: [],
    nutrition: [],
    supplementation: [],
    therapy: [],
    exams: [],
    setup_and_meta: [],
    mixed_or_database: []
  },
  globalStats: {
    totalCells: 0,
    nonEmptyCells: 0,
    numberCells: 0,
    stringCells: 0,
    formulaCells: 0,
    dateCells: 0,
    booleanCells: 0
  }
};

sheetNames.forEach((name, idx) => {
  const ws = wb.Sheets[name];
  const ref = ws['!ref'] || 'A1:A1';
  const range = XLSX.utils.decode_range(ref);
  const totalRows = range.e.r - range.s.r + 1;
  const totalCols = range.e.c - range.s.c + 1;

  let sheetCells = 0;
  let nonEmptyCells = 0;
  let numberCells = 0;
  let stringCells = 0;
  let formulaCells = 0;
  let dateCells = 0;
  let booleanCells = 0;

  const rowData = [];
  const rawRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: false });

  let containsTrainingKeywords = false;
  let containsNutritionKeywords = false;
  let containsSupplementKeywords = false;
  let containsTherapyKeywords = false;
  let containsExamKeywords = false;
  let containsFormulas = false;

  const sampleTexts = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      sheetCells++;
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
        nonEmptyCells++;
        if (cell.f) {
          formulaCells++;
          containsFormulas = true;
        }
        if (cell.t === 'n') numberCells++;
        else if (cell.t === 's') {
          stringCells++;
          const str = String(cell.v).toLowerCase();
          if (sampleTexts.length < 15 && String(cell.v).trim().length > 3) {
            sampleTexts.push(String(cell.v).trim());
          }
          if (/movimento|esercizio|reps|rir|recupero|panca|squat|stacco|serie|trazioni|curl/i.test(str)) {
            containsTrainingKeywords = true;
          }
          if (/colazione|pranzo|cena|spuntino|kcal|calorie|proteine|carboidrati|grassi|alimento/i.test(str)) {
            containsNutritionKeywords = true;
          }
          if (/creatina|whey|omega|dosaggio|timing|integratore|multivitaminico/i.test(str)) {
            containsSupplementKeywords = true;
          }
          if (/farmaco|medicinale|posologia|durata settimane|compresse|terapia/i.test(str)) {
            containsTherapyKeywords = true;
          }
          if (/esame|referto|emocromo|testosterone|glicemia|transaminasi|ast|alt|creatinina|intervallo/i.test(str)) {
            containsExamKeywords = true;
          }
        } else if (cell.t === 'd') dateCells++;
        else if (cell.t === 'b') booleanCells++;
      }
    }
  }

  auditReport.globalStats.totalCells += sheetCells;
  auditReport.globalStats.nonEmptyCells += nonEmptyCells;
  auditReport.globalStats.numberCells += numberCells;
  auditReport.globalStats.stringCells += stringCells;
  auditReport.globalStats.formulaCells += formulaCells;
  auditReport.globalStats.dateCells += dateCells;
  auditReport.globalStats.booleanCells += booleanCells;

  // Determine Sheet Classification
  let primaryCategory = 'setup_and_meta';
  if (/^W\d+/i.test(name) || containsTrainingKeywords) {
    primaryCategory = 'training';
    auditReport.macroAreaClassification.training.push(name);
  } else if (/dieta|nutri|alimen/i.test(name) || containsNutritionKeywords) {
    primaryCategory = 'nutrition';
    auditReport.macroAreaClassification.nutrition.push(name);
  } else if (/integ|suppl/i.test(name) || containsSupplementKeywords) {
    primaryCategory = 'supplementation';
    auditReport.macroAreaClassification.supplementation.push(name);
  } else if (/terap/i.test(name) || containsTherapyKeywords) {
    primaryCategory = 'therapy';
    auditReport.macroAreaClassification.therapy.push(name);
  } else if (/esami|analisi/i.test(name) || containsExamKeywords) {
    primaryCategory = 'exams';
    auditReport.macroAreaClassification.exams.push(name);
  } else if (name.startsWith('_') || /db|liste|audit/i.test(name)) {
    primaryCategory = 'mixed_or_database';
    auditReport.macroAreaClassification.mixed_or_database.push(name);
  } else {
    auditReport.macroAreaClassification.setup_and_meta.push(name);
  }

  const sheetSummary = {
    index: idx + 1,
    name,
    dimensions: `${totalRows} rows x ${totalCols} cols (${ref})`,
    totalRows,
    totalCols,
    nonEmptyCells,
    numberCells,
    stringCells,
    formulaCells,
    dateCells,
    primaryCategory,
    features: {
      hasTraining: containsTrainingKeywords,
      hasNutrition: containsNutritionKeywords,
      hasSupplements: containsSupplementKeywords,
      hasTherapy: containsTherapyKeywords,
      hasExams: containsExamKeywords,
      hasFormulas: containsFormulas
    },
    sampleKeywords: sampleTexts.slice(0, 8)
  };

  auditReport.sheets.push(sheetSummary);

  console.log(`[Sheet ${idx+1}/26] ${name.padEnd(16)} | Range: ${ref.padEnd(10)} | NonEmpty: ${String(nonEmptyCells).padStart(5)} | Formulas: ${String(formulaCells).padStart(4)} | Category: ${primaryCategory}`);
});

console.log("\n------------------------------------------------------------");
console.log("MACRO AREA SUMMARY:");
console.log(`- Training Sheets (${auditReport.macroAreaClassification.training.length}): ${auditReport.macroAreaClassification.training.join(', ')}`);
console.log(`- Setup & Meta Sheets (${auditReport.macroAreaClassification.setup_and_meta.length}): ${auditReport.macroAreaClassification.setup_and_meta.join(', ')}`);
console.log(`- DB / Reference Sheets (${auditReport.macroAreaClassification.mixed_or_database.length}): ${auditReport.macroAreaClassification.mixed_or_database.join(', ')}`);
console.log(`\nGLOBAL METRICS:`);
console.log(`- Total Non-Empty Cells: ${auditReport.globalStats.nonEmptyCells}`);
console.log(`- Total Numeric Cells:   ${auditReport.globalStats.numberCells}`);
console.log(`- Total String Cells:    ${auditReport.globalStats.stringCells}`);
console.log(`- Total Formula Cells:   ${auditReport.globalStats.formulaCells}`);
console.log("------------------------------------------------------------\n");

// Ensure test-artifacts directory exists and write report
if (!fs.existsSync('test-artifacts')) {
  fs.mkdirSync('test-artifacts', { recursive: true });
}
fs.writeFileSync('test-artifacts/task16-golden-audit.json', JSON.stringify(auditReport, null, 2), 'utf8');
console.log("✓ Audit report written to test-artifacts/task16-golden-audit.json");
