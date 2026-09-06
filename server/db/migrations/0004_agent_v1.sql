ALTER TABLE app_account_data
  ADD COLUMN IF NOT EXISTS revision BIGINT NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS coach_preferences (
  coach_user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  version INT NOT NULL DEFAULT 1,
  preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by TEXT NOT NULL DEFAULT 'coach',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT REFERENCES coach_clients(id) ON DELETE CASCADE,
  mode TEXT NOT NULL DEFAULT 'PROPOSE',
  intent TEXT NOT NULL,
  status TEXT NOT NULL,
  user_message TEXT NOT NULL,
  plan JSONB NOT NULL DEFAULT '[]'::jsonb,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_runs_coach
  ON agent_runs (coach_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_proposals (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT REFERENCES coach_clients(id) ON DELETE CASCADE,
  tool_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  summary TEXT NOT NULL,
  why JSONB NOT NULL DEFAULT '[]'::jsonb,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview JSONB NOT NULL DEFAULT '{}'::jsonb,
  target_set JSONB NOT NULL DEFAULT '[]'::jsonb,
  batch_result JSONB,
  expected_resource_revision BIGINT,
  expected_fingerprint TEXT,
  before_state JSONB,
  after_state JSONB,
  idempotency_key TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ,
  undone_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_proposals_queue
  ON agent_proposals (coach_user_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_audit_log (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT REFERENCES coach_clients(id) ON DELETE SET NULL,
  run_id TEXT REFERENCES agent_runs(id) ON DELETE SET NULL,
  proposal_id TEXT REFERENCES agent_proposals(id) ON DELETE SET NULL,
  action_id TEXT NOT NULL,
  tool_id TEXT NOT NULL,
  capability TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  outcome TEXT NOT NULL,
  reason TEXT,
  before_fingerprint TEXT,
  after_fingerprint TEXT,
  target_set JSONB NOT NULL DEFAULT '[]'::jsonb,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_audit_coach
  ON agent_audit_log (coach_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_idempotency_keys (
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  proposal_id TEXT REFERENCES agent_proposals(id) ON DELETE SET NULL,
  status TEXT NOT NULL,
  result JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (coach_user_id, idempotency_key)
);
