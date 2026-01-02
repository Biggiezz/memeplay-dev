-- ==========================================
-- ADD BRICK - FALLEN CRYPTO TO SUPABASE
-- ==========================================
-- Run this SQL in Supabase SQL Editor
-- (SQL Editor → New Query → Paste → RUN)

INSERT INTO games (id, title, token_address)
VALUES ('brick-fallen-crypto', 'Brick - Fallen Crypto', NULL);

-- ==========================================
-- VERIFY:
-- ==========================================
-- SELECT * FROM games WHERE id = 'brick-fallen-crypto';
-- 
-- Expected result:
-- id: brick-fallen-crypto
-- title: Brick - Fallen Crypto
-- token_address: NULL
-- created_at: <timestamp>

-- ==========================================
-- NOTES:
-- ==========================================
-- This replaces game #8 (xstarship-flap)
-- Features:
-- - 20 levels (30s each)
-- - Breakout/Arkanoid style
-- - Failed crypto project themes
-- - Mobile optimized (2.1x speed)
-- - 30.2 KB file size

