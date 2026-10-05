// The Android launcher icon (and the system splash, which is drawn from it) is the N of the logo, not the old
// picture; the themed icon has its own white shape.
import fs from 'node:fs';
import sharp from 'sharp';

let failed = 0;
function ok(message, value) {
  if (value) { console.log('OK   ' + message); return; }
  failed++;
  console.log('FAIL ' + message);
}
const logo = await sharp('app/src/main/res/drawable/logo.png').metadata();
ok('1a. the icon foreground is square (the old picture was 635x320)', logo.width === logo.height && logo.width >= 432);
const a = await sharp('app/src/main/res/drawable/logo.png').resize(64, 64).raw().toBuffer();
const b = await sharp('web/nurvan_logo.png').resize(64, 64).flatten({ background: '#080808' }).raw().toBuffer();
let diff = 0; for (let i = 0; i < a.length; i++) diff += Math.abs(a[i] - b[i]);
ok('1b. and it is the logo of the site and of iOS', diff / a.length < 6);
const mono = await sharp('app/src/main/res/drawable/logo_mono.png').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
let opaque = 0, transparent = 0;
for (let i = 3; i < mono.data.length; i += 4) { if (mono.data[i] > 200) opaque++; else if (mono.data[i] < 20) transparent++; }
ok('1c. the themed icon is a shape: some opaque, most transparent', opaque > 2000 && transparent > opaque);
for (const f of ['app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml', 'app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml', 'app/src/main/res/mipmap-anydpi/ic_launcher.xml', 'app/src/main/res/mipmap-anydpi/ic_launcher_round.xml']) {
  const x = fs.readFileSync(f, 'utf8');
  ok('2. ' + f.split('/').pop() + ' (' + f.split('/')[4] + '): foreground and themed icon', /@drawable\/logo"/.test(x) && /@drawable\/logo_mono"/.test(x));
}
if (failed) { console.log('\n' + failed + ' FAIL'); process.exit(1); }
console.log('\nIcona Android: il logo Nurvan.');
