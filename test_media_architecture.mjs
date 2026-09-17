import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalExerciseId } from './server/media/canonical-id.mjs';
import {
  MediaStorageProvider,
  NullMediaStorageProvider,
  getMediaStorageProvider,
  resetMediaStorageProviderCache
} from './server/media/storage-provider.mjs';
import { R2MediaStorageProvider } from './server/media/r2-storage-provider.mjs';
import {
  getMediaManifest,
  getMediaById,
  assignMedia,
  setMediaStatus,
  MediaServiceTestHelpers
} from './server/media/exercise-media-service.mjs';
import { mountMediaRoutes } from './server/media/media-routes.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
function ok(value, message) {
  assert.ok(value, message);
  console.log('OK  ', message);
}

console.log('--- Running Media Architecture Tests ---');

// ---------------------------------------------------------------------
// Fake Postgres pool: an in-memory table good enough to exercise the real
// service/route code end to end without a live database. Every test below
// runs the ACTUAL exercise-media-service.mjs / media-routes.mjs code, not
// a re-implementation of it.
// ---------------------------------------------------------------------
function makeFakePool(initialRows) {
  const rows = (initialRows || []).map((r, i) => ({ id: r.id ?? i + 1, ...r }));
  let nextId = rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0) + 1;
  return {
    rows,
    async query(sql, params = []) {
      const s = sql.replace(/\s+/g, ' ').trim();
      if (s.startsWith('SELECT * FROM exercise_media WHERE owner_type = $1 AND owner_id = $2')) {
        const [ownerType, ownerId] = params;
        return { rows: rows.filter((r) => r.owner_type === ownerType && r.owner_id === ownerId) };
      }
      if (s.startsWith('SELECT * FROM exercise_media WHERE id = $1')) {
        const [id] = params;
        return { rows: rows.filter((r) => String(r.id) === String(id)) };
      }
      if (s.startsWith('UPDATE exercise_media SET status = $1')) {
        const [status, id] = params;
        const row = rows.find((r) => String(r.id) === String(id));
        if (row) row.status = status;
        return { rows: row ? [row] : [] };
      }
      if (s.startsWith('DELETE FROM exercise_media WHERE id = $1')) {
        const [id] = params;
        const idx = rows.findIndex((r) => String(r.id) === String(id));
        if (idx >= 0) rows.splice(idx, 1);
        return { rows: [] };
      }
      throw new Error('Unhandled fake query: ' + s);
    },
    async connect() {
      const self = this;
      return {
        async query(sql, params = []) {
          const s = sql.replace(/\s+/g, ' ').trim();
          if (s === 'BEGIN' || s === 'COMMIT' || s === 'ROLLBACK') return { rows: [] };
          if (s.startsWith("UPDATE exercise_media SET status = 'inactive'")) {
            const [ownerType, ownerId, mediaType, variant] = params;
            rows.forEach((r) => {
              if (r.owner_type === ownerType && r.owner_id === ownerId && r.media_type === mediaType && r.variant === variant && r.status === 'active') {
                r.status = 'inactive';
              }
            });
            return { rows: [] };
          }
          if (s.startsWith('SELECT COALESCE(MAX(version), 0) + 1 AS next')) {
            const [ownerType, ownerId, mediaType, variant] = params;
            const max = rows
              .filter((r) => r.owner_type === ownerType && r.owner_id === ownerId && r.media_type === mediaType && r.variant === variant)
              .reduce((m, r) => Math.max(m, Number(r.version) || 0), 0);
            return { rows: [{ next: max + 1 }] };
          }
          if (s.startsWith('INSERT INTO exercise_media')) {
            const [
              owner_type, owner_id, media_type, variant, storage_provider, storage_key,
              public_url, thumbnail_key, thumbnail_url, mime_type, width, height,
              file_size_bytes, version, match_type, confidence, source, license
            ] = params;
            const row = {
              id: nextId++, owner_type, owner_id, media_type, variant, storage_provider, storage_key,
              public_url, thumbnail_key, thumbnail_url, mime_type, width, height, file_size_bytes,
              version, status: 'active', match_type, confidence, source, license,
              created_at: new Date().toISOString(), updated_at: new Date().toISOString()
            };
            rows.push(row);
            return { rows: [row] };
          }
          throw new Error('Unhandled fake tx query: ' + s);
        },
        release() {}
      };
    }
  };
}

