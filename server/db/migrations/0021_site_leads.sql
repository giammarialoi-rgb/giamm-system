-- People who asked for an example workout on the site (/allenamenti): the
-- PDF is sent as a link to the address they left.
--
-- marketing_consent / consent_at / consent_text: whether they ticked the box
-- to receive Nurvan's emails, when, and the words they were shown.
-- token_hash: the link in the email (SHA-256, valid a week from last_sent_at).
-- confirmed_at: the first time the link was opened - the address is theirs.
-- unsub_hash / unsubscribed_at: the link that withdraws the consent.
-- An address is "contactable" only with consent, confirmed, not unsubscribed.

CREATE TABLE IF NOT EXISTS site_leads (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  sample TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'it',
  marketing_consent BOOLEAN NOT NULL DEFAULT FALSE,
  consent_at TIMESTAMPTZ,
  consent_text TEXT,
  token_hash TEXT NOT NULL,
  unsub_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  downloads INT NOT NULL DEFAULT 0,
  unsubscribed_at TIMESTAMPTZ,
  UNIQUE (email, sample)
);
CREATE INDEX IF NOT EXISTS idx_site_leads_token ON site_leads(token_hash);
CREATE INDEX IF NOT EXISTS idx_site_leads_unsub ON site_leads(unsub_hash);
