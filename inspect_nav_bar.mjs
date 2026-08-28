import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const navMatch = html.match(/<nav[^>]*>([\s\S]*?)<\/nav>/i);
if (navMatch) {
  console.log(navMatch[0]);
}
