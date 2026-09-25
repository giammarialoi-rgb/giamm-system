// Nothing of the owner's own account in what every user downloads.
//
// A new account (Apple, "noleggio spiaggia rosa") opened the Coach unlock and
// found "Giammaria Loi" as the card holder; a new account was also offered
// the owner's 16-week plan. This test reads what ships to every user - the
// web app, the pages and data next to it, the server's prompts and outgoing
// requests - and fails on the owner's name anywhere except the internal
// identifiers listed below, which nobody sees.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}

// Internal names: storage, the Android package and link scheme, the id of
// the owner's own backup (served only to that account). Never on screen.
const ALLOWED = [
  /GiammariaPersistence/g,
  /GIAMMARIA_SYSTEM_DB/g,
  /GiammariaWebView/g,
  /giammaria:\/\//g,
  /com\.giammaria\.system/g,
  /personal_16w_giammaria/g,
  /\/personalizzat\|giammaria\|personale\|master\|mia scheda\/i/g, // scoring of restore candidates by title
  /Giada→Giammaria leak/g, // a comment about a past bug
  /giammaria-doc-/g // temp folder name on the server
];

function leftovers(file) {
  let text = fs.readFileSync(path.join(root, file), 'utf8');
  ALLOWED.forEach((re) => { text = text.replace(re, ''); });
  const hits = [];
  const re = /.{0,40}(giammaria|\bLoi\b|giammaria\.loi@|82[.,]4 ?kg).{0,40}/gi;
  let m;
  while ((m = re.exec(text))) hits.push(m[0].replace(/\s+/g, ' ').trim());
  return hits;
}

const shipped = [
  'web/index.base.html',
  ...fs.readdirSync(path.join(root, 'web'))
    .filter((f) => /\.(js|json|webmanifest|html|css)$/.test(f) && f !== 'index.html')
    .map((f) => 'web/' + f),
  'admin/index.html',
  'admin/admin.js',
  'coach-api.mjs',
  'coach-practice.mjs',
  'server/food/index.mjs'
].filter((f) => fs.existsSync(path.join(root, f)));

console.log('');
console.log('--- il nome del proprietario non e\' in quello che scarica chiunque ---');
shipped.forEach((file) => {
  const hits = leftovers(file);
  ok(file + (hits.length ? ' -- ' + hits.slice(0, 3).join(' | ') : ''), hits.length === 0);
});

console.log('');
console.log('--- i casi trovati, uno per uno ---');
{
  const ui = fs.readFileSync(path.join(root, 'web/coach-practice-ui.js'), 'utf8');
  const unlock = ui.slice(ui.indexOf('function showDemoUnlock()'), ui.indexOf('async function confirmDemoUnlock()'));
  ok('sblocco Coach: l\'intestatario della carta demo e\' chi ha fatto l\'accesso',
    /const holder = String\(\(store\.accountUser && \(store\.accountUser\.name \|\| store\.accountUser\.email\)\) \|\| ''\)\.trim\(\);/.test(unlock) &&
    /<label>Intestatario<\/label><input value="' \+ esc\(holder\) \+ '" readonly>/.test(unlock));
  const api = fs.readFileSync(path.join(root, 'coach-api.mjs'), 'utf8');
  ok('il Coach AI si presenta come assistente dell\'app Nurvan', /all'interno dell'app Nurvan\./.test(api));
  const food = fs.readFileSync(path.join(root, 'server/food/index.mjs'), 'utf8');
  ok('le richieste al catalogo alimenti si firmano Nurvan', (food.match(/'Nurvan\/1\.0 \(fitness-app\)'/g) || []).length === 3);
  const page = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  ok('un programma esportato senza titolo si chiama nurvan_programma', /'nurvan_programma'\)\.replace/.test(page));
  ok('il backup personale arriva solo dal server, all\'account a cui appartiene', /accountRequest\('\/api\/account\/personal-backup'/.test(page) && !fs.existsSync(path.join(root, 'web/personal-recovery-16w.json')));
}

console.log('');
if (failed) { console.log(failed + ' residui del profilo personale trovati.'); process.exit(1); }
console.log('Nessun residuo del profilo personale in quello che scarica chiunque.');
