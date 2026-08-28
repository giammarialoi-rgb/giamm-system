import fs from 'fs';

const html = fs.readFileSync('web/index.html', 'utf8');

const matches = Array.from(html.matchAll(/(?:function|validate)[A-Za-z0-9_$]*/g)).map(m => m[0]);
console.log('Matches with validate:', [...new Set(matches.filter(m => m.toLowerCase().includes('validate')))]);

const saveProgIdx = html.indexOf('saveProgram');
if (saveProgIdx !== -1) {
  console.log(html.slice(saveProgIdx - 200, saveProgIdx + 800));
}
