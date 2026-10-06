// Builds docs/review-samples/: three files a reviewer can import into the app (Database > import), all made up.
//   scheda-demo.pdf        a 2-day workout card as a document: the app reads it (on the device, or with the AI reader if chosen)
//   scheda-demo.csv        the same card as a table
//   etichetta-demo.png     a nutrition label, to try the label / photo reading
//
//   node tools/review-demo/build_samples.mjs
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require('sharp');
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..', '..');
const dir = path.join(root, 'docs', 'review-samples');
fs.mkdirSync(dir, { recursive: true });

const rows = [
  ['Giorno 1 - Spinta', 'Panca piana con bilanciere', 4, '8-10', '90 s'],
  ['Giorno 1 - Spinta', 'Military press con manubri', 3, '10-12', '75 s'],
  ['Giorno 1 - Spinta', 'Croci ai cavi', 3, '12-15', '60 s'],
  ['Giorno 1 - Spinta', 'Pushdown ai cavi', 3, '12-15', '60 s'],
  ['Giorno 2 - Tirata', 'Lat machine presa larga', 4, '8-10', '90 s'],
  ['Giorno 2 - Tirata', 'Rematore con manubrio', 3, '10-12', '75 s'],
  ['Giorno 2 - Tirata', 'Face pull', 3, '15', '60 s'],
  ['Giorno 2 - Tirata', 'Curl con manubri', 3, '10-12', '60 s']
];

// CSV (semicolon, as an Italian spreadsheet writes it)
fs.writeFileSync(path.join(dir, 'scheda-demo.csv'), '﻿' + [['Giorno', 'Esercizio', 'Serie', 'Ripetizioni', 'Recupero']].concat(rows).map((r) => r.join(';')).join('\n') + '\n');

// PDF, printed by Chrome from a small page
const html = `<!doctype html><meta charset="utf-8"><title>Scheda demo</title>
<style>body{font-family:Arial,Helvetica,sans-serif;margin:32px;color:#111}h1{font-size:22px;margin:0 0 4px}p{color:#555;margin:0 0 18px}
h2{font-size:15px;margin:18px 0 6px;border-bottom:2px solid #d4af37;padding-bottom:3px}table{border-collapse:collapse;width:100%}
td,th{border:1px solid #bbb;padding:6px 8px;font-size:13px;text-align:left}th{background:#f1f1f1}</style>
<h1>Scheda di esempio - 2 giorni</h1><p>Documento inventato per provare l'importazione. Nessun dato reale.</p>
${['Giorno 1 - Spinta', 'Giorno 2 - Tirata'].map((day) => `<h2>${day}</h2><table><tr><th>Esercizio</th><th>Serie</th><th>Ripetizioni</th><th>Recupero</th></tr>${rows.filter((r) => r[0] === day).map((r) => `<tr><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td>${r[4]}</td></tr>`).join('')}</table>`).join('')}`;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nurvan-pdf-'));
const port = 9800 + Math.floor(Math.random() * 90);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', ['--headless=new', '--remote-debugging-port=' + port, '--user-data-dir=' + profile, '--no-first-run', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target = null;
for (let i = 0; i < 40 && !target; i++) { await sleep(250); try { target = (await (await fetch('http://127.0.0.1:' + port + '/json')).json()).find((t) => t.type === 'page'); } catch (_) {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => { ws.onopen = r; });
let seq = 0; const waiting = new Map();
ws.onmessage = (ev) => { const x = JSON.parse(ev.data); if (x.id && waiting.has(x.id)) { waiting.get(x.id)(x); waiting.delete(x.id); } };
const send = (method, params = {}) => new Promise((resolve) => { const id = ++seq; waiting.set(id, resolve); ws.send(JSON.stringify({ id, method, params })); });
await send('Page.enable');
await send('Page.navigate', { url: 'data:text/html;charset=utf-8,' + encodeURIComponent(html) });
await sleep(1200);
const pdf = await send('Page.printToPDF', { printBackground: true, paperWidth: 8.27, paperHeight: 11.69 });
fs.writeFileSync(path.join(dir, 'scheda-demo.pdf'), Buffer.from(pdf.result.data, 'base64'));
ws.close(); chrome.kill(); await sleep(300);
try { fs.rmSync(profile, { recursive: true, force: true }); } catch (_) {}

// PNG: a nutrition label drawn as text
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="760"><rect width="600" height="760" fill="#fff"/>
<rect x="20" y="20" width="560" height="720" fill="none" stroke="#000" stroke-width="4"/>
<text x="40" y="80" font-family="Arial" font-weight="bold" font-size="44">Valori nutrizionali</text>
<text x="40" y="120" font-family="Arial" font-size="22">Yogurt greco 0% (esempio) - per 100 g</text>
<line x1="40" y1="140" x2="560" y2="140" stroke="#000" stroke-width="8"/>
${[['Energia', '59 kcal / 247 kJ'], ['Grassi', '0,2 g'], ['di cui acidi grassi saturi', '0,1 g'], ['Carboidrati', '3,6 g'], ['di cui zuccheri', '3,6 g'], ['Fibre', '0 g'], ['Proteine', '10,3 g'], ['Sale', '0,10 g']].map((r, i) => `<text x="40" y="${190 + i * 62}" font-family="Arial" font-size="30">${r[0]}</text><text x="560" y="${190 + i * 62}" text-anchor="end" font-family="Arial" font-weight="bold" font-size="30">${r[1]}</text><line x1="40" y1="${208 + i * 62}" x2="560" y2="${208 + i * 62}" stroke="#000" stroke-width="2"/>`).join('')}
<text x="40" y="720" font-family="Arial" font-size="18" fill="#444">Etichetta inventata per la demo</text></svg>`;
await sharp(Buffer.from(svg)).png().toFile(path.join(dir, 'etichetta-demo.png'));
for (const f of ['scheda-demo.pdf', 'scheda-demo.csv', 'etichetta-demo.png']) console.log(f.padEnd(22), Math.round(fs.statSync(path.join(dir, f)).size / 1024) + ' KB');
