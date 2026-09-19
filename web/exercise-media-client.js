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

  // Resolves the exercise the WRITTEN name refers to, for media only - never
  // for the text explanation. Used to key off the wording the encyclopedia
  // is written under rather than a program's free text (so "Stacco da terra
  // con bilanciere" finds the same picture as "Stacco da terra"), but the
  // encyclopedia's own fuzzy matcher (training-knowledge.js explainExercise)
  // was built to always show *some* helpful text, and scores a match on a
  // single shared generic word - "Smith squat quad-biased" and "Squat
  // bilanciere" both contain "squat", so it confidently returned the
  // barbell squat's picture for a Smith-machine exercise. A photo is a much
  // stronger claim than a paragraph of generic advice, so this asks a
  // stricter, independent question: after dropping filler words, do the
  // WRITTEN name and a catalogue name have the exact same significant
  // words (just reordered or missing a filler)? "Squat" alone is not
  // enough; "squat" + "bilanciere" with nothing else differing, is. If more
  // than one catalogue exercise ties, or none does, this returns null and
  // the caller keeps the written name (safe fallback: no picture, not a
  // possibly-wrong one).
  var MEDIA_MATCH_FILLER = { con: 1, al: 1, alla: 1, a: 1, in: 1, di: 1, da: 1, il: 1, la: 1, le: 1, su: 1, e: 1 };
  function mediaMatchTokens(s) {
    var parts = String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ').split(' ').filter(Boolean);
    var out = [];
    for (var i = 0; i < parts.length; i++) {
      if (!MEDIA_MATCH_FILLER[parts[i]]) out.push(parts[i]);
    }
    out.sort();
    return out;
  }
  function mediaMatchKey(tokens) { return tokens.join(' '); }

  var mediaCatalogueNames = null; // built lazily, since the catalogue scripts load after this one
  function mediaCatalogueByKey() {
    if (mediaCatalogueNames) return mediaCatalogueNames;
    var names = [];
    try {
      if (typeof window !== 'undefined' && Array.isArray(window.WEB_EXERCISE_CATALOG)) {
        window.WEB_EXERCISE_CATALOG.forEach(function (ex) { if (ex && ex.name) names.push(ex.name); });
      }
    } catch (_) {}
    try {
      if (typeof window !== 'undefined' && window.ExerciseDatabaseService && typeof window.ExerciseDatabaseService.getAllExercises === 'function') {
        window.ExerciseDatabaseService.getAllExercises().forEach(function (ex) {
          var n = ex && (ex.name || ex.normalized);
          if (n) names.push(n);
        });
      }
    } catch (_) {}
    var byKey = {};
    names.forEach(function (n) {
      var key = mediaMatchKey(mediaMatchTokens(n));
      if (!key) return;
      if (!byKey[key]) byKey[key] = [];
      if (byKey[key].indexOf(n) < 0) byKey[key].push(n);
    });
    // Only cache once both catalogue sources have actually had a chance to
    // load - an empty read this early would otherwise cache "no catalogue"
    // forever for the rest of the session.
    if (names.length) mediaCatalogueNames = byKey;
    return byKey;
  }

  function resolveCanonicalMediaName(writtenName) {
    var written = String(writtenName || '').trim();
    if (!written) return null;
    var tokens = mediaMatchTokens(written);
    if (!tokens.length) return null;
    var key = mediaMatchKey(tokens);
    var candidates = mediaCatalogueByKey()[key];
    if (!candidates || candidates.length !== 1) return null; // none, or ambiguous - never guess
    var match = candidates[0];
    return fold(match) === fold(written) ? null : match; // already exact - nothing to resolve
  }
  function fold(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
  }

  // A workout name approved as the same exercise as a catalogue entry
  // (WEB_EXERCISE_NAME_LINKS, next to the catalogue). Never guessed.
  function linkedCatalogueName(writtenName) {
    var links = (typeof window !== 'undefined' && window.WEB_EXERCISE_NAME_LINKS) || null;
    if (!links) return null;
    var target = links[canonicalExerciseId(writtenName)];
    return target && fold(target) !== fold(writtenName) ? target : null;
  }

  // The catalogue exercise a written name certainly refers to, or null.
  function catalogueExerciseFor(writtenName) {
    return linkedCatalogueName(writtenName) || resolveCanonicalMediaName(writtenName);
  }

  // Whether a title the guide came back with is this exercise and not merely
  // a similar one: the guide's matcher accepts a single shared word.
  function isSameExercise(writtenName, shownTitle) {
    var shown = fold(shownTitle);
    if (!shown) return false;
    if (shown === fold(writtenName)) return true;
    var target = catalogueExerciseFor(writtenName);
    return !!target && fold(target) === shown;
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
    placeholderHtml: placeholderHtml,
    resolveCanonicalMediaName: resolveCanonicalMediaName,
    catalogueExerciseFor: catalogueExerciseFor,
    isSameExercise: isSameExercise
  };
})(typeof window !== 'undefined' ? window : self);
