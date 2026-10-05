-- Copies of a person's record from before it changed in a way that could lose something (see keepHistory in
-- server/account/index.mjs): one a day at most, and one whenever the loads shrink by half or more.
-- Ten per person, none older than thirty days. Restoring from here is done by hand with tools/rebuild_loads_from_logs.mjs.

CREATE TABLE IF NOT EXISTS app_account_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  revision BIGINT NOT NULL DEFAULT 0,
  reason TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_account_history_user ON app_account_history (user_id, id DESC);
