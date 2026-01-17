// ====================================
// PACMAN TEMPLATE - MAIN GAME LOGIC
// ====================================

// ====================================
// GAME STATE
// ====================================

let canvas, ctx;
let currentLevel = 1;
let currentMap = [];
let mapIndex = 0;
let score = 0;
let fragmentsCollected = 0;
let gameState = 'playing'; // 'playing', 'gameOver', 'levelComplete'
let isGameOver = false;

// Player
let player = {
  x: 0,
  y: 0,
  direction: 'right', // 'up', 'down', 'left', 'right'
  nextDirection: 'right',
  speed: CONFIG.PLAYER_SPEED,
  size: CONFIG.PLAYER_SIZE,
  animationFrame: 0, // For mouth animation
  lastDirection: 'right'
};

// Fragments
let fragments = [];
let exitGate = null;
let gateBlinkTimer = 0;

// Ghosts
let ghosts = [];
let ghostCount = 1;
const PACMAN_DEBUG_ENABLED = (() => {
  try {
    if (typeof window !== 'undefined' && window.__PACMAN_DEBUG) return true;
    if (typeof window !== 'undefined' && window.parent && window.parent.__PACMAN_DEBUG) return true;
    if (localStorage.getItem('pacman_debug') === 'true') return true;
  } catch (_) {}
  return false;
})();

if (!PACMAN_DEBUG_ENABLED && typeof console !== 'undefined') {
  ['log', 'info', 'debug'].forEach(method => {
    if (typeof console[method] === 'function') {
      console[method] = () => {};
    }
  });
}

const EMBEDDED_GAME_ID = typeof getGameId === 'function' ? getGameId() : null;
const isPublicView = !!EMBEDDED_GAME_ID;

const TEMPLATE_ID = 'pacman-template';
const PRODUCTION_BASE_URL = 'https://memeplay.dev';
const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlpa2NrcmNkcnZucWN0emFjeGd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Mzc3NDgsImV4cCI6MjA3NzMxMzc0OH0.nIPvf11YfFlWH0XHDZdxI496zaP431QOJCuQ-5XX4DQ';
let supabaseClientPromise = null;

function getCreatorIdentifier() {
  const key = 'pacman_creator_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = 'creator_' + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(key, id);
  }
  return id;
}

async function getSupabaseClient() {
  if (window.supabaseClient) return window.supabaseClient;
  if (supabaseClientPromise) return supabaseClientPromise;
  supabaseClientPromise = (async () => {
    try {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      // ✅ FIX: Completely disable realtime to prevent local network permission prompt
      // Client is created lazily only when needed (not on page load)
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        // NO realtime config - completely disabled
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      });
      
      // ✅ CRITICAL: Explicitly disconnect realtime to prevent WebSocket connections
      // This prevents the "local network permission" popup on production
      if (client.realtime) {
        client.realtime.disconnect();
      }
      
      window.supabaseClient = client;
      return client;
    } catch (error) {
      console.error('[Supabase] Failed to load client:', error);
      return null;
    }
  })();
  return supabaseClientPromise;
}

async function syncGameToSupabase(gameId, context = 'manual-save') {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      console.warn('[Supabase] Client unavailable, skip sync');
      return false;
    }

    const origin = window.location.origin.toLowerCase();
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('0.0.0.0');
    const baseUrl = isLocal ? PRODUCTION_BASE_URL : window.location.origin.replace(/\/$/, '');
    const templateUrl = `${baseUrl}/games/templates-v2/pacman-template/index.html?game=${gameId}`;
    const publicUrl = buildPublicLinkUrl(gameId, { forceProduction: true, template: 'pacman' });
    const stories = Array.isArray(BRAND_CONFIG.stories) ? BRAND_CONFIG.stories : [];

    const payload = {
      p_game_id: gameId,
      p_template_id: TEMPLATE_ID,
      p_title: BRAND_CONFIG.title || 'Pacman Game',
      p_map_color: BRAND_CONFIG.mapColor || '#1a1a2e',
      p_map_index: BRAND_CONFIG.mapIndex !== undefined ? BRAND_CONFIG.mapIndex : 0,
      p_fragment_logo_url: BRAND_CONFIG.fragmentLogoUrl || null,
      p_story_one: stories[0] || '',
      p_story_two: stories[1] || '',
      p_story_three: stories[2] || '',
      p_public_url: publicUrl,
      p_template_url: templateUrl,
      p_creator_id: getCreatorIdentifier(),
      p_context: context
    };

    const { error } = await supabase.rpc('upsert_user_created_game', payload);
    if (error) {
      console.error('[Supabase] upsert_user_created_game error:', error.message || error);
      return false;
    }

    console.log(`[Supabase] Synced game ${gameId} (${context})`);
    return true;
  } catch (err) {
    console.error('[Supabase] Unexpected sync error:', err);
    return false;
  }
}

async function loadBrandConfigFromSupabase(gameId) {
  if (!gameId) {
    console.warn('[Supabase] Missing gameId, skip loading brand config from Supabase');
    return false;
  }
  if (typeof getSupabaseClient !== 'function') {
    console.warn('[Supabase] getSupabaseClient is unavailable');
    return false;
  }
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      console.warn('[Supabase] Client unavailable while loading brand config');
      return false;
    }
    const { data, error } = await supabase.rpc('list_user_created_games', {
      p_template_id: TEMPLATE_ID
    });
    if (error) {
      console.error('[Supabase] list_user_created_games error:', error.message || error);
      return false;
    }
    if (!Array.isArray(data)) {
      console.warn('[Supabase] Unexpected response while loading brand config:', data);
      return false;
    }
    const foundGame = data.find(item => {
      const id = item?.game_id || item?.id;
      return id === gameId;
    });
    if (!foundGame) {
      console.warn(`[Supabase] Game ${gameId} not found when loading brand config`);
      return false;
    }
    let stories = Array.isArray(foundGame.stories) ? foundGame.stories : [];
    if (typeof foundGame.stories === 'string') {
      try {
        stories = JSON.parse(foundGame.stories);
      } catch (err) {
        console.warn('[Supabase] Failed to parse stories JSON:', err);
        stories = [];
      }
    }
    if (!Array.isArray(stories)) {
      stories = [];
    }
    const legacyStories = [foundGame.story_one, foundGame.story_two, foundGame.story_three]
      .filter(story => typeof story === 'string' && story.trim() !== '')
      .map(story => story.trim());
    if (legacyStories.length > 0) {
      stories = [...stories, ...legacyStories];
    }
    const uniqueStories = stories
      .map(story => (typeof story === 'string' ? story.trim() : ''))
      .filter(story => story !== '');
    const supabaseConfig = {
      fragmentLogoUrl: foundGame.fragment_logo_url || '',
      title: foundGame.title || 'Pacman Game',
      mapColor: foundGame.map_color || '#1a1a2e',
      mapIndex: Number.isInteger(foundGame.map_index) ? foundGame.map_index : 0,
      stories: uniqueStories
    };
    BRAND_CONFIG = { ...BRAND_CONFIG, ...supabaseConfig };
    saveBrandConfig(gameId);
    if (BRAND_CONFIG.fragmentLogoUrl) {
      const logo = new Image();
      logo.onload = () => {
        BRAND_CONFIG.fragmentLogo = logo;
      };
      logo.src = BRAND_CONFIG.fragmentLogoUrl;
    }
    console.log(`[Supabase] Loaded brand config for ${gameId} from Supabase`);
    return true;
  } catch (error) {
    console.error('[Supabase] Unexpected error while loading brand config:', error);
    return false;
  }
}


// Ghost AI state
let ghostSpeedMultiplier = 0.25;          // starts at 25% of Pacman speed
let firstFragmentEaten = false;           // track first fragment event
let ghostFreezeTimer = 0;                 // ms remaining for global ghost freeze
let ghostGlowTimer = 0;                   // ms remaining for glow effect
let ghostGlowState = 'none';              // 'none' | 'yellow' | 'red'
let ghostPendingBoost = 0;                // boost applied after freeze completes

const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 }
};
const GHOST_MAX_SPEED_MULTIPLIER = 2.5;
const GHOST_REPEL_DISTANCE = 24;
const GHOST_REPEL_FORCE = 6;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'memeplay-project';
}

function buildPublicLinkUrl(gameId = null, options = {}) {
  const { forceProduction = false, template = 'pacman' } = options || {};
  let id = gameId;
  console.log('[buildPublicLinkUrl] Input gameId:', gameId, 'type:', typeof gameId, 'forceProduction:', forceProduction, 'template:', template);
  
  if (!id || id === 'null' || id === 'undefined' || id === '') {
    console.warn('[buildPublicLinkUrl] gameId is invalid, generating new ID...');
    if (typeof generateGameId === 'function') {
      id = generateGameId();
    } else {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      id = `pacman-${randomSuffix}`;
    }
    console.log('[buildPublicLinkUrl] Generated new ID:', id);
  }
  
  const origin = window.location.origin.replace(/\/$/, '');
  const originLower = origin.toLowerCase();
  const isLocal = originLower.includes('localhost') || originLower.includes('127.0.0.1') || originLower.includes('192.168.') || originLower.includes('0.0.0.0');
  const baseUrl = forceProduction ? PRODUCTION_BASE_URL : origin;
  console.log('[buildPublicLinkUrl] baseUrl resolved:', baseUrl, '| isLocal:', isLocal, '| forceProduction:', forceProduction, '| template:', template);
  
  // ✅ FIXED: Use play.html?game=id format to match homepage share links
  // This ensures consistent routing and better performance in play mode
  const publicUrl = `${baseUrl}/play.html?game=${id}`;
  console.log('[buildPublicLinkUrl] Final publicUrl:', publicUrl);
  
  return publicUrl;
}

function isWalkableTileValue(value) {
  return value === 0;
}

function isMobileViewport() {
  return window.innerWidth <= 992;
}

// Input
let keys = {};
let mobileDirection = null;
let mobileDirectionSource = null; // 'button' or 'swipe'
let mobileSwipeTimeoutId = null;
let mobileGameUnlocked = false;
let hasSentGameStart = false;

function setMobileDirection(dir, source = 'button') {
  if (!dir) return;
  
  // ✅ CRITICAL: Block mobile input if tap to start overlay is visible
  if (isPublicView) {
    const overlay = document.getElementById('tapToStartOverlay');
    if (overlay && !overlay.classList.contains('hidden')) {
      return; // Block input completely
    }
  }
  
  mobileDirection = dir;
  mobileDirectionSource = source;
  if (source === 'swipe') {
    if (mobileSwipeTimeoutId) {
      clearTimeout(mobileSwipeTimeoutId);
    }
    mobileSwipeTimeoutId = setTimeout(() => {
      if (mobileDirectionSource === 'swipe') {
        mobileDirection = null;
        mobileDirectionSource = null;
      }
      mobileSwipeTimeoutId = null;
    }, 200);
  }
  requestGameStartFromParent(source === 'swipe' ? 'mobile-swipe' : 'mobile-button');
}

function clearMobileDirection(source = 'button') {
  if (source === 'button') {
    if (mobileDirectionSource === 'button') {
      mobileDirection = null;
      mobileDirectionSource = null;
    }
    return;
  }
  if (source === 'swipe' && mobileDirectionSource === 'swipe') {
    mobileDirection = null;
    mobileDirectionSource = null;
    if (mobileSwipeTimeoutId) {
      clearTimeout(mobileSwipeTimeoutId);
    }
    mobileSwipeTimeoutId = null;
  }
}

