import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, cellStyles: true });

const names = ["00 COVER", "00 DASHBOARD", "08 SOSTITUZIONI", "01 SETUP", "02 BASELINE"];

for (const name of names) {
  console.log(`\n======================================================`);
  console.log(`=== SHEET: ${name} ===`);
  const sheet = wb.Sheets[name];
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    const nonBlank = row.filter(c => c !== '' && c !== null && c !== undefined);
    if (nonBlank.length > 0) {
      console.log(`R${(r+1).toString().padStart(2, '0')}:`, JSON.stringify(row));
    }
  }
}
