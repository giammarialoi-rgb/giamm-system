import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

const sheet = wb.Sheets['W01'];
const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

console.log(`=== SHEET W01 (rows: ${grid.length}) ===`);
for (let r = 0; r < grid.length; r++) {
  const row = grid[r];
  const nonBlank = row.map((c, i) => c !== '' ? `[C${i}] ${JSON.stringify(c)}` : null).filter(Boolean);
  if (nonBlank.length > 0) {
    console.log(`R${r + 1}: ${nonBlank.join(' | ')}`);
  }
}
