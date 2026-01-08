-- ============================================
-- COMPLETE SETUP: Pet Avatar Game on Supabase
-- ============================================
-- Copy entire file and paste into Supabase SQL Editor
-- Run once only
-- ============================================

-- ============================================
-- STEP 1: Ensure map_index column exists
-- ============================================
ALTER TABLE user_created_games
ADD COLUMN IF NOT EXISTS map_index INTEGER DEFAULT 0;

-- ============================================
-- STEP 2: Setup RPC Function list_user_created_games
-- ============================================

DROP FUNCTION IF EXISTS list_user_created_games(TEXT);

CREATE OR REPLACE FUNCTION list_user_created_games(p_template_id TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  v_games JSON;
BEGIN
  -- Validate input
  IF p_template_id IS NULL OR p_template_id = '' THEN
    RETURN '[]'::JSON;
  END IF;

  -- Query games with social counts (likes, comments)
  SELECT json_agg(
    json_build_object(
      'game_id', game_id,
      'template_id', template_id,
      'title', title,
      'map_color', map_color,
      'map_index', COALESCE(map_index, 0),
      'fragment_logo_url', fragment_logo_url,
      'story_one', COALESCE(story_one, ''),
      'story_two', COALESCE(story_two, ''),
      'story_three', COALESCE(story_three, ''),
      'public_url', public_url,
      'template_url', template_url,
      'creator_id', creator_id,
      'creator_name', creator_id, -- Fallback to creator_id if no name field
      'created_at', created_at,
      'updated_at', updated_at,
      'likes_count', COALESCE((
        SELECT COUNT(*)::INTEGER
        FROM game_likes
        WHERE game_likes.game_id = user_created_games.game_id
      ), 0),
      'comments_count', COALESCE((
        SELECT COUNT(*)::INTEGER
        FROM game_comments
        WHERE game_comments.game_id = user_created_games.game_id
      ), 0),
      'plays_count', 0 -- TODO: Add plays tracking if needed
    )
    ORDER BY created_at DESC
  )
  INTO v_games
  FROM user_created_games
  WHERE template_id = p_template_id;

  -- Return empty array if no games found
  RETURN COALESCE(v_games, '[]'::JSON);
END;
$$;

-- Grant execute permission to anon role
GRANT EXECUTE ON FUNCTION list_user_created_games(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION list_user_created_games(TEXT) TO authenticated;

-- ============================================
-- STEP 3: Setup RLS Policies (Fix CORS)
-- ============================================

-- Enable RLS on user_created_games table (if not already enabled)
ALTER TABLE user_created_games ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Public read user_created_games" ON user_created_games;
DROP POLICY IF EXISTS "Public select user_created_games" ON user_created_games;
DROP POLICY IF EXISTS "Allow public read" ON user_created_games;
DROP POLICY IF EXISTS "Allow public read user_created_games" ON user_created_games;

-- Create new policy for public read access
CREATE POLICY "Allow public read user_created_games"
ON user_created_games
FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================
-- STEP 4: Insert Pet Avatar Game
-- ============================================

INSERT INTO user_created_games (
  game_id,
  template_id,
  title,
  map_color,
  map_index,
  fragment_logo_url,
  story_one,
  story_two,
  story_three,
  public_url,
  template_url,
  creator_id,
  context
)
VALUES (
  'pet-avatar',                                    -- game_id (unique identifier)
  'pet-avatar-template',                           -- template_id
  'Pet Avatar',                                    -- title
  '#1A0A2E',                                       -- map_color (default dark purple)
  0,                                               -- map_index
  NULL,                                            -- fragment_logo_url (no logo by default)
  'Pet Avatar',                                    -- story_one
  '',                                              -- story_two
  '',                                              -- story_three
  'https://memeplay.dev/play.html?game=pet-avatar', -- public_url
  'https://memeplay.dev/games/templates-v2/pet-avatar-template/index.html', -- template_url
  'memeplay-studio',                               -- creator_id
  'system-initial'                                 -- context
)
ON CONFLICT (game_id) DO UPDATE
SET
  title = EXCLUDED.title,
  template_id = EXCLUDED.template_id,
  map_color = EXCLUDED.map_color,
  map_index = EXCLUDED.map_index,
  fragment_logo_url = EXCLUDED.fragment_logo_url,
  story_one = EXCLUDED.story_one,
  story_two = EXCLUDED.story_two,
  story_three = EXCLUDED.story_three,
  public_url = EXCLUDED.public_url,
  template_url = EXCLUDED.template_url,
  creator_id = EXCLUDED.creator_id,
  context = EXCLUDED.context,
  updated_at = NOW();

-- ============================================
-- STEP 5: Verify Setup
-- ============================================

-- Verify RPC function
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'list_user_created_games';

-- Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_created_games';

-- Verify policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'user_created_games';

-- Verify Pet Avatar game was inserted
SELECT 
  game_id,
  template_id,
  title,
  creator_id,
  template_url,
  created_at,
  updated_at
FROM user_created_games
WHERE game_id = 'pet-avatar';

-- Test RPC function
SELECT list_user_created_games('pet-avatar-template');

-- ============================================
-- ✅ SETUP COMPLETE
-- ============================================
-- 
-- IMPORTANT NOTE ABOUT CORS:
-- ============================================
-- Supabase does NOT have separate CORS settings in Dashboard.
-- CORS is handled AUTOMATICALLY through:
-- 1. RLS Policies (setup in STEP 3) ✅
-- 2. API endpoints (handled automatically by Supabase) ✅
-- 
-- If you still see CORS errors after running this SQL, check:
-- 1. Verify RLS policies were created (see verify results above)
-- 2. Ensure RPC function has been granted permissions (STEP 2)
-- 3. Check if API Key is correct in code
--
-- ============================================
-- AFTER RUNNING SQL:
-- ============================================
--
-- 1. VERIFY SQL RESULTS:
--    - Check results of SELECT verify statements at end of script
--    - Ensure: RPC function exists, RLS enabled, Policy exists, Pet Avatar game inserted
--
-- 2. TEST ON WEBSITE (memeplay.dev):
--    a. Open website: https://memeplay.dev
--    b. Open Browser Console (F12 → Console tab)
--    c. Clear cache by running:
--       localStorage.removeItem('mp_v3_game_list_cache')
--    d. Reload page (F5 or Ctrl+R)
--    e. Check console for no CORS errors
--    f. Pet Avatar game should appear at position Game 0
--
-- 3. IF STILL CORS ERRORS:
--    - Check RLS policies again: Re-run STEP 3 (RLS Policies)
--    - Check if API Key in code is correct
--    - Check if Supabase URL is correct
--    - See error details in Browser Console for debugging
--
-- ============================================

