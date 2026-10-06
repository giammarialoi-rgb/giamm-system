-- coach_branding.home_name: the name the client's phone writes under the icon when the web app is added to the Home
--   screen. Empty = the brand name, or "Nurvan" when the coach has none. Only that coach's clients see it.

ALTER TABLE coach_branding ADD COLUMN IF NOT EXISTS home_name TEXT NOT NULL DEFAULT '';
