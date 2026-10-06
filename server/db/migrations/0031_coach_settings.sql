-- coach_settings: the coach's own settings. intake_config is the coach's version of the questionnaire a new client
--   answers (see server/coach-os/settings.mjs): fixed questions hidden / renamed / required or not / with other choices,
--   plus questions of the coach's own (open, one choice, several choices).

CREATE TABLE IF NOT EXISTS coach_settings (
  coach_user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  intake_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
