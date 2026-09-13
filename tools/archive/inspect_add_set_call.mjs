import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const idx = html.indexOf('addSetToExercise');
console.log('Context where addSetToExercise is called:');
const matches = Array.from(html.matchAll(/addSetToExercise\([^)]*\)/g));
matches.forEach(m => console.log(m[0]));

const idx2 = html.indexOf('+ SERIE');
if (idx2 !== -1) {
  console.log(html.slice(idx2 - 100, idx2 + 200));
}
