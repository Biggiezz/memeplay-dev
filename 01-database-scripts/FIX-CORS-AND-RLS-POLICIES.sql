-- ============================================
-- Fix CORS and RLS Policies for user_created_games
-- ============================================
-- This script ensures proper RLS policies are set up
-- to allow public read access for game listing
-- Run this in Supabase SQL Editor
-- ============================================

-- 1. Enable RLS on user_created_games table (if not already enabled)
ALTER TABLE user_created_games ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies (if any) to avoid conflicts
DROP POLICY IF EXISTS "Public read user_created_games" ON user_created_games;
DROP POLICY IF EXISTS "Public select user_created_games" ON user_created_games;
DROP POLICY IF EXISTS "Allow public read" ON user_created_games;

-- 3. Create new policy for public read access
CREATE POLICY "Allow public read user_created_games"
ON user_created_games
FOR SELECT
TO anon, authenticated
USING (true);

-- 4. Verify RLS is enabled
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'user_created_games';

-- 5. Verify policy exists
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'user_created_games';

-- ============================================
-- ✅ DONE: RLS policies are set up
-- ============================================
-- Note: CORS headers are handled by Supabase automatically
-- If you still see CORS errors, check:
-- 1. Supabase Dashboard → Settings → API → CORS settings
-- 2. Add 'https://memeplay.dev' to allowed origins
-- 3. Add 'http://localhost:5500' for local development
-- ============================================

