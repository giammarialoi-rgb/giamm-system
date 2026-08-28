import XLSX from 'xlsx';
import fs from 'fs';
import { parseStructuredWorkbook } from './universal-import-engine.mjs';

const filePath = 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx';
if (!fs.existsSync(filePath)) {
  console.error(`File ${filePath} not found!`);
  process.exit(1);
}

const workbook = XLSX.readFile(filePath, { cellDates: true, cellNF: true, cellFormula: true });
console.log('============================================================');
console.log('FASE 2: INDEPENDENT AUDIT OF GOLDEN WORKBOOK');
console.log('============================================================');
console.log(`Workbook: ${filePath}`);
console.log(`Sheet count: ${workbook.SheetNames.length}`);

let totalCells = 0;
let totalNonEmpty = 0;
let totalNumeric = 0;
let totalText = 0;
let totalFormulas = 0;

const sheetDetails = [];

workbook.SheetNames.forEach((sheetName, idx) => {
  const sheet = workbook.Sheets[sheetName];
  const ref = sheet['!ref'] || 'A1:A1';
  const range = XLSX.utils.decode_range(ref);
  const rows = range.e.r - range.s.r + 1;
  const cols = range.e.c - range.s.c + 1;
  const sheetCellCount = rows * cols;
  totalCells += sheetCellCount;

  let sNonEmpty = 0;
  let sNumeric = 0;
  let sText = 0;
  let sFormulas = 0;

  for (let r = range.s.r; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c });
      const cell = sheet[cellAddress];
      if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
        sNonEmpty++;
        if (typeof cell.v === 'number') sNumeric++;
        else sText++;
        if (cell.f) sFormulas++;
      }
    }
  }

  totalNonEmpty += sNonEmpty;
  totalNumeric += sNumeric;
  totalText += sText;
  totalFormulas += sFormulas;

  sheetDetails.push({
    index: idx + 1,
    name: sheetName,
    dimensions: `${rows}x${cols} (${ref})`,
    nonEmptyCells: sNonEmpty,
    numericCells: sNumeric,
    textCells: sText
  });
});

console.log('\n--- SHEET BREAKDOWN ---');
console.table(sheetDetails);

console.log('\n--- GLOBAL METRICS ---');
console.log(`Total Sheets: ${workbook.SheetNames.length}`);
console.log(`Total Potential Cells in Ranges: ${totalCells}`);
console.log(`Total Non-Empty Cells: ${totalNonEmpty}`);
console.log(`Total Numeric Cells: ${totalNumeric}`);
console.log(`Total Text Cells: ${totalText}`);
console.log(`Total Formula Cells: ${totalFormulas}`);

// Now Parse Canonical Program
const parsed = parseStructuredWorkbook(workbook, filePath);
const prog = parsed.canonicalProgram;
const stats = parsed.integrityStats;

console.log('\n--- CANONICAL MODEL EXTRACTION ---');
console.log(`Canonical Weeks: ${prog.weeks.length} (Expected: 20)`);
console.log(`Canonical Sessions: ${stats.canonical_sessions_count} (Expected: 68)`);
console.log(`Canonical Exercises: ${stats.canonical_exercises_count} (Expected: 870)`);
console.log(`Canonical Sets: ${stats.canonical_sets_count} (Expected: 1642)`);

// Forensic Samples
console.log('\n--- FORENSIC SAMPLES ---');

// 1. Beginning: Week 1, Session 1, First Exercise
const w1s1 = prog.weeks[0]?.sessions[0];
console.log('Sample [1] Start (Week 1 Session 1):', w1s1?.name);
console.log('  Exercise 1:', w1s1?.exercises[0]?.name, '| Sets:', w1s1?.exercises[0]?.sets?.length);
console.log('  Set 1:', w1s1?.exercises[0]?.sets[0]);

// 2. Middle: Week 10, Session 2
const w10s2 = prog.weeks[9]?.sessions[1];
console.log('\nSample [2] Middle (Week 10 Session 2):', w10s2?.name);
console.log('  Exercise Count:', w10s2?.exercises?.length);
if (w10s2?.exercises?.length > 0) {
  const midEx = w10s2.exercises[0];
  console.log('  Exercise 1:', midEx.name, '| Sets:', midEx.sets?.length, '| RIR:', midEx.rir_target, '| RPE:', midEx.rpe_target);
}

// 3. End: Week 20, Session 1
const w20s1 = prog.weeks[19]?.sessions[0];
console.log('\nSample [3] End (Week 20 Session 1):', w20s1?.name);
console.log('  Exercise Count:', w20s1?.exercises?.length);
const lastEx = w20s1?.exercises[w20s1.exercises.length - 1];
console.log('  Last Exercise:', lastEx?.name, '| Sets:', lastEx?.sets?.length);

// 4. Special Sets Search (Drop Set, AMRAP, RIR, RPE, rest)
let dropSetEx = null;
let amrapEx = null;
let customRestEx = null;

prog.weeks.forEach(w => {
  w.sessions.forEach(s => {
    s.exercises.forEach(e => {
      if (!dropSetEx && (e.notes?.toLowerCase().includes('drop') || e.sets.some(st => st.set_type === 'dropset' || st.notes?.toLowerCase().includes('drop')))) {
        dropSetEx = { week: w.week_number, session: s.name, exercise: e.name, notes: e.notes || e.sets[0]?.notes };
      }
      if (!amrapEx && (e.reps_target?.includes('AMRAP') || e.reps_target?.includes('MAX') || e.notes?.toLowerCase().includes('amrap'))) {
        amrapEx = { week: w.week_number, session: s.name, exercise: e.name, reps: e.reps_target };
      }
      if (!customRestEx && e.rest_seconds && e.rest_seconds !== 90) {
        customRestEx = { week: w.week_number, session: s.name, exercise: e.name, rest_seconds: e.rest_seconds };
      }
    });
  });
});

console.log('\nSample [4] Drop Set sample:', dropSetEx);
console.log('Sample [5] AMRAP / MAX sample:', amrapEx);
console.log('Sample [6] Custom Rest sample:', customRestEx);
