import XLSX from 'xlsx';
import { parseStructuredWorkbook } from './universal-import-engine.mjs';

const wb = XLSX.readFile('synthetic_complex_test.xlsx');
console.log('Synthetic complex sheets:', wb.SheetNames);

const parsed = parseStructuredWorkbook(wb, 'synthetic_complex_test.xlsx');
const prog = parsed.canonicalProgram;

console.log('\n--- NUTRITION AUDIT (FASE 3) ---');
console.log('Nutrition present:', prog.nutrition.present);
console.log('Days count:', prog.nutrition.days.length);
prog.nutrition.days.forEach(d => {
  console.log(`Day: ${d.day_name} (${d.meals.length} meals)`);
  d.meals.forEach(m => {
    console.log(`  Meal: ${m.meal_name} (${m.foods.length} foods)`);
    m.foods.forEach(f => {
      console.log(`    Food: ${f.name} | Qty: ${f.quantity} ${f.unit} | Kcal: ${f.kcal} | P: ${f.protein_g} | C: ${f.carbs_g} | F: ${f.fat_g}`);
    });
  });
});

console.log('\n--- SUPPLEMENTATION AUDIT (FASE 4) ---');
console.log('Supplements count:', prog.supplementation.items.length);
prog.supplementation.items.forEach(it => {
  console.log(`  Item: ${it.name} | Dose: ${it.dose} ${it.unit} | Timing: ${it.timing} | Freq: ${it.frequency} | Notes: ${it.notes}`);
});

console.log('\n--- THERAPY AUDIT (FASE 5) ---');
console.log('Therapy meds count:', prog.therapy.medications.length);
prog.therapy.medications.forEach(med => {
  console.log(`  Med: ${med.medication} | Dose: ${med.dose} | Days: ${Array.isArray(med.days) ? med.days.join(', ') : med.days} | Duration: ${med.duration_weeks} weeks`);
});

console.log('\n--- EXAMS AUDIT (FASE 5) ---');
console.log('Exams records count:', prog.exams.records.length);
prog.exams.records.forEach(ex => {
  console.log(`  Exam: ${ex.parameter} | Value: ${ex.value} ${ex.unit} | Range: ${ex.reference_range} | Date: ${ex.date}`);
});
