/**
 * Deterministic, stable-enough canonical ids for exercises that have no
 * database row of their own (they live in static catalogs or as free-text
 * custom entries typed by an athlete). The slug is derived from the display
 * name - the only handle both the main catalog and custom exercises share -
 * using the same accent-stripping fold already used elsewhere in this
 * codebase (web/training-knowledge.js's fold()), so two names that already
 * match there resolve to the same media too.
 *
 * This is a pragmatic middle ground, not a permanent id: renaming an
 * exercise's display text changes its canonical id (and so its media
 * association) the same way it already changes its encyclopedia match.
 * Warm-up exercises don't need this - they already carry a real stable
 * `id` field (see web/warmup-exercise-library.js) and that id IS the
 * canonical id, unchanged. The browser-side twin of this exact function
 * lives in web/exercise-media-client.js (kept in sync by
 * test_media_architecture.mjs) since the frontend has to compute the same
 * id from the same display name before it can ask the API for media.
 */
export function canonicalExerciseId(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 120);
}
