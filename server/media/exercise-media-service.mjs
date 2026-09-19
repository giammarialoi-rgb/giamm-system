/**
 * ExerciseMediaService - resolves already-stored media for an exercise or
 * warm-up. It never generates, scrapes, or fetches anything from an
 * external API - it only reads rows this app itself wrote to
 * exercise_media (see migration 0013) and picks the best one to show.
 *
 * The resolution rules (spec sections 8-9):
 *   - exact beats variant beats reference, always.
 *   - never fall back to a random unrelated exercise's media.
 *   - an exercise/warmup with zero media rows is not an error - it is the
 *     normal, expected state for the vast majority of exercises today, and
 *     MUST stay that way for custom, user-typed exercises forever.
 */

const MATCH_PRIORITY = { exact: 0, variant: 1, reference: 2 };

// Objects are re-uploaded under the same storage key and served with a
// one-year immutable cache, so a replaced image would never reach a device
// that already has the old one. The row version changes on every upload;
// putting it in the URL makes each upload a new URL.
function versionedUrl(url, version) {
  if (!url) return null;
  return url + (url.includes('?') ? '&' : '?') + 'v=' + version;
}

function mediaRow(row) {
  const version = Number(row.version) || 1;
  return {
    id: String(row.id),
    ownerType: row.owner_type,
    ownerId: row.owner_id,
    mediaType: row.media_type,
    variant: row.variant,
    storageProvider: row.storage_provider,
    storageKey: row.storage_key,
    url: versionedUrl(row.public_url, version),
    thumbnailKey: row.thumbnail_key || null,
    thumbnailUrl: versionedUrl(row.thumbnail_url, version),
    mimeType: row.mime_type || null,
    width: row.width == null ? null : Number(row.width),
    height: row.height == null ? null : Number(row.height),
    fileSizeBytes: row.file_size_bytes == null ? null : Number(row.file_size_bytes),
    version,
    status: row.status,
    matchType: row.match_type,
    confidence: row.confidence == null ? null : Number(row.confidence),
    source: row.source,
    license: row.license || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

/**
 * Pure: given every media row already fetched for one owner, pick the best
 * ACTIVE row for a given (mediaType, variant) slot. Exact > variant >
 * reference; ties broken by most-recently-updated. Never returns a row for
 * a different owner - callers only ever pass rows for a single owner.
 */
function pickPrimaryMedia(rows, { mediaType = 'image', variant = 'master' } = {}) {
  const candidates = (rows || []).filter(
    (r) => r.status === 'active' && r.mediaType === mediaType && r.variant === variant
  );
  if (!candidates.length) return null;
  candidates.sort((a, b) => {
    const byMatch = (MATCH_PRIORITY[a.matchType] ?? 9) - (MATCH_PRIORITY[b.matchType] ?? 9);
    if (byMatch !== 0) return byMatch;
    return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
  });
  return candidates[0];
}

function toPrimaryPayload(master, thumbnail) {
  return {
    id: master.id,
    mediaType: master.mediaType,
    matchType: master.matchType,
    url: master.url,
    thumbnailUrl: (thumbnail && thumbnail.url) || master.thumbnailUrl || null,
    width: master.width,
    height: master.height,
    version: master.version,
    source: master.source,
    confidence: master.confidence
  };
}

/**
 * Pure: builds the manifest (spec section 21) from already-mapped rows.
 * `status` here is the manifest-level status vocabulary (missing /
 * processing / ready / failed / disabled) - distinct from an individual
 * row's own `status` column (active / inactive / processing / failed).
 */
function buildManifest({ ownerType, ownerId, canonicalName, rows }) {
  const masterImage = pickPrimaryMedia(rows, { mediaType: 'image', variant: 'master' });
  const masterVideo = pickPrimaryMedia(rows, { mediaType: 'video', variant: 'master' });
  const master = masterImage || masterVideo;
  const thumbnail = pickPrimaryMedia(rows, { mediaType: 'image', variant: 'thumbnail' });
  const animation = pickPrimaryMedia(rows, { mediaType: 'animation', variant: 'animation' });

  const list = rows || [];
  const hasProcessing = list.some((r) => r.status === 'processing');
  const hasFailed = list.some((r) => r.status === 'failed');
  const hasAnyRow = list.length > 0;
  const allInactive = hasAnyRow && list.every((r) => r.status === 'inactive');

  let status = 'missing';
  if (master || thumbnail || animation) status = 'ready';
  else if (hasProcessing) status = 'processing';
  else if (allInactive) status = 'disabled';
  else if (hasFailed) status = 'failed';

  return {
    entityType: ownerType,
    entityId: ownerId,
    canonicalName: canonicalName || null,
    hasMedia: !!master,
    primary: master ? toPrimaryPayload(master, thumbnail) : null,
    media: {
      master: master ? master.url : null,
      thumbnail: thumbnail ? thumbnail.url : (master ? master.thumbnailUrl : null),
      animation: animation ? animation.url : null
    },
    status
  };
}

export async function fetchMediaRows(pool, ownerType, ownerId) {
  const q = await pool.query(
    'SELECT * FROM exercise_media WHERE owner_type = $1 AND owner_id = $2 ORDER BY updated_at DESC',
    [ownerType, ownerId]
  );
  return (q.rows || []).map(mediaRow);
}

// Catalogue entries that are the same exercise under a second name, each one
// confirmed by the user. Deliberately an explicit list rather than a wording
// rule: "Kickback cavo tricipiti" shares its words with the glute "Kickback
// cavo", and a rule would hand the triceps lift a glute picture.
export const EXERCISE_MEDIA_ALIASES = Object.freeze({
  panca_piana_con_bilanciere: 'panca_piana_bilanciere',
  panca_inclinata_con_manubri: 'panca_inclinata_manubri',
  squat_con_bilanciere: 'squat_bilanciere',
  goblet_squat: 'squat_goblet',
  rematore_con_bilanciere: 'rematore_bilanciere',
  kickback_al_cavo: 'kickback_cavo'
});

export async function getMediaManifest(pool, ownerType, ownerId, canonicalName) {
  const rows = await fetchMediaRows(pool, ownerType, ownerId);
  const own = buildManifest({ ownerType, ownerId, canonicalName, rows });
  const twin = ownerType === 'exercise' ? EXERCISE_MEDIA_ALIASES[ownerId] : null;
  if (own.hasMedia || !twin) return own;
  // Own media always wins, so a dedicated asset uploaded later replaces this.
  const twinRows = await fetchMediaRows(pool, ownerType, twin);
  const shared = buildManifest({ ownerType, ownerId, canonicalName, rows: twinRows });
  return shared.hasMedia ? shared : own;
}

export async function getMediaById(pool, id) {
  const q = await pool.query('SELECT * FROM exercise_media WHERE id = $1', [id]);
  const row = q.rows && q.rows[0];
  return row ? mediaRow(row) : null;
}

/**
 * Assigns (or replaces) the media for one (owner, mediaType, variant) slot.
 * Not wired to any HTTP route yet (no admin panel in this phase - spec
 * section 17), but ready for one: deactivates whatever was active in that
 * slot and inserts a new active, version-incremented row, transactionally.
 */
export async function assignMedia(pool, input) {
  const {
    ownerType, ownerId, mediaType, variant,
    storageProvider = 'r2', storageKey, publicUrl = null,
    thumbnailKey = null, thumbnailUrl = null, mimeType = null,
    width = null, height = null, fileSizeBytes = null,
    matchType = 'exact', confidence = null, source = 'nurvan', license = null
  } = input || {};
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE exercise_media SET status = 'inactive', updated_at = NOW()
       WHERE owner_type = $1 AND owner_id = $2 AND media_type = $3 AND variant = $4 AND status = 'active'`,
      [ownerType, ownerId, mediaType, variant]
    );
    const nextVersionQ = await client.query(
      `SELECT COALESCE(MAX(version), 0) + 1 AS next FROM exercise_media
       WHERE owner_type = $1 AND owner_id = $2 AND media_type = $3 AND variant = $4`,
      [ownerType, ownerId, mediaType, variant]
    );
    const version = nextVersionQ.rows[0].next;
    const insertQ = await client.query(
      `INSERT INTO exercise_media (
         owner_type, owner_id, media_type, variant, storage_provider, storage_key,
         public_url, thumbnail_key, thumbnail_url, mime_type, width, height,
         file_size_bytes, version, status, match_type, confidence, source, license
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'active',$15,$16,$17,$18)
       RETURNING *`,
      [
        ownerType, ownerId, mediaType, variant, storageProvider, storageKey,
        publicUrl, thumbnailKey, thumbnailUrl, mimeType, width, height,
        fileSizeBytes, version, matchType, confidence, source, license
      ]
    );
    await client.query('COMMIT');
    return mediaRow(insertQ.rows[0]);
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

const ROW_STATUSES = ['active', 'inactive', 'processing', 'failed'];

/** Activates/deactivates a row without touching any other slot's state. */
export async function setMediaStatus(pool, id, status) {
  if (!ROW_STATUSES.includes(status)) throw new Error('invalid_media_status');
  const q = await pool.query(
    'UPDATE exercise_media SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    [status, id]
  );
  return q.rows[0] ? mediaRow(q.rows[0]) : null;
}

export async function deleteMediaRow(pool, id) {
  await pool.query('DELETE FROM exercise_media WHERE id = $1', [id]);
}

export const MediaServiceTestHelpers = Object.freeze({
  mediaRow,
  pickPrimaryMedia,
  buildManifest,
  toPrimaryPayload,
  MATCH_PRIORITY
});
