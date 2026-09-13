import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const idx = html.indexOf('function renderTraining(');
console.log(html.slice(idx, idx + 4000));
