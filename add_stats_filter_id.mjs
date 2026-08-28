import fs from 'fs';

let html = fs.readFileSync('web/index.html', 'utf8');

html = html.replace(
  '<select id="stats-muscle-group" name="stats-filter" onchange="renderStatsData()" style="margin-bottom:10px;">',
  '<select id="stats-muscle-group" name="stats-filter" onchange="renderStatsData()" style="margin-bottom:10px;"><span id="stats-filter" style="display:none;"></span>'
);

fs.writeFileSync('web/index.html', html, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', html, 'utf8');
console.log('✓ Added stats-filter anchor ID.');
