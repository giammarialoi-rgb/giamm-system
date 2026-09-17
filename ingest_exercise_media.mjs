#!/usr/bin/env node
/*
 * Batch ingest for exercise and warm-up imagery.
 *
 *   node ingest_exercise_media.mjs                 scan, map, validate, report - writes nothing
 *   node ingest_exercise_media.mjs --apply         upload to R2 and upsert exercise_media
 *   node ingest_exercise_media.mjs --only squat_bilanciere,stacco_rumeno
 *   node ingest_exercise_media.mjs --source ./media-source
 *   node ingest_exercise_media.mjs --verify        check what the API returns for what is stored
 *
 * Expected layout:
 *
 *   media-source/exercises/<anything>.{png,jpg,jpeg,webp}
 *   media-source/warmups/<warmup-id>.{png,jpg,jpeg,webp}
 *
 * An exercise file is matched by deriving the canonical id from its filename
 * with the same function the server and the frontend use, so "Squat
 * bilanciere.png", "squat-bilanciere.png" and "squat_bilanciere.webp" all land
 * on squat_bilanciere. A warm-up file is matched on the library's own stable
 * id, which needs no derivation.
 *
 * Exercises without imagery are reported and otherwise left alone: the app
 * renders its placeholder for them and works exactly as before. Nothing here
 * ever blocks or alters an exercise that has no file.
 *
 * Default is a dry run. Nothing is uploaded and no row is written without
 * --apply.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import 'dotenv/config';
import pg from 'pg';

import { canonicalExerciseId } from './server/media/canonical-id.mjs';
import { getMediaStorageProvider } from './server/media/storage-provider.mjs';
import { assignMedia } from './server/media/exercise-media-service.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));

const ARGV = process.argv.slice(2);
const flag = (name) => ARGV.includes('--' + name);
const value = (name, fallback) => {
  const i = ARGV.indexOf('--' + name);
  return i !== -1 && ARGV[i + 1] ? ARGV[i + 1] : fallback;
};

const APPLY = flag('apply');
const VERIFY = flag('verify');
const SOURCE = path.resolve(root, value('source', 'media-source'));
const ONLY = value('only', '') ? value('only', '').split(',').map((s) => s.trim()).filter(Boolean) : null;

const IMAGE_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp']);
const MIN_EDGE = 256;                 // below this it cannot fill the panel cleanly
const MAX_BYTES = 8 * 1024 * 1024;
const THUMB_EDGE = 320;               // the list slot is small; 320 covers retina
const MASTER_MAX_EDGE = 1280;

const c = {
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`
};

/* ---------- catalogues ------------------------------------------------- */

// Both catalogue files are browser globals; run them in a sandbox to read them
// rather than keeping a second copy of either list in here.
function loadBrowserGlobal(relPath, globalName) {
  const sandbox = {};
  sandbox.self = sandbox;
  sandbox.window = sandbox;
  vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.join(root, relPath), 'utf8'), sandbox);
  return sandbox[globalName] || [];
}

// The in-app substitution picker and the import fuzzy-matcher both draw on a
// second, older list (EXERCISE_DICTIONARY, 66 entries) that pre-dates
// exercise-catalog-extra.js and was never folded into it. An exercise that
// lives only there - e.g. "Leg Curl Unilaterale", "Nordic Curl Assistito" -
// is real and selectable in the app, but was invisible to the catalogue
// below: any photo supplied for it came back UNRESOLVED with no way to fix
// it short of hand-editing this file. Extracted from its source rather than
// duplicated, since it is generated code, not hand-maintained data.
function loadBaseExerciseDictionary() {
  try {
    const src = fs.readFileSync(path.join(root, 'prepare_task20_import_engine.mjs'), 'utf8');
    const m = src.match(/var EXERCISE_DICTIONARY = (\[[\s\S]*?\n\]);/);
    if (!m) return [];
    const sandbox = {};
    vm.createContext(sandbox);
    vm.runInContext('var EXERCISE_DICTIONARY = ' + m[1] + ';', sandbox);
    return sandbox.EXERCISE_DICTIONARY || [];
  } catch (_) {
    return [];
  }
}

