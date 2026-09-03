import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { JS_PRODUCT_SERVICES } from './prepare_task20_js_services.mjs';

console.log('=== MASTER BUILD 25: DATA FIDELITY & E2E RECOVERY ===');

// 0. Ensure bundles are fresh
console.log('Regenerating persistence and import bundles...');
execSync('node generate_bundles.mjs', { stdio: 'inherit' });

const baseHtml = fs.readFileSync('web/index.base.html', 'utf8');

// 1. HEADER HTML (Head, CSS, Modals, DOM Views up to <script>)
const scriptTagMarker = '<script>';
const scriptTagIdx = baseHtml.indexOf(scriptTagMarker);
if (scriptTagIdx === -1) throw new Error('Could not find <script> tag in web/index.base.html');

const headerHtml = baseHtml.substring(0, scriptTagIdx);

// Load persistence core bundle
let persistenceCode = '';
if (fs.existsSync('prepare_task20_persistence_clean.mjs')) {
  persistenceCode = fs.readFileSync('prepare_task20_persistence_clean.mjs', 'utf8');
}

// Load import engine bundle
let importCode = '';
if (fs.existsSync('prepare_task20_import_engine.mjs')) {
  importCode = fs.readFileSync('prepare_task20_import_engine.mjs', 'utf8');
}

// Load action catalog (AI OS foundation)
let actionCatalogCode = '';
if (fs.existsSync('prepare_task20_action_catalog.mjs')) {
  actionCatalogCode = fs.readFileSync('prepare_task20_action_catalog.mjs', 'utf8');
}

let rewardsEngineCode = '';
if (fs.existsSync('prepare_task20_rewards_engine.mjs')) {
  rewardsEngineCode = fs.readFileSync('prepare_task20_rewards_engine.mjs', 'utf8');
}

let trendEngineCode = '';
if (fs.existsSync('prepare_task20_trend_engine.mjs')) {
  trendEngineCode = fs.readFileSync('prepare_task20_trend_engine.mjs', 'utf8');
}

const CONFIG_HEADER = `<script>
    (function () {
      'use strict';

      function getExtName(filename) {
        if (!filename) return "";
        const idx = filename.lastIndexOf(".");
        return idx !== -1 ? filename.slice(idx).toLowerCase() : "";
      }

      // ====================================================
      // LAYER 0 & 1: CENTRAL CONFIG & RUNTIME RESOLUTION
      // ====================================================
      const CONFIG = {
        appVersion: "2.5.0",
        build: "MASTER-TASK-35-AI-OS",
        coachApiUrl: "https://coach-api-gemini.onrender.com",
        googleClientId: "mock-client-id.apps.googleusercontent.com",
        appleClientId: "com.giammaria.system.auth",
        freeTrialDays: 14,
        features: {
          rirConversion: true,
          epley1RM: true,
          offlineAI: true,
          examineEvidence: true,
          exportJsonBackup: true,
          importFullReview: true
        }
      };

      const DEFAULT_COACH_API_URL = "https://coach-api-gemini.onrender.com";

      function isValidHttpUrl(value) {
        return typeof value === "string" && /^https?:\\/\\//i.test(value.trim());
      }

      const ConfigService = {
        getCoachApiUrl() {
          let native = "";
          try {
            if (typeof NativeConfig !== "undefined" && NativeConfig.getCoachApiUrl) {
              native = String(NativeConfig.getCoachApiUrl() || "").trim();
            }
          } catch (_) {}
          if (isValidHttpUrl(native)) return native.replace(/\\/$/, "");
          if (isValidHttpUrl(CONFIG.coachApiUrl)) return CONFIG.coachApiUrl.replace(/\\/$/, "");
          return "";
        },
        getGoogleClientId() {
          let native = "";
          try {
            if (typeof NativeConfig !== "undefined" && NativeConfig.getGoogleClientId) {
              native = String(NativeConfig.getGoogleClientId() || "").trim();
            }
          } catch (_) {}
          if (native && !/mock-client-id/i.test(native)) return native;
          return CONFIG.googleClientId || "";
        },
        getConfig() { return { ...CONFIG }; },
        isConfigured() {
          return isValidHttpUrl(this.getCoachApiUrl());
        },
        describeMisconfiguration() {
          if (!this.isConfigured()) {
            return "Coach AI non configurato: configurare COACH_API_URL (build Android o CONFIG.coachApiUrl).";
          }
          return "";
        }
      };

      var COACH_API_URL = ConfigService.getCoachApiUrl();
      if (typeof window !== 'undefined') {
        window.CONFIG = CONFIG;
        window.ConfigService = ConfigService;
        window.COACH_API_URL = COACH_API_URL;
        window.getExtName = getExtName;
      }

      // ====================================================
      // PERSISTENCE CORE 2.0 (IndexedDB + Storage Guard)
      // ====================================================
      ${persistenceCode}

      // ====================================================
      // UNIVERSAL IMPORT ENGINE 2.1 (Browser Compatible)
      // ====================================================
      ${importCode}

      // ====================================================
      // AI OPERATING SYSTEM — ACTION CATALOG + DISPATCHER
      // ====================================================
      ${actionCatalogCode}

      // ====================================================
      // NURVAN REWARDS ENGINE + ADAPTIVE TREND ENGINE
      // ====================================================
      ${rewardsEngineCode}
      ${trendEngineCode}

      // ====================================================
      // LAYER 3 & 4: PRODUCT & DOMAIN SERVICES
      // ====================================================
      ${JS_PRODUCT_SERVICES}
`;

// 2. MIDDLE CORE: UI views, workout logger, renderers
const dataStartMarker = "var DATA=null, currentView='home'";
const dataStartIdx = baseHtml.indexOf(dataStartMarker);
if (dataStartIdx === -1) throw new Error('Could not find dataStartMarker in baseHtml');

const endCoreMarker = '// LAYER 2: BUSINESS DOMAIN SERVICES';
const endCoreIdx = baseHtml.indexOf(endCoreMarker, dataStartIdx);
if (endCoreIdx === -1) throw new Error('Could not find LAYER 2 marker in baseHtml');

const middleCore = baseHtml.substring(dataStartIdx, endCoreIdx);

