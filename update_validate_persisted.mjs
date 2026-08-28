import fs from 'fs';

let html = fs.readFileSync('web/index.html', 'utf8');

const oldSetsCount = `const sets = ex.sets || ex.sets_data || [];
          setsCount += sets.length;`;

const newSetsCount = `const sets = ex.sets || ex.sets_data || [];
          setsCount += Array.isArray(sets) ? sets.length : (typeof sets === 'number' ? sets : 1);`;

if (html.includes(oldSetsCount)) {
  html = html.replace(oldSetsCount, newSetsCount);
  console.log('✓ Updated validatePersistedProgram to support both array and numeric sets count.');
  fs.writeFileSync('web/index.html', html, 'utf8');
  fs.writeFileSync('app/src/main/assets/index.html', html, 'utf8');
}
