import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const idx = html.indexOf('validatePersistedProgram');
if (idx !== -1) {
  console.log(html.slice(idx - 100, idx + 1000));
}
