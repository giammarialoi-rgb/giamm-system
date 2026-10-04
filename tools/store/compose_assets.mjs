// Turns the raw screens of the app (tools/store/make_screenshots.mjs, make_coach_screenshots.mjs) into the images the
// stores ask for, with a caption over each one, and the graphics around them.
//
//   node tools/store/compose_assets.mjs <rawdir>        rawdir holds iphone/ and iphone-coach/ (440x956 at 3x)
//
// Writes into store/apple and store/google-play:
//   screenshots/iphone-6.9/   1320 x 2868   App Store, iPhone 6.9"  (also valid for the smaller sizes)
//   screenshots/iphone-6.5/   1284 x 2778   App Store, iPhone 6.5"
//   screenshots/phone/        1080 x 1920   Google Play, phone
//   feature-graphic.png       1024 x 500    Google Play
//   app-icon-1024.png / icon-512.png        the two icons
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const RAW = process.argv[2];
if (!RAW) { console.log('usage: node tools/store/compose_assets.mjs <rawdir>'); process.exit(1); }
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');
const APPLE = path.join(root, 'store/apple'), PLAY = path.join(root, 'store/google-play');

// The order they are shown in, and what each says.
const SHOTS = [
  { dir: 'iphone', file: '02-allenamento', head: 'Serie, carichi e RIR in un tocco', sub: 'Registri l’allenamento mentre ti alleni.' },
  { dir: 'iphone', file: '03-statistiche', head: 'Vedi quali muscoli lavori', sub: 'Volume per gruppo muscolare e per periodo.' },
  { dir: 'iphone', file: '04-coach-ai', head: 'Un Coach AI che legge i tuoi carichi', sub: 'Chiedi come stai andando: risponde con i tuoi numeri.' },
  { dir: 'iphone', file: '05-esercizio', head: 'Ogni esercizio, spiegato', sub: 'Immagine, esecuzione, errori comuni e video.' },
  { dir: 'iphone', file: '01-home', head: 'La tua giornata in una schermata', sub: 'Prossima seduta e stima del recupero.' },
  { dir: 'iphone', file: '06-salute', head: 'Sonno e recupero sotto controllo', sub: 'Scrivi i tuoi valori: Nurvan stima il recupero.' },
  { dir: 'iphone-coach', file: 'c2-clienti', head: 'Per i coach: tutti i clienti in un posto', sub: 'Inviti, schede, check-in e chat.' },
  { dir: 'iphone-coach', file: 'c1-oggi', head: 'Cosa richiede attenzione oggi', sub: 'Priorità, clienti e prossime azioni.' }
];

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Breaks a line of text at spaces so that no line is longer than about `max` characters.
function wrap(text, max) {
  const out = []; let cur = '';
  for (const w of String(text).split(' ')) {
    if ((cur + ' ' + w).trim().length > max && cur) { out.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
  }
  if (cur) out.push(cur);
  return out;
}

async function framed(rawPath, W, H, head, sub) {
  const fontH = Math.round(W * 0.07), fontS = Math.round(W * 0.036);
  const lines = wrap(head, Math.round(W / (fontH * 0.56)));
  const subLines = wrap(sub, Math.round(W * 0.92 / (fontS * 0.54)));
  const padTop = Math.round(H * 0.045);
  let y = padTop + fontH;
  const text = [];
  lines.forEach((l) => { text.push('<text x="' + W / 2 + '" y="' + y + '" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="800" font-size="' + fontH + '" fill="#ffffff">' + esc(l) + '</text>'); y += Math.round(fontH * 1.18); });
  y += Math.round(fontS * 0.2);
  subLines.forEach((l) => { text.push('<text x="' + W / 2 + '" y="' + y + '" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-weight="500" font-size="' + fontS + '" fill="#d4af37">' + esc(l) + '</text>'); y += Math.round(fontS * 1.35); });
  const textBottom = y;
  const bg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><defs>' +
    '<linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0b0c"/><stop offset="1" stop-color="#14110a"/></linearGradient>' +
    '<radialGradient id="r" cx="50%" cy="0%" r="75%"><stop offset="0" stop-color="#d4af37" stop-opacity="0.22"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#r)"/>' + text.join('') + '</svg>';

  const sw = Math.round(W * 0.84);
  const radius = Math.round(W * 0.055);
  const top = textBottom + Math.round(H * 0.025);
  const visible = H - top;
  const shot = sharp(rawPath).resize({ width: sw });
  const meta = await shot.clone().metadata();
  const resized = await shot.png().toBuffer();
  const rh = (await sharp(resized).metadata()).height;
  const cropH = Math.min(rh, visible);
  const cropped = await sharp(resized).extract({ left: 0, top: 0, width: sw, height: cropH }).png().toBuffer();
  // rounded at the top, cut straight at the bottom of the image
  const mask = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + sw + '" height="' + cropH + '"><path d="M0,' + cropH + ' L0,' + radius + ' Q0,0 ' + radius + ',0 L' + (sw - radius) + ',0 Q' + sw + ',0 ' + sw + ',' + radius + ' L' + sw + ',' + cropH + ' Z" fill="#fff"/></svg>');
  const rounded = await sharp(cropped).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  const border = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="' + (sw + 12) + '" height="' + (cropH + 6) + '"><path d="M3,' + (cropH + 6) + ' L3,' + (radius + 3) + ' Q3,3 ' + (radius + 3) + ',3 L' + (sw + 9 - radius) + ',3 Q' + (sw + 9) + ',3 ' + (sw + 9) + ',' + (radius + 3) + ' L' + (sw + 9) + ',' + (cropH + 6) + '" fill="none" stroke="#d4af37" stroke-opacity="0.45" stroke-width="6"/></svg>');
  const left = Math.round((W - sw) / 2);
  return sharp(Buffer.from(bg)).composite([
    { input: border, left: left - 6, top: top - 3 },
    { input: rounded, left, top }
  ]).png({ compressionLevel: 9, palette: true, quality: 96, effort: 8, dither: 0.6 }).toBuffer();
}

