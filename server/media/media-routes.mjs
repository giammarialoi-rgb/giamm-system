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
