-- Withdrawals from a subscription bought on the website (Stripe), made with
-- the "Recedi dal contratto qui" button (EU Directive 2023/2673, in force from
-- 19 June 2026). Kept as proof of what was asked and when, and of the refund.
--
-- refund_cents: what was given back for the part of the period not used
-- (the part already provided stays due, art. 57 Codice del consumo).
-- refund_status: 'none' (trial, nothing paid), 'refunded', 'failed' (to be
-- refunded by hand from the Stripe dashboard).

CREATE TABLE IF NOT EXISTS billing_withdrawals (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  subscription_id TEXT NOT NULL,
  product_id TEXT,
  contract_started_at TIMESTAMPTZ,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  refund_cents INT NOT NULL DEFAULT 0,
  currency TEXT,
  refund_status TEXT NOT NULL DEFAULT 'none',
  refund_id TEXT,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX IF NOT EXISTS idx_billing_withdrawals_user ON billing_withdrawals(user_id, requested_at DESC);
