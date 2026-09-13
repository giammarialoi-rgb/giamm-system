import fs from 'fs';

let c = fs.readFileSync('build_master22.mjs', 'utf8');

const sIdx = c.indexOf('// Master GS Global Export');
const eIdx = c.indexOf('// 8. Robust, Unfreezable Bootstrap and Persistence Engine');

if (sIdx === -1 || eIdx === -1) {
  console.error('Could not find markers!', { sIdx, eIdx });
  process.exit(1);
}

const replacement = `// Master GS Global Export
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
  window.ConfigService = ConfigService;
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
  window.confirmSkip = typeof confirmSkip !== 'undefined' ? confirmSkip : ((eIdx, r) => (typeof saveSkipReason === 'function' ? saveSkipReason(eIdx, r || 'Salto') : null));
  window.openReplacementModal = typeof openReplacementModal !== 'undefined' ? openReplacementModal : (() => {});
  window.confirmReplacement = typeof confirmReplacement !== 'undefined' ? confirmReplacement : ((eIdx, n) => (typeof applyExerciseReplacement === 'function' ? applyExerciseReplacement(eIdx, n) : null));
  window.exportFullDatabaseBackup = typeof exportFullDatabaseBackup !== 'undefined' ? exportFullDatabaseBackup : (() => (typeof BackupService !== 'undefined' ? BackupService.createFullBackupJson() : '{}'));
  window.importFullDatabaseBackup = typeof importFullDatabaseBackup !== 'undefined' ? importFullDatabaseBackup : ((json) => (typeof BackupService !== 'undefined' ? BackupService.restoreFullBackup(json) : { ok: true }));
  window.changeAppLanguage = typeof changeAppLanguage !== 'undefined' ? changeAppLanguage : ((lang) => { if(typeof I18nService!=='undefined') I18nService.setLanguage(lang); if(typeof render==='function') render(); });
  window.switchPlan = typeof switchPlan !== 'undefined' ? switchPlan : ((plan) => { if(typeof EntitlementService!=='undefined') EntitlementService.setPlan(plan); if(typeof render==='function') render(); });
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
}
\`;\n\n`;

c = c.slice(0, sIdx) + replacement + c.slice(eIdx);
fs.writeFileSync('build_master22.mjs', c, 'utf8');
console.log('Successfully updated build_master22.mjs');
