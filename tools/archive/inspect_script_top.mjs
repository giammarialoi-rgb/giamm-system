import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const scriptMatches = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)];
const script = scriptMatches[1][1];
const lines = script.split('\n');

console.log('Lines 1-50:');
console.log(lines.slice(0, 50).join('\n'));

console.log('\nSearch for function declarations in lines 1-2300:');
const fns = [];
for (let i = 0; i < 2300 && i < lines.length; i++) {
  const m = lines[i].match(/(?:async\s+)?function\s+([a-zA-Z0-9_$]+)\s*\(/);
  if (m) fns.push({ line: i + 1, name: m[1] });
}
console.log('Found functions in lines 1-2300:', fns);
