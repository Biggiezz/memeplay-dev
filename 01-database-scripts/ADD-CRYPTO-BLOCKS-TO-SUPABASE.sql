-- ============================================
-- Add "Crypto Blocks 8x8" to Supabase Games Table
-- ============================================
-- This script adds the game to the database so users can like and comment
-- Run this in Supabase SQL Editor

INSERT INTO games (id, title, token_address)
VALUES ('crypto-blocks', 'Crypto Blocks 8x8', NULL)
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    token_address = EXCLUDED.token_address;

-- Verify the game was added
SELECT * FROM games WHERE id = 'crypto-blocks';

