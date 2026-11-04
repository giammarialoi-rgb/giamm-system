-- When the coach last recorded a payment for a client.
--
-- coach_clients.paid stays what it was (FALSE = the client owes money: alerts, Oggi, Incassi «da
-- incassare», the leave request). paid_at tells a payment recorded by the coach from nothing recorded
-- yet: a new client with payment reminders on used to show «Pagato» although nobody had paid (Play
-- testers' report, BUG-014). NULL with tracking on reads «Pagamento non registrato».
--
-- The clients already tracked keep the status they had: their paid_at is their creation date.

ALTER TABLE coach_clients ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
UPDATE coach_clients SET paid_at = COALESCE(created_at, NOW())
 WHERE paid_at IS NULL AND paid = TRUE AND pay_tracking = TRUE;
