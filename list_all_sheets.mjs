import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true, cellStyles: true });

wb.SheetNames.forEach((name, i) => {
  const s = wb.Sheets[name];
  console.log(`[${i.toString().padStart(2, '0')}] "${name}" | ref: ${s['!ref']} | merges: ${(s['!merges'] || []).length}`);
});
