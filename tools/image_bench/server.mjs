#!/usr/bin/env node
/*
 * Banco di lavoro per le immagini degli esercizi (solo sul tuo computer, nessun servizio esterno).
 *
 *   node tools/image_bench/server.mjs        poi apri http://127.0.0.1:4777
 *
 * Per ogni esercizio mancante mostra i due prompt (START e END, una posa sola per immagine), tu li incolli nel
 * generatore, copi l'immagine e la incolli qui (Ctrl+V). Il banco la chiama col nome giusto, compone da solo il
 * layout approvato (1536x1024, due pannelli, barre START/END) e salva in media-source/_nuove/<nome>.png, pronta per
 * "importa le immagini". Le pose singole restano in media-source/_lavoro, cosi' se ne rifai una sola non perdi l'altra.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import sharp from 'sharp';
import { SECTIONS } from '../media_prompts.mjs';

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const WORK = path.join(root, 'media-source', '_lavoro');
const NEW = path.join(root, 'media-source', '_nuove');
const DONE = path.join(root, 'media-source', '_importate');
const PORT = Number(process.env.PORT || 4777);
fs.mkdirSync(WORK, { recursive: true });
fs.mkdirSync(NEW, { recursive: true });

export const MASTER_POSE = `I am attaching reference images from my fitness app. Copy ONLY the look of the mannequin and the render: a realistic 3D anatomical mannequin, adult athletic male, completely BALD, smooth light-grey skin, black shorts, black running shoes with white soles (never barefoot), the muscles that work in translucent RED with a soft gradient, all other muscles grey, plain WHITE background, soft light and a faint contact shadow, dark-grey exercise mat when the exercise is on the floor.

From now on every message that starts with "POSE:" asks for ONE single image with ONE figure in ONE position.
- NOT two panels, NO labels, NO words, NO arrows, NO title, NO frame. Only the figure (and its equipment) on white.
- Wide landscape 3:2 image. The figure is BIG, centred, the whole body and all the equipment fully inside the image, nothing cut off.
- Strict side (profile) view unless the message says otherwise, camera at the same distance every time, the figure facing the same direction every time.

ANATOMY RULES (very important)
- Only positions that a real person can do. Every joint bends only in its natural direction; no twisted, broken or over-arched spine.
- Lying exercises: head, upper back and pelvis rest on the mat, the spine has its normal gentle curve, the ribcage is relaxed and the torso is NOT lifted or twisted unless the message says so.
- Left and right limbs exactly as written. Five fingers per hand, shoes on both feet, normal human proportions, one single person.
- If a detail is not written, draw the standard textbook version of the exercise.

Answer each POSE with ONE image only, no text. If I write "FIX: ..." change only that and keep everything else identical.
Reply "OK" now if you have understood; then wait for the first POSE.`;

const FIXES = [
  ['Schiena / posa innaturale', 'FIX: the position is anatomically wrong. Redraw it the way a real person does it: natural spine, no twisting or over-arching, joints bending only in their natural direction. Same style, same size.'],
  ['Figura troppo piccola', 'FIX: same image but the mannequin must be much bigger: it fills at least 85% of the image width, centred.'],
  ['Pose sbagliata', 'FIX: the position is not the one requested. Redraw exactly this position: '],
  ['Lato / arto sbagliato', 'FIX: left and right are swapped. Mirror the limbs as written in the description.'],
  ['Testo o frecce', 'FIX: remove every word, label and arrow. Only the figure on white.'],
  ['Aspetto', 'FIX: bald, light-grey skin, black shorts, black running shoes with white soles, red muscles, white background.'],
  ['Formato', 'FIX: make it a wide landscape 3:2 image, one single figure.']
];

const items = [];
for (const sec of SECTIONS) {
  for (const [file, name, en, equip, view, start, end, red] of sec.items) items.push({ file, name, en, equip, view, start, end, red, section: sec.title });
}
const byFile = new Map(items.map((x) => [x.file, x]));

function promptFor(x, slot) {
  const own = slot === 'start' ? x.start : x.end;
  const other = slot === 'start' ? x.end : x.start;
  return [
    'POSE: ' + x.en + ' - ' + (slot === 'start' ? 'START position' : 'END position') + ' (ONE figure, no text)',
    'Equipment: ' + x.equip,
    'Camera: ' + x.view,
    'Draw this position: ' + own,
    (slot === 'start' ? 'For your information, the END position (do NOT draw it) is: ' : 'For your information, the START position (do NOT draw it) was: ') + other,
    'Muscles in red: ' + x.red,
    'Context: neutral anatomical sports-science illustration of a grey mannequin (not a real person), athletic shorts and shoes, non-sexual training pose.'
  ].join('\n').replace(/\bglutes\b/gi, 'gluteal muscles').replace(/\bhips thrust\b/gi, 'hips lift');
}

const exists = (p) => fs.existsSync(p);

// The same layout the page draws in its preview: 1536x1024, two panels, START / END bars, each figure cropped to its
// content, as big as the panel allows, standing on a common floor line.
const bar = (t) => Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="736" height="56"><rect width="736" height="56" rx="10" fill="#000"/><text x="368" y="42" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="46" fill="#fff" text-anchor="middle">' + t + '</text></svg>');
export async function composeFinal(file) {
  const AW = Math.floor(736 * 0.96), AH = 1024 - 64 - 70, FLOOR = 1024 - 70;
  const layers = [
    { input: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="1024"><rect width="4" height="1024" fill="#000"/></svg>'), left: 766, top: 0 },
    { input: bar('START'), left: 16, top: 8 },
    { input: bar('END'), left: 784, top: 8 }
  ];
  for (const [slot, x] of [['start', 16], ['end', 784]]) {
    const fig = await sharp(path.join(WORK, file + '.' + slot + '.png')).trim({ background: '#ffffff', threshold: 18 })
      .resize({ width: AW, height: AH, fit: 'inside' }).png().toBuffer({ resolveWithObject: true });
    layers.push({ input: fig.data, left: x + Math.round((736 - fig.info.width) / 2), top: FLOOR - fig.info.height });
  }
  const out = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: '#ffffff' } }).composite(layers).png().toBuffer();
  fs.writeFileSync(path.join(NEW, file + '.png'), out);
}
function state(x) {
  return {
    file: x.file, name: x.name, en: x.en, section: x.section,
    start: exists(path.join(WORK, x.file + '.start.png')),
    end: exists(path.join(WORK, x.file + '.end.png')),
    final: exists(path.join(NEW, x.file + '.png')),
    imported: exists(path.join(DONE, x.file + '.png')) || fs.existsSync(DONE) && fs.readdirSync(DONE).some((f) => f.replace(/\.[a-z]+$/i, '') === x.file),
    prompts: { start: promptFor(x, 'start'), end: promptFor(x, 'end') }
  };
}

const readBody = (req) => new Promise((resolve, reject) => {
  const chunks = []; let n = 0;
  req.on('data', (c) => { n += c.length; if (n > 40e6) { reject(new Error('too big')); req.destroy(); } else chunks.push(c); });
  req.on('end', () => resolve(Buffer.concat(chunks)));
  req.on('error', reject);
});
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(obj)); };

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://127.0.0.1');
    // Only the ChatGPT page (the automation that fills the bench) may talk to the bench from another site.
    if (req.headers.origin === 'https://chatgpt.com') {
      res.setHeader('Access-Control-Allow-Origin', 'https://chatgpt.com');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', '*');
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    const parts = u.pathname.split('/').filter(Boolean);
    if (req.method === 'GET' && u.pathname === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), 'index.html'), 'utf8'));
    }
    if (req.method === 'GET' && u.pathname === '/api/list') return json(res, 200, { master: MASTER_POSE, fixes: FIXES, items: items.map(state) });
    if (req.method === 'GET' && parts[0] === 'raw' && parts[1]) {
      const m = /^([A-Za-z0-9 \-]+)\.(start|end)\.png$/.exec(decodeURIComponent(parts[1]));
      if (!m || !byFile.has(m[1])) return json(res, 404, { error: 'no' });
      const p = path.join(WORK, m[1] + '.' + m[2] + '.png');
      if (!exists(p)) return json(res, 404, { error: 'no' });
      res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'no-store' });
      return res.end(fs.readFileSync(p));
    }
    if (parts[0] === 'api' && parts[1] === 'slot' && parts[2] && parts[3]) {
      const file = decodeURIComponent(parts[2]), slot = parts[3];
      if (!byFile.has(file) || !['start', 'end'].includes(slot)) return json(res, 400, { error: 'esercizio o posa sconosciuti' });
      const p = path.join(WORK, file + '.' + slot + '.png');
      if (req.method === 'POST') {
        const body = await readBody(req);
        const png = await sharp(body).rotate().png().toBuffer();
        fs.writeFileSync(p, png);
        return json(res, 200, { ok: true });
      }
      if (req.method === 'DELETE') { fs.rmSync(p, { force: true }); return json(res, 200, { ok: true }); }
    }
    if (req.method === 'POST' && parts[0] === 'api' && parts[1] === 'final' && parts[2]) {
      const file = decodeURIComponent(parts[2]);
      if (!byFile.has(file)) return json(res, 400, { error: 'esercizio sconosciuto' });
      const body = await readBody(req);
      const meta = await sharp(body).metadata();
      if (meta.width !== 1536 || meta.height !== 1024) return json(res, 400, { error: 'formato inatteso ' + meta.width + 'x' + meta.height });
      fs.writeFileSync(path.join(NEW, file + '.png'), await sharp(body).png().toBuffer());
      return json(res, 200, { ok: true });
    }
    json(res, 404, { error: 'no' });
  } catch (e) {
    json(res, 500, { error: String(e && e.message || e) });
  }
});
// The automation in the ChatGPT page cannot post to this server (the site's security policy forbids it), so it
// downloads each picture as "<file>.<start|end>.png"; the files that land in Downloads are taken here and removed.
const DOWNLOADS = process.env.BENCH_DOWNLOADS || path.join(os.homedir(), 'Downloads');
setInterval(async () => {
  try {
    for (const f of fs.readdirSync(DOWNLOADS)) {
      const m = /^(.+?)\.(start|end)(?: \(\d+\))?\.(png|webp|jpe?g)$/i.exec(f);
      if (!m || !byFile.has(m[1])) continue;
      const full = path.join(DOWNLOADS, f);
      const age = Date.now() - fs.statSync(full).mtimeMs;
      if (age < 1500) continue;
      const png = await sharp(fs.readFileSync(full)).rotate().png().toBuffer();
      fs.writeFileSync(path.join(WORK, m[1] + '.' + m[2].toLowerCase() + '.png'), png);
      fs.rmSync(full, { force: true });
      console.log('da Downloads: ' + m[1] + ' ' + m[2]);
      if (exists(path.join(WORK, m[1] + '.start.png')) && exists(path.join(WORK, m[1] + '.end.png'))) { await composeFinal(m[1]); console.log('composta: ' + m[1]); }
    }
  } catch (e) { /* the file may still be being written: next round */ }
}, 2000);
server.listen(PORT, '127.0.0.1', () => console.log('Banco immagini: http://127.0.0.1:' + PORT + '  (Ctrl+C per chiudere)'));
