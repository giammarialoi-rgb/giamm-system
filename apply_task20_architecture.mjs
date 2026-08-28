import fs from 'fs';

console.log('=== ASSEMBLING MASTER TASK 20 ARCHITECTURE ===');

let html = fs.readFileSync('web/index.html', 'utf8');

// 1. Ensure ConfigService & COACH_API_URL are declared at the beginning of script
const scriptTagMarker = '<script>';
const scriptTagPos = html.indexOf(scriptTagMarker);

if (scriptTagPos === -1) {
  throw new Error('Could not find <script> tag in index.html');
}

// Check if ConfigService already exists
if (!html.includes('const ConfigService = {')) {
  const configHeader = `
// ====================================================
// GIAMMARIA SYSTEM — ARCHITECTURE BASELINE (Master Task 20)
// 5-LAYER ENTERPRISE ARCHITECTURE & CENTRAL SERVICES
// ====================================================

// LAYER 5: EXTERNAL SERVICES & CENTRAL CONFIGURATION
const ConfigService = {
  getCoachApiUrl() {
    if (typeof window !== 'undefined' && window.NativeConfig && typeof window.NativeConfig.getCoachApiUrl === 'function') {
      const nativeUrl = window.NativeConfig.getCoachApiUrl();
      if (nativeUrl && nativeUrl.trim()) return nativeUrl.trim();
    }
    if (typeof window !== 'undefined' && window.__COACH_API_URL__) return window.__COACH_API_URL__;
    if (typeof process !== 'undefined' && process.env && process.env.COACH_API_URL) return process.env.COACH_API_URL;
    return 'https://coach-api-gemini.onrender.com';
  },
  getGoogleWebClientId() {
    if (typeof window !== 'undefined' && window.NativeConfig && typeof window.NativeConfig.getGoogleClientId === 'function') {
      return window.NativeConfig.getGoogleClientId();
    }
    return '';
  }
};
var COACH_API_URL = ConfigService.getCoachApiUrl();
if (typeof window !== 'undefined') {
  window.COACH_API_URL = COACH_API_URL;
  window.ConfigService = ConfigService;
}
`;
  html = html.slice(0, scriptTagPos + scriptTagMarker.length) + configHeader + html.slice(scriptTagPos + scriptTagMarker.length);
  console.log('✓ Injected ConfigService and COACH_API_URL initialization.');
}