function requestGameStartFromParent(source = 'input') {
  // ✅ CRITICAL: Only allow game start if tap to start overlay is hidden (user tapped it)
  if (isPublicView) {
    const overlay = document.getElementById('tapToStartOverlay');
    if (overlay && !overlay.classList.contains('hidden')) {
      // Overlay still visible - don't start game unless source is tap-to-start
      if (source !== 'tap-to-start') {
        return; // Block game start from other sources
      }
    }
  }
  
  if (hasSentGameStart) return;
  hasSentGameStart = true;
  
  // ✅ Hide overlay when game starts (double-check)
  if (isPublicView) {
    const overlay = document.getElementById('tapToStartOverlay');
    if (overlay) {
      overlay.classList.add('hidden');
    }
  }
  
  if (EMBEDDED_GAME_ID) {
    notifyParentGameStart(source);
  }
}

// Animation
let lastTime = 0;
let animationFrame = 0;

// Audio
let audioCtx = null;
let audioUnlocked = false;
let audioUnlockHandlersBound = false;

const SOUND_PRESETS = {
  fragmentPickup: {
    sequence: [
      { freq: 1250, duration: 0.08, gain: 0.28, type: 'triangle' },
      { freq: 1500, duration: 0.06, gain: 0.22, offset: 0.05, type: 'sine' }
    ]
  },
  ghostFreeze: {
    sequence: [
      { freq: 520, duration: 0.1, gain: 0.25, type: 'sawtooth' },
      { freq: 840, duration: 0.1, gain: 0.18, offset: 0.08, type: 'triangle' }
    ]
  },
  playerHit: {
    sequence: [
      { freq: 220, duration: 0.18, gain: 0.35, type: 'sawtooth' },
      { freq: 110, duration: 0.2, gain: 0.25, offset: 0.14, type: 'square' }
    ]
  },
  portalOpen: {
    sequence: [
      { freq: 500, duration: 0.12, gain: 0.2, type: 'triangle' },
      { freq: 820, duration: 0.12, gain: 0.18, offset: 0.08, type: 'sine' }
    ]
  },
  levelComplete: {
    sequence: [
      { freq: 900, duration: 0.16, gain: 0.25, type: 'triangle' },
      { freq: 1200, duration: 0.2, gain: 0.22, offset: 0.1, type: 'sine' }
    ]
  },
  storyChime: {
    sequence: [
      { freq: 660, duration: 0.28, gain: 0.2, type: 'triangle' },
      { freq: 880, duration: 0.32, gain: 0.18, offset: 0.18, type: 'sine' }
    ]
  },
  ghostYellowGlow: {
    sequence: [
      { freq: 600, duration: 0.12, gain: 0.25, type: 'sine' },
      { freq: 800, duration: 0.1, gain: 0.2, offset: 0.08, type: 'triangle' }
    ]
  },
  ghostRedAlert: {
    sequence: [
      { freq: 400, duration: 0.15, gain: 0.3, type: 'sawtooth' },
      { freq: 0, duration: 0.1, gain: 0, offset: 0.15 }, // Pause (silence)
      { freq: 450, duration: 0.15, gain: 0.3, offset: 0.25, type: 'sawtooth' },
      { freq: 0, duration: 0.1, gain: 0, offset: 0.4 }, // Pause (silence)
      { freq: 500, duration: 0.2, gain: 0.35, offset: 0.5, type: 'sawtooth' }
    ]
  }
};

function ensureAudioContext() {
  if (audioCtx) {
    return audioCtx;
  }
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    console.warn('Web Audio API is not supported in this browser.');
    return null;
  }
  audioCtx = new AudioContextClass();
  audioUnlocked = audioCtx.state !== 'suspended';
  return audioCtx;
}

function setupAudioUnlock() {
  const ctx = ensureAudioContext();
  if (!ctx || audioUnlocked || audioUnlockHandlersBound) return;

  audioUnlockHandlersBound = true;
  const unlock = () => {
    ctx.resume().then(() => {
      audioUnlocked = true;
      ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
        document.removeEventListener(evt, unlock, true);
      });
    }).catch(() => {});
  };

  ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach(evt => {
    document.addEventListener(evt, unlock, true);
  });
}

function playSound(name) {
  const preset = SOUND_PRESETS[name];
  const ctx = ensureAudioContext();
  if (!preset || !ctx) return;

  if (ctx.state === 'suspended' && !audioUnlocked) {
    return;
  }

  const startTime = ctx.currentTime;
  preset.sequence.forEach(step => {
    const offset = step.offset || 0;
    const duration = step.duration || 0.1;
    const freq = step.freq || 440;
    const gainValue = step.gain ?? 0.2;
    
    // Skip silence (freq = 0) - just wait for the duration
    if (freq === 0 || gainValue === 0) {
      return; // Skip this step (silence/pause)
    }
    
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.type = step.type || 'sine';
    osc.frequency.setValueAtTime(freq, startTime + offset);
    gainNode.gain.setValueAtTime(gainValue, startTime + offset);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + offset + duration);
    osc.connect(gainNode).connect(ctx.destination);
    osc.start(startTime + offset);
    osc.stop(startTime + offset + duration + 0.05);
  });
}

// Map offset (for centering map on canvas)
let mapOffsetX = 0;
let mapOffsetY = 0;

// ====================================
// INITIALIZATION
// ====================================

function initGame() {
  canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('[initGame] Canvas element not found!');
    return;
  }
  
  ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('[initGame] Failed to get 2d context!');
    return;
  }
  
  // Set canvas to exact native resolution (700x730px - game area only)
  // NO SCALING - render at true pixel resolution
  canvas.width = CONFIG.CANVAS_WIDTH;
  canvas.height = CONFIG.CANVAS_HEIGHT;
  
  // CRITICAL: Disable CSS scaling - canvas must render at native size
  canvas.style.width = CONFIG.CANVAS_WIDTH + 'px';
  canvas.style.height = CONFIG.CANVAS_HEIGHT + 'px';
  
  // Enable high-quality image rendering for non-pixel art elements (like logo)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  
  // Calculate map offset (center map in game area: 700x730)
  // Calculate map dimensions dynamically from currentMap
  if (currentMap && currentMap.length > 0) {
    const mapCols = currentMap[0] ? currentMap[0].length : CONFIG.MAP_COLS;
    const mapRows = currentMap.length;
    const mapWidth = mapCols * CONFIG.TILE_SIZE;
    const mapHeight = mapRows * CONFIG.TILE_SIZE;
    mapOffsetX = (CONFIG.CANVAS_WIDTH - mapWidth) / 2; // Center horizontally in 700px
    mapOffsetY = (CONFIG.CANVAS_HEIGHT - mapHeight) / 2; // Center vertically in 730px
  }
  
  // ✅ FIX: KHÔNG gọi loadBrandConfig() ở đây nữa
  // Trong editor mode: loadBrandConfig() đã được gọi trước initGame() với saved gameId
  // Trong public game mode: loadBrandConfig() đã được gọi trước initGame() với gameId từ URL
  // Nếu gọi lại ở đây sẽ ghi đè BRAND_CONFIG.mapIndex về 0 (default)
  
  // ✅ DEBUG: Log mapIndex hiện tại
  const currentGameId = getGameId();
  const lastSavedGameId = localStorage.getItem('pacman_last_saved_game_id');
  console.log('[initGame] BRAND_CONFIG.mapIndex:', BRAND_CONFIG.mapIndex, 'gameId:', currentGameId || lastSavedGameId || 'none');
  
  // ✅ FIX: Load mapIndex from BRAND_CONFIG before initializing level
  // BRAND_CONFIG.mapIndex đã được load từ localStorage trước đó
  const savedMapIndex = BRAND_CONFIG.mapIndex !== undefined ? BRAND_CONFIG.mapIndex : 0;
  mapIndex = savedMapIndex;
  const baseMap = MAPS[mapIndex] || MAPS[0] || [];
  currentMap = baseMap.map(row => [...row]);
  
  console.log('[initGame] Using mapIndex:', mapIndex, 'from BRAND_CONFIG.mapIndex:', BRAND_CONFIG.mapIndex);
  
  // Initialize first level
  try {
    initLevel(1);
  } catch (error) {
    console.error('[initGame] Failed to initialize level:', error);
    // Send error signal to parent if in iframe
    if (window.parent && window.parent !== window) {
      try {
        window.parent.postMessage({
          type: 'PACMAN_GAME_ERROR',
          error: error.message,
          timestamp: Date.now()
        }, '*');
      } catch (err) {
        console.warn('[Pacman] Failed to send error signal:', err);
      }
    }
    return; // Stop initialization if level init fails
  }
  
  // Setup controls
  setupControls();
  
  // Setup mobile controls
  setupMobileControls();

  // Prepare Web Audio unlock for mobile
  setupAudioUnlock();
  
  // ✅ CRITICAL: Auto-focus canvas in public view so arrow keys work immediately without clicking
  // ✅ PHƯƠNG ÁN 3: Thêm preventScroll: true để tránh auto-scroll trên desktop
  // ✅ PHƯƠNG ÁN 4: Chỉ thêm tabindex="0" khi game visible trong viewport để tránh auto-scroll
  if (isPublicView && gameCanvas) {
    // Check if canvas is visible in viewport before adding tabindex and focusing
    const checkVisibility = () => {
      const rect = gameCanvas.getBoundingClientRect();
      const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
      
      if (isVisible) {
        // Only add tabindex when visible to avoid auto-scroll
        if (!gameCanvas.hasAttribute('tabindex')) {
          gameCanvas.setAttribute('tabindex', '0');
        }
        // Use setTimeout to ensure canvas is fully rendered before focusing
        setTimeout(() => {
          gameCanvas.focus({ preventScroll: true });
          console.log('[Pacman] Canvas auto-focused for keyboard input');
        }, 100);
      } else {
        // If not visible, retry after a short delay
        setTimeout(checkVisibility, 200);
      }
    };
    
    // Start checking visibility
    checkVisibility();
  }
  
  // Start game loop
  gameLoop();
  
  // MemePlay integration
  setupMemePlayIntegration();
  
  // ✅ Setup Tap to Start overlay
  setupTapToStart();
  
  // ✅ Send ready signal immediately after successful init
  if (window.parent && window.parent !== window) {
    try {
      const gameId = getGameId();
      window.parent.postMessage({
        type: 'PACMAN_GAME_READY',
        gameId: gameId,
        timestamp: Date.now()
      }, '*');
      console.log('[Pacman] Sent ready signal to parent (immediate)');
    } catch (err) {
      console.warn('[Pacman] Failed to send ready signal:', err);
    }
  }
}