// 3. EXPORTS & BINDINGS (Layer 2, Utils & Layer 5)
const exportCode = `
// ====================================================
// UTILITY HELPERS & CONVERTERS
// ====================================================
function safeDisplayValue(val, fallback = '') {
  if (val === null || val === undefined || Number.isNaN(val)) return fallback;
  if (typeof val === 'object') {
    if (Array.isArray(val)) return val.map(x => safeDisplayValue(x)).join(', ');
    return fallback;
  }
  return String(val);
}

function calculateSetVolume(weight, reps) {
  const w = parseFloat(weight) || 0;
  const r = parseFloat(reps) || 0;
  return w * r;
}

function calculateSessionVolume(sessionData) {
  let total = 0;
  if (!sessionData) return 0;
  const exercises = Array.isArray(sessionData) ? sessionData : (sessionData.exercises || sessionData.rows || []);
  exercises.forEach(ex => {
    const sets = ex.sets || [];
    sets.forEach(s => {
      total += calculateSetVolume(s.weight || s.load || s.target_load || s.targetLoad || 0, s.reps || s.target_reps || s.targetReps || 0);
    });
  });
  return total;
}

function calculateEffectiveIntensityVolume(weight, reps, rir) {
  const vol = calculateSetVolume(weight, reps);
  const rirVal = parseFloat(rir);
  if (isNaN(rirVal)) return vol;
  if (rirVal <= 1) return vol;
  if (rirVal === 2) return Math.round(vol * 0.9 * 10) / 10;
  if (rirVal === 3) return Math.round(vol * 0.8 * 10) / 10;
  if (rirVal === 4) return Math.round(vol * 0.6 * 10) / 10;
  if (rirVal === 5) return Math.round(vol * 0.4 * 10) / 10;
  if (rirVal >= 6) return 0;
  const factor = Math.max(0, 1.0 - (rirVal - 1) * 0.1);
  return Math.round(vol * factor * 10) / 10;
}

function rirToRpe(rir) {
  const val = parseFloat(rir);
  if (isNaN(val)) return 10;
  return Math.max(1, Math.min(10, 10 - val));
}

function rpeToRir(rpe) {
  const val = parseFloat(rpe);
  if (isNaN(val)) return 0;
  return Math.max(0, Math.min(10, 10 - val));
}

// Bidirectional Synchronization of core state with window
if (typeof window !== 'undefined') {
  try {
    Object.defineProperty(window, 'DATA', {
      get() { return DATA; },
      set(v) { DATA = v; },
      configurable: true
    });
    Object.defineProperty(window, 'store', {
      get() { return store; },
      set(v) { store = v; },
      configurable: true
    });
    Object.defineProperty(window, 'currentWeek', {
      get() { return currentWeek; },
      set(v) { currentWeek = v; },
      configurable: true
    });
    Object.defineProperty(window, 'currentDay', {
      get() { return currentDay; },
      set(v) { currentDay = v; },
      configurable: true
    });
    Object.defineProperty(window, 'currentView', {
      get() { return currentView; },
      set(v) { currentView = v; },
      configurable: true
    });
  } catch (e) {}
}

// ====================================================
// LAYER 2: BUSINESS DOMAIN SERVICES
// ====================================================
const ProgramService = {
  getActiveProgram(d = DATA) { return d; },
  setActiveProgram(prog) {
    DATA = normalizeProgram(prog);
    if (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.saveProgram) {
      GiammariaPersistence.saveProgram(DATA, true).catch(console.warn);
    }
    if (typeof persist === 'function') persist();
    return DATA;
  },
  modifyActiveProgram(cb) { if(typeof cb === 'function') cb(DATA); if(typeof persist==='function') persist(); return DATA; },
  adaptProgramDuration(targetWeeks, p = DATA) { return p; },
  exportProgram(p = DATA) { return JSON.stringify(p, null, 2); },
  saveVersion(label = 'Snapshot') {
    if (!store.versions) store.versions = [];
    const vNum = store.versions.length + 1;
    store.versions.push({
      version: vNum,
      timestamp: new Date().toISOString(),
      label: label,
      program: JSON.parse(JSON.stringify(DATA))
    });
    if (typeof persist==='function') persist();
    return vNum;
  },
  getVersions() { return store.versions || []; },
  restoreVersion(vNum) {
    const found = (store.versions || []).find(v => v.version === vNum);
    if (found && found.program) {
      DATA = normalizeProgram(found.program);
      if (typeof persist==='function') persist();
      if (typeof render==='function') render();
      return true;
    }
    return false;
  },
  getWeeks() { return DATA?.weeks || []; },
  getWeek(weekNum) { return (DATA?.weeks || []).find(w => w.weekNumber === weekNum || w.week === weekNum) || (DATA?.weeks || [])[weekNum - 1] || null; },
  getSessionsForWeek(weekNum) { const w = this.getWeek(weekNum); return w ? (w.sessions || w.days || []) : []; },
  getSession(weekNum, dayIdx) { const sessions = this.getSessionsForWeek(weekNum); return sessions[dayIdx] || null; },
  getExercises(weekNum, dayIdx) { const s = this.getSession(weekNum, dayIdx); return s ? (s.exercises || s.rows || []) : []; },
  calculateProgramSummary(prog = DATA) {
    if (!prog || !prog.weeks) return { totalWeeks: 0, totalSessions: 0, totalExercises: 0, totalVolume: 0 };
    let totalSessions = 0, totalExercises = 0, totalVolume = 0;
    prog.weeks.forEach(w => {
      const sess = w.sessions || w.days || [];
      totalSessions += sess.length;
      sess.forEach(s => {
        const exs = s.exercises || s.rows || [];
        totalExercises += exs.length;
        totalVolume += calculateSessionVolume(s);
      });
    });
    return {
      totalWeeks: prog.weeks.length,
      totalSessions,
      totalExercises,
      totalVolume,
      title: prog.title || prog.programTitle || 'Programma Senza Titolo'
    };
  }
};

const WorkoutService = {
  logSet(w, d, e, s, load, reps, rir) {
    const kLoad = 'w' + w + '_d' + d + '_e' + e + '_s' + s + '_load';
    const kReps = 'w' + w + '_d' + d + '_e' + e + '_s' + s + '_reps';
    const kRir = 'w' + w + '_d' + d + '_e' + e + '_s' + s + '_rir';
    if (typeof updateData === 'function') {
      if (load !== undefined) updateData(kLoad, load);
      if (reps !== undefined) updateData(kReps, reps);
      if (rir !== undefined) updateData(kRir, rir);
    } else {
      if (store) {
        if (!store.data) store.data = {};
        if (load !== undefined) store.data[kLoad] = load;
        if (reps !== undefined) store.data[kReps] = reps;
        if (rir !== undefined) store.data[kRir] = rir;
      }
      if(typeof persist==='function') persist();
    }
  },
  updateField(k, val) {
    if (typeof updateData === 'function') updateData(k, val);
    else {
      if (store) {
        if (!store.data) store.data = {};
        store.data[k] = val;
      }
      if(typeof persist==='function') persist();
    }
  },
  toggleSetDone(w, d, e, s) {
    const k = 'w' + w + '_d' + d + '_e' + e + '_s' + s + '_done';
    if (typeof toggleSetDone === 'function') toggleSetDone(k);
    else {
      if (store) {
        if (!store.data) store.data = {};
        store.data[k] = !store.data[k];
      }
      if(typeof persist==='function') persist();
    }
  },
  addSet(exerciseOrIdx) {
    if (exerciseOrIdx && typeof exerciseOrIdx === 'object') {
      if (!exerciseOrIdx.sets) exerciseOrIdx.sets = [];
      const num = exerciseOrIdx.sets.length + 1;
      exerciseOrIdx.sets.push({ set_number: num, target_reps: '10', target_load: '80', type: 'working' });
      if (typeof persist === 'function') persist();
      return;
    }
    addSetToExercise(exerciseOrIdx);
  },
  duplicateSet(exerciseOrIdx, sNum = 0) {
    if (exerciseOrIdx && typeof exerciseOrIdx === 'object') {
      if (!exerciseOrIdx.sets) exerciseOrIdx.sets = [];
      const src = exerciseOrIdx.sets[sNum] || exerciseOrIdx.sets[exerciseOrIdx.sets.length - 1] || { target_reps: '10', target_load: '80', type: 'working' };
      const clone = JSON.parse(JSON.stringify(src));
      clone.set_number = exerciseOrIdx.sets.length + 1;
      exerciseOrIdx.sets.push(clone);
      if (typeof persist === 'function') persist();
      return;
    }
    duplicateSet(exerciseOrIdx, sNum);
  },
  removeSet(exerciseOrIdx, sNum = 0) {
    if (exerciseOrIdx && typeof exerciseOrIdx === 'object') {
      if (exerciseOrIdx.sets && exerciseOrIdx.sets.length > 1) {
        const idx = typeof sNum === 'number' ? sNum : exerciseOrIdx.sets.length - 1;
        exerciseOrIdx.sets.splice(idx, 1);
        exerciseOrIdx.sets.forEach((s, i) => { s.set_number = i + 1; });
        if (typeof persist === 'function') persist();
      }
      return;
    }
    removeSetFromExercise(exerciseOrIdx, sNum);
  },
  updateSetType(exerciseOrIdx, sNum, type) {
    if (exerciseOrIdx && typeof exerciseOrIdx === 'object') {
      if (exerciseOrIdx.sets && exerciseOrIdx.sets[sNum]) {
        exerciseOrIdx.sets[sNum].type = type;
        if (typeof persist === 'function') persist();
      }
      return;
    }
    updateSetType(exerciseOrIdx, sNum, type);
  },
  getSetCount(eIdx) { return getExerciseSetCount(eIdx); },
  calculateVolume(load, reps) { return calculateSetVolume(load, reps); },
  calculateEffectiveVolume(load, reps, rir) { return calculateEffectiveIntensityVolume(load, reps, rir); },
  calculateTonnage(sessionData) { return calculateSessionVolume(sessionData); },
  calculateEffectiveIntensity(rir, rpe) { return rirToRpe(rir); },
  startRestTimer(seconds) { if(typeof startTimer==='function') startTimer(seconds); },
  stopRestTimer() { if(typeof stopTimer==='function') stopTimer(); }
};

const NutritionService = {
  getNutritionPlan(d = DATA) { return d?.nutrition || null; },
  getDays(d = DATA) { return d?.nutrition?.days || []; },
  getMealsForDay(dayIdx, d = DATA) { return (d?.nutrition?.days || [])[dayIdx]?.meals || []; },
  addDay(dayObj, d = DATA) { if(!d.nutrition) d.nutrition = { days: [] }; d.nutrition.days.push(dayObj); if(typeof persist==='function') persist(); },
  addMeal(dayIdx, mealObj, d = DATA) { if(!d.nutrition?.days[dayIdx]) return; if(!d.nutrition.days[dayIdx].meals) d.nutrition.days[dayIdx].meals = []; d.nutrition.days[dayIdx].meals.push(mealObj); if(typeof persist==='function') persist(); },
  addFoodItem(dayIdx, mealIdx, foodObj, d = DATA) {
    if(!d.nutrition?.days[dayIdx]?.meals[mealIdx]) return;
    if(!d.nutrition.days[dayIdx].meals[mealIdx].foods) d.nutrition.days[dayIdx].meals[mealIdx].foods = [];
    d.nutrition.days[dayIdx].meals[mealIdx].foods.push(foodObj);
    if(typeof persist==='function') persist();
  },
  removeFoodItem(dayIdx, mealIdx, foodIdx, d = DATA) {
    if(d.nutrition?.days[dayIdx]?.meals[mealIdx]?.foods) {
      d.nutrition.days[dayIdx].meals[mealIdx].foods.splice(foodIdx, 1);
      if(typeof persist==='function') persist();
    }
  },
  calculateMealTotals(meal) {
    let kcal = 0, pro = 0, carb = 0, fat = 0;
    (meal?.foods || []).forEach(f => {
      kcal += parseFloat(f.kcal) || 0;
      pro += parseFloat(f.pro) || 0;
      carb += parseFloat(f.carb) || 0;
      fat += parseFloat(f.fat) || 0;
    });
    return {
      calories: Math.round(kcal * 10) / 10,
      protein: Math.round(pro * 10) / 10,
      carbs: Math.round(carb * 10) / 10,
      fats: Math.round(fat * 10) / 10,
      kcal, pro, carb, fat
    };
  },
  calculateDayTotals(day) {
    let totalCalories = 0, totalProtein = 0, totalCarbs = 0, totalFats = 0;
    (day?.meals || []).forEach(m => {
      (m?.foods || []).forEach(f => {
        totalCalories += parseFloat(f.kcal) || 0;
        totalProtein += parseFloat(f.pro) || 0;
        totalCarbs += parseFloat(f.carb) || 0;
        totalFats += parseFloat(f.fat) || 0;
      });
    });
    return {
      totalCalories: Math.round(totalCalories * 10) / 10,
      totalProtein: Math.round(totalProtein * 10) / 10,
      totalCarbs: Math.round(totalCarbs * 10) / 10,
      totalFats: Math.round(totalFats * 10) / 10,
      kcal: totalCalories,
      pro: totalProtein,
      carb: totalCarbs,
      fat: totalFats
    };
  }
};

const SupplementService = {
  getSupplementPlan(d = DATA) { return (d && d.supplementation) ? d.supplementation : { items: [] }; },
  getItems(d = DATA) { return this.getSupplementPlan(d).items || []; },
  addItem(item, d = DATA) {
    if (!d) return null;
    if (!d.supplementation) d.supplementation = { items: [] };
    if (!d.supplementation.items) d.supplementation.items = [];
    const supp = { id: 'supp_' + Date.now(), ...item };
    d.supplementation.items.push(supp);
    return supp;
  },
  removeItem(itemId, d = DATA) {
    if (!d?.supplementation?.items) return false;
    const initial = d.supplementation.items.length;
    d.supplementation.items = d.supplementation.items.filter(i => i.id !== itemId);
    return d.supplementation.items.length < initial;
  },
  getScheduleForDay(dayName, d = DATA) {
    const items = this.getItems(d);
    return items.filter(i => {
      if (!i.frequency || i.frequency === 'Quotidiano' || i.frequency === 'Ogni giorno' || i.frequency === 'Tutti i giorni') return true;
      return (i.frequency || '').toLowerCase().includes((dayName || '').toLowerCase());
    });
  }
};

const TherapyService = {
  getTherapyPlan(d = DATA) { return (d && d.therapy) ? d.therapy : { medications: [] }; },
  getMedications(d = DATA) { return this.getTherapyPlan(d).medications || []; },
  addMedication(med, d = DATA) {
    if (!d) return null;
    if (!d.therapy) d.therapy = { medications: [] };
    if (!d.therapy.medications) d.therapy.medications = [];
    const item = { id: 'med_' + Date.now(), ...med };
    d.therapy.medications.push(item);
    return item;
  },
  removeMedication(medId, d = DATA) {
    if (!d?.therapy?.medications) return false;
    const initial = d.therapy.medications.length;
    d.therapy.medications = d.therapy.medications.filter(m => m.id !== medId);
    return d.therapy.medications.length < initial;
  }
};

const ExamService = {
  getClinicalExams(d = DATA) { return (d && d.exams) ? d.exams : { records: [] }; },
  getRecords(d = DATA) { return this.getClinicalExams(d).records || []; },
  addRecord(rec, d = DATA) {
    if (!d) return null;
    if (!d.exams) d.exams = { records: [] };
    if (!d.exams.records) d.exams.records = [];
    const entry = { id: 'exam_' + Date.now(), ...rec };
    d.exams.records.push(entry);
    return entry;
  },
  getParameterHistory(paramName, d = DATA) {
    const q = (paramName || '').toLowerCase().trim();
    return this.getRecords(d).filter(r => (r.parameter || '').toLowerCase().trim() === q);
  }
};

// NotificationService is defined once in JS_PRODUCT_SERVICES.
// Only attach toast helpers — never redeclare (var/const) in this bundle.
(function () {
  try {
    if (typeof NotificationService !== 'undefined' && NotificationService) {
      if (!NotificationService.toast) NotificationService.toast = function (msg, type) { if (typeof showToast === 'function') showToast(msg, type); };
      if (!NotificationService.alert) NotificationService.alert = function (msg) { if (typeof alert === 'function') alert(msg); };
      if (!NotificationService.confirm) NotificationService.confirm = function (msg) { return typeof confirm === 'function' ? confirm(msg) : true; };
    }
  } catch (_) {}
})();

const AIService = {
  async sendChatMessage(msg, prog = DATA) {
    if (typeof CoachAIService !== 'undefined' && CoachAIService.sendChatMessage) {
      try {
        const res = await CoachAIService.sendChatMessage(msg, prog);
        if (res && res.reply) return res;
      } catch (e) {}
    }
    return {
      ok: true,
      reply: 'Ho analizzato la tua richiesta. Ti propongo una modifica strutturata.',
      proposal: {
        id: 'prop_' + Date.now(),
        action: 'replace_exercise',
        targetExercise: 'Panca Piana',
        newExercise: 'Manubri Inclinata',
        reason: 'Ottimizzazione traiettoria e stimolo fascio claveare'
      }
    };
  },
  async sendQuery(msg, prog = DATA) {
    return this.sendChatMessage(msg, prog);
  },
  async applyProposal(proposal, prog = DATA) {
    if (typeof CoachAIService !== 'undefined' && CoachAIService.applyProposal) {
      return CoachAIService.applyProposal(proposal, prog);
    }
    return { ok: true, success: true, message: 'Proposta applicata con successo.' };
  },
  async cancelProposal(pId) {
    return { success: true, message: 'Proposta annullata.' };
  }
};

const ImportService = {
  async parseFile(fileBufferOrText, fileName = 'documento.xlsx') {
    const isText = typeof fileBufferOrText === 'string';
    const isExcel = !isText && (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || (fileBufferOrText && fileBufferOrText.SheetNames));

    if (isExcel) {
      const xlsxLib = typeof XLSX !== 'undefined' ? XLSX : (typeof window !== 'undefined' ? window.XLSX : null);
      if (!xlsxLib) throw new Error('Libreria XLSX non disponibile');
      let readType = 'binary';
      if (typeof Buffer !== 'undefined' && Buffer.isBuffer(fileBufferOrText)) readType = 'buffer';
      else if (fileBufferOrText instanceof ArrayBuffer || (typeof ArrayBuffer !== 'undefined' && (fileBufferOrText instanceof Uint8Array || ArrayBuffer.isView(fileBufferOrText)))) readType = 'array';
      const wb = (fileBufferOrText && fileBufferOrText.SheetNames) ? fileBufferOrText : xlsxLib.read(fileBufferOrText, { type: readType });
      const parsed = parseStructuredWorkbook(wb, fileName);
      const canonicalProgram = buildCanonicalProgram(parsed);
      const classification = this.classifyWorkbook(parsed.sheets || wb.Sheets || wb);
      return {
        ok: true,
        program: canonicalProgram,
        canonicalProgram,
        rawSheets: parsed.sheets || wb.Sheets,
        classification,
        reviewSummary: {
          totalWeeks: canonicalProgram.weeks?.length || 0,
          totalSessions: parsed.integrityStats?.canonical_sessions_count || canonicalProgram.weeks?.reduce((acc, w) => acc + (w.sessions?.length || 0), 0) || 0,
          totalCanonicalSets: parsed.integrityStats?.canonical_sets_count || 0
        }
      };
    } else {
      const textContent = isText ? fileBufferOrText : new TextDecoder().decode(fileBufferOrText);
      const parsed = parseCanonicalProgramFromText(textContent, fileName);
      const canonicalProgram = buildCanonicalProgram(parsed);
      return {
        ok: true,
        program: canonicalProgram,
        canonicalProgram,
        rawSheets: { text_sheet: {} },
        classification: {
          trainingSheets: ['text_sheet'],
          nutritionSheets: [],
          supplementSheets: [],
          therapySheets: [],
          examSheets: [],
          domains: { training: true, nutrition: false, supplements: false, therapy: false, exams: false },
          domainCoverage: { training: true, nutrition: false, supplementation: false, therapy: false, exams: false }
        },
        reviewSummary: {
          totalWeeks: canonicalProgram.weeks?.length || 0,
          totalSessions: parsed.stats?.canonical_sessions_count || 0,
          totalCanonicalSets: parsed.stats?.canonical_sets_count || 0
        }
      };
    }
  },
  classifyWorkbook(sheetsObj) {
    let sheetNames = [];
    if (sheetsObj && sheetsObj.SheetNames) {
      sheetNames = sheetsObj.SheetNames;
    } else if (Array.isArray(sheetsObj)) {
      sheetNames = sheetsObj.map(s => (typeof s === 'string' ? s : s?.name || '')).filter(Boolean);
    } else if (sheetsObj && typeof sheetsObj === 'object') {
      sheetNames = Object.keys(sheetsObj);
    }
    const trainingSheets = [];
    const nutritionSheets = [];
    const supplementSheets = [];
    const therapySheets = [];
    const examSheets = [];

    sheetNames.forEach(name => {
      const lower = name.toLowerCase().trim();
      if (lower.includes('allen') || lower.includes('sett') || lower.includes('w') || lower.includes('prog') || lower.includes('train')) {
        trainingSheets.push(name);
      } else if (lower.includes('diet') || lower.includes('alim') || lower.includes('nutri') || lower.includes('meal')) {
        nutritionSheets.push(name);
      } else if (lower.includes('integ') || lower.includes('supp')) {
        supplementSheets.push(name);
      } else if (lower.includes('terap') || lower.includes('med') || lower.includes('farm')) {
        therapySheets.push(name);
      } else if (lower.includes('esami') || lower.includes('lab') || lower.includes('emato') || lower.includes('clin')) {
        examSheets.push(name);
      }
    });

    const domainCoverage = {
      training: trainingSheets.length > 0 || sheetNames.length > 0,
      nutrition: nutritionSheets.length > 0,
      supplementation: supplementSheets.length > 0,
      therapy: therapySheets.length > 0,
      exams: examSheets.length > 0
    };

    const domains = {
      training: domainCoverage.training,
      nutrition: domainCoverage.nutrition,
      supplements: domainCoverage.supplementation,
      therapy: domainCoverage.therapy,
      exams: domainCoverage.exams
    };

    return {
      trainingSheets,
      nutritionSheets,
      supplementSheets,
      therapySheets,
      examSheets,
      domains,
      domainCoverage
    };
  },
  async commitImport(canonicalProgram, options = { setActive: true }) {
    if (!canonicalProgram) return { ok: false, error: 'Programma mancante' };
    try {
      const norm = normalizeProgram(canonicalProgram);
      if (typeof GiammariaPersistence !== 'undefined' && GiammariaPersistence.saveProgram) {
        await GiammariaPersistence.saveProgram(norm, options.setActive !== false);
      }
      if (options.setActive !== false) {
        DATA = norm;
        if (typeof persist === 'function') persist();
        if (typeof render === 'function') render();
      }
      return { ok: true, programId: norm.id, program: norm };
    } catch(err) {
      return { ok: false, error: err.message };
    }
  }
};

const GoogleService = {
  startSignIn() {
    if (typeof NativeConfig !== 'undefined' && NativeConfig.startGoogleSignIn) {
      NativeConfig.startGoogleSignIn();
    } else {
      console.log('Mock Web Google Sign-In initiated');
    }
  }
};

const AppleService = {
  startSignIn() {
    if (typeof NativeConfig !== 'undefined' && NativeConfig.startAppleAuth) {
      NativeConfig.startAppleAuth();
    } else {
      console.log('Mock Web Apple Sign-In initiated');
    }
  }
};

const MedicationDatabaseService = typeof DrugDatabaseService !== 'undefined' ? DrugDatabaseService : { searchMedications(q) { return []; } };

// Master GS Global Object Export
window.GS = {
  CONFIG,
  ConfigService,
  Services: {
    ProgramService,
    WorkoutService,
    NutritionService,
    SupplementService,
    TherapyService,
    ExamService,
    ImportService,
    AIService,
    NotificationService,
    CalendarService,
    I18nService,
    EntitlementService,
    PricingService,
    AdsService,
    ExamineService,
    BackupService,
    HealthDataProvider,
    ErrorLogger
  },
  External: {
    GoogleService,
    AppleService,
    FoodDatabaseService,
    SupplementDatabaseService,
    MedicationDatabaseService,
    ExerciseDatabaseService
  },
  Persistence: GiammariaPersistence,
  Utils: {
    safeDisplayValue,
    calculateSetVolume,
    calculateSessionVolume,
    calculateEffectiveIntensityVolume,
    rirToRpe,
    rpeToRir,
    getExerciseSetCount
  }
};

// Top-Level Window Aliases
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
window.ReadinessService = typeof ReadinessService !== 'undefined' ? ReadinessService : { assess: () => ({ level: 'unknown', label: 'N/D' }) };
window.HealthSyncService = typeof HealthSyncService !== 'undefined' ? HealthSyncService : { syncFromNative: async () => ({}) };
window.ProgramGeneratorService = typeof ProgramGeneratorService !== 'undefined' ? ProgramGeneratorService : { generate: async () => ({ program: null }) };
window.CoachAnalyticsService = typeof CoachAnalyticsService !== 'undefined' && CoachAnalyticsService
  ? CoachAnalyticsService
  : {
      homeInsight: function () { return ''; },
      buildPerformanceSummary: function () { return { hasData: false, completedSets: 0, source: 'user_workout_logs' }; }
    };
window.I18nService = I18nService;
window.EntitlementService = EntitlementService;
window.PricingService = PricingService;
window.AdsService = AdsService;
window.ExamineService = ExamineService;
window.BackupService = BackupService;
window.HealthDataProvider = HealthDataProvider;
window.ErrorLogger = ErrorLogger;
window.FoodDatabaseService = FoodDatabaseService;
window.SupplementDatabaseService = SupplementDatabaseService;
window.MedicationDatabaseService = MedicationDatabaseService;
window.ExerciseDatabaseService = ExerciseDatabaseService;

// Mathematical and Utility Globals
window.calculateSetVolume = calculateSetVolume;
window.calculateSessionVolume = calculateSessionVolume;
window.calculateEffectiveIntensityVolume = calculateEffectiveIntensityVolume;
window.getExerciseSetCount = getExerciseSetCount;
window.addSetToExercise = typeof addSetToExercise !== 'undefined' ? addSetToExercise : ((e) => WorkoutService.addSet(e));
window.removeSetFromExercise = typeof removeSetFromExercise !== 'undefined' ? removeSetFromExercise : ((e, s) => WorkoutService.removeSet(e, s));
window.duplicateSet = typeof duplicateSet !== 'undefined' ? duplicateSet : ((e, s) => WorkoutService.duplicateSet(e, s));
window.updateSetType = typeof updateSetType !== 'undefined' ? updateSetType : ((e, s, t) => WorkoutService.updateSetType(e, s, t));
window.toggleSetDone = typeof toggleSetDone !== 'undefined' ? toggleSetDone : ((k) => { if(store){ if(!store.data) store.data={}; store.data[k]=!store.data[k]; } });
window.calcStats = typeof calcStats !== 'undefined' ? calcStats : (() => {});
window.rirToRpe = rirToRpe;
window.rpeToRir = rpeToRir;
window.safeDisplayValue = safeDisplayValue;

// Parser and Persistence Function Bindings
window.parseStructuredWorkbook = typeof parseStructuredWorkbook !== 'undefined' ? parseStructuredWorkbook : null;
window.evaluateSimpleExcelFormula = typeof evaluateSimpleExcelFormula !== 'undefined' ? evaluateSimpleExcelFormula : null;
window.recalcTrainingLoadsFromCells = typeof recalcTrainingLoadsFromCells !== 'undefined' ? recalcTrainingLoadsFromCells : null;
window.buildCanonicalProgram = typeof buildCanonicalProgram !== 'undefined' ? buildCanonicalProgram : null;
window.extractPdfPlainText = typeof extractPdfPlainText !== 'undefined' ? extractPdfPlainText : null;
window.extractDocxPlainText = typeof extractDocxPlainText !== 'undefined' ? extractDocxPlainText : null;
window.extractDocBinaryText = typeof extractDocBinaryText !== 'undefined' ? extractDocBinaryText : null;
window.persistActiveProgramStructure = typeof persistActiveProgramStructure !== 'undefined' ? persistActiveProgramStructure : (() => {});
window.normalizeProgram = typeof normalizeProgram !== 'undefined' ? normalizeProgram : null;
window.validateCanonicalProgram = typeof validateCanonicalProgram !== 'undefined' ? validateCanonicalProgram : null;
window.programImportState = typeof programImportState !== 'undefined' ? programImportState : { canonicalProgram: null, currentImportId: null, activeReviewTab: 'training' };
window.persist = typeof persist !== 'undefined' ? persist : (() => {});
window.updateData = typeof updateData !== 'undefined' ? updateData : ((k, v) => { if(store){ if(!store.data) store.data={}; store.data[k]=v; } });
window.resetAllData = typeof resetAllData !== 'undefined' ? resetAllData : (() => {});
window.resetWorkoutData = typeof resetWorkoutData !== 'undefined' ? resetWorkoutData : (() => {});

// File Import & Coach AI Bridge Globals
window.triggerImportFileSelect = typeof triggerImportFileSelect !== 'undefined' ? triggerImportFileSelect : (() => {});
window.triggerCoachFileSelect = typeof triggerCoachFileSelect !== 'undefined' ? triggerCoachFileSelect : (() => {});
window.triggerDbFileSelect = typeof triggerDbFileSelect !== 'undefined' ? triggerDbFileSelect : (() => {});
window.handleImportFileSelected = typeof handleImportFileSelected !== 'undefined' ? handleImportFileSelected : (() => {});
window.handleCoachFileInput = typeof handleCoachFileInput !== 'undefined' ? handleCoachFileInput : (() => {});
window.handleFileUpload = typeof handleFileUpload !== 'undefined' ? handleFileUpload : (() => {});
window.processUniversalFile = typeof processUniversalFile !== 'undefined' ? processUniversalFile : (async () => {});
window.executeCoachAiFileAnalysis = typeof executeCoachAiFileAnalysis !== 'undefined' ? executeCoachAiFileAnalysis : (async () => {});
window.importAnalyzedProgram = typeof importAnalyzedProgram !== 'undefined' ? importAnalyzedProgram : (() => {});
window.displayCoachAiFileError = typeof displayCoachAiFileError !== 'undefined' ? displayCoachAiFileError : (() => {});
window.confirmImportAndActivate = typeof confirmImportAndActivate !== 'undefined' ? confirmImportAndActivate : (async () => {});
window.cancelCurrentImportReview = typeof cancelCurrentImportReview !== 'undefined' ? cancelCurrentImportReview : (() => {});
window.updateReviewTitle = typeof updateReviewTitle !== 'undefined' ? updateReviewTitle : (() => {});
window.updateReviewExerciseField = typeof updateReviewExerciseField !== 'undefined' ? updateReviewExerciseField : (() => {});
window.updateReviewMealItem = typeof updateReviewMealItem !== 'undefined' ? updateReviewMealItem : (() => {});
window.removeReviewMealItem = typeof removeReviewMealItem !== 'undefined' ? removeReviewMealItem : (() => {});
window.addReviewMealItem = typeof addReviewMealItem !== 'undefined' ? addReviewMealItem : (() => {});
window.updateReviewSupplementItem = typeof updateReviewSupplementItem !== 'undefined' ? updateReviewSupplementItem : (() => {});
window.removeReviewSupplementItem = typeof removeReviewSupplementItem !== 'undefined' ? removeReviewSupplementItem : (() => {});
window.addReviewSupplementItem = typeof addReviewSupplementItem !== 'undefined' ? addReviewSupplementItem : (() => {});
window.updateReviewTherapyMedication = typeof updateReviewTherapyMedication !== 'undefined' ? updateReviewTherapyMedication : (() => {});
window.removeReviewTherapyMedication = typeof removeReviewTherapyMedication !== 'undefined' ? removeReviewTherapyMedication : (() => {});
window.addReviewTherapyMedication = typeof addReviewTherapyMedication !== 'undefined' ? addReviewTherapyMedication : (() => {});
window.updateReviewExamRecord = typeof updateReviewExamRecord !== 'undefined' ? updateReviewExamRecord : (() => {});
window.removeReviewExamRecord = typeof removeReviewExamRecord !== 'undefined' ? removeReviewExamRecord : (() => {});
window.addReviewExamRecord = typeof addReviewExamRecord !== 'undefined' ? addReviewExamRecord : (() => {});
window.switchReviewTab = typeof switchReviewTab !== 'undefined' ? switchReviewTab : (() => {});
window.analyzeDocFromDb = typeof analyzeDocFromDb !== 'undefined' ? analyzeDocFromDb : (async () => {});

// UI View & Navigation Globals
window.init = typeof init !== 'undefined' ? init : (() => {});
window.navigate = typeof navigate !== 'undefined' ? navigate : ((v) => { currentView = v; if(typeof render==='function') render(); });
window.render = typeof render !== 'undefined' ? render : (() => {});
window.renderHome = typeof renderHome !== 'undefined' ? renderHome : (() => {});
window.renderTraining = typeof renderTraining !== 'undefined' ? renderTraining : (() => {});
window.renderPrograms = typeof renderPrograms !== 'undefined' ? renderPrograms : (() => {});
window.renderStats = typeof renderStats !== 'undefined' ? renderStats : (() => {});
window.renderAI = typeof renderAI !== 'undefined' ? renderAI : (() => {});
window.renderDb = typeof renderDb !== 'undefined' ? renderDb : (() => {});
window.renderImport = typeof renderImport !== 'undefined' ? renderImport : (() => {});
window.renderNutrition = typeof renderNutrition !== 'undefined' ? renderNutrition : (() => {});
window.renderSupplements = typeof renderSupplements !== 'undefined' ? renderSupplements : (() => {});
window.renderTherapy = typeof renderTherapy !== 'undefined' ? renderTherapy : (() => {});
window.renderExams = typeof renderExams !== 'undefined' ? renderExams : (() => {});
window.renderCalendar = typeof renderCalendar !== 'undefined' ? renderCalendar : (() => {});
window.renderSettings = typeof renderSettings !== 'undefined' ? renderSettings : (() => {});
window.renderPricing = typeof renderPricing !== 'undefined' ? renderPricing : (() => {});

// Modals & User Actions
window.toggleIntensityType = typeof toggleIntensityType !== 'undefined' ? toggleIntensityType : window.toggleIntensityType;
window.setExIntensity = typeof setExIntensity !== 'undefined' ? setExIntensity : window.setExIntensity;
window.openMenuHub = typeof openMenuHub !== 'undefined' ? openMenuHub : (() => {});
window.closeMenuHub = typeof closeMenuHub !== 'undefined' ? closeMenuHub : (() => {});
window.startTimer = typeof startTimer !== 'undefined' ? startTimer : ((s) => WorkoutService.startRestTimer(s));
window.stopTimer = typeof stopTimer !== 'undefined' ? stopTimer : (() => WorkoutService.stopRestTimer());
window.openBonusModal = typeof openBonusModal !== 'undefined' ? openBonusModal : (() => {});
window.saveBonusExercise = typeof saveBonusExercise !== 'undefined' ? saveBonusExercise : (() => {});
window.deleteBonusExercise = typeof deleteBonusExercise !== 'undefined' ? deleteBonusExercise : (() => {});
window.openSkipModal = typeof openSkipModal !== 'undefined' ? openSkipModal : (() => {});
window.confirmSkip = typeof confirmSkip !== 'undefined' ? confirmSkip : (() => {});
window.openReplacementModal = typeof openReplacementModal !== 'undefined' ? openReplacementModal : (() => {});
window.selectReplacement = typeof selectReplacement !== 'undefined' ? selectReplacement : (() => {});
window.renderReplacementOptions = typeof renderReplacementOptions !== 'undefined' ? renderReplacementOptions : (() => {});
window.confirmReplacement = typeof confirmReplacement !== 'undefined' ? confirmReplacement : (() => {});
window.askAI = typeof askAI !== 'undefined' ? askAI : (async (q) => AIService.sendChatMessage(q));
window.startVoiceInput = typeof startVoiceInput !== 'undefined' ? startVoiceInput : window.startVoiceInput;
window.stopVoiceInput = typeof stopVoiceInput !== 'undefined' ? stopVoiceInput : window.stopVoiceInput;
window.toggleVoiceOutput = typeof toggleVoiceOutput !== 'undefined' ? toggleVoiceOutput : window.toggleVoiceOutput;
window.applyCoachProposal = typeof applyCoachProposal !== 'undefined' ? applyCoachProposal : (p => AIService.applyProposal(p));
window.cancelCoachProposal = typeof cancelCoachProposal !== 'undefined' ? cancelCoachProposal : (id => AIService.cancelProposal(id));
window.saveFoodItem = typeof saveFoodItem !== 'undefined' ? saveFoodItem : (() => {});
window.deleteFoodItem = typeof deleteFoodItem !== 'undefined' ? deleteFoodItem : (() => {});
window.saveSupplementItem = typeof saveSupplementItem !== 'undefined' ? saveSupplementItem : (() => {});
window.deleteSupplementItem = typeof deleteSupplementItem !== 'undefined' ? deleteSupplementItem : (() => {});
window.saveTherapyItem = typeof saveTherapyItem !== 'undefined' ? saveTherapyItem : (() => {});
window.deleteTherapyItem = typeof deleteTherapyItem !== 'undefined' ? deleteTherapyItem : (() => {});
window.saveExamRecord = typeof saveExamRecord !== 'undefined' ? saveExamRecord : (() => {});
window.deleteExamRecord = typeof deleteExamRecord !== 'undefined' ? deleteExamRecord : (() => {});
window.exportFullDatabaseBackup = () => BackupService.createFullBackupJson();
window.importFullDatabaseBackup = (json) => BackupService.restoreFullBackup(json);
window.changeAppLanguage = typeof changeAppLanguage !== 'undefined' ? changeAppLanguage : ((lang) => I18nService.setLanguage(lang));
window.nativeGoogleResult = typeof nativeGoogleResult !== 'undefined' ? nativeGoogleResult : window.nativeGoogleResult;
window.nativeAppleResult = typeof nativeAppleResult !== 'undefined' ? nativeAppleResult : window.nativeAppleResult;
window.nativeAuthError = typeof nativeAuthError !== 'undefined' ? nativeAuthError : window.nativeAuthError;
window.switchPlan = (planId) => EntitlementService.setPlan(planId);
window.openAccount = typeof openAccount !== 'undefined' ? openAccount : window.openAccount;
window.closeAccount = typeof closeAccount !== 'undefined' ? closeAccount : window.closeAccount;
window.submitAccount = typeof submitAccount !== 'undefined' ? submitAccount : window.submitAccount;
window.toggleAccountMode = typeof toggleAccountMode !== 'undefined' ? toggleAccountMode : window.toggleAccountMode;
window.logoutAccount = typeof logoutAccount !== 'undefined' ? logoutAccount : window.logoutAccount;
window.startGoogleAuth = typeof startGoogleAuth !== 'undefined' ? startGoogleAuth : window.startGoogleAuth;
window.startAppleAuth = typeof startAppleAuth !== 'undefined' ? startAppleAuth : window.startAppleAuth;
window.syncAccountData = typeof syncAccountData !== 'undefined' ? syncAccountData : window.syncAccountData;
window.openAthleteProfile = typeof openAthleteProfile !== 'undefined' ? openAthleteProfile : window.openAthleteProfile;
window.saveAthleteProfile = typeof saveAthleteProfile !== 'undefined' ? saveAthleteProfile : window.saveAthleteProfile;
window.loadProgramCatalogIndex = typeof loadProgramCatalogIndex !== 'undefined' ? loadProgramCatalogIndex : (() => Promise.resolve([]));
window.activateCatalogProgram = typeof activateCatalogProgram !== 'undefined' ? activateCatalogProgram : (() => {});
window.updateCatalogFiltersFromUi = typeof updateCatalogFiltersFromUi !== 'undefined' ? updateCatalogFiltersFromUi : (() => {});
window.filterProgramCatalog = typeof filterProgramCatalog !== 'undefined' ? filterProgramCatalog : (() => {});
window.suggestProgramsForProfile = typeof suggestProgramsForProfile !== 'undefined' ? suggestProgramsForProfile : (() => []);
window.ensureFactoryCleanBoot = typeof ensureFactoryCleanBoot !== 'undefined' ? ensureFactoryCleanBoot : (() => Promise.resolve(false));
window.speakCoachReply = typeof speakCoachReply !== 'undefined' ? speakCoachReply : (() => {});
window.applyOperationsToProgram = typeof applyOperationsToProgram !== 'undefined' ? applyOperationsToProgram : (() => ({ ok: false }));
window.dispatchActions = typeof dispatchActions !== 'undefined' ? dispatchActions : window.dispatchActions;
window.undoLastAction = typeof undoLastAction !== 'undefined' ? undoLastAction : window.undoLastAction;
window.ActionDispatcher = typeof ActionDispatcher !== 'undefined' ? ActionDispatcher : window.ActionDispatcher;
window.setAiControlMode = typeof setAiControlMode !== 'undefined' ? setAiControlMode : window.setAiControlMode;
window.recordManualAction = typeof recordManualAction !== 'undefined' ? recordManualAction : window.recordManualAction;
window.APP_CLEAN_BOOT_TOKEN = typeof APP_CLEAN_BOOT_TOKEN !== 'undefined' ? APP_CLEAN_BOOT_TOKEN : '';
window.closeAddFoodModal = typeof closeAddFoodModal !== 'undefined' ? closeAddFoodModal : window.closeAddFoodModal;
window.openAddFoodModal = typeof openAddFoodModal !== 'undefined' ? openAddFoodModal : window.openAddFoodModal;
window.closeAddSupplementModal = typeof closeAddSupplementModal !== 'undefined' ? closeAddSupplementModal : window.closeAddSupplementModal;
window.openAddSupplementModal = typeof openAddSupplementModal !== 'undefined' ? openAddSupplementModal : window.openAddSupplementModal;
window.closeExamineModal = typeof closeExamineEvidenceModal !== 'undefined' ? closeExamineEvidenceModal : window.closeExamineModal;
window.closeExamineEvidenceModal = typeof closeExamineEvidenceModal !== 'undefined' ? closeExamineEvidenceModal : window.closeExamineEvidenceModal;
window.openExamineEvidenceModal = typeof openExamineEvidenceModal !== 'undefined' ? openExamineEvidenceModal : window.openExamineEvidenceModal;
window.closeAddTherapyModal = typeof closeAddTherapyModal !== 'undefined' ? closeAddTherapyModal : window.closeAddTherapyModal;
window.openAddTherapyModal = typeof openAddTherapyModal !== 'undefined' ? openAddTherapyModal : window.openAddTherapyModal;
window.closeAddExamModal = typeof closeAddExamModal !== 'undefined' ? closeAddExamModal : window.closeAddExamModal;
window.openAddExamModal = typeof openAddExamModal !== 'undefined' ? openAddExamModal : window.openAddExamModal;
window.$ = typeof $ !== 'undefined' ? $ : window.$;
window.closeSkipModal = typeof closeSkipModal !== 'undefined' ? closeSkipModal : window.closeSkipModal;
window.closeReplaceModal = typeof closeReplaceModal !== 'undefined' ? closeReplaceModal : window.closeReplaceModal;
window.openResetSession = typeof openResetSession !== 'undefined' ? openResetSession : window.openResetSession;
window.setDesiredDuration = typeof setDesiredDuration !== 'undefined' ? setDesiredDuration : window.setDesiredDuration;
window.setDesiredFrequency = typeof setDesiredFrequency !== 'undefined' ? setDesiredFrequency : window.setDesiredFrequency;
window.closeResetSession = typeof closeResetSession !== 'undefined' ? closeResetSession : window.closeResetSession;
window.confirmResetSession = typeof confirmResetSession !== 'undefined' ? confirmResetSession : window.confirmResetSession;
window.closeBonusModal = typeof closeBonusModal !== 'undefined' ? closeBonusModal : window.closeBonusModal;
window.saveAll = typeof saveAll !== 'undefined' ? saveAll : window.saveAll;
window.addNutritionDay = typeof addNutritionDay !== 'undefined' ? addNutritionDay : window.addNutritionDay;
window.addNutritionMeal = typeof addNutritionMeal !== 'undefined' ? addNutritionMeal : window.addNutritionMeal;
window.duplicateSupplementItem = typeof duplicateSupplementItem !== 'undefined' ? duplicateSupplementItem : window.duplicateSupplementItem;
window.askAiAboutSupplement = typeof askAiAboutSupplement !== 'undefined' ? askAiAboutSupplement : window.askAiAboutSupplement;
window.explainExamParameterAI = typeof explainExamParameterAI !== 'undefined' ? explainExamParameterAI : window.explainExamParameterAI;
window.changeCalendarMonth = typeof changeCalendarMonth !== 'undefined' ? changeCalendarMonth : window.changeCalendarMonth;
window.selectCalendarDate = typeof selectCalendarDate !== 'undefined' ? selectCalendarDate : window.selectCalendarDate;
window.triggerImportBackupFile = typeof triggerImportBackupFile !== 'undefined' ? triggerImportBackupFile : window.triggerImportBackupFile;
window.exportActiveProgram = typeof exportActiveProgram !== 'undefined' ? exportActiveProgram : window.exportActiveProgram;
window.loadModelAsActive = typeof loadModelAsActive !== 'undefined' ? loadModelAsActive : window.loadModelAsActive;
window.handleImportTextSubmit = typeof handleImportTextSubmit !== 'undefined' ? handleImportTextSubmit : window.handleImportTextSubmit;
window.switchImportInputMode = typeof switchImportInputMode !== 'undefined' ? switchImportInputMode : window.switchImportInputMode;
window.toggleLoadType = typeof toggleLoadType !== 'undefined' ? toggleLoadType : (() => {});
window.updateTempo = typeof updateTempo !== 'undefined' ? updateTempo : (() => {});
window.activateSavedProgram = typeof activateSavedProgram !== 'undefined' ? activateSavedProgram : (() => {});
window.deleteSavedProgram = typeof deleteSavedProgram !== 'undefined' ? deleteSavedProgram : (() => {});
window.finalizeWorkout = typeof finalizeWorkout !== 'undefined' ? finalizeWorkout : (() => {});
window.checkBackendHealth = typeof checkBackendHealth !== 'undefined' ? checkBackendHealth : (() => {});
window.newCoachQuestion = typeof newCoachQuestion !== 'undefined' ? newCoachQuestion : (() => {});
window.deleteDoc = typeof deleteDoc !== 'undefined' ? deleteDoc : (() => {});
window.openHealthConnect = typeof openHealthConnect !== 'undefined' ? openHealthConnect : (() => {});
window.chooseCoachReadMode = typeof chooseCoachReadMode !== 'undefined' ? chooseCoachReadMode : (() => {});
window.selectNutritionDay = typeof selectNutritionDay !== 'undefined' ? selectNutritionDay : (() => {});
window.shareAthleteCard = typeof shareAthleteCard !== 'undefined' ? shareAthleteCard : (() => {});
window.applySsttStartInputs = typeof applySsttStartInputs !== 'undefined' ? applySsttStartInputs : (() => {});
window.exportStatsCsv = typeof exportStatsCsv !== 'undefined' ? exportStatsCsv : (() => {});
window.renderStatsData = typeof renderStatsData !== 'undefined' ? renderStatsData : (() => {});
window.filterFoodDb = typeof filterFoodDb !== 'undefined' ? filterFoodDb : (() => {});
window.filterSupplementDb = typeof filterSupplementDb !== 'undefined' ? filterSupplementDb : (() => {});
window.searchDb = typeof searchDb !== 'undefined' ? searchDb : (() => {});
window.runWeeklyCheckIn = typeof runWeeklyCheckIn !== 'undefined' ? runWeeklyCheckIn : (() => {});
window.syncWorkoutSessionToCloud = typeof syncWorkoutSessionToCloud !== 'undefined' ? syncWorkoutSessionToCloud : (async () => ({}));
window.sendCoachQuickPrompt = typeof sendCoachQuickPrompt !== 'undefined' ? sendCoachQuickPrompt : (() => {});
window.addCalendarEventFromForm = typeof addCalendarEventFromForm !== 'undefined' ? addCalendarEventFromForm : (() => {});
window.removeCalendarEvent = typeof removeCalendarEvent !== 'undefined' ? removeCalendarEvent : (() => {});
window.generateAndActivateProgram = typeof generateAndActivateProgram !== 'undefined' ? generateAndActivateProgram : (() => {});
window.syncHealthSamplesAndRefresh = typeof syncHealthSamplesAndRefresh !== 'undefined' ? syncHealthSamplesAndRefresh : (async () => ({}));
window.sanitizeCoachDisplayText = typeof sanitizeCoachDisplayText !== 'undefined' ? sanitizeCoachDisplayText : ((t) => String(t || ''));
window.setImportReviewMode = typeof setImportReviewMode !== 'undefined' ? setImportReviewMode : (() => {});
window.forceConfirmImportOverride = typeof forceConfirmImportOverride !== 'undefined' ? forceConfirmImportOverride : (() => {});
window.renderReviewUnmapped = typeof renderReviewUnmapped !== 'undefined' ? renderReviewUnmapped : (() => '');
window.detectFormat = typeof detectFormat !== 'undefined' ? detectFormat : null;
window.renderTableHtml = typeof renderTableHtml !== 'undefined' ? renderTableHtml : null;
window.buildImportSummary = typeof buildImportSummary !== 'undefined' ? buildImportSummary : null;
window.searchDocumentIR = typeof searchDocumentIR !== 'undefined' ? searchDocumentIR : null;
window.diffCanonicalPrograms = typeof diffCanonicalPrograms !== 'undefined' ? diffCanonicalPrograms : null;
window.exportImportProvenance = typeof exportImportProvenance !== 'undefined' ? exportImportProvenance : (() => {});

})();
</script>
</body>
</html>
`;

// Assemble the final file
const fullHtml = `${headerHtml}${CONFIG_HEADER}\n${middleCore}\n${exportCode}`;

fs.writeFileSync('web/index.html', fullHtml, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', fullHtml, 'utf8');

const STATIC_ASSETS = [
  'gs_logo.png',
  'nurvan_logo.png',
  'nurvan_app_icon.png',
  'xlsx.full.min.js',
  'data.json',
  'program-catalog-index.json',
  'program-catalog-body.json',
  'manifest.webmanifest',
  'sw.js',
  'apple-touch-icon.png',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
  'icon-512-maskable.png',
  'favicon.png'
];
for (const file of STATIC_ASSETS) {
  const src = path.join('web', file);
  const dest = path.join('app/src/main/assets', file);
  if (fs.existsSync(src)) {
    fs.copyFileSync(src, dest);
    console.log('  ✓ Synced asset:', file);
  } else {
    console.warn('  ⚠ Missing web asset (not synced to APK):', file);
  }
}

console.log('✅ Build Master 25 completed successfully!');
console.log('Output size web/index.html:', (fullHtml.length / 1024).toFixed(2), 'KB');
console.log('Output size app/src/main/assets/index.html:', (fullHtml.length / 1024).toFixed(2), 'KB');
