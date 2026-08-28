import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

const aiInputPos = html.indexOf('id="ai-input"');
if (aiInputPos !== -1) {
  console.log('ai-input snippet:\n', html.slice(Math.max(0, aiInputPos - 200), aiInputPos + 300));
}
