-- ============================================
-- ANALYTICS DEVICE REPORTS - MemePlay
-- ============================================
-- SQL queries để phân tích thiết bị truy cập web
-- ============================================

-- ============================================
-- 1. PHÂN TÍCH THIẾT BỊ THEO USER_AGENT (Raw data)
-- ============================================

-- Xem user_agent của các sessions
SELECT 
  visitor_id,
  session_id,
  user_agent,
  session_start,
  session_duration_seconds
FROM visitor_sessions
WHERE user_agent IS NOT NULL
ORDER BY session_start DESC
LIMIT 50;

-- ============================================
-- 2. PHÂN TÍCH THIẾT BỊ THEO METADATA (Parsed device type)
-- ============================================

-- Device type từ metadata (mobile/desktop)
SELECT 
  DATE(event_timestamp) as date,
  metadata->>'device' as device_type,
  event_type,
  COUNT(*) as count,
  COUNT(DISTINCT visitor_id) as unique_users
FROM game_events
WHERE metadata->>'device' IS NOT NULL
  AND event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(event_timestamp), metadata->>'device', event_type
ORDER BY date DESC, device_type, event_type;

-- ============================================
-- 3. SUMMARY: MOBILE vs DESKTOP
-- ============================================

-- Tổng số sessions theo device type
SELECT 
  DATE(session_start) as date,
  COUNT(CASE WHEN user_agent ~* 'mobile|tablet|android|iphone|ipad' THEN 1 END) as mobile_sessions,
  COUNT(CASE WHEN user_agent !~* 'mobile|tablet|android|iphone|ipad' AND user_agent IS NOT NULL THEN 1 END) as desktop_sessions,
  COUNT(CASE WHEN user_agent IS NULL THEN 1 END) as unknown_sessions,
  COUNT(*) as total_sessions
FROM visitor_sessions
WHERE session_start >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(session_start)
ORDER BY date DESC;

-- ============================================
-- 4. GAME EVENTS BY DEVICE
-- ============================================

-- Game starts theo device
SELECT 
  DATE(event_timestamp) as date,
  metadata->>'device' as device_type,
  COUNT(*) as game_starts,
  COUNT(DISTINCT visitor_id) as unique_players,
  COUNT(DISTINCT game_id) as unique_games
FROM game_events
WHERE event_type = 'game_start'
  AND metadata->>'device' IS NOT NULL
  AND event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(event_timestamp), metadata->>'device'
ORDER BY date DESC, device_type;

-- Replays theo device (QUAN TRỌNG)
SELECT 
  DATE(event_timestamp) as date,
  metadata->>'device' as device_type,
  COUNT(*) as replays,
  COUNT(DISTINCT visitor_id) as unique_replayers,
  COUNT(DISTINCT game_id) as unique_games_replayed
FROM game_events
WHERE event_type = 'replay'
  AND metadata->>'device' IS NOT NULL
  AND event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(event_timestamp), metadata->>'device'
ORDER BY date DESC, device_type;

-- ============================================
-- 5. SESSION TIME BY DEVICE
-- ============================================

-- Avg session time theo device (từ user_agent)
SELECT 
  DATE(session_start) as date,
  CASE 
    WHEN user_agent ~* 'mobile|tablet|android|iphone|ipad' THEN 'mobile'
    WHEN user_agent !~* 'mobile|tablet|android|iphone|ipad' AND user_agent IS NOT NULL THEN 'desktop'
    ELSE 'unknown'
  END as device_type,
  COUNT(*) as completed_sessions,
  ROUND(AVG(session_duration_seconds)::NUMERIC, 2) as avg_duration_seconds,
  ROUND(AVG(session_duration_seconds)::NUMERIC / 60.0, 2) as avg_duration_minutes,
  -- Phân loại engagement
  COUNT(CASE WHEN session_duration_seconds < 10 THEN 1 END) as sessions_under_10s,
  COUNT(CASE WHEN session_duration_seconds >= 10 AND session_duration_seconds < 30 THEN 1 END) as sessions_10_30s,
  COUNT(CASE WHEN session_duration_seconds >= 30 THEN 1 END) as sessions_over_30s
FROM visitor_sessions
WHERE session_end IS NOT NULL
  AND session_start >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(session_start), 
  CASE 
    WHEN user_agent ~* 'mobile|tablet|android|iphone|ipad' THEN 'mobile'
    WHEN user_agent !~* 'mobile|tablet|android|iphone|ipad' AND user_agent IS NOT NULL THEN 'desktop'
    ELSE 'unknown'
  END
