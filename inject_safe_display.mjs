import fs from 'fs';

let html = fs.readFileSync('web/index.html', 'utf8').replace(/\r\n/g, '\n');

const safeDisplayValueCode = `
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

const oldBlock = `if (typeof window !== "undefined") {
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
}`;

if (html.includes(oldBlock)) {
  html = html.replace(oldBlock, safeDisplayValueCode.trim());
  fs.writeFileSync('web/index.html', html, 'utf8');
  fs.writeFileSync('app/src/main/assets/index.html', html, 'utf8');
  console.log('Successfully injected safeDisplayValue and global window bindings!');
} else {
  console.log('oldBlock not found in exact form');
}
