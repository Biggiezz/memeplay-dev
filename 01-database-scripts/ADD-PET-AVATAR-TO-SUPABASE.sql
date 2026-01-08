-- ============================================
-- Add "Pet Avatar" Game to Supabase
-- ============================================
-- This script adds Pet Avatar game to user_created_games table
-- so it can be loaded from Supabase like other games
-- Run this in Supabase SQL Editor
-- ============================================

-- Insert Pet Avatar game into user_created_games table
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

-- Verify the game was added
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

-- ============================================
-- ✅ DONE: Pet Avatar game is now in Supabase
-- ============================================
-- The game will be loaded via list_user_created_games RPC
-- with template_id = 'pet-avatar-template'
-- ============================================

