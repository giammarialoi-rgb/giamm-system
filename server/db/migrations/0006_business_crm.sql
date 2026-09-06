ALTER TABLE coach_clients
  ADD COLUMN IF NOT EXISTS crm_stage TEXT NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE coach_clients
  ADD COLUMN IF NOT EXISTS crm_source TEXT;

ALTER TABLE coach_clients
  ADD COLUMN IF NOT EXISTS crm_value NUMERIC(12,2);

ALTER TABLE coach_clients
  ADD COLUMN IF NOT EXISTS crm_next_action TEXT;

CREATE TABLE IF NOT EXISTS coach_client_plans (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  cadence TEXT NOT NULL DEFAULT 'monthly',
  status TEXT NOT NULL DEFAULT 'active',
  next_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_client_plans
  ON coach_client_plans (coach_user_id, status, next_due_at);

CREATE TABLE IF NOT EXISTS coach_payment_events (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
  plan_id BIGINT REFERENCES coach_client_plans(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_crm_notes (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_rules (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger TEXT NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
  action TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id BIGSERIAL PRIMARY KEY,
  rule_id BIGINT NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  dry_run BOOLEAN NOT NULL DEFAULT TRUE,
  status TEXT NOT NULL,
  result JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
