import fs from 'fs';

let webHtml = fs.readFileSync('web/index.html', 'utf8').replace(/\r\n/g, '\n');

// 1. Ensure `var DATA = null;` exists at the start of app state variables
if (!webHtml.includes('var DATA = null;')) {
  webHtml = webHtml.replace('let store = loadStore();', 'var DATA = null;\nlet store = loadStore();');
}

// 2. Fix normalizeProgram DATA check
webHtml = webHtml.replace(
  'program.exerciseDb = (DATA && DATA.exerciseDb) || candidate.exerciseDb || {};',
  'program.exerciseDb = (typeof DATA !== "undefined" && DATA && DATA.exerciseDb) || (typeof window !== "undefined" && window.DATA && window.DATA.exerciseDb) || candidate.exerciseDb || {};'
);

fs.writeFileSync('web/index.html', webHtml, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', webHtml, 'utf8');

console.log('Fixed DATA declaration and normalizeProgram safely!');
