-- ============================================
-- TELEGRAM REFERRAL SYSTEM SETUP
-- ============================================
-- File này setup hệ thống referral cho Telegram Mini App
-- Chạy 1 lần trong Supabase SQL Editor
--
-- CÁCH SỬ DỤNG:
-- 1. Mở Supabase Dashboard → SQL Editor
-- 2. Copy toàn bộ file này
-- 3. Paste và click "Run"
-- 4. XONG!
--
-- ============================================
-- PHẦN 1: REFERRAL TABLES
-- ===========================================

-- BƯỚC 1: Xóa tables cũ (nếu có)
DROP TABLE IF EXISTS telegram_referral_rewards CASCADE;
DROP TABLE IF EXISTS telegram_referrals CASCADE;
DROP TABLE IF EXISTS telegram_referral_codes CASCADE;

-- BƯỚC 2: Tạo bảng telegram_referral_codes
-- Lưu referral code của mỗi Telegram user
CREATE TABLE telegram_referral_codes (
  user_id TEXT PRIMARY KEY,           -- Format: tg_123456789
  referral_code TEXT UNIQUE NOT NULL, -- Ví dụ: ABC123
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BƯỚC 3: Tạo bảng telegram_referrals
-- Lưu relationship referrer → referred
CREATE TABLE telegram_referrals (
  id BIGSERIAL PRIMARY KEY,
  referrer_id TEXT NOT NULL,           -- User A: tg_123456789
  referred_id TEXT UNIQUE NOT NULL,     -- User B: tg_987654321 (UNIQUE để mỗi user chỉ được refer 1 lần)
  referral_code TEXT NOT NULL,          -- ABC123
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BƯỚC 4: Tạo bảng telegram_referral_rewards
-- Lưu reward đã trả cho cả referrer và referred
CREATE TABLE telegram_referral_rewards (
  id BIGSERIAL PRIMARY KEY,
  referrer_id TEXT NOT NULL,           -- User A
  referred_id TEXT NOT NULL,           -- User B
  reward_type TEXT NOT NULL,           -- 'referral_signup'
  reward_amount INTEGER NOT NULL,       -- 2000 (cho referred)
  commission_earned INTEGER NOT NULL,  -- 2000 (cho referrer)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BƯỚC 5: Tạo indexes để query nhanh
CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON telegram_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred ON telegram_referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON telegram_referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_rewards_referrer ON telegram_referral_rewards(referrer_id);
CREATE INDEX IF NOT EXISTS idx_rewards_referred ON telegram_referral_rewards(referred_id);

-- ============================================
-- PHẦN 2: RPC FUNCTIONS
-- ===========================================

-- BƯỚC 1: Xóa functions cũ (nếu có)
DROP FUNCTION IF EXISTS get_or_create_referral_code(TEXT);
DROP FUNCTION IF EXISTS process_referral(TEXT, TEXT);
DROP FUNCTION IF EXISTS get_referral_stats(TEXT);

-- BƯỚC 2: Function get_or_create_referral_code
-- Tạo hoặc lấy referral code của user
CREATE OR REPLACE FUNCTION get_or_create_referral_code(p_user_id TEXT)
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referral_code TEXT;
  v_code_exists BOOLEAN;
  v_chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Bỏ I, O, 0, 1 để tránh nhầm lẫn
  v_new_code TEXT;
BEGIN
  -- Validate: chỉ Telegram users
  IF p_user_id IS NULL OR p_user_id = '' OR NOT (p_user_id LIKE 'tg_%') THEN
    RAISE EXCEPTION 'Invalid user_id. Must be Telegram user (format: tg_123456789)';
  END IF;

  -- Check xem đã có referral code chưa
  SELECT referral_code INTO v_referral_code
  FROM telegram_referral_codes
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
    SELECT EXISTS(SELECT 1 FROM telegram_referral_codes WHERE referral_code = v_new_code) INTO v_code_exists;
    
    IF NOT v_code_exists THEN
      EXIT; -- Code unique, thoát loop
    END IF;
  END LOOP;

  -- Insert vào database
  INSERT INTO telegram_referral_codes (user_id, referral_code)
  VALUES (p_user_id, v_new_code)
  ON CONFLICT (user_id) DO UPDATE SET referral_code = EXCLUDED.referral_code;

  RETURN v_new_code;
END; $$;

-- BƯỚC 3: Function process_referral
-- Xử lý referral khi user click link và đăng ký
CREATE OR REPLACE FUNCTION process_referral(p_referred_id TEXT, p_referral_code TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referrer_id TEXT;
  v_already_referred BOOLEAN;
  v_reward_amount INTEGER := 2000;
  v_result JSON;
BEGIN
  -- Validate: chỉ Telegram users
  IF p_referred_id IS NULL OR p_referred_id = '' OR NOT (p_referred_id LIKE 'tg_%') THEN
    RAISE EXCEPTION 'Invalid referred_id. Must be Telegram user (format: tg_123456789)';
  END IF;

  IF p_referral_code IS NULL OR p_referral_code = '' THEN
    RAISE EXCEPTION 'Referral code cannot be null or empty';
  END IF;

  -- Tìm referrer từ referral code
  SELECT user_id INTO v_referrer_id
  FROM telegram_referral_codes
  WHERE referral_code = p_referral_code;

  IF v_referrer_id IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;

  -- Validate: không tự refer
  IF v_referrer_id = p_referred_id THEN
    RAISE EXCEPTION 'Cannot refer yourself';
  END IF;

  -- Check xem referred_id đã được refer chưa
  SELECT EXISTS(SELECT 1 FROM telegram_referrals WHERE referred_id = p_referred_id) INTO v_already_referred;

  IF v_already_referred THEN
    RAISE EXCEPTION 'User already referred';
  END IF;

  -- Insert vào telegram_referrals
  INSERT INTO telegram_referrals (referrer_id, referred_id, referral_code)
  VALUES (v_referrer_id, p_referred_id, p_referral_code);

  -- Insert vào telegram_referral_rewards (để track reward đã trả)
  INSERT INTO telegram_referral_rewards (referrer_id, referred_id, reward_type, reward_amount, commission_earned)
  VALUES (v_referrer_id, p_referred_id, 'referral_signup', v_reward_amount, v_reward_amount);

  -- Return result
  v_result := json_build_object(
    'success', TRUE,
    'referrer_id', v_referrer_id,
    'referred_id', p_referred_id,
    'reward', v_reward_amount
  );

  RETURN v_result;
END; $$;

-- BƯỚC 4: Function get_referral_stats
-- Lấy stats của referrer (số người đã refer, tổng reward)
CREATE OR REPLACE FUNCTION get_referral_stats(p_user_id TEXT)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_referral_code TEXT;
  v_friends_referred INTEGER := 0;
  v_total_rewards INTEGER := 0;
  v_result JSON;
BEGIN
  -- Validate: chỉ Telegram users
  IF p_user_id IS NULL OR p_user_id = '' OR NOT (p_user_id LIKE 'tg_%') THEN
    RAISE EXCEPTION 'Invalid user_id. Must be Telegram user (format: tg_123456789)';
  END IF;

  -- Lấy referral code
  SELECT referral_code INTO v_referral_code
  FROM telegram_referral_codes
  WHERE user_id = p_user_id;

  -- Nếu chưa có code → tạo mới
  IF v_referral_code IS NULL THEN
    v_referral_code := get_or_create_referral_code(p_user_id);
  END IF;

  -- Đếm số người đã refer
  SELECT COUNT(*)::INTEGER INTO v_friends_referred
  FROM telegram_referrals
  WHERE referrer_id = p_user_id;

  -- Tính tổng reward đã nhận
  SELECT COALESCE(SUM(commission_earned), 0)::INTEGER INTO v_total_rewards
  FROM telegram_referral_rewards
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
-- PHẦN 3: ROW LEVEL SECURITY (RLS)
-- ===========================================

-- BƯỚC 1: Enable RLS
ALTER TABLE telegram_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_referral_rewards ENABLE ROW LEVEL SECURITY;

-- BƯỚC 2: Policies cho telegram_referral_codes
DROP POLICY IF EXISTS "Public read referral codes" ON telegram_referral_codes;
CREATE POLICY "Public read referral codes" ON telegram_referral_codes FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage referral codes" ON telegram_referral_codes;
CREATE POLICY "Public manage referral codes" ON telegram_referral_codes FOR ALL USING (true) WITH CHECK (true);

-- BƯỚC 3: Policies cho telegram_referrals
DROP POLICY IF EXISTS "Public read referrals" ON telegram_referrals;
CREATE POLICY "Public read referrals" ON telegram_referrals FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage referrals" ON telegram_referrals;
CREATE POLICY "Public manage referrals" ON telegram_referrals FOR ALL USING (true) WITH CHECK (true);

-- BƯỚC 4: Policies cho telegram_referral_rewards
DROP POLICY IF EXISTS "Public read referral rewards" ON telegram_referral_rewards;
CREATE POLICY "Public read referral rewards" ON telegram_referral_rewards FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public manage referral rewards" ON telegram_referral_rewards;
CREATE POLICY "Public manage referral rewards" ON telegram_referral_rewards FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- ✅ HOÀN TẤT SETUP
-- ============================================
-- Từ giờ hệ thống referral đã sẵn sàng:
-- ✅ Tạo/lấy referral code
-- ✅ Process referral khi user đăng ký
-- ✅ Lấy stats (số người refer, tổng reward)
--
-- ============================================
-- VERIFY SETUP:
-- ============================================
-- Test tạo referral code:
-- SELECT get_or_create_referral_code('tg_123456789');
--
-- Test process referral:
-- SELECT process_referral('tg_987654321', 'ABC123');
--
-- Test get stats:
-- SELECT get_referral_stats('tg_123456789');

