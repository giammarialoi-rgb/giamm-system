import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

['openSkipModal', 'openReplacementModal', 'speakCoachReply', 'confirmProgramImport'].forEach(fn => {
  const idx = html.indexOf('function ' + fn);
  if (idx !== -1) {
    console.log('=== ' + fn + ' ===');
    console.log(html.slice(idx, idx + 600) + '\n');
  }
});
