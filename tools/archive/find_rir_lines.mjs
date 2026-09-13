import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const lines = html.split('\n');

// Find all occurrences of "function rirToRpe"
lines.forEach((line, idx) => {
  if (line.includes('function rirToRpe')) {
    console.log(`Found rirToRpe at line ${idx + 1}`);
  }
});
