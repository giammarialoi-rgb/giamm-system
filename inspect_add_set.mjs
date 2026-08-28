import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const matches = Array.from(html.matchAll(/(?:addSetToExercise|addSet|addWorkoutSet|add_set)/g));
console.log('Matches for addSet:', matches.map(m => m[0]));

const idx = html.indexOf('addSetToExercise');
if (idx !== -1) {
  console.log(html.slice(idx - 100, idx + 400));
} else {
  console.log('addSetToExercise not found!');
}
