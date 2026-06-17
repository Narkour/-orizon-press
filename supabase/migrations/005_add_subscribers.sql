-- Run this once in the Supabase SQL editor to enable newsletter subscriptions.
-- Dashboard → SQL Editor → paste → Run

CREATE TABLE IF NOT EXISTS subscribers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text        UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- View subscribers: Supabase dashboard → Table Editor → subscribers
