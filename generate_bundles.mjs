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

// 1b. Bundle action-catalog.mjs -> prepare_task20_action_catalog.mjs
if (fs.existsSync('action-catalog.mjs')) {
  const rawAction = fs.readFileSync('action-catalog.mjs', 'utf8');
  let cleanAction = rawAction
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+const\s+/gm, 'var ')
    .replace(/^export\s+let\s+/gm, 'var ')
    .replace(/^export\s+var\s+/gm, 'var ')
    .replace(/^export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+class\s+/gm, 'class ')
    .replace(/^export\s+\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  // default export object may remain as assignment — ensure globals on window
  cleanAction += `
if (typeof window !== 'undefined') {
  window.ACTION_SOURCES = typeof ACTION_SOURCES !== 'undefined' ? ACTION_SOURCES : window.ACTION_SOURCES;
  window.ACTION_SCOPES = typeof ACTION_SCOPES !== 'undefined' ? ACTION_SCOPES : window.ACTION_SCOPES;
  window.AI_CONTROL_DEFAULTS = typeof AI_CONTROL_DEFAULTS !== 'undefined' ? AI_CONTROL_DEFAULTS : window.AI_CONTROL_DEFAULTS;
  window.ACTION_DEFS = typeof ACTION_DEFS !== 'undefined' ? ACTION_DEFS : window.ACTION_DEFS;
  window.getActionDef = typeof getActionDef === 'function' ? getActionDef : window.getActionDef;
  window.defaultAiControlPrefs = typeof defaultAiControlPrefs === 'function' ? defaultAiControlPrefs : window.defaultAiControlPrefs;
  window.ensureAiControlPrefs = typeof ensureAiControlPrefs === 'function' ? ensureAiControlPrefs : window.ensureAiControlPrefs;
  window.promptAllowedOpTypes = typeof promptAllowedOpTypes === 'function' ? promptAllowedOpTypes : window.promptAllowedOpTypes;
  window.promptAllowedOpTypesCsv = typeof promptAllowedOpTypesCsv === 'function' ? promptAllowedOpTypesCsv : window.promptAllowedOpTypesCsv;
  window.canonicalizeAction = typeof canonicalizeAction === 'function' ? canonicalizeAction : window.canonicalizeAction;
  window.actionToOperation = typeof actionToOperation === 'function' ? actionToOperation : window.actionToOperation;
  window.operationsToActions = typeof operationsToActions === 'function' ? operationsToActions : window.operationsToActions;
  window.actionsToOperations = typeof actionsToOperations === 'function' ? actionsToOperations : window.actionsToOperations;
  window.reverseAction = typeof reverseAction === 'function' ? reverseAction : window.reverseAction;
  window.isLogAction = typeof isLogAction === 'function' ? isLogAction : window.isLogAction;
  window.isProgramAction = typeof isProgramAction === 'function' ? isProgramAction : window.isProgramAction;
  window.isRewardsAction = typeof isRewardsAction === 'function' ? isRewardsAction : window.isRewardsAction;
  window.createActionDispatcher = typeof createActionDispatcher === 'function' ? createActionDispatcher : window.createActionDispatcher;
}
`;
  fs.writeFileSync('prepare_task20_action_catalog.mjs', cleanAction, 'utf8');
  console.log('✅ prepare_task20_action_catalog.mjs generated successfully!');
}

