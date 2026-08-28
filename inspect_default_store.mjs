import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

const match = html.match(/const DEFAULT_STORE\s*=\s*\{([\s\S]*?)\n\};/);
if (match) {
  console.log('DEFAULT_STORE:\n', match[0]);
}
