-- ============================================
-- LIKE & COMMENT - FIX LỖI FOREIGN KEY
-- ============================================
-- Lỗi: game_id không tồn tại trong bảng games
-- Giải pháp: Xóa foreign key constraint hoặc thêm game vào bảng games

-- BƯỚC 1: Xóa foreign key constraints (nếu có)
ALTER TABLE game_likes DROP CONSTRAINT IF EXISTS game_likes_game_id_fkey;
ALTER TABLE game_comments DROP CONSTRAINT IF EXISTS game_comments_game_id_fkey;

-- BƯỚC 2: Xóa function cũ
DROP FUNCTION IF EXISTS toggle_like(TEXT, TEXT);
DROP FUNCTION IF EXISTS add_comment(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS list_comments(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_social_counts(TEXT);

-- BƯỚC 3: Tạo lại bảng (KHÔNG CÓ FOREIGN KEY)
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

-- BƯỚC 4: Tạo functions (FIX LỖI SQL)
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

-- FIX: list_comments - bỏ ORDER BY trong json_agg
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

-- BƯỚC 5: BẬT RLS
ALTER TABLE game_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_comments ENABLE ROW LEVEL SECURITY;

-- BƯỚC 6: Tạo policies
DROP POLICY IF EXISTS "Public read likes" ON game_likes;
CREATE POLICY "Public read likes" ON game_likes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage likes" ON game_likes;
CREATE POLICY "Public manage likes" ON game_likes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read comments" ON game_comments;
CREATE POLICY "Public read comments" ON game_comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public insert comments" ON game_comments;
CREATE POLICY "Public insert comments" ON game_comments FOR INSERT WITH CHECK (true);

-- ✅ XONG! Giờ test lại

