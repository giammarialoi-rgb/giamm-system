import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
const script = scriptMatches[1][1];

const lines = script.split('\n');
console.log('Main script lines:', lines.length);

const headers = [];
lines.forEach((l, i) => {
  if (l.startsWith('// =') || l.startsWith('// LAYER') || l.startsWith('// ---') || l.startsWith('/* ===')) {
    headers.push({ line: i + 1, text: l });
  }
});

console.log('Headers in script:');
headers.forEach(h => console.log(`Line ${h.line}: ${h.text}`));
