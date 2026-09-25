-- Plans and entitlements.
--
-- The plan lives on the account (app_users): plan, where it came from, until
-- when, how many athletes a coach can follow (NULL = the plan's default,
-- -1 = unlimited), the trial. Every change is written to app_plan_history.
-- What a plan allows is in web/features.json, read by web/entitlements.js on
-- the page and on the server alike.
--
-- Coaches already active before plans existed keep working: they get the
-- "coach" plan, manual, without expiry, with a history row that says so. The
-- administrator can change it like any other.

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS plan TEXT NOT NULL DEFAULT 'free';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS plan_source TEXT NOT NULL DEFAULT 'manual';
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS plan_until TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS seats INTEGER;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS trial_until TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS trial_used_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_users_plan_check') THEN
    ALTER TABLE app_users ADD CONSTRAINT app_users_plan_check
      CHECK (plan IN ('free', 'standard', 'coach', 'coach_pro'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_users_plan_source_check') THEN
    ALTER TABLE app_users ADD CONSTRAINT app_users_plan_source_check
      CHECK (plan_source IN ('manual', 'stripe', 'play'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS app_plan_history (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  from_plan TEXT,
  to_plan TEXT NOT NULL,
  source TEXT NOT NULL,
  plan_until TIMESTAMPTZ,
  seats INTEGER,
  note TEXT,
  actor TEXT
);

CREATE INDEX IF NOT EXISTS idx_app_plan_history_user
  ON app_plan_history (user_id, changed_at DESC);

INSERT INTO app_plan_history(user_id, from_plan, to_plan, source, note, actor)
SELECT u.id, u.plan, 'coach', 'manual', 'Migrazione 0015: coach gia'' attivo prima dei piani', 'migration'
FROM app_users u
JOIN coach_licenses l ON l.user_id = u.id AND l.status = 'active'
WHERE u.plan = 'free';

UPDATE app_users u
SET plan = 'coach', plan_source = 'manual'
FROM coach_licenses l
WHERE l.user_id = u.id AND l.status = 'active' AND u.plan = 'free';