function loadCatalogues() {
  const exercises = loadBrowserGlobal('web/exercise-catalog-extra.js', 'WEB_EXERCISE_CATALOG');
  const warmups = loadBrowserGlobal('web/warmup-exercise-library.js', 'WARMUP_EXERCISE_LIBRARY');
  const baseDictionary = loadBaseExerciseDictionary();
  const byExerciseId = new Map();
  exercises.forEach((ex) => {
    if (!ex || !ex.name) return;
    byExerciseId.set(canonicalExerciseId(ex.name), ex.name);
  });
  baseDictionary.forEach((ex) => {
    if (!ex || !ex.normalized) return;
    const id = canonicalExerciseId(ex.normalized);
    if (!byExerciseId.has(id)) byExerciseId.set(id, ex.normalized);
  });
  const warmupIds = new Map();
  warmups.forEach((w) => {
    if (w && w.id) warmupIds.set(String(w.id), w.name || w.id);
  });
  return { byExerciseId, warmupIds };
}

/* ---------- scan + map ------------------------------------------------- */

// A thumbnail supplied alongside the master is ignored rather than treated as
// its own asset: the thumbnail is derived here so every one comes out at the
// same size the list slot expects. Left in, these would each be reported as an
// unresolved exercise called "..._thumb", which is noise, not a problem.
const THUMB_SUFFIX = /[-_]thumb$/i;

function isSuppliedThumbnail(file) {
  return THUMB_SUFFIX.test(path.basename(file, path.extname(file)));
}

function scanFolder(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .map((f) => path.join(dir, f));
}

function scanMasters(dir) {
  const all = scanFolder(dir);
  return {
    masters: all.filter((f) => !isSuppliedThumbnail(f)),
    ignoredThumbs: all.filter(isSuppliedThumbnail).length
  };
}

// Edit distance, used only to name a likely intended target in the report. It
// never selects anything: a near miss is still unresolved, because quietly
// attaching one exercise's artwork to another reads as a content mistake rather
// than an ingest one, and nobody would go looking for it here.
function editDistance(a, b) {
  const rows = Array.from({ length: b.length + 1 }, (_, i) => [i, ...Array(a.length).fill(0)]);
  for (let j = 0; j <= a.length; j++) rows[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      rows[i][j] = Math.min(
        rows[i - 1][j] + 1,
        rows[i][j - 1] + 1,
        rows[i - 1][j - 1] + (a[j - 1] === b[i - 1] ? 0 : 1)
      );
    }
  }
  return rows[b.length][a.length];
}

function nearestId(id, candidates) {
  let best = null;
  let bestScore = Infinity;
  for (const candidate of candidates) {
    const d = editDistance(id, candidate);
    if (d < bestScore) { bestScore = d; best = candidate; }
  }
  // Only worth mentioning when it is genuinely close to the filename given.
  if (best && bestScore <= Math.max(3, Math.floor(id.length * 0.34))) return { id: best, distance: bestScore };
  return null;
}

