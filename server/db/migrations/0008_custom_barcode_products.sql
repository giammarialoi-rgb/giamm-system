CREATE TABLE IF NOT EXISTS custom_barcode_products (
  id BIGSERIAL PRIMARY KEY,
  barcode TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  serving TEXT,
  serving_grams NUMERIC,
  kcal NUMERIC,
  proteins NUMERIC,
  carbohydrates NUMERIC,
  fat NUMERIC,
  fibers NUMERIC,
  salt NUMERIC,
  sugars NUMERIC,
  saturated_fat NUMERIC,
  source TEXT NOT NULL DEFAULT 'ai_discovered',
  added_by_user_id BIGINT REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_barcode_products_barcode
  ON custom_barcode_products (barcode);
