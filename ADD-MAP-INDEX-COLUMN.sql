-- ============================================
-- Add map_index column for Pacman template data
-- ============================================
-- This script must be executed inside Supabase (SQL editor).
-- It adds map_index to user_created_games and documents how to
-- update the RPC so production can load Pacman maps + stories.
-- ============================================

-- 1. Inspect existing column (safe on repeat runs)
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_created_games'
  AND column_name = 'map_index';

-- 2. Add column with default value 0 if it does not exist yet
ALTER TABLE user_created_games
ADD COLUMN IF NOT EXISTS map_index INTEGER DEFAULT 0;

-- 3. (Manual) Update upsert_user_created_game RPC to accept map_index
-- Replace the function body with something similar to:
-- CREATE OR REPLACE FUNCTION upsert_user_created_game(
--   p_game_id TEXT,
--   p_template_id TEXT,
--   p_title TEXT,
--   p_map_color TEXT,
--   p_map_index INTEGER,
--   p_fragment_logo_url TEXT,
--   p_story_one TEXT,
--   p_story_two TEXT,
--   p_story_three TEXT,
--   p_public_url TEXT,
--   p_template_url TEXT,
--   p_creator_id TEXT,
--   p_context TEXT DEFAULT 'manual-save'
-- )
-- RETURNS VOID
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- AS $$
-- BEGIN
--   INSERT INTO user_created_games (
--     game_id, template_id, title, map_color, map_index, fragment_logo_url,
--     story_one, story_two, story_three, public_url, template_url, creator_id, context
--   )
--   VALUES (
--     p_game_id, p_template_id, p_title, p_map_color, p_map_index, p_fragment_logo_url,
--     p_story_one, p_story_two, p_story_three, p_public_url, p_template_url, p_creator_id, p_context
--   )
--   ON CONFLICT (game_id) DO UPDATE
--   SET
--     title = EXCLUDED.title,
--     map_color = EXCLUDED.map_color,
--     map_index = EXCLUDED.map_index,
--     fragment_logo_url = EXCLUDED.fragment_logo_url,
--     story_one = EXCLUDED.story_one,
--     story_two = EXCLUDED.story_two,
--     story_three = EXCLUDED.story_three,
--     public_url = EXCLUDED.public_url,
--     template_url = EXCLUDED.template_url,
--     creator_id = EXCLUDED.creator_id,
--     context = EXCLUDED.context,
--     updated_at = NOW();
-- END;
-- $$;

-- 4. (Optional) verify the column again
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_created_games'
  AND column_name = 'map_index';

-- 5. Inspect the latest Pacman games to confirm values
SELECT
  game_id,
  title,
  map_index,
  map_color,
  created_at
FROM user_created_games
WHERE template_id = 'pacman-template'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- Done. map_index is now part of user_created_games.
-- ============================================

