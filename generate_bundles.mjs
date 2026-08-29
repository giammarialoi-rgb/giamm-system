import fs from 'fs';

console.log('=== GENERATING BUNDLES FOR MASTER TASK 25 ===');

// 1. Bundle persistence-core.mjs -> prepare_task20_persistence_clean.mjs
const rawPersistence = fs.readFileSync('persistence-core.mjs', 'utf8');
let cleanPersistence = rawPersistence
  .replace(/^import\s+.*?;?\s*$/gm, '')
  .replace(/^export\s+default\s+/gm, '')
  .replace(/^export\s+const\s+/gm, 'var ')
  .replace(/^export\s+let\s+/gm, 'var ')
  .replace(/^export\s+var\s+/gm, 'var ')
  .replace(/^export\s+async\s+function\s+/gm, 'async function ')
  .replace(/^export\s+function\s+/gm, 'function ')
  .replace(/^export\s+class\s+/gm, 'class ')
  .replace(/^export\s+\{.*?\}[\s;]*/gm, '')
  .replace(/^export\s+/gm, '');

fs.writeFileSync('prepare_task20_persistence_clean.mjs', cleanPersistence, 'utf8');
console.log('✅ prepare_task20_persistence_clean.mjs generated successfully!');

// 2. Bundle universal-import-engine.mjs -> prepare_task20_import_engine.mjs
const rawImport = fs.readFileSync('universal-import-engine.mjs', 'utf8');
let cleanImport = rawImport
  .replace(/^import\s+.*?;?\s*$/gm, '')
  .replace(/^export\s+default\s+/gm, '')
  .replace(/^export\s+const\s+/gm, 'var ')
  .replace(/^export\s+let\s+/gm, 'var ')
  .replace(/^export\s+var\s+/gm, 'var ')
  .replace(/^export\s+async\s+function\s+/gm, 'async function ')
  .replace(/^export\s+function\s+/gm, 'function ')
  .replace(/^export\s+class\s+/gm, 'class ')
  .replace(/^export\s+\{.*?\}[\s;]*/gm, '')
  .replace(/^export\s+/gm, '');

