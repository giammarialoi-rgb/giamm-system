import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const lines = html.split('\n');

console.log('=== Lines 1-150 ===');
console.log(lines.slice(0, 150).join('\n'));

console.log('=== Lines 5780-6000 ===');
console.log(lines.slice(5780, 6000).join('\n'));

console.log('=== Lines 6700 to end ===');
console.log(lines.slice(6700).join('\n'));
