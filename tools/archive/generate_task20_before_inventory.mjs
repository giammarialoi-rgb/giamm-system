// generate_task20_before_inventory.mjs
import fs from 'fs';
import path from 'path';

const htmlPath = path.resolve('web/index.html');
const html = fs.readFileSync(htmlPath, 'utf8');

// 1. JS functions
const functionRegex = /function\s+([a-zA-Z0-9_$]+)\s*\(/g;
const asyncFunctionRegex = /async\s+function\s+([a-zA-Z0-9_$]+)\s*\(/g;
const arrowFunctionRegex = /(?:const|let|var)\s+([a-zA-Z0-9_$]+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g;

const functions = new Set();
let match;
while ((match = functionRegex.exec(html)) !== null) functions.add(match[1]);
while ((match = asyncFunctionRegex.exec(html)) !== null) functions.add(match[1]);
while ((match = arrowFunctionRegex.exec(html)) !== null) functions.add(match[1]);

// 2. DOM IDs
const idRegex = /id=["']([a-zA-Z0-9_$-]+)["']/g;
const domIds = new Set();
while ((match = idRegex.exec(html)) !== null) domIds.add(match[1]);

// 3. Views
const views = ['home', 'training', 'programs', 'stats', 'ai', 'db', 'import'];

// 4. Modals
const modals = [
  'account-modal',
  'reset-modal',
  'confirm-modal',
  'exercise-picker-modal',
  'bonus-exercise-modal',
  'timer-modal',
  'skip-modal',
  'substitute-modal'
];

// 5. IndexedDB stores
const indexedDbStores = [
  'programs',
  'workouts',
  'settings',
  'metadata',
  'performance',
  'files'
];

// 6. Navigation routes
const navRoutes = [
  { id: 'nav-home', view: 'home', label: 'HOME' },
  { id: 'nav-training', view: 'training', label: 'WORKOUT' },
  { id: 'nav-programs', view: 'programs', label: 'PROGRAMMI' },
  { id: 'nav-stats', view: 'stats', label: 'PERFORMANCE' },
  { id: 'nav-ai', view: 'ai', label: 'COACH AI' },
  { id: 'nav-db', view: 'db', label: 'DATABASE' }
];

// 7. Event listeners / buttons
const buttons = [];
const buttonRegex = /<button[^>]*id=["']([^"']+)["'][^>]*>([\s\S]*?)<\/button>/g;
while ((match = buttonRegex.exec(html)) !== null) {
  buttons.push({ id: match[1], text: match[2].trim().replace(/<[^>]+>/g, '') });
}

// 8. Coach AI functions
const coachAiFunctions = [
  'renderAI', 'askAI', 'applyCoachProposal', 'cancelCoachProposal',
  'formatCoachResponse', 'startVoiceInput', 'stopVoiceInput', 'speakText',
  'resetChatSession', 'coachEndpoint'
];

// 9. Workout Logger functions
const workoutLoggerFunctions = [
  'renderTraining', 'updateReps', 'updateLoad', 'updateRIR', 'updateRPE',
  'toggleDone', 'addSet', 'removeSet', 'toggleIntensityType', 'startTimer',
  'stopTimer', 'skipExercise', 'substituteExercise', 'addBonusExercise'
];

// 10. Import functions
const importFunctions = [
  'renderImport', 'handleFileUpload', 'nativeDocumentReceived',
  'parseStructuredWorkbook', 'confirmImportAndActivate', 'importProgramJson',
  'renderImportReview', 'updateReviewField'
];

// 11. Storage methods
const storageMethods = [
  'persist', 'finishInit', 'init', 'saveAll', 'resetWorkoutData', 'resetAllData',
  'GiammariaPersistence.saveActiveProgram', 'GiammariaPersistence.getActiveProgram',
  'GiammariaPersistence.sanitizeStoreForLocalStorage', 'GiammariaPersistence.migrateLegacyStore'
];

const inventory = {
  task: "MASTER TASK 20 BEFORE INVENTORY & FORENSIC BASELINE",
  timestamp: new Date().toISOString(),
  total_functions_count: functions.size,
  total_dom_ids_count: domIds.size,
  views: views,
  navigation_routes: navRoutes,
  modals: modals,
  indexeddb_stores: indexedDbStores,
  storage_methods: storageMethods,
  coach_ai_functions: coachAiFunctions,
  workout_logger_functions: workoutLoggerFunctions,
  import_functions: importFunctions,
  domains: {
    workout: {
      volume: true,
      tonnage: true,
      rir_rpe_conversion: true,
      timer: true,
      multiple_sets: true,
      substitution: true,
      skip: true,
      bonus: true
    },
    nutrition: {
      status: "basic_preview_only",
      manual_management: false,
      database: false
    },
    supplements: {
      status: "basic_preview_only",
      manual_management: false,
      database: false,
      examine_connect: false
    },
    therapy: {
      status: "basic_preview_only",
      manual_management: false,
      database: false
    },
    exams: {
      status: "basic_preview_only",
      manual_management: false
    },
    calendar: {
      status: "missing",
      unified: false
    },
    reminders: {
      status: "missing",
      local_notifications: false
    }
  },
  known_blockers: [
    {
      id: "GS_STORE_QUOTA_EXCEEDED",
      description: "store.docs base64 retained in sanitized store and written to localStorage",
      status: "identified_root_cause"
    },
    {
      id: "COACH_API_URL_NOT_DEFINED",
      description: "Reference to COACH_API_URL without centralized global initialization",
      status: "identified_root_cause"
    },
    {
      id: "COACH_AI_SEND_BLOCKED",
      description: "Send button / Enter listener and state handling needs hardening",
      status: "identified_root_cause"
    },
    {
      id: "WORKOUT_LOGGER_ADD_SET",
      description: "Add Set / Remove Set / Duplicate Set needs full dynamic array management",
      status: "identified_root_cause"
    }
  ],
  all_functions: Array.from(functions).sort(),
  all_dom_ids: Array.from(domIds).sort()
};

fs.mkdirSync(path.resolve('test-artifacts'), { recursive: true });
fs.writeFileSync(path.resolve('test-artifacts/task20-before-inventory.json'), JSON.stringify(inventory, null, 2), 'utf8');
console.log(`Generated test-artifacts/task20-before-inventory.json successfully! Functions: ${functions.size}, DOM IDs: ${domIds.size}`);
