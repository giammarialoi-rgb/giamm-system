// Every function a button calls (onclick="name(...)") has to be reachable
// from the page (checked on the built page, web/index.html: the build hands
// over some of them too). The app's script keeps its functions to itself and hands the
// page the ones it names (window.name = name): one that is written in a
// button and never handed over makes a button that does nothing, with no
// error anyone sees. "Azzera archivio" and the diet choice were like that.
import fs from 'node:fs';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const files = ['web/index.base.html', 'web/index.html'].concat(fs.readdirSync('web').filter((f) => /\.js$/.test(f) && !/\.min\.js$/.test(f)).map((f) => 'web/' + f));
const text = {};
files.forEach((f) => { text[f] = fs.readFileSync(f, 'utf8'); });
const all = Object.values(text).join('\n');

const names = new Set();
const re = /\bon(?:click|change|input|submit|keydown|keyup|blur|focus|touchstart|touchend|pointerdown)\s*=\s*\\?["']\s*(?:return\s+)?([A-Za-z_$][\w$]*)\s*\(/g;
for (const f of ['web/index.base.html', 'web/coach-practice-ui.js']) {
  let m;
  while ((m = re.exec(text[f]))) names.add(m[1]);
}
const skip = new Set(['if', 'event', 'alert', 'confirm', 'setTimeout', 'function', 'void', 'clearTimeout']);
const esc = (s) => s.replace(/[$]/g, '\\$');
const missing = [...names].filter((n) => !skip.has(n)).filter((n) => {
  const handed = new RegExp('(?:window|root|global|self)\\.' + esc(n) + '\\s*=').test(all) || new RegExp('(?:window|root)\\[[\'"]' + esc(n) + '[\'"]\\]\\s*=').test(all);
  return !handed;
}).sort();

ok('1. le funzioni chiamate dai pulsanti sono tante (' + names.size + '): il controllo le vede', names.size > 500);
ok('2. ognuna è resa disponibile alla pagina' + (missing.length ? ' — mancano: ' + missing.join(', ') : ''), missing.length === 0);

console.log('');
if (failed) { console.log(failed + ' controlli dei pulsanti falliti.'); process.exit(1); }
console.log('Tutti i controlli dei pulsanti passano.');