function mapFiles(catalogues) {
  const candidates = [];
  const unresolved = [];
  let ignoredThumbs = 0;

  const exScan = scanMasters(path.join(SOURCE, 'exercises'));
  ignoredThumbs += exScan.ignoredThumbs;
  exScan.masters.forEach((file) => {
    const stem = path.basename(file, path.extname(file));
    const id = canonicalExerciseId(stem);
    if (catalogues.byExerciseId.has(id)) {
      candidates.push({ ownerType: 'exercise', ownerId: id, label: catalogues.byExerciseId.get(id), file });
      return;
    }
    const near = nearestId(id, catalogues.byExerciseId.keys());
    unresolved.push({
      file,
      derived: id,
      reason: 'the filename derives to an id no exercise in the catalogue has',
      suggestion: near
        ? `closest catalogue id is "${near.id}" (${catalogues.byExerciseId.get(near.id)}) - rename the file if that is the one meant`
        : 'no catalogue id is close to it; check the exercise name, or the exercise may not be in the catalogue at all'
    });
  });

  const wuScan = scanMasters(path.join(SOURCE, 'warmups'));
  ignoredThumbs += wuScan.ignoredThumbs;
  wuScan.masters.forEach((file) => {
    const id = path.basename(file, path.extname(file));
    if (catalogues.warmupIds.has(id)) {
      candidates.push({ ownerType: 'warmup', ownerId: id, label: catalogues.warmupIds.get(id), file });
      return;
    }
    const near = nearestId(id, catalogues.warmupIds.keys());
    unresolved.push({
      file,
      derived: id,
      reason: 'a warm-up filename must be exactly a library id, and this is not one',
      suggestion: near
        ? `closest library id is "${near.id}" (${catalogues.warmupIds.get(near.id)})`
        : 'no library id is close to it'
    });
  });

  // "Unique" is the part that matters. Two files landing on the same owner is
  // not a match, it is a question about which one was meant - and left alone
  // the second would silently replace the first.
  const byOwner = new Map();
  candidates.forEach((entry) => {
    const key = `${entry.ownerType}:${entry.ownerId}`;
    if (!byOwner.has(key)) byOwner.set(key, []);
    byOwner.get(key).push(entry);
  });

  const matched = [];
  byOwner.forEach((entries, key) => {
    if (entries.length === 1) { matched.push(entries[0]); return; }
    const names = entries.map((e) => path.basename(e.file)).join(', ');
    entries.forEach((entry) => {
      unresolved.push({
        file: entry.file,
        derived: entry.ownerId,
        reason: `${entries.length} files map to ${key}, so the match is not unique`,
        suggestion: `competing files: ${names} - keep one and remove or rename the others`
      });
    });
  });

  return { matched, unresolved, ignoredThumbs };
}

/* ---------- validate + transform --------------------------------------- */

let sharp = null;
async function loadSharp() {
  if (sharp) return sharp;
  try {
    ({ default: sharp } = await import('sharp'));
    return sharp;
  } catch (_) {
    return null;
  }
}

async function inspect(entry) {
  const stat = fs.statSync(entry.file);
  const problems = [];
  if (stat.size > MAX_BYTES) problems.push(`${(stat.size / 1024 / 1024).toFixed(1)}MB exceeds the ${MAX_BYTES / 1024 / 1024}MB limit`);
  if (stat.size === 0) problems.push('file is empty');

  let meta = null;
  const lib = await loadSharp();
  if (lib) {
    try {
      meta = await lib(entry.file).metadata();
      if (!meta.width || !meta.height) problems.push('could not read image dimensions');
      else if (Math.min(meta.width, meta.height) < MIN_EDGE) {
        problems.push(`${meta.width}x${meta.height} is below the ${MIN_EDGE}px minimum edge`);
      }
    } catch (err) {
      problems.push('not a readable image: ' + (err && err.message));
    }
  }
  return { ...entry, bytes: stat.size, meta, problems };
}

