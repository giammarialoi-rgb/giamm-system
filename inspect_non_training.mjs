import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

const nonTrainingSheets = [
  "00 COVER",
  "00 DASHBOARD",
  "08 SOSTITUZIONI",
  "01 SETUP",
  "02 BASELINE",
  "03 EVIDENCE",
  "04 PROGRESSO",
  "09 AUDIT VOLUME"
];

nonTrainingSheets.forEach(name => {
  const ws = wb.Sheets[name];
  if (!ws) return;
  console.log(`\n============================================================`);
  console.log(`SHEET: "${name}"`);
  console.log(`============================================================`);
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  grid.forEach((row, rIdx) => {
    const nonBlank = row.filter(c => c !== '' && c !== null && c !== undefined);
    if (nonBlank.length > 0) {
      console.log(`R${String(rIdx + 1).padStart(2, '0')}: ${JSON.stringify(row)}`);
    }
  });
});
