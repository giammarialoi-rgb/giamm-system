import fs from 'fs';

const base = fs.readFileSync('web/index.base.html', 'utf8');
fs.writeFileSync('web/index.html', base, 'utf8');
fs.writeFileSync('app/src/main/assets/index.html', base, 'utf8');
console.log('Synced web/index.base.html -> web/index.html & assets/index.html');