function initLevel(level) {
  currentLevel = level;
  
  // ✅ FIX: Đơn giản hóa logic - CHỈ dùng BRAND_CONFIG.mapIndex (đã load từ localStorage)
  // Không phụ thuộc vào dropdown value vì dropdown có thể chưa được set khi initLevel() chạy
  // Dropdown chỉ để hiển thị và để user chọn map mới (sẽ được xử lý trong event listener)
  const selectedMapIndex = BRAND_CONFIG.mapIndex !== undefined ? BRAND_CONFIG.mapIndex : 0; // Default Map 1
  
  mapIndex = selectedMapIndex;
  const baseMap = MAPS[mapIndex] || MAPS[0] || [];
  currentMap = baseMap.map(row => [...row]);
  
  console.log('[initLevel] Using mapIndex:', mapIndex, 'from BRAND_CONFIG.mapIndex:', BRAND_CONFIG.mapIndex);
  
  // Calculate ghost count (Level 1 = 3 ghosts, then +1 per level)
  ghostCount = Math.min(CONFIG.MIN_GHOSTS + Math.max(0, level - 1), CONFIG.MAX_GHOSTS);
  
  // Reset fragments
  fragmentsCollected = 0;
  fragments = [];
  exitGate = null;
  gateBlinkTimer = 0;
  
  // Reset ghost AI state
  ghostSpeedMultiplier = 0.25; // Start at 25% of Pacman speed
  firstFragmentEaten = false;
  ghostFreezeTimer = 0;
  ghostGlowTimer = 0;
  ghostGlowState = 'none';
  ghostPendingBoost = 0;
  firstFragmentEaten = false;
  ghostFreezeTimer = 0;
  ghostGlowTimer = 0;
  ghostGlowState = 'none';
  ghostPendingBoost = 0;
  
  // ✅ CRITICAL: Find player spawn (first path tile) and force reset position
  const spawnPos = findFirstPathTile();
  const spawnX = mapOffsetX + spawnPos.col * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  const spawnY = mapOffsetY + spawnPos.row * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  
  // Force snap to exact spawn position
  player.x = Math.round(spawnX);
  player.y = Math.round(spawnY);
  
  // ✅ CRITICAL: In public view, don't set direction until user interacts
  // This prevents Pacman from moving automatically when game loads
  if (isPublicView) {
    player.direction = null; // No direction until user swipes/presses arrow keys
    player.nextDirection = null;
  } else {
    player.direction = 'right';
    player.nextDirection = 'right';
  }
  
  // Reset player animation
  player.animationFrame = 0;
  
  // Spawn fragments
  spawnFragments();
  
  // Spawn ghosts
  spawnGhosts();
  
  // Update HUD
  updateHUD();
}

function findFirstPathTile() {
  // Find leftmost path tile (top-left corner)
  let leftmostCol = Infinity;
  let leftmostRow = 1;
  
  for (let row = 0; row < currentMap.length; row++) {
    for (let col = 0; col < currentMap[row].length; col++) {
      if (currentMap[row][col] === 0 && col < leftmostCol) {
        leftmostCol = col;
        leftmostRow = row;
      }
    }
  }
  
  return { row: leftmostRow, col: leftmostCol };
}

// ====================================
// FRAGMENT SYSTEM
// ====================================

function spawnFragments() {
  fragments = [];
  const pathTiles = getPathTiles(currentMap);
  
  // Shuffle and take 5 random path tiles
  const shuffled = pathTiles.sort(() => Math.random() - 0.5);
  const selectedTiles = shuffled.slice(0, CONFIG.FRAGMENTS_PER_LEVEL);
  
  selectedTiles.forEach((tile, index) => {
    fragments.push({
      row: tile[0],
      col: tile[1],
      x: mapOffsetX + tile[1] * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
      y: mapOffsetY + tile[0] * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
      label: CONFIG.FRAGMENT_LABELS[index],
      color: CONFIG.FRAGMENT_COLORS[index],
      collected: false
    });
  });
}

function checkFragmentCollection() {
  const playerTileCol = Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE);
  const playerTileRow = Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE);
  
  fragments.forEach(fragment => {
    if (!fragment.collected) {
      const fragmentTileCol = fragment.col;
      const fragmentTileRow = fragment.row;
      
      if (playerTileRow === fragmentTileRow && playerTileCol === fragmentTileCol) {
        fragment.collected = true;
        fragmentsCollected++;
        score += 100;
        playSound('fragmentPickup');
        updateHUD();
        
        // Ghost speed scaling (new system)
        if (!firstFragmentEaten) {
          handleFirstFragmentBoost();
        } else {
          applyGhostSpeedScaling(0.20);
          if (fragmentsCollected === 3) {
            ghostGlowState = 'red';
            ghostGlowTimer = Number.POSITIVE_INFINITY;
            playSound('ghostRedAlert'); // Long alert sound when ghost turns red (3rd fragment)
          }
        }
        
        // Check if all fragments collected
        if (fragmentsCollected >= CONFIG.FRAGMENTS_PER_LEVEL) {
          spawnExitGate();
        }
      }
    }
  });
}

function spawnExitGate() {
  const gatePositions = getGatePositions(mapIndex);
  const randomGate = gatePositions[Math.floor(Math.random() * gatePositions.length)];
  
  exitGate = {
    row: randomGate[0],
    col: randomGate[1],
    x: mapOffsetX + randomGate[1] * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
    y: mapOffsetY + randomGate[0] * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2,
    visible: true
  };
  playSound('portalOpen');
}

function checkExitGate() {
  if (!exitGate) return;
  
  const playerTileCol = Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE);
  const playerTileRow = Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE);
  
  if (playerTileRow === exitGate.row && playerTileCol === exitGate.col) {
    // Level complete!
    playSound('levelComplete');
    currentLevel++;
    initLevel(currentLevel);
  }
}

// ====================================
// GHOST SYSTEM
// ====================================

function spawnGhosts() {
  ghosts = [];
  const pathTiles = getPathTiles(currentMap);
  
  // Spawn ghosts at rightmost tiles (top-right corner)
  const playerTile = {
    row: Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE),
    col: Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE)
  };
  
  // Find rightmost path tiles (avoid player spawn)
  const availableTiles = pathTiles.filter(tile => 
    !(tile[0] === playerTile.row && tile[1] === playerTile.col)
  );
  
  // Sort by column (descending) to get rightmost tiles
  const sortedByCol = availableTiles.sort((a, b) => b[1] - a[1]);
  
  // Get rightmost tiles, prefer middle rows for better spawn
  const rightmostCol = sortedByCol[0][1];
  const rightmostTiles = sortedByCol.filter(tile => tile[1] === rightmostCol);
  
  // Sort rightmost tiles by row (prefer middle rows)
  rightmostTiles.sort((a, b) => {
    const midRow = currentMap.length / 2;
    return Math.abs(a[0] - midRow) - Math.abs(b[0] - midRow);
  });
  
  // Take up to ghostCount tiles from rightmost area
  const spawnTiles = rightmostTiles.slice(0, ghostCount);
  
  // If not enough rightmost tiles, add more from nearby columns
  if (spawnTiles.length < ghostCount) {
    const nearbyTiles = sortedByCol.filter(tile => 
      tile[1] >= rightmostCol - 2 && !spawnTiles.some(st => st[0] === tile[0] && st[1] === tile[1])
    );
    spawnTiles.push(...nearbyTiles.slice(0, ghostCount - spawnTiles.length));
  }
  
  spawnTiles.forEach((tile, index) => {
    // Classic ghost colors: Red, Pink, Cyan, Orange
    const ghostColors = [
      { body: '#FF0000', eyes: '#FFFFFF' }, // Red
      { body: '#FFB8FF', eyes: '#FFFFFF' }, // Pink
      { body: '#00FFFF', eyes: '#FFFFFF' }, // Cyan
      { body: '#FFB851', eyes: '#FFFFFF' }, // Orange
      { body: '#FF00FF', eyes: '#FFFFFF' }, // Magenta
      { body: '#00FF00', eyes: '#FFFFFF' }, // Green
      { body: '#FFFF00', eyes: '#FFFFFF' }, // Yellow
      { body: '#0000FF', eyes: '#FFFFFF' }  // Blue
    ];
    
    const row = tile[0];
    const col = tile[1];
    
    // ✅ CRITICAL: Verify this tile is actually walkable (double-check)
    if (!isWalkableTileValue(currentMap[row][col])) {
      console.warn(`⚠️ Spawn tile [${row}, ${col}] is not walkable, skipping ghost ${index}`);
      return; // Skip this ghost if tile is not walkable
    }
    
    // Find valid directions from spawn tile
    const validDirections = [];
    const directions = ['up', 'down', 'left', 'right'];
    
    directions.forEach(dir => {
      let checkRow = row;
      let checkCol = col;
      
      switch(dir) {
        case 'up': checkRow--; break;
        case 'down': checkRow++; break;
        case 'left': checkCol--; break;
        case 'right': checkCol++; break;
      }
      
      // Check if next tile is valid path
      if (checkRow >= 0 && checkRow < currentMap.length &&
          checkCol >= 0 && checkCol < currentMap[0].length &&
          isWalkableTileValue(currentMap[checkRow][checkCol])) {
        validDirections.push(dir);
      }
    });
    
    // ✅ CRITICAL: Only spawn if tile has at least ONE valid direction
    if (validDirections.length === 0) {
      console.warn(`⚠️ Spawn tile [${row}, ${col}] has no valid directions, finding alternative...`);
      // Find alternative tile that has valid directions
      const alternativeTiles = availableTiles.filter(t => {
        if (t[0] === row && t[1] === col) return false; // Skip current tile
        if (spawnTiles.slice(0, index).some(st => st[0] === t[0] && st[1] === t[1])) return false; // Skip already used
        
        // Check if this alternative tile has valid directions
        const altRow = t[0];
        const altCol = t[1];
        if (!isWalkableTileValue(currentMap[altRow][altCol])) return false;
        
        let hasValidDir = false;
        for (let dir of directions) {
          let testRow = altRow;
          let testCol = altCol;
          switch(dir) {
            case 'up': testRow--; break;
            case 'down': testRow++; break;
            case 'left': testCol--; break;
            case 'right': testCol++; break;
          }
          if (testRow >= 0 && testRow < currentMap.length &&
              testCol >= 0 && testCol < currentMap[0].length &&
              isWalkableTileValue(currentMap[testRow][testCol])) {
            hasValidDir = true;
            break;
          }
        }
        return hasValidDir;
      });
      
      if (alternativeTiles.length > 0) {
        // Use alternative tile
        const newTile = alternativeTiles[0];
        spawnTiles[index] = newTile;
        // Re-check valid directions with new tile
        validDirections.length = 0;
        directions.forEach(dir => {
          let checkRow = newTile[0];
          let checkCol = newTile[1];
          switch(dir) {
            case 'up': checkRow--; break;
            case 'down': checkRow++; break;
            case 'left': checkCol--; break;
            case 'right': checkCol++; break;
          }
          if (checkRow >= 0 && checkRow < currentMap.length &&
              checkCol >= 0 && checkCol < currentMap[0].length &&
              isWalkableTileValue(currentMap[checkRow][checkCol])) {
            validDirections.push(dir);
          }
        });
        // Update row/col for rest of function
        row = newTile[0];
        col = newTile[1];
      } else {
        console.warn(`⚠️ No alternative tile found for ghost ${index}, skipping`);
        return; // Skip this ghost if no valid spawn location
      }
    }
    
    // Choose a valid direction (prefer horizontal movement for better gameplay)
    let spawnDirection = validDirections.find(dir => dir === 'left' || dir === 'right') ||
                         validDirections[Math.floor(Math.random() * validDirections.length)];
    
    const colorIndex = index % ghostColors.length;
    // ✅ CRITICAL: Ensure exact center of tile for proper collision detection
    // Use row/col (may have been updated to alternative tile)
    const ghostX = mapOffsetX + col * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    const ghostY = mapOffsetY + row * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    const snappedX = Math.round(ghostX);
    const snappedY = Math.round(ghostY);
    
    // ✅ CRITICAL: Verify ghost can actually move in spawn direction before creating
    const testGhost = { x: snappedX, y: snappedY, direction: spawnDirection, size: CONFIG.GHOST_SIZE };
    if (!canGhostMove(testGhost, spawnDirection, CONFIG.TILE_SIZE / 4)) {
      // If can't move, try another valid direction
      const workingDir = validDirections.find(dir => {
        testGhost.direction = dir;
        return canGhostMove(testGhost, dir, CONFIG.TILE_SIZE / 4);
      });
      if (workingDir) {
        spawnDirection = workingDir;
      } else {
        console.warn(`⚠️ Ghost ${index} cannot move in any direction from spawn, skipping`);
        return; // Skip if truly stuck
      }
    }
    
    ghosts.push({
      x: snappedX,
      y: snappedY,
      direction: spawnDirection,
      size: CONFIG.GHOST_SIZE,
      color: ghostColors[colorIndex].body,
      eyeColor: ghostColors[colorIndex].eyes,
      animationFrame: 0,
      stuckTime: 0,
      blockedTime: 0,
      lastX: snappedX,
      lastY: snappedY,
      randomInterval: randomFloat(0.5, 1.2) * 1000,
      timeSinceLastRandom: 0,
      isChasing: false
    });
  });
  
}

