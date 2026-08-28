import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

const match = html.match(/function renderTraining\([^{]*\)\s*\{([\s\S]*?)\nfunction /);
if (match) {
  console.log('renderTraining total length:', match[0].length);
  // find where sets are rendered
  const setRenderPart = match[0].slice(match[0].indexOf('for(let s=1;'), match[0].indexOf('for(let s=1;') + 1500);
  console.log('Set render part:\n', setRenderPart);
}
