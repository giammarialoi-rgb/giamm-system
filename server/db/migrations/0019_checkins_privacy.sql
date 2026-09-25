-- Check-ins that keep their questions, sends that happen once, and the
-- privacy consents given in the app.
--
-- answer_rows: the questions the athlete saw (id, type, label), stored with
-- the answers. Answers are filtered against the coach's current template; a
-- check-in filled in and sent after the coach removed a question used to lose
-- that answer, and the coach could not have seen its label anyway.
--
-- client_operation_id: the athlete's phone gives each check-in one id and
-- sends it again on a retry. A timeout after the server had saved it used to
-- make a second check-in (and a second notification).
--
-- Consents (one row per account, latest wins): the version of the privacy
-- notice and terms accepted, the age confirmation, the explicit consent to
-- health data (GDPR art. 9), and the consent to send data to the AI
-- provider. When each was given, and when the AI consent was withdrawn.

ALTER TABLE coach_check_ins ADD COLUMN IF NOT EXISTS answer_rows JSONB;
ALTER TABLE coach_check_ins ADD COLUMN IF NOT EXISTS client_operation_id TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS idx_coach_check_ins_client_op
  ON coach_check_ins (client_id, client_operation_id)
  WHERE client_operation_id IS NOT NULL;

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS consent_version TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS consent_at TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS age_confirmed_at TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS health_consent_at TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS ai_consent_at TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS ai_consent_withdrawn_at TIMESTAMPTZ;