// ====================================
// GHOST AI - MAIN UPDATE FUNCTION
// ====================================

function updateGhost(ghost, deltaTime) {
  if (ghostGlowTimer > 0) {
    ghostGlowTimer = Math.max(0, ghostGlowTimer - deltaTime);
  }
  
  if (ghostFreezeTimer > 0) {
    ghostFreezeTimer -= deltaTime;
    if (ghostFreezeTimer <= 0) {
      ghostFreezeTimer = 0;
      if (ghostPendingBoost > 0) {
        applyGhostSpeedScaling(ghostPendingBoost);
        ghostPendingBoost = 0;
      }
    } else {
      return;
    }
  }
  
  if (!ghost.randomInterval) {
    ghost.randomInterval = randomFloat(0.5, 1.2) * 1000;
  }
  ghost.timeSinceLastRandom = (ghost.timeSinceLastRandom || 0) + deltaTime;
  
  const individualMultiplier = Math.min(Math.max(ghostSpeedMultiplier, 0.05), GHOST_MAX_SPEED_MULTIPLIER);
  const effectiveSpeed = player.speed * individualMultiplier;
  const normalizedDelta = Math.min(deltaTime / 16, 2);
  const moveDistance = effectiveSpeed * normalizedDelta;
  
  if (ghost.timeSinceLastRandom >= ghost.randomInterval) {
    ghost.isChasing = Math.random() < 0.3;
    ghost.randomInterval = randomFloat(0.5, 1.2) * 1000;
    ghost.timeSinceLastRandom = 0;
    const newDir = ghost.isChasing
      ? getChaseDirection(ghost)
      : getRandomValidDirectionForGhost(ghost);
    if (newDir) {
      ghost.direction = newDir;
    }
  }
  
  if (ghost.isChasing) {
    const chaseDir = getChaseDirection(ghost);
    if (chaseDir) {
      ghost.direction = chaseDir;
    }
  }
  
  const vector = DIRECTION_VECTORS[ghost.direction] || { x: 0, y: 0 };
  const canAdvance = canGhostMove(ghost, ghost.direction, moveDistance);
  
  if (canAdvance) {
    ghost.x += vector.x * moveDistance;
    ghost.y += vector.y * moveDistance;
    ghost.blockedTime = 0;
  } else {
    ghost.blockedTime = (ghost.blockedTime || 0) + deltaTime;
    if (ghost.blockedTime >= 200) {
      const alternate = ghost.isChasing
        ? getChaseDirection(ghost)
        : getRandomValidDirectionForGhost(ghost);
      if (alternate) {
        ghost.direction = alternate;
      }
      ghost.blockedTime = 0;
    }
  }
  
  clampGhostToBounds(ghost);
  
  const movedDistance = Math.hypot(ghost.x - ghost.lastX, ghost.y - ghost.lastY);
  if (movedDistance < 0.5) {
    ghost.stuckTime += deltaTime;
  } else {
    ghost.stuckTime = 0;
  }
  
  if (ghost.stuckTime >= 500) {
    const recoveryDir = ghost.isChasing
      ? getChaseDirection(ghost)
      : getRandomValidDirectionForGhost(ghost);
    if (recoveryDir) {
      ghost.direction = recoveryDir;
    }
    ghost.stuckTime = 0;
  }
  
  ghost.lastX = ghost.x;
  ghost.lastY = ghost.y;
}

function updateGhosts(deltaTime) {
  ghosts.forEach(ghost => {
    updateGhost(ghost, deltaTime);
  });
  resolveGhostCollisions();
}

// ====================================
// GHOST MOVEMENT FUNCTIONS
// ====================================

// ====================================
// GHOST MOVEMENT HELPERS (NEW SYSTEM)
// ====================================

function canGhostMove(ghost, direction, distance = CONFIG.TILE_SIZE / 2) {
  if (!currentMap || currentMap.length === 0) return false;
  const vector = DIRECTION_VECTORS[direction];
  if (!vector) return false;
  
  const nextX = ghost.x + vector.x * distance;
  const nextY = ghost.y + vector.y * distance;
  const tileCol = Math.floor((nextX - mapOffsetX) / CONFIG.TILE_SIZE);
  const tileRow = Math.floor((nextY - mapOffsetY) / CONFIG.TILE_SIZE);
  
  if (tileRow < 0 || tileRow >= currentMap.length ||
      tileCol < 0 || tileCol >= currentMap[0].length) {
    return false;
  }
  
  return isWalkableTileValue(currentMap[tileRow][tileCol]);
}

// Helper function to get opposite direction
function getOppositeDirection(dir) {
  const opposites = {
    'up': 'down',
    'down': 'up',
    'left': 'right',
    'right': 'left'
  };
  return opposites[dir] || dir;
}

// ====================================
// GHOST AI HELPER FUNCTIONS
// ====================================

function getChaseDirection(ghost) {
  const dx = player.x - ghost.x;
  const dy = player.y - ghost.y;
  const horizontalPriority = Math.abs(dx) >= Math.abs(dy);
  const primary = horizontalPriority
    ? (dx >= 0 ? 'right' : 'left')
    : (dy >= 0 ? 'down' : 'up');
  const secondary = horizontalPriority
    ? (dy >= 0 ? 'down' : 'up')
    : (dx >= 0 ? 'right' : 'left');
  
  if (canGhostMove(ghost, primary)) return primary;
  if (canGhostMove(ghost, secondary)) return secondary;
  return getRandomValidDirectionForGhost(ghost);
}

function getRandomValidDirectionForGhost(ghost, preferredDirection = null) {
  const directions = ["up", "down", "left", "right"];
  const validDirections = directions.filter(dir => canGhostMove(ghost, dir));
  
  if (preferredDirection && canGhostMove(ghost, preferredDirection)) {
    return preferredDirection;
  }
  
  if (!validDirections.length) {
    return null;
  }
  
  const opposite = getOppositeDirection(ghost.direction);
  const filtered = validDirections.filter(dir => dir !== opposite);
  const choices = filtered.length ? filtered : validDirections;
  return choices[Math.floor(Math.random() * choices.length)];
}

function resolveGhostCollisions() {
  for (let i = 0; i < ghosts.length; i++) {
    for (let j = i + 1; j < ghosts.length; j++) {
      const ghostA = ghosts[i];
      const ghostB = ghosts[j];
      const dx = ghostB.x - ghostA.x;
      const dy = ghostB.y - ghostA.y;
      const distance = Math.hypot(dx, dy);
      if (distance > 0 && distance < GHOST_REPEL_DISTANCE) {
        applyRepelForce(ghostA, ghostB, dx, dy, distance);
      }
    }
  }
}

function applyRepelForce(ghostA, ghostB, dx, dy, distance) {
  const overlap = (GHOST_REPEL_DISTANCE - distance) / 2;
  const nx = dx / distance;
  const ny = dy / distance;
  ghostA.x -= nx * overlap;
  ghostA.y -= ny * overlap;
  ghostB.x += nx * overlap;
  ghostB.y += ny * overlap;
  clampGhostToBounds(ghostA);
  clampGhostToBounds(ghostB);
}

function clampGhostToBounds(ghost) {
  const mapCols = currentMap[0] ? currentMap[0].length : CONFIG.MAP_COLS;
  const mapRows = currentMap.length;
  const mapWidth = mapCols * CONFIG.TILE_SIZE;
  const mapHeight = mapRows * CONFIG.TILE_SIZE;
  ghost.x = Math.min(Math.max(ghost.x, mapOffsetX), mapOffsetX + mapWidth);
  ghost.y = Math.min(Math.max(ghost.y, mapOffsetY), mapOffsetY + mapHeight);
}

function applyGhostSpeedScaling(amount) {
  if (typeof amount !== 'number' || Number.isNaN(amount) || amount <= 0) return;
  ghostSpeedMultiplier = Math.min(ghostSpeedMultiplier + amount, GHOST_MAX_SPEED_MULTIPLIER);
}

function handleFirstFragmentBoost() {
  firstFragmentEaten = true;
  ghostFreezeTimer = 2000;
  ghostGlowTimer = Number.POSITIVE_INFINITY;
  ghostGlowState = 'yellow';
  ghostPendingBoost = 0.25;
  flashBorder();
  playSound('ghostYellowGlow'); // Sound when ghost glows yellow for first time
}

function checkGhostCollision() {
  ghosts.forEach(ghost => {
    const dx = player.x - ghost.x;
    const dy = player.y - ghost.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance < (player.size / 2 + ghost.size / 2)) {
      // Game over
      gameOver();
    }
  });
}

// ====================================
// PLAYER MOVEMENT
// ====================================

// Helper function to snap player to tile center
function snapToGrid() {
  // Use floor to get current tile, then snap to center
  const tileCol = Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE);
  const tileRow = Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE);
  
  // Ensure tile is within bounds (calculate from currentMap)
  const mapCols = currentMap[0] ? currentMap[0].length : CONFIG.MAP_COLS;
  const mapRows = currentMap.length;
  if (tileCol >= 0 && tileCol < mapCols && 
      tileRow >= 0 && tileRow < mapRows) {
    player.x = mapOffsetX + tileCol * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    player.y = mapOffsetY + tileRow * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  }
}

// Helper function to check if player is at tile center
function isAtCenter(threshold = 0.1) {
  const tileCol = Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE);
  const tileRow = Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE);
  
  const targetCenterX = mapOffsetX + tileCol * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  const targetCenterY = mapOffsetY + tileRow * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  
  const dx = Math.abs(player.x - targetCenterX);
  const dy = Math.abs(player.y - targetCenterY);
  
  return dx < threshold && dy < threshold;
}

