-- Subscriptions bought in the apps.
--
-- plan_source gains 'apple' (the App Store); 'play' and 'stripe' were already there.
-- billing_events: the RevenueCat events already seen (a retry or a duplicate does nothing).
-- billing_state: the time of the last event applied to an account, so an old event that
--   arrives late never undoes a newer one.
-- Nothing about a card or a payment method is stored: only product, store and dates.

ALTER TABLE app_users DROP CONSTRAINT IF EXISTS app_users_plan_source_check;
ALTER TABLE app_users ADD CONSTRAINT app_users_plan_source_check
  CHECK (plan_source IN ('manual', 'stripe', 'play', 'apple'));

CREATE TABLE IF NOT EXISTS billing_events (
  id TEXT PRIMARY KEY,
  user_id BIGINT,
  type TEXT,
  store TEXT,
  product TEXT,
  outcome TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS billing_state (
  user_id BIGINT PRIMARY KEY,
  last_event_ms BIGINT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
