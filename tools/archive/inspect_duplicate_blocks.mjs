import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const lines = html.split('\n');

console.log('Lines 2790-2860:');
console.log(lines.slice(2790, 2860).join('\n'));

console.log('\nLines 3020-3060:');
console.log(lines.slice(3020, 3060).join('\n'));

console.log('\nLines 3215-3250:');
console.log(lines.slice(3215, 3250).join('\n'));
