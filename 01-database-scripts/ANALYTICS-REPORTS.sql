-- ============================================
-- ANALYTICS REPORTS - MemePlay
-- ============================================
-- Các SQL queries để xem các chỉ số tracking
-- ============================================

-- ============================================
-- 1. UNIQUE VISITORS / DAY
-- ============================================
-- Có bao nhiêu unique visitors mỗi ngày?
SELECT 
  DATE(session_start) as date,
  COUNT(DISTINCT visitor_id) as unique_visitors,
  COUNT(DISTINCT session_id) as total_sessions
FROM visitor_sessions
WHERE session_start >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(session_start)
ORDER BY date DESC;

-- Unique visitors hôm nay
SELECT COUNT(DISTINCT visitor_id) as unique_visitors_today
FROM visitor_sessions
WHERE DATE(session_start) = CURRENT_DATE;

-- Unique visitors trong 7 ngày qua
SELECT COUNT(DISTINCT visitor_id) as unique_visitors_last_7_days
FROM visitor_sessions
WHERE session_start >= CURRENT_DATE - INTERVAL '7 days';

-- ============================================
-- 2. AVG SESSION TIME
-- ============================================
-- Thời gian session trung bình (chỉ tính sessions đã kết thúc)
SELECT 
  DATE(session_start) as date,
  COUNT(*) as completed_sessions,
  ROUND(AVG(session_duration_seconds)::NUMERIC, 2) as avg_duration_seconds,
  ROUND(AVG(session_duration_seconds)::NUMERIC / 60.0, 2) as avg_duration_minutes,
  -- Phân loại theo thời gian
  COUNT(CASE WHEN session_duration_seconds < 10 THEN 1 END) as sessions_under_10s,
  COUNT(CASE WHEN session_duration_seconds >= 10 AND session_duration_seconds < 30 THEN 1 END) as sessions_10_30s,
  COUNT(CASE WHEN session_duration_seconds >= 30 THEN 1 END) as sessions_over_30s
FROM visitor_sessions
WHERE session_end IS NOT NULL 
  AND session_start >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(session_start)
ORDER BY date DESC;

-- Avg session time hôm nay
SELECT 
  ROUND(AVG(session_duration_seconds)::NUMERIC, 2) as avg_duration_seconds,
  ROUND(AVG(session_duration_seconds)::NUMERIC / 60.0, 2) as avg_duration_minutes,
  COUNT(*) as completed_sessions
FROM visitor_sessions
WHERE DATE(session_start) = CURRENT_DATE
  AND session_end IS NOT NULL;

-- Phân tích: <10s = không hiểu game, 20-30s = có tín hiệu
SELECT 
  CASE 
    WHEN session_duration_seconds < 10 THEN '<10s - Không hiểu game'
    WHEN session_duration_seconds >= 10 AND session_duration_seconds < 20 THEN '10-20s - Chưa rõ'
    WHEN session_duration_seconds >= 20 AND session_duration_seconds < 30 THEN '20-30s - Có tín hiệu ✅'
    WHEN session_duration_seconds >= 30 THEN '30s+ - Engaged'
    ELSE 'Unknown'
  END as engagement_level,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM visitor_sessions
WHERE session_end IS NOT NULL
  AND session_start >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY 
  CASE 
    WHEN session_duration_seconds < 10 THEN '<10s - Không hiểu game'
    WHEN session_duration_seconds >= 10 AND session_duration_seconds < 20 THEN '10-20s - Chưa rõ'
    WHEN session_duration_seconds >= 20 AND session_duration_seconds < 30 THEN '20-30s - Có tín hiệu ✅'
    WHEN session_duration_seconds >= 30 THEN '30s+ - Engaged'
    ELSE 'Unknown'
  END
ORDER BY count DESC;

-- ============================================
-- 3. GAME START
-- ============================================
-- Vào web có bấm chơi không?
SELECT 
  DATE(event_timestamp) as date,
  COUNT(*) as game_starts,
  COUNT(DISTINCT visitor_id) as unique_players,
  COUNT(DISTINCT game_id) as unique_games_played
FROM game_events
WHERE event_type = 'game_start'
  AND event_timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(event_timestamp)
ORDER BY date DESC;

-- Game starts hôm nay
SELECT 
  COUNT(*) as game_starts_today,
  COUNT(DISTINCT visitor_id) as unique_players_today
FROM game_events
WHERE event_type = 'game_start'
  AND DATE(event_timestamp) = CURRENT_DATE;

-- Conversion rate: Visitors → Game Start
SELECT 
  DATE(vs.session_start) as date,
  COUNT(DISTINCT vs.visitor_id) as unique_visitors,
  COUNT(DISTINCT ge.visitor_id) as visitors_who_played,
  ROUND(100.0 * COUNT(DISTINCT ge.visitor_id) / NULLIF(COUNT(DISTINCT vs.visitor_id), 0), 2) as conversion_rate_percent
FROM visitor_sessions vs
LEFT JOIN game_events ge ON ge.visitor_id = vs.visitor_id 
  AND DATE(ge.event_timestamp) = DATE(vs.session_start)
  AND ge.event_type = 'game_start'
WHERE vs.session_start >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(vs.session_start)
ORDER BY date DESC;

-- Top games được start nhiều nhất
SELECT 
  game_id,
  COUNT(*) as total_starts,
  COUNT(DISTINCT visitor_id) as unique_players
FROM game_events
WHERE event_type = 'game_start'
  AND event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY game_id
ORDER BY total_starts DESC
LIMIT 20;

-- ============================================
-- 4. REPLAY COUNT (QUAN TRỌNG NHẤT)
-- ============================================
-- Có chơi lại không?
SELECT 
  DATE(event_timestamp) as date,
  COUNT(*) as total_replays,
  COUNT(DISTINCT visitor_id) as unique_replayers,
  COUNT(DISTINCT game_id) as unique_games_replayed
