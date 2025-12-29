-- ============================================
-- BASE APP DATABASE SETUP - PHASE 4 & 5
-- ============================================
-- File này setup toàn bộ database cho Base App Mini App
-- Bao gồm: User Stats, Daily Check-in, Playtime Rewards, Referral System
-- Chạy 1 lần trong Supabase SQL Editor
--
-- CÁCH SỬ DỤNG:
-- 1. Mở Supabase Dashboard → SQL Editor
-- 2. Copy toàn bộ file này
-- 3. Paste và click "Run"
-- 4. XONG!
--
-- ============================================
-- PHẦN 1: USER STATS & DAILY CHECK-IN
-- ============================================

-- BƯỚC 1: Tạo bảng base_user_stats
-- Lưu stats của Base App user (points, streak)
CREATE TABLE IF NOT EXISTS base_user_stats (
  user_id TEXT PRIMARY KEY,           -- Format: base_<fid> hoặc base_<wallet>
  total_points INTEGER DEFAULT 0,     -- Tổng PLAY points
  current_streak INTEGER DEFAULT 0,    -- Streak hiện tại
  longest_streak INTEGER DEFAULT 0,   -- Streak dài nhất từ trước
  total_checkins INTEGER DEFAULT 0,   -- Tổng số lần check-in
  last_checkin_date DATE,             -- Ngày check-in cuối cùng
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- BƯỚC 2: Tạo bảng base_daily_checkin
-- Lưu lịch sử daily check-in
CREATE TABLE IF NOT EXISTS base_daily_checkin (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  checkin_date DATE NOT NULL,
  points_awarded INTEGER NOT NULL,    -- Points nhận được (100, 200, 300...)
  streak_count INTEGER NOT NULL,      -- Streak tại thời điểm check-in
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, checkin_date)       -- Mỗi user chỉ check-in 1 lần/ngày
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_base_user_stats_user_id ON base_user_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_base_daily_checkin_user_date ON base_daily_checkin(user_id, checkin_date DESC);

-- ============================================
-- PHẦN 2: PLAYTIME REWARDS
-- ============================================

-- BƯỚC 1: Tạo bảng base_playtime_rewards
-- Lưu playtime rewards riêng cho Base App
CREATE TABLE IF NOT EXISTS base_playtime_rewards (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  reward_amount INTEGER NOT NULL,
  reward_type TEXT NOT NULL DEFAULT 'playtime', -- 'playtime', 'achievement', 'daily_checkin', 'referral'
  game_id TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_base_playtime_rewards_user_id ON base_playtime_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_base_playtime_rewards_created_at ON base_playtime_rewards(created_at DESC);

-- ============================================
-- PHẦN 3: REFERRAL SYSTEM
-- ============================================

-- BƯỚC 1: Xóa tables cũ (nếu có)
DROP TABLE IF EXISTS base_referral_rewards CASCADE;
DROP TABLE IF EXISTS base_referrals CASCADE;
DROP TABLE IF EXISTS base_referral_codes CASCADE;

-- BƯỚC 2: Tạo bảng base_referral_codes
-- Lưu referral code của mỗi Base App user
CREATE TABLE base_referral_codes (
  user_id TEXT PRIMARY KEY,           -- Format: base_<fid>
  referral_code TEXT UNIQUE NOT NULL, -- Ví dụ: ABC123
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BƯỚC 3: Tạo bảng base_referrals
-- Lưu relationship referrer → referred
CREATE TABLE base_referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id TEXT NOT NULL,          -- User A: base_12345
  referred_id TEXT UNIQUE NOT NULL,   -- User B: base_67890 (UNIQUE để mỗi user chỉ được refer 1 lần)
  referral_code TEXT NOT NULL,        -- ABC123
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BƯỚC 4: Tạo bảng base_referral_rewards
-- Lưu reward đã trả cho cả referrer và referred (2000 PLAY mỗi người)
CREATE TABLE base_referral_rewards (
  id BIGSERIAL PRIMARY KEY,
  referrer_id TEXT NOT NULL,          -- User A
  referred_id TEXT NOT NULL,          -- User B
  reward_type TEXT NOT NULL,          -- 'referral_signup'
  reward_amount INTEGER NOT NULL,     -- 2000 (cho referred)
  commission_earned INTEGER NOT NULL, -- 2000 (cho referrer)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes cho referral
CREATE INDEX IF NOT EXISTS idx_base_referrals_referrer ON base_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_base_referrals_referred ON base_referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_base_referrals_code ON base_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_base_referral_rewards_referrer ON base_referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_base_referral_rewards_referred ON base_referral_rewards(referred_id);

-- ============================================
-- PHẦN 4: USER ACHIEVEMENTS (cho NFT tracking)
-- ============================================

-- BƯỚC 1: Tạo bảng base_user_achievements
-- Track achievements để mint NFT
CREATE TABLE IF NOT EXISTS base_user_achievements (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  achievement_type TEXT NOT NULL,     -- 'first_referral', 'points_1k', 'points_10k'
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  minted BOOLEAN DEFAULT FALSE,      -- Đã mint NFT chưa
  minted_at TIMESTAMPTZ DEFAULT NULL,
  mint_tx_hash TEXT DEFAULT NULL,     -- Transaction hash khi mint
  UNIQUE(user_id, achievement_type)   -- Mỗi achievement chỉ đạt 1 lần
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_base_user_achievements_user_id ON base_user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_base_user_achievements_type ON base_user_achievements(achievement_type);
CREATE INDEX IF NOT EXISTS idx_base_user_achievements_minted ON base_user_achievements(minted);

-- ============================================
-- PHẦN 5: WALLET SIGNATURES
-- ============================================

-- BƯỚC 1: Tạo bảng base_wallet_signatures
-- Lưu wallet signature khi user đăng nhập lần đầu
CREATE TABLE IF NOT EXISTS base_wallet_signatures (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,              -- Format: base_<fid>
  wallet_address TEXT NOT NULL,        -- Wallet address đã ký
  signature TEXT NOT NULL,             -- Signature message
  message TEXT NOT NULL,               -- Message đã ký
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, wallet_address)      -- Mỗi user chỉ ký 1 wallet
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_base_wallet_signatures_user_id ON base_wallet_signatures(user_id);
CREATE INDEX IF NOT EXISTS idx_base_wallet_signatures_wallet ON base_wallet_signatures(wallet_address);

-- ============================================
-- PHẦN 6: RPC FUNCTIONS - DAILY CHECK-IN
-- ============================================

-- BƯỚC 1: Xóa function cũ (nếu có)
DROP FUNCTION IF EXISTS base_daily_checkin(TEXT);

-- BƯỚC 2: Function base_daily_checkin
-- Xử lý daily check-in cho Base App user
CREATE OR REPLACE FUNCTION base_daily_checkin(p_user_id TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_user_id TEXT;
  v_last_checkin DATE;
  v_current_streak INTEGER := 0;
  v_new_streak INTEGER := 0;
  v_points_awarded INTEGER := 0;
  v_total_checkins INTEGER := 0;
  v_today DATE := CURRENT_DATE;
  v_yesterday DATE := CURRENT_DATE - INTERVAL '1 day';
BEGIN
  -- Validate: chỉ Base App users
  IF p_user_id IS NULL OR p_user_id = '' OR NOT (p_user_id LIKE 'base_%') THEN
    RAISE EXCEPTION 'Invalid user_id. Must be Base App user (format: base_<fid>)';
  END IF;

  -- Get or create user stats
  SELECT user_id, last_checkin_date, current_streak, total_checkins
  INTO v_user_id, v_last_checkin, v_current_streak, v_total_checkins
  FROM base_user_stats
  WHERE user_id = p_user_id;

  -- If user doesn't exist, create
  IF v_user_id IS NULL THEN
    INSERT INTO base_user_stats (user_id, current_streak, total_checkins, last_checkin_date)
    VALUES (p_user_id, 0, 0, NULL)
    RETURNING user_id, current_streak, total_checkins, last_checkin_date
    INTO v_user_id, v_current_streak, v_total_checkins, v_last_checkin;
  END IF;

  -- Check if already checked in today
  IF v_last_checkin = v_today THEN
    RETURN json_build_object(
      'success', FALSE,
      'message', 'Already checked in today',
      'streak', v_current_streak,
      'awarded', 0
    );
  END IF;

  -- Calculate new streak
  IF v_last_checkin = v_yesterday THEN
    -- Consecutive day
    v_new_streak := v_current_streak + 1;
  ELSIF v_last_checkin IS NULL OR v_last_checkin < v_yesterday THEN
    -- First check-in or streak broken
    v_new_streak := 1;
  ELSE
    -- Same day (shouldn't happen, but handle it)
    v_new_streak := v_current_streak;
  END IF;

  -- Calculate points (100, 200, 300, ... based on streak)
  v_points_awarded := LEAST(v_new_streak * 100, 1000); -- Cap at 1000 points/day

  -- Update user stats
  UPDATE base_user_stats
  SET 
    current_streak = v_new_streak,
    longest_streak = GREATEST(longest_streak, v_new_streak),
    total_checkins = total_checkins + 1,
    last_checkin_date = v_today,
    total_points = total_points + v_points_awarded,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Insert check-in record
  INSERT INTO base_daily_checkin (user_id, checkin_date, points_awarded, streak_count)
  VALUES (p_user_id, v_today, v_points_awarded, v_new_streak)
  ON CONFLICT (user_id, checkin_date) DO NOTHING;

  -- Add to playtime rewards
  INSERT INTO base_playtime_rewards (user_id, reward_amount, reward_type)
  VALUES (p_user_id, v_points_awarded, 'daily_checkin');

  -- Return result
  RETURN json_build_object(
    'success', TRUE,
    'streak', v_new_streak,
    'awarded', v_points_awarded,
    'total_checkins', v_total_checkins + 1,
    'total_points', (SELECT total_points FROM base_user_stats WHERE user_id = p_user_id)
  );
END; $$;

-- ============================================
-- PHẦN 7: RPC FUNCTIONS - PLAYTIME REWARDS
-- ============================================

-- BƯỚC 1: Xóa functions cũ (nếu có)
DROP FUNCTION IF EXISTS base_add_playtime_reward(TEXT, INTEGER, TEXT, TEXT);
DROP FUNCTION IF EXISTS base_get_user_total_playtime_rewards(TEXT);

-- BƯỚC 2: Function base_add_playtime_reward
CREATE OR REPLACE FUNCTION base_add_playtime_reward(
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
  IF p_user_id IS NULL OR p_user_id = '' OR NOT (p_user_id LIKE 'base_%') THEN
    RAISE EXCEPTION 'Invalid user_id. Must be Base App user (format: base_<fid>)';
  END IF;
  
  IF p_reward_amount IS NULL OR p_reward_amount <= 0 THEN
    RAISE EXCEPTION 'reward_amount must be positive integer';
  END IF;

  -- Insert reward transaction
  INSERT INTO base_playtime_rewards (user_id, reward_amount, reward_type, game_id)
  VALUES (p_user_id, p_reward_amount, COALESCE(p_reward_type, 'playtime'), p_game_id);

  -- Update user stats total_points
  UPDATE base_user_stats
  SET total_points = total_points + p_reward_amount, updated_at = NOW()
  WHERE user_id = p_user_id;

  -- Return success
  v_result := json_build_object(
    'success', TRUE,
    'user_id', p_user_id,
    'reward_amount', p_reward_amount
  );

  RETURN v_result;
END; $$;

-- BƯỚC 3: Function base_get_user_total_playtime_rewards
CREATE OR REPLACE FUNCTION base_get_user_total_playtime_rewards(p_user_id TEXT)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total INTEGER := 0;
BEGIN
  -- Validate input
  IF p_user_id IS NULL OR p_user_id = '' OR NOT (p_user_id LIKE 'base_%') THEN
    RETURN 0;
  END IF;

  -- Calculate total rewards
  SELECT COALESCE(SUM(reward_amount), 0)::INTEGER INTO v_total
  FROM base_playtime_rewards
  WHERE user_id = p_user_id;

  RETURN v_total;
END; $$;

-- ============================================
-- PHẦN 8: RPC FUNCTIONS - REFERRAL SYSTEM
-- ============================================

-- BƯỚC 1: Xóa functions cũ (nếu có)
DROP FUNCTION IF EXISTS base_get_or_create_referral_code(TEXT);
DROP FUNCTION IF EXISTS base_process_referral(TEXT, TEXT);
DROP FUNCTION IF EXISTS base_get_referral_stats(TEXT);

-- BƯỚC 2: Function base_get_or_create_referral_code
-- Tạo hoặc lấy referral code của user
CREATE OR REPLACE FUNCTION base_get_or_create_referral_code(p_user_id TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referral_code TEXT;
  v_code_exists BOOLEAN;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Bỏ I, O, 0, 1 để tránh nhầm lẫn
  v_new_code TEXT;
BEGIN
  -- Validate: chỉ Base App users
  IF p_user_id IS NULL OR p_user_id = '' OR NOT (p_user_id LIKE 'base_%') THEN
    RAISE EXCEPTION 'Invalid user_id. Must be Base App user (format: base_<fid>)';
  END IF;

  -- Check xem đã có referral code chưa
  SELECT referral_code INTO v_referral_code
  FROM base_referral_codes
  WHERE user_id = p_user_id;

  -- Nếu đã có → return
  IF v_referral_code IS NOT NULL THEN
    RETURN v_referral_code;
  END IF;

  -- Nếu chưa có → tạo code mới (6 ký tự, check unique)
  LOOP
    v_new_code := '';
    FOR i IN 1..6 LOOP
      v_new_code := v_new_code || substr(v_chars, floor(random() * length(v_chars) + 1)::INTEGER, 1);
    END LOOP;

    -- Check unique
    SELECT EXISTS(SELECT 1 FROM base_referral_codes WHERE referral_code = v_new_code) INTO v_code_exists;
    
    IF NOT v_code_exists THEN
      EXIT; -- Code unique, thoát loop
    END IF;
  END LOOP;

  -- Insert vào database
  INSERT INTO base_referral_codes (user_id, referral_code)
  VALUES (p_user_id, v_new_code)
  ON CONFLICT (user_id) DO UPDATE SET referral_code = EXCLUDED.referral_code;

  RETURN v_new_code;
END; $$;

-- BƯỚC 3: Function base_process_referral
-- Xử lý referral khi user click link và đăng ký (2000 PLAY cho cả 2)
CREATE OR REPLACE FUNCTION base_process_referral(p_referred_id TEXT, p_referral_code TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referrer_id TEXT;
  v_already_referred BOOLEAN;
  v_reward_amount INTEGER := 2000; -- 2000 PLAY cho cả referrer và referred
  v_result JSON;
BEGIN
  -- Validate: chỉ Base App users
  IF p_referred_id IS NULL OR p_referred_id = '' OR NOT (p_referred_id LIKE 'base_%') THEN
    RAISE EXCEPTION 'Invalid referred_id. Must be Base App user (format: base_<fid>)';
  END IF;

  IF p_referral_code IS NULL OR p_referral_code = '' THEN
    RAISE EXCEPTION 'Referral code cannot be null or empty';
  END IF;

  -- Tìm referrer từ referral code
  SELECT user_id INTO v_referrer_id
  FROM base_referral_codes
  WHERE referral_code = p_referral_code;

  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;

  -- Validate: không tự refer
  IF v_referrer_id = p_referred_id THEN
    RAISE EXCEPTION 'Cannot refer yourself';
  END IF;

  -- Check xem referred_id đã được refer chưa
  SELECT EXISTS(SELECT 1 FROM base_referrals WHERE referred_id = p_referred_id) INTO v_already_referred;

  IF v_already_referred THEN
    RAISE EXCEPTION 'User already referred';
  END IF;

  -- Insert vào base_referrals
  INSERT INTO base_referrals (referrer_id, referred_id, referral_code)
  VALUES (v_referrer_id, p_referred_id, p_referral_code);

  -- Insert vào base_referral_rewards (để track reward đã trả)
  INSERT INTO base_referral_rewards (referrer_id, referred_id, reward_type, reward_amount, commission_earned)
  VALUES (v_referrer_id, p_referred_id, 'referral_signup', v_reward_amount, v_reward_amount);

  -- Add rewards to playtime_rewards for both users
  INSERT INTO base_playtime_rewards (user_id, reward_amount, reward_type)
  VALUES 
    (v_referrer_id, v_reward_amount, 'referral'),
    (p_referred_id, v_reward_amount, 'referral');

  -- Update user stats for both users
  UPDATE base_user_stats
  SET total_points = total_points + v_reward_amount, updated_at = NOW()
  WHERE user_id = v_referrer_id;

  UPDATE base_user_stats
  SET total_points = total_points + v_reward_amount, updated_at = NOW()
  WHERE user_id = p_referred_id;

  -- Track achievement for referrer (first referral)
  INSERT INTO base_user_achievements (user_id, achievement_type, achieved_at)
  VALUES (v_referrer_id, 'first_referral', NOW())
  ON CONFLICT (user_id, achievement_type) DO NOTHING;

  -- Return result
  v_result := json_build_object(
    'success', TRUE,
    'referrer_id', v_referrer_id,
    'referred_id', p_referred_id,
    'referrer_reward', v_reward_amount,
    'referred_reward', v_reward_amount
  );

  RETURN v_result;
END; $$;

-- BƯỚC 4: Function base_get_referral_stats
-- Lấy stats của referrer (số người đã refer, tổng reward)
CREATE OR REPLACE FUNCTION base_get_referral_stats(p_user_id TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referral_code TEXT;
  v_friends_referred INTEGER := 0;
  v_total_rewards INTEGER := 0;
  v_result JSON;
BEGIN
  -- Validate: chỉ Base App users
  IF p_user_id IS NULL OR p_user_id = '' OR NOT (p_user_id LIKE 'base_%') THEN
    RAISE EXCEPTION 'Invalid user_id. Must be Base App user (format: base_<fid>)';
  END IF;

  -- Lấy referral code
  SELECT referral_code INTO v_referral_code
  FROM base_referral_codes
  WHERE user_id = p_user_id;

  -- Nếu chưa có code → tạo mới
  IF v_referral_code IS NULL THEN
    v_referral_code := base_get_or_create_referral_code(p_user_id);
  END IF;

  -- Đếm số người đã refer
  SELECT COUNT(*)::INTEGER INTO v_friends_referred
  FROM base_referrals
  WHERE referrer_id = p_user_id;

  -- Tính tổng reward đã nhận
  SELECT COALESCE(SUM(commission_earned), 0)::INTEGER INTO v_total_rewards
  FROM base_referral_rewards
  WHERE referrer_id = p_user_id;

  -- Return result
  v_result := json_build_object(
    'referral_code', v_referral_code,
    'friends_referred', v_friends_referred,
    'total_rewards', v_total_rewards
  );

  RETURN v_result;
END; $$;

-- ============================================
-- PHẦN 9: RPC FUNCTIONS - USER ACHIEVEMENTS
-- ============================================

-- BƯỚC 1: Function base_check_and_record_achievements
-- Check và record achievements khi user đạt milestones (1k, 10k points)
CREATE OR REPLACE FUNCTION base_check_and_record_achievements(p_user_id TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_total_points INTEGER := 0;
  v_achievements JSON := '[]'::JSON;
  v_achievement_types TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Validate
  IF p_user_id IS NULL OR p_user_id = '' OR NOT (p_user_id LIKE 'base_%') THEN
    RAISE EXCEPTION 'Invalid user_id. Must be Base App user (format: base_<fid>)';
  END IF;

  -- Get total points
  SELECT COALESCE(total_points, 0) INTO v_total_points
  FROM base_user_stats
  WHERE user_id = p_user_id;

  -- Check 1k points achievement
  IF v_total_points >= 1000 THEN
    INSERT INTO base_user_achievements (user_id, achievement_type, achieved_at)
    VALUES (p_user_id, 'points_1k', NOW())
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
    
    IF NOT EXISTS(SELECT 1 FROM base_user_achievements WHERE user_id = p_user_id AND achievement_type = 'points_1k') THEN
      v_achievement_types := array_append(v_achievement_types, 'points_1k');
    END IF;
  END IF;

  -- Check 10k points achievement
  IF v_total_points >= 10000 THEN
    INSERT INTO base_user_achievements (user_id, achievement_type, achieved_at)
    VALUES (p_user_id, 'points_10k', NOW())
    ON CONFLICT (user_id, achievement_type) DO NOTHING;
    
    IF NOT EXISTS(SELECT 1 FROM base_user_achievements WHERE user_id = p_user_id AND achievement_type = 'points_10k') THEN
      v_achievement_types := array_append(v_achievement_types, 'points_10k');
    END IF;
  END IF;

  -- Return achievements
  SELECT json_agg(achievement_type) INTO v_achievements
  FROM base_user_achievements
  WHERE user_id = p_user_id AND minted = FALSE;

  RETURN json_build_object(
    'total_points', v_total_points,
    'new_achievements', v_achievement_types,
    'unminted_achievements', COALESCE(v_achievements, '[]'::JSON)
  );
END; $$;

-- BƯỚC 2: Function base_get_unminted_achievements
-- Lấy danh sách achievements chưa mint
CREATE OR REPLACE FUNCTION base_get_unminted_achievements(p_user_id TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Validate
  IF p_user_id IS NULL OR p_user_id = '' OR NOT (p_user_id LIKE 'base_%') THEN
    RAISE EXCEPTION 'Invalid user_id. Must be Base App user (format: base_<fid>)';
  END IF;

  -- Get unminted achievements
  SELECT json_agg(
    json_build_object(
      'achievement_type', achievement_type,
      'achieved_at', achieved_at
    )
  ) INTO v_result
  FROM base_user_achievements
  WHERE user_id = p_user_id AND minted = FALSE;

  RETURN COALESCE(v_result, '[]'::JSON);
END; $$;

-- ============================================
-- PHẦN 10: ROW LEVEL SECURITY (RLS)
-- ============================================

-- BƯỚC 1: Enable RLS
ALTER TABLE base_user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_daily_checkin ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_playtime_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_referral_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE base_wallet_signatures ENABLE ROW LEVEL SECURITY;

-- BƯỚC 2: Policies cho base_user_stats
DROP POLICY IF EXISTS "Public read base user stats" ON base_user_stats;
CREATE POLICY "Public read base user stats" ON base_user_stats FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage base user stats" ON base_user_stats;
CREATE POLICY "Public manage base user stats" ON base_user_stats FOR ALL USING (true) WITH CHECK (true);

-- BƯỚC 3: Policies cho base_daily_checkin
DROP POLICY IF EXISTS "Public read base daily checkin" ON base_daily_checkin;
CREATE POLICY "Public read base daily checkin" ON base_daily_checkin FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage base daily checkin" ON base_daily_checkin;
CREATE POLICY "Public manage base daily checkin" ON base_daily_checkin FOR ALL USING (true) WITH CHECK (true);

-- BƯỚC 4: Policies cho base_playtime_rewards
DROP POLICY IF EXISTS "Public read base playtime rewards" ON base_playtime_rewards;
CREATE POLICY "Public read base playtime rewards" ON base_playtime_rewards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage base playtime rewards" ON base_playtime_rewards;
CREATE POLICY "Public manage base playtime rewards" ON base_playtime_rewards FOR ALL USING (true) WITH CHECK (true);

-- BƯỚC 5: Policies cho base_referral_codes
DROP POLICY IF EXISTS "Public read base referral codes" ON base_referral_codes;
CREATE POLICY "Public read base referral codes" ON base_referral_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage base referral codes" ON base_referral_codes;
CREATE POLICY "Public manage base referral codes" ON base_referral_codes FOR ALL USING (true) WITH CHECK (true);

-- BƯỚC 6: Policies cho base_referrals
DROP POLICY IF EXISTS "Public read base referrals" ON base_referrals;
CREATE POLICY "Public read base referrals" ON base_referrals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage base referrals" ON base_referrals;
CREATE POLICY "Public manage base referrals" ON base_referrals FOR ALL USING (true) WITH CHECK (true);

-- BƯỚC 7: Policies cho base_referral_rewards
DROP POLICY IF EXISTS "Public read base referral rewards" ON base_referral_rewards;
CREATE POLICY "Public read base referral rewards" ON base_referral_rewards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage base referral rewards" ON base_referral_rewards;
CREATE POLICY "Public manage base referral rewards" ON base_referral_rewards FOR ALL USING (true) WITH CHECK (true);

-- BƯỚC 8: Policies cho base_user_achievements
DROP POLICY IF EXISTS "Public read base user achievements" ON base_user_achievements;
CREATE POLICY "Public read base user achievements" ON base_user_achievements FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage base user achievements" ON base_user_achievements;
CREATE POLICY "Public manage base user achievements" ON base_user_achievements FOR ALL USING (true) WITH CHECK (true);

-- BƯỚC 9: Policies cho base_wallet_signatures
DROP POLICY IF EXISTS "Public read base wallet signatures" ON base_wallet_signatures;
CREATE POLICY "Public read base wallet signatures" ON base_wallet_signatures FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage base wallet signatures" ON base_wallet_signatures;
CREATE POLICY "Public manage base wallet signatures" ON base_wallet_signatures FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ✅ HOÀN TẤT SETUP
-- ============================================
-- Từ giờ hệ thống Base App đã sẵn sàng:
-- ✅ User stats (points, streak)
-- ✅ Daily check-in
-- ✅ Playtime rewards
-- ✅ Referral system (2000 PLAY cho cả 2)
-- ✅ User achievements (cho NFT)
-- ✅ Wallet signatures
--
-- ============================================
-- VERIFY SETUP:
-- ============================================
-- Test daily check-in:
-- SELECT base_daily_checkin('base_12345');
--
-- Test referral:
-- SELECT base_get_or_create_referral_code('base_12345');
-- SELECT base_process_referral('base_67890', 'ABC123');
-- SELECT base_get_referral_stats('base_12345');
--
-- Test achievements:
-- SELECT base_check_and_record_achievements('base_12345');
-- SELECT base_get_unminted_achievements('base_12345');

