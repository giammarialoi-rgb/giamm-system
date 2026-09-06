ALTER TABLE coach_messages
  ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE coach_messages
  ADD COLUMN IF NOT EXISTS reaction TEXT;

ALTER TABLE coach_messages
  ADD COLUMN IF NOT EXISTS search_text TEXT;

CREATE INDEX IF NOT EXISTS idx_coach_messages_search
  ON coach_messages (client_id, created_at DESC);

CREATE TABLE IF NOT EXISTS coach_quick_replies (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS athlete_brain_feedback (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
  interpretation_fingerprint TEXT NOT NULL,
  decision TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS meal_logs (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  client_id BIGINT REFERENCES coach_clients(id) ON DELETE CASCADE,
  user_id BIGINT REFERENCES app_users(id) ON DELETE CASCADE,
  media_id BIGINT,
  estimated JSONB NOT NULL DEFAULT '{}'::jsonb,
  confirmed JSONB,
  status TEXT NOT NULL DEFAULT 'estimated',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS form_reviews (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
  media_id BIGINT,
  exercise TEXT,
  markers JSONB NOT NULL DEFAULT '[]'::jsonb,
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
