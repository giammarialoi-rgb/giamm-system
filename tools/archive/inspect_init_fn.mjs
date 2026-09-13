import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const idx = html.indexOf('function init(');
if (idx !== -1) {
  console.log(html.slice(idx, idx + 1500));
}