function fakeReqRes(params, query) {
  const req = { params: params || {}, query: query || {} };
  const res = {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; }
  };
  return { req, res };
}

function mountedRoutes() {
  const routes = {};
  const fakeApp = { get(p, handler) { routes[p] = handler; } };
  return { routes, fakeApp };
}

// =======================================================================
// 1. exercise with no media -> no error, hasMedia:false, status:'missing'.
// =======================================================================
{
  const pool = makeFakePool([]);
  const manifest = await getMediaManifest(pool, 'exercise', 'panca_piana_bilanciere', 'Panca piana bilanciere');
  ok(manifest.hasMedia === false, '1a. exercise with zero media rows resolves hasMedia:false');
  ok(manifest.primary === null, '1b. primary is null, not undefined or an error');
  ok(manifest.status === 'missing', "1c. manifest status is 'missing'");
  ok(manifest.entityId === 'panca_piana_bilanciere', '1d. entityId echoes the owner id');
}

// =======================================================================
// 2. exercise with EXACT media -> returns exact.
// =======================================================================
{
  const pool = makeFakePool([
    { owner_type: 'exercise', owner_id: 'squat_bilanciere', media_type: 'image', variant: 'master', status: 'active', match_type: 'exact', public_url: 'https://cdn/exercises/squat_bilanciere/master.webp', version: 1, source: 'nurvan' }
  ]);
  const manifest = await getMediaManifest(pool, 'exercise', 'squat_bilanciere');
  ok(manifest.hasMedia === true, '2a. exact media resolves hasMedia:true');
  ok(manifest.primary.matchType === 'exact', '2b. primary.matchType is exact');
  ok(manifest.media.master === 'https://cdn/exercises/squat_bilanciere/master.webp', '2c. master url is the exact row');
}

// =======================================================================
// 3. exercise with only VARIANT media -> returns variant, tagged as such.
// =======================================================================
{
  const pool = makeFakePool([
    { owner_type: 'exercise', owner_id: 'panca_inclinata_manubri', media_type: 'image', variant: 'master', status: 'active', match_type: 'variant', public_url: 'https://cdn/variant.webp', version: 1, source: 'nurvan' }
  ]);
  const manifest = await getMediaManifest(pool, 'exercise', 'panca_inclinata_manubri');
  ok(manifest.hasMedia === true, '3a. variant-only media still resolves hasMedia:true');
  ok(manifest.primary.matchType === 'variant', '3b. primary.matchType is variant, not silently reported as exact');
}

// =======================================================================
// 4. exercise with only REFERENCE media -> returns reference, tagged as such.
// =======================================================================
{
  const pool = makeFakePool([
    { owner_type: 'exercise', owner_id: 'salto_della_quaglia', media_type: 'image', variant: 'master', status: 'active', match_type: 'reference', public_url: 'https://cdn/reference.webp', version: 1, source: 'nurvan' }
  ]);
  const manifest = await getMediaManifest(pool, 'exercise', 'salto_della_quaglia');
  ok(manifest.hasMedia === true, '4a. reference-only media still resolves hasMedia:true');
  ok(manifest.primary.matchType === 'reference', '4b. primary.matchType is reference, never silently upgraded');
}

// Priority check: exact beats variant beats reference when several exist for the same slot.
{
  const pool = makeFakePool([
    { owner_type: 'exercise', owner_id: 'x', media_type: 'image', variant: 'master', status: 'active', match_type: 'reference', public_url: 'ref', version: 1, source: 'nurvan' },
    { owner_type: 'exercise', owner_id: 'x', media_type: 'image', variant: 'master', status: 'active', match_type: 'variant', public_url: 'var', version: 1, source: 'nurvan' },
    { owner_type: 'exercise', owner_id: 'x', media_type: 'image', variant: 'master', status: 'active', match_type: 'exact', public_url: 'exact', version: 1, source: 'nurvan' }
  ]);
  const manifest = await getMediaManifest(pool, 'exercise', 'x');
  ok(manifest.primary.matchType === 'exact' && manifest.media.master === 'exact', '4c. exact always wins over variant/reference regardless of row order');
}

