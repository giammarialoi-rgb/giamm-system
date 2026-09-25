-- Scheduled check-ins.
--
-- The model (cadence, day, time, rows) belongs to the coach-athlete
-- relationship, so it lives on coach_clients. NULL means no scheduled
-- check-ins: the athlete gets no reminder until the coach saves a model.
-- The fills stay in coach_check_ins; "pending" and "skipped" are computed
-- from the cadence and never stored.

ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS checkin_template JSONB;

ALTER TABLE coach_check_ins ADD COLUMN IF NOT EXISTS answers JSONB;
ALTER TABLE coach_check_ins ADD COLUMN IF NOT EXISTS attachment JSONB;
ALTER TABLE coach_check_ins ADD COLUMN IF NOT EXISTS kind TEXT;
ALTER TABLE coach_check_ins ADD COLUMN IF NOT EXISTS scheduled_for TIMESTAMPTZ;
