-- ─── Orders table — run this in Supabase SQL Editor ──────────────────────────
-- Safe to run on an existing table: uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
-- Paste into: Supabase Dashboard → SQL Editor → New query → Run

-- 1. Create table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS orders (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  paypal_order_id   TEXT UNIQUE NOT NULL,
  buyer_email       TEXT NOT NULL,
  book_slug         TEXT NOT NULL,
  book_title        TEXT NOT NULL,
  amount            NUMERIC(10, 2) NOT NULL,
  download_token    UUID,
  token_expires_at  TIMESTAMPTZ,
  order_type        TEXT NOT NULL DEFAULT 'ebook',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add order_type column if it was created without it
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'ebook';

-- 3. Performance indexes for the sales tracker queries
CREATE INDEX IF NOT EXISTS orders_created_at_idx  ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS orders_book_slug_idx   ON orders (book_slug);
CREATE INDEX IF NOT EXISTS orders_buyer_email_idx ON orders (buyer_email);

-- 4. Row Level Security — service-role key (used by all API functions) bypasses RLS.
--    Enable RLS so that no anonymous or authenticated client can read orders directly.
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Allow the service role to do everything (it bypasses RLS by default, but explicit is safer)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'orders' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY service_role_all ON orders
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 5. Quick sanity check — shows row count and most recent order
SELECT
  COUNT(*)                                     AS total_orders,
  COALESCE(SUM(amount), 0)::NUMERIC(10,2)     AS total_revenue,
  MAX(created_at)                              AS last_order_at
FROM orders;