function updatePlayer(deltaTime = 16) {
  // ✅ CRITICAL: In public view, don't move until user has interacted
  if (isPublicView && !hasSentGameStart) {
    return;
  }
  
  // Get input direction
  let inputDir = null;
  
  if (mobileDirection) {
    inputDir = mobileDirection;
  } else {
    if (keys['ArrowUp'] || keys['w'] || keys['W']) inputDir = 'up';
    if (keys['ArrowDown'] || keys['s'] || keys['S']) inputDir = 'down';
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) inputDir = 'left';
    if (keys['ArrowRight'] || keys['d'] || keys['D']) inputDir = 'right';
  }
  
  if (inputDir) {
    player.nextDirection = inputDir;
    
    // Allow immediate direction change - no snap to avoid stuttering
    // Auto-align logic below will handle smooth grid alignment
    if (canMoveInDirection(player.nextDirection)) {
      player.direction = player.nextDirection;
      // Don't snap - let auto-align handle smooth movement
    }
  }
  
  if (!player.direction) {
    return;
  }
  
  // FIX 1: Allow turning at walls even if not perfectly centered
  // This prevents Pacman from getting stuck when hitting a wall
  if (!canMoveInDirection(player.direction)) {
    if (canMoveInDirection(player.nextDirection)) {
      player.direction = player.nextDirection;
      // Only snap when hitting wall to prevent getting stuck
      snapToGrid();
      return; // New direction will be processed next frame
    }
    return; // Can't move in current direction and can't turn - stop here
  }
  
  // FIX 3: Move player with deltaTime for consistent speed
  // Normalize deltaTime to 60fps (16ms per frame)
  const normalizedDelta = Math.min(deltaTime / 16, 2); // Cap at 2x to prevent large jumps
  const moveDistance = player.speed * normalizedDelta;
  
  switch(player.direction) {
    case 'up': player.y -= moveDistance; break;
    case 'down': player.y += moveDistance; break;
    case 'left': player.x -= moveDistance; break;
    case 'right': player.x += moveDistance; break;
  }
  player.lastDirection = player.direction;
  
  // FIX 3: Auto-align to grid axis when moving (allows smooth wall sliding)
  // This makes Pacman slide smoothly along walls like the arcade version
  const playerTileCol = Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE);
  const playerTileRow = Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE);
  
  const targetCenterX = mapOffsetX + playerTileCol * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  const targetCenterY = mapOffsetY + playerTileRow * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
  
  // Auto-align to perpendicular axis when moving horizontally
  // This allows smooth sliding along vertical walls
  if (player.direction === 'left' || player.direction === 'right') {
    if (Math.abs(player.y - targetCenterY) < 1.2) {
      player.y = targetCenterY;
    }
  }
  
  // Auto-align to perpendicular axis when moving vertically
  // This allows smooth sliding along horizontal walls
  if (player.direction === 'up' || player.direction === 'down') {
    if (Math.abs(player.x - targetCenterX) < 1.2) {
      player.x = targetCenterX;
    }
  }
  
  // Keep player within map bounds (game area only - calculate from currentMap)
  const mapCols = currentMap[0] ? currentMap[0].length : CONFIG.MAP_COLS;
  const mapRows = currentMap.length;
  const mapWidth = mapCols * CONFIG.TILE_SIZE;
  const mapHeight = mapRows * CONFIG.TILE_SIZE;
  const minX = mapOffsetX;
  const maxX = mapOffsetX + mapWidth;
  const minY = mapOffsetY;
  const maxY = mapOffsetY + mapHeight;
  
  if (player.x < minX) {
    player.x = minX;
    snapToGrid();
  }
  if (player.x > maxX) {
    player.x = maxX;
    snapToGrid();
  }
  if (player.y < minY) {
    player.y = minY;
    snapToGrid();
  }
  if (player.y > maxY) {
    player.y = maxY;
    snapToGrid();
  }
}

function canMoveInDirection(direction) {
  // Use floor to get current tile
  const tileCol = Math.floor((player.x - mapOffsetX) / CONFIG.TILE_SIZE);
  const tileRow = Math.floor((player.y - mapOffsetY) / CONFIG.TILE_SIZE);
  
  // Calculate sprite bounds (hitbox) for accurate collision
  const halfSize = player.size / 2;
  const spriteLeft = player.x - halfSize;
  const spriteRight = player.x + halfSize;
  const spriteTop = player.y - halfSize;
  const spriteBottom = player.y + halfSize;
  
  // Calculate next tile position
  let nextCol = tileCol;
  let nextRow = tileRow;
  
  switch(direction) {
    case 'up':    nextRow -= 1; break;
    case 'down':  nextRow += 1; break;
    case 'left':  nextCol -= 1; break;
    case 'right': nextCol += 1; break;
  }
  
  // Calculate next tile boundaries
  const nextTileLeft = mapOffsetX + nextCol * CONFIG.TILE_SIZE;
  const nextTileRight = nextTileLeft + CONFIG.TILE_SIZE;
  const nextTileTop = mapOffsetY + nextRow * CONFIG.TILE_SIZE;
  const nextTileBottom = nextTileTop + CONFIG.TILE_SIZE;
  
  // Check if sprite edge will cross into next tile boundary
  let willCrossEdge = false;
  
  switch(direction) {
    case 'up':
      // Check if top edge will cross tile bottom boundary
      willCrossEdge = (spriteTop - player.speed) <= nextTileBottom;
      break;
    case 'down':
      // Check if bottom edge will cross tile top boundary
      willCrossEdge = (spriteBottom + player.speed) >= nextTileTop;
      break;
    case 'left':
      // Check if left edge will cross tile right boundary
      willCrossEdge = (spriteLeft - player.speed) <= nextTileRight;
      break;
    case 'right':
      // Check if right edge will cross tile left boundary
      willCrossEdge = (spriteRight + player.speed) >= nextTileLeft;
      break;
  }
  
  // If sprite edge won't cross into next tile, movement is safe
  if (!willCrossEdge) {
    return true; // Still within current tile
  }
  
  // Check if next tile is valid
  if (nextRow < 0 || nextRow >= currentMap.length ||
      nextCol < 0 || nextCol >= currentMap[0].length) {
    return false;
  }
  
  // Check if next tile is a path (0) or wall (1)
  return isWalkableTileValue(currentMap[nextRow][nextCol]);
}

// ====================================
// RENDERING
// ====================================

function render() {
  renderToCanvas(canvas, ctx);
}

function renderToCanvas(targetCanvas, targetCtx) {
  // Clear entire canvas (game area only - 700x730)
  targetCtx.fillStyle = CONFIG.PATH_COLOR;
  targetCtx.fillRect(0, 0, targetCanvas.width, targetCanvas.height);
  
  // Draw map (full canvas - game area only)
  drawMapToCanvas(targetCtx);
  
  // Draw fragments
  drawFragmentsToCanvas(targetCtx);
  
  // Draw exit gate
  if (exitGate) {
    drawExitGateToCanvas(targetCtx);
  }
  
  // Draw ghosts
  drawGhostsToCanvas(targetCtx);
  
  // Draw player
  drawPlayerToCanvas(targetCtx);
}

function drawMap() {
  drawMapToCanvas(ctx);
}

function drawMapToCanvas(targetCtx) {
  // Use custom map color from BRAND_CONFIG, fallback to default
  const wallColor = BRAND_CONFIG.mapColor || CONFIG.WALL_COLOR;
  
  for (let row = 0; row < currentMap.length; row++) {
    for (let col = 0; col < currentMap[row].length; col++) {
      const x = mapOffsetX + col * CONFIG.TILE_SIZE;
      const y = mapOffsetY + row * CONFIG.TILE_SIZE;
      
      if (currentMap[row][col] === 1) {
        // Wall
        targetCtx.fillStyle = wallColor;
        targetCtx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
      }
    }
  }
}

function drawFragments() {
  drawFragmentsToCanvas(ctx);
}

function drawFragmentsToCanvas(targetCtx) {
  fragments.forEach(fragment => {
    if (!fragment.collected) {
      // Draw fragment logo (BNB) if available, otherwise draw colored circle with label
      if (BRAND_CONFIG.fragmentLogo && BRAND_CONFIG.fragmentLogo.complete) {
        const logoSize = CONFIG.FRAGMENT_SIZE * 1.5; // Slightly larger for logo
        targetCtx.save();
        targetCtx.drawImage(
          BRAND_CONFIG.fragmentLogo,
          fragment.x - logoSize / 2,
          fragment.y - logoSize / 2,
          logoSize,
          logoSize
        );
        targetCtx.restore();
      } else {
        // Fallback: draw colored circle with label
        targetCtx.fillStyle = fragment.color;
        targetCtx.beginPath();
        targetCtx.arc(fragment.x, fragment.y, CONFIG.FRAGMENT_SIZE / 2, 0, Math.PI * 2);
        targetCtx.fill();
        
        // Draw label
        targetCtx.fillStyle = '#000';
        targetCtx.font = 'bold 12px Arial';
        targetCtx.textAlign = 'center';
        targetCtx.textBaseline = 'middle';
        targetCtx.fillText(fragment.label, fragment.x, fragment.y);
      }
    }
  });
}

function drawExitGate() {
  drawExitGateToCanvas(ctx);
}

function drawExitGateToCanvas(targetCtx) {
  if (!exitGate) return;
  
  gateBlinkTimer += 16; // ~60fps
  const blink = Math.floor(gateBlinkTimer / CONFIG.GATE_BLINK_INTERVAL) % 2;
  
  targetCtx.fillStyle = blink === 0 ? CONFIG.GATE_COLOR : CONFIG.GATE_COLOR_ALT;
  targetCtx.fillRect(
    exitGate.x - CONFIG.GATE_SIZE / 2,
    exitGate.y - CONFIG.GATE_SIZE / 2,
    CONFIG.GATE_SIZE,
    CONFIG.GATE_SIZE
  );
  
  // Gate symbol removed - just show blinking gate
}

function drawGhosts() {
  drawGhostsToCanvas(ctx);
}

function drawGhostsToCanvas(targetCtx) {
  const glowState = ghostGlowState;
  const glowActive = glowState && glowState !== 'none';
  // Mobile scale: 20% larger on mobile
  const isMobile = window.innerWidth <= 992;
  const mobileScale = isMobile ? 1.2 : 1.0;
  
  ghosts.forEach(ghost => {
    // Update animation frame for walking animation
    ghost.animationFrame = (ghost.animationFrame || 0) + 0.15;
    
    const size = ghost.size * mobileScale;
    const x = ghost.x;
    const y = ghost.y;
    
    // Draw ghost body (rounded top, animated wavy bottom)
    targetCtx.save();
    
    if (glowActive) {
      if (glowState === 'red') {
        targetCtx.shadowColor = "rgba(255, 0, 0, 0.85)";
        targetCtx.shadowBlur = 35;
      } else {
        targetCtx.shadowColor = "rgba(255, 255, 0, 0.65)";
        targetCtx.shadowBlur = 25;
      }
    } else {
      targetCtx.shadowColor = "transparent";
      targetCtx.shadowBlur = 0;
    }
    
    targetCtx.fillStyle = ghost.color;
    targetCtx.beginPath();
    
    // Top rounded part (semi-circle)
    targetCtx.arc(x, y - size / 4, size / 2, Math.PI, 0, false);
    
    // Animated wavy bottom (3 waves with animation)
    const waveHeight = size / 8;
    const waveWidth = size / 3;
    const bottomY = y + size / 2;
    
    // Animation offset for walking effect
    const animOffset = Math.sin(ghost.animationFrame) * waveHeight * 0.3;
    
    targetCtx.lineTo(x + size / 2, y);
    targetCtx.lineTo(x + size / 2, bottomY - waveHeight);
    
    // Draw animated wavy bottom (waves move up/down)
    for (let i = 0; i < 3; i++) {
      const waveX = x + size / 2 - (i * waveWidth);
      // Animate each wave with offset based on animation frame
      const wavePhase = (ghost.animationFrame + i * 0.5) % (Math.PI * 2);
      const waveAnimOffset = Math.sin(wavePhase) * waveHeight * 0.4;
      const waveY = bottomY - waveHeight + (i % 2 === 0 ? 0 : waveHeight) + waveAnimOffset;
      
      if (i === 0) {
        targetCtx.lineTo(waveX, waveY);
      } else {
        targetCtx.quadraticCurveTo(
          waveX + waveWidth / 2,
          bottomY - waveHeight / 2 + waveAnimOffset,
          waveX,
          waveY
        );
      }
    }
    
    // Complete the path
    targetCtx.lineTo(x - size / 2, bottomY - waveHeight + animOffset);
    targetCtx.lineTo(x - size / 2, y);
    targetCtx.closePath();
    targetCtx.fill();
    
    // Draw eyes (white circles)
    targetCtx.fillStyle = ghost.eyeColor || '#FFFFFF';
    const eyeSize = size / 6;
    const eyeOffsetX = size / 5;
    const eyeOffsetY = -size / 6;
    
    // Left eye
    targetCtx.beginPath();
    targetCtx.arc(x - eyeOffsetX, y + eyeOffsetY, eyeSize, 0, Math.PI * 2);
    targetCtx.fill();
    
    // Right eye
    targetCtx.beginPath();
    targetCtx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeSize, 0, Math.PI * 2);
    targetCtx.fill();
    
    // Draw pupils (black, looking in direction)
    targetCtx.fillStyle = '#000000';
    const pupilSize = eyeSize / 2;
    let pupilOffsetX = 0;
    let pupilOffsetY = 0;
    
    // Adjust pupil position based on direction
    switch(ghost.direction) {
      case 'left': pupilOffsetX = -pupilSize / 2; break;
      case 'right': pupilOffsetX = pupilSize / 2; break;
      case 'up': pupilOffsetY = -pupilSize / 2; break;
      case 'down': pupilOffsetY = pupilSize / 2; break;
    }
    
    // Left pupil
    targetCtx.beginPath();
    targetCtx.arc(x - eyeOffsetX + pupilOffsetX, y + eyeOffsetY + pupilOffsetY, pupilSize, 0, Math.PI * 2);
    targetCtx.fill();
    
    // Right pupil
    targetCtx.beginPath();
    targetCtx.arc(x + eyeOffsetX + pupilOffsetX, y + eyeOffsetY + pupilOffsetY, pupilSize, 0, Math.PI * 2);
    targetCtx.fill();
    
    // Reset shadow effects
    targetCtx.shadowColor = "transparent";
    targetCtx.shadowBlur = 0;
    
    targetCtx.restore();
  });
}

