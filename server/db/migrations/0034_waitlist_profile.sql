-- The waiting list asks four things (email, who signs up, days a week, where) and the founding-coach form asks the
-- city instead of the qualification. Columns are added, nothing is removed, so the rows already there stay valid.
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS profile TEXT NOT NULL DEFAULT '';
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS days TEXT NOT NULL DEFAULT '';
ALTER TABLE waitlist ADD COLUMN IF NOT EXISTS place TEXT NOT NULL DEFAULT '';
ALTER TABLE coach_applications ADD COLUMN IF NOT EXISTS city TEXT NOT NULL DEFAULT '';
