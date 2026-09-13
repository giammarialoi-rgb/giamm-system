import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('test_program.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

console.log('=== test_program.xlsx SHEETS ===');
for (const n of wb.SheetNames) {
  const sheet = wb.Sheets[n];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`\nSHEET: "${n}" (${grid.length} rows)`);
  for (let r = 0; r < Math.min(grid.length, 30); r++) {
    const row = grid[r];
    const nonBlank = row.map((c, i) => c !== '' ? `[C${i}] ${JSON.stringify(c)}` : null).filter(Boolean);
    if (nonBlank.length > 0) {
      console.log(`R${r + 1}: ${nonBlank.join(' | ')}`);
    }
  }
}
