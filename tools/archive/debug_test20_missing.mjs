import fs from 'fs';
import vm from 'vm';

const htmlContent = fs.readFileSync('web/index.html', 'utf8');
const scriptMatch = htmlContent.match(/<script(?:\s+type="text\/javascript")?>([\s\S]*?)<\/script>/i);

const sandbox = {
  window: null,
  globalThis: null,
  document: { getElementById: () => ({ value: '', innerHTML: '', style: {}, classList: { add: ()=>{}, remove: ()=>{} }, addEventListener: ()=>{} }), querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ setAttribute: ()=>{}, appendChild: ()=>{} }), body: { appendChild: ()=>{} } },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {}, clear: () => {} },
  indexedDB: { open: () => ({}) },
  console: console,
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
  NativeConfig: { getCoachApiUrl: () => 'https://coach-api-gemini.onrender.com' },
  addEventListener: () => {},
  removeEventListener: () => {}
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);
vm.runInContext(scriptMatch[1], ctx);

const required = [
  'addBonusExercise', 'getMuscleGroup', 'asDocumentBlob', 'buildAnalyzeForm', 'legacyHandleFileUpload', 'legacyDeleteDoc',
  'programFingerprint', 'addWorkoutSet', 'deleteWorkoutSet', 'normalizeProgram', 'canonicalToData', 'dataToCanonical',
  'renderHome', 'renderTraining', 'renderPrograms', 'renderImport', 'renderStats', 'renderAI', 'renderDb',
  'navigate', 'init', 'persist', 'updateData', 'toggleSetDone', 'addSetToExercise', 'removeSetFromExercise',
  'openBonusModal', 'closeBonusModal', 'saveBonusExercise', 'deleteBonusExercise', 'openSkipModal', 'closeSkipModal',
  'saveSkipReason', 'openReplacementModal', 'closeReplacementModal', 'applyExerciseReplacement', 'startTimer',
  'stopTimer', 'resetTimer', 'askAI', 'applyCoachProposal', 'cancelCoachProposal', 'checkBackendHealth',
  'newCoachQuestion', 'handleFileUpload', 'deleteDoc', 'analyzeDoc', 'searchDb', 'triggerFileSelect', 'saveAll',
  'resetWorkoutData', 'resetAllData', 'openAccount', 'closeAccount', 'startGoogleAuth', 'startAppleAuth',
  'nativeGoogleResult', 'nativeAppleResult', 'nativeAuthError', 'syncAccountData', 'startVoiceInput',
  'stopVoiceInput', 'speakText', 'stopSpeech', 'exportActiveProgram', 'rirToRpe', 'rpeToRir', 'validateRir',
  'validateRpe', 'normalizeRir', 'normalizeRpe', 'getIntensityLabel', 'calculateDeviation', 'compareTargetVsActual',
  'calculateEpley1RM', 'calculateSetVolume', 'calculateSessionVolume', 'calculateEffectiveIntensityVolume',
  'parseStructuredWorkbook', 'readStructuredWorkbook', 'parseTrainingSheet', 'parseNutritionSheet',
  'parseSupplementationSheet', 'parseTherapyExamsSheet', 'parseCanonicalProgramFromText', 'extractDocumentContent',
  'switchReviewTab', 'confirmAndActivateProgram'
];

required.forEach(fn => {
  const isDef = vm.runInContext(`typeof ${fn} === 'function'`, ctx);
  if (!isDef) {
    console.log('MISSING:', fn, 'type is:', vm.runInContext(`typeof ${fn}`, ctx));
  }
});
