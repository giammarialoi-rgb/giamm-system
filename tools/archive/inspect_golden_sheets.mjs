import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, cellStyles: true });

console.log(`TOTAL SHEETS: ${wb.SheetNames.length}`);
const sheetReport = [];

for (let i = 0; i < wb.SheetNames.length; i++) {
  const name = wb.SheetNames[i];
  const sheet = wb.Sheets[name];
  const ref = sheet['!ref'] || 'A1';
  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  const rowCount = grid.length;
  const colCount = grid.reduce((max, row) => Math.max(max, row.length), 0);
  
  // Find non empty row count
  let nonEmptyRows = 0;
  let textSample = [];
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    const nonBlank = row.filter(cell => cell !== '' && cell !== null && cell !== undefined);
    if (nonBlank.length > 0) {
      nonEmptyRows++;
      if (textSample.length < 5) {
        textSample.push(`R${r+1}: ${JSON.stringify(nonBlank.slice(0, 8))}`);
      }
    }
  }

  sheetReport.push({
    index: i,
    name,
    ref,
    rowCount,
    colCount,
    nonEmptyRows,
    sample: textSample
  });
}

console.log(JSON.stringify(sheetReport, null, 2));
