import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

// Find all function declarations
const fnRegex = /function\s+([a-zA-Z0-9_$]+)\s*\(/g;
const functions = [];
let match;
while ((match = fnRegex.exec(html)) !== null) {
  functions.push(match[1]);
}

// Find all DOM IDs
const idRegex = /id=["']([a-zA-Z0-9_$-]+)["']/g;
const domIds = new Set();
while ((match = idRegex.exec(html)) !== null) {
  domIds.add(match[1]);
}

// Find render function names
const renderFns = functions.filter(f => f.startsWith('render'));

console.log('Total functions found:', functions.length);
console.log('Render functions found:', renderFns);
console.log('DOM IDs found count:', domIds.size);

// Check navigate function implementation
const navMatch = html.match(/function navigate\s*\([^\)]*\)\s*\{([\s\S]*?)\n\}/);
if (navMatch) {
  console.log('Navigate implementation snippet:\n', navMatch[0].slice(0, 500));
}

// Check render function implementation
const mainRender = html.match(/function render\s*\([^\)]*\)\s*\{([\s\S]*?)\n\}/);
if (mainRender) {
  console.log('Main render implementation snippet:\n', mainRender[0].slice(0, 1000));
}