// 1c. Bundle rewards-engine.mjs
if (fs.existsSync('rewards-engine.mjs')) {
  const rawRew = fs.readFileSync('rewards-engine.mjs', 'utf8');
  let cleanRew = rawRew
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+const\s+/gm, 'var ')
    .replace(/^export\s+let\s+/gm, 'var ')
    .replace(/^export\s+var\s+/gm, 'var ')
    .replace(/^export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+class\s+/gm, 'class ')
    .replace(/^export\s+\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  cleanRew += `
if (typeof window !== 'undefined') {
  window.NurvanRewards = {
    REWARDS_TIERS: typeof REWARDS_TIERS !== 'undefined' ? REWARDS_TIERS : [],
    ACHIEVEMENT_DEFS: typeof ACHIEVEMENT_DEFS !== 'undefined' ? ACHIEVEMENT_DEFS : [],
    AVATAR_COSMETICS: typeof AVATAR_COSMETICS !== 'undefined' ? AVATAR_COSMETICS : [],
    SOCIAL_CARD_TEMPLATES: typeof SOCIAL_CARD_TEMPLATES !== 'undefined' ? SOCIAL_CARD_TEMPLATES : [],
    defaultRewardsState: typeof defaultRewardsState === 'function' ? defaultRewardsState : null,
    xpForLevel: typeof xpForLevel === 'function' ? xpForLevel : null,
    levelFromTotalXp: typeof levelFromTotalXp === 'function' ? levelFromTotalXp : null,
    tierFromScore: typeof tierFromScore === 'function' ? tierFromScore : null,
    validateWorkoutXp: typeof validateWorkoutXp === 'function' ? validateWorkoutXp : null,
    applyXpEvent: typeof applyXpEvent === 'function' ? applyXpEvent : null,
    onWorkoutCompleted: typeof onWorkoutCompleted === 'function' ? onWorkoutCompleted : null,
    setRewardsMode: typeof setRewardsMode === 'function' ? setRewardsMode : null,
    buildSharePayload: typeof buildSharePayload === 'function' ? buildSharePayload : null,
    estimateTopPercent: typeof estimateTopPercent === 'function' ? estimateTopPercent : null,
    evaluateAchievements: typeof evaluateAchievements === 'function' ? evaluateAchievements : null,
    applyGoldCosmetic: typeof applyGoldCosmetic === 'function' ? applyGoldCosmetic : null
  };
}
`;
  fs.writeFileSync('prepare_task20_rewards_engine.mjs', cleanRew, 'utf8');
  console.log('✅ prepare_task20_rewards_engine.mjs generated successfully!');
}

// 1d. Bundle trend-engine.mjs
if (fs.existsSync('trend-engine.mjs')) {
  const rawTr = fs.readFileSync('trend-engine.mjs', 'utf8');
  let cleanTr = rawTr
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+const\s+/gm, 'var ')
    .replace(/^export\s+let\s+/gm, 'var ')
    .replace(/^export\s+var\s+/gm, 'var ')
    .replace(/^export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+class\s+/gm, 'class ')
    .replace(/^export\s+\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  cleanTr += `
if (typeof window !== 'undefined') {
  window.NurvanTrend = {
    analyzeExerciseTrend: typeof analyzeExerciseTrend === 'function' ? analyzeExerciseTrend : null,
    proposeDeload: typeof proposeDeload === 'function' ? proposeDeload : null,
    proposeLoadProgression: typeof proposeLoadProgression === 'function' ? proposeLoadProgression : null
  };
}
`;
  fs.writeFileSync('prepare_task20_trend_engine.mjs', cleanTr, 'utf8');
  console.log('✅ prepare_task20_trend_engine.mjs generated successfully!');
}

// 2a. Bundle document-intelligence-core.mjs (prepended to import engine)
let cleanDi = '';
if (fs.existsSync('document-intelligence-core.mjs')) {
  const rawDi = fs.readFileSync('document-intelligence-core.mjs', 'utf8');
  cleanDi = rawDi
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
  console.log('✅ document-intelligence-core bundled');
}

// 2. Bundle universal-import-engine.mjs -> prepare_task20_import_engine.mjs
let cleanFidelity = '';
if (fs.existsSync('import-fidelity.mjs')) {
  const rawFid = fs.readFileSync('import-fidelity.mjs', 'utf8');
  cleanFidelity = rawFid
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+const\s+/gm, 'var ')
    .replace(/^export\s+let\s+/gm, 'var ')
    .replace(/^export\s+var\s+/gm, 'var ')
    .replace(/^export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+class\s+/gm, 'class ')
    .replace(/^export\s+\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  console.log('✅ import-fidelity bundled');
}

