-- Sessions that can be ended, and the Android Apple ticket tied to its app.
--
-- tokens_valid_after: session tokens are signed and last 90 days; until now
-- nothing could end one early. A token issued before this moment is refused.
-- It moves forward when the password is reset, and when a Google/Apple login
-- takes over an account by its verified email (the password set by whoever
-- registered that address first is dropped, and their sessions with it).
--
-- verifier_hash: the Apple ticket handed to the app through giammaria:// is
-- only swapped for a session by the app that started the login, which holds
-- the verifier. A ticket caught by another app, or sent in a link to force a
-- login into someone else's account, is useless without it.

ALTER TABLE app_users ADD COLUMN IF NOT EXISTS tokens_valid_after TIMESTAMPTZ;

ALTER TABLE app_login_tickets ADD COLUMN IF NOT EXISTS verifier_hash TEXT;
