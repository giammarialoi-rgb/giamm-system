import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, cellStyles: true });

console.log('=== WORKBOOK SHEET NAMES ===');
console.log(wb.SheetNames);

for (const name of wb.SheetNames) {
  console.log(`\n========================================`);
  console.log(`SHEET: ${name}`);
  const sheet = wb.Sheets[name];
  const ref = sheet['!ref'] || 'A1';
  console.log(`Dimension: ${ref}`);
  console.log(`Merges:`, sheet['!merges'] || []);

  const grid = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
  console.log(`Total rows: ${grid.length}`);
  
  // Print non-empty rows with row index
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r];
    const nonBlank = row.filter(cell => cell !== '' && cell !== null && cell !== undefined);
    if (nonBlank.length > 0) {
      console.log(`Row ${r + 1} [${nonBlank.length} cells]:`, JSON.stringify(row.slice(0, 15)));
    }
  }
}
