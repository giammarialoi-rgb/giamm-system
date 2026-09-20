// Builds a real exported program PDF out of web/index.base.html's own writer
// and checks the exercise pictures are in it.
//
// The export used to be text only: a coach reading it, or an athlete training
// from a printout, had the exercise name and nothing to recognise it by. The
// pictures live in a bucket that answers without CORS headers, so they cannot
// be read pixel by pixel straight from there; they come through the app's own
// /api/exercises/:id/image and are embedded as JPEG image objects.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');

function ok(cond, msg) {
  assert.ok(cond, msg);
  console.log('OK  ', msg);
}

const from = html.indexOf('function pdfExerciseDisplayName');
const to = html.indexOf('function shareOrSavePdfBlob');
assert.ok(from > 0 && to > from, 'the PDF writer was not found where expected');

const ctx = {
  console, Number, Math, Array, String, Object, JSON, Date, parseFloat, parseInt, isNaN, Boolean,
  currentWeek: 1,
  currentDay: 0,
  store: { data: {}, subs: {}, tempos: {}, prefs: {}, profile: { name: 'Atleta' }, logs: [] },
  DATA: {
    title: 'Programma',
    weeks: [{
      week: 1,
      sessions: [{
        name: 'Upper A',
        exercises: [
          { name: 'Panca piana bilanciere', repsTarget: '8-10', sets: [{ reps: '8' }, { reps: '8' }] },
          { name: 'Rematore bilanciere', repsTarget: '8-10', sets: [{ reps: '8' }, { reps: '8' }] }
        ]
      }]
    }]
  },
  formatSetRepScheme: (row) => ({ scheme: '3x8-10', setCount: (row.sets || []).length || 3 }),
  getExerciseSetCount: () => 2,
  foodMacroVal: () => 0,
  nutritionDayMacros: () => ({ kcal: 0, p: 0, c: 0, f: 0 })
};
vm.createContext(ctx);
vm.runInContext(html.slice(from, to), ctx);

// A one-pixel JPEG is enough: what matters is that the bytes come out the
// other side untouched and that the page refers to them.
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a' +
  'HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAA' +
  'AAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==', 'base64').toString('latin1');

const images = { 'Panca piana bilanciere': { jpeg: JPEG, width: 150, height: 150 } };
const withPics = ctx.buildWorkoutPdfBytes({ scope: 'all', loadMode: 'none', images });
const plain = ctx.buildWorkoutPdfBytes({ scope: 'all', loadMode: 'none' });

function asLatin1(bytes) {
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += String.fromCharCode(bytes[i]);
  return out;
}
const pdf = asLatin1(withPics);
const bare = asLatin1(plain);

ok(pdf.startsWith('%PDF-') && pdf.trimEnd().endsWith('%%EOF'), 'the export is still a PDF');
ok(/\/XObject << \/Im1 \d+ 0 R >>/.test(pdf), 'the page lists the picture among its resources');
ok(/\/Subtype \/Image[^>]*\/Filter \/DCTDecode/.test(pdf), 'which is a JPEG image object');
ok(pdf.includes('cm /Im1 Do'), 'and the page draws it');
ok(pdf.indexOf(JPEG) > 0, 'the picture bytes travel into the file untouched');
ok(!/\/XObject/.test(bare) && !/Do Q/.test(bare), 'an export without pictures carries none of it');

// An exercise with no picture must still be written, just without one.
ok(pdf.includes('Rematore bilanciere') || pdf.includes('Rematore'), 'an exercise with no picture is still in the program');

// Nothing may be written across a picture. The column names used to share the
// strip with it, so "SERIE" landed on top of the image.
{
  // The fixture is a single page, so every drawing command below belongs to
  // the same coordinate space.
  const boxes = [];
  const imgRe = /q (\d+(?:\.\d+)?) 0 0 \1 (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) cm \/(Im\d+) Do Q/g;
  for (let m; (m = imgRe.exec(pdf));) {
    const side = Number(m[1]), x = Number(m[2]), yy = Number(m[3]);
    boxes.push({ res: m[4], x0: x, x1: x + side, y0: yy, y1: yy + side });
  }
  ok(boxes.length === 1, 'the picture is drawn once, as a square');

  const texts = [];
  const txtRe = /BT \/(F\d) (\d+(?:\.\d+)?) Tf [^\n]*?1 0 0 1 (-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?) Tm \(([^)]*)\) Tj ET/g;
  for (let m; (m = txtRe.exec(pdf));) {
    const size = Number(m[2]), x = Number(m[3]), yy = Number(m[4]), s = m[5];
    texts.push({ s, x0: x, x1: x + size * 0.6 * s.length, y0: yy - size * 0.25, y1: yy + size * 0.75 });
  }
  ok(texts.some((t) => t.s === 'SERIE'), 'the column names are written');

  const over = [];
  boxes.forEach((b) => texts.forEach((t) => {
    if (t.x0 < b.x1 && t.x1 > b.x0 && t.y0 < b.y1 && t.y1 > b.y0) over.push(t.s);
  }));
  ok(over.length === 0, 'and no text is written across the picture' + (over.length ? ': ' + over.join(', ') : ''));
}

// The cross-reference table has to keep pointing at the right objects once
// binary image data sits between them, or the file will not open at all.
{
  const xrefAt = Number(pdf.slice(pdf.lastIndexOf('startxref') + 9).trim().split(/\s/)[0]);
  ok(pdf.slice(xrefAt, xrefAt + 4) === 'xref', 'startxref points at the table');
  const rows = pdf.slice(xrefAt).split('\n').slice(2).filter((l) => /^\d{10} \d{5} n/.test(l));
  ok(rows.length > 3, 'the table lists every object');
  const wrong = rows.filter((row, i) => {
    const off = Number(row.slice(0, 10));
    return !new RegExp('^' + (i + 1) + ' 0 obj').test(pdf.slice(off, off + 20));
  });
  ok(wrong.length === 0, 'and every offset lands on its object, image bytes included');
}

// The app fetches them through its own origin, since the bucket sends no CORS.
{
  const routes = fs.readFileSync(path.join(root, 'server/media/media-routes.mjs'), 'utf8');
  ok(routes.includes("app.get('/api/exercises/:exerciseId/image'"), 'the server serves the picture bytes');
  ok(/getMediaManifest/.test(routes) && !/req\.query\.url/.test(routes),
    'only pictures this app already has rows for - it is not an open proxy');
  ok(/Access-Control-Allow-Origin/.test(routes), 'with the header that lets the export read them');
  ok(/loadWorkoutPdfImages/.test(html) && /createImageBitmap/.test(html) && /image\/jpeg/.test(html),
    'and the app turns them into JPEG before writing the file');
}

console.log('\nAll workout PDF image tests passed.');
