-- coach_branding: the coach's (or gym's) own name and logo. The logo is made on the coach's phone (cropped, with
--   "powered by Nurvan" laid over it) in the three sizes a home-screen icon needs; the client's link (/c/<invite>)
--   serves them as its manifest and apple-touch icons, so the web app a client installs is the coach's.
--   A store app has one icon for everyone: it cannot change per coach.
-- coach_expenses: what the coach spends (rent, equipment, software...), kept by hand next to the payments
--   received (coach_payment_events). No money moves through the app in either direction.

CREATE TABLE IF NOT EXISTS coach_branding (
  coach_user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  brand_name TEXT NOT NULL DEFAULT '',
  icon_512 BYTEA,
  icon_192 BYTEA,
  icon_180 BYTEA,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_expenses (
  id BIGSERIAL PRIMARY KEY,
  coach_user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  category TEXT NOT NULL DEFAULT 'other',
  label TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_coach_expenses_coach_time ON coach_expenses (coach_user_id, occurred_at DESC);
