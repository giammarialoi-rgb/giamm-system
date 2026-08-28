import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

function extractVariable(name) {
  const regex = new RegExp(`(?:var|let|const)\\s+${name}\\s*=\\s*\\{`);
  const match = regex.exec(html);
  if (!match) return `Variable ${name} not found`;
  let start = match.index + match[0].length - 1;
  let depth = 1;
  let end = start + 1;
  while (depth > 0 && end < html.length) {
    if (html[end] === '{') depth++;
    else if (html[end] === '}') depth--;
    end++;
  }
  return html.slice(match.index, end);
}

console.log('=== store definition ===');
console.log(extractVariable('store'));
