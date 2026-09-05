ALTER TABLE coach_licenses
  ADD COLUMN IF NOT EXISTS feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE coach_clients
  ADD COLUMN IF NOT EXISTS credentials_issued_at TIMESTAMPTZ;

ALTER TABLE coach_clients
  ADD COLUMN IF NOT EXISTS invite_secret_rotated_at TIMESTAMPTZ;

-- Login already validates app_users.password_hash. Plaintext invite credentials
-- are not required and must not survive beyond the one-time API response.
UPDATE coach_clients
SET invite_password = NULL
WHERE invite_password IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_coach_events_unread
  ON coach_events (client_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_coach_call_signals_created
  ON coach_call_signals (created_at);
