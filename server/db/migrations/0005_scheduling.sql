CREATE TABLE IF NOT EXISTS coach_availability_rules (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_minute SMALLINT NOT NULL CHECK (start_minute BETWEEN 0 AND 1439),
  end_minute SMALLINT NOT NULL CHECK (end_minute BETWEEN 1 AND 1440),
  timezone TEXT NOT NULL DEFAULT 'UTC',
  session_types JSONB NOT NULL DEFAULT '["Coaching Call"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coach_availability_rules
  ON coach_availability_rules (coach_user_id, weekday);

CREATE TABLE IF NOT EXISTS coach_availability_exceptions (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  available BOOLEAN NOT NULL DEFAULT FALSE,
  start_minute SMALLINT,
  end_minute SMALLINT,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (coach_user_id, day)
);

CREATE TABLE IF NOT EXISTS coach_appointments (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  client_id BIGINT REFERENCES coach_clients(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'scheduled',
  notes TEXT,
  created_by TEXT NOT NULL DEFAULT 'coach',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cancelled_at TIMESTAMPTZ,
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_coach_appointments_range
  ON coach_appointments (coach_user_id, starts_at, status);

CREATE TABLE IF NOT EXISTS coach_reminders (
  id BIGSERIAL PRIMARY KEY,
  appointment_id BIGINT NOT NULL REFERENCES coach_appointments(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app',
  send_at TIMESTAMPTZ NOT NULL,
  sent_at TIMESTAMPTZ,
  UNIQUE (appointment_id, channel, send_at)
);
