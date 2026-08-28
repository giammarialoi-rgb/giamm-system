import fs from 'fs';

let html = fs.readFileSync('web/index.html', 'utf8').replace(/\r\n/g, '\n');
const target = "let DATA=null, currentView='home', currentWeek=1, currentDay=0, accountRegisterMode=false, accountSyncTimer=null;";
const replacement = target + `\nif (typeof window !== 'undefined') {
  try {
    Object.defineProperty(window, 'DATA', {
      get: () => DATA,
      set: (v) => { DATA = v; },
      configurable: true
    });
  } catch (e) {
    window.DATA = DATA;
  }
}`;

if (html.includes(target) && !html.includes("Object.defineProperty(window, 'DATA'")) {
  html = html.replace(target, replacement);
  fs.writeFileSync('web/index.html', html, 'utf8');
  fs.writeFileSync('app/src/main/assets/index.html', html, 'utf8');
  console.log('Successfully bound window.DATA property!');
} else {
  console.log('Target found or already updated.');
}
