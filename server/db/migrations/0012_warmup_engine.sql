-- Warm-Up Engine: coach-owned reusable templates, per-client assignments
-- (snapshotted at assignment time so a later template edit never retroactively
-- changes what a client was actually prescribed), and completion tracking for
-- coach visibility/analytics. Personal (non-coach) warm-ups deliberately do
-- NOT get a table here - they live in the existing app_account_data JSONB
-- blob alongside nutrition/training, exactly like every other personal
-- domain in this app. A dedicated table only exists where the "coach-assigned
-- content is locked" guarantee actually needs server-side authority: the
-- client has no write endpoint capable of touching template/assignment
-- structure at all, so there is nothing for a hidden UI control to leak.

CREATE TABLE IF NOT EXISTS coach_warmup_templates (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  target_session_type TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_warmup_templates_owner
  ON coach_warmup_templates (coach_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS coach_warmup_assignments (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
  template_id BIGINT REFERENCES coach_warmup_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  target_session_type TEXT,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  assignment_type TEXT NOT NULL DEFAULT 'optional' CHECK (assignment_type IN ('optional', 'mandatory')),
  locked BOOLEAN NOT NULL DEFAULT true,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_warmup_assignments_client_active
  ON coach_warmup_assignments (client_id, active, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_coach_warmup_assignments_coach
  ON coach_warmup_assignments (coach_user_id, client_id);

CREATE TABLE IF NOT EXISTS coach_warmup_completions (
  id BIGSERIAL PRIMARY KEY,
  assignment_id BIGINT NOT NULL REFERENCES coach_warmup_assignments(id) ON DELETE CASCADE,
  client_id BIGINT NOT NULL REFERENCES coach_clients(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed', 'partial', 'skipped')),
  completed_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_items INT NOT NULL DEFAULT 0,
  completed_count INT NOT NULL DEFAULT 0,
  duration_seconds INT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_coach_warmup_completions_client
  ON coach_warmup_completions (client_id, session_date DESC);
