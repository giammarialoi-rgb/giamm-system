import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

function extractFunction(name) {
  const regex = new RegExp(`function\\s+${name}\\s*\\([^{]*\\)\\s*\\{`);
  const match = regex.exec(html);
  if (!match) return `Function ${name} not found`;
  let start = match.index + match[0].length;
  let depth = 1;
  let end = start;
  while (depth > 0 && end < html.length) {
    if (html[end] === '{') depth++;
    else if (html[end] === '}') depth--;
    end++;
  }
  return html.slice(match.index, end);
}

console.log('=== renderHome ===');
console.log(extractFunction('renderHome').slice(0, 800));

console.log('=== renderPrograms ===');
console.log(extractFunction('renderPrograms').slice(0, 800));

console.log('=== renderImport ===');
console.log(extractFunction('renderImport').slice(0, 800));

console.log('=== renderDb ===');
console.log(extractFunction('renderDb').slice(0, 800));