async function sets() {
  const targets = [
    { dir: path.join(APPLE, 'screenshots/iphone-6.9'), W: 1320, H: 2868 },
    { dir: path.join(APPLE, 'screenshots/iphone-6.5'), W: 1284, H: 2778 },
    { dir: path.join(PLAY, 'screenshots/phone'), W: 1080, H: 1920 }
  ];
  for (const t of targets) {
    fs.rmSync(t.dir, { recursive: true, force: true });
    fs.mkdirSync(t.dir, { recursive: true });
    let n = 0;
    for (const s of SHOTS) {
      n++;
      const raw = path.join(RAW, s.dir, s.file + '.png');
      if (!fs.existsSync(raw)) throw new Error('missing ' + raw);
      const buf = await framed(raw, t.W, t.H, s.head, s.sub);
      fs.writeFileSync(path.join(t.dir, String(n).padStart(2, '0') + '-' + s.file.replace(/^c?\d+-/, '') + '.png'), buf);
    }
    console.log(path.relative(root, t.dir), n + ' images ' + t.W + 'x' + t.H);
  }
}

async function graphics() {
  // The feature graphic of Google Play: 1024 x 500, the mark on the left, the promise on the right.
  const W = 1024, H = 500;
  const logo = await sharp(path.join(root, 'web/nurvan_logo.png')).resize({ width: 340 }).png().toBuffer();
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '"><defs>' +
    '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b0b0c"/><stop offset="1" stop-color="#1a1608"/></linearGradient>' +
    '<radialGradient id="r" cx="25%" cy="45%" r="55%"><stop offset="0" stop-color="#d4af37" stop-opacity="0.28"/><stop offset="1" stop-color="#d4af37" stop-opacity="0"/></radialGradient></defs>' +
    '<rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="100%" fill="url(#r)"/>' +
    '<text x="450" y="215" font-family="Segoe UI, Arial, sans-serif" font-weight="800" font-size="42" fill="#ffffff">Allenamento, recupero</text>' +
    '<text x="450" y="270" font-family="Segoe UI, Arial, sans-serif" font-weight="800" font-size="42" fill="#ffffff">e Coach AI</text>' +
    '<text x="452" y="325" font-family="Segoe UI, Arial, sans-serif" font-weight="500" font-size="28" fill="#d4af37">per atleti e coach</text></svg>';
  const buf = await sharp(Buffer.from(svg)).composite([{ input: logo, left: 50, top: 80 }]).png({ compressionLevel: 9 }).toBuffer();
  fs.writeFileSync(path.join(PLAY, 'feature-graphic.png'), buf);
  fs.copyFileSync(path.join(root, 'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png'), path.join(APPLE, 'app-icon-1024.png'));
  fs.copyFileSync(path.join(root, 'web/icon-512.png'), path.join(PLAY, 'icon-512.png'));
  console.log('feature graphic 1024x500, app-icon-1024.png, icon-512.png');
}

await sets();
await graphics();