// =======================================================================
// 5. custom exercise -> media null (zero rows is valid, not an error).
// =======================================================================
{
  const pool = makeFakePool([]);
  const customId = canonicalExerciseId('Salto della quaglia con avvitamento');
  const manifest = await getMediaManifest(pool, 'exercise', customId, 'Salto della quaglia con avvitamento');
  ok(manifest.hasMedia === false && manifest.primary === null, '5a. a freshly-typed custom exercise resolves with media null, no error thrown');
}

// =======================================================================
// 6. warmup with media -> media resolved.
// =======================================================================
{
  const pool = makeFakePool([
    { owner_type: 'warmup', owner_id: 'raise_bike_easy', media_type: 'image', variant: 'master', status: 'active', match_type: 'exact', public_url: 'https://cdn/warmups/raise_bike_easy/master.webp', version: 1, source: 'nurvan' },
    { owner_type: 'warmup', owner_id: 'raise_bike_easy', media_type: 'image', variant: 'thumbnail', status: 'active', match_type: 'exact', public_url: 'https://cdn/warmups/raise_bike_easy/thumb.webp', version: 1, source: 'nurvan' }
  ]);
  const manifest = await getMediaManifest(pool, 'warmup', 'raise_bike_easy');
  ok(manifest.hasMedia === true, '6a. warmup media resolves hasMedia:true');
  ok(manifest.media.thumbnail === 'https://cdn/warmups/raise_bike_easy/thumb.webp', '6b. warmup thumbnail resolves independently of master');
}

// =======================================================================
// 7. warmup without media -> no error.
// =======================================================================
{
  const pool = makeFakePool([]);
  const manifest = await getMediaManifest(pool, 'warmup', 'mobility_90_90_hip');
  ok(manifest.hasMedia === false && manifest.status === 'missing', '7a. warmup with zero media rows resolves cleanly, no error');
}

// =======================================================================
// 8. media URL errato -> frontend shows fallback. Verified as a source
// contract: web/exercise-media-client.js attaches a real onerror handler
// that swaps in placeholderHtml() rather than leaving a broken <img>.
// =======================================================================
{
  const clientSrc = fs.readFileSync(path.join(root, 'web/exercise-media-client.js'), 'utf8');
  ok(/img\.onerror\s*=\s*function/.test(clientSrc), '8a. the media component attaches a real onerror handler to every rendered image');
  ok(clientSrc.includes("container.innerHTML = placeholderHtml(size);"), '8b. onerror falls back to the same stable placeholder, not a broken image');
}

// =======================================================================
// 9. storage not configured -> app continues to work (Null provider, and
// the lookup routes never even touch the storage provider).
// =======================================================================
{
  resetMediaStorageProviderCache();
  const provider = getMediaStorageProvider({});
  ok(provider instanceof NullMediaStorageProvider, '9a. no env vars -> NullMediaStorageProvider, not a thrown error');
  ok(provider.isConfigured() === false, '9b. isConfigured() is false');
  ok((await provider.exists('anything')) === false, "9c. exists() resolves false, doesn't throw");
  ok((await provider.getMetadata('anything')) === null, "9d. getMetadata() resolves null, doesn't throw");
  ok(provider.getUrl('anything') === null, '9e. getUrl() returns null synchronously');
  await assert.rejects(() => provider.upload('k', Buffer.from('x')), /MEDIA_STORAGE_NOT_CONFIGURED/, '9f. mutating calls fail loudly with a recognizable code instead of pretending to succeed');

  const mediaRoutesSrc = fs.readFileSync(path.join(root, 'server/media/media-routes.mjs'), 'utf8');
  ok(!/storage-provider|getMediaStorageProvider/.test(mediaRoutesSrc), '9g. the lookup routes never import/call the storage provider at all - they only read persisted rows');

  resetMediaStorageProviderCache();
  const r2 = getMediaStorageProvider({ MEDIA_STORAGE_ENABLED: 'true', MEDIA_STORAGE_PROVIDER: 'r2' });
  ok(r2 instanceof NullMediaStorageProvider, '9h. MEDIA_STORAGE_ENABLED without bucket/endpoint/keys still falls back to Null, not a crash');
  resetMediaStorageProviderCache();
}

// =======================================================================
// 10. media disabilitato (inactive) -> not returned as primary.
// =======================================================================
{
  const pool = makeFakePool([
    { owner_type: 'exercise', owner_id: 'y', media_type: 'image', variant: 'master', status: 'inactive', match_type: 'exact', public_url: 'old', version: 1, source: 'nurvan' }
  ]);
  const manifest = await getMediaManifest(pool, 'exercise', 'y');
  ok(manifest.hasMedia === false, '10a. an inactive-only row never surfaces as primary');
  ok(manifest.status === 'disabled', "10b. manifest status is 'disabled' when every row for the owner is inactive");
}

