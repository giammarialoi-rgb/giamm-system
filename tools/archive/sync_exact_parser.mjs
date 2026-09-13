import fs from 'fs';

// 1. Read universal-import-engine.mjs and rir-rpe-engine.mjs
const uieContent = fs.readFileSync('universal-import-engine.mjs', 'utf8');
const rirContent = fs.readFileSync('rir-rpe-engine.mjs', 'utf8');

// Extract rir functions
let rirCode = rirContent
  .replace(/^import\s+[^;\n]+;?/gm, '')
  .replace(/^export\s+(async\s+)?(function|const|let|var)\s+/gm, '$1$2 ');

// Strip "import ... from ...;" statements
let clientParserCode = uieContent.replace(/^import\s+[^;\n]+;?/gm, '');

// Strip "export " so it can run directly in the global scope of browser
clientParserCode = clientParserCode.replace(/^export\s+(async\s+)?(function|const|let|var)\s+/gm, '$1$2 ');

// Combine rir helpers + parser code + safeDisplayValue + window exports
let fullInjectedBlock = `
// ====================================================
// RIR / RPE ENGINE CORE HELPERS
// ====================================================
${rirCode}

// ====================================================
// UNIVERSAL IMPORT ENGINE 2.1
// ====================================================
${clientParserCode}

function safeDisplayValue(val, fallback = '') {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') return String(val);
  if (Array.isArray(val)) {
    return val.map(item => safeDisplayValue(item)).filter(Boolean).join(', ');
  }
  if (typeof val === 'object') {
    if (val.food) return \`\${val.food} \${val.quantity || ''} \${val.unit || ''}\`.trim();
    if (val.name) return \`\${val.name} \${val.dose || ''} \${val.timing || ''}\`.trim();
    if (val.item_name) return \`\${val.item_name}: \${val.value || ''}\`.trim();
    if (val.parameter) return \`\${val.parameter}: \${val.value || ''} \${val.unit || ''}\`.trim();
    if (val.message) return val.message;
    if (val.line_content) return val.line_content;
    return Object.values(val).map(v => safeDisplayValue(v)).filter(Boolean).join(' - ');
  }
  return String(val);
}

if (typeof window !== "undefined") {
  window.rirToRpe = rirToRpe;
  window.rpeToRir = rpeToRir;
  window.validateRir = validateRir;
  window.validateRpe = validateRpe;
  window.safeDisplayValue = safeDisplayValue;
  window.parseStructuredWorkbook = parseStructuredWorkbook;
  window.parseCanonicalProgramFromText = parseCanonicalProgramFromText;
  window.parseNutritionSheet = parseNutritionSheet;
  window.parseSupplementationSheet = parseSupplementationSheet;
  window.parseTherapyExamsSheet = parseTherapyExamsSheet;
  window.startProgramImportAnalysis = startProgramImportAnalysis;
  window.confirmImportAndActivate = confirmImportAndActivate;
  window.GiammariaUniversalImport = {
    parseStructuredWorkbook,
    parseCanonicalProgramFromText,
    parseNutritionSheet,
    parseSupplementationSheet,
    parseTherapyExamsSheet,
    classifySheetType,
    normalizeExerciseName,
    parseExerciseDetails,
    EXERCISE_DICTIONARY
  };
}
`;

// Read web/index.html
let webHtml = fs.readFileSync('web/index.html', 'utf8').replace(/\r\n/g, '\n');

const startMarkerIdx = webHtml.indexOf("EXERCISE_DICTIONARY = [");
if (startMarkerIdx === -1) {
  console.error("Start marker not found!");
  process.exit(1);
}
// find start of line
const startIdx = webHtml.lastIndexOf("\n", startMarkerIdx) + 1;

const endMarker = "// ====================================================\n// IMPORT REVIEW INTERACTIVE CONTROLLERS & CALLBACKS (2.1)";
const endIdx = webHtml.indexOf(endMarker);

if (endIdx === -1) {
  console.error("End marker not found!");
  process.exit(1);
}

// Replace the parser section in webHtml
webHtml = webHtml.slice(0, startIdx) +
  fullInjectedBlock + "\n\n" +
  webHtml.slice(endIdx);

// Write to web/index.html and app/src/main/assets/index.html
fs.writeFileSync('web/index.html', webHtml, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', webHtml, 'utf8');

console.log("Successfully synchronized universal-import-engine with RIR/RPE helpers and safeDisplayValue!");
