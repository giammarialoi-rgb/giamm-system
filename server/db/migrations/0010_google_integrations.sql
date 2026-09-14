CREATE TABLE IF NOT EXISTS health_events (
  id TEXT PRIMARY KEY,
  user_id BIGINT REFERENCES app_users(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  event_type TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_health_events_user_time ON health_events(user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS oauth_integrations (
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  scopes TEXT[] NOT NULL DEFAULT '{}',
  encrypted_refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, provider)
);
