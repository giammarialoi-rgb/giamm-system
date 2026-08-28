import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
const script = scriptMatches[1][1];
const lines = script.split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].startsWith('// =') && lines[i+1] && !lines[i+1].startsWith('// =')) {
    console.log(`Line ${i+1}: ${lines[i+1]} (next: ${lines[i+2] || ''})`);
  }
}
