import fs from 'fs';

const content = fs.readFileSync('web/index.html', 'utf8');
const scriptMatches = [...content.matchAll(/<script(?:\s+type="text\/javascript")?>([\s\S]*?)<\/script>/gi)];
console.log('Scripts count:', scriptMatches.length);

scriptMatches.forEach((m, idx) => {
  try {
    new Function(m[1]);
    console.log(`Script ${idx} OK (length: ${m[1].length})`);
  } catch (e) {
    console.error(`Script ${idx} ERROR:`, e.message);
    const lines = m[1].split('\n');
    lines.forEach((l, i) => {
      if (i >= 35 && i <= 60) {
        console.log(`${i + 1}: ${l}`);
      }
    });
  }
});
