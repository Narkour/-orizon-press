-- Migration 003: Add audio_path for ElevenLabs-generated narration
-- Apply via: Supabase dashboard → SQL Editor → paste & run

ALTER TABLE books ADD COLUMN IF NOT EXISTS audio_path text;