FROM game_events
WHERE event_type = 'replay'
  AND event_timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(event_timestamp)
ORDER BY date DESC;

-- Replays hôm nay
SELECT 
  COUNT(*) as replays_today,
  COUNT(DISTINCT visitor_id) as unique_replayers_today
FROM game_events
WHERE event_type = 'replay'
  AND DATE(event_timestamp) = CURRENT_DATE;

-- Replay rate: Game Start → Replay
SELECT 
  DATE(ge_start.event_timestamp) as date,
  COUNT(DISTINCT ge_start.visitor_id) as players_who_started,
  COUNT(DISTINCT ge_replay.visitor_id) as players_who_replayed,
  ROUND(100.0 * COUNT(DISTINCT ge_replay.visitor_id) / NULLIF(COUNT(DISTINCT ge_start.visitor_id), 0), 2) as replay_rate_percent
FROM game_events ge_start
LEFT JOIN game_events ge_replay ON ge_replay.visitor_id = ge_start.visitor_id
  AND DATE(ge_replay.event_timestamp) = DATE(ge_start.event_timestamp)
  AND ge_replay.event_type = 'replay'
WHERE ge_start.event_type = 'game_start'
  AND ge_start.event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(ge_start.event_timestamp)
ORDER BY date DESC;

-- Top games được replay nhiều nhất
SELECT 
  game_id,
  COUNT(*) as total_replays,
  COUNT(DISTINCT visitor_id) as unique_replayers
FROM game_events
WHERE event_type = 'replay'
  AND event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY game_id
ORDER BY total_replays DESC
LIMIT 20;

-- Visitors replaying nhiều nhất (power users)
SELECT 
  visitor_id,
  COUNT(*) as total_replays,
  COUNT(DISTINCT game_id) as unique_games_replayed
FROM game_events
WHERE event_type = 'replay'
  AND event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY visitor_id
ORDER BY total_replays DESC
LIMIT 20;

-- ============================================
-- 5. AVATAR MINT CLICK
-- ============================================
-- Có click mint không? (không cần mint thành công)
SELECT 
  DATE(event_timestamp) as date,
  COUNT(*) as mint_clicks,
  COUNT(DISTINCT visitor_id) as unique_clickers
FROM game_events
WHERE event_type = 'avatar_mint_click'
  AND event_timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(event_timestamp)
ORDER BY date DESC;

-- Mint clicks hôm nay
SELECT 
  COUNT(*) as mint_clicks_today,
  COUNT(DISTINCT visitor_id) as unique_clickers_today
FROM game_events
WHERE event_type = 'avatar_mint_click'
  AND DATE(event_timestamp) = CURRENT_DATE;

-- Conversion rate: Visitors → Mint Click
SELECT 
  DATE(vs.session_start) as date,
  COUNT(DISTINCT vs.visitor_id) as unique_visitors,
  COUNT(DISTINCT ge.visitor_id) as visitors_who_clicked_mint,
  ROUND(100.0 * COUNT(DISTINCT ge.visitor_id) / NULLIF(COUNT(DISTINCT vs.visitor_id), 0), 2) as mint_click_rate_percent
FROM visitor_sessions vs
LEFT JOIN game_events ge ON ge.visitor_id = vs.visitor_id 
  AND DATE(ge.event_timestamp) = DATE(vs.session_start)
  AND ge.event_type = 'avatar_mint_click'
WHERE vs.session_start >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(vs.session_start)
ORDER BY date DESC;

-- ============================================
-- SUMMARY DASHBOARD (ALL METRICS)
-- ============================================
-- Xem tất cả metrics trong 1 query
SELECT 
  DATE(vs.session_start) as date,
  -- Unique visitors
  COUNT(DISTINCT vs.visitor_id) as unique_visitors,
  -- Session time
  ROUND(AVG(CASE WHEN vs.session_end IS NOT NULL THEN vs.session_duration_seconds END)::NUMERIC, 2) as avg_session_seconds,
  -- Game starts
  COUNT(DISTINCT CASE WHEN ge_start.event_type = 'game_start' THEN ge_start.visitor_id END) as visitors_who_played,
  COUNT(CASE WHEN ge_start.event_type = 'game_start' THEN 1 END) as total_game_starts,
  -- Replays
  COUNT(DISTINCT CASE WHEN ge_replay.event_type = 'replay' THEN ge_replay.visitor_id END) as visitors_who_replayed,
  COUNT(CASE WHEN ge_replay.event_type = 'replay' THEN 1 END) as total_replays,
  -- Avatar mint clicks
  COUNT(DISTINCT CASE WHEN ge_mint.event_type = 'avatar_mint_click' THEN ge_mint.visitor_id END) as visitors_who_clicked_mint,
  COUNT(CASE WHEN ge_mint.event_type = 'avatar_mint_click' THEN 1 END) as total_mint_clicks
FROM visitor_sessions vs
LEFT JOIN game_events ge_start ON ge_start.visitor_id = vs.visitor_id 
  AND DATE(ge_start.event_timestamp) = DATE(vs.session_start)
  AND ge_start.event_type = 'game_start'
LEFT JOIN game_events ge_replay ON ge_replay.visitor_id = vs.visitor_id 
  AND DATE(ge_replay.event_timestamp) = DATE(vs.session_start)
  AND ge_replay.event_type = 'replay'
LEFT JOIN game_events ge_mint ON ge_mint.visitor_id = vs.visitor_id 
  AND DATE(ge_mint.event_timestamp) = DATE(vs.session_start)
  AND ge_mint.event_type = 'avatar_mint_click'
WHERE vs.session_start >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(vs.session_start)
ORDER BY date DESC;

