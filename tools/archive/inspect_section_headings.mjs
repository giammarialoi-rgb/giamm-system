import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const lines = html.split('\n');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();
  if (line.startsWith('// ===') || line.startsWith('<!-- ===') || line.startsWith('/* ===')) {
    const context = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 5)).map((l, j) => `L${i - 1 + j + 1}: ${l}`).join('\n');
    console.log(context);
    console.log('--------------------------------------------------');
    i += 4;
  }
}
