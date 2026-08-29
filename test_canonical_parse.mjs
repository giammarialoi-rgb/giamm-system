import fs from 'fs';
import XLSX from 'xlsx';
import { parseStructuredWorkbook } from './universal-import-engine.mjs';

const wb = XLSX.readFile('GIANMARIA LOI(2).xlsx');
const res = parseStructuredWorkbook(wb);
const canonical = res.canonicalProgram;

console.log('=== CANONICAL PARSE RESULT ===');
console.log('1. Training Weeks:', canonical.weeks?.length);
canonical.weeks?.forEach((w, wIdx) => {
  console.log(`  Week ${wIdx + 1}: ${w.sessions?.length} sessions`);
  w.sessions?.forEach((s, sIdx) => {
    console.log(`    Session ${sIdx + 1} (${s.name}): ${(s.exercises || []).length} exercises`);
    (s.exercises || []).forEach((e, eIdx) => {
      console.log(`      Ex ${eIdx + 1}: ${e.name_original} | Sets: ${e.sets_count} | Reps: ${e.reps_target} | Rest: ${e.rest_seconds}s | RIR: ${e.rir_target} | RPE: ${e.rpe_target} | Notes: ${e.notes}`);
    });
  });
});

console.log('\n2. Nutrition: present =', canonical.nutrition?.present);
console.log('  Days count:', canonical.nutrition?.days?.length);
canonical.nutrition?.days?.forEach((d, dIdx) => {
  console.log(`  Day ${dIdx + 1}: ${d.day} (${d.meals?.length} meals)`);
  d.meals?.forEach((m, mIdx) => {
    console.log(`    Meal ${mIdx + 1} (${m.name}): ${m.foods?.length} foods`);
    m.foods?.forEach(f => {
      console.log(`      - ${f.quantity} ${f.unit} ${f.name} (notes: ${f.notes})`);
    });
  });
});

console.log('\n3. Supplementation: present =', canonical.supplementation?.present);
console.log('  Items count:', canonical.supplementation?.items?.length);
canonical.supplementation?.items?.forEach((it, idx) => {
  console.log(`  Item ${idx + 1}: ${it.name} | Dose: ${it.dose} | Unit: ${it.unit} | Timing: ${it.timing} | Freq: ${it.frequency} | Notes: ${it.notes}`);
});

console.log('\n4. Therapy: present =', canonical.therapy?.present);
console.log('  Medications count:', canonical.therapy?.medications?.length);
canonical.therapy?.medications?.forEach((med, idx) => {
  console.log(`  Med ${idx + 1}: ${med.name || med.medication} | Dose: ${med.dose} | Days: ${JSON.stringify(med.days || med.dayOfWeek)} | Timing: ${med.timing || med.time} | Duration: ${med.duration || med.weekRange || med.duration_text} | Notes: ${med.notes}`);
});
console.log('  Therapy raw items:', canonical.therapy?.entries?.length);
canonical.therapy?.entries?.forEach((it, idx) => {
  console.log(`  Rule ${idx + 1}: ${it.item_name} | ${it.value} | ${it.date_or_week} | ${it.notes}`);
});
