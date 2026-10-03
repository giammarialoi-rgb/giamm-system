-- The addresses of the site already announced to the search engines that
-- support IndexNow (server/site/indexnow.mjs), so that only a new page, or
-- an article changed since, is announced and the whole site is not sent again
-- at every restart.
--
-- lastmod: the page's date when it was announced (YYYY-MM-DD).

CREATE TABLE IF NOT EXISTS indexnow_urls (
  url TEXT PRIMARY KEY,
  lastmod TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