ORDER BY date DESC, device_type;

-- ============================================
-- 6. CONVERSION RATE BY DEVICE
-- ============================================

-- Visitors → Game Start conversion rate theo device
SELECT 
  DATE(vs.session_start) as date,
  CASE 
    WHEN vs.user_agent ~* 'mobile|tablet|android|iphone|ipad' THEN 'mobile'
    WHEN vs.user_agent !~* 'mobile|tablet|android|iphone|ipad' AND vs.user_agent IS NOT NULL THEN 'desktop'
    ELSE 'unknown'
  END as device_type,
  COUNT(DISTINCT vs.visitor_id) as unique_visitors,
  COUNT(DISTINCT ge.visitor_id) as visitors_who_played,
  ROUND(100.0 * COUNT(DISTINCT ge.visitor_id) / NULLIF(COUNT(DISTINCT vs.visitor_id), 0), 2) as conversion_rate_percent
FROM visitor_sessions vs
LEFT JOIN game_events ge ON ge.visitor_id = vs.visitor_id 
  AND DATE(ge.event_timestamp) = DATE(vs.session_start)
  AND ge.event_type = 'game_start'
WHERE vs.session_start >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(vs.session_start),
  CASE 
    WHEN vs.user_agent ~* 'mobile|tablet|android|iphone|ipad' THEN 'mobile'
    WHEN vs.user_agent !~* 'mobile|tablet|android|iphone|ipad' AND vs.user_agent IS NOT NULL THEN 'desktop'
    ELSE 'unknown'
  END
ORDER BY date DESC, device_type;

-- ============================================
-- 7. REPLAY RATE BY DEVICE (QUAN TRỌNG)
-- ============================================

-- Replay rate theo device
SELECT 
  DATE(ge_start.event_timestamp) as date,
  ge_start.metadata->>'device' as device_type,
  COUNT(DISTINCT ge_start.visitor_id) as players_who_started,
  COUNT(DISTINCT ge_replay.visitor_id) as players_who_replayed,
  ROUND(100.0 * COUNT(DISTINCT ge_replay.visitor_id) / NULLIF(COUNT(DISTINCT ge_start.visitor_id), 0), 2) as replay_rate_percent
FROM game_events ge_start
LEFT JOIN game_events ge_replay ON ge_replay.visitor_id = ge_start.visitor_id
  AND DATE(ge_replay.event_timestamp) = DATE(ge_start.event_timestamp)
  AND ge_replay.event_type = 'replay'
  AND ge_replay.metadata->>'device' = ge_start.metadata->>'device'
WHERE ge_start.event_type = 'game_start'
  AND ge_start.metadata->>'device' IS NOT NULL
  AND ge_start.event_timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(ge_start.event_timestamp), ge_start.metadata->>'device'
ORDER BY date DESC, device_type;

-- ============================================
-- 8. TOP BROWSERS/PLATFORMS
-- ============================================

-- Phân tích browser/platform từ user_agent
SELECT 
  CASE 
    WHEN user_agent ~* 'chrome' AND user_agent !~* 'edg' THEN 'Chrome'
    WHEN user_agent ~* 'safari' AND user_agent !~* 'chrome' THEN 'Safari'
    WHEN user_agent ~* 'firefox' THEN 'Firefox'
    WHEN user_agent ~* 'edg' THEN 'Edge'
    WHEN user_agent ~* 'opera' THEN 'Opera'
    ELSE 'Other'
  END as browser,
  CASE 
    WHEN user_agent ~* 'windows' THEN 'Windows'
    WHEN user_agent ~* 'mac' THEN 'macOS'
    WHEN user_agent ~* 'linux' THEN 'Linux'
    WHEN user_agent ~* 'android' THEN 'Android'
    WHEN user_agent ~* 'iphone|ipad' THEN 'iOS'
    ELSE 'Other'
  END as platform,
  COUNT(*) as sessions,
  COUNT(DISTINCT visitor_id) as unique_visitors
FROM visitor_sessions
WHERE session_start >= CURRENT_DATE - INTERVAL '7 days'
  AND user_agent IS NOT NULL
