import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

const targets = [
  'canonicalToData', 'dataToCanonical', 'SkipModal', 'saveSkip', 'ReplacementModal', 'applyExercise',
  'resetTimer', 'speak', 'Epley', 'Volume', 'confirmAndActivate', 'activateProgram'
];

targets.forEach(t => {
  const matches = Array.from(html.matchAll(new RegExp(`(?:function|var|let|const)\\s+([A-Za-z0-9_$]*${t}[A-Za-z0-9_$]*)`, 'gi'))).map(m => m[1]);
  console.log(`Matches for '${t}':`, [...new Set(matches)]);
});