let cleanPrescription = '';
if (fs.existsSync('prescription-engine.mjs')) {
  const rawRx = fs.readFileSync('prescription-engine.mjs', 'utf8');
  cleanPrescription = rawRx
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+const\s+/gm, 'var ')
    .replace(/^export\s+let\s+/gm, 'var ')
    .replace(/^export\s+var\s+/gm, 'var ')
    .replace(/^export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+class\s+/gm, 'class ')
    .replace(/^export\s+\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  cleanPrescription += `
if (typeof window !== 'undefined') {
  window.NurvanPrescription = {
    parseLiteralScheme: typeof parseLiteralScheme === 'function' ? parseLiteralScheme : null,
    parseCompoundSchemes: typeof parseCompoundSchemes === 'function' ? parseCompoundSchemes : null,
    parseSpaceLadder: typeof parseSpaceLadder === 'function' ? parseSpaceLadder : null,
    extractPrescriptionsFromText: typeof extractPrescriptionsFromText === 'function' ? extractPrescriptionsFromText : null,
    resolvePrescription: typeof resolvePrescription === 'function' ? resolvePrescription : null,
    enforceExercisePrescription: typeof enforceExercisePrescription === 'function' ? enforceExercisePrescription : null,
    applyPrescriptionsToProgram: typeof applyPrescriptionsToProgram === 'function' ? applyPrescriptionsToProgram : null,
    enforceAllPrescriptions: typeof enforceAllPrescriptions === 'function' ? enforceAllPrescriptions : null
  };
}
`;
  console.log('✅ prescription-engine bundled');
}

let cleanDrugCatalog = '';
if (fs.existsSync('drug-catalog.mjs')) {
  const rawDrug = fs.readFileSync('drug-catalog.mjs', 'utf8');
  cleanDrugCatalog = rawDrug
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+const\s+/gm, 'var ')
    .replace(/^export\s+let\s+/gm, 'var ')
    .replace(/^export\s+var\s+/gm, 'var ')
    .replace(/^export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+class\s+/gm, 'class ')
    .replace(/^export\s+\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  cleanDrugCatalog += `
if (typeof window !== 'undefined') {
  window.DRUG_CATALOG = typeof DRUG_CATALOG !== 'undefined' ? DRUG_CATALOG : [];
  window.matchDrug = typeof matchDrug === 'function' ? matchDrug : null;
  window.enrichTherapyMedications = typeof enrichTherapyMedications === 'function' ? enrichTherapyMedications : null;
}
`;
  console.log('✅ drug-catalog bundled');
}

let cleanSupplementCatalog = '';
if (fs.existsSync('supplement-catalog.mjs')) {
  const rawSupp = fs.readFileSync('supplement-catalog.mjs', 'utf8');
  cleanSupplementCatalog = rawSupp
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+const\s+/gm, 'var ')
    .replace(/^export\s+let\s+/gm, 'var ')
    .replace(/^export\s+var\s+/gm, 'var ')
    .replace(/^export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+class\s+/gm, 'class ')
    .replace(/^export\s+\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  cleanSupplementCatalog += `
if (typeof window !== 'undefined') {
  window.SUPPLEMENT_CATALOG = typeof SUPPLEMENT_CATALOG !== 'undefined' ? SUPPLEMENT_CATALOG : [];
  window.SUPPLEMENT_CATEGORIES = typeof SUPPLEMENT_CATEGORIES !== 'undefined' ? SUPPLEMENT_CATEGORIES : [];
  window.searchSupplementCatalog = typeof searchSupplementCatalog === 'function' ? searchSupplementCatalog : null;
}
`;
  console.log('✅ supplement-catalog bundled');
}

let cleanFoodCatalog = '';
if (fs.existsSync('food-catalog.mjs')) {
  const rawFood = fs.readFileSync('food-catalog.mjs', 'utf8');
  cleanFoodCatalog = rawFood
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+const\s+/gm, 'var ')
    .replace(/^export\s+let\s+/gm, 'var ')
    .replace(/^export\s+var\s+/gm, 'var ')
    .replace(/^export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+class\s+/gm, 'class ')
    .replace(/^export\s+\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  cleanFoodCatalog += `
if (typeof window !== 'undefined') {
  window.FOOD_CATALOG = typeof FOOD_CATALOG !== 'undefined' ? FOOD_CATALOG : [];
  window.FOOD_CATEGORIES = typeof FOOD_CATEGORIES !== 'undefined' ? FOOD_CATEGORIES : [];
  window.searchFoodCatalog = typeof searchFoodCatalog === 'function' ? searchFoodCatalog : null;
}
`;
  console.log('✅ food-catalog bundled');
}

