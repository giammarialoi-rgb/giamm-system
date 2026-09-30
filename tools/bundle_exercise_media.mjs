#!/usr/bin/env node
/*
 * Exercise and warm-up images inside the app, so they show at once and
 * offline instead of being fetched one by one from the media server.
 *
 *   node tools/bundle_exercise_media.mjs            download from production
 *   node tools/bundle_exercise_media.mjs --api URL  from another server
 *
 * For every catalogue exercise and warm-up it asks the server what it would
 * show (aliases included), downloads master and thumbnail once each and
 * writes web/media/index.json: "exercise:<id>" / "warmup:<id>" -> the same
 * manifest the server returns, with local paths. exercise-media-client.js
 * reads that index first and falls back to the server for anything not in it,
 * so an image added later still appears before the next bundle.
 * Re-run after `ingest_exercise_media.mjs --apply`.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { loadCatalogues } from '../ingest_exercise_media.mjs';

const argv = process.argv.slice(2);
const api = (argv.includes('--api') ? argv[argv.indexOf('--api') + 1] : 'https://coach-api-gemini.onrender.com').replace(/\/$/, '');
const outDir = path.resolve('web/media');
const filesDir = path.join(outDir, 'files');
fs.mkdirSync(filesDir, { recursive: true });

const saved = new Map(); // remote url -> local path
async function localCopy(url) {
  if (!url) return null;
  if (saved.has(url)) return saved.get(url);
  const ext = (path.extname(new URL(url).pathname) || '.webp').toLowerCase();
  const name = crypto.createHash('sha1').update(url).digest('hex').slice(0, 16) + ext;
  const res = await fetch(url);
  if (!res.ok) throw new Error(url + ' -> HTTP ' + res.status);
  fs.writeFileSync(path.join(filesDir, name), Buffer.from(await res.arrayBuffer()));
  const rel = 'media/files/' + name;
  saved.set(url, rel);
  return rel;
}

const { byExerciseId, warmupIds } = loadCatalogues();
const jobs = [];
for (const [id, name] of byExerciseId) jobs.push(['exercise', id, '/api/exercises/' + encodeURIComponent(id) + '/media?name=' + encodeURIComponent(name)]);
for (const [id] of warmupIds) jobs.push(['warmup', id, '/api/warmups/' + encodeURIComponent(id) + '/media']);

const index = {};
let missing = 0;
const queue = jobs.slice();
async function worker() {
  while (queue.length) {
    const [type, id, p] = queue.shift();
    const m = await fetch(api + p).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    if (!m || !m.hasMedia || !m.media || !m.media.master) { missing++; continue; }
    const master = await localCopy(m.media.master);
    const thumb = await localCopy(m.media.thumbnail || m.media.master);
    index[type + ':' + id] = Object.assign({}, m, { media: Object.assign({}, m.media, { master, thumbnail: thumb, animation: null }) });
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

// Files no longer referenced (an image replaced since the last bundle).
const used = new Set([...saved.values()].map((p) => path.basename(p)));
for (const f of fs.readdirSync(filesDir)) if (!used.has(f)) fs.unlinkSync(path.join(filesDir, f));

const sorted = Object.fromEntries(Object.keys(index).sort().map((k) => [k, index[k]]));
fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(sorted));
const bytes = [...used].reduce((n, f) => n + fs.statSync(path.join(filesDir, f)).size, 0);
console.log('bundled ' + Object.keys(index).length + ' entries, ' + used.size + ' files, ' + Math.round(bytes / 1024) + ' KB; without media: ' + missing);