function drawPlayer() {
  drawPlayerToCanvas(ctx);
}

function drawPlayerToCanvas(targetCtx) {
  // Check if player position is valid
  if (!player || !player.x || !player.y || isNaN(player.x) || isNaN(player.y)) {
    console.error('⚠️ Invalid player position:', player);
    return;
  }
  
  // Mobile scale: 20% larger on mobile
  const isMobile = window.innerWidth <= 992;
  const mobileScale = isMobile ? 1.2 : 1.0;
  const scaledSize = player.size * mobileScale;
  const scaledEyeOffsetX = (isMobile ? 4.8 : 4) * (player.direction === 'up' || player.direction === 'left' ? -1 : 1);
  const scaledEyeY = isMobile ? -7.2 : -6;
  const scaledEyeRadius = isMobile ? 3.6 : 3;
  
  // Draw Pacman (circle with animated mouth)
  targetCtx.fillStyle = '#FFD700';
  targetCtx.beginPath();
  
  // ✅ CRITICAL: If no direction (game not started), show default right-facing direction
  // but don't animate mouth (mouthAnimation will be 0)
  const angle = {
    'up': -Math.PI / 2,
    'down': Math.PI / 2,
    'left': Math.PI,
    'right': 0
  }[player.direction || 'right'] || 0;
  
  // Animated mouth opening/closing (continuous animation)
  const mouthAnimation = Math.sin(player.animationFrame) * 0.15 + 0.25; // Oscillates between 0.1 and 0.4
  const mouthOpen = mouthAnimation;
  
  targetCtx.arc(player.x, player.y, scaledSize / 2, angle + mouthOpen, angle + Math.PI * 2 - mouthOpen);
  targetCtx.lineTo(player.x, player.y);
  targetCtx.fill();
  
  // Draw eye (position changes based on direction)
  targetCtx.fillStyle = '#000';
  targetCtx.beginPath();
  
  // Eye position based on direction
  // Up and Left: eye on the left side
  // Down and Right: eye on the right side
  targetCtx.arc(player.x + scaledEyeOffsetX, player.y + scaledEyeY, scaledEyeRadius, 0, Math.PI * 2);
  targetCtx.fill();
}

function drawHUD() {
  // HUD is drawn via HTML overlay, but we can also draw on canvas if needed
  // The HTML HUD is handled separately
}

// ====================================
// HUD UPDATE
// ====================================

function updateHUD() {
  const scoreEl = document.getElementById('hudScore');
  const levelEl = document.getElementById('hudLevel');
  
  if (scoreEl) scoreEl.textContent = `Score: ${score}`;
  if (levelEl) levelEl.textContent = `LV ${currentLevel}`;
}


// ====================================
// CONTROLS
// ====================================

function setupControls() {
  const isFormElement = (el) => {
    if (!el) return false;
    const tag = el.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
  };
  
  // ✅ Helper function to check if tap to start overlay is visible
  function isTapToStartVisible() {
    const overlay = document.getElementById('tapToStartOverlay');
    return overlay && !overlay.classList.contains('hidden');
  }

  window.addEventListener('keydown', (e) => {
    const key = e.key;
    // ✅ CRITICAL: Block arrow keys if tap to start overlay is visible
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key) && !isFormElement(e.target)) {
      // If overlay is visible, prevent input and show message
      if (isPublicView && isTapToStartVisible()) {
        e.preventDefault();
        e.stopPropagation();
        return; // Block input completely
      }
      
      // Prevent page scrolling with arrow keys (only allow mouse wheel scrolling)
      e.preventDefault();
      e.stopPropagation(); // Also stop propagation to ensure no scroll
      
      // ✅ CRITICAL: Auto-focus canvas if not already focused (for better UX)
      // ✅ PHƯƠNG ÁN 3: Thêm preventScroll: true để tránh auto-scroll trên desktop
      if (isPublicView && gameCanvas && document.activeElement !== gameCanvas) {
        gameCanvas.focus({ preventScroll: true });
      }
      
      requestGameStartFromParent('keyboard');
    }
    keys[key] = true;
    
    // Test maps: Press 1-5 to jump to specific map (only if game started)
    if (e.key >= '1' && e.key <= '5' && !isTapToStartVisible()) {
      const mapNum = parseInt(e.key);
      currentLevel = mapNum;
      initLevel(mapNum);
      console.log(`Switched to Map ${mapNum}`);
    }
  });
  
  window.addEventListener('keyup', (e) => {
    // ✅ CRITICAL: Also prevent default on keyup for arrow keys to ensure no scroll
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isFormElement(e.target)) {
      // Block if overlay is visible
      if (isPublicView && isTapToStartVisible()) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      e.preventDefault();
      e.stopPropagation();
    }
    keys[e.key] = false;
  });
}

function setupMobileControls() {
  const upBtn = document.getElementById('btnUp');
  const downBtn = document.getElementById('btnDown');
  const leftBtn = document.getElementById('btnLeft');
  const rightBtn = document.getElementById('btnRight');
  
  if (upBtn) {
    upBtn.addEventListener('touchstart', () => setMobileDirection('up', 'button'));
    upBtn.addEventListener('touchend', () => clearMobileDirection('button'));
    upBtn.addEventListener('touchcancel', () => clearMobileDirection('button'));
  }
  
  if (downBtn) {
    downBtn.addEventListener('touchstart', () => setMobileDirection('down', 'button'));
    downBtn.addEventListener('touchend', () => clearMobileDirection('button'));
    downBtn.addEventListener('touchcancel', () => clearMobileDirection('button'));
  }
  
  if (leftBtn) {
    leftBtn.addEventListener('touchstart', () => setMobileDirection('left', 'button'));
    leftBtn.addEventListener('touchend', () => clearMobileDirection('button'));
    leftBtn.addEventListener('touchcancel', () => clearMobileDirection('button'));
  }
  
  if (rightBtn) {
    rightBtn.addEventListener('touchstart', () => setMobileDirection('right', 'button'));
    rightBtn.addEventListener('touchend', () => clearMobileDirection('button'));
    rightBtn.addEventListener('touchcancel', () => clearMobileDirection('button'));
  }
  
  // Show mobile controls on mobile devices
  if (window.innerWidth <= 768) {
    const mobileControls = document.querySelector('.mobile-controls');
    if (mobileControls) {
      mobileControls.classList.add('active');
    }
  }

  setupSwipeControls();
  // Footer swipe removed - only Pacman control in game area
}

function setupSwipeControls() {
  const canvasEl = document.getElementById('gameCanvas');
  const wrapperEl = document.querySelector('.game-wrapper');
  // Extend swipe area to the full game container (outer purple frame)
  const containerEl = document.querySelector('.game-container');
  // Fallback to document body to cover any remaining padding area
  const targets = [canvasEl, wrapperEl, containerEl, document.body].filter(Boolean);
  if (targets.length === 0) return;

  let touchStartX = null;
  let touchStartY = null;
  let isSwiping = false;
  const threshold = 30;

  const onTouchStart = (event) => {
    if (event.touches.length !== 1) return;
    // Allow taps on Game Over overlay (e.g., Play Again) to go through so click is not cancelled
    const target = event.target;
    if (target && target.closest('.game-over-screen')) return;
    
    // ✅ CRITICAL: Block swipe if tap to start overlay is visible
    if (isPublicView) {
      const overlay = document.getElementById('tapToStartOverlay');
      if (overlay && !overlay.classList.contains('hidden')) {
        // Allow tap on overlay itself
        if (target && (target.closest('#tapToStartOverlay') || target.closest('#tapToStart'))) {
          return; // Let overlay handle the tap
        }
        // Block swipe input
        return;
      }
    }
    
    // ✅ FIX: preventDefault để ngăn touch events bubble lên parent (giống rocket-bnb, brick-fallen-crypto)
    event.preventDefault();
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isSwiping = true;
  };

  const onTouchMove = (event) => {
    if (!isSwiping || touchStartX === null || touchStartY === null) return;
    const target = event.target;
    if (target && target.closest('.game-over-screen')) return;
    
    // ✅ CRITICAL: Block swipe if tap to start overlay is visible
    if (isPublicView) {
      const overlay = document.getElementById('tapToStartOverlay');
      if (overlay && !overlay.classList.contains('hidden')) {
        return; // Block swipe input
      }
    }
    
    // ✅ FIX: preventDefault để ngăn touch events bubble lên parent
    event.preventDefault();
    const touch = event.touches[0];
    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;

    // Only control Pacman - no scroll logic
    if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
      return;
    }

    isSwiping = false;
    let direction;
    if (Math.abs(dx) > Math.abs(dy)) {
      direction = dx > 0 ? 'right' : 'left';
    } else {
      direction = dy > 0 ? 'down' : 'up';
    }
    setMobileDirection(direction, 'swipe');
  };

  const resetSwipe = (event) => {
    // ✅ FIX: preventDefault để ngăn touch events bubble lên parent
    if (event) event.preventDefault();
    touchStartX = null;
    touchStartY = null;
    isSwiping = false;
  };

  // ✅ FIX: Đổi passive: false để có thể preventDefault (giống rocket-bnb, brick-fallen-crypto)
  targets.forEach(el => {
    el.addEventListener('touchstart', onTouchStart, { passive: false });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', resetSwipe, { passive: false });
    el.addEventListener('touchcancel', resetSwipe, { passive: false });
  });
}

// setupFooterSwipeToEditor removed - swipe in game area only controls Pacman