let cleanScienceEngine = '';
if (fs.existsSync('science-program-engine.mjs')) {
  const rawSci = fs.readFileSync('science-program-engine.mjs', 'utf8');
  cleanScienceEngine = rawSci
    .replace(/^import\s+.*?;?\s*$/gm, '')
    .replace(/^export\s+default\s+/gm, '')
    .replace(/^export\s+const\s+/gm, 'var ')
    .replace(/^export\s+let\s+/gm, 'var ')
    .replace(/^export\s+var\s+/gm, 'var ')
    .replace(/^export\s+async\s+function\s+/gm, 'async function ')
    .replace(/^export\s+function\s+/gm, 'function ')
    .replace(/^export\s+class\s+/gm, 'class ')
    .replace(/^export\s+\{[\s\S]*?\};?\s*$/gm, '')
    .replace(/^export\s+/gm, '');
  cleanScienceEngine += `
if (typeof window !== 'undefined') {
  window.expandScienceProgramWeeks = typeof expandScienceProgramWeeks === 'function' ? expandScienceProgramWeeks : window.expandScienceProgramWeeks;
  window.parseCatalogQuery = typeof parseCatalogQuery === 'function' ? parseCatalogQuery : window.parseCatalogQuery;
  window.rankCatalogPrograms = typeof rankCatalogPrograms === 'function' ? rankCatalogPrograms : window.rankCatalogPrograms;
  window.SPLIT_LABELS = typeof SPLIT_LABELS !== 'undefined' ? SPLIT_LABELS : window.SPLIT_LABELS;
  window.GOAL_LABELS = typeof GOAL_LABELS !== 'undefined' ? GOAL_LABELS : window.GOAL_LABELS;
  window.PROGRESSION_LABELS = typeof PROGRESSION_LABELS !== 'undefined' ? PROGRESSION_LABELS : window.PROGRESSION_LABELS;
}
`;
  console.log('✅ science-program-engine bundled');
}

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
cleanImport = (cleanDi ? ('// === DOCUMENT INTELLIGENCE CORE ===\n' + cleanDi + '\n') : '')
  + (cleanFidelity ? ('// === IMPORT FIDELITY ===\n' + cleanFidelity + '\n') : '')
  + (cleanPrescription ? ('// === PRESCRIPTION ENGINE ===\n' + cleanPrescription + '\n') : '')
  + (cleanDrugCatalog ? ('// === DRUG CATALOG ===\n' + cleanDrugCatalog + '\n') : '')
  + (cleanSupplementCatalog ? ('// === SUPPLEMENT CATALOG ===\n' + cleanSupplementCatalog + '\n') : '')
  + (cleanFoodCatalog ? ('// === FOOD CATALOG ===\n' + cleanFoodCatalog + '\n') : '')
  + (cleanScienceEngine ? ('// === SCIENCE PROGRAM ENGINE ===\n' + cleanScienceEngine + '\n') : '')
  + '// === UNIVERSAL IMPORT ENGINE ===\n' + cleanImport;

