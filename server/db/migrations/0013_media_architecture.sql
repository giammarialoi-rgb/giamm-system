-- Exercise & warm-up media architecture (images / thumbnails / future video).
--
-- Media rows reference exercises and warm-ups by a stable text id
-- (owner_type + owner_id), never by display name and never via a foreign
-- key into an "exercises" table - none exists. Exercises live in static JS
-- catalogs (web/exercise-catalog-extra.js) and as free-text custom entries
-- typed by an athlete; warm-up exercises live in
-- web/warmup-exercise-library.js and already carry a stable `id`. An
-- exercise or warm-up with zero rows here is a normal, fully valid state
-- (no media yet) - see docs/media-architecture.md.

CREATE TABLE IF NOT EXISTS exercise_media (
  id BIGSERIAL PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('exercise', 'warmup')),
  owner_id TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video', 'animation')),
  variant TEXT NOT NULL CHECK (variant IN ('master', 'thumbnail', 'animation')),
  storage_provider TEXT NOT NULL DEFAULT 'r2',
  storage_key TEXT NOT NULL,
  public_url TEXT,
  thumbnail_key TEXT,
  thumbnail_url TEXT,
  mime_type TEXT,
  width INT,
  height INT,
  file_size_bytes BIGINT,
  version INT NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'processing', 'failed')),
  match_type TEXT NOT NULL DEFAULT 'exact' CHECK (match_type IN ('exact', 'variant', 'reference')),
  confidence REAL CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1)),
  source TEXT NOT NULL DEFAULT 'nurvan' CHECK (source IN ('nurvan', 'user', 'licensed', 'generated', 'external')),
  license TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exercise_media_owner ON exercise_media (owner_type, owner_id);
CREATE INDEX IF NOT EXISTS idx_exercise_media_status ON exercise_media (status);

-- Only one ACTIVE row per (owner, media_type, variant) slot. Replacing an
-- asset means: deactivate the old active row, then insert a new active row
-- with an incremented version - never two active primaries in the same
-- slot fighting over which one resolves.
CREATE UNIQUE INDEX IF NOT EXISTS uq_exercise_media_active_slot
  ON exercise_media (owner_type, owner_id, media_type, variant)
  WHERE status = 'active';