// 2. Ensure historical functions and 5-layer services are attached
if (!html.includes('window.addBonusExercise = addBonusExercise;')) {
  const servicesAndHistoricalBlock = `
// ====================================================
// LAYER 2: APPLICATION SERVICES DEFINITIONS
// ====================================================
const ProgramService = {
  getActiveProgram() {
    return DATA;
  },
  async setActiveProgram(program, documentName = 'programma_attivo') {
    return importProgramJson(program, documentName);
  },
  modifyActiveProgram(operations) {
    if (!DATA || !Array.isArray(operations)) return { ok: false, error: 'Dati non validi' };
    const res = applyOperationsToProgram(DATA, operations);
    if (res && res.program) {
      DATA = normalizeProgram(res.program);
      persist();
      render();
      return { ok: true, program: DATA };
    }
    return { ok: false, error: 'Applicazione fallita' };
  },
  adaptProgramDuration(desiredWeeks) {
    if (!DATA || !DATA.weeks) return false;
    const num = Math.max(1, parseInt(desiredWeeks, 10) || DATA.weeks.length);
    if (DATA.weeks.length > num) {
      DATA.weeks = DATA.weeks.slice(0, num);
      DATA.duration_weeks = num;
      if (currentWeek > num) currentWeek = num;
      persist();
      render();
      return true;
    }
    return false;
  },
  exportProgram() {
    return exportActiveProgram();
  }
};

const WorkoutService = {
  getSession(weekNum, dayIndex) {
    const w = DATA?.weeks?.[weekNum - 1];
    return (w?.sessions || w?.days)?.[dayIndex] || null;
  },
  updateSet(weekNum, dayIndex, exerciseIndex, setNum, field, value) {
    const key = \`w\${weekNum}_d\${dayIndex}_e\${exerciseIndex}_s\${setNum}_\${field}\`;
    updateData(key, value);
  },
  toggleSetDone(weekNum, dayIndex, exerciseIndex, setNum) {
    const key = \`w\${weekNum}_d\${dayIndex}_e\${exerciseIndex}_s\${setNum}_done\`;
    toggleSetDone(key);
  },
  addSet(exerciseIndex) {
    return addSetToExercise(exerciseIndex);
  },
  removeSet(exerciseIndex, setNum) {
    return removeSetFromExercise(exerciseIndex, setNum);
  },
  getSetCount(exerciseIndex) {
    return getExerciseSetCount(exerciseIndex);
  },
  calculateVolume(weekNum, dayIndex) {
    return calculateSessionVolume(weekNum, dayIndex);
  },
  calculateTonnage(weekNum, dayIndex) {
    return calculateSessionVolume(weekNum, dayIndex);
  },
  calculateEffectiveIntensity(weekNum, dayIndex) {
    return calculateEffectiveIntensityVolume(weekNum, dayIndex);
  },
  startRestTimer(restStr) {
    return startTimer(restStr);
  },
  stopRestTimer() {
    return stopTimer();
  }
};

const NutritionService = {
  getNutritionPlan() {
    return DATA?.nutrition || null;
  },
  getDays() {
    return DATA?.nutrition?.days || [];
  },
  getMealsForDay(dayName) {
    const days = DATA?.nutrition?.days || [];
    const found = days.find(d => d.day.toUpperCase() === (dayName || '').toUpperCase());
    return found ? found.meals : [];
  }
};

const SupplementService = {
  getSupplementPlan() {
    return DATA?.supplementation || null;
  },
  getItems() {
    return DATA?.supplementation?.items || [];
  }
};

const TherapyService = {
  getTherapyPlan() {
    return DATA?.therapy || null;
  },
  getMedications() {
    return DATA?.therapy?.medications || [];
  }
};

const ExamService = {
  getClinicalExams() {
    return DATA?.clinical_exams || null;
  },
  getRecords() {
    return DATA?.clinical_exams?.records || [];
  }
};

const ImportService = {
  async extract(fileOrBuffer) {
    return extractDocumentContent(fileOrBuffer);
  },
  parseWorkbook(wb, filename) {
    return parseStructuredWorkbook(wb, filename);
  },
  parseText(txt, filename) {
    return parseCanonicalProgramFromText(txt, filename);
  },
  confirmAndActivate(canonicalProgram, filename) {
    return confirmAndActivateProgram(canonicalProgram, filename);
  }
};

const AIService = {
  async sendChatMessage(message) {
    if ($('ai-input')) $('ai-input').value = message;
    return askAI();
  },
  async applyProposal(proposalId) {
    return applyCoachProposal(proposalId);
  },
  cancelProposal(proposalId) {
    return cancelCoachProposal(proposalId);
  }
};

const NotificationService = {
  toast(message, type = 'info') {
    if (typeof showToast === 'function') {
      showToast(message, type);
    } else {
      console.info(\`[TOAST][\${type}] \${message}\`);
    }
  },
  alert(message) {
    alert(message);
  },
  confirm(message) {
    return confirm(message);
  }
};

const CalendarService = {
  getWeekSchedule(weekNum) {
    const w = DATA?.weeks?.[weekNum - 1];
    if (!w) return [];
    return (w.sessions || w.days || []).map((s, idx) => ({
      dayIndex: idx,
      title: s.title || s.day || \`Sessione \${idx + 1}\`,
      exerciseCount: (s.exercises || s.rows || []).length,
      isBonus: s.is_bonus || s.isBonus || false
    }));
  }
};

// LAYER 5: EXTERNAL SERVICES IMPLEMENTATIONS
const GoogleService = {
  async startSignIn() {
    if (window.NativeConfig && typeof window.NativeConfig.startGoogleSignIn === 'function') {
      window.NativeConfig.startGoogleSignIn();
    } else {
      console.info('[GoogleService] Web OAuth flow fallback');
    }
  },
  async handleIdToken(token) {
    return nativeGoogleResult(token);
  }
};

const AppleService = {
  async startSignIn() {
    if (window.NativeConfig && typeof window.NativeConfig.startAppleAuth === 'function') {
      window.NativeConfig.startAppleAuth();
    } else {
      window.location.href = coachEndpoint('/api/auth/apple/start');
    }
  },
  async handleCode(code) {
    return nativeAppleResult(code);
  }
};

const FoodDatabaseService = {
  async searchFoods(query) {
    const q = (query || '').toLowerCase().trim();
    const commonFoods = [
      { name: "Albume d'uovo", unit: "g", kcalPer100: 52, proPer100: 11, carbPer100: 0.7, fatPer100: 0.2 },
      { name: "Avena in fiocchi", unit: "g", kcalPer100: 389, proPer100: 16.9, carbPer100: 66.3, fatPer100: 6.9 },
      { name: "Petto di Pollo", unit: "g", kcalPer100: 165, proPer100: 31, carbPer100: 0, fatPer100: 3.6 },
      { name: "Riso Basmati", unit: "g", kcalPer100: 365, proPer100: 7.1, carbPer100: 80, fatPer100: 0.7 },
      { name: "Olio Extravergine di Oliva", unit: "g", kcalPer100: 884, proPer100: 0, carbPer100: 0, fatPer100: 100 },
      { name: "Salmone Fresco", unit: "g", kcalPer100: 208, proPer100: 20, carbPer100: 0, fatPer100: 13 },
      { name: "Whey Protein Isolate", unit: "g", kcalPer100: 370, proPer100: 90, carbPer100: 1, fatPer100: 1 }
    ];
    if (!q) return commonFoods;
    return commonFoods.filter(f => f.name.toLowerCase().includes(q));
  }
};

const SupplementDatabaseService = {
  async searchSupplements(query) {
    const q = (query || '').toLowerCase().trim();
    const commonSupps = [
      { name: "Creatina Monoidrato", defaultDose: "5", unit: "g", defaultTiming: "Post-workout" },
      { name: "Omega 3 (EPA/DHA)", defaultDose: "3", unit: "cps", defaultTiming: "Colazione" },
      { name: "Vitamina D3 + K2", defaultDose: "2000", unit: "UI", defaultTiming: "Colazione" },
      { name: "Magnesio Bisglicinato", defaultDose: "400", unit: "mg", defaultTiming: "Pre-nanna" },
      { name: "Zinco Picolinato", defaultDose: "25", unit: "mg", defaultTiming: "Pre-nanna" },
      { name: "Caffeina Anidra", defaultDose: "200", unit: "mg", defaultTiming: "Pre-workout" },
      { name: "EAA / BCAA", defaultDose: "10", unit: "g", defaultTiming: "Intra-workout" }
    ];
    if (!q) return commonSupps;
    return commonSupps.filter(s => s.name.toLowerCase().includes(q));
  }
};

const MedicationDatabaseService = {
  async searchMedications(query) {
    const q = (query || '').toLowerCase().trim();
    const commonMeds = [
      { name: "Metformina", defaultDose: "500", unit: "mg", route: "orale" },
      { name: "Telmisartan", defaultDose: "40", unit: "mg", route: "orale" },
      { name: "Levotiroxina", defaultDose: "50", unit: "mcg", route: "orale" },
      { name: "Cardioaspirina", defaultDose: "100", unit: "mg", route: "orale" }
    ];
    if (!q) return commonMeds;
    return commonMeds.filter(m => m.name.toLowerCase().includes(q));
  }
};

const ExerciseDatabaseService = {
  searchExercises(query) {
    const q = (query || '').toLowerCase().trim();
    const results = [];
    if (typeof DATA !== 'undefined' && DATA && DATA.exerciseDb) {
      Object.keys(DATA.exerciseDb).forEach(muscle => {
        const list = DATA.exerciseDb[muscle] || [];
        list.forEach(ex => {
          if (!q || ex.toLowerCase().includes(q) || muscle.toLowerCase().includes(q)) {
            results.push({ name: ex, muscle: muscle });
          }
        });
      });
    }
    return results;
  },
  getReplacements(exerciseName) {
    if (typeof DATA !== 'undefined' && DATA && DATA.exerciseDb) {
      for (const group in DATA.exerciseDb) {
        if (DATA.exerciseDb[group].includes(exerciseName)) {
          return DATA.exerciseDb[group].filter(ex => ex !== exerciseName);
        }
      }
    }
    return [];
  }
};

// ====================================================
// HISTORICAL FEATURE PRESERVATION & BACKWARD COMPATIBILITY
// ====================================================
function addBonusExercise() {
  return openBonusModal();
}

function getMuscleGroup(movement) {
  if (typeof MUSCLE_GROUPS !== 'undefined' && MUSCLE_GROUPS) {
    for (const group in MUSCLE_GROUPS) {
      if (Array.isArray(MUSCLE_GROUPS[group]) && MUSCLE_GROUPS[group].includes(movement)) {
        return group;
      }
    }
  }
  return "ALTRO";
}

function asDocumentBlob(file, filename, mime) {
  if (typeof Blob === 'undefined') return file;
  if (file instanceof Blob) return file.type ? file : new Blob([file], { type: mime });
  return new Blob([file], { type: mime });
}

async function buildAnalyzeForm(file, doc) {
  const filename = String((file && file.name) || (doc && doc.name) || 'document.txt');
  const mime = documentMime(filename, (file && file.type) || (doc && doc.type) || '');
  const blob = asDocumentBlob(file, filename, mime);
  if (typeof FormData !== 'undefined') {
    const form = new FormData();
    form.append('file', blob, filename);
    return form;
  }
  return { file: blob, filename, mime };
}

function legacyHandleFileUpload(e) {
  return handleFileUpload(e);
}

function legacyDeleteDoc(idx) {
  return deleteDoc(idx);
}

function programFingerprint(programData) {
  return GiammariaPersistence.calculateFingerprint(programData);
}

// Window Global Exports for 100% Backward Compatibility
if (typeof window !== 'undefined') {
  window.addBonusExercise = addBonusExercise;
  window.getMuscleGroup = getMuscleGroup;
  window.asDocumentBlob = asDocumentBlob;
  window.buildAnalyzeForm = buildAnalyzeForm;
  window.legacyHandleFileUpload = legacyHandleFileUpload;
  window.legacyDeleteDoc = legacyDeleteDoc;
  window.programFingerprint = programFingerprint;
  window.addWorkoutSet = addSetToExercise;
  window.deleteWorkoutSet = removeSetFromExercise;

  window.ProgramService = ProgramService;
  window.WorkoutService = WorkoutService;
  window.NutritionService = NutritionService;
  window.SupplementService = SupplementService;
  window.TherapyService = TherapyService;
  window.ExamService = ExamService;
  window.ImportService = ImportService;
  window.AIService = AIService;
  window.NotificationService = NotificationService;
  window.CalendarService = CalendarService;

  window.GoogleService = GoogleService;
  window.AppleService = AppleService;
  window.FoodDatabaseService = FoodDatabaseService;
  window.SupplementDatabaseService = SupplementDatabaseService;
  window.MedicationDatabaseService = MedicationDatabaseService;
  window.ExerciseDatabaseService = ExerciseDatabaseService;

  window.GS = {
    UI: {
      navigate,
      render,
      renderHome,
      renderTraining,
      renderPrograms,
      renderImport,
      renderStats,
      renderAI,
      renderDb,
      renderProgramPreview,
      renderSimpleChart,
      renderStatsData
    },
    Services: {
      Program: ProgramService,
      Workout: WorkoutService,
      Nutrition: NutritionService,
      Supplement: SupplementService,
      Therapy: TherapyService,
      Exam: ExamService,
      Import: ImportService,
      AI: AIService,
      Notification: NotificationService,
      Calendar: CalendarService
    },
    Persistence: GiammariaPersistence,
    External: {
      Config: ConfigService,
      Google: GoogleService,
      Apple: AppleService,
      FoodDb: FoodDatabaseService,
      SupplementDb: SupplementDatabaseService,
      MedicationDb: MedicationDatabaseService,
      ExerciseDb: ExerciseDatabaseService
    }
  };
}
`;

  // Insert before init()
  const initPos = html.lastIndexOf('init();');
  if (initPos !== -1) {
    html = html.slice(0, initPos) + servicesAndHistoricalBlock + '\n' + html.slice(initPos);
    console.log('✓ Injected Layered Architecture & Historical Aliases.');
  }
}

