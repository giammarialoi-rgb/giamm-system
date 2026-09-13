import fs from 'fs';

let content = fs.readFileSync('universal-import-engine.mjs', 'utf8');

// Replace targetLoadNum in continuation branch
content = content.replace(
  'const targetLoadNum = loadVal ? parseFloat(loadVal.replace(/[^0-9.]/g, "")) : currentExercise.sets[0]?.target_load;',
  'const parsedContLoad = loadVal ? parseFloat(loadVal.replace(/[^0-9.]/g, "")) : null;\n      const targetLoadNum = (parsedContLoad !== null && !isNaN(parsedContLoad)) ? parsedContLoad : (currentExercise.sets[0]?.target_load || null);'
);

// Replace targetLoadNum in new exercise branch
content = content.replace(
  'const targetLoadNum = loadVal ? parseFloat(loadVal.replace(/[^0-9.]/g, "")) : details.load_value;',
  'const parsedNewLoad = loadVal ? parseFloat(loadVal.replace(/[^0-9.]/g, "")) : null;\n      const targetLoadNum = (parsedNewLoad !== null && !isNaN(parsedNewLoad)) ? parsedNewLoad : (details.load_value || null);'
);

fs.writeFileSync('universal-import-engine.mjs', content, 'utf8');
console.log('Successfully patched universal-import-engine.mjs with NaN-free load parsing!');
