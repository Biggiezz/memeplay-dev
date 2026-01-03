-- Supabase Table Setup for Avatar Mint Tracking
-- Run this SQL in Supabase SQL Editor: https://iikckrcdrvnqctzacxgx.supabase.co/project/_/sql

-- Create avatar_mints table
CREATE TABLE IF NOT EXISTS avatar_mints (
  id SERIAL PRIMARY KEY,
  token_id INTEGER NOT NULL,
  user_address TEXT NOT NULL,
  config_hash TEXT,
  config_json JSONB,
  transaction_hash TEXT,
  minted_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_avatar_mints_user_address ON avatar_mints(user_address);
CREATE INDEX IF NOT EXISTS idx_avatar_mints_token_id ON avatar_mints(token_id);
CREATE INDEX IF NOT EXISTS idx_avatar_mints_minted_at ON avatar_mints(minted_at);

-- Enable Row Level Security (RLS) - Allow public read, insert only
ALTER TABLE avatar_mints ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (for tracking)
CREATE POLICY "Allow public insert" ON avatar_mints
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Policy: Allow anyone to read (for stats)
CREATE POLICY "Allow public read" ON avatar_mints
  FOR SELECT
  TO public
  USING (true);

-- Optional: Add comment
COMMENT ON TABLE avatar_mints IS 'Tracks avatar mint events for analytics and stats';

