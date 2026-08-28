import XLSX from 'xlsx';
import fs from 'fs';
import { parseStructuredWorkbook } from './universal-import-engine.mjs';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const res = parseStructuredWorkbook(wb, 'GIAMMARIA_SYSTEM_V29_MASTER.xlsx');

console.log("=== GOLDEN FILE INTEGRITY STATS ===");
console.log(`Weeks: ${res.stats.canonical_weeks_count} (expected: 20)`);
console.log(`Sessions: ${res.stats.canonical_sessions_count} (expected: 68)`);
console.log(`Exercises: ${res.stats.canonical_exercises_count} (expected: 870)`);
console.log(`Sets: ${res.stats.canonical_sets_count} (expected: 1642)`);
