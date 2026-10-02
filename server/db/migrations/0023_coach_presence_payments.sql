-- How a coach follows a client, where a session takes place, and a payment
-- ledger with real figures.
--
-- coach_clients.coaching_mode: 'remote' (the client works from the web app),
--   'presence' (the coach trains them in person and may log for them) or
--   'both'.
-- coach_appointments.mode: 'presence' | 'remote' for that one session, so a
--   client followed both ways has a count of the sessions done in person.
-- coach_payment_events: method (cash, transfer, card...), label (what was
--   paid for), has_amount (a payment can be recorded without a figure: it is
--   then left out of the totals instead of counting as zero).
-- The ledger is the coach's own bookkeeping: no money moves through the app.

ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS coaching_mode TEXT NOT NULL DEFAULT 'remote';
ALTER TABLE coach_appointments ADD COLUMN IF NOT EXISTS mode TEXT;
ALTER TABLE coach_payment_events ADD COLUMN IF NOT EXISTS method TEXT;
ALTER TABLE coach_payment_events ADD COLUMN IF NOT EXISTS label TEXT;
ALTER TABLE coach_payment_events ADD COLUMN IF NOT EXISTS has_amount BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_coach_payment_events_coach_time ON coach_payment_events (coach_user_id, occurred_at DESC);
