import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

['function renderAI', 'function askAI', 'function applyCoachProposal', 'function cancelCoachProposal'].forEach(fn => {
  const idx = html.indexOf(fn);
  if (idx !== -1) {
    console.log('=== ' + fn + ' ===');
    console.log(html.slice(idx, idx + 1200) + '\n');
  } else {
    console.log('=== ' + fn + ' NOT FOUND ===');
  }
});
