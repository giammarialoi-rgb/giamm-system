import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

console.log('=== ALL SHEETS in GIAMMARIA_SYSTEM_V29_MASTER.xlsx ===');
wb.SheetNames.forEach((n, idx) => {
  const sheet = wb.Sheets[n];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`[${idx}] "${n}" -> ${grid.length} rows, ${grid[0] ? grid[0].length : 0} cols`);
});
