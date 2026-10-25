-- Suggestions and problems sent from the app (Impostazioni › Suggerimenti e problemi).
--
-- kind: 'bug', 'idea' or 'other'; message: what the person wrote; email: where to answer (optional);
-- device: app version, platform, system, model, screen, language, page — only if the person left
-- the box ticked; account_id: the account signed in when it was sent (optional); ip_hash: to limit
-- abuse. status 'open' or 'done'; note: what was done about it. Closed messages are deleted after
-- 12 months (server/admin/app-feedback.mjs).

CREATE TABLE IF NOT EXISTS app_feedback (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL,
  message TEXT NOT NULL,
  email TEXT,
  device JSONB,
  account_id BIGINT,
  ip_hash TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  note TEXT,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_app_feedback_status ON app_feedback(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_feedback_ip ON app_feedback(ip_hash, created_at DESC);
