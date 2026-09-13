import fs from 'fs';
import * as XLSX from 'xlsx';

const files = ['test_program.xlsx', 'test_program.xls', 'app/src/main/assets/GIAMMARIA_SYSTEM_V29_MASTER.xlsx'];

files.forEach(f => {
  if (fs.existsSync(f)) {
    const buf = fs.readFileSync(f);
    try {
      const wb = XLSX.read(buf, { type: 'buffer' });
      console.log(`\nFile: "${f}" -> Total sheets: ${wb.SheetNames.length}`);
      wb.SheetNames.forEach((s, idx) => {
        console.log(`  [${idx+1}] "${s}" (Range: ${wb.Sheets[s]['!ref']})`);
      });
    } catch (e) {
      console.log(`File: "${f}" -> Error reading: ${e.message}`);
    }
  } else {
    console.log(`File: "${f}" -> NOT FOUND`);
  }
});
