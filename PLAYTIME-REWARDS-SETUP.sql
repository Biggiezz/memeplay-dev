-- ============================================
-- PLAYTIME REWARDS DATABASE SETUP
-- ============================================
-- Lưu playtime rewards vào database để sync giữa devices
-- Thay thế localStorage để đảm bảo data consistency

-- BƯỚC 1: Tạo bảng user_playtime_rewards
-- Lưu từng reward transaction (để track history)
DROP TABLE IF EXISTS user_playtime_rewards CASCADE;
CREATE TABLE user_playtime_rewards (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  reward_amount INTEGER NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'playtime', -- 'playtime', 'achievement', 'daily_checkin'
  game_id TEXT DEFAULT NULL, -- Optional: game ID nếu reward từ gameplay
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index để query nhanh
CREATE INDEX IF NOT EXISTS idx_user_playtime_rewards_user_id ON user_playtime_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_user_playtime_rewards_created_at ON user_playtime_rewards(created_at DESC);

-- BƯỚC 2: RPC Function - add_playtime_reward
-- Thêm reward vào database
CREATE OR REPLACE FUNCTION add_playtime_reward(
  p_user_id TEXT,
  p_reward_amount INTEGER,
  p_reward_type TEXT DEFAULT 'playtime',
  p_game_id TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_user_id = '' THEN
    RAISE EXCEPTION 'user_id cannot be null or empty';
  END IF;
  
  IF p_reward_amount IS NULL OR p_reward_amount <= 0 THEN
    RAISE EXCEPTION 'reward_amount must be positive integer';
  END IF;

  -- Insert reward transaction
  INSERT INTO user_playtime_rewards (user_id, reward_amount, reward_type, game_id)
  VALUES (p_user_id, p_reward_amount, COALESCE(p_reward_type, 'playtime'), p_game_id);

  -- Return success
  v_result := json_build_object(
    'success', TRUE,
    'user_id', p_user_id,
    'reward_amount', p_reward_amount,
    'total_rewards', NULL -- Will be calculated separately
  );

  RETURN v_result;
END; $$;

-- BƯỚC 3: RPC Function - get_user_total_playtime_rewards
-- Tính tổng playtime rewards của user
CREATE OR REPLACE FUNCTION get_user_total_playtime_rewards(p_user_id TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total INTEGER := 0;
BEGIN
  -- Validate input
  IF p_user_id IS NULL OR p_user_id = '' THEN
    RETURN 0;
  END IF;

  -- Calculate total rewards
  SELECT COALESCE(SUM(reward_amount), 0)::INTEGER INTO v_total
  FROM user_playtime_rewards
  WHERE user_id = p_user_id;

  RETURN v_total;
END; $$;

-- BƯỚC 4: RPC Function - sync_user_playtime_rewards
-- Sync rewards từ localStorage vào database (migration helper)
-- Chỉ dùng 1 lần để migrate data cũ
CREATE OR REPLACE FUNCTION sync_user_playtime_rewards(
  p_user_id TEXT,
  p_total_from_localstorage INTEGER
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_db_total INTEGER;
  v_diff INTEGER;
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_user_id IS NULL OR p_user_id = '' THEN
    RAISE EXCEPTION 'user_id cannot be null or empty';
  END IF;
  
  IF p_total_from_localstorage IS NULL OR p_total_from_localstorage < 0 THEN
    RAISE EXCEPTION 'total_from_localstorage must be non-negative integer';
  END IF;

  -- Get current total from database
  SELECT COALESCE(SUM(reward_amount), 0)::INTEGER INTO v_db_total
  FROM user_playtime_rewards
  WHERE user_id = p_user_id;

  -- Calculate difference
  v_diff := p_total_from_localstorage - v_db_total;

  -- If localStorage has more, add the difference
  IF v_diff > 0 THEN
    INSERT INTO user_playtime_rewards (user_id, reward_amount, reward_type)
    VALUES (p_user_id, v_diff, 'migration');
  END IF;

  -- Return result
  v_result := json_build_object(
    'success', TRUE,
    'user_id', p_user_id,
    'db_total_before', v_db_total,
    'localstorage_total', p_total_from_localstorage,
    'diff_added', GREATEST(0, v_diff),
    'db_total_after', p_total_from_localstorage
  );

  RETURN v_result;
END; $$;