GROUP BY 
  CASE 
    WHEN user_agent ~* 'chrome' AND user_agent !~* 'edg' THEN 'Chrome'
    WHEN user_agent ~* 'safari' AND user_agent !~* 'chrome' THEN 'Safari'
    WHEN user_agent ~* 'firefox' THEN 'Firefox'
    WHEN user_agent ~* 'edg' THEN 'Edge'
    WHEN user_agent ~* 'opera' THEN 'Opera'
    ELSE 'Other'
  END,
  CASE 
    WHEN user_agent ~* 'windows' THEN 'Windows'
    WHEN user_agent ~* 'mac' THEN 'macOS'
    WHEN user_agent ~* 'linux' THEN 'Linux'
    WHEN user_agent ~* 'android' THEN 'Android'
    WHEN user_agent ~* 'iphone|ipad' THEN 'iOS'
    ELSE 'Other'
  END
ORDER BY sessions DESC;

-- ============================================
-- 9. SUMMARY DASHBOARD BY DEVICE
-- ============================================

-- Tất cả metrics theo device trong 1 query
SELECT 
  DATE(vs.session_start) as date,
  CASE 
    WHEN vs.user_agent ~* 'mobile|tablet|android|iphone|ipad' THEN 'mobile'
    WHEN vs.user_agent !~* 'mobile|tablet|android|iphone|ipad' AND vs.user_agent IS NOT NULL THEN 'desktop'
    ELSE 'unknown'
  END as device_type,
  -- Unique visitors
  COUNT(DISTINCT vs.visitor_id) as unique_visitors,
  -- Session time
  ROUND(AVG(CASE WHEN vs.session_end IS NOT NULL THEN vs.session_duration_seconds END)::NUMERIC, 2) as avg_session_seconds,
  -- Game starts (from metadata)
  COUNT(DISTINCT CASE WHEN ge_start.event_type = 'game_start' AND ge_start.metadata->>'device' = 
    CASE 
      WHEN vs.user_agent ~* 'mobile|tablet|android|iphone|ipad' THEN 'mobile'
      WHEN vs.user_agent !~* 'mobile|tablet|android|iphone|ipad' AND vs.user_agent IS NOT NULL THEN 'desktop'
      ELSE 'unknown'
    END
    THEN ge_start.visitor_id END) as visitors_who_played,
  COUNT(CASE WHEN ge_start.event_type = 'game_start' AND ge_start.metadata->>'device' = 
    CASE 
      WHEN vs.user_agent ~* 'mobile|tablet|android|iphone|ipad' THEN 'mobile'
      WHEN vs.user_agent !~* 'mobile|tablet|android|iphone|ipad' AND vs.user_agent IS NOT NULL THEN 'desktop'
      ELSE 'unknown'
    END
    THEN 1 END) as total_game_starts,
  -- Replays (from metadata)
  COUNT(DISTINCT CASE WHEN ge_replay.event_type = 'replay' AND ge_replay.metadata->>'device' = 
    CASE 
      WHEN vs.user_agent ~* 'mobile|tablet|android|iphone|ipad' THEN 'mobile'
      WHEN vs.user_agent !~* 'mobile|tablet|android|iphone|ipad' AND vs.user_agent IS NOT NULL THEN 'desktop'
      ELSE 'unknown'
    END
    THEN ge_replay.visitor_id END) as visitors_who_replayed,
  COUNT(CASE WHEN ge_replay.event_type = 'replay' AND ge_replay.metadata->>'device' = 
    CASE 
      WHEN vs.user_agent ~* 'mobile|tablet|android|iphone|ipad' THEN 'mobile'
      WHEN vs.user_agent !~* 'mobile|tablet|android|iphone|ipad' AND vs.user_agent IS NOT NULL THEN 'desktop'
      ELSE 'unknown'
    END
    THEN 1 END) as total_replays
FROM visitor_sessions vs
LEFT JOIN game_events ge_start ON ge_start.visitor_id = vs.visitor_id 
  AND DATE(ge_start.event_timestamp) = DATE(vs.session_start)
  AND ge_start.event_type = 'game_start'
LEFT JOIN game_events ge_replay ON ge_replay.visitor_id = vs.visitor_id 
  AND DATE(ge_replay.event_timestamp) = DATE(vs.session_start)
  AND ge_replay.event_type = 'replay'
WHERE vs.session_start >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(vs.session_start),
  CASE 
    WHEN vs.user_agent ~* 'mobile|tablet|android|iphone|ipad' THEN 'mobile'
    WHEN vs.user_agent !~* 'mobile|tablet|android|iphone|ipad' AND vs.user_agent IS NOT NULL THEN 'desktop'
    ELSE 'unknown'
  END
ORDER BY date DESC, device_type;

