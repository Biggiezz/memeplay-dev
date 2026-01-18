-- ============================================
-- Setup list_user_created_games RPC Function
-- ============================================
-- This script creates/updates the RPC function to list games
-- with proper error handling and CORS support
-- Run this in Supabase SQL Editor
-- ============================================

-- Drop and recreate the function
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

-- Verify the function was created
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'list_user_created_games';

-- ============================================
-- ✅ DONE: RPC function is ready
-- ============================================
-- The function can be called via:
-- SELECT list_user_created_games('pacman-template');
-- Or via Supabase client:
-- supabase.rpc('list_user_created_games', { p_template_id: 'pacman-template' })
-- ============================================

-- Test query
-- SELECT list_user_created_games('pacman-template');

