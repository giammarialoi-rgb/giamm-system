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

// --- the sheet looks images up under the resolved exercise name -----------
//
// A canonical id derived from free text makes "Stacco da terra con bilanciere"
// a different exercise from "Stacco da terra", so the library showed a picture
// and the workout showed a placeholder for the same lift. Programs are written
// in free text, so this affects most of them.
{
  const base = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  const at = base.indexOf('function openExerciseInfoSheet');
  assert.ok(at !== -1, 'openExerciseInfoSheet not found');
  const body = base.slice(at, base.indexOf('\nfunction ', at + 20));

  ok(body.includes('catalogueExerciseFor(name)'),
    'the sheet asks the media client which catalogue exercise the written name certainly is');
  ok(body.includes('exerciseIdFor(mediaName)') && /const mediaName = catalogueName \|\| name;/.test(body),
    'the image is looked up under that exercise, falling back to the written name for custom exercises');
  ok(body.includes('isSameExercise(name, title)') && body.includes("guide.kind === 'exercise'"),
    'the guide text is kept only when it describes this same exercise');
  ok((body.match(/\{ title: name \}/g) || []).length >= 2,
    'and the sheet is always titled with the name written in the workout, guide or researched text alike');
  ok(body.includes('persistKnowledgeExtra({ name: name,'),
    'researched text is remembered under the workout name, so the next open finds it exactly');
}

// --- workout names -> catalogue exercise, run for real on the real catalogue ---
//
// Measured on the published programs: 69% of workout rows opened "Chiedi info"
// on another exercise's page, because the guide's matcher accepts one shared
// word ("Kettlebell press" -> Leg press, "Ext tricipiti" -> Leg extension).
{
  const sandbox = { window: null, self: null, document: undefined };
  sandbox.window = sandbox;
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-catalog-extra.js'), 'utf8'), sandbox);
  const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  const at = built.indexOf('var EXERCISE_DICTIONARY');
  let depth = 0, end = -1;
  const open = built.indexOf('[', at);
  for (let p = open; p < built.length; p++) {
    if (built[p] === '[') depth++;
    else if (built[p] === ']') { depth--; if (!depth) { end = p; break; } }
  }
  const dictionary = vm.runInContext('(' + built.slice(open, end + 1) + ')', sandbox);
  sandbox.ExerciseDatabaseService = { getAllExercises() { return dictionary.map((e) => ({ name: e.normalized })); } };
  vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-media-client.js'), 'utf8'), sandbox);
  const M = sandbox.NurvanExerciseMedia;

  ok(M.catalogueExerciseFor('Panca manubri') === 'Panca piana manubri', 'an approved workout name links to its catalogue exercise');
  ok(M.catalogueExerciseFor('Kettlebell press') === null, 'an exercise with no catalogue entry links to nothing');
  ok(M.catalogueExerciseFor('Kickback cavo tricipiti') === null, 'shared words are not a link: the triceps kickback is not the glute one');

  ok(!M.isSameExercise('Kettlebell press', 'Leg press'), '"Kettlebell press" is not shown as Leg press');
  ok(!M.isSameExercise('Ext tricipiti', 'Leg extension'), '"Ext tricipiti" is not shown as Leg extension');
  ok(!M.isSameExercise('Pushdown ai Cavi con Corda', 'Croci ai cavi'), '"Pushdown ai Cavi con Corda" is not shown as Croci ai cavi');
  ok(!M.isSameExercise('RDL monopodalico', 'Stacco rumeno'), 'a variant with its own entry is not shown as the base lift');
  ok(M.isSameExercise('Diamond push-up', 'Push-up diamante'), 'an approved link is the same exercise');
  ok(M.isSameExercise('Chest Press Convergente', 'chest press convergente'), 'the same name in another case is the same exercise');

  const catalogue = new Set([
    ...sandbox.WEB_EXERCISE_CATALOG.map((e) => M.canonicalExerciseId(e.name)),
    ...dictionary.map((e) => M.canonicalExerciseId(e.normalized))
  ]);
  const broken = Object.entries(sandbox.WEB_EXERCISE_NAME_LINKS)
    .filter(([id, target]) => !catalogue.has(M.canonicalExerciseId(target)) || id !== M.canonicalExerciseId(id));
  ok(broken.length === 0, `every workout-name link points at a real catalogue exercise (${broken.map((b) => b[0]).join(', ') || 'all ok'})`);
}

// --- resolveCanonicalMediaName: real wording variants resolve, ------------
// --- unrelated exercises sharing one word never do -------------------------
//
// explainExercise (training-knowledge.js) is built to always show *some*
// helpful text, so it scores a match on a single shared generic word -
// "Smith squat quad-biased" and "Squat bilanciere" both contain "squat", and
// it confidently returns the barbell squat's picture for a Smith-machine
// exercise. A photo is a much stronger claim than a paragraph of generic
// advice, so media resolution does not trust that match at all: it asks its
// own stricter question, exercised for real here against a realistic
// catalogue, not string-matched against the source.
{
  const sandbox = { window: null, document: undefined };
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  sandbox.WEB_EXERCISE_CATALOG = [
    { name: 'Squat goblet', muscle: 'QUADRICIPITI' },
    { name: 'Kickback cavo', muscle: 'GLUTEI' },
    { name: 'Squat bilanciere', muscle: 'QUADRICIPITI' },
    { name: 'Front squat bilanciere', muscle: 'QUADRICIPITI' },
    { name: 'Panca piana bilanciere', muscle: 'PETTO' },
    { name: 'Panca piana manubri', muscle: 'PETTO' }
  ];
  sandbox.ExerciseDatabaseService = { getAllExercises() { return []; } };
  vm.runInContext(fs.readFileSync(path.join(root, 'web/exercise-media-client.js'), 'utf8'), sandbox);
  const resolve = sandbox.NurvanExerciseMedia.resolveCanonicalMediaName;

  ok(resolve('Goblet Squat') === 'Squat goblet',
    'the exact same words in a different order resolve');
  ok(resolve('Kickback al Cavo') === 'Kickback cavo',
    'a pure filler-word difference (al) resolves');
  ok(resolve('Front Squat con Bilanciere') === 'Front squat bilanciere',
    'a written name matching a MORE specific catalogue entry resolves to that one, not a shorter relative');
  ok(resolve('Smith squat quad-biased') === null,
    'sharing just the word "squat" with a catalogue entry is NOT enough - a wrong picture is worse than none. '
    + 'This is the exact case that shipped wrong: explainExercise\'s general-purpose text matcher scored this a '
    + 'match against "Squat bilanciere" on that single shared word and the sheet showed the barbell squat\'s photo '
    + 'for what is actually a Smith-machine exercise');
  ok(resolve('Panca piana') === null,
    'a bare name that is short for two different catalogue entries (bilanciere vs manubri) is not an exact match '
    + 'for either, so no equipment is guessed');
  ok(resolve('Esercizio inventato XYZ') === null,
    'an exercise with no catalogue match at all resolves to nothing, same as before');
  ok(resolve('Squat bilanciere') === null,
    'an already-exact name has nothing to resolve, so the raw lookup is used unchanged');
}

console.log('\nAll media UI component tests passed.');
