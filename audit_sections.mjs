import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const lines = html.split('\n');
console.log('Total lines in web/index.html:', lines.length);

lines.forEach((line, idx) => {
  const trimmed = line.trim();
  if (trimmed.startsWith('// ====================') || 
      trimmed.startsWith('// ---') || 
      trimmed.startsWith('<!-- ===') ||
      trimmed.includes('MASTER TASK') ||
      trimmed.startsWith('/* ===')) {
    console.log(`L${idx + 1}: ${trimmed}`);
  }
});