// ====================================
// GAME LOOP
// ====================================

function gameLoop(timestamp = 0) {
  let deltaTime = timestamp - lastTime;
  
  // Handle first frame (deltaTime will be 0 or very large)
  if (deltaTime === 0 || deltaTime > 100) {
    deltaTime = 16; // Default to ~60fps
  }
  
  lastTime = timestamp;
  
  // Ensure high-quality rendering is always enabled
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  
  const gameplayActive = !isPublicView || hasSentGameStart;
  if (gameState === 'playing' && gameplayActive) {
    // Update animation frames
    player.animationFrame += deltaTime * 0.01; // Animate mouth
    
    // ✅ CRITICAL: Only update player and ghosts when user has interacted (hasSentGameStart = true)
    // This prevents Pacman and ghosts from moving automatically when game loads
    if (hasSentGameStart) {
      updatePlayer(deltaTime);
      updateGhosts(deltaTime);
      checkFragmentCollection();
      checkExitGate();
      checkGhostCollision();
    }
  }
  
  // Always render (even when paused) to show initial state
  if (ctx && canvas) {
    render();
  }
  
  animationFrame = requestAnimationFrame(gameLoop);
}

// ====================================
// FLASH BORDER EFFECT
// ====================================

function flashBorder() {
  const gameWrapper = document.querySelector(".game-wrapper");
  if (!gameWrapper) return;

  gameWrapper.style.boxShadow = "0 0 25px 5px red";
  setTimeout(() => {
    gameWrapper.style.boxShadow = "none";
  }, 200);
}

// ====================================
// GAME OVER
// ====================================

function gameOver() {
  if (isGameOver) return;
  
  playSound('playerHit');
  isGameOver = true;
  gameState = 'gameOver';
  
  const gameOverScreen = document.querySelector('.game-over-screen');
  const finalScoreEl = document.getElementById('finalScore');
  
  if (gameOverScreen) gameOverScreen.classList.add('active');
  if (finalScoreEl) finalScoreEl.textContent = score;
  
  sendScoreToMemePlay();
  
  // Send GAME_OVER message to parent (play-v2.js)
  if (window.parent && window.parent !== window) {
    const gameId = EMBEDDED_GAME_ID || (typeof getGameId === 'function' ? getGameId() : null);
    if (gameId) {
      window.parent.postMessage({ type: 'GAME_OVER', gameId: gameId }, '*');
      console.log('[Pacman] 📤 Sent GAME_OVER to parent:', gameId);
    }
  }
}

function restartGame() {
  isGameOver = false;
  gameState = 'playing'; // Game is ready but waits for user input
  score = 0;
  currentLevel = 1;
  hasSentGameStart = false;
  
  // Reset ghost AI state
  ghostSpeedMultiplier = 0.25; // Start at 25% of Pacman speed
  
  const gameOverScreen = document.querySelector('.game-over-screen');
  if (gameOverScreen) {
    gameOverScreen.classList.remove('active');
  }
  
  // ✅ Hide tap to start overlay on restart (game auto-starts)
  const tapToStartOverlay = document.getElementById('tapToStartOverlay');
  if (tapToStartOverlay) {
    tapToStartOverlay.classList.add('hidden');
  }
  
  // Re-enable high-quality rendering after restart
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  
  // ✅ CRITICAL: Force reset player and ghosts to spawn positions
  initLevel(1);
  
  // Treat Play Again as a fresh user interaction so ghosts move immediately
  requestGameStartFromParent('restart-button');
  
  // Force render to show initial state
  if (ctx && canvas) {
    render();
  }
}

// ====================================
// MEMEPLAY INTEGRATION
// ====================================

// ====================================
// TAP TO START OVERLAY
// ====================================

function setupTapToStart() {
  const tapToStartOverlay = document.getElementById('tapToStartOverlay');
  const tapToStartBtn = document.getElementById('tapToStart');
  
  if (!tapToStartOverlay) {
    console.warn('[Pacman] Tap to start overlay not found');
    return;
  }
  
  // ✅ Show overlay only in public view and when game hasn't started
  // Overlay will be shown/hidden based on game state
  function updateOverlayVisibility() {
    if (isPublicView && !hasSentGameStart) {
      tapToStartOverlay.classList.remove('hidden');
    } else {
      tapToStartOverlay.classList.add('hidden');
    }
  }
  
  // Initial visibility - ensure overlay is visible if game hasn't started
  if (isPublicView && !hasSentGameStart) {
    tapToStartOverlay.classList.remove('hidden');
  }
  
  function handleTapToStart(event) {
    // Prevent event from triggering game movement
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    if (hasSentGameStart) return;
    
    // Hide overlay FIRST before allowing game to start
    tapToStartOverlay.classList.add('hidden');
    
    // Trigger game start AFTER hiding overlay
    requestGameStartFromParent('tap-to-start');
    
    // Unlock audio
    setupAudioUnlock();
    const ctx = ensureAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().then(() => {
        audioUnlocked = true;
      }).catch(() => {});
    } else if (ctx) {
      audioUnlocked = true;
    }
  }
  
  // Add event listeners
  if (tapToStartOverlay) {
    tapToStartOverlay.addEventListener('click', handleTapToStart);
    tapToStartOverlay.addEventListener('touchstart', handleTapToStart, { passive: false });
  }
  
  if (tapToStartBtn) {
    tapToStartBtn.addEventListener('click', handleTapToStart);
    tapToStartBtn.addEventListener('touchstart', handleTapToStart, { passive: false });
  }
}

function setupMemePlayIntegration() {
  const arrowKeys = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
  const arrowToDirection = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right'
  };
  
  const handleRemoteKeyEvent = (data) => {
    if (!data || !arrowKeys.has(data.key)) return;
    const phase = data.phase || data.keyEventType;
    if (phase === 'keydown') {
      keys[data.key] = true;
      const desiredDirection = arrowToDirection[data.key];
      if (desiredDirection) {
        player.nextDirection = desiredDirection;
        if (!player.direction) {
          player.direction = desiredDirection;
        }
      }
      requestGameStartFromParent('keyboard-remote');
    } else if (phase === 'keyup') {
      keys[data.key] = false;
    }
  };
  
  const handleFocusRequest = () => {
    if (gameCanvas) {
      try {
        // ✅ PHƯƠNG ÁN 3: Thêm preventScroll: true để tránh auto-scroll trên desktop
        gameCanvas.focus({ preventScroll: true });
      } catch (err) {
        console.warn('[Pacman] Failed to focus canvas from parent message:', err);
      }
    }
  };
  
  // Listen for messages from parent (MemePlay)
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;
    switch (data.type) {
      case 'GAME_OVER':
        gameOver();
        break;
      case 'PACMAN_KEY_EVENT': // legacy name
      case 'PACMAN_REMOTE_INPUT':
        handleRemoteKeyEvent(data);
        break;
      case 'PACMAN_FOCUS_REQUEST': // legacy
      case 'PACMAN_REMOTE_FOCUS':
        handleFocusRequest();
        break;
      case 'FOCUS_MODE_CHANGED':
        // Update focus toggle button state
        const focusToggleBtn = document.querySelector('.focus-toggle');
        if (focusToggleBtn && data.isFocus !== undefined) {
          focusToggleBtn.setAttribute('aria-pressed', data.isFocus ? 'true' : 'false');
          focusToggleBtn.textContent = data.isFocus ? '⤡' : '⤢';
        }
        break;
      case 'UPDATE_CONFIG':
        // ✅ Bước 4: Nhận config mới từ editor và update ngay lập tức
        if (data.config && typeof loadBrandConfig === 'function') {
          try {
            // Update BRAND_CONFIG với config mới
            BRAND_CONFIG = {
              ...BRAND_CONFIG,
              fragmentLogoUrl: data.config.fragmentLogoUrl || '',
              title: data.config.title || 'Untitled Game',
              smartContract: data.config.smartContract || '',
              mapColor: data.config.mapColor || '#1a1a2e',
              mapIndex: data.config.mapIndex !== undefined ? data.config.mapIndex : 0,
              stories: Array.isArray(data.config.stories) ? data.config.stories : []
            };
            
            // Load logo nếu có
            if (BRAND_CONFIG.fragmentLogoUrl) {
              const img = new Image();
              img.onload = () => {
                BRAND_CONFIG.fragmentLogo = img;
                console.log('[Pacman] ✅ Logo updated from postMessage');
              };
              img.onerror = () => {
                console.warn('[Pacman] Failed to load logo from postMessage');
              };
              img.src = BRAND_CONFIG.fragmentLogoUrl;
            }
            
            // Update map nếu mapIndex thay đổi
            const newMapIndex = BRAND_CONFIG.mapIndex !== undefined ? BRAND_CONFIG.mapIndex : 0;
            if (newMapIndex !== mapIndex) {
              mapIndex = newMapIndex;
              const baseMap = MAPS[mapIndex] || MAPS[0] || [];
              currentMap = baseMap.map(row => [...row]);
              
              // Re-initialize level với map mới (giữ score/level nếu đang chơi)
              if (gameState === 'playing' || gameState === 'ready') {
                try {
                  initLevel(currentLevel);
                  console.log('[Pacman] ✅ Map updated from postMessage (mapIndex:', mapIndex, ')');
                } catch (err) {
                  console.error('[Pacman] Failed to re-init level with new map:', err);
                }
              }
            }
            
            // Update map color nếu thay đổi
            if (data.config.mapColor && data.config.mapColor !== BRAND_CONFIG.mapColor) {
              // Map color được dùng trong render, không cần re-init
              console.log('[Pacman] ✅ Map color updated from postMessage:', data.config.mapColor);
            }
            
            console.log('[Pacman] ✅ Config updated from postMessage (instant):', {
              mapIndex: BRAND_CONFIG.mapIndex,
              mapColor: BRAND_CONFIG.mapColor,
              title: BRAND_CONFIG.title,
              hasLogo: !!BRAND_CONFIG.fragmentLogoUrl
            });
          } catch (err) {
            console.error('[Pacman] Failed to update config from postMessage:', err);
          }
        }
        break;
      default:
        break;
    }
  });
  
  // ====================================
  // FOCUS MODE TOGGLE BUTTON
  // ====================================
  const focusToggleBtn = document.querySelector('.focus-toggle');
  if (focusToggleBtn) {
    const handleFocusToggle = (event) => {
      event.preventDefault();
      event.stopPropagation();
      
      // Get game ID (from embedded game or current game)
      const gameId = EMBEDDED_GAME_ID || (typeof getGameId === 'function' ? getGameId() : null) || 'pacman-template';
      
      // Send message to parent to toggle focus mode
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'TOGGLE_FOCUS_MODE',
          gameId: gameId
        }, '*');
        console.log('[Pacman] 📤 Sent TOGGLE_FOCUS_MODE to parent:', gameId);
      }
    };
    
    // Handle both click (desktop) and touchstart (mobile)
    focusToggleBtn.addEventListener('click', handleFocusToggle);
    focusToggleBtn.addEventListener('touchstart', (event) => {
      // ✅ FIX: Allow touch events on focus button (don't let swipe controls prevent it)
      event.stopPropagation(); // Stop bubbling to swipe handlers
      handleFocusToggle(event);
    }, { passive: false });
  }
}

function sendScoreToMemePlay() {
  // Send score to parent window (MemePlay)
  if (window.parent && window.parent !== window) {
    const message = {
      type: 'GAME_SCORE',
      score: score,
      level: currentLevel
    };
    if (EMBEDDED_GAME_ID) {
      message.gameId = EMBEDDED_GAME_ID;
    }
    window.parent.postMessage(message, '*');
  }
}

