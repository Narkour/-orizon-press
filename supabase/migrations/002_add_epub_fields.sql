-- Migration 002: Add epub_path and metadata fields used by admin dashboard
-- Apply via: Supabase dashboard → SQL Editor → paste & run

ALTER TABLE books ADD COLUMN IF NOT EXISTS epub_path    text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS tagline      text;
ALTER TABLE books ADD COLUMN IF NOT EXISTS bisac_codes  text[];
ALTER TABLE books ADD COLUMN IF NOT EXISTS seo_keywords text[];
ALTER TABLE books ADD COLUMN IF NOT EXISTS lulu_job_id  text;
