-- Administration suite: money, profiles, site / app / social statistics.
--
-- admin_settings: small JSON settings the owner edits in the dashboard (price
--   book, recurring costs).
-- admin_account_billing: what one account really pays (period and price), or
--   that it is a gift ("comp"). Plans carry no price of their own.
-- admin_ledger: Nurvan's own bookkeeping - money in (subscriptions, stores)
--   and money out (servers, developer accounts, tools). Rows are voided, never
--   deleted. This is NOT the coaches' ledger (coach_payment_events): money a
--   coach takes from a client never appears here.
-- admin_notes: the owner's private notes and tags on an account.
-- site_hits_day / site_uniques_day: page views of the public site by day,
--   path, source and device. A visitor is a daily hash of IP + browser that is
--   forgotten after two days (site_visitors_day): nothing identifies a person
--   and nobody can be followed from one day to the next.
-- app_pings_day / app_stats_day: the same for the app (web, installed web app,
--   iOS, Android): active per day, and first openings (installs).
-- admin_metrics: one number per day, source and metric (Instagram followers,
--   App Store downloads...). origin says whether it came from the service's
--   API or was typed by hand.
-- admin_integrations: when each connection last ran, and what it saw.
-- app_users.disabled_at: a suspended account; its sessions stop working.

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS disabled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS admin_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_account_billing (
  user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  period TEXT,
  price_cents BIGINT,
  comp BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_ledger (
  id BIGSERIAL PRIMARY KEY,
  day DATE NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
  amount_cents BIGINT NOT NULL CHECK (amount_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'EUR',
  category TEXT NOT NULL DEFAULT 'altro',
  user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  reference TEXT,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  voided_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_admin_ledger_day ON admin_ledger (day DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_ledger_reference ON admin_ledger (source, reference) WHERE reference IS NOT NULL;

CREATE TABLE IF NOT EXISTS admin_notes (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  tag TEXT,
  author TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_notes_user ON admin_notes (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS site_hits_day (
  day DATE NOT NULL,
  host TEXT NOT NULL,
  path TEXT NOT NULL,
  source TEXT NOT NULL,
  device TEXT NOT NULL,
  hits INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, host, path, source, device)
);

CREATE TABLE IF NOT EXISTS site_visitors_day (
  day DATE NOT NULL,
  vhash TEXT NOT NULL,
  source TEXT NOT NULL,
  PRIMARY KEY (day, vhash)
);

CREATE TABLE IF NOT EXISTS site_uniques_day (
  day DATE NOT NULL,
  source TEXT NOT NULL,
  uniques INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, source)
);

CREATE TABLE IF NOT EXISTS app_pings_day (
  day DATE NOT NULL,
  platform TEXT NOT NULL,
  vhash TEXT NOT NULL,
  PRIMARY KEY (day, platform, vhash)
);

CREATE TABLE IF NOT EXISTS app_stats_day (
  day DATE NOT NULL,
  platform TEXT NOT NULL,
  active INT NOT NULL DEFAULT 0,
  installs INT NOT NULL DEFAULT 0,
  PRIMARY KEY (day, platform)
);

CREATE TABLE IF NOT EXISTS admin_metrics (
  day DATE NOT NULL,
  source TEXT NOT NULL,
  metric TEXT NOT NULL,
  value NUMERIC NOT NULL,
  origin TEXT NOT NULL DEFAULT 'manual',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (day, source, metric)
);

CREATE TABLE IF NOT EXISTS admin_integrations (
  name TEXT PRIMARY KEY,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_run_at TIMESTAMPTZ,
  last_ok_at TIMESTAMPTZ,
  last_error TEXT
);
