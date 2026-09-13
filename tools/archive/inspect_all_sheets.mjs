import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

console.log('Sheet Names:', wb.SheetNames);

for (let i = 0; i < wb.SheetNames.length; i++) {
  const name = wb.SheetNames[i];
  const sheet = wb.Sheets[name];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`\n================================================================`);
  console.log(`[${i}] SHEET NAME: "${name}" (rows: ${grid.length}, cols: ${grid[0] ? grid[0].length : 0})`);
  console.log(`================================================================`);
  
  for (let r = 0; r < Math.min(grid.length, 50); r++) {
    const row = grid[r];
    const nonBlank = row.filter(cell => cell !== '' && cell !== null && cell !== undefined);
    if (nonBlank.length > 0) {
      console.log(`R${r + 1}:`, JSON.stringify(row.filter((_, idx) => idx < 12)));
    }
  }
}
