import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

console.log('============================================================');
console.log(`GIAMMARIA SYSTEM V29 MASTER DIAGNOSTIC (TOTAL SHEETS: ${wb.SheetNames.length})`);
console.log('============================================================\n');

wb.SheetNames.forEach((name, idx) => {
  const ws = wb.Sheets[name];
  const ref = ws['!ref'] || 'EMPTY';
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const nonBlank = grid.filter(r => r.some(c => c !== '' && c !== null && c !== undefined));
  const merges = ws['!merges'] || [];
  console.log(`[${String(idx + 1).padStart(2, '0')}] Sheet: "${name}"`);
  console.log(`     Range: ${ref} | Total Rows: ${grid.length} | Non-empty: ${nonBlank.length} | Merges: ${merges.length}`);
});
