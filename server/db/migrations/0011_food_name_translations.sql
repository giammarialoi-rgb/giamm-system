CREATE TABLE IF NOT EXISTS food_name_translations (
  id BIGSERIAL PRIMARY KEY,
  original_key TEXT NOT NULL,
  target_lang TEXT NOT NULL,
  translated_name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'ai_localized',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (original_key, target_lang)
);

CREATE INDEX IF NOT EXISTS idx_food_name_translations_lookup
  ON food_name_translations (original_key, target_lang);
