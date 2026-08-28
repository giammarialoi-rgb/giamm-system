import fs from 'fs';
import * as XLSX from 'xlsx';
import { readStructuredWorkbook, classifySheetType, parseStructuredWorkbook } from './universal-import-engine.mjs';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, cellNF: true });

const { sheets, sheetNames } = readStructuredWorkbook(wb);

sheets.forEach((s, idx) => {
  const type = classifySheetType(s.name, s.rawRows);
  console.log(`Sheet [${idx}] "${s.name}" -> Classified as: "${type}"`);
});

const res = parseStructuredWorkbook(wb, 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
console.log(`\nParsed weeks count: ${res.canonicalProgram.weeks.length}`);
res.canonicalProgram.weeks.forEach(w => {
  console.log(`Week ${w.week_number} (${w.label}): ${w.sessions.length} sessions, ${w.sessions.reduce((acc, s) => acc + s.exercises.length, 0)} exercises, ${w.sessions.reduce((acc, s) => acc + s.exercises.reduce((a, e) => a + e.sets.length, 0), 0)} sets`);
});
