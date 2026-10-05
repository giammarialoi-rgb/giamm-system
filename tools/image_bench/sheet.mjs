#!/usr/bin/env node
// Contact sheet of finished pictures (the bars cut off), to check poses at a glance.
//   node tools/image_bench/sheet.mjs out.jpg "Teaser" "Swimming" ...
import sharp from 'sharp';
const [out, ...names] = process.argv.slice(2);
const W = 760, H = Math.round(964 * W / 1536);
const tiles = await Promise.all(names.map((n) => sharp('media-source/_nuove/' + n + '.png').extract({ left: 0, top: 60, width: 1536, height: 964 }).resize(W).jpeg({ quality: 72 }).toBuffer()));
const cols = 2, rows = Math.ceil(tiles.length / cols);
await sharp({ create: { width: cols * W + 10, height: rows * (H + 8), channels: 3, background: '#888' } })
  .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * (W + 10), top: Math.floor(i / cols) * (H + 8) }))).jpeg({ quality: 72 }).toFile(out);
console.log('ok ' + names.length);
