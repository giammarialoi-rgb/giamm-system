import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

const match = html.match(/\/\/ LAYER 2: APPLICATION SERVICES DEFINITIONS[\s\S]*?init\(\);/);
if (match) {
  console.log('Layer 2 & 5 definitions length:', match[0].length);
  console.log(match[0].slice(0, 3000));
  console.log('\n--- NEXT 3000 ---');
  console.log(match[0].slice(3000, 6000));
}
