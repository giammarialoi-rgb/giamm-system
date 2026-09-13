import fs from 'fs';

let content = fs.readFileSync('apply_web_update.mjs', 'utf8');
const search = `  return { program, canonicalProgram: program, warnings, errors, stats };
}

// ====================================================
// IMPORT REVIEW INTERACTIVE CONTROLLERS & CALLBACKS (2.1)`;

const replacement = `  return { program, canonicalProgram: program, warnings, errors, stats };
}

if (typeof window !== "undefined") {
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

// ====================================================
// IMPORT REVIEW INTERACTIVE CONTROLLERS & CALLBACKS (2.1)`;

content = content.replace(search, replacement);
fs.writeFileSync('apply_web_update.mjs', content, 'utf8');
console.log("apply_web_update.mjs successfully updated with GiammariaUniversalImport!");
