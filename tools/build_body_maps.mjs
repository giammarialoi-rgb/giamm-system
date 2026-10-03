// The four figures of the statistics page (man and woman, front and back)
// were drawn with every muscle in its own flat colour. This reads those
// drawings and writes, for each figure:
//
//   web/body-<sex>-<view>.png       the figure in neutral grey (shading kept, colour gone)
//   web/body-<sex>-<view>-map.png   which muscle each pixel belongs to (grey level = muscle number)
//
// so the page can light up exactly the muscle that is being talked about, in
// the colour it needs, instead of laying boxes over a rainbow.
//
//   node tools/build_body_maps.mjs            writes the files
//   node tools/build_body_maps.mjs --debug    also writes tmp-debug/body-debug.png to look at the result
//
// The drawings themselves (tools/body-source/*.png) are the coloured originals.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const SRC = path.join(ROOT, 'tools/body-source');
const OUT = path.join(ROOT, 'web');

// Muscle numbers (also in the page: BODY_MUSCLES). 0 = not a muscle (skin, hair, clothes, background).
export const MUSCLES = {
  1: 'chest', 2: 'shoulders', 3: 'biceps', 4: 'forearms', 5: 'abs', 6: 'obliques', 7: 'quads', 8: 'adductors', 9: 'calves',
  10: 'traps', 12: 'triceps', 13: 'lats', 14: 'lowerback', 15: 'glutes', 16: 'hamstrings'
};

function hsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  let h = 0;
  if (d) { if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4; h *= 60; if (h < 0) h += 360; }
  return [h, mx ? d / mx : 0, mx];
}

// Which colour family a pixel is in, or '' if it is not a muscle colour.
function family(h, s, v) {
  if (v < 0.22) return '';
  if (h >= 12 && h < 34) return s > 0.72 ? 'orange' : '';
  if (s < 0.5) return '';
  if (h >= 342 || h < 12) return 'red';
  if (h >= 312) return 'pink';
  if (h >= 34 && h < 62) return 'yellow';
  if (h >= 62 && h < 150) return 'green';
  if (h >= 165 && h < 198) return 'cyan';
  if (h >= 198 && h < 238) return 'blue';
  if (h >= 245 && h < 300) return 'purple';
  return '';
}

// The same colour is a different muscle at the top and at the bottom of the figure.
function muscleOf(fam, view, yRel) {
  // The glow on the floor is blue too: forearms end well above the knees.
  if (fam === 'blue' && yRel > 0.62) return 0;
  if (yRel > 0.95) return 0;
  if (view === 'front') {
    if (fam === 'red') return 1;
    if (fam === 'orange') return yRel < 0.5 ? 2 : 9;
    if (fam === 'yellow') return 3;
    if (fam === 'blue') return 4;
    if (fam === 'green') return 5;
    if (fam === 'cyan') return 6;
    if (fam === 'purple') return 7;
    if (fam === 'pink') return yRel < 0.36 ? 1 : 8;
    return 0;
  }
  if (fam === 'purple') return yRel < 0.36 ? 10 : 16;
  if (fam === 'orange') return yRel < 0.5 ? 2 : 9;
  if (fam === 'green') return 12;
  if (fam === 'blue') return 4;
  if (fam === 'yellow') return 13;
  if (fam === 'cyan') return 14;
  if (fam === 'red' || fam === 'pink') return 15;
  return 0;
}

// Fill the thin lines and glints inside a muscle (the drawing has fibres and highlights).
function close(mask, w, h, r) {
  const dil = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let on = 0;
    for (let dy = -r; dy <= r && !on; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < w && yy < h && mask[yy * w + xx]) { on = 1; break; }
    }
    dil[y * w + x] = on;
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let all = 1;
    for (let dy = -r; dy <= r && all; dy++) for (let dx = -r; dx <= r; dx++) {
      const xx = x + dx, yy = y + dy;
      if (xx < 0 || yy < 0 || xx >= w || yy >= h || !dil[yy * w + xx]) { all = 0; break; }
    }
    out[y * w + x] = all;
  }
  return out;
}