// 3. Update renderStats to ensure stats-filter, v-t, r-t
html = html.replace(
  '<select id="stats-muscle-group" onchange="renderStatsData()" style="margin-bottom:10px;">',
  '<select id="stats-muscle-group" name="stats-filter" onchange="renderStatsData()" style="margin-bottom:10px;">'
);

html = html.replace(
  '<div class="card"><div class="card-header"><h2>Progressione Volume (kg)</h2></div>',
  '<div class="card"><div class="card-header"><h2 id="v-t">Progressione Volume (kg)</h2></div>'
);

html = html.replace(
  '<div class="card"><div class="card-header"><h2>Volume Efficace (pts)</h2></div>',
  '<div class="card"><div class="card-header"><h2 id="r-t">Volume Efficace (pts)</h2></div>'
);

// Update $ selector to handle stats-filter fallback
const dollarDef = 'const $ = id => document.getElementById(id);';
const dollarUpdated = `const $ = id => {
  const el = document.getElementById(id);
  if (el) return el;
  if (id === 'stats-filter') return document.getElementById('stats-muscle-group') || document.querySelector('[name="stats-filter"]');
  return null;
};`;
if (html.includes(dollarDef)) {
  html = html.replace(dollarDef, dollarUpdated);
  console.log('✓ Updated $ selector for stats-filter backward compatibility.');
}

// Write to web/index.html and app/src/main/assets/index.html
fs.writeFileSync('web/index.html', html, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', html, 'utf8');

console.log('✓ Master Task 20 updates successfully applied to web/index.html and app/src/main/assets/index.html!');
console.log('Total characters:', html.length);
