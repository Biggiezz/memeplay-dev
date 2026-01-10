// ============================================
// ANALYTICS TRACKER - MemePlay
// ============================================
// Track các chỉ số:
// 1. Unique visitors / day
// 2. Avg session time
// 3. Game start events
// 4. Replay count
// 5. Avatar mint click (chỉ cần click, không cần mint thành công)
// ============================================

const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpa2NrcmNkcnZucWN0emFjeGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mzc3NDgsImV4cCI6MjA3NzMxMzc0OH0.nIPvf11YfFlWH0XHDZdxI496zaP431QOJCuQ-5XX4DQ';

let supabaseClient = null;
let sessionId = null;
let visitorId = null;
let sessionStartTime = null;

// ============================================
// STEP 1: Initialize Supabase Client
// ============================================

async function initSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient;
  }

  try {
    const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false
      }
    });
    return supabaseClient;
  } catch (error) {
    console.error('[Analytics] Failed to initialize Supabase client:', error);
    return null;
  }
}

// ============================================
// STEP 2: Generate Visitor ID (Persistent)
// ============================================

function getOrCreateVisitorId() {
  const STORAGE_KEY = 'mp_analytics_visitor_id';
  
  // Check localStorage first
  let vid = localStorage.getItem(STORAGE_KEY);
  
  if (!vid) {
    // Generate new visitor ID (UUID-like)
    vid = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem(STORAGE_KEY, vid);
  }
  
  return vid;
}

// ============================================
// STEP 3: Generate Session ID (Unique per visit)
// ============================================

function generateSessionId() {
  return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// ============================================
// STEP 3.5: Detect Device Type
// ============================================

/**
 * Detect device type from user agent
 * @returns {string} 'mobile', 'tablet', or 'desktop'
 */
function detectDeviceType() {
  const ua = navigator.userAgent || '';
  const isMobile = /iPhone|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua);
  
  if (isMobile) return 'mobile';
  if (isTablet) return 'tablet';
  return 'desktop';
}

// ============================================
// STEP 4: Start Visitor Session
// ============================================

export async function startSession() {
  try {
    const supabase = await initSupabaseClient();
    if (!supabase) {
      console.warn('[Analytics] Supabase client not available, skipping session start');
      return false;
    }

    // Generate IDs
    visitorId = getOrCreateVisitorId();
    sessionId = generateSessionId();
    sessionStartTime = Date.now();

    // Get user agent and referrer
    const userAgent = navigator.userAgent || null;
    const referrer = document.referrer || null;

    // Track session in Supabase
    const { data, error } = await supabase.rpc('track_visitor_session', {
      p_session_id: sessionId,
      p_visitor_id: visitorId,
      p_user_agent: userAgent,
      p_referrer: referrer
    });

    if (error) {
      console.error('[Analytics] Failed to track session:', error);
      return false;
    }

    console.log('[Analytics] ✅ Session started:', { sessionId, visitorId });
    return true;
  } catch (error) {
    console.error('[Analytics] Error starting session:', error);
    return false;
  }
}

// ============================================
// STEP 5: End Visitor Session
// ============================================

export async function endSession() {
  try {
    if (!sessionId) {
      return false;
    }

    const supabase = await initSupabaseClient();
    if (!supabase) {
      return false;
    }

    // Calculate duration
    const duration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;

    // End session in Supabase
    const { data, error } = await supabase.rpc('end_visitor_session', {
      p_session_id: sessionId,
      p_session_end: new Date().toISOString()
    });

    if (error) {
      console.error('[Analytics] Failed to end session:', error);
      return false;
    }

    console.log('[Analytics] ✅ Session ended:', { sessionId, duration });
    return true;
  } catch (error) {
    console.error('[Analytics] Error ending session:', error);
    return false;
  }
}

// ============================================
// STEP 6: Track Game Event
// ============================================

/**
 * Track game event (game_start, replay, avatar_mint_click)
 * @param {string} eventType - 'game_start', 'replay', 'avatar_mint_click'
 * @param {string|null} gameId - Game ID (null for avatar_mint_click)
 * @param {Object|null} metadata - Extra metadata (optional)
 */
export async function trackGameEvent(eventType, gameId = null, metadata = null) {
  try {
    // Ensure session is started
    if (!sessionId || !visitorId) {
      await startSession();
    }

    const supabase = await initSupabaseClient();
    if (!supabase) {
      console.warn('[Analytics] Supabase client not available, skipping event tracking');
      return false;
    }

    // Validate event type
    const validEventTypes = ['game_start', 'replay', 'avatar_mint_click'];
    if (!validEventTypes.includes(eventType)) {
      console.error('[Analytics] Invalid event type:', eventType);
      return false;
    }

    // Prepare metadata JSONB - auto-add device type if not provided
    let metadataJsonb = metadata || {};
    if (!metadataJsonb.device) {
      metadataJsonb.device = detectDeviceType();
    }
    if (!metadataJsonb.user_agent) {
      metadataJsonb.user_agent = navigator.userAgent || null;
    }

    // Track event in Supabase
    const { data, error } = await supabase.rpc('track_game_event', {
      p_session_id: sessionId || generateSessionId(),
      p_visitor_id: visitorId || getOrCreateVisitorId(),
      p_event_type: eventType,
      p_game_id: gameId,
      p_metadata: metadataJsonb
    });

    if (error) {
      console.error('[Analytics] Failed to track game event:', error);
      return false;
    }

    console.log('[Analytics] ✅ Event tracked:', { eventType, gameId, metadata });
    return true;
  } catch (error) {
    console.error('[Analytics] Error tracking game event:', error);
    return false;
  }
}

// ============================================
// STEP 7: Convenience Functions
// ============================================

/**
 * Track game start event
 * @param {string} gameId - Game ID
 * @param {Object|null} metadata - Extra metadata (e.g., { source: 'homepage', device: 'desktop' })
 */
export async function trackGameStart(gameId, metadata = null) {
  return await trackGameEvent('game_start', gameId, metadata);
}

/**
 * Track replay event (user plays same game again)
 * @param {string} gameId - Game ID
 * @param {Object|null} metadata - Extra metadata
 */
export async function trackReplay(gameId, metadata = null) {
  return await trackGameEvent('replay', gameId, metadata);
}

/**
 * Track avatar mint click (chỉ cần click, không cần mint thành công)
 * @param {Object|null} metadata - Extra metadata (e.g., { config_hash: 'xxx', from_page: 'avatar-creator' })
 */
export async function trackAvatarMintClick(metadata = null) {
  return await trackGameEvent('avatar_mint_click', null, metadata);
}

// ============================================
// STEP 8: Auto-initialize on Page Load
// ============================================

// Auto-start session when module loads
if (typeof window !== 'undefined') {
  // Start session on page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startSession();
    });
  } else {
    startSession();
  }

  // End session on page unload
  window.addEventListener('beforeunload', () => {
    // Use sendBeacon for reliable tracking on page unload
    endSession().catch(() => {
      // Silent fail on unload
    });
  });

  // Also track visibility change (user switches tabs/apps)
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Page hidden, might end session soon
      // Don't end immediately, wait for beforeunload
    } else {
      // Page visible again, session continues
      // Could track this as resume event if needed
    }
  });
}

// ============================================
// Export for manual use
// ============================================

export default {
  startSession,
  endSession,
  trackGameEvent,
  trackGameStart,
  trackReplay,
  trackAvatarMintClick,
  getVisitorId: () => visitorId || getOrCreateVisitorId(),
  getSessionId: () => sessionId || generateSessionId()
};

