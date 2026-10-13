-- Notices of illegal content (Digital Services Act, art. 16): anyone, with or
-- without an account, can send one from /segnala-contenuto.
--
-- kind: the category picked; location: where the content is (link, user,
-- chat, date); explanation: why it is illegal; name / email: who sends it
-- (optional only for child sexual abuse material, art. 16(2)(c));
-- good_faith: the statement the notice requires; ip_hash: to limit abuse.
-- decision / decided_at: what was done, told to the notifier (art. 16(5)).

CREATE TABLE IF NOT EXISTS content_reports (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  location TEXT NOT NULL,
  explanation TEXT NOT NULL,
  name TEXT,
  email TEXT,
  good_faith BOOLEAN NOT NULL DEFAULT FALSE,
  lang TEXT NOT NULL DEFAULT 'it',
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  decision TEXT,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_content_reports_status ON content_reports(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_reports_ip ON content_reports(ip_hash, created_at DESC);
