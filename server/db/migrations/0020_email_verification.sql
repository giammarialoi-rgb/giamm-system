-- Email and password accounts, as any online service keeps them.
--
-- email_verified_at: when the owner of the address proved it (a code or a
-- link from the verification email, a password reset received there, or a
-- Google/Apple login that verified it).
-- email_verify_required: accounts registered from now on must verify before
-- the first login. The accounts that exist already were made when nothing
-- asked for it: they keep logging in, unverified, and are asked to verify
-- only if they change their address.
--
-- app_email_verifications: one pending verification per account, a 6-digit
-- code and a link token, both stored hashed.
-- app_password_resets.link_hash: the reset email carries a link beside the
-- code, for a reset done in the browser.
-- app_login_failures: wrong passwords per address in a 15-minute window, so
-- an account cannot be guessed at from many addresses at once.

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;
ALTER TABLE app_users ADD COLUMN IF NOT EXISTS email_verify_required BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE app_users SET email_verified_at = COALESCE(created_at, NOW())
  WHERE email_verified_at IS NULL AND provider IN ('google', 'apple');

CREATE TABLE IF NOT EXISTS app_email_verifications (
  user_id BIGINT PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  link_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_email_verifications_link ON app_email_verifications(link_hash);

ALTER TABLE app_password_resets ADD COLUMN IF NOT EXISTS link_hash TEXT;
CREATE INDEX IF NOT EXISTS idx_app_password_resets_link ON app_password_resets(link_hash);

CREATE TABLE IF NOT EXISTS app_login_failures (
  email TEXT PRIMARY KEY,
  failures INT NOT NULL DEFAULT 0,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
