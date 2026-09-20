import { canonicalExerciseId } from './canonical-id.mjs';
import { getMediaManifest, getMediaById } from './exercise-media-service.mjs';

/**
 * Read-only media lookup routes. Metadata only - never the binary file
 * itself (that is served directly from the CDN/public bucket URL already
 * stored in the row). A missing/unconfigured media system is never an
 * error here: every branch below resolves to a normal 200 response shaped
 * like "no media yet", because an exercise must never depend on an image
 * existing (spec section "PRINCIPIO FONDAMENTALE").
 */
export function mountMediaRoutes(app, { pool } = {}) {
  app.get('/api/exercises/:exerciseId/media', async (req, res) => {
    const rawId = String(req.params.exerciseId || '').trim();
    if (!rawId) return res.status(400).json({ error: 'missing_exercise_id' });
    const ownerId = canonicalExerciseId(rawId) || rawId;
    try {
      const manifest = await getMediaManifest(pool, 'exercise', ownerId, req.query.name ? String(req.query.name) : null);
      return res.json(manifest);
    } catch (_err) {
      // A media lookup failure (DB hiccup, storage misconfigured, etc.)
      // must never surface as an error on the exercise itself.
      return res.json({ entityType: 'exercise', entityId: ownerId, canonicalName: null, hasMedia: false, primary: null, media: { master: null, thumbnail: null, animation: null }, status: 'missing' });
    }
  });

  // The picture itself, from here rather than from the bucket.
  //
  // The bucket answers without CORS headers, which is fine for an <img> but
  // not for anything that has to read the pixels - the PDF export draws each
  // exercise's picture next to its name, and a browser will not let it read an
  // image it fetched cross-origin. This serves the same bytes from the app's
  // own origin. It is not an open proxy: the only URLs it will fetch are the
  // ones this app's own media rows point at.
  app.get('/api/exercises/:exerciseId/image', async (req, res) => {
    const rawId = String(req.params.exerciseId || '').trim();
    if (!rawId) return res.status(400).json({ error: 'missing_exercise_id' });
    const ownerId = canonicalExerciseId(rawId) || rawId;
    try {
      const manifest = await getMediaManifest(pool, 'exercise', ownerId, null);
      const media = manifest && manifest.media ? manifest.media : {};
      const url = req.query.variant === 'master'
        ? (media.master || media.thumbnail)
        : (media.thumbnail || media.master);
      if (!url) return res.status(404).json({ error: 'no_media' });
      const upstream = await fetch(url);
      if (!upstream || !upstream.ok) return res.status(502).json({ error: 'upstream_unavailable' });
      const buf = Buffer.from(await upstream.arrayBuffer());
      res.set('Content-Type', upstream.headers.get('content-type') || 'image/webp');
      res.set('Cache-Control', 'public, max-age=86400');
      res.set('Access-Control-Allow-Origin', '*');
      return res.send(buf);
    } catch (_err) {
      return res.status(502).json({ error: 'image_unavailable' });
    }
  });

  app.get('/api/warmups/:warmupId/media', async (req, res) => {
    const ownerId = String(req.params.warmupId || '').trim();
    if (!ownerId) return res.status(400).json({ error: 'missing_warmup_id' });
    try {
      const manifest = await getMediaManifest(pool, 'warmup', ownerId, req.query.name ? String(req.query.name) : null);
      return res.json(manifest);
    } catch (_err) {
      return res.json({ entityType: 'warmup', entityId: ownerId, canonicalName: null, hasMedia: false, primary: null, media: { master: null, thumbnail: null, animation: null }, status: 'missing' });
    }
  });

  app.get('/api/media/:id', async (req, res) => {
    const id = String(req.params.id || '').trim();
    if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'invalid_media_id' });
    try {
      const media = await getMediaById(pool, id);
      if (!media || media.status !== 'active') return res.status(404).json({ error: 'not_found' });
      return res.json(media);
    } catch (_err) {
      return res.status(503).json({ error: 'lookup_unavailable' });
    }
  });
}
