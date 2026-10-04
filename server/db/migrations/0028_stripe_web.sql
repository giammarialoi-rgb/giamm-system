-- Subscriptions bought on the website with Stripe.
--
-- stripe_customer_id: the person in Stripe (made at the first checkout), to open the customer
--   portal and to know whose subscription an event is about when it carries no account id.
-- stripe_trial_used_at: the free month of the website is given once per account.
-- A card number never reaches Nurvan: Stripe keeps it.

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS stripe_trial_used_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS idx_app_users_stripe_customer ON app_users (stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
