import fs from 'fs';
import * as XLSX from 'xlsx';
import { parseStructuredWorkbook, classifySheetType, readStructuredWorkbook } from './universal-import-engine.mjs';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, cellNF: true });
const result = parseStructuredWorkbook(wb, 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx');

console.log('=== PARSER RESULT FOR MASTER XLSX ===');
console.log('Source sheets:', wb.SheetNames.length);
console.log('Detected weeks count:', result.canonicalProgram.weeks.length);
console.log('Detected sessions count:', result.integrityStats.canonical_sessions_count);
console.log('Detected exercises count:', result.integrityStats.canonical_exercises_count);
console.log('Detected sets count:', result.integrityStats.canonical_sets_count);
console.log('Nutrition present:', result.canonicalProgram.nutrition?.present, 'days:', result.canonicalProgram.nutrition?.days?.length);
console.log('Supplementation present:', result.canonicalProgram.supplementation?.present, 'items:', result.canonicalProgram.supplementation?.items?.length);
console.log('Therapy present:', result.canonicalProgram.therapy?.present, 'entries:', result.canonicalProgram.therapy?.entries?.length);

const { sheets } = readStructuredWorkbook(wb);
sheets.forEach((s, idx) => {
  const type = classifySheetType(s.name, s.rawRows);
  console.log(`[${idx+1}] Sheet "${s.name}" -> Type: "${type}"`);
});
