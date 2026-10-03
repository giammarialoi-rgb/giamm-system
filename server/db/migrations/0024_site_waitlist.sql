-- The waiting list of the site (/lista-attesa) and the applications of the
-- coaches who want to be among the first (the founding coaches).
--
-- consent_at / consent_text: when the privacy box was ticked and the words
-- that were shown next to it. Both forms refuse a request without it.
-- ip_hash is not kept: the rate limit lives in memory.

CREATE TABLE IF NOT EXISTS waitlist (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  lang TEXT NOT NULL DEFAULT 'it',
  consent_at TIMESTAMPTZ NOT NULL,
  consent_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coach_applications (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  social TEXT NOT NULL DEFAULT '',
  athletes TEXT NOT NULL,
  qualification TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT 'it',
  consent_at TIMESTAMPTZ NOT NULL,
  consent_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
