// Executes web/exercise-media-ui.js for real and asserts what it returns.
// Deliberately not string-matching the source: the UI regression this guards
// against shipped past a suite that searched the source for the very text it
// was asserting on, so nothing here inspects the file as text.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

// Minimal window stand-in: the module only touches document to inject its
// stylesheet, which is not what these assertions are about.
const sandbox = { window: null, document: undefined };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-media-ui.js'), 'utf8'), sandbox);

const UI = sandbox.NurvanMediaUI;
ok(UI && typeof UI.mediaPanel === 'function', 'module exposes NurvanMediaUI.mediaPanel');

// --- no media: the slot must still be a real, sized, visible area ---
for (const [label, input] of [
  ['null manifest', null],
  ['undefined manifest', undefined],
  ['hasMedia false', { hasMedia: false, media: { master: null } }],
  ['hasMedia true but no master', { hasMedia: true, media: { master: null } }],
  ['malformed manifest', { hasMedia: true }]
]) {
  const html = UI.mediaPanel(input, 'Stacco da terra');
  ok(html.includes('>?<'), `${label}: renders the question mark`);
  ok(html.includes('IMMAGINE NON DISPONIBILE'), `${label}: renders the caption`);
  ok(html.includes('aspect-ratio:1/1'), `${label}: slot keeps a real aspect ratio`);
  ok(!/height:0|display:none/.test(html), `${label}: slot is not collapsed or hidden`);
  ok(!html.includes('<img'), `${label}: no image element when there is no master`);
}

// --- with media: image on top of the placeholder, undistorted ---
{
  const html = UI.mediaPanel(
    { hasMedia: true, media: { master: 'https://cdn.example/exercises/stacco/master.webp' } },
    'Stacco da terra'
  );
  ok(html.includes('<img'), 'with master: renders an image');
  ok(html.includes('src="https://cdn.example/exercises/stacco/master.webp"'), 'with master: uses the manifest url');
  ok(html.includes('object-fit:contain'), 'with master: contained, so it is never cropped or stretched');
  ok(html.includes('alt="Stacco da terra"'), 'with master: carries alt text');
  ok(html.includes('onerror='), 'with master: falls back when the url fails to load');
  ok(!html.includes('loading="lazy"'), 'with master: not lazy - lazy never fires inside the freshly built sheet');
  ok(html.includes('>?<'), 'with master: placeholder stays underneath as the fallback layer');
}

// --- a hostile url must not be able to break out of the attribute ---
{
  const html = UI.mediaPanel(
    { hasMedia: true, media: { master: '" onload="alert(1)' } },
    '"><script>alert(2)</script>'
  );
  ok(!html.includes('onload="alert(1)'), 'url is escaped into the src attribute');
  ok(!html.includes('<script>'), 'alt text is escaped');
}

// --- loadMedia never rejects, whatever the API does ---
{
  const cases = [
    ['no API present', undefined],
    ['API throws synchronously', { resolve() { throw new Error('boom'); }, canonicalExerciseId: n => n }],
    ['API rejects', { resolve: () => Promise.reject(new Error('offline')), canonicalExerciseId: n => n }]
  ];
  for (const [label, api] of cases) {
    sandbox.NurvanExerciseMedia = api;
    const result = await UI.loadMedia('exercise', 'stacco_da_terra', 'Stacco da terra');
    ok(result === null, `loadMedia resolves to null rather than rejecting: ${label}`);
  }

  sandbox.NurvanExerciseMedia = {
    resolve: () => Promise.resolve({ hasMedia: true, media: { master: 'x.webp' } }),
    canonicalExerciseId: n => n
  };
  const good = await UI.loadMedia('exercise', 'stacco_da_terra', 'Stacco da terra');
  ok(good && good.hasMedia, 'loadMedia passes a successful manifest through');

  const noId = await UI.loadMedia('exercise', null, 'Stacco da terra');
  ok(noId === null, 'loadMedia short-circuits when there is no id to look up');
}

console.log('\nAll media UI component tests passed.');
