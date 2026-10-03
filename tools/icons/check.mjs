// node tools/icons/check.mjs [dir]   (default web/icons)
// Checks the SVG files delivered for the icon set against the manifest and the rules of the prompt.
import fs from 'node:fs';
import path from 'node:path';
import { ICONS, GRIDS } from './manifest.mjs';

const dir = process.argv[2] || 'web/icons';
const ALLOWED = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon']);
const FORBIDDEN_ATTR = /\b(class|id|style|transform|clip-path|mask|filter|opacity|fill-opacity|stroke-opacity|width|height)\s*=/;
const problems = []; const ok = [];
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.svg')) : [];
const byId = new Map(ICONS.map((i) => [i.id, i]));

for (const f of files) {
  const id = f.replace(/\.svg$/, '');
  const icon = byId.get(id);
  const bad = [];
  if (!icon) { problems.push(f + ': non è nel manifest (nome sbagliato?)'); continue; }
  const src = fs.readFileSync(path.join(dir, f), 'utf8').trim();
  const grid = GRIDS[icon.grid];
  const root = /^<svg\b([^>]*)>/.exec(src);
  if (!root) { problems.push(f + ': non inizia con <svg>'); continue; }
  const attrs = root[1];
  if (!/xmlns="http:\/\/www\.w3\.org\/2000\/svg"/.test(attrs)) bad.push('manca xmlns');
  if (!new RegExp('viewBox="' + grid.viewBox + '"').test(attrs)) bad.push('viewBox deve essere "' + grid.viewBox + '"');
  if (!/fill="none"/.test(attrs)) bad.push('la radice deve avere fill="none"');
  if (!/stroke="currentColor"/.test(attrs)) bad.push('la radice deve avere stroke="currentColor"');
  if (!new RegExp('stroke-width="' + grid.stroke + '"').test(attrs)) bad.push('stroke-width deve essere ' + grid.stroke);
  if (!/stroke-linecap="round"/.test(attrs) || !/stroke-linejoin="round"/.test(attrs)) bad.push('servono stroke-linecap e stroke-linejoin "round"');
  if (/\b(width|height)=/.test(attrs.replace(/stroke-width="[^"]*"/, ''))) bad.push('niente width/height sulla radice');
  const body = src.slice(root[0].length).replace(/<\/svg>\s*$/, '');
  if (!/<\/svg>\s*$/.test(src)) bad.push('manca </svg>');
  if (/<!--/.test(src)) bad.push('niente commenti');
  const tags = [...body.matchAll(/<\s*([a-zA-Z]+)\b/g)].map((m) => m[1].toLowerCase());
  const extra = [...new Set(tags.filter((t) => !ALLOWED.has(t)))];
  if (extra.length) bad.push('elementi non ammessi: ' + extra.join(', '));
  if (!tags.length) bad.push('vuota');
  if (tags.length > (icon.grid === 'ui' ? 8 : 12)) bad.push('troppe forme (' + tags.length + ')');
  if (FORBIDDEN_ATTR.test(body)) bad.push('attributi non ammessi (class, id, style, transform, opacity, width/height...)');
  const colors = [...body.matchAll(/(?:fill|stroke)="([^"]*)"/g)].map((m) => m[1]).filter((v) => v !== 'none' && v !== 'currentColor');
  if (colors.length) bad.push('colori fissi: ' + [...new Set(colors)].join(', '));
  if (/fill="currentColor"/.test(body)) {
    for (const m of body.matchAll(/<(\w+)\b[^>]*fill="currentColor"[^>]*>/g)) {
      const r = /\br="([\d.]+)"/.exec(m[0]);
      if (m[1] !== 'circle' || !r || Number(r[1]) > 1.2) { bad.push('i riempimenti ammessi solo per punti (circle r<=1.2)'); break; }
    }
  }
  const limit = icon.grid === 'ui' ? 1200 : 2500;
  if (Buffer.byteLength(src) > limit) bad.push('file di ' + Buffer.byteLength(src) + ' byte, massimo ' + limit);
  // every number of a path must sit inside the grid
  const size = Number(grid.viewBox.split(' ')[2]);
  for (const m of body.matchAll(/\b(?:d|points|cx|cy|x|y|x1|x2|y1|y2)="([^"]*)"/g)) {
    for (const n of (m[1].match(/-?\d*\.?\d+/g) || []).map(Number)) if (n < -0.01 || n > size + 0.01) { bad.push('coordinata fuori dalla griglia (' + n + ')'); break; }
  }
  if ((src.match(/\d+\.\d{3,}/g) || []).length) bad.push('troppi decimali (massimo 2)');
  if (bad.length) problems.push(f + ': ' + [...new Set(bad)].join('; ')); else ok.push(id);
}

const missing = ICONS.filter((i) => !files.includes(i.id + '.svg')).map((i) => i.id);
console.log(ok.length + ' icone in regola su ' + ICONS.length + ' attese (' + files.length + ' file in ' + dir + ').');
if (problems.length) { console.log('\nDa correggere:'); problems.forEach((p) => console.log(' - ' + p)); }
if (missing.length && files.length) console.log('\nMancano ancora (' + missing.length + '): ' + missing.join(', '));
process.exit(problems.length ? 1 : 0);
