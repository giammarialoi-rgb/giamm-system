/* Nurvan exercise/warm-up media client + reusable UI component.
 *
 * Frontend half of the media architecture: resolves already-stored media
 * for an exercise or warm-up (GET /api/exercises/:id/media or
 * /api/warmups/:id/media) and renders it, or a stable no-media placeholder,
 * into any container. No screen calls the API directly - everything goes
 * through NurvanExerciseMedia so there is exactly one place that knows the
 * URL shape, the caching, and the fallback behavior.
 *
 * An exercise NEVER depends on media existing: every failure mode here
 * (no rows, network error, bad JSON, unreachable API, storage not
 * configured server-side) resolves to the same safe "no media yet" render,
 * never a thrown error and never a broken-image icon.
 */
(function (root) {
  'use strict';

  // Identical algorithm to server/media/canonical-id.mjs - kept in sync by
  // test_media_architecture.mjs. The frontend has to derive the same id
  // from a display name before it can ask the API for that exercise's
  // media (custom/catalog exercises have no id of their own).
  function canonicalExerciseId(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 120);
  }

  function apiBase() {
    try {
      if (typeof window !== 'undefined' && typeof window.COACH_API_URL === 'string' && /^https?:\/\//i.test(window.COACH_API_URL)) {
        return window.COACH_API_URL.replace(/\/+$/, '');
      }
    } catch (_) {}
    return ''; // same-origin: the web build is served from the same host as the API
  }

  function emptyManifest(entityType, entityId) {
    return {
      entityType: entityType,
      entityId: entityId,
      canonicalName: null,
      hasMedia: false,
      primary: null,
      media: { master: null, thumbnail: null, animation: null },
      status: 'missing'
    };
  }

  const cache = new Map(); // 'exercise:squat_bilanciere' -> manifest (or a resolved Promise while in flight)

  /**
   * Resolves media metadata for one exercise or warm-up. Always resolves
   * (never rejects) - a network/parse/timeout failure resolves to the same
   * shape as "no media", so callers never need a .catch().
   */
  function resolve(entityType, entityId, opts) {
    opts = opts || {};
    const type = entityType === 'warmup' ? 'warmup' : 'exercise';
    const id = String(entityId || '').trim();
    if (!id) return Promise.resolve(emptyManifest(type, id));
    const cacheKey = type + ':' + id;
    if (!opts.forceRefresh && cache.has(cacheKey)) return cache.get(cacheKey);

    const path = type === 'warmup'
      ? '/api/warmups/' + encodeURIComponent(id) + '/media'
      : '/api/exercises/' + encodeURIComponent(id) + '/media';
    const qs = opts.canonicalName ? ('?name=' + encodeURIComponent(opts.canonicalName)) : '';
    const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    const timer = controller ? setTimeout(function () { controller.abort(); }, 8000) : null;

    const promise = fetch(apiBase() + path + qs, { signal: controller ? controller.signal : undefined })
      .then(function (res) { return res.ok ? res.json() : emptyManifest(type, id); })
      .then(function (manifest) {
        return manifest && typeof manifest === 'object' ? manifest : emptyManifest(type, id);
      })
      .catch(function () { return emptyManifest(type, id); })
      .finally(function () { if (timer) clearTimeout(timer); });

    cache.set(cacheKey, promise);
    // Don't let a failed lookup poison the cache forever - only cache successes.
    promise.then(function (m) { if (!m || m.status === 'missing') cache.delete(cacheKey); });
    return promise;
  }

  function resolveByExerciseName(name, opts) {
    return resolve('exercise', canonicalExerciseId(name), Object.assign({ canonicalName: name }, opts || {}));
  }

  function getPrimaryMedia(entityType, entityId) {
    return resolve(entityType, entityId).then(function (m) { return m.primary; });
  }

  function getThumbnail(entityType, entityId) {
    return resolve(entityType, entityId).then(function (m) { return (m.media && m.media.thumbnail) || null; });
  }

  function hasMedia(entityType, entityId) {
    return resolve(entityType, entityId).then(function (m) { return !!m.hasMedia; });
  }

  const MATCH_TYPE_BADGE = { exact: '', variant: 'Variante', reference: 'Riferimento' };

  function placeholderHtml(size) {
    const iconSize = size === 'thumb' ? '20px' : '28px';
    return '<div class="nurvan-media-placeholder" style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;background:#141414;border:1px dashed #333;border-radius:10px;color:#666;box-sizing:border-box;padding:6px;text-align:center;">' +
      '<span style="font-size:' + iconSize + ';line-height:1;">🏋️</span>' +
      (size === 'thumb' ? '' : '<span style="font-size:9px;color:#666;">Visual disponibile prossimamente</span>') +
      '</div>';
  }

  /**
   * Renders (or re-renders) media for one exercise/warmup into `container`.
   * Shows a neutral loading state immediately, then either the image (with
   * a matchType badge when it is not an exact match) or the same stable
   * placeholder the spec asks for - never a broken image, never empty
   * space, never something that blocks selecting/editing the exercise.
   */
  function renderInto(container, opts) {
    if (!container) return;
    opts = opts || {};
    const size = opts.size === 'thumb' ? 'thumb' : 'master';
    const entityType = opts.entityType === 'warmup' ? 'warmup' : 'exercise';
    const entityId = opts.entityId || (entityType === 'exercise' ? canonicalExerciseId(opts.canonicalName) : '');
    const altText = opts.alt || opts.canonicalName || 'Esercizio';
    container.setAttribute('aria-busy', 'true');
    container.innerHTML = placeholderHtml(size);
    container.style.aspectRatio = container.style.aspectRatio || '1 / 1';
    container.style.overflow = container.style.overflow || 'hidden';

    resolve(entityType, entityId, { canonicalName: opts.canonicalName }).then(function (manifest) {
      container.setAttribute('aria-busy', 'false');
      const url = size === 'thumb' ? (manifest.media && (manifest.media.thumbnail || manifest.media.master)) : (manifest.media && manifest.media.master);
      if (!manifest.hasMedia || !url) {
        container.innerHTML = placeholderHtml(size);
        return;
      }
      const badge = manifest.primary && MATCH_TYPE_BADGE[manifest.primary.matchType]
        ? '<span style="position:absolute;top:4px;right:4px;font-size:8px;font-weight:800;color:#0a0a0a;background:var(--gold,#d4af37);padding:2px 6px;border-radius:6px;">' + MATCH_TYPE_BADGE[manifest.primary.matchType] + '</span>'
        : '';
      const dims = manifest.primary && manifest.primary.width && manifest.primary.height
        ? ' width="' + manifest.primary.width + '" height="' + manifest.primary.height + '"'
        : '';
      container.innerHTML = '<div style="position:relative;width:100%;height:100%;">' +
        '<img alt="' + esc(altText) + '" loading="lazy"' + dims +
        ' style="width:100%;height:100%;object-fit:cover;border-radius:10px;display:block;background:#141414;">' +
        badge + '</div>';
      // Attached as a real handler (not an inline onerror="") so a broken
      // URL falls back to the same placeholder without any string-escaping
      // fragility, and without ever leaving a broken-image icon on screen.
      const img = container.querySelector('img');
      if (img) {
        img.onerror = function () { container.innerHTML = placeholderHtml(size); };
        img.src = url;
      }
    });
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  root.NurvanExerciseMedia = {
    canonicalExerciseId: canonicalExerciseId,
    resolve: resolve,
    resolveByExerciseName: resolveByExerciseName,
    getPrimaryMedia: getPrimaryMedia,
    getThumbnail: getThumbnail,
    hasMedia: hasMedia,
    renderInto: renderInto,
    placeholderHtml: placeholderHtml
  };
})(typeof window !== 'undefined' ? window : self);
