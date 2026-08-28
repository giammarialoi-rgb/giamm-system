import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

const rsIdx = html.indexOf('function renderStats(');
console.log('renderStats context:');
console.log(html.slice(rsIdx, rsIdx + 1200));

const rsdIdx = html.indexOf('function renderStatsData(');
console.log('\nrenderStatsData context:');
console.log(html.slice(rsdIdx, rsdIdx + 1200));
