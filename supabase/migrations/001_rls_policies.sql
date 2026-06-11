-- ============================================================
-- Migration 001: Enable RLS on books and orders tables
-- Apply via: Supabase dashboard → SQL Editor → paste & run
-- ============================================================

-- ── books ────────────────────────────────────────────────────
ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- Anyone can read books (public catalogue)
CREATE POLICY "books_select_public"
  ON books FOR SELECT
  USING (true);

-- Only service role can write (our API routes use service role key
-- which bypasses RLS; these policies block accidental anon writes)
CREATE POLICY "books_insert_denied"
  ON books FOR INSERT
  WITH CHECK (false);

CREATE POLICY "books_update_denied"
  ON books FOR UPDATE
  USING (false);

CREATE POLICY "books_delete_denied"
  ON books FOR DELETE
  USING (false);


-- ── orders ───────────────────────────────────────────────────
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- No public access to orders — all access via service role key only
CREATE POLICY "orders_select_denied"
  ON orders FOR SELECT
  USING (false);

CREATE POLICY "orders_insert_denied"
  ON orders FOR INSERT
  WITH CHECK (false);

CREATE POLICY "orders_update_denied"
  ON orders FOR UPDATE
  USING (false);

CREATE POLICY "orders_delete_denied"
  ON orders FOR DELETE
  USING (false);


-- ── Storage buckets ──────────────────────────────────────────
-- Run these if not already set in the Supabase Storage dashboard:

-- Allow public read on covers bucket
INSERT INTO storage.buckets (id, name, public)
  VALUES ('covers', 'covers', true)
  ON CONFLICT (id) DO UPDATE SET public = true;

-- ebooks bucket must stay private (signed URLs only)
INSERT INTO storage.buckets (id, name, public)
  VALUES ('ebooks', 'ebooks', false)
  ON CONFLICT (id) DO NOTHING;
