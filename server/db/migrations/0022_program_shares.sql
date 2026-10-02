-- Programs shared with a code (server/program/share.mjs): a copy of the
-- program as it was when it was shared, readable by whoever types the code
-- into a paid account, for 30 days from the last time it was shared.
--
-- content_hash: SHA-256 of the program, so sharing the same one again gives
-- the same code instead of a new one each time.
-- Nothing personal is in `program`: no loads, logs, maxes, food, therapy.

CREATE TABLE IF NOT EXISTS program_shares (
  code TEXT PRIMARY KEY,
  owner_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT '',
  program JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_used_at TIMESTAMPTZ,
  uses INT NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_program_shares_owner ON program_shares(owner_user_id, content_hash);
