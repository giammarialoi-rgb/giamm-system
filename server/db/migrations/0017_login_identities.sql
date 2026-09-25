-- Login identities: which Google or Apple account opens which Nurvan account.
--
-- Until now an account matched an identity provider only by email, and
-- app_users.provider / provider_id kept just the last method used. An Apple
-- account can hide its address behind a relay (@privaterelay.appleid.com), and
-- the address behind an identity can change: the stable key is the provider's
-- own id (the "sub" of its token). One row per identity, several per account.
--
-- refresh_token_enc: Apple only. The refresh token from the first code
-- exchange, encrypted with a key derived from the server secret, so that
-- deleting the account can revoke the app's access on Apple's side.
--
-- login_tickets: the Android path. The app opens Apple in the browser, Apple
-- posts back to the server, and the server hands the app a one-time ticket
-- through the giammaria:// link; the app swaps it for a session. Stored as a
-- hash, valid two minutes, used once.

CREATE TABLE IF NOT EXISTS app_user_identities (
  provider TEXT NOT NULL,
  provider_sub TEXT NOT NULL,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  email TEXT,
  refresh_token_enc TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (provider, provider_sub)
);
CREATE INDEX IF NOT EXISTS idx_app_user_identities_user ON app_user_identities (user_id);

-- The Google and Apple logins made so far, from the columns that held them.
INSERT INTO app_user_identities (provider, provider_sub, user_id, email)
SELECT provider, provider_id, id, email
FROM app_users
WHERE provider IN ('google', 'apple') AND COALESCE(provider_id, '') <> ''
ON CONFLICT (provider, provider_sub) DO NOTHING;

CREATE TABLE IF NOT EXISTS app_login_tickets (
  ticket_hash TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
