CREATE TABLE IF NOT EXISTS coach_attention_items (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT REFERENCES coach_clients(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  source TEXT NOT NULL DEFAULT 'today_rules',
  status TEXT NOT NULL DEFAULT 'open',
  due_at TIMESTAMPTZ,
  snoozed_until TIMESTAMPTZ,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  UNIQUE (coach_user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_coach_attention_open
  ON coach_attention_items (coach_user_id, status, due_at, severity);

CREATE TABLE IF NOT EXISTS coach_tasks (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT REFERENCES coach_clients(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'coach',
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  created_by TEXT NOT NULL DEFAULT 'coach',
  sort_order INT NOT NULL DEFAULT 0,
  source_entity_type TEXT,
  source_entity_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_coach_tasks_queue
  ON coach_tasks (coach_user_id, status, due_at, sort_order, created_at);

CREATE TABLE IF NOT EXISTS coach_saved_views (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort JSONB NOT NULL DEFAULT '{}'::jsonb,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coach_user_id, name)
);

CREATE TABLE IF NOT EXISTS coach_timeline_events (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT 'general',
  actor_type TEXT NOT NULL DEFAULT 'system',
  actor_id TEXT,
  summary TEXT NOT NULL,
  source_entity_type TEXT,
  source_entity_id TEXT,
  source_link JSONB NOT NULL DEFAULT '{}'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  dedupe_key TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coach_user_id, dedupe_key)
);

CREATE INDEX IF NOT EXISTS idx_coach_timeline_client
  ON coach_timeline_events (coach_user_id, client_id, occurred_at DESC, id DESC);
