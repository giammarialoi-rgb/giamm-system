import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const lines = html.split('\n');

console.log('--- Lines 2850-2865 ---');
console.log(lines.slice(2850, 2865).map((l, i) => `${2851 + i}: ${l}`).join('\n'));

console.log('--- Lines 3020-3060 ---');
console.log(lines.slice(3020, 3060).map((l, i) => `${3021 + i}: ${l}`).join('\n'));

console.log('--- Lines 3215-3245 ---');
console.log(lines.slice(3215, 3245).map((l, i) => `${3216 + i}: ${l}`).join('\n'));
