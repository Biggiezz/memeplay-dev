-- ============================================
-- MEMEPLAY SUPABASE SETUP - CHẠY 1 LẦN DUY NHẤT
-- ============================================
-- File này setup toàn bộ hệ thống Supabase cho MemePlay
-- Chỉ cần chạy 1 lần khi setup project lần đầu
-- Sau đó tự động hoạt động cho MỌI game mới (không cần config thêm)
--
-- CÁCH SỬ DỤNG:
-- 1. Mở Supabase Dashboard → SQL Editor
-- 2. Copy toàn bộ file này
-- 3. Paste và click "Run"
-- 4. XONG! Từ giờ mọi game mới tự động có like/comment/leaderboard
--
-- ============================================
-- PHẦN 1: LIKE & COMMENT SYSTEM
-- ============================================

-- BƯỚC 1: Xóa foreign key constraints (nếu có)
ALTER TABLE game_likes DROP CONSTRAINT IF EXISTS game_likes_game_id_fkey;
ALTER TABLE game_comments DROP CONSTRAINT IF EXISTS game_comments_game_id_fkey;

-- BƯỚC 2: Xóa function cũ (nếu có)
DROP FUNCTION IF EXISTS toggle_like(TEXT, TEXT);
DROP FUNCTION IF EXISTS add_comment(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS list_comments(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_social_counts(TEXT);

-- BƯỚC 3: Tạo lại bảng (KHÔNG CÓ FOREIGN KEY - auto cho mọi game)
DROP TABLE IF EXISTS game_likes CASCADE;
CREATE TABLE game_likes (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

DROP TABLE IF EXISTS game_comments CASCADE;
CREATE TABLE game_comments (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BƯỚC 4: Tạo functions
CREATE OR REPLACE FUNCTION toggle_like(p_user_id TEXT, p_game_id TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_is_liked BOOLEAN; v_total_likes INTEGER;
BEGIN
  SELECT EXISTS(SELECT 1 FROM game_likes WHERE user_id = p_user_id AND game_id = p_game_id) INTO v_is_liked;
  IF v_is_liked THEN
    DELETE FROM game_likes WHERE user_id = p_user_id AND game_id = p_game_id;
    v_is_liked := FALSE;
  ELSE
    INSERT INTO game_likes (user_id, game_id) VALUES (p_user_id, p_game_id);
    v_is_liked := TRUE;
  END IF;
  SELECT COUNT(*)::INTEGER INTO v_total_likes FROM game_likes WHERE game_id = p_game_id;
  RETURN json_build_object('is_liked', v_is_liked, 'total_likes', v_total_likes, 'liked', v_is_liked);
END; $$;

CREATE OR REPLACE FUNCTION add_comment(p_user_id TEXT, p_game_id TEXT, p_text TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id BIGINT; v_created_at TIMESTAMPTZ;
BEGIN
  INSERT INTO game_comments (user_id, game_id, text) VALUES (p_user_id, p_game_id, TRIM(p_text))
  RETURNING id, created_at INTO v_id, v_created_at;
  RETURN json_build_object('id', v_id, 'created_at', v_created_at);
END; $$;

CREATE OR REPLACE FUNCTION list_comments(p_game_id TEXT, p_limit INTEGER DEFAULT 20, p_offset INTEGER DEFAULT 0)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_comments JSON;
BEGIN
  SELECT json_agg(
    json_build_object('id', id, 'user_id', user_id, 'text', text, 'created_at', created_at)
  ) INTO v_comments
  FROM (
    SELECT id, user_id, text, created_at
    FROM game_comments
    WHERE game_id = p_game_id
    ORDER BY created_at DESC
    LIMIT p_limit
    OFFSET p_offset
  ) sub;
  RETURN COALESCE(v_comments, '[]'::JSON);
END; $$;

CREATE OR REPLACE FUNCTION get_social_counts(p_game_id TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_likes INTEGER; v_comments INTEGER;
BEGIN
  SELECT COUNT(*)::INTEGER INTO v_likes FROM game_likes WHERE game_id = p_game_id;
  SELECT COUNT(*)::INTEGER INTO v_comments FROM game_comments WHERE game_id = p_game_id;
  RETURN json_build_object('likes', COALESCE(v_likes, 0), 'comments', COALESCE(v_comments, 0));
END; $$;

-- BƯỚC 5: BẬT RLS cho Like/Comment
ALTER TABLE game_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read likes" ON game_likes;
CREATE POLICY "Public read likes" ON game_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage likes" ON game_likes;
CREATE POLICY "Public manage likes" ON game_likes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read comments" ON game_comments;
CREATE POLICY "Public read comments" ON game_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert comments" ON game_comments;
CREATE POLICY "Public insert comments" ON game_comments FOR INSERT WITH CHECK (true);

-- ============================================
-- PHẦN 2: LEADERBOARD SCORE SYSTEM
-- ============================================

-- BƯỚC 1: Xóa function cũ (nếu có) - Thử nhiều signature
-- Supabase cần biết chính xác signature, nên thử nhiều cách
DROP FUNCTION IF EXISTS submit_game_score(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS submit_game_score(TEXT, TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_game_leaderboard_with_user(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_game_leaderboard_with_user(TEXT, TEXT, INTEGER);

-- BƯỚC 2: Tạo bảng game_scores (KHÔNG CÓ FOREIGN KEY - auto cho mọi game)
DROP TABLE IF EXISTS game_scores CASCADE;
CREATE TABLE game_scores (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  level INTEGER DEFAULT NULL, -- Optional: cho games có level (pixel-space-shooter)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique constraint: mỗi user chỉ có 1 best score per game
  UNIQUE(user_id, game_id)
);

-- Index để query leaderboard nhanh
CREATE INDEX IF NOT EXISTS idx_game_scores_game_score ON game_scores(game_id, score DESC);
CREATE INDEX IF NOT EXISTS idx_game_scores_user_game ON game_scores(user_id, game_id);

-- BƯỚC 3: RPC Function - submit_game_score
CREATE OR REPLACE FUNCTION submit_game_score(
  p_user_id TEXT,
  p_game_id TEXT,
  p_score INTEGER,
  p_level INTEGER DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_current_best INTEGER;
  v_is_new_best BOOLEAN := FALSE;
  v_user_rank INTEGER;
  v_total_players INTEGER;
  v_best_score INTEGER;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_user_id = '' THEN
    RAISE EXCEPTION 'user_id cannot be null or empty';
  END IF;
  IF p_game_id IS NULL OR p_game_id = '' THEN
    RAISE EXCEPTION 'game_id cannot be null or empty';
  END IF;
  IF p_score IS NULL OR p_score < 0 THEN
    RAISE EXCEPTION 'score must be non-negative integer';
  END IF;

  -- Get current best score (if exists)
  SELECT score INTO v_current_best
  FROM game_scores
  WHERE user_id = p_user_id AND game_id = p_game_id;

  -- Upsert: chỉ update nếu score mới > best score hiện tại
  INSERT INTO game_scores (user_id, game_id, score, level, created_at, updated_at)
  VALUES (p_user_id, p_game_id, p_score, p_level, NOW(), NOW())
  ON CONFLICT (user_id, game_id) DO UPDATE
    SET score = GREATEST(game_scores.score, EXCLUDED.score),
        level = COALESCE(EXCLUDED.level, game_scores.level),
        updated_at = CASE 
          WHEN EXCLUDED.score > game_scores.score THEN NOW()
          ELSE game_scores.updated_at
        END;

  -- Re-fetch best score sau khi upsert
  SELECT score INTO v_best_score
  FROM game_scores
  WHERE user_id = p_user_id AND game_id = p_game_id;

  -- Check if this is a new best (score mới > best score cũ)
  v_is_new_best := (v_current_best IS NULL OR p_score > v_current_best);

  -- Calculate user rank (số players có score >= user's best score)
  SELECT COUNT(*)::INTEGER INTO v_user_rank
  FROM game_scores
  WHERE game_id = p_game_id AND score >= v_best_score;

  -- Total players for this game
  SELECT COUNT(DISTINCT user_id)::INTEGER INTO v_total_players
  FROM game_scores
  WHERE game_id = p_game_id;

  -- Return result
  RETURN json_build_object(
    'is_new_best', v_is_new_best,
    'user_rank', v_user_rank,
    'total_players', v_total_players,
    'best_score', v_best_score
  );
END; $$;

-- BƯỚC 4: RPC Function - get_game_leaderboard_with_user
CREATE OR REPLACE FUNCTION get_game_leaderboard_with_user(
  p_game_id TEXT,
  p_user_id TEXT,
  p_limit INTEGER DEFAULT 100
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_top_players JSON;
  v_user_entry JSON;
  v_user_rank INTEGER;
  v_user_best_score INTEGER;
BEGIN
  -- Validate inputs
  IF p_game_id IS NULL OR p_game_id = '' THEN
    RAISE EXCEPTION 'game_id cannot be null or empty';
  END IF;
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 1000 THEN
    p_limit := 100; -- Default limit
  END IF;

  -- Get top players (ORDER BY score DESC)
  -- Rank calculation: cùng score → cùng rank (1, 1, 3, 3, 5...)
  SELECT json_agg(
    json_build_object(
      'user_id', user_id,
      'best_score', best_score,  -- ✅ FIX: Dùng best_score (đã đổi tên trong subquery)
      'rank', rank
    ) ORDER BY rank
  ) INTO v_top_players
  FROM (
    SELECT 
      user_id,
      score AS best_score,  -- Đổi tên từ score → best_score
      (
        SELECT COUNT(*)::INTEGER
        FROM game_scores g2
        WHERE g2.game_id = p_game_id AND g2.score >= g1.score
      ) AS rank
    FROM game_scores g1
    WHERE g1.game_id = p_game_id
    ORDER BY g1.score DESC, g1.updated_at ASC
    LIMIT p_limit
  ) ranked;

  -- Get user entry (if exists)
  IF p_user_id IS NOT NULL AND p_user_id != '' THEN
    SELECT 
      score INTO v_user_best_score
    FROM game_scores
    WHERE user_id = p_user_id AND game_id = p_game_id;

    IF v_user_best_score IS NOT NULL THEN
      -- Calculate user rank
      SELECT COUNT(*)::INTEGER INTO v_user_rank
      FROM game_scores
      WHERE game_id = p_game_id AND score >= v_user_best_score;

      v_user_entry := json_build_object(
        'rank', v_user_rank,
        'best_score', v_user_best_score
      );
    END IF;
  END IF;

  -- Return result
  RETURN json_build_object(
    'current_user', v_user_entry,
    'top_players', COALESCE(v_top_players, '[]'::JSON)
  );
END; $$;

-- BƯỚC 5: BẬT RLS cho Leaderboard
ALTER TABLE game_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read scores" ON game_scores;
CREATE POLICY "Public read scores" ON game_scores FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage scores" ON game_scores;
CREATE POLICY "Public manage scores" ON game_scores FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ✅ HOÀN TẤT SETUP
-- ============================================
-- Từ giờ mọi game mới tự động có:
-- ✅ Like/Unlike
-- ✅ Comment
-- ✅ Leaderboard (submit score + view rankings)
--
-- KHÔNG CẦN CHẠY SQL LẠI KHI TẠO GAME MỚI!
-- Chỉ cần chạy file này 1 lần khi setup project.
--
-- ============================================
-- VERIFY SETUP:
-- ============================================
-- Test Like/Comment:
-- SELECT toggle_like('test_user', 'pixel-space-shooter');
-- SELECT get_social_counts('pixel-space-shooter');
--
-- Test Leaderboard:
-- SELECT submit_game_score('test_user', 'pixel-space-shooter', 1000, 3);
-- SELECT get_game_leaderboard_with_user('pixel-space-shooter', 'test_user', 10);


