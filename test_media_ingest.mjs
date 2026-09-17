// Runs the ingest pipeline's stages for real, against generated fixtures.
//
// The point of the ingest is that a file lands on the right exercise, so the
// mapping is where a mistake is both easy and expensive: a wrong canonical id
// silently attaches one exercise's picture to another. Everything here executes
// ingest_exercise_media.mjs rather than reading it.
//
// Uploads and database writes are not exercised: those need real credentials,
// and the script's default is a dry run precisely so neither can happen by
// accident.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));

function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

let sharp = null;
try { ({ default: sharp } = await import('sharp')); } catch (_) {}

const ingest = await import('./ingest_exercise_media.mjs');

// --- catalogues load from the real browser files -------------------------
const catalogues = ingest.loadCatalogues();
ok(catalogues.byExerciseId.size > 100, `the exercise catalogue loads (${catalogues.byExerciseId.size} entries)`);
ok(catalogues.warmupIds.size > 20, `the warm-up library loads (${catalogues.warmupIds.size} entries)`);
ok(catalogues.byExerciseId.has('panca_piana_bilanciere'), 'a known exercise derives to the id the storage keys use');

// --- storage keys follow the documented layout ---------------------------
{
  const ex = ingest.keysFor({ ownerType: 'exercise', ownerId: 'squat_bilanciere' });
  ok(ex.master === 'exercises/squat_bilanciere/master.webp', 'exercise master key matches the documented layout');
  ok(ex.thumb === 'exercises/squat_bilanciere/thumb.webp', 'exercise thumb key matches the documented layout');
  const wu = ingest.keysFor({ ownerType: 'warmup', ownerId: 'raise_bike_easy' });
  ok(wu.master === 'warmups/raise_bike_easy/master.webp', 'warm-up keys are namespaced separately');
}

if (!sharp) {
  console.log('\nsharp is not installed, so the image stages are skipped (npm i -D sharp).');
  console.log('\nMedia ingest tests passed (mapping only).');
  process.exit(0);
}

// --- fixtures ------------------------------------------------------------
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nurvan-ingest-'));
fs.mkdirSync(path.join(tmp, 'exercises'), { recursive: true });
fs.mkdirSync(path.join(tmp, 'warmups'), { recursive: true });

const png = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: { r: 30, g: 30, b: 30 } } })
  .png().toBuffer();

const firstWarmupId = [...catalogues.warmupIds.keys()][0];
fs.writeFileSync(path.join(tmp, 'exercises', 'Panca piana bilanciere.png'), await png(900, 900));
fs.writeFileSync(path.join(tmp, 'exercises', 'squat-bilanciere.png'), await png(1600, 1200));
fs.writeFileSync(path.join(tmp, 'exercises', 'Salto della quaglia.png'), await png(600, 600));
fs.writeFileSync(path.join(tmp, 'exercises', 'troppo-piccola-panca-declinata.png'), await png(100, 100));
fs.writeFileSync(path.join(tmp, 'warmups', firstWarmupId + '.png'), await png(800, 800));
fs.writeFileSync(path.join(tmp, 'warmups', 'non_esiste_questo_id.png'), await png(800, 800));

// mapFiles reads the module-level SOURCE, so point the process at the fixtures.
process.argv = [process.argv[0], process.argv[1], '--source', tmp];
const remapped = await import('./ingest_exercise_media.mjs?fixtures=1');
const { matched, unmatched } = remapped.mapFiles(catalogues);

// --- mapping -------------------------------------------------------------
{
  const ids = matched.map((m) => `${m.ownerType}:${m.ownerId}`);
  ok(ids.includes('exercise:panca_piana_bilanciere'), 'a filename with spaces and capitals maps to its canonical id');
  ok(ids.includes('exercise:squat_bilanciere'), 'a hyphenated lowercase filename maps to the same id form');
  ok(ids.includes('warmup:' + firstWarmupId), 'a warm-up file maps on the library id, with no derivation');

  const unmatchedIds = unmatched.map((u) => u.derived);
  ok(unmatchedIds.includes('salto_della_quaglia'),
    'a file naming an exercise that is not in the catalogue is reported, not attached to something else');
  ok(unmatchedIds.includes('non_esiste_questo_id'), 'an unknown warm-up id is reported too');
  ok(!matched.some((m) => m.ownerId === 'salto_della_quaglia'), 'and it is never ingested');
}

// --- validation ----------------------------------------------------------
{
  const inspected = [];
  for (const entry of matched) inspected.push(await remapped.inspect(entry));
  ok(inspected.every((e) => e.problems.length === 0), 'well-formed fixtures pass validation');

  const small = matched.find((m) => /troppo-piccola/.test(m.file))
    || { ownerType: 'exercise', ownerId: 'panca_declinata', file: path.join(tmp, 'exercises', 'troppo-piccola-panca-declinata.png') };
  const tooSmall = await remapped.inspect(small);
  ok(tooSmall.problems.some((p) => /below the \d+px minimum/.test(p)),
    'an image too small to fill the panel is rejected with a reason');
}

// --- transformation ------------------------------------------------------
{
  const big = matched.find((m) => m.ownerId === 'squat_bilanciere');
  const out = await remapped.renderVariants(big);
  ok(out.width <= 1280 && out.height <= 1280, `the master is capped (${out.width}x${out.height})`);
  ok(Math.abs((out.width / out.height) - (1600 / 1200)) < 0.01, 'the master keeps its aspect ratio, so nothing is stretched');
  ok(out.masterBuffer.length > 0 && out.thumbBuffer.length > 0, 'both variants are produced');
  ok(out.thumbBuffer.length < out.masterBuffer.length, 'the thumbnail is smaller than the master');

  const thumbMeta = await sharp(out.thumbBuffer).metadata();
  ok(thumbMeta.format === 'webp', 'variants are webp');
  ok(Math.max(thumbMeta.width, thumbMeta.height) === 320, `the thumbnail fits the list slot (${thumbMeta.width}x${thumbMeta.height})`);

  const small = matched.find((m) => m.ownerId === 'panca_piana_bilanciere');
  const kept = await remapped.renderVariants(small);
  ok(kept.width === 900 && kept.height === 900, 'an image below the cap is not enlarged');
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('\nMedia ingest tests passed.');
