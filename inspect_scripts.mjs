import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const scriptMatches = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)];
console.log('Total script tags:', scriptMatches.length);
scriptMatches.forEach((m, idx) => {
  console.log(`Script ${idx}: length ${m[1].length}, has GiammariaPersistence: ${m[1].includes('GiammariaPersistence')}`);
  if (m[1].length < 200) {
    console.log(`  Source/Content: ${m[0]}`);
  }
});
