-- Administration dashboard (admin/ folder, served on /admin).
--
-- last_seen_at: there was no "last access" for plain accounts (only coaches
-- and linked athletes had one, on their own tables). The server now stamps it
-- when the app reads or syncs the account, at most every few minutes.
--
-- app_events: failures the server sees (sync, check-in send, document import),
-- with the file format and the message, never the content.
--
-- admin_login_codes / admin_sessions / admin_audit: the dashboard's own login
-- (email in ADMIN_EMAILS + a 6-digit code by email), 12-hour sessions stored
-- as hashes, and who did what and when.

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS app_events (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  kind TEXT NOT NULL,
  user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_app_events_kind_at ON app_events (kind, at DESC);

CREATE TABLE IF NOT EXISTS admin_login_codes (
  email TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  ip TEXT,
  user_agent TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry ON admin_sessions (expires_at);

CREATE TABLE IF NOT EXISTS admin_audit (
  id BIGSERIAL PRIMARY KEY,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  ip TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_audit_at ON admin_audit (at DESC);
