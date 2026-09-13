import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

const setFns = ['addWorkoutSet', 'deleteWorkoutSet', 'updateSetLoad', 'updateSetReps', 'updateSetRir', 'toggleSetDone', 'renderTraining'];
setFns.forEach(fn => {
  const idx = html.indexOf('function ' + fn);
  if (idx !== -1) {
    console.log('=== ' + fn + ' ===');
    console.log(html.slice(idx, idx + 800) + '\n');
  } else {
    console.log('=== ' + fn + ' NOT FOUND ===');
  }
});
