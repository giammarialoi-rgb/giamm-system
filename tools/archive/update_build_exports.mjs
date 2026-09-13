import fs from 'fs';

let c = fs.readFileSync('build_master22.mjs', 'utf8');

const updatedWindowExports = `
function openSkipModal(exerciseIndex) {
  if (typeof $ === 'function' && $('skip-modal')) {
    $('skip-modal').style.display = 'flex';
    if ($('skip-exercise-index')) $('skip-exercise-index').value = exerciseIndex;
  }
}

function confirmSkip(exerciseIndex, reason = 'Salto') {
  saveSkipReason(exerciseIndex, reason);
}

function openReplacementModal(exerciseIndex) {
  if (typeof $ === 'function' && $('replace-modal')) {
    $('replace-modal').style.display = 'flex';
    if ($('replace-exercise-index')) $('replace-exercise-index').value = exerciseIndex;
  }
}

function confirmReplacement(exerciseIndex, newName) {
  applyExerciseReplacement(exerciseIndex, newName);
}

function exportFullDatabaseBackup() {
  const json = BackupService.createFullBackupJson();
  if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'giammaria_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return json;
}

function importFullDatabaseBackup(jsonString = null) {
  if (jsonString) {
    return BackupService.restoreFullBackup(jsonString);
  }
}

function changeAppLanguage(lang) {
  if (typeof I18nService !== 'undefined') {
    I18nService.setLanguage(lang);
  }
  if (typeof render === 'function') render();
}

function switchPlan(plan) {
  if (typeof EntitlementService !== 'undefined') {
    EntitlementService.setPlan(plan);
  }
  if (typeof render === 'function') render();
}

// Master GS Global Export
if (typeof window !== 'undefined') {
  window.GS = {
    CONFIG: ConfigService,
    ConfigService,
    Persistence: typeof GiammariaPersistence !== 'undefined' ? GiammariaPersistence : null,
    ProgramService,
    WorkoutService,
    NutritionService,
    SupplementService,
    TherapyService,
    ExamService,
    CalendarService: typeof CalendarService !== 'undefined' ? CalendarService : null,
    NotificationService,
    ImportService,
    AIService,
    CoachAIService: typeof CoachAIService !== 'undefined' ? CoachAIService : null,
    GoogleService,
    AppleService,
    FoodDatabaseService: typeof FoodDatabaseService !== 'undefined' ? FoodDatabaseService : null,
    SupplementDatabaseService: typeof SupplementDatabaseService !== 'undefined' ? SupplementDatabaseService : null,
    DrugDatabaseService: typeof DrugDatabaseService !== 'undefined' ? DrugDatabaseService : null,
    ExerciseDatabaseService: typeof ExerciseDatabaseService !== 'undefined' ? ExerciseDatabaseService : null,
    I18nService: typeof I18nService !== 'undefined' ? I18nService : null,
    EntitlementService: typeof EntitlementService !== 'undefined' ? EntitlementService : null,
    PricingService: typeof PricingService !== 'undefined' ? PricingService : null,
    AdsService: typeof AdsService !== 'undefined' ? AdsService : null,
    BackupService: typeof BackupService !== 'undefined' ? BackupService : null,
    HealthDataProvider: typeof HealthDataProvider !== 'undefined' ? HealthDataProvider : null,
    ErrorLogger: typeof ErrorLogger !== 'undefined' ? ErrorLogger : null,
    ExamineService: typeof ExamineService !== 'undefined' ? ExamineService : null,
    External: {
      GoogleService: typeof GoogleService !== 'undefined' ? GoogleService : null,
      AppleService: typeof AppleService !== 'undefined' ? AppleService : null,
      HealthDataProvider: typeof HealthDataProvider !== 'undefined' ? HealthDataProvider : null
    },
    Utils: {
      rirToRpe: typeof rirToRpe !== 'undefined' ? rirToRpe : null,
      rpeToRir: typeof rpeToRir !== 'undefined' ? rpeToRir : null,
      safeDisplayValue: typeof safeDisplayValue !== 'undefined' ? safeDisplayValue : null,
      calculateEpley1RM: typeof calculateEpley1RM !== 'undefined' ? calculateEpley1RM : null,
      calculateSetVolume: typeof calculateSetVolume !== 'undefined' ? calculateSetVolume : null,
      calculateSessionVolume: typeof calculateSessionVolume !== 'undefined' ? calculateSessionVolume : null,
      calculateEffectiveIntensityVolume: typeof calculateEffectiveIntensityVolume !== 'undefined' ? calculateEffectiveIntensityVolume : null
    },
    Services: {
      ExamineService: typeof ExamineService !== 'undefined' ? ExamineService : null,
      I18nService: typeof I18nService !== 'undefined' ? I18nService : null,
      EntitlementService: typeof EntitlementService !== 'undefined' ? EntitlementService : null,
      PricingService: typeof PricingService !== 'undefined' ? PricingService : null,
      AdsService: typeof AdsService !== 'undefined' ? AdsService : null,
      HealthDataProvider: typeof HealthDataProvider !== 'undefined' ? HealthDataProvider : null,
      ErrorLogger: typeof ErrorLogger !== 'undefined' ? ErrorLogger : null,
      CoachAIService: typeof CoachAIService !== 'undefined' ? CoachAIService : null,
      CalendarService: typeof CalendarService !== 'undefined' ? CalendarService : null,
      FoodDatabaseService: typeof FoodDatabaseService !== 'undefined' ? FoodDatabaseService : null,
      SupplementDatabaseService: typeof SupplementDatabaseService !== 'undefined' ? SupplementDatabaseService : null,
      DrugDatabaseService: typeof DrugDatabaseService !== 'undefined' ? DrugDatabaseService : null,
      ExerciseDatabaseService: typeof ExerciseDatabaseService !== 'undefined' ? ExerciseDatabaseService : null,
      BackupService: typeof BackupService !== 'undefined' ? BackupService : null
    }
  };
  window.ProgramService = ProgramService;
  window.WorkoutService = WorkoutService;
  window.NutritionService = NutritionService;
  window.SupplementService = SupplementService;
  window.TherapyService = TherapyService;
  window.ExamService = ExamService;
  window.CalendarService = typeof CalendarService !== 'undefined' ? CalendarService : null;
  window.NotificationService = NotificationService;
  window.ImportService = ImportService;
  window.AIService = AIService;
  window.ExamineService = typeof ExamineService !== 'undefined' ? ExamineService : null;
  window.HealthDataProvider = typeof HealthDataProvider !== 'undefined' ? HealthDataProvider : null;
  window.ErrorLogger = typeof ErrorLogger !== 'undefined' ? ErrorLogger : null;
  window.I18nService = typeof I18nService !== 'undefined' ? I18nService : null;
  window.EntitlementService = typeof EntitlementService !== 'undefined' ? EntitlementService : null;
  window.PricingService = typeof PricingService !== 'undefined' ? PricingService : null;
  window.AdsService = typeof AdsService !== 'undefined' ? AdsService : null;
  window.renderNutrition = renderNutrition;
  window.renderSupplements = renderSupplements;
  window.renderTherapy = renderTherapy;
  window.renderExams = renderExams;
  window.renderCalendar = renderCalendar;
  window.renderSettings = renderSettings;
  window.renderPricing = renderPricing;
  window.renderImport = typeof renderImport !== 'undefined' ? renderImport : (() => {});
  window.switchReviewTab = typeof switchReviewTab !== 'undefined' ? switchReviewTab : (() => {});
  window.switchImportInputMode = typeof switchImportInputMode !== 'undefined' ? switchImportInputMode : (() => {});
  window.handleImportFileSelected = typeof handleImportFileSelected !== 'undefined' ? handleImportFileSelected : (() => {});
  window.formatFileSize = typeof formatFileSize !== 'undefined' ? formatFileSize : (() => {});
  window.applyCoachProposal = typeof applyCoachProposal !== 'undefined' ? applyCoachProposal : (pId => AIService.applyProposal(pId));
  window.cancelCoachProposal = typeof cancelCoachProposal !== 'undefined' ? cancelCoachProposal : (pId => AIService.cancelProposal(pId));
  window.openAccount = typeof openAccount !== 'undefined' ? openAccount : (() => {});
  window.closeAccount = typeof closeAccount !== 'undefined' ? closeAccount : (() => {});
  window.startGoogleAuth = typeof startGoogleAuth !== 'undefined' ? startGoogleAuth : (() => {});
  window.startAppleAuth = typeof startAppleAuth !== 'undefined' ? startAppleAuth : (() => {});
  window.openMenuHub = openMenuHub;
  window.closeMenuHub = closeMenuHub;
  window.saveFoodItem = saveFoodItem;
  window.deleteFoodItem = deleteFoodItem;
  window.saveSupplementItem = saveSupplementItem;
  window.deleteSupplementItem = deleteSupplementItem;
  window.saveTherapyItem = saveTherapyItem;
  window.deleteTherapyItem = deleteTherapyItem;
  window.saveExamRecord = saveExamRecord;
  window.deleteExamRecord = deleteExamRecord;
  window.openSkipModal = typeof openSkipModal !== 'undefined' ? openSkipModal : (() => {});
  window.confirmSkip = typeof confirmSkip !== 'undefined' ? confirmSkip : ((eIdx, r) => saveSkipReason(eIdx, r || 'Salto'));
  window.openReplacementModal = typeof openReplacementModal !== 'undefined' ? openReplacementModal : (() => {});
  window.confirmReplacement = typeof confirmReplacement !== 'undefined' ? confirmReplacement : ((eIdx, n) => applyExerciseReplacement(eIdx, n));
  window.exportFullDatabaseBackup = typeof exportFullDatabaseBackup !== 'undefined' ? exportFullDatabaseBackup : (() => BackupService.createFullBackupJson());
  window.importFullDatabaseBackup = typeof importFullDatabaseBackup !== 'undefined' ? importFullDatabaseBackup : ((json) => BackupService.restoreFullBackup(json));
  window.changeAppLanguage = typeof changeAppLanguage !== 'undefined' ? changeAppLanguage : ((lang) => { I18nService.setLanguage(lang); if(typeof render==='function') render(); });
  window.switchPlan = typeof switchPlan !== 'undefined' ? switchPlan : ((plan) => { EntitlementService.setPlan(plan); if(typeof render==='function') render(); });
  window.calcStats = typeof calcStats !== 'undefined' ? calcStats : (() => {});
  window.safeDisplayValue = typeof safeDisplayValue !== 'undefined' ? safeDisplayValue : (v => String(v));
  window.rirToRpe = typeof rirToRpe !== 'undefined' ? rirToRpe : (v => 10 - v);
  window.rpeToRir = typeof rpeToRir !== 'undefined' ? rpeToRir : (v => 10 - v);
  window.openBonusModal = typeof openBonusModal !== 'undefined' ? openBonusModal : (() => {});
  window.saveBonusExercise = typeof saveBonusExercise !== 'undefined' ? saveBonusExercise : (() => {});
  window.deleteBonusExercise = typeof deleteBonusExercise !== 'undefined' ? deleteBonusExercise : (() => {});
  window.addSetToExercise = typeof addSetToExercise !== 'undefined' ? addSetToExercise : (() => {});
  window.removeSetFromExercise = typeof removeSetFromExercise !== 'undefined' ? removeSetFromExercise : (() => {});
  window.duplicateSet = typeof duplicateSet !== 'undefined' ? duplicateSet : (() => {});
  window.updateSetType = typeof updateSetType !== 'undefined' ? updateSetType : (() => {});
  window.toggleSetDone = typeof toggleSetDone !== 'undefined' ? toggleSetDone : (() => {});
  window.startTimer = typeof startTimer !== 'undefined' ? startTimer : (() => {});
  window.stopTimer = typeof stopTimer !== 'undefined' ? stopTimer : (() => {});
  window.askAI = typeof askAI !== 'undefined' ? askAI : (() => {});
  window.init = typeof init !== 'undefined' ? init : (() => {});
  window.navigate = typeof navigate !== 'undefined' ? navigate : (() => {});
  window.render = typeof render !== 'undefined' ? render : (() => {});
  window.renderHome = typeof renderHome !== 'undefined' ? renderHome : (() => {});
  window.renderTraining = typeof renderTraining !== 'undefined' ? renderTraining : (() => {});
  window.renderPrograms = typeof renderPrograms !== 'undefined' ? renderPrograms : (() => {});
  window.renderStats = typeof renderStats !== 'undefined' ? renderStats : (() => {});
  window.renderAI = typeof renderAI !== 'undefined' ? renderAI : (() => {});
  window.renderDb = typeof renderDb !== 'undefined' ? renderDb : (() => {});
`;

// Replace from "// Master GS Global Export" to the end of DOMAIN_SERVICES_CODE
const startMarker = '// Master GS Global Export';
const sIdx = c.indexOf(startMarker);
if (sIdx !== -1) {
  const endIdx = c.indexOf('// 8. ASSEMBLE FULL SCRIPT');
  if (endIdx !== -1) {
    c = c.slice(0, sIdx) + updatedWindowExports + '\n`;\n\n' + c.slice(endIdx);
    fs.writeFileSync('build_master22.mjs', c, 'utf8');
    console.log('Successfully replaced global exports in build_master22.mjs');
  }
}
