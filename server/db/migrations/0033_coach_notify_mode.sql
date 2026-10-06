-- coach_settings: how the coach wants to be notified. notify_mode 'instant' = a push as each thing happens (default);
--   'digest' = one push a day, at notify_hour (Rome time), with what is waiting. notify_digest_on = the day it was last sent.

ALTER TABLE coach_settings ADD COLUMN IF NOT EXISTS notify_mode TEXT NOT NULL DEFAULT 'instant';
ALTER TABLE coach_settings ADD COLUMN IF NOT EXISTS notify_hour SMALLINT NOT NULL DEFAULT 18;
ALTER TABLE coach_settings ADD COLUMN IF NOT EXISTS notify_digest_on DATE;
