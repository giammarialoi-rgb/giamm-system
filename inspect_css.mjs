import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
if (styleMatch) {
  console.log(styleMatch[1].slice(0, 2000));
}