const reviewCallbacks = `
// buildCanonicalProgram comes from universal-import-engine.mjs, just above.

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
  filename: null,
  documentIR: null,
  importSummary: null,
  reviewMode: 'structured',
  pipelineStage: null,
  forceConfirmOverride: false
};
if (typeof window !== 'undefined') {
  if (!window.programImportState) window.programImportState = programImportState;
  window.buildCanonicalProgram = buildCanonicalProgram;
  window.validateCanonicalProgram = validateCanonicalProgram;
  window.enrichFoodItemMacros = typeof enrichFoodItemMacros === 'function' ? enrichFoodItemMacros : null;
  window.enrichNutritionMacros = typeof enrichNutritionMacros === 'function' ? enrichNutritionMacros : null;
  window.matchFoodMacros = typeof matchFoodMacros === 'function' ? matchFoodMacros : null;
  window.evaluateSimpleExcelFormula = typeof evaluateSimpleExcelFormula !== 'undefined' ? evaluateSimpleExcelFormula : null;
  window.recalcTrainingLoadsFromCells = typeof recalcTrainingLoadsFromCells !== 'undefined' ? recalcTrainingLoadsFromCells : null;
  window.detectFormat = typeof detectFormat !== 'undefined' ? detectFormat : null;
  window.buildIRFromWorkbook = typeof buildIRFromWorkbook !== 'undefined' ? buildIRFromWorkbook : null;
  window.renderTableHtml = typeof renderTableHtml !== 'undefined' ? renderTableHtml : null;
  window.buildImportSummary = typeof buildImportSummary !== 'undefined' ? buildImportSummary : null;
  window.searchDocumentIR = typeof searchDocumentIR !== 'undefined' ? searchDocumentIR : null;
  window.diffCanonicalPrograms = typeof diffCanonicalPrograms !== 'undefined' ? diffCanonicalPrograms : null;
  window.validateDocumentSemantics = typeof validateDocumentSemantics !== 'undefined' ? validateDocumentSemantics : null;
  window.runLocalOcr = typeof runLocalOcr !== 'undefined' ? runLocalOcr : null;
  window.DI_PIPELINE_STAGES = typeof DI_PIPELINE_STAGES !== 'undefined' ? DI_PIPELINE_STAGES : null;
  window.DI_MAX_BYTES = typeof DI_MAX_BYTES !== 'undefined' ? DI_MAX_BYTES : (12 * 1024 * 1024);
}


// The page declares these further down; bind whatever ends up defined.
if (typeof window !== 'undefined') {
  window.updateReviewTitle = typeof updateReviewTitle === 'function' ? updateReviewTitle : window.updateReviewTitle;
  window.updateReviewExerciseField = typeof updateReviewExerciseField === 'function' ? updateReviewExerciseField : window.updateReviewExerciseField;
  window.updateReviewMealItem = typeof updateReviewMealItem === 'function' ? updateReviewMealItem : window.updateReviewMealItem;
  window.addReviewMealItem = typeof addReviewMealItem === 'function' ? addReviewMealItem : window.addReviewMealItem;
  window.removeReviewMealItem = typeof removeReviewMealItem === 'function' ? removeReviewMealItem : window.removeReviewMealItem;
  window.updateReviewSupplementItem = typeof updateReviewSupplementItem === 'function' ? updateReviewSupplementItem : window.updateReviewSupplementItem;
  window.addReviewSupplementItem = typeof addReviewSupplementItem === 'function' ? addReviewSupplementItem : window.addReviewSupplementItem;
  window.removeReviewSupplementItem = typeof removeReviewSupplementItem === 'function' ? removeReviewSupplementItem : window.removeReviewSupplementItem;
  window.updateReviewTherapyMedication = typeof updateReviewTherapyMedication === 'function' ? updateReviewTherapyMedication : window.updateReviewTherapyMedication;
  window.addReviewTherapyMedication = typeof addReviewTherapyMedication === 'function' ? addReviewTherapyMedication : window.addReviewTherapyMedication;
  window.removeReviewTherapyMedication = typeof removeReviewTherapyMedication === 'function' ? removeReviewTherapyMedication : window.removeReviewTherapyMedication;
  window.updateReviewExamRecord = typeof updateReviewExamRecord === 'function' ? updateReviewExamRecord : window.updateReviewExamRecord;
  window.addReviewExamRecord = typeof addReviewExamRecord === 'function' ? addReviewExamRecord : window.addReviewExamRecord;
  window.removeReviewExamRecord = typeof removeReviewExamRecord === 'function' ? removeReviewExamRecord : window.removeReviewExamRecord;
  window.cancelCurrentImportReview = typeof cancelCurrentImportReview === 'function' ? cancelCurrentImportReview : window.cancelCurrentImportReview;
  window.buildCanonicalProgram = buildCanonicalProgram;
  window.validateCanonicalProgram = validateCanonicalProgram;
  window.evaluateSimpleExcelFormula = typeof evaluateSimpleExcelFormula !== 'undefined' ? evaluateSimpleExcelFormula : null;
  window.recalcTrainingLoadsFromCells = typeof recalcTrainingLoadsFromCells !== 'undefined' ? recalcTrainingLoadsFromCells : null;
}

// The review callbacks themselves are declared in web/index.base.html and,
// being the later declaration in the same script, are the ones that run.
// The copies that used to sit here were dead the moment they were written.
// Only the state object and the window bindings belong in this bundle.

`;

fs.writeFileSync('prepare_task20_import_engine.mjs', cleanImport + '\n\n' + reviewCallbacks, 'utf8');
console.log('✅ prepare_task20_import_engine.mjs generated successfully!');