// A speck of colour on skin is not a muscle: keep only each muscle's real bodies.
function dropSpecks(mask, w, h, minSize) {
  const seen = new Uint8Array(w * h);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (!mask[i] || seen[i]) continue;
    const stack = [i]; const comp = []; seen[i] = 1;
    while (stack.length) {
      const p = stack.pop(); comp.push(p);
      const x = p % w, y = (p / w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx;
        if (mask[q] && !seen[q]) { seen[q] = 1; stack.push(q); }
      }
    }
    if (comp.length >= minSize) comp.forEach((p) => { out[p] = 1; });
  }
  return out;
}

async function build(sex, view) {
  const file = path.join(SRC, 'muscle-' + sex + '-' + view + '.png');
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const label = new Uint8Array(w * h);
  const grey = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    const [hue, s, v] = hsv(r, g, b);
    label[i] = muscleOf(family(hue, s, v), view, ((i / w) | 0) / h);
    // Neutral: the brightness of the pixel (not its colour), so a yellow muscle and a blue one
    // look equally lit and only the shading of the drawing is left.
    const k = 0.1 + 0.8 * Math.pow(v, 1.1);
    const c = Math.round(255 * Math.min(1, k));
    grey[i * 3] = Math.round(c * 0.97); grey[i * 3 + 1] = Math.round(c * 0.99); grey[i * 3 + 2] = Math.min(255, Math.round(c * 1.03));
  }
  // Clean each muscle, then give every pixel to one muscle only (the one it was first read as).
  const final = new Uint8Array(w * h);
  for (const id of Object.keys(MUSCLES).map(Number)) {
    let m = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) m[i] = label[i] === id ? 1 : 0;
    m = dropSpecks(m, w, h, 40);
    m = close(m, w, h, 2);
    for (let i = 0; i < w * h; i++) if (m[i] && !final[i]) final[i] = id;
  }
  for (let i = 0; i < w * h; i++) if (label[i] && !final[i] && MUSCLES[label[i]]) final[i] = 0;
  const name = 'body-' + sex[0] + '-' + view;
  await sharp(grey, { raw: { width: w, height: h, channels: 3 } }).png({ compressionLevel: 9, palette: false }).toFile(path.join(OUT, name + '.png'));
  await sharp(Buffer.from(final), { raw: { width: w, height: h, channels: 1 } }).png({ compressionLevel: 9 }).toFile(path.join(OUT, name + '-map.png'));
  return { name, w, h, final, grey };
}

const results = [];
for (const sex of ['male', 'female']) for (const view of ['front', 'back']) results.push(await build(sex, view));

if (process.argv.includes('--debug')) {
  const palette = { 1: [229, 57, 53], 2: [255, 152, 0], 3: [253, 216, 53], 4: [30, 136, 229], 5: [102, 187, 106], 6: [0, 188, 212], 7: [126, 87, 194], 8: [233, 30, 99], 9: [255, 112, 67], 10: [171, 71, 188], 12: [139, 195, 74], 13: [255, 235, 59], 14: [38, 198, 218], 15: [216, 27, 96], 16: [94, 53, 177] };
  const W = results[0].w, H = results[0].h;
  const sheet = Buffer.alloc(W * results.length * 2 * H * 3);
  results.forEach((r, n) => {
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const g = r.grey[i * 3];
      const o1 = (y * W * results.length * 2 + n * 2 * W + x) * 3;
      sheet[o1] = g; sheet[o1 + 1] = g; sheet[o1 + 2] = g;
      const m = r.final[i];
      const o2 = o1 + W * 3;
      const c = palette[m];
      if (c) { sheet[o2] = c[0]; sheet[o2 + 1] = c[1]; sheet[o2 + 2] = c[2]; } else { sheet[o2] = g * 0.4; sheet[o2 + 1] = g * 0.4; sheet[o2 + 2] = g * 0.4; }
    }
  });
  fs.mkdirSync(path.join(ROOT, 'tmp-debug'), { recursive: true });
  await sharp(sheet, { raw: { width: W * results.length * 2, height: H, channels: 3 } }).png().toFile(path.join(ROOT, 'tmp-debug/body-debug.png'));
}
console.log('written: ' + results.map((r) => r.name).join(', '));
