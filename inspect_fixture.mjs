import XLSX from 'xlsx';

const wb = XLSX.readFile('GIANMARIA LOI(2).xlsx');

console.log('=== WORKBOOK SHEET NAMES ===');
console.log(wb.SheetNames);

for (const sheetName of wb.SheetNames) {
  console.log(`\n================ SHEET: ${sheetName} ================`);
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`Total rows: ${rows.length}`);
  rows.forEach((r, idx) => {
    // print non-empty rows
    if (r.some(cell => String(cell).trim().length > 0)) {
      console.log(`Row ${String(idx + 1).padStart(2, '0')}:`, JSON.stringify(r));
    }
  });
}
