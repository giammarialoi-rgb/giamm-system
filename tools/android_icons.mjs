// Android launcher icon and system splash: made from web/nurvan_logo.png (the N), the same mark as iOS and the site.
//
//   node tools/android_icons.mjs
//
// Writes app/src/main/res/drawable/logo.png (adaptive foreground, 432 px = 108 dp at xxxhdpi) and
// app/src/main/res/drawable/logo_mono.png (the N in white on transparent, for the themed icon of Android 13+).
// The adaptive background colour is app/src/main/res/values/colors.xml (ic_launcher_background).
// Android 12+ draws the system splash from the launcher icon, so this is the splash too.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const src = path.join(root, 'web/nurvan_logo.png');
const out = path.join(root, 'app/src/main/res/drawable');
const SIZE = 432;

// the foreground: the logo as it is (its own black background matches the icon background)
await sharp(src).resize(SIZE, SIZE).flatten({ background: '#080808' }).png({ compressionLevel: 9 }).toFile(path.join(out, 'logo.png'));

// the monochrome: brightness of the N becomes the opacity of a white shape
const { data, info } = await sharp(src).resize(SIZE, SIZE).greyscale().raw().toBuffer({ resolveWithObject: true });
const rgba = Buffer.alloc(info.width * info.height * 4);
for (let i = 0; i < info.width * info.height; i++) {
  const lum = data[i];
  const a = Math.max(0, Math.min(255, Math.round((lum - 28) * 255 / (170 - 28))));
  rgba[i * 4] = 255; rgba[i * 4 + 1] = 255; rgba[i * 4 + 2] = 255; rgba[i * 4 + 3] = a;
}
await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(path.join(out, 'logo_mono.png'));
console.log('drawable/logo.png and drawable/logo_mono.png written (' + SIZE + 'x' + SIZE + ')');
