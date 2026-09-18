import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { loadCatalogues } from './ingest_exercise_media.mjs';
import { EXERCISE_MEDIA_ALIASES } from './server/media/exercise-media-service.mjs';

const OUT = process.argv[2] || null;

/* ---------- catalogue ---------- */
const { byExerciseId, warmupIds } = loadCatalogues();

/* ---------- source files ---------- */
function canon(name) {
  return name.replace(/\.[a-z0-9]+$/i, '')
    .toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}
function scanSource(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => /\.(webp|jpg|jpeg|png)$/i.test(f) && !/[-_]thumb\./i.test(f))
    .map(f => {
      const buf = fs.readFileSync(path.join(dir, f));
      return { file: f, id: canon(f), sha: crypto.createHash('sha256').update(buf).digest('hex') };
    });
}
const srcEx = scanSource(path.join('media-source', 'exercises'));
const srcWu = scanSource(path.join('media-source', 'warmups'));

const srcExById = new Map();
srcEx.forEach(r => { if (!srcExById.has(r.id)) srcExById.set(r.id, []); srcExById.get(r.id).push(r); });
const srcWuById = new Map();
srcWu.forEach(r => { if (!srcWuById.has(r.id)) srcWuById.set(r.id, []); srcWuById.get(r.id).push(r); });

/* ---------- DB ---------- */
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const { rows: allRows } = await pool.query(
  'SELECT id, owner_type, owner_id, storage_key, thumbnail_key, status, version FROM exercise_media'
);
await pool.end();
const activeRows = allRows.filter(r => r.status === 'active');
const activeByOwner = new Map();
activeRows.forEach(r => {
  const k = `${r.owner_type}:${r.owner_id}`;
  if (!activeByOwner.has(k)) activeByOwner.set(k, []);
  activeByOwner.get(k).push(r);
});

