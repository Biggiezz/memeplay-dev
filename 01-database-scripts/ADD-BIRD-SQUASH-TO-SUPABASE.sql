-- Add Bird Squash Clone to Supabase games table
-- Run this in Supabase SQL Editor

INSERT INTO games (id, title, token_address)
VALUES (
  'bird-squash-clone',
  'Bird Squash Clone',
  NULL
)
ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT * FROM games WHERE id = 'bird-squash-clone';

