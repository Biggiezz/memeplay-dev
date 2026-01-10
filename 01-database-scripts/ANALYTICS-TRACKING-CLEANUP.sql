-- ============================================
-- ANALYTICS TRACKING CLEANUP - MemePlay
-- ============================================
-- Dùng file này để xóa hoàn toàn analytics tracking setup
-- Chạy file này TRƯỚC khi chạy lại ANALYTICS-TRACKING-SETUP.sql
-- ============================================

-- Drop tables FIRST (CASCADE sẽ tự động drop policies, indexes, constraints)
-- Đây là cách an toàn nhất vì CASCADE sẽ xử lý tất cả dependencies
DROP TABLE IF EXISTS visitor_sessions CASCADE;
DROP TABLE IF EXISTS game_events CASCADE;

-- Drop functions (sau khi tables đã drop)
DROP FUNCTION IF EXISTS track_visitor_session(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS end_visitor_session(TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS track_game_event(TEXT, TEXT, TEXT, TEXT, JSONB);

-- ============================================
-- ✅ CLEANUP COMPLETE
-- ============================================
-- Bây giờ có thể chạy lại ANALYTICS-TRACKING-SETUP.sql
-- ============================================