async function renderVariants(entry) {
  const lib = await loadSharp();
  if (!lib) throw new Error('sharp is required to produce thumbnails: npm i -D sharp');
  const master = await lib(entry.file)
    .resize({ width: MASTER_MAX_EDGE, height: MASTER_MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 88 })
    .toBuffer({ resolveWithObject: true });
  const thumb = await lib(entry.file)
    .resize({ width: THUMB_EDGE, height: THUMB_EDGE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  return {
    masterBuffer: master.data,
    width: master.info.width,
    height: master.info.height,
    thumbBuffer: thumb
  };
}

/* ---------- upload + upsert -------------------------------------------- */

function keysFor(entry) {
  const folder = entry.ownerType === 'warmup' ? 'warmups' : 'exercises';
  return {
    master: `${folder}/${entry.ownerId}/master.webp`,
    thumb: `${folder}/${entry.ownerId}/thumb.webp`
  };
}

async function ingestOne(entry, provider, pool) {
  const variants = await renderVariants(entry);
  const keys = keysFor(entry);

  const master = await provider.upload(keys.master, variants.masterBuffer, { contentType: 'image/webp' });
  const thumb = await provider.upload(keys.thumb, variants.thumbBuffer, { contentType: 'image/webp' });

  const row = await assignMedia(pool, {
    ownerType: entry.ownerType,
    ownerId: entry.ownerId,
    mediaType: 'image',
    variant: 'master',
    storageProvider: 'r2',
    storageKey: keys.master,
    publicUrl: master.url,
    thumbnailKey: keys.thumb,
    thumbnailUrl: thumb.url,
    mimeType: 'image/webp',
    width: variants.width,
    height: variants.height,
    fileSizeBytes: variants.masterBuffer.length,
    matchType: 'exact',
    source: 'nurvan',
    license: 'Nurvan original asset'
  });
  return { row, keys, url: master.url };
}

/* ---------- report ------------------------------------------------------ */

// Written next to the source folder so the list can be worked through file by
// file, rather than scrolled back to in a terminal.
const UNRESOLVED_REPORT = 'media-ingest-unresolved.txt';

function writeUnresolvedReport(unresolved) {
  const lines = [
    'UNRESOLVED - files that were NOT imported',
    new Date().toISOString(),
    '',
    'None of these were attached to any exercise. A filename that does not',
    'resolve to exactly one catalogue entry is left alone on purpose: guessing',
    'would put one exercise\'s artwork on another, and that reads as a content',
    'mistake rather than an ingest one.',
    ''
  ];
  unresolved.forEach((u) => {
    lines.push(path.basename(u.file));
    lines.push('  derives to: ' + u.derived);
    lines.push('  cause:      ' + u.reason);
    if (u.suggestion) lines.push('  hint:       ' + u.suggestion);
    lines.push('');
  });
  const target = path.join(SOURCE, UNRESOLVED_REPORT);
  try {
    fs.writeFileSync(target, lines.join('\n'), 'utf8');
    console.log(c.dim(`\n  written to ${target}`));
  } catch (_) {}
}

function reportCoverage(catalogues, matched) {
  const have = new Set(matched.map((m) => `${m.ownerType}:${m.ownerId}`));
  const missingExercises = [...catalogues.byExerciseId.entries()]
    .filter(([id]) => !have.has('exercise:' + id));
  const missingWarmups = [...catalogues.warmupIds.entries()]
    .filter(([id]) => !have.has('warmup:' + id));

  const exTotal = catalogues.byExerciseId.size;
  const wuTotal = catalogues.warmupIds.size;
  console.log(c.bold('\nCoverage'));
  console.log(`  exercises  ${exTotal - missingExercises.length}/${exTotal}`);
  console.log(`  warm-ups   ${wuTotal - missingWarmups.length}/${wuTotal}`);
  if (missingExercises.length) {
    console.log(c.dim(`\n  Still without imagery (they keep working and show the placeholder):`));
    missingExercises.slice(0, 15).forEach(([id, name]) => console.log(c.dim(`    ${id}  ${c.dim('- ' + name)}`)));
    if (missingExercises.length > 15) console.log(c.dim(`    ... and ${missingExercises.length - 15} more`));
  }
  return { missingExercises, missingWarmups };
}

/* ---------- verify ------------------------------------------------------ */

async function verifyAgainstApi(pool, matched) {
  const { getMediaManifest } = await import('./server/media/exercise-media-service.mjs');
  console.log(c.bold('\nVerifying what the resolution service returns'));
  let ok = 0;
  let bad = 0;
  for (const entry of matched) {
    const manifest = await getMediaManifest(pool, entry.ownerType, entry.ownerId, entry.label);
    const good = manifest && manifest.hasMedia && manifest.media && manifest.media.master;
    if (good) { ok++; } else {
      bad++;
      console.log(c.red(`  MISS  ${entry.ownerType}:${entry.ownerId} -> status=${manifest && manifest.status}`));
    }
  }
  console.log(`  resolves: ${c.green(String(ok))} ok, ${bad ? c.red(String(bad)) : '0'} missing`);
  return bad === 0;
}

/* ---------- main -------------------------------------------------------- */

async function main() {
  console.log(c.bold('\nNurvan exercise media ingest'));
  console.log(c.dim(`  source: ${SOURCE}`));
  console.log(c.dim(`  mode:   ${APPLY ? 'APPLY - uploads and writes rows' : 'dry run - writes nothing'}`));

  if (!fs.existsSync(SOURCE)) {
    console.log(c.yellow(`\nNo source folder at ${SOURCE}.`));
    console.log(`Create it with:\n  ${SOURCE}${path.sep}exercises${path.sep}\n  ${SOURCE}${path.sep}warmups${path.sep}`);
    process.exit(1);
  }

  const catalogues = loadCatalogues();
  console.log(c.dim(`  catalogue: ${catalogues.byExerciseId.size} exercises, ${catalogues.warmupIds.size} warm-ups`));

  let { matched, unresolved, ignoredThumbs } = mapFiles(catalogues);
  if (ONLY) matched = matched.filter((m) => ONLY.includes(m.ownerId));

  if (unresolved.length) {
    console.log(c.bold(c.yellow(`\nUNRESOLVED - ${unresolved.length} file(s), none of them imported`)));
    unresolved.forEach((u) => {
      console.log(c.yellow(`  ${path.basename(u.file)}`));
      console.log(c.dim(`      derives to: ${u.derived}`));
      console.log(c.dim(`      cause:      ${u.reason}`));
      if (u.suggestion) console.log(c.dim(`      hint:       ${u.suggestion}`));
    });
    writeUnresolvedReport(unresolved);
  }

  if (!matched.length) {
    console.log(c.yellow('\nNothing to ingest.'));
    reportCoverage(catalogues, []);
    process.exit(unresolved.length ? 1 : 0);
  }

  console.log(c.bold(`\nValidating ${matched.length} file(s)`));
  const inspected = [];
  for (const entry of matched) inspected.push(await inspect(entry));
  const rejected = inspected.filter((e) => e.problems.length);
  const accepted = inspected.filter((e) => !e.problems.length);

  rejected.forEach((e) => {
    console.log(c.red(`  REJECT ${e.ownerId}`) + c.dim(`  ${path.basename(e.file)}`));
    e.problems.forEach((p) => console.log(c.red(`         ${p}`)));
  });
  if (!(await loadSharp())) {
    console.log(c.yellow('\n  sharp is not installed, so dimensions were not checked and thumbnails cannot be produced.'));
    console.log(c.yellow('  Install it before --apply:  npm i -D sharp'));
  }
  console.log(`  ${c.green(String(accepted.length))} ready, ${rejected.length ? c.red(String(rejected.length)) : '0'} rejected`);

  reportCoverage(catalogues, accepted);

  if (!APPLY) {
    console.log(c.bold('\nDry run - nothing was uploaded and no row was written.'));
    console.log('Re-run with --apply once the mapping above looks right.');
    return;
  }

  const provider = getMediaStorageProvider();
  if (!provider || typeof provider.isConfigured !== 'function' || !provider.isConfigured()) {
    console.log(c.red('\nStorage is not configured. Set the MEDIA_STORAGE_* variables and MEDIA_STORAGE_ENABLED=true.'));
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.log(c.red('\nDATABASE_URL is not set, so no row can be written.'));
    process.exit(1);
  }

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: /localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL) ? false : { rejectUnauthorized: false }
  });

  console.log(c.bold(`\nUploading ${accepted.length} asset(s)`));
  let done = 0;
  const failures = [];
  for (const entry of accepted) {
    try {
      const res = await ingestOne(entry, provider, pool);
      done++;
      console.log(c.green(`  OK  ${entry.ownerType}:${entry.ownerId}`) + c.dim(`  v${res.row.version}  ${res.url}`));
    } catch (err) {
      failures.push({ entry, err });
      console.log(c.red(`  FAIL ${entry.ownerType}:${entry.ownerId}  ${err && err.message}`));
    }
  }

  console.log(c.bold(`\n${done}/${accepted.length} ingested`));
  if (failures.length) console.log(c.red(`${failures.length} failed - rerun to retry, each upsert replaces its own slot`));

  if (VERIFY || !failures.length) await verifyAgainstApi(pool, accepted.filter((e) => !failures.find((f) => f.entry === e)));

  await pool.end();
  if (failures.length) process.exit(1);
}

// Only when run as a command, so the pieces above can be imported and checked
// without a stray ingest starting.
const invokedDirectly = process.argv[1]
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (invokedDirectly) {
  main().catch((err) => {
    console.error(c.red('\ningest failed: ' + (err && err.stack || err)));
    process.exit(1);
  });
}

export { loadCatalogues, mapFiles, inspect, renderVariants, keysFor };
