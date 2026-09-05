CREATE TABLE IF NOT EXISTS coach_check_ins (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'received',
  requested_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  weight NUMERIC(7,2),
  notes TEXT,
  training_adherence NUMERIC(5,2),
  nutrition_adherence NUMERIC(5,2),
  deterministic_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_summary JSONB,
  coach_response TEXT,
  previous_check_in_id BIGINT REFERENCES coach_check_ins(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_checkins_queue
  ON coach_check_ins (coach_user_id, status, received_at DESC, requested_at DESC);

CREATE INDEX IF NOT EXISTS idx_client_checkins_history
  ON coach_check_ins (client_id, COALESCE(received_at, requested_at, created_at) DESC);

CREATE TABLE IF NOT EXISTS coach_media_objects (
  id TEXT PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  kind TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size INT NOT NULL,
  checksum TEXT NOT NULL,
  object_data BYTEA NOT NULL,
  retention_until TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_media_owner
  ON coach_media_objects (coach_user_id, client_id, domain, created_at DESC);

CREATE TABLE IF NOT EXISTS coach_check_in_media (
  id BIGSERIAL PRIMARY KEY,
  check_in_id BIGINT NOT NULL REFERENCES coach_check_ins(id) ON DELETE CASCADE,
  media_id TEXT NOT NULL REFERENCES coach_media_objects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (check_in_id, media_id)
);

CREATE TABLE IF NOT EXISTS coach_media_access_audit (
  id BIGSERIAL PRIMARY KEY,
  media_id TEXT NOT NULL REFERENCES coach_media_objects(id) ON DELETE CASCADE,
  actor_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  outcome TEXT NOT NULL,
  reason TEXT,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_access_audit
  ON coach_media_access_audit (media_id, accessed_at DESC);

CREATE TABLE IF NOT EXISTS coach_client_metric_snapshots (
  client_id BIGINT PRIMARY KEY REFERENCES coach_clients(id) ON DELETE CASCADE,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  formula_version TEXT NOT NULL,
  source_fingerprint TEXT NOT NULL,
  signals JSONB NOT NULL DEFAULT '[]'::jsonb,
  derived_metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metric_snapshots_coach
  ON coach_client_metric_snapshots (coach_user_id, computed_at DESC);
