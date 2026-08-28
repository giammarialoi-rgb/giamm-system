import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

function extractFunction(name) {
  const regex = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\([^{]*\\)\\s*\\{`);
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

console.log(extractFunction('askAI'));
console.log('--- applyCoachProposal ---');
console.log(extractFunction('applyCoachProposal'));