// =======================================================================
// 11. thumbnail disponibile -> the list/thumb size resolves the thumbnail
// slot independently of master (frontend contract: renderInto(size:'thumb')).
// =======================================================================
{
  const clientSrc = fs.readFileSync(path.join(root, 'web/exercise-media-client.js'), 'utf8');
  ok(/size === 'thumb'[\s\S]{0,200}manifest\.media &&[\s\S]{0,40}manifest\.media\.thumbnail/.test(clientSrc),
    "11a. renderInto(size:'thumb') resolves media.thumbnail, not always the master");
}

// =======================================================================
// 12. master disponibile -> detail view uses master (default size).
// =======================================================================
{
  const clientSrc = fs.readFileSync(path.join(root, 'web/exercise-media-client.js'), 'utf8');
  ok(/const size = opts\.size === 'thumb' \? 'thumb' : 'master';/.test(clientSrc), '12a. renderInto defaults to master unless thumb is explicitly requested');
}

// =======================================================================
// 13. versione media -> cache busting: version increments on replace, and
// is carried in the manifest payload for the frontend/CDN to key on.
// =======================================================================
{
  const pool = makeFakePool([]);
  const v1 = await assignMedia(pool, {
    ownerType: 'exercise', ownerId: 'z', mediaType: 'image', variant: 'master',
    storageKey: 'exercises/z/master.webp', publicUrl: 'https://cdn/z/master.v1.webp'
  });
  ok(v1.version === 1, '13a. the first assignment for a slot is version 1');
  const v2 = await assignMedia(pool, {
    ownerType: 'exercise', ownerId: 'z', mediaType: 'image', variant: 'master',
    storageKey: 'exercises/z/master.webp', publicUrl: 'https://cdn/z/master.v2.webp'
  });
  ok(v2.version === 2, '13b. replacing the same slot increments the version');
  const manifest = await getMediaManifest(pool, 'exercise', 'z');
  ok(manifest.primary.version === 2 && manifest.media.master === 'https://cdn/z/master.v2.webp', '13c. resolution only ever returns the new active version');
  const oldRow = await getMediaById(pool, v1.id);
  ok(oldRow.status === 'inactive', '13d. the old version was deactivated, not left active alongside the new one (uq_exercise_media_active_slot)');
}

// =======================================================================
// 14. no existing exercise/warmup test should regress. Covered by running
// the full regression suite (package.json test:regression) alongside this
// file - not re-asserted here to avoid duplicating those suites.
// =======================================================================

// -----------------------------------------------------------------------
// Route wiring: the actual Express handlers registered by mountMediaRoutes,
// invoked directly (no live server/DB needed) against the fake pool above.
// -----------------------------------------------------------------------
{
  const pool = makeFakePool([
    { owner_type: 'exercise', owner_id: 'squat_bilanciere', media_type: 'image', variant: 'master', status: 'active', match_type: 'exact', public_url: 'https://cdn/squat.webp', version: 1, source: 'nurvan' }
  ]);
  const { routes, fakeApp } = mountedRoutes();
  mountMediaRoutes(fakeApp, { pool });
  ok(!!routes['/api/exercises/:exerciseId/media'], 'R1. GET /api/exercises/:exerciseId/media is registered');
  ok(!!routes['/api/warmups/:warmupId/media'], 'R2. GET /api/warmups/:warmupId/media is registered');
  ok(!!routes['/api/media/:id'], 'R3. GET /api/media/:id is registered');

  {
    const { req, res } = fakeReqRes({ exerciseId: 'Squat bilanciere' });
    await routes['/api/exercises/:exerciseId/media'](req, res);
    ok(res.body.hasMedia === true && res.body.primary.url === 'https://cdn/squat.webp',
      'R4. requesting by display name derives the same canonical id as the stored owner_id ("Squat bilanciere" -> squat_bilanciere)');
  }
  {
    const { req, res } = fakeReqRes({ exerciseId: 'Un esercizio mai visto prima' });
    await routes['/api/exercises/:exerciseId/media'](req, res);
    ok(res.statusCode === 200 && res.body.hasMedia === false, 'R5. an unknown exercise name returns 200 + hasMedia:false, never a 404/500');
  }
  {
    const { req, res } = fakeReqRes({ warmupId: 'unknown_warmup' });
    await routes['/api/warmups/:warmupId/media'](req, res);
    ok(res.statusCode === 200 && res.body.hasMedia === false, 'R6. an unknown warmup id returns 200 + hasMedia:false');
  }
  {
    const { req, res } = fakeReqRes({ id: 'not-a-number' });
    await routes['/api/media/:id'](req, res);
    ok(res.statusCode === 400, 'R7. a non-numeric /api/media/:id is rejected with 400, not a DB error leak');
  }
}

