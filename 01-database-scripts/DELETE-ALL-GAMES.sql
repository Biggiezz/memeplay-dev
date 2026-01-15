-- ============================================
-- DELETE ALL GAMES FROM HOMEPAGE
-- ============================================
-- ⚠️ WARNING: This will PERMANENTLY DELETE all games from user_created_games table
-- This action CANNOT be undone!
-- 
-- After running this script:
-- - All games will be removed from homepage
-- - Games will still be accessible via direct links if they exist in localStorage
-- - Related data (likes, comments, scores) will remain but games won't appear
--
-- To execute:
-- 1. Open Supabase Dashboard → SQL Editor
-- 2. Paste this script
-- 3. Click "Run"
-- ============================================

-- Delete all games from user_created_games table
DELETE FROM user_created_games;

-- Optional: Reset sequence (if using auto-increment ID)
-- ALTER SEQUENCE user_created_games_id_seq RESTART WITH 1;

-- Verify deletion (should return 0 rows)
SELECT COUNT(*) as remaining_games FROM user_created_games;

