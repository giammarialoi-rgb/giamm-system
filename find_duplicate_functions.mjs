import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

const fnMatches = Array.from(html.matchAll(/(?:function\s+([A-Za-z0-9_$]+)|(?:var|let|const)\s+([A-Za-z0-9_$]+)\s*=\s*(?:function|\([^)]*\)\s*=>))/g));
const fnCounts = new Map();
fnMatches.forEach(m => {
  const name = m[1] || m[2];
  if (!name) return;
  fnCounts.set(name, (fnCounts.get(name) || 0) + 1);
});

console.log('Duplicate functions:');
for (const [name, count] of fnCounts.entries()) {
  if (count > 1) {
    console.log(`- ${name}: defined ${count} times`);
  }
}
