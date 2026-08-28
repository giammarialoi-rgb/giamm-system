import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const match = html.match(/function renderTraining\([^{]*\)\s*\{([\s\S]*?)\nfunction /);
const lines = match[1].split('\n');
console.log(lines.slice(30, 95).join('\n'));
