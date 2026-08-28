import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
const script = scriptMatches[1][1];
const lines = script.split('\n');

const fns = [];
for (let i = 5000; i < lines.length; i++) {
  const m = lines[i].match(/(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/);
  if (m) fns.push({ line: i + 1, name: m[1] });
}
console.log('Found functions in lines 5000-end:', fns);
