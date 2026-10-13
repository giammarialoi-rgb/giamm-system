// The fonts come from Nurvan itself: loading them from Google would send the visitor's address to Google
// before any consent (Landgericht München, 20 January 2022, 3 O 17493/20). App, site, legal pages, dashboard.
import fs from 'node:fs';
import { execSync } from 'node:child_process';

let failed = 0;
function ok(message, value) {
  if (value) console.log('OK  ', message);
  else { failed += 1; console.log('FAIL', message); }
}
const tracked = execSync('git ls-files', { encoding: 'utf8' }).split('\n')
  .filter((f) => /^(web|site|admin|server)\//.test(f) && /\.(html|css|js|mjs)$/.test(f) && !/^web\/media\//.test(f));
const hits = tracked.filter((f) => /fonts\.(googleapis|gstatic)\.com/.test(fs.readFileSync(f, 'utf8')));
ok('no page or style loads fonts from Google' + (hits.length ? ' (' + hits.join(', ') + ')' : ''), hits.length === 0);
const css = fs.readFileSync('web/fonts/montserrat.css', 'utf8');
const files = [...css.matchAll(/url\(([^)]+)\)/g)].map((m) => m[1]);
ok('Montserrat is served from web/fonts, every file it names is there', files.length >= 2 && files.every((f) => fs.existsSync('web/fonts/' + f)));
ok('with its licence', fs.existsSync('web/fonts/OFL.txt') && /Open Font License/.test(fs.readFileSync('web/fonts/OFL.txt', 'utf8')));
ok('the app and the site use it', /href="fonts\/montserrat\.css"/.test(fs.readFileSync('web/index.base.html', 'utf8')) && /href="\/fonts\/montserrat\.css"/.test(fs.readFileSync('site/shell.html', 'utf8')));
ok('the Android app ships it and the web app keeps it offline', /'fonts'/.test(fs.readFileSync('sync_web_assets.mjs', 'utf8')) && /\.\/fonts\/montserrat\.css/.test(fs.readFileSync('web/sw.js', 'utf8')));
if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nFont serviti da Nurvan: tutto verde');
