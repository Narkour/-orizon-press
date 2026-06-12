-- Run this in the Supabase SQL editor:
-- https://supabase.com/dashboard/project/lyupqrxstrneczdbwrog/sql/new

-- Audiobook metadata on each book
ALTER TABLE books ADD COLUMN IF NOT EXISTS audio_price numeric;
ALTER TABLE books ADD COLUMN IF NOT EXISTS audio_available boolean NOT NULL DEFAULT false;
ALTER TABLE books ADD COLUMN IF NOT EXISTS audio_chapters jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Distinguish ebook vs audiobook orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'ebook';

-- Index for fast audiobook purchase lookups
CREATE INDEX IF NOT EXISTS orders_type_email_slug_idx ON orders (order_type, buyer_email, book_slug);