const reviewCallbacks = `
// Universal Canonical Program Builder Helper
function buildCanonicalProgram(parsed) {
  if (!parsed) return null;
  return parsed.canonicalProgram || parsed.program || parsed;
}

// Interactive Review Callbacks & State Handlers
var programImportState = {
  canonicalProgram: null,
  currentImportId: null,
  warnings: [],
  errors: [],
  stats: {},
  activeReviewTab: 'training',
  importDomain: 'all',
  isAnalyzing: false,
  isConfirming: false,
  filename: null
};
if (typeof window !== 'undefined') {
  if (!window.programImportState) window.programImportState = programImportState;
  window.buildCanonicalProgram = buildCanonicalProgram;
  window.validateCanonicalProgram = validateCanonicalProgram;
}

function updateReviewTitle(title) {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
  if (pState?.canonicalProgram) {
    pState.canonicalProgram.title = title;
  }
}

function updateReviewExerciseField(weekIdx, sessionIdx, exerciseIdx, field, value) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const prog = pState?.canonicalProgram;
    const ex = prog?.weeks?.[weekIdx]?.sessions?.[sessionIdx]?.exercises?.[exerciseIdx];
    if (!ex) return;

    if (field === 'name') {
      ex.name = value;
      ex.name_normalized = value;
      ex.exercise = value;
    } else if (field === 'sets') {
      ex.sets_count = value;
      if (Array.isArray(ex.sets)) {
        if (value > ex.sets.length) {
          while (ex.sets.length < value) {
            ex.sets.push({
              set_number: ex.sets.length + 1,
              set_type: "working",
              target_reps: ex.reps_target || "8-10",
              target_rir: ex.rir_target !== undefined ? ex.rir_target : 2,
              target_rpe: ex.rpe_target !== undefined ? ex.rpe_target : 8,
              rest_seconds: ex.rest_seconds || 90
            });
          }
        } else if (value < ex.sets.length && value > 0) {
          ex.sets = ex.sets.slice(0, value);
        }
      }
    } else if (field === 'reps') {
      ex.reps_target = value;
      ex.reps = value;
      ex.reps_raw = value;
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(s => s.target_reps = value);
      }
    } else if (field === 'rir') {
      ex.rir_target = value;
      ex.rpe_target = typeof rirToRpe === "function" ? rirToRpe(value) : (10 - value);
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(s => {
          s.target_rir = value;
          s.target_rpe = ex.rpe_target;
        });
      }
    } else if (field === 'rpe') {
      ex.rpe_target = value;
      ex.rir_target = typeof rpeToRir === "function" ? rpeToRir(value) : (10 - value);
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(s => {
          s.target_rpe = value;
          s.target_rir = ex.rir_target;
        });
      }
    } else if (field === 'rest_seconds') {
      ex.rest_seconds = value;
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(s => s.rest_seconds = value);
      }
    } else if (field === 'load_target') {
      ex.load_target = value;
      const num = parseFloat(String(value).replace(/[^0-9.]/g, ''));
      ex.load_value = !isNaN(num) ? num : null;
      if (Array.isArray(ex.sets)) {
        ex.sets.forEach(s => {
          s.target_load = ex.load_value;
          s.load = ex.load_value;
        });
      }
    }
  } catch (e) {}
}

function updateReviewMealItem(dayIdx, mealIdx, itemIdx, field, value) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const nutrition = pState?.canonicalProgram?.nutrition;
    const item = nutrition?.days?.[dayIdx]?.meals?.[mealIdx]?.foods?.[itemIdx];
    if (!item) return;

    if (field === 'name' || field === 'food') {
      item.name = value;
      item.food = value;
    } else if (field === 'quantity') {
      item.quantity = value;
    } else if (field === 'unit') {
      item.unit = value;
    } else if (field === 'kcal') {
      item.kcal = parseFloat(value) || 0;
    } else if (field === 'protein_g') {
      item.protein_g = parseFloat(value) || 0;
    } else if (field === 'carbs_g') {
      item.carbs_g = parseFloat(value) || 0;
    } else if (field === 'fat_g') {
      item.fat_g = parseFloat(value) || 0;
    }
  } catch (e) {}
}

function addReviewMealItem(dayIdx, mealIdx) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const nutrition = pState?.canonicalProgram?.nutrition;
    const meal = nutrition?.days?.[dayIdx]?.meals?.[mealIdx];
    if (!meal) return;
    if (!Array.isArray(meal.foods)) meal.foods = [];
    meal.foods.push({
      name: "Nuovo Alimento",
      food: "Nuovo Alimento",
      quantity: 100,
      unit: "g",
      kcal: 100,
      protein_g: 10,
      carbs_g: 10,
      fat_g: 2,
      notes: null
    });
    if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
  } catch (e) {}
}

function removeReviewMealItem(dayIdx, mealIdx, itemIdx) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const nutrition = pState?.canonicalProgram?.nutrition;
    const meal = nutrition?.days?.[dayIdx]?.meals?.[mealIdx];
    if (meal && Array.isArray(meal.foods)) {
      meal.foods.splice(itemIdx, 1);
      if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
    }
  } catch (e) {}
}

function updateReviewSupplementItem(itemIdx, field, value) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const supp = pState?.canonicalProgram?.supplementation;
    const item = supp?.items?.[itemIdx];
    if (!item) return;

    if (field === 'name') {
      item.name = value;
    } else if (field === 'dose' || field === 'dosage') {
      item.dose = value;
      item.dosage = value;
    } else if (field === 'timing') {
      item.timing = value;
    } else if (field === 'frequency') {
      item.frequency = value;
    } else if (field === 'notes') {
      item.notes = value;
    }
  } catch (e) {}
}

function addReviewSupplementItem() {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const supp = pState?.canonicalProgram?.supplementation;
    if (!supp) return;
    if (!Array.isArray(supp.items)) supp.items = [];
    supp.present = true;
    supp.items.push({
      name: "Nuovo Integratore",
      dose: "5 g",
      unit: "g",
      dosage: "5 g",
      timing: "Mattina",
      frequency: "Quotidiano",
      notes: null
    });
    if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
  } catch (e) {}
}

function removeReviewSupplementItem(itemIdx) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const supp = pState?.canonicalProgram?.supplementation;
    if (supp && Array.isArray(supp.items)) {
      supp.items.splice(itemIdx, 1);
      if (supp.items.length === 0) supp.present = false;
      if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
    }
  } catch (e) {}
}

function updateReviewTherapyMedication(medIdx, field, value) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const therapy = pState?.canonicalProgram?.therapy;
    const med = therapy?.medications?.[medIdx];
    if (!med) return;

    if (field === 'medication' || field === 'name') {
      med.medication = value;
      med.name = value;
    } else if (field === 'dose') {
      med.dose = value;
    } else if (field === 'days') {
      med.days = String(value).split(/[+,;]/).map(d => d.trim()).filter(Boolean);
      med.dayOfWeek = med.days;
    } else if (field === 'duration_weeks' || field === 'duration') {
      med.duration = value;
      med.duration_text = value;
    } else if (field === 'timing') {
      med.timing = value;
      med.time = value;
    } else if (field === 'notes') {
      med.notes = value;
    }
  } catch (e) {}
}

function addReviewTherapyMedication() {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const therapy = pState?.canonicalProgram?.therapy;
    if (!therapy) return;
    if (!Array.isArray(therapy.medications)) therapy.medications = [];
    therapy.present = true;
    therapy.medications.push({
      medication: "Nuovo Trattamento",
      name: "Nuovo Trattamento",
      dose: "1 dose",
      days: ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"],
      dayOfWeek: ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"],
      frequency: "Tutti i giorni",
      duration_weeks: 4,
      duration: "4 settimane",
      duration_text: "4 settimane",
      timing: "Mattina",
      notes: null
    });
    if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
  } catch (e) {}
}

function removeReviewTherapyMedication(medIdx) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const therapy = pState?.canonicalProgram?.therapy;
    if (therapy && Array.isArray(therapy.medications)) {
      therapy.medications.splice(medIdx, 1);
      if (therapy.medications.length === 0) therapy.present = false;
      if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
    }
  } catch (e) {}
}

function updateReviewExamRecord(recIdx, field, value) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const exams = pState?.canonicalProgram?.exams;
    const rec = (exams?.records || exams?.items)?.[recIdx];
    if (!rec) return;

    if (field === 'parameter' || field === 'name') {
      rec.parameter = value;
      rec.name = value;
    } else if (field === 'value') {
      rec.value = value;
    } else if (field === 'unit') {
      rec.unit = value;
    } else if (field === 'reference_range') {
      rec.reference_range = value;
    } else if (field === 'date') {
      rec.date = value;
    } else if (field === 'notes') {
      rec.notes = value;
    }
  } catch (e) {}
}

function addReviewExamRecord() {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const exams = pState?.canonicalProgram?.exams;
    if (!exams) return;
    if (!Array.isArray(exams.records)) exams.records = [];
    if (!Array.isArray(exams.items)) exams.items = exams.records;
    exams.present = true;
    const newRecord = {
      parameter: "Nuovo Esame",
      name: "Nuovo Esame",
      value: "",
      unit: "",
      reference_range: "",
      date: new Date().toISOString().split('T')[0],
      notes: null
    };
    exams.records.push(newRecord);
    if (exams.items !== exams.records) exams.items.push(newRecord);
    if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
  } catch (e) {}
}

function removeReviewExamRecord(recIdx) {
  try {
    const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
    const exams = pState?.canonicalProgram?.exams;
    if (exams) {
      if (Array.isArray(exams.records)) exams.records.splice(recIdx, 1);
      if (Array.isArray(exams.items) && exams.items !== exams.records) exams.items.splice(recIdx, 1);
      if ((exams.records?.length || 0) === 0) exams.present = false;
      if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
    }
  } catch (e) {}
}

function cancelCurrentImportReview() {
  const pState = (typeof window !== 'undefined' && window.programImportState) ? window.programImportState : programImportState;
  pState.canonicalProgram = null;
  pState.currentImportId = null;
  pState.warnings = [];
  pState.errors = [];
  pState.stats = {};
  if (typeof currentView !== 'undefined' && currentView === 'import' && typeof render === 'function') render();
}

if (typeof window !== 'undefined') {
  window.updateReviewTitle = updateReviewTitle;
  window.updateReviewExerciseField = updateReviewExerciseField;
  window.updateReviewMealItem = updateReviewMealItem;
  window.addReviewMealItem = addReviewMealItem;
  window.removeReviewMealItem = removeReviewMealItem;
  window.updateReviewSupplementItem = updateReviewSupplementItem;
  window.addReviewSupplementItem = addReviewSupplementItem;
  window.removeReviewSupplementItem = removeReviewSupplementItem;
  window.updateReviewTherapyMedication = updateReviewTherapyMedication;
  window.addReviewTherapyMedication = addReviewTherapyMedication;
  window.removeReviewTherapyMedication = removeReviewTherapyMedication;
  window.updateReviewExamRecord = updateReviewExamRecord;
  window.addReviewExamRecord = addReviewExamRecord;
  window.removeReviewExamRecord = removeReviewExamRecord;
  window.cancelCurrentImportReview = cancelCurrentImportReview;
  window.buildCanonicalProgram = buildCanonicalProgram;
  window.validateCanonicalProgram = validateCanonicalProgram;
}
`;

fs.writeFileSync('prepare_task20_import_engine.mjs', cleanImport + '\n\n' + reviewCallbacks, 'utf8');
console.log('✅ prepare_task20_import_engine.mjs generated successfully!');
