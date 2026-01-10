-- ============================================
-- ANALYTICS TRACKING SETUP - MemePlay
-- ============================================
-- Track các chỉ số:
-- 1. Unique visitors / day
-- 2. Avg session time
-- 3. Game start events
-- 4. Replay count
-- 5. Avatar mint click (chỉ cần click, không cần mint thành công)
-- ============================================

-- ============================================
-- BƯỚC 1: Tạo bảng visitor_sessions
-- ============================================
-- Track mỗi session của visitor (unique identifier)
DROP TABLE IF EXISTS visitor_sessions CASCADE;
CREATE TABLE visitor_sessions (
  session_id TEXT PRIMARY KEY, -- UUID hoặc fingerprint
  visitor_id TEXT NOT NULL, -- Persistent visitor identifier (localStorage)
  session_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  session_end TIMESTAMPTZ, -- NULL nếu session đang active
  session_duration_seconds INTEGER, -- Calculated khi session_end được set
  user_agent TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index để query nhanh
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_visitor_id ON visitor_sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_sessions_session_start ON visitor_sessions(session_start DESC);
-- Note: Không cần index riêng cho DATE() vì index trên session_start đã đủ cho date queries
-- Queries với DATE(session_start) vẫn sẽ dùng index trên session_start column

-- ============================================
-- BƯỚC 2: Tạo bảng game_events
-- ============================================
-- Track các events: game_start, replay
DROP TABLE IF EXISTS game_events CASCADE;
CREATE TABLE game_events (
  id BIGSERIAL PRIMARY KEY,
  session_id TEXT NOT NULL, -- Reference đến visitor_sessions
  visitor_id TEXT NOT NULL, -- Reference đến visitor để tính unique
  event_type TEXT NOT NULL, -- 'game_start', 'replay', 'avatar_mint_click'
  game_id TEXT, -- NULL nếu không phải game event
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB, -- Extra data (e.g., source, device type)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index để query nhanh
CREATE INDEX IF NOT EXISTS idx_game_events_session_id ON game_events(session_id);
CREATE INDEX IF NOT EXISTS idx_game_events_visitor_id ON game_events(visitor_id);
CREATE INDEX IF NOT EXISTS idx_game_events_event_type ON game_events(event_type);
CREATE INDEX IF NOT EXISTS idx_game_events_game_id ON game_events(game_id);
CREATE INDEX IF NOT EXISTS idx_game_events_event_timestamp ON game_events(event_timestamp DESC);
-- Note: Không cần index riêng cho DATE() vì index trên event_timestamp đã đủ cho date queries
-- Queries với DATE(event_timestamp) vẫn sẽ dùng index trên event_timestamp column

-- ============================================
-- BƯỚC 3: RPC Function - track_visitor_session
-- ============================================
-- Tạo hoặc update visitor session
CREATE OR REPLACE FUNCTION track_visitor_session(
  p_session_id TEXT,
  p_visitor_id TEXT,
  p_user_agent TEXT DEFAULT NULL,
  p_referrer TEXT DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSON;
  v_existing_session_id TEXT;
BEGIN
  -- Validate inputs
  IF p_session_id IS NULL OR p_session_id = '' THEN
    RAISE EXCEPTION 'session_id cannot be null or empty';
  END IF;
  
  IF p_visitor_id IS NULL OR p_visitor_id = '' THEN
    RAISE EXCEPTION 'visitor_id cannot be null or empty';
  END IF;

  -- Check if session already exists
  SELECT session_id INTO v_existing_session_id
  FROM visitor_sessions
  WHERE session_id = p_session_id;

  IF v_existing_session_id IS NOT NULL THEN
    -- Session exists, return it
    SELECT json_build_object(
      'success', TRUE,
      'action', 'existing',
      'session_id', session_id,
      'visitor_id', visitor_id,
      'session_start', session_start
    ) INTO v_result
    FROM visitor_sessions
    WHERE session_id = p_session_id;
  ELSE
    -- Create new session
    INSERT INTO visitor_sessions (session_id, visitor_id, user_agent, referrer)
    VALUES (p_session_id, p_visitor_id, p_user_agent, p_referrer);
    
    SELECT json_build_object(
      'success', TRUE,
      'action', 'created',
      'session_id', p_session_id,
      'visitor_id', p_visitor_id,
      'session_start', NOW()
    ) INTO v_result;
  END IF;

  RETURN v_result;
END; $$;

-- ============================================
-- BƯỚC 4: RPC Function - end_visitor_session
-- ============================================
-- End session và tính duration
CREATE OR REPLACE FUNCTION end_visitor_session(
  p_session_id TEXT,
  p_session_end TIMESTAMPTZ DEFAULT NOW()
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSON;
  v_session_start TIMESTAMPTZ;
  v_duration_seconds INTEGER;
BEGIN
  -- Validate input
  IF p_session_id IS NULL OR p_session_id = '' THEN
    RAISE EXCEPTION 'session_id cannot be null or empty';
  END IF;

  -- Get session start
  SELECT session_start INTO v_session_start
  FROM visitor_sessions
  WHERE session_id = p_session_id AND session_end IS NULL;

  IF v_session_start IS NULL THEN
    -- Session not found or already ended
    RETURN json_build_object(
      'success', FALSE,
      'error', 'Session not found or already ended'
    );
  END IF;

  -- Calculate duration
  v_duration_seconds := EXTRACT(EPOCH FROM (p_session_end - v_session_start))::INTEGER;

  -- Update session
  UPDATE visitor_sessions
  SET 
    session_end = p_session_end,
    session_duration_seconds = v_duration_seconds
  WHERE session_id = p_session_id;

  SELECT json_build_object(
    'success', TRUE,
    'session_id', p_session_id,
    'session_start', v_session_start,
    'session_end', p_session_end,
    'duration_seconds', v_duration_seconds
  ) INTO v_result;

  RETURN v_result;
END; $$;

-- ============================================
-- BƯỚC 5: RPC Function - track_game_event
-- ============================================
-- Track game events (game_start, replay, avatar_mint_click)
CREATE OR REPLACE FUNCTION track_game_event(
  p_session_id TEXT,
  p_visitor_id TEXT,
  p_event_type TEXT,
  p_game_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Validate inputs
  IF p_session_id IS NULL OR p_session_id = '' THEN
    RAISE EXCEPTION 'session_id cannot be null or empty';
  END IF;
  
  IF p_visitor_id IS NULL OR p_visitor_id = '' THEN
    RAISE EXCEPTION 'visitor_id cannot be null or empty';
  END IF;
  
  IF p_event_type IS NULL OR p_event_type = '' THEN
    RAISE EXCEPTION 'event_type cannot be null or empty';
  END IF;

  -- Validate event_type
  IF p_event_type NOT IN ('game_start', 'replay', 'avatar_mint_click') THEN
    RAISE EXCEPTION 'event_type must be one of: game_start, replay, avatar_mint_click';
  END IF;

  -- Insert event
  INSERT INTO game_events (session_id, visitor_id, event_type, game_id, metadata)
  VALUES (p_session_id, p_visitor_id, p_event_type, p_game_id, p_metadata);

  SELECT json_build_object(
    'success', TRUE,
    'session_id', p_session_id,
    'visitor_id', p_visitor_id,
    'event_type', p_event_type,
    'game_id', p_game_id,
    'event_timestamp', NOW()
  ) INTO v_result;

  RETURN v_result;
END; $$;

-- ============================================
-- BƯỚC 6: RLS Policies (Enable Public Read/Write)
-- ============================================

-- Enable RLS
ALTER TABLE visitor_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies (if any)
DROP POLICY IF EXISTS "Allow public insert visitor_sessions" ON visitor_sessions;
DROP POLICY IF EXISTS "Allow public select visitor_sessions" ON visitor_sessions;
DROP POLICY IF EXISTS "Allow public update visitor_sessions" ON visitor_sessions;

DROP POLICY IF EXISTS "Allow public insert game_events" ON game_events;
DROP POLICY IF EXISTS "Allow public select game_events" ON game_events;

-- Create policies for visitor_sessions
CREATE POLICY "Allow public insert visitor_sessions"
ON visitor_sessions FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public select visitor_sessions"
ON visitor_sessions FOR SELECT
TO anon, authenticated
USING (true);

CREATE POLICY "Allow public update visitor_sessions"
ON visitor_sessions FOR UPDATE
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- Create policies for game_events
CREATE POLICY "Allow public insert game_events"
ON game_events FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Allow public select game_events"
ON game_events FOR SELECT
TO anon, authenticated
USING (true);

-- ============================================
-- BƯỚC 7: Grant Execute Permissions
-- ============================================

GRANT EXECUTE ON FUNCTION track_visitor_session(TEXT, TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION track_visitor_session(TEXT, TEXT, TEXT, TEXT) TO authenticated;

GRANT EXECUTE ON FUNCTION end_visitor_session(TEXT, TIMESTAMPTZ) TO anon;
GRANT EXECUTE ON FUNCTION end_visitor_session(TEXT, TIMESTAMPTZ) TO authenticated;

GRANT EXECUTE ON FUNCTION track_game_event(TEXT, TEXT, TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION track_game_event(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- ============================================
-- BƯỚC 8: Verify Setup
-- ============================================

-- Verify tables exist
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('visitor_sessions', 'game_events');

-- Verify RPC functions exist
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments
FROM pg_proc
WHERE proname IN ('track_visitor_session', 'end_visitor_session', 'track_game_event');

-- Verify policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE tablename IN ('visitor_sessions', 'game_events');

-- ============================================
-- ✅ SETUP COMPLETE
-- ============================================
-- 
-- CÁCH SỬ DỤNG:
-- ============================================
-- 1. Trong JavaScript, gọi track_visitor_session() khi page load
-- 2. Track game events bằng track_game_event()
-- 3. Gọi end_visitor_session() khi user rời trang (beforeunload)
-- 4. Xem reports bằng các SQL queries trong ANALYTICS-REPORTS.sql
-- ============================================