/* ---------- R2 ---------- */
const client = new S3Client({
  region: 'auto',
  endpoint: process.env.MEDIA_STORAGE_ENDPOINT,
  credentials: {
    accessKeyId: process.env.MEDIA_STORAGE_ACCESS_KEY_ID,
    secretAccessKey: process.env.MEDIA_STORAGE_SECRET_ACCESS_KEY
  }
});
async function listAll() {
  let token; const out = [];
  do {
    const res = await client.send(new ListObjectsV2Command({
      Bucket: process.env.MEDIA_STORAGE_BUCKET, ContinuationToken: token
    }));
    (res.Contents || []).forEach(o => out.push({ key: o.Key, etag: (o.ETag || '').replace(/"/g, ''), size: o.Size }));
    token = res.IsTruncated ? res.NextContinuationToken : undefined;
  } while (token);
  return out;
}
const objects = await listAll();
const objByKey = new Map(objects.map(o => [o.key, o]));

/* ---------- per-owner rollup ---------- */
function rollup(map, ownerType, srcById) {
  const rowsOut = [];
  for (const [id, name] of map.entries()) {
    const key = `${ownerType}:${id}`;
    const dbRows = activeByOwner.get(key) || [];
    const dbRow = dbRows[0] || null;
    const masterKey = dbRow?.storage_key || null;
    const thumbKey = dbRow?.thumbnail_key || null;
    rowsOut.push({
      ownerType, id, name,
      sourceFiles: (srcById.get(id) || []).map(r => r.file),
      dbRowCount: dbRows.length,
      dbRowId: dbRow?.id || null,
      version: dbRow?.version || null,
      masterKey,
      thumbKey,
      masterInR2: masterKey ? objByKey.has(masterKey) : false,
      thumbInR2: thumbKey ? objByKey.has(thumbKey) : false,
      present: dbRows.length > 0,
      keyMatchesOwner: masterKey ? masterKey.startsWith(`${ownerType === 'warmup' ? 'warmups' : 'exercises'}/${id}/`) : null
    });
  }
  return rowsOut;
}
const exRoll = rollup(byExerciseId, 'exercise', srcExById);
const wuRoll = rollup(warmupIds, 'warmup', srcWuById);

/* ---------- integrity ---------- */
const referenced = new Set();
activeRows.forEach(r => { if (r.storage_key) referenced.add(r.storage_key); if (r.thumbnail_key) referenced.add(r.thumbnail_key); });
const orphans = objects.filter(o => !referenced.has(o.key));
const dangling = activeRows.filter(r => (r.storage_key && !objByKey.has(r.storage_key)) || (r.thumbnail_key && !objByKey.has(r.thumbnail_key)));

const byKeyOwners = new Map();
activeRows.forEach(r => {
  if (!r.storage_key) return;
  if (!byKeyOwners.has(r.storage_key)) byKeyOwners.set(r.storage_key, new Set());
  byKeyOwners.get(r.storage_key).add(`${r.owner_type}:${r.owner_id}`);
});
const dupKeys = [...byKeyOwners.entries()].filter(([, o]) => o.size > 1);

const byEtag = new Map();
activeRows.forEach(r => {
  if (!r.storage_key || !/\/master\.webp$/.test(r.storage_key)) return;
  const o = objByKey.get(r.storage_key);
  if (!o) return;
  if (!byEtag.has(o.etag)) byEtag.set(o.etag, new Set());
  byEtag.get(o.etag).add(`${r.owner_type}:${r.owner_id}`);
});
const dupContent = [...byEtag.entries()].filter(([, o]) => o.size > 1);

/* ---------- unresolved source files ---------- */
const catalogueExIds = new Set(byExerciseId.keys());
const catalogueWuIds = new Set(warmupIds.keys());
const unresolvedFiles = [];
for (const [id, list] of srcExById) {
  if (!catalogueExIds.has(id)) list.forEach(r => unresolvedFiles.push({ folder: 'exercises', file: r.file, derivesTo: id, cause: 'no catalogue exercise has this id' }));
  else if (list.length > 1) list.forEach(r => unresolvedFiles.push({ folder: 'exercises', file: r.file, derivesTo: id, cause: `${list.length} files map to this id` }));
}
for (const [id, list] of srcWuById) {
  if (!catalogueWuIds.has(id)) list.forEach(r => unresolvedFiles.push({ folder: 'warmups', file: r.file, derivesTo: id, cause: 'no catalogue warm-up has this id' }));
  else if (list.length > 1) list.forEach(r => unresolvedFiles.push({ folder: 'warmups', file: r.file, derivesTo: id, cause: `${list.length} files map to this id` }));
}

/* ---------- report ---------- */
const exPresentById = new Map(exRoll.map(r => [r.id, r.present]));
exRoll.forEach(r => {
  const twin = EXERCISE_MEDIA_ALIASES[r.id];
  r.aliasOf = !r.present && twin && exPresentById.get(twin) ? twin : null;
});
const exPresent = exRoll.filter(r => r.present);
const exAliased = exRoll.filter(r => r.aliasOf);
const exMissing = exRoll.filter(r => !r.present && !r.aliasOf);
const wuPresent = wuRoll.filter(r => r.present);
const wuMissing = wuRoll.filter(r => !r.present);

console.log('='.repeat(64));
console.log('NURVAN MEDIA — FULL RECONCILIATION');
console.log('='.repeat(64));
console.log(`EXPECTED                 ${byExerciseId.size} exercises / ${warmupIds.size} warmups`);
console.log(`PRESENT (own media)      ${exPresent.length} exercises / ${wuPresent.length} warmups`);
console.log(`SERVED VIA ALIAS         ${exAliased.length} exercises (${exAliased.map(r => `${r.id}->${r.aliasOf}`).join(', ') || 'none'})`);
console.log(`WITH AN IMAGE            ${exPresent.length + exAliased.length}/${byExerciseId.size} exercises`);
console.log(`MISSING                  ${exMissing.length} exercises / ${wuMissing.length} warmups`);
console.log(`UNRESOLVED (source)      ${unresolvedFiles.length} files`);
console.log(`ORPHAN R2                ${orphans.length}`);
console.log(`DANGLING DB              ${dangling.length}`);
console.log(`DUPLICATE STORAGE KEYS   ${dupKeys.length}`);
console.log(`DUPLICATE FILE CONTENT   ${dupContent.length}`);
console.log(`R2 objects               ${objects.length}`);
console.log(`DB rows (all/active)     ${allRows.length}/${activeRows.length}`);

const badKey = [...exRoll, ...wuRoll].filter(r => r.present && r.keyMatchesOwner === false);
const noMaster = [...exRoll, ...wuRoll].filter(r => r.present && !r.masterInR2);
const noThumb = [...exRoll, ...wuRoll].filter(r => r.present && !r.thumbInR2);
const multiRow = [...exRoll, ...wuRoll].filter(r => r.dbRowCount > 1);
console.log(`KEY/OWNER MISMATCH       ${badKey.length}`);
console.log(`ACTIVE W/O R2 MASTER     ${noMaster.length}`);
console.log(`ACTIVE W/O R2 THUMB      ${noThumb.length}`);
console.log(`OWNERS W/ >1 ACTIVE ROW  ${multiRow.length}`);

console.log('\n--- MISSING EXERCISES ---');
exMissing.forEach(r => console.log(`  ${r.id}  (${r.name})  sourceFiles=[${r.sourceFiles.join(', ') || 'NONE'}]`));
console.log('\n--- MISSING WARMUPS ---');
wuMissing.forEach(r => console.log(`  ${r.id}  (${r.name})  sourceFiles=[${r.sourceFiles.join(', ') || 'NONE'}]`));
console.log('\n--- UNRESOLVED SOURCE FILES ---');
unresolvedFiles.forEach(r => console.log(`  ${r.folder}/${r.file}  -> ${r.derivesTo}  (${r.cause})`));
console.log('\n--- ORPHAN R2 ---');
orphans.forEach(o => console.log(`  ${o.key}`));
console.log('\n--- DANGLING DB ---');
dangling.forEach(r => console.log(`  ${r.owner_type}:${r.owner_id} ${r.storage_key}`));
console.log('\n--- DUPLICATE STORAGE KEYS ---');
dupKeys.forEach(([k, o]) => console.log(`  ${k} -> ${[...o].join(', ')}`));
console.log('\n--- DUPLICATE FILE CONTENT ---');
dupContent.forEach(([e, o]) => console.log(`  etag ${e.slice(0, 12)} -> ${[...o].join(', ')}`));
if (badKey.length) { console.log('\n--- KEY/OWNER MISMATCH ---'); badKey.forEach(r => console.log(`  ${r.ownerType}:${r.id} -> ${r.masterKey}`)); }
if (noMaster.length) { console.log('\n--- ACTIVE WITHOUT R2 MASTER ---'); noMaster.forEach(r => console.log(`  ${r.ownerType}:${r.id} -> ${r.masterKey}`)); }
if (noThumb.length) { console.log('\n--- ACTIVE WITHOUT R2 THUMB ---'); noThumb.forEach(r => console.log(`  ${r.ownerType}:${r.id} -> ${r.thumbKey}`)); }
if (multiRow.length) { console.log('\n--- OWNERS WITH >1 ACTIVE ROW ---'); multiRow.forEach(r => console.log(`  ${r.ownerType}:${r.id} rows=${r.dbRowCount}`)); }

if (OUT) {
  fs.writeFileSync(OUT, JSON.stringify({ exRoll, wuRoll, orphans, dangling, dupKeys: dupKeys.map(([k, o]) => [k, [...o]]), dupContent: dupContent.map(([e, o]) => [e, [...o]]), unresolvedFiles }, null, 2));
  console.log(`\nJSON written to ${OUT}`);
}
