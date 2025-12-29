-- ============================================
-- RESET PLAYTIME REWARDS - CLEAN SLATE
-- ============================================
-- Xóa toàn bộ lịch sử plays để đếm lại từ đầu
-- ⚠️ CẢNH BÁO: File này sẽ XÓA TẤT CẢ data playtime rewards!

-- BƯỚC 1: Xóa toàn bộ records trong user_playtime_rewards
TRUNCATE TABLE user_playtime_rewards;

-- BƯỚC 2: Reset sequence (nếu cần)
ALTER SEQUENCE user_playtime_rewards_id_seq RESTART WITH 1;

-- BƯỚC 3: Verify (check xem đã xóa hết chưa)
-- SELECT COUNT(*) FROM user_playtime_rewards; -- Should return 0

-- ✅ XONG! Từ giờ tất cả rewards sẽ được đếm lại từ đầu

