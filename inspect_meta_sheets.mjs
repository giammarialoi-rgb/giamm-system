import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

const nonWSheets = ["00 COVER", "00 DASHBOARD", "01 SETUP", "02 BASELINE", "03 EVIDENCE", "04 PROGRESSO", "08 SOSTITUZIONI", "_LISTE", "09 AUDIT VOLUME", "_SUB_DB"];

for (const name of nonWSheets) {
  console.log(`\n================================================================`);
  console.log(`SHEET: "${name}"`);
  console.log(`================================================================`);
  const sheet = wb.Sheets[name];
  if (!sheet) continue;
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    const nonBlank = row.filter(cell => cell !== '' && cell !== null && cell !== undefined);
    if (nonBlank.length > 0) {
      console.log(`R${r + 1}: ${JSON.stringify(row.filter((_, idx) => idx < 15))}`);
    }
  }
}
