import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');
const scriptIdx = html.indexOf('<script>');
console.log('Script starts at index:', scriptIdx);
console.log(html.slice(scriptIdx, scriptIdx + 1200));
