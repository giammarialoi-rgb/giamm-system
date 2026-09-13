import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

const keyFunctions = [
  'navigate',
  'render',
  'renderHome',
  'renderTraining',
  'renderStats',
  'renderAI',
  'renderDb',
  'renderImport',
  'applyModel',
  'deleteModel',
  'setDesiredDuration',
  'setDesiredFrequency',
  'resetWorkoutData',
  'resetAllData',
  'toggleIntensityType',
  'setExIntensity',
  'toggleLoadType',
  'updateTempo',
  'openSkipModal',
  'confirmSkip',
  'renderReplacementOptions',
  'confirmReplacement',
  'closeBonusModal',
  'saveBonusExercise',
  'startTimer',
  'stopTimer',
  'showPrevLoad',
  'hidePrevLoad',
  'toggleSetDone',
  'addSetToExercise',
  'removeSetFromExercise',
  'saveAll',
  'askAI',
  'applyCoachProposal',
  'cancelCoachProposal',
  'confirmResetSession',
  'searchDb',
  'handleFileUpload',
  'deleteDoc',
  'analyzeDoc',
  'confirmProgramImport',
  'openAccount',
  'closeAccount',
  'submitAccount',
  'startGoogleAuth',
  'startAppleAuth',
  'toggleAccountMode',
  'logoutAccount',
  'syncAccountData',
  'parseStructuredWorkbook',
  'confirmImportAndActivate',
  'cancelCurrentImportReview',
  'switchReviewTab',
  'updateReviewTitle',
  'updateReviewExerciseField',
  'updateReviewMealItem',
  'addReviewMealItem',
  'removeReviewMealItem',
  'updateReviewSupplementItem',
  'addReviewSupplementItem',
  'removeReviewSupplementItem',
  'updateReviewTherapyMedication',
  'addReviewTherapyMedication',
  'removeReviewTherapyMedication',
  'updateReviewExamRecord',
  'addReviewExamRecord',
  'removeReviewExamRecord'
];

console.log(`Checking ${keyFunctions.length} essential functions in web/index.html...`);
const missing = [];
for (const fn of keyFunctions) {
  const re = new RegExp(`(?:function\\s+${fn}|(?:var|let|const)\\s+${fn}\\s*=)`, 'g');
  if (!re.test(html)) {
    missing.push(fn);
  }
}

console.log('Missing key functions:', missing);
console.log('All functions present:', missing.length === 0);