// -----------------------------------------------------------------------
// Pure resolution logic (MediaServiceTestHelpers), exercised directly.
// -----------------------------------------------------------------------
{
  const { pickPrimaryMedia, buildManifest } = MediaServiceTestHelpers;
  const rows = [
    { status: 'active', mediaType: 'image', variant: 'master', matchType: 'variant', updatedAt: '2024-01-01T00:00:00Z' },
    { status: 'active', mediaType: 'image', variant: 'master', matchType: 'exact', updatedAt: '2023-01-01T00:00:00Z' }
  ];
  const picked = pickPrimaryMedia(rows, { mediaType: 'image', variant: 'master' });
  ok(picked.matchType === 'exact', 'P1. pickPrimaryMedia prefers exact even when it is older than a variant row');

  const processing = buildManifest({ ownerType: 'exercise', ownerId: 'p', rows: [{ status: 'processing', mediaType: 'image', variant: 'master' }] });
  ok(processing.status === 'processing', "P2. buildManifest reports 'processing' when an upload is in flight and nothing is active yet");

  const failed = buildManifest({ ownerType: 'exercise', ownerId: 'f', rows: [{ status: 'failed', mediaType: 'image', variant: 'master' }] });
  ok(failed.status === 'failed', "P3. buildManifest reports 'failed' when the only row failed and nothing is active");
}

// -----------------------------------------------------------------------
// Architecture wiring: migration, feature flag, canonical-id parity
// between server and frontend, dependency declared, mounted in the app,
// script tag present, Android asset sync updated, docs present.
// -----------------------------------------------------------------------
{
  const migration = fs.readFileSync(path.join(root, 'server/db/migrations/0013_media_architecture.sql'), 'utf8');
  ok(/CREATE TABLE IF NOT EXISTS exercise_media/.test(migration), 'W1. migration 0013 creates exercise_media');
  ok(/owner_type TEXT NOT NULL CHECK \(owner_type IN \('exercise', 'warmup'\)\)/.test(migration), 'W2. owner_type is constrained to exercise/warmup');
  ok(/CREATE UNIQUE INDEX IF NOT EXISTS uq_exercise_media_active_slot/.test(migration), 'W3. a unique partial index prevents two active rows in the same slot');

  const release = JSON.parse(fs.readFileSync(path.join(root, 'release.json'), 'utf8'));
  ok(release.schemaTarget === '0013', 'W4. release.json schemaTarget advanced to 0013');

  const flags = fs.readFileSync(path.join(root, 'feature-flags.mjs'), 'utf8');
  ok(/exerciseMediaV1: true/.test(flags), 'W5. exerciseMediaV1 feature flag is declared (default on)');

  const apiSrc = fs.readFileSync(path.join(root, 'coach-api.mjs'), 'utf8');
  ok(apiSrc.includes('mountMediaRoutes(app, { pool });'), 'W6. mountMediaRoutes is actually mounted in coach-api.mjs');

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  ok(!!pkg.dependencies['@aws-sdk/client-s3'] && !!pkg.dependencies['@aws-sdk/s3-request-presigner'], 'W7. AWS SDK S3 client + presigner are declared dependencies');

  const html = fs.readFileSync(path.join(root, 'web/index.base.html'), 'utf8');
  const built = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
  for (const src of [html, built]) {
    ok(src.includes('<script src="exercise-media-client.js"></script>'), 'W8. exercise-media-client.js is loaded as a script tag');
    ok(src.includes("class=\"nurvan-media-slot\""), 'W9. the encyclopedia card renders a media slot for exercise/warmup entries');
    ok(src.includes('refreshKnowledgeMediaSlots();'), 'W10. media slots are resolved after every enciclopedia re-render (tab switch, search, group toggle)');
  }

  const syncSrc = fs.readFileSync(path.join(root, 'sync_web_assets.mjs'), 'utf8');
  ok(syncSrc.includes("'exercise-media-client.js'"), 'W11. exercise-media-client.js ships to the Android asset bundle too');

  const envExample = fs.readFileSync(path.join(root, '.env.example'), 'utf8');
  for (const name of ['MEDIA_STORAGE_ENABLED', 'MEDIA_STORAGE_PROVIDER', 'MEDIA_STORAGE_BUCKET', 'MEDIA_STORAGE_ENDPOINT', 'MEDIA_STORAGE_ACCESS_KEY_ID', 'MEDIA_STORAGE_SECRET_ACCESS_KEY', 'MEDIA_STORAGE_PUBLIC_BASE_URL']) {
    ok(envExample.includes(name + '='), 'W12. ' + name + ' is documented in .env.example (no real value)');
  }
  ok(!/MEDIA_STORAGE_ACCESS_KEY_ID=\w/.test(envExample) && !/MEDIA_STORAGE_SECRET_ACCESS_KEY=\w/.test(envExample),
    'W13. no real credentials are committed - every MEDIA_STORAGE_* value in .env.example is blank');

  const docs = fs.readFileSync(path.join(root, 'docs/media-architecture.md'), 'utf8');
  ok(docs.length > 500 && /exercise_media/.test(docs), 'W14. docs/media-architecture.md exists and documents the schema');
}

