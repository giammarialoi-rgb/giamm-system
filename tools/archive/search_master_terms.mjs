import fs from 'fs';
import * as XLSX from 'xlsx';

const buf = fs.readFileSync('GIAMMARIA_SYSTEM_V29_MASTER.xlsx');
const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });

const searchTerms = [
  'colazione', 'pranzo', 'cena', 'spuntino', 'dieta', 'aliment', 'nutri', 'kcal', 'pasto', 'pasti', 'grammi', 'carb', 'prot',
  'integrat', 'supplem', 'creatina', 'whey', 'omega', 'vitamina', 'magnesio',
  'terapia', 'farmac', 'esame', 'esami', 'analisi', 'sangue', 'blood', 'testosteron', 'emoglobina', 'glicemia', 'estradiolo'
];

console.log('=== SEARCHING ALL SHEETS FOR TERMS ===');

wb.SheetNames.forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const grid = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const hits = [];

  grid.forEach((row, rIdx) => {
    row.forEach((cell, cIdx) => {
      const cellStr = String(cell || '').trim();
      if (!cellStr) return;
      const lower = cellStr.toLowerCase();
      for (const term of searchTerms) {
        if (lower.includes(term)) {
          hits.push({
            row: rIdx + 1,
            col: cIdx + 1,
            addr: XLSX.utils.encode_cell({ r: rIdx, c: cIdx }),
            term,
            val: cellStr
          });
          break;
        }
      }
    });
  });

  if (hits.length > 0) {
    console.log(`\nSheet: "${sheetName}" (${hits.length} matches):`);
    hits.slice(0, 10).forEach(h => {
      console.log(`  [${h.addr}] (${h.term}): "${h.val}"`);
    });
    if (hits.length > 10) console.log(`  ... and ${hits.length - 10} more`);
  }
});
