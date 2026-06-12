-- Run this in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/lyupqrxstrneczdbwrog/sql/new

-- Reader reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id               uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  book_slug        text NOT NULL,
  reviewer_name    text NOT NULL,
  reviewer_email   text NOT NULL,
  rating           integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  body             text NOT NULL,
  verified_purchase boolean DEFAULT false,
  approved         boolean DEFAULT true,
  created_at       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS reviews_book_slug_idx ON reviews (book_slug);
CREATE INDEX IF NOT EXISTS reviews_email_slug_idx ON reviews (reviewer_email, book_slug);

-- Row-level security: anyone can read approved reviews
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read approved reviews"
  ON reviews FOR SELECT
  USING (approved = true);

-- Add sample_text column to books table (for Read Sample feature)
ALTER TABLE books ADD COLUMN IF NOT EXISTS sample_text text;