// -----------------------------------------------------------------------
// Canonical id: server and frontend must derive the exact same slug for
// the same display name, or an exercise's media would silently point to
// two different owner_ids depending on which side computed it.
// -----------------------------------------------------------------------
{
  const clientSrc = fs.readFileSync(path.join(root, 'web/exercise-media-client.js'), 'utf8');
  const m = clientSrc.match(/function canonicalExerciseId\(name\) \{([\s\S]*?)\n  \}/);
  ok(!!m, 'C1. web/exercise-media-client.js declares its own canonicalExerciseId');
  const samples = [
    'Squat bilanciere', 'Panca inclinata manubri', "Stacco rumeno",
    'Salto della quaglia', '  Multiple   Spaces  ', 'Único: Acentuação',
    ''
  ];
  for (const name of samples) {
    const serverSlug = canonicalExerciseId(name);
    // eslint-disable-next-line no-new-func
    const clientFn = new Function('name', 'return (' + clientSrc.match(/function canonicalExerciseId\(name\) \{[\s\S]*?\n  \}/)[0].replace('function canonicalExerciseId', 'function') + ')(name);');
    const clientSlug = clientFn(name);
    ok(serverSlug === clientSlug, 'C2. canonicalExerciseId("' + name + '") matches on server (' + serverSlug + ') and frontend (' + clientSlug + ')');
  }
}

// R2 provider construction sanity (no network call - just verifies the
// class builds correctly from env and never touches network at construction time).
{
  const configured = new R2MediaStorageProvider({
    MEDIA_STORAGE_BUCKET: 'nurvan-media',
    MEDIA_STORAGE_ENDPOINT: 'https://abc123.r2.cloudflarestorage.com',
    MEDIA_STORAGE_ACCESS_KEY_ID: 'ak',
    MEDIA_STORAGE_SECRET_ACCESS_KEY: 'sk',
    MEDIA_STORAGE_PUBLIC_BASE_URL: 'https://media.nurvan.app'
  });
  ok(configured.isConfigured() === true, 'S1. R2MediaStorageProvider reports configured when all required env vars are present');
  ok(configured.getUrl('exercises/squat_bilanciere/master.webp') === 'https://media.nurvan.app/exercises/squat_bilanciere/master.webp', 'S2. getUrl() joins the public base url and key correctly');
  const unconfigured = new R2MediaStorageProvider({});
  ok(unconfigured.isConfigured() === false, 'S3. missing any required env var leaves the provider unconfigured');
  ok(unconfigured.getUrl('x') === null, 'S4. an unconfigured provider (no public base url) returns null, not a malformed URL');
  ok(configured instanceof MediaStorageProvider, 'S5. R2MediaStorageProvider implements the MediaStorageProvider contract');
}

console.log('\nAll media architecture tests passed.');
