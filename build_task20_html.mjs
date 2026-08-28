// build_task20_html.mjs
import fs from 'fs';
import path from 'path';

console.log("Assembling Task 20 HTML...");

// Read current web/index.html to extract tested Universal Import Engine section
const currentHtml = fs.readFileSync(path.resolve('web/index.html'), 'utf8');

// Find Universal Import Engine markers
const importEngineStartMarker = "// ====================================================\n// TASK 14/15/16: CLIENT-SIDE UNIVERSAL IMPORT ENGINE 2.1\n// ====================================================";
const importEngineEndMarker = "// ====================================================\n// PROGRAM MANAGEMENT & LIBRARY VIEW\n// ====================================================";

const startIdx = currentHtml.indexOf(importEngineStartMarker);
const endIdx = currentHtml.indexOf(importEngineEndMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error("Could not find Universal Import Engine markers in current web/index.html");
  process.exit(1);
}

const importEngineCode = currentHtml.substring(startIdx, endIdx);
console.log(`Extracted Universal Import Engine (${importEngineCode.length} chars).`);

// Save modular components
fs.writeFileSync('test-artifacts/import-engine-client-extracted.js', importEngineCode);
console.log("Saved extracted import engine for build.");
