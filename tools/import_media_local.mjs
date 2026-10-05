#!/usr/bin/env node
/*
 * Exercise images straight into the app, without the cloud.
 *
 *   node tools/import_media_local.mjs                       dry run on media-source/_nuove: says what it would do
 *   node tools/import_media_local.mjs --apply               writes web/media/files/*.webp and web/media/index.json,
 *                                                           copies the originals to media-source/exercises and moves
 *                                                           the imported files from _nuove to _importate
 *   node tools/import_media_local.mjs --from <dir> --only "Hundred,Roll up"
 *   node tools/import_media_local.mjs --replace             also replace an exercise that already has an image
 *
 * It does what ingest_exercise_media.mjs + bundle_exercise_media.mjs do together, minus the upload (R2) and the
 * database: the file name is mapped to the exercise with the same function the app uses (canonicalExerciseId), the
 * picture is cropped to its content, sized (master 1280 px, thumbnail 320 px, webp) and written inside the app; the
 * bundled index (web/media/index.json) gets the same manifest the server returned, with local paths only.
 * A file that does not name an exercise of the library is reported and left alone; nothing is matched by similarity.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { loadCatalogues, renderVariants } from '../ingest_exercise_media.mjs';
import { canonicalExerciseId } from '../server/media/canonical-id.mjs';

const argv = process.argv.slice(2);
const flag = (n) => argv.includes('--' + n);
const val = (n, d) => { const i = argv.indexOf('--' + n); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };
const APPLY = flag('apply');
const REPLACE = flag('replace');
const FROM = path.resolve(val('from', 'media-source/_nuove'));
const ONLY = val('only', '') ? val('only', '').split(',').map((s) => canonicalExerciseId(s.trim())) : null;
const DONE_DIR = path.resolve('media-source/_importate');
const KEEP_DIR = path.resolve('media-source/exercises');
const OUT = path.resolve('web/media');
const FILES = path.join(OUT, 'files');
const INDEX = path.join(OUT, 'index.json');

const { byExerciseId } = loadCatalogues();

// The pictures come with a START / END bar on top and a lot of white above and below the figures. The bars stay, the
// white between them and the figures goes: the same figures, shown bigger in the same slot. A picture without bars
// (one canvas with the two poses) is left to the standard crop.
async function tightenPanels(file) {
  const { data, info } = await sharp(file).removeAlpha().greyscale().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  const at = (x, y) => data[y * W + x];
  const dark = (y) => { let n = 0; for (let x = 0; x < W; x += 4) if (at(x, y) < 70) n++; return n / (W / 4); };
  let first = 0;
  while (first < 40 && dark(first) < 0.3) first++;      // the bar starts a few rows down
  if (first >= 40) return null;                         // no bar at the top: not this layout
  let bar = first;
  while (bar < Math.min(160, H) && dark(bar) > 0.2) bar++;
  if (bar - first < 20 || bar > 140) return null;
  const mid = Math.round(W / 2);
  let y0 = -1, y1 = -1;
  for (let y = bar + 6; y < H - 2; y++) {
    let any = false;
    for (let x = 0; x < W && !any; x += 2) { if (Math.abs(x - mid) < 6) continue; if (at(x, y) < 235) any = true; }
    if (any) { if (y0 < 0) y0 = y; y1 = y; }
  }
  if (y0 < 0 || y1 - y0 < 60) return null;
  const m = 26;
  const top = Math.max(bar + 6, y0 - m), bottom = Math.min(H, y1 + m);
  const header = await sharp(file).extract({ left: 0, top: 0, width: W, height: bar + 4 }).png().toBuffer();
  const body = await sharp(file).extract({ left: 0, top: top, width: W, height: bottom - top }).png().toBuffer();
  return sharp({ create: { width: W, height: bar + 4 + 10 + (bottom - top), channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite([{ input: header, left: 0, top: 0 }, { input: body, left: 0, top: bar + 14 }]).png().toBuffer();
}

const index = fs.existsSync(INDEX) ? JSON.parse(fs.readFileSync(INDEX, 'utf8')) : {};
const files = fs.existsSync(FROM) ? fs.readdirSync(FROM).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)) : [];
if (!files.length) { console.log('Nothing to import in ' + FROM); process.exit(0); }

const report = { imported: [], replaced: [], skippedExisting: [], unresolved: [] };
for (const f of files.sort()) {
  const stem = path.basename(f, path.extname(f));
  const id = canonicalExerciseId(stem);
  if (ONLY && !ONLY.includes(id)) continue;
  if (!byExerciseId.has(id)) { report.unresolved.push(f); continue; }
  const key = 'exercise:' + id;
  const had = index[key] && index[key].hasMedia;
  if (had && !REPLACE) { report.skippedExisting.push(f); continue; }
  const file = path.join(FROM, f);
  const tight = await tightenPanels(file);
  const tmp = tight ? path.join(os.tmpdir(), 'nurvan-media-' + process.pid + '.png') : null;
  if (tight) fs.writeFileSync(tmp, tight);
  const v = await renderVariants({ file: tmp || file });
  if (tmp) fs.rmSync(tmp, { force: true });
  const hash = (b) => crypto.createHash('sha1').update(b).digest('hex').slice(0, 16);
  const master = 'media/files/' + hash(v.masterBuffer) + '.webp';
  const thumb = 'media/files/' + hash(v.thumbBuffer) + '.webp';
  if (APPLY) {
    fs.mkdirSync(FILES, { recursive: true });
    fs.writeFileSync(path.join(OUT, master.replace(/^media\//, '')), v.masterBuffer);
    fs.writeFileSync(path.join(OUT, thumb.replace(/^media\//, '')), v.thumbBuffer);
    index[key] = {
      entityType: 'exercise', entityId: id, canonicalName: byExerciseId.get(id), hasMedia: true,
      primary: { id: 'local-' + hash(v.masterBuffer), mediaType: 'image', matchType: 'exact', url: null, thumbnailUrl: null, width: v.width, height: v.height, version: 1, source: 'nurvan', confidence: null },
      media: { master, thumbnail: thumb, animation: null },
      status: 'ready'
    };
    fs.mkdirSync(KEEP_DIR, { recursive: true });
    for (const old of fs.readdirSync(KEEP_DIR)) if (canonicalExerciseId(path.basename(old, path.extname(old))) === id) fs.rmSync(path.join(KEEP_DIR, old));
    fs.copyFileSync(file, path.join(KEEP_DIR, f));
    fs.mkdirSync(DONE_DIR, { recursive: true });
    fs.renameSync(file, path.join(DONE_DIR, f));
  }
  (had ? report.replaced : report.imported).push(byExerciseId.get(id) + '  ' + v.width + 'x' + v.height);
}
if (APPLY) {
  const sorted = {};
  Object.keys(index).sort().forEach((k) => { sorted[k] = index[k]; });
  fs.writeFileSync(INDEX, JSON.stringify(sorted, null, 1) + '\n');
}
console.log((APPLY ? 'IMPORTED' : 'WOULD IMPORT') + ' (' + report.imported.length + '):\n  ' + (report.imported.join('\n  ') || '-'));
if (report.replaced.length) console.log('\n' + (APPLY ? 'REPLACED' : 'WOULD REPLACE') + ' (' + report.replaced.length + '):\n  ' + report.replaced.join('\n  '));
if (report.skippedExisting.length) console.log('\nALREADY HAVE AN IMAGE, left alone (use --replace) (' + report.skippedExisting.length + '):\n  ' + report.skippedExisting.join('\n  '));
if (report.unresolved.length) console.log('\nNOT AN EXERCISE OF THE LIBRARY, left alone (' + report.unresolved.length + '):\n  ' + report.unresolved.join('\n  '));
const hasMedia = Object.values(index).filter((m) => m.hasMedia).length;
console.log('\nIndex: ' + hasMedia + ' exercises/warm-ups with an image' + (APPLY ? '' : ' (dry run: nothing written)'));