function notifyParentGameStart(source = 'auto') {
  if (!EMBEDDED_GAME_ID) return;
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'GAME_START',
      gameId: EMBEDDED_GAME_ID,
      source
    }, '*');
  }
}

// ====================================
// MOBILE GAME SCALE
// ====================================

function applyMobileGameScale() {
  const wrapper = document.querySelector('#gameWrapper .game-wrapper');
  const container = document.getElementById('gameWrapper');
  if (!wrapper || !container) return;

  const viewportWidth = window.innerWidth;
  if (viewportWidth > 992) {
    wrapper.style.transform = 'none';
    wrapper.style.left = 'auto';
    wrapper.style.margin = '0 auto';
    wrapper.style.position = 'static';
    wrapper.style.width = '720px';
    container.style.height = `${wrapper.offsetHeight}px`;
    container.style.minHeight = `${wrapper.offsetHeight}px`;
    return;
  }

  // Mobile: Scale to fit width, ensure full game is visible and centered
  const baseWidth = 720;
  const baseHeight = 800; // 70px HUD + 730px game area
  const containerWidth = container.clientWidth || viewportWidth;
  const scale = containerWidth / baseWidth; // Scale to fit full width
  const scaledHeight = baseHeight * scale;

  // Use margin auto for centering, scale from center
  wrapper.style.position = 'relative';
  wrapper.style.left = 'auto';
  wrapper.style.margin = '0 auto';
  wrapper.style.transformOrigin = 'top center';
  wrapper.style.transform = `scale(${scale})`;
  wrapper.style.width = `${baseWidth}px`;
  wrapper.style.height = `${baseHeight}px`;
  container.style.width = '100%';
  container.style.height = `${scaledHeight}px`;
  container.style.minHeight = `${scaledHeight}px`;
  container.style.overflow = 'visible'; // Ensure nothing is cropped
  container.style.display = 'flex'; // Use flexbox for centering
  container.style.justifyContent = 'center'; // Center horizontally
}

window.addEventListener('resize', applyMobileGameScale);
window.addEventListener('orientationchange', applyMobileGameScale);

// ====================================
// INITIALIZE ON LOAD
// ====================================

window.addEventListener('DOMContentLoaded', async () => {
  // Check if this is a public game link (has ?game= parameter) FIRST
  // Try multiple ways to get game ID
  let gameId = null;
  
  // Check ?game= parameter from URL query string
  const urlParams = new URLSearchParams(window.location.search);
  gameId = urlParams.get('game');
  
  const isPublicGame = gameId !== null && gameId !== '';
  
  console.log('🔍 Game ID Detection:', {
    gameId,
    isPublicGame,
    url: window.location.href,
    search: window.location.search,
    pathname: window.location.pathname,
    hasGetGameId: typeof getGameId === 'function'
  });
  
  // Get DOM elements
  const gameWrapper = document.getElementById('gameWrapper');
  const gameCanvas = document.getElementById('gameCanvas');
  
  if (isPublicGame) {
    // ====================================
    // PUBLIC GAME MODE - Show game, hide editor (V2 only supports Pacman)
    // ====================================
    console.log('🎮 Public game mode - Game ID:', gameId);

    if (document.body && !document.body.classList.contains('public-game-view')) {
      document.body.classList.add('public-game-view');
    }
    
    // CRITICAL: Ensure game ID is in URL if it came from path
    // Vercel rewrite might not pass query param, so we need to add it
    if (!window.location.search.includes('game=')) {
      const newUrl = `${window.location.pathname}?game=${gameId}`;
      if (window.location.pathname !== newUrl) {
        console.log('🔧 Adding game ID to URL:', newUrl);
        window.history.replaceState({}, '', newUrl);
      }
    }
    
    // Show game elements
    if (gameWrapper) {
      gameWrapper.style.display = 'flex';
    }
    if (gameCanvas) {
      gameCanvas.style.display = 'block';
      gameCanvas.style.visibility = 'visible';
    }
    
    // ✅ FIX: Load brand config with correct gameId BEFORE initGame()
    // This ensures mapIndex is loaded from localStorage before initLevel() is called
    const hasLocalBrandConfig = loadBrandConfig(gameId);
    if (!hasLocalBrandConfig) {
      // Try Supabase, but if still no config, use defaults
      const hasSupabaseConfig = await loadBrandConfigFromSupabase(gameId);
      if (!hasSupabaseConfig) {
        // Use default config for playtest
        console.log('[PlayTest] No config found, using defaults');
        BRAND_CONFIG = {
          fragmentLogo: null,
          fragmentLogoUrl: '',
          title: 'Pacman Game',
          smartContract: '',
          mapColor: '#1a1a2e',
          mapIndex: 0,
          stories: []
        };
      }
    }
    
    // Initialize game (this will start game loop)
    initGame();
    
    // Ensure game is ready and visible
    setTimeout(() => {
      if (gameWrapper) {
        gameWrapper.style.display = 'flex';
        gameWrapper.style.visibility = 'visible';
        gameWrapper.style.opacity = '1';
      }
      if (gameCanvas) {
        gameCanvas.style.display = 'block';
        gameCanvas.style.visibility = 'visible';
        gameCanvas.style.opacity = '1';
      }
      
      // Initialize game state (wait for user input to start)
      isGameOver = false;
      gameState = 'playing'; // Game state ready, ghosts wait for user interaction
      score = 0;
      currentLevel = 1;
      hasSentGameStart = false;
      
      // ✅ CRITICAL: Show tap to start overlay in public view (MUST tap to start)
      const tapToStartOverlay = document.getElementById('tapToStartOverlay');
      if (tapToStartOverlay && isPublicView) {
        tapToStartOverlay.classList.remove('hidden');
        console.log('[Pacman] Tap to start overlay shown - game blocked until tap');
      }
    
      // ✅ FIX: Load mapIndex from BRAND_CONFIG before initializing level (public game mode)
      const savedMapIndex = BRAND_CONFIG.mapIndex !== undefined ? BRAND_CONFIG.mapIndex : 0;
      mapIndex = savedMapIndex;
      const baseMap = MAPS[mapIndex] || MAPS[0] || [];
      currentMap = baseMap.map(row => [...row]);
      
      // Initialize level (reset positions)
      initLevel(1);

      // ✅ PHƯƠNG ÁN 3: Focus đã được xử lý trong initGame(), không cần focus lại ở đây
      // (initGame() được gọi trước đó và đã focus với preventScroll: true)
      
      // Force a render to ensure canvas is drawn
      if (ctx && canvas) {
        render();
      }
      
      console.log('✅ Game initialized and visible', {
        gameWrapper: gameWrapper?.style.display,
        gameCanvas: gameCanvas?.style.display,
        canvasVisible: canvas?.offsetWidth > 0 && canvas?.offsetHeight > 0,
        gameId: gameId
      });
      
      // ✅ Send ready signal to parent (editor) if in iframe
      if (window.parent && window.parent !== window) {
        try {
          window.parent.postMessage({
            type: 'PACMAN_GAME_READY',
            gameId: gameId,
            timestamp: Date.now()
          }, '*');
          console.log('[Pacman] Sent ready signal to parent');
        } catch (err) {
          console.warn('[Pacman] Failed to send ready signal:', err);
        }
      }
    }, 50);
    
  } else {
    // Double-check: Maybe game ID was added after initial load (Vercel rewrite delay)
    setTimeout(async () => {
      const recheckGameId = typeof getGameId === 'function' ? getGameId() : (new URLSearchParams(window.location.search).get('game'));
      if (recheckGameId) {
        console.log('🔄 Found game ID on recheck:', recheckGameId);
        // Switch to public game mode
        if (document.body && !document.body.classList.contains('public-game-view')) {
          document.body.classList.add('public-game-view');
        }
        if (gameWrapper) gameWrapper.style.display = 'flex';
        if (gameCanvas) {
          gameCanvas.style.display = 'block';
          gameCanvas.style.visibility = 'visible';
        }
        if (!ctx || !canvas) {
          // ✅ FIX: Load brand config with correct gameId BEFORE initGame()
          const recheckHasLocalConfig = loadBrandConfig(recheckGameId);
          if (!recheckHasLocalConfig) {
            await loadBrandConfigFromSupabase(recheckGameId);
          }
          initGame();
        }
        
        // Initialize game state (wait for user input)
        isGameOver = false;
        gameState = 'playing';
        score = 0;
        currentLevel = 1;
        hasSentGameStart = false;
        
        // ✅ CRITICAL: Show tap to start overlay in public view (MUST tap to start)
        const tapToStartOverlay = document.getElementById('tapToStartOverlay');
        if (tapToStartOverlay && isPublicView) {
          tapToStartOverlay.classList.remove('hidden');
          console.log('[Pacman] Tap to start overlay shown - game blocked until tap');
        }
        
        // ✅ FIX: Load mapIndex from BRAND_CONFIG before initializing level (recheck mode)
        const savedMapIndex = BRAND_CONFIG.mapIndex !== undefined ? BRAND_CONFIG.mapIndex : 0;
        mapIndex = savedMapIndex;
        const baseMap = MAPS[mapIndex] || MAPS[0] || [];
        currentMap = baseMap.map(row => [...row]);
        
        // Initialize level (reset positions)
        initLevel(1);
        
        // ✅ PHƯƠNG ÁN 3: Focus đã được xử lý trong initGame(), không cần focus lại ở đây
        // (initGame() được gọi trước đó và đã focus với preventScroll: true)
        
        if (ctx && canvas) {
          render();
        }
        
        // ✅ Send ready signal to parent (editor) if in iframe
        if (window.parent && window.parent !== window) {
          try {
            window.parent.postMessage({
              type: 'PACMAN_GAME_READY',
              gameId: recheckGameId,
              timestamp: Date.now()
            }, '*');
            console.log('[Pacman] Sent ready signal to parent (recheck mode)');
          } catch (err) {
            console.warn('[Pacman] Failed to send ready signal:', err);
          }
        }
      }
    }, 200);
  }
  
  // Apply mobile scaling
  applyMobileGameScale();
  
  // Load fragment logo on startup
  if (BRAND_CONFIG.fragmentLogoUrl) {
    const img = new Image();
    img.onload = () => {
      BRAND_CONFIG.fragmentLogo = img;
    };
    img.onerror = () => {
      console.error('Failed to load saved fragment logo');
    };
    img.src = BRAND_CONFIG.fragmentLogoUrl;
  }
});

// Game Over Buttons
const replayBtn = document.getElementById('replayBtn');
if (replayBtn) {
  replayBtn.addEventListener('click', restartGame);
  replayBtn.addEventListener('touchstart', (e) => { e.preventDefault(); restartGame(); });
}

const remixBtn = document.getElementById('remixBtn');
if (remixBtn) {
  const handleRemix = () => {
    const editorUrl = '/games/templates-v2/index.html?template=pacman-template';
    // Use window.top for mobile iframe compatibility
    if (window.top && window.top !== window) {
      window.top.location.href = editorUrl;
    } else if (window.parent && window.parent !== window) {
      window.parent.location.href = editorUrl;
    } else {
      window.location.href = editorUrl;
    }
  };
  remixBtn.addEventListener('click', handleRemix);
  // Mobile: touchend works better than touchstart with preventDefault
  remixBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    handleRemix();
  });
}

const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
  shareBtn.disabled = true;
  shareBtn.style.cursor = 'not-allowed';
}


