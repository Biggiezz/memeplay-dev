// ====================================
// PACMAN TEMPLATE - MAIN GAME LOGIC
// ====================================

// ====================================
// GAME STATE
// ====================================

let canvas, ctx;
let editorCanvas, editorCtx;
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
const TEMPLATE_IDS = Object.freeze({
  PACMAN: 'pacman',
  BLOCKS: 'blocks-8x8'
});
const BLOCKS_STORAGE_PREFIX = 'blocks_brand_config_';
const BLOCKS_LAST_ID_KEY = 'blocks_last_saved_game_id';
let BLOCKS_CONFIG = {
  story: '',
  mapColor: '#0a0a0a',
  fragmentLogoUrl: '',
  fragmentLogo: null
};
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
    const templateUrl = `${baseUrl}/games/templates/pacman-template/index.html?game=${gameId}`;
    const publicUrl = buildPublicLinkUrl(gameId, { forceProduction: true, template: TEMPLATE_IDS.PACMAN });
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

function generateBlocksGameId() {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `blocks-${randomSuffix}`;
}

function getBlocksStorageKey(gameId) {
  const id = gameId || BLOCKS_CONFIG.gameId || localStorage.getItem(BLOCKS_LAST_ID_KEY);
  return id ? `${BLOCKS_STORAGE_PREFIX}${id}` : 'blocks_brand_config';
}

function setBlocksFragmentLogo(url) {
  if (!url) {
    BLOCKS_CONFIG.fragmentLogoUrl = '';
    BLOCKS_CONFIG.fragmentLogo = null;
    return;
  }
  BLOCKS_CONFIG.fragmentLogoUrl = url;
  const img = new Image();
  img.onload = () => {
    BLOCKS_CONFIG.fragmentLogo = img;
  };
  img.src = url;
}

function loadBlocksConfig(gameIdOverride = null) {
  try {
    const storageKey = getBlocksStorageKey(gameIdOverride);
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      return false;
    }
    if (gameIdOverride) {
      BLOCKS_CONFIG.gameId = gameIdOverride;
    } else if (!BLOCKS_CONFIG.gameId) {
      const storedId = localStorage.getItem(BLOCKS_LAST_ID_KEY);
      if (storedId) {
        BLOCKS_CONFIG.gameId = storedId;
      }
    }
    const parsed = JSON.parse(saved);
    BLOCKS_CONFIG = {
      ...BLOCKS_CONFIG,
      story: typeof parsed.story === 'string' ? parsed.story : '',
      mapColor: parsed.mapColor || '#0a0a0a',
      fragmentLogoUrl: parsed.fragmentLogoUrl || ''
    };
    if (BLOCKS_CONFIG.fragmentLogoUrl) {
      setBlocksFragmentLogo(BLOCKS_CONFIG.fragmentLogoUrl);
    }
    return true;
  } catch (error) {
    console.warn('[BlocksConfig] Failed to load config:', error);
    return false;
  }
}

function saveBlocksConfig(gameId = null) {
  let id = gameId || BLOCKS_CONFIG.gameId || localStorage.getItem(BLOCKS_LAST_ID_KEY);
  const storageKey = id ? `${BLOCKS_STORAGE_PREFIX}${id}` : 'blocks_brand_config';
  const payload = {
    fragmentLogoUrl: BLOCKS_CONFIG.fragmentLogoUrl || '',
    story: typeof BLOCKS_CONFIG.story === 'string' ? BLOCKS_CONFIG.story : '',
    mapColor: BLOCKS_CONFIG.mapColor || '#0a0a0a'
  };
  localStorage.setItem(storageKey, JSON.stringify(payload));
  if (id) {
    localStorage.setItem(BLOCKS_LAST_ID_KEY, id);
    BLOCKS_CONFIG.gameId = id;
  }
  return id || null;
}

function ensureBlocksGameId() {
  if (BLOCKS_CONFIG.gameId) {
    return BLOCKS_CONFIG.gameId;
  }
  const saved = localStorage.getItem(BLOCKS_LAST_ID_KEY);
  if (saved) {
    BLOCKS_CONFIG.gameId = saved;
    return saved;
  }
  const generated = generateBlocksGameId();
  localStorage.setItem(BLOCKS_LAST_ID_KEY, generated);
  BLOCKS_CONFIG.gameId = generated;
  return generated;
}

function sendBlocksConfigToIframe(target = 'both') {
  const payload = {
    type: 'CRYPTO_BLOCKS_CONFIG',
    payload: {
      story: BLOCKS_CONFIG.story || '',
      mapColor: BLOCKS_CONFIG.mapColor || '#0a0a0a',
      logoUrl: BLOCKS_CONFIG.fragmentLogoUrl || ''
    }
  };
  if (target === 'editor' || target === 'both') {
    const editorFrame = document.getElementById('blocksEditorFrame');
    if (editorFrame && editorFrame.contentWindow) {
      editorFrame.contentWindow.postMessage(payload, '*');
    }
  }
  if (target === 'game' || target === 'both') {
    const gameFrame = document.getElementById('blocksGameFrame');
    if (gameFrame && gameFrame.contentWindow) {
      gameFrame.contentWindow.postMessage(payload, '*');
    }
  }
}

async function loadBlocksConfigFromSupabase(gameId) {
  if (!gameId) return false;
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) return false;
    const { data, error } = await supabase.rpc('list_user_created_games', {
      p_template_id: TEMPLATE_IDS.BLOCKS
    });
    if (error) {
      console.error('[BlocksTemplate] list_user_created_games error:', error.message || error);
      return false;
    }
    if (!Array.isArray(data)) return false;
    const found = data.find(item => {
      const id = item?.game_id || item?.id;
      return id === gameId;
    });
    if (!found) return false;
    BLOCKS_CONFIG.story = found.story_one || '';
    BLOCKS_CONFIG.mapColor = found.map_color || '#0a0a0a';
    BLOCKS_CONFIG.fragmentLogoUrl = found.fragment_logo_url || '';
    if (BLOCKS_CONFIG.fragmentLogoUrl) {
      setBlocksFragmentLogo(BLOCKS_CONFIG.fragmentLogoUrl);
    }
    saveBlocksConfig(gameId);
    return true;
  } catch (error) {
    console.error('[BlocksTemplate] Failed to load config from Supabase:', error);
    return false;
  }
}

async function syncBlocksGameToSupabase(gameId, context = 'manual-save') {
  try {
    const origin = window.location.origin.toLowerCase();
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('0.0.0.0');
    const supabase = await getSupabaseClient();
    if (!supabase) return false;
    const baseUrl = isLocal ? PRODUCTION_BASE_URL : window.location.origin.replace(/\/$/, '');
    const templateUrl = `${baseUrl}/games/crypto-blocks/index.html?game=${gameId}`;
    const publicUrl = buildPublicLinkUrl(gameId, { forceProduction: true, template: TEMPLATE_IDS.BLOCKS });
    const payload = {
      p_game_id: gameId,
      p_template_id: TEMPLATE_IDS.BLOCKS,
      p_title: 'Blocks 8x8',
      p_map_color: BLOCKS_CONFIG.mapColor || '#0a0a0a',
      p_map_index: 0,
      p_fragment_logo_url: BLOCKS_CONFIG.fragmentLogoUrl || null,
      p_story_one: BLOCKS_CONFIG.story || '',
      p_story_two: '',
      p_story_three: '',
      p_public_url: publicUrl,
      p_template_url: templateUrl,
      p_creator_id: getCreatorIdentifier(),
      p_context: context
    };
    const { error } = await supabase.rpc('upsert_user_created_game', payload);
    if (error) {
      console.error('[BlocksTemplate] Supabase sync failed:', error.message || error);
      return false;
    }
    console.log('[BlocksTemplate] Synced game to Supabase:', gameId);
    return true;
  } catch (error) {
    console.error('[BlocksTemplate] Unexpected Supabase error:', error);
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
  const { forceProduction = false, template = TEMPLATE_IDS.PACMAN } = options || {};
  let id = gameId;
  console.log('[buildPublicLinkUrl] Input gameId:', gameId, 'type:', typeof gameId, 'forceProduction:', forceProduction, 'template:', template);
  
  if (!id || id === 'null' || id === 'undefined' || id === '') {
    console.warn('[buildPublicLinkUrl] gameId is invalid, generating new ID...');
    if (template === TEMPLATE_IDS.BLOCKS) {
      id = generateBlocksGameId();
    } else if (typeof generateGameId === 'function') {
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
  if (hasSentGameStart) return;
  hasSentGameStart = true;
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

function scrollToCreatorScreen() {
  const creator = document.getElementById('creatorScreen');
  if (creator) {
    creator.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// Map offset (for centering map on canvas)
let mapOffsetX = 0;
let mapOffsetY = 0;

// ====================================
// INITIALIZATION
// ====================================

function initGame() {
  canvas = document.getElementById('gameCanvas');
  ctx = canvas.getContext('2d');
  
  // Set canvas to exact native resolution (700x730px - game area only)
  // NO SCALING - render at true pixel resolution
  canvas.width = 700;
  canvas.height = 730;
  
  // CRITICAL: Disable CSS scaling - canvas must render at native size
  canvas.style.width = '700px';
  canvas.style.height = '730px';
  
  // Enable high-quality image rendering for non-pixel art elements (like logo)
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Initialize editor canvas preview (desktop)
  const editorCanvasEl = document.getElementById('gameCanvasEditor');
  if (editorCanvasEl) {
    editorCanvas = editorCanvasEl;
    editorCtx = editorCanvas.getContext('2d');
    editorCanvas.width = CONFIG.CANVAS_WIDTH;
    editorCanvas.height = CONFIG.CANVAS_HEIGHT;
    editorCanvas.style.width = CONFIG.CANVAS_WIDTH + 'px';
    editorCanvas.style.height = CONFIG.CANVAS_HEIGHT + 'px';
    editorCtx.imageSmoothingEnabled = true;
    editorCtx.imageSmoothingQuality = 'high';
  }
  
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
  initLevel(1);
  
  // Setup controls
  setupControls();
  
  // Setup mobile controls
  setupMobileControls();

  // Prepare Web Audio unlock for mobile
  setupAudioUnlock();
  
  // ✅ CRITICAL: Auto-focus canvas in public view so arrow keys work immediately without clicking
  if (isPublicView && gameCanvas) {
    // Use setTimeout to ensure canvas is fully rendered before focusing
    setTimeout(() => {
      gameCanvas.focus();
      console.log('[Pacman] Canvas auto-focused for keyboard input');
    }, 100);
  }
  
  // Start game loop
  gameLoop();
  
  // MemePlay integration
  setupMemePlayIntegration();
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
  
  // Update map select dropdown if it exists (không đổi giá trị, chỉ để hiển thị)
  if (mapSelect) {
    // Giữ nguyên giá trị đã chọn, không đổi theo level
  }
  
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
  if (editorCanvas && editorCtx) {
    const editorContainer = document.getElementById('editorContainer');
    if (editorContainer && editorContainer.classList.contains('active')) {
      renderToCanvas(editorCanvas, editorCtx);
    }
  }
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

  window.addEventListener('keydown', (e) => {
    const key = e.key;
    // ✅ CRITICAL: In public view, arrow keys should work immediately without clicking
    // Prevent page scrolling with arrow keys (only allow mouse wheel scrolling)
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key) && !isFormElement(e.target)) {
      e.preventDefault();
      e.stopPropagation(); // Also stop propagation to ensure no scroll
      
      // ✅ CRITICAL: Auto-focus canvas if not already focused (for better UX)
      if (isPublicView && gameCanvas && document.activeElement !== gameCanvas) {
        gameCanvas.focus();
      }
      
      requestGameStartFromParent('keyboard');
    }
    keys[key] = true;
    
    // Test maps: Press 1-5 to jump to specific map
    if (e.key >= '1' && e.key <= '5') {
      const mapNum = parseInt(e.key);
      currentLevel = mapNum;
      initLevel(mapNum);
      console.log(`Switched to Map ${mapNum}`);
    }
  });
  
  window.addEventListener('keyup', (e) => {
    // ✅ CRITICAL: Also prevent default on keyup for arrow keys to ensure no scroll
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && !isFormElement(e.target)) {
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
  if (!canvasEl) return;

  let touchStartX = null;
  let touchStartY = null;
  let isSwiping = false;
  const threshold = 30;

  const onTouchStart = (event) => {
    if (event.touches.length !== 1) return;
    // ✅ FIX: preventDefault để ngăn touch events bubble lên parent (giống rocket-bnb, brick-fallen-crypto)
    event.preventDefault();
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    isSwiping = true;
  };

  const onTouchMove = (event) => {
    if (!isSwiping || touchStartX === null || touchStartY === null) return;
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
  canvasEl.addEventListener('touchstart', onTouchStart, { passive: false });
  canvasEl.addEventListener('touchmove', onTouchMove, { passive: false });
  canvasEl.addEventListener('touchend', resetSwipe, { passive: false });
  canvasEl.addEventListener('touchcancel', resetSwipe, { passive: false });
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
  
  // Show story - If only 1 story, show it directly. If 2+ stories, random from them
  // ✅ FIX: Only use stories that are actually set (not defaults)
  const stories = Array.isArray(BRAND_CONFIG.stories) ? BRAND_CONFIG.stories : [];
  
  // Filter out empty stories
  const validStories = stories.filter(story => story && story.trim() !== '');
  
  let randomStory = '';
  if (validStories.length === 1) {
    // Only 1 story → show it directly (no random needed)
    randomStory = validStories[0];
    console.log('[GameOver] Only 1 story found, showing it directly:', randomStory);
  } else if (validStories.length > 1) {
    // 2+ stories → random from them (1/2 if 2 stories, 1/3 if 3 stories)
    const randomIndex = Math.floor(Math.random() * validStories.length);
    randomStory = validStories[randomIndex];
    console.log(`[GameOver] Random story selected: ${randomIndex + 1}/${validStories.length}`, randomStory);
  } else {
    // No valid stories → use default
    randomStory = 'Congratulations! You collected all fragments!';
    console.log('[GameOver] No stories found, using default');
  }
  
  const gameOverScreen = document.querySelector('.game-over-screen');
  const gameOverLogo = document.getElementById('gameOverLogo');
  const gameOverStory = document.getElementById('gameOverStory');
  
  if (gameOverScreen) {
    gameOverScreen.classList.add('active');
  }
  
  if (gameOverLogo) {
    if (BRAND_CONFIG.fragmentLogo && BRAND_CONFIG.fragmentLogo.complete && BRAND_CONFIG.fragmentLogoUrl) {
      gameOverLogo.src = BRAND_CONFIG.fragmentLogoUrl;
      gameOverLogo.style.display = 'block';
    } else {
      gameOverLogo.style.display = 'none';
    }
  }
  
  if (gameOverStory) {
    gameOverStory.textContent = randomStory;
  }
  
  setTimeout(() => playSound('storyChime'), 200);
  
  // Send score to MemePlay
  sendScoreToMemePlay();
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
  
  // Re-enable high-quality rendering after restart
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  if (editorCtx) {
    editorCtx.imageSmoothingEnabled = true;
    editorCtx.imageSmoothingQuality = 'high';
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
        gameCanvas.focus();
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
      default:
        break;
    }
  });
  
  // ====================================
  // FOCUS MODE TOGGLE BUTTON
  // ====================================
  const focusToggleBtn = document.querySelector('.focus-toggle');
  if (focusToggleBtn) {
    // Handle button click - send message to parent
    focusToggleBtn.addEventListener('click', (event) => {
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
    });
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
// BACKGROUND REMOVAL
// ====================================

function processLogoImage(img, removeBackground, callback) {
  // Always remove background automatically for all logos
  // Remove background using edge detection and corner color sampling
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  
  // Draw original image
  ctx.drawImage(img, 0, 0);
  
  // Get image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Check if image already has transparency (PNG with alpha channel)
  let hasTransparency = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      hasTransparency = true;
      break;
    }
  }
  
  // If already has transparency, keep it and just return
  if (hasTransparency) {
    callback(canvas.toDataURL('image/png'));
    return;
  }
  
  // Sample corner colors to detect background
  const corners = [
    { x: 0, y: 0 }, // Top-left
    { x: canvas.width - 1, y: 0 }, // Top-right
    { x: 0, y: canvas.height - 1 }, // Bottom-left
    { x: canvas.width - 1, y: canvas.height - 1 } // Bottom-right
  ];
  
  const cornerColors = corners.map(corner => {
    const idx = (corner.y * canvas.width + corner.x) * 4;
    return {
      r: data[idx],
      g: data[idx + 1],
      b: data[idx + 2],
      a: data[idx + 3]
    };
  });
  
  // Calculate average corner color (likely background)
  const avgBg = {
    r: Math.round(cornerColors.reduce((sum, c) => sum + c.r, 0) / cornerColors.length),
    g: Math.round(cornerColors.reduce((sum, c) => sum + c.g, 0) / cornerColors.length),
    b: Math.round(cornerColors.reduce((sum, c) => sum + c.b, 0) / cornerColors.length)
  };
  
  // Adaptive threshold based on image size and complexity
  const threshold = Math.max(25, Math.min(40, canvas.width / 20));
  
  // Remove background pixels
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Calculate distance from average background color
    const distance = Math.sqrt(
      Math.pow(r - avgBg.r, 2) +
      Math.pow(g - avgBg.g, 2) +
      Math.pow(b - avgBg.b, 2)
    );
    
    // If pixel is similar to background, make it transparent
    if (distance < threshold) {
      data[i + 3] = 0; // Set alpha to 0 (transparent)
    }
  }
  
  // Apply edge detection to preserve edges and restore important pixels
  const edgeThreshold = 25;
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = (y * canvas.width + x) * 4;
      
      // Skip if pixel is already opaque
      if (data[idx + 3] > 0) continue;
      
      // Sample neighbors for edge detection
      const neighbors = [
        { idx: ((y - 1) * canvas.width + x) * 4 },
        { idx: ((y + 1) * canvas.width + x) * 4 },
        { idx: (y * canvas.width + (x - 1)) * 4 },
        { idx: (y * canvas.width + (x + 1)) * 4 }
      ];
      
      let maxDiff = 0;
      neighbors.forEach(n => {
        if (data[n.idx + 3] > 0) { // Only check opaque neighbors
          const diff = Math.abs(data[idx] - data[n.idx]) +
                       Math.abs(data[idx + 1] - data[n.idx + 1]) +
                       Math.abs(data[idx + 2] - data[n.idx + 2]);
          maxDiff = Math.max(maxDiff, diff);
        }
      });
      
      // If strong edge detected near transparent pixel, restore it
      if (maxDiff > edgeThreshold) {
        data[idx + 3] = 255; // Restore alpha for edge pixels
      }
    }
  }
  
  // Put processed image data back
  ctx.putImageData(imageData, 0, 0);
  
  // Return as PNG to preserve transparency
  callback(canvas.toDataURL('image/png'));
}

// ====================================
// IMAGE OPTIMIZATION
// ====================================

function optimizeImage(img, callback) {
  // Target size for logo (optimized for 48px display, can be smaller)
  const MAX_SIZE = CONFIG.FRAGMENT_LOGO_MAX_SIZE;
  const TARGET_SIZE_KB = CONFIG.FRAGMENT_LOGO_TARGET_SIZE_KB;
  
  let width = img.width;
  let height = img.height;
  
  // Calculate new dimensions (maintain aspect ratio)
  // Resize smaller for better compression (logo only needs 48px, so 128px is plenty)
  if (width > MAX_SIZE || height > MAX_SIZE) {
    if (width > height) {
      height = Math.round((height / width) * MAX_SIZE);
      width = MAX_SIZE;
    } else {
      width = Math.round((width / height) * MAX_SIZE);
      height = MAX_SIZE;
    }
  }
  
  // Create canvas for resizing
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Use high-quality image smoothing for better downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw resized image
  ctx.drawImage(img, 0, 0, width, height);
  
  // Check WebP support
  const supportsWebP = checkWebPSupport();
  
  // Aggressive compression: Use low quality WebP to achieve ~3% file size (like Squoosh)
  // WebP with quality 0.5-0.6 can achieve 2-5% of original size
  const compressImage = (format, quality, onComplete) => {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const sizeKB = blob.size / 1024;
            const originalSizeKB = (img.width * img.height * 4) / 1024; // Approximate original size
            const compressionRatio = ((blob.size / (img.width * img.height * 4)) * 100).toFixed(1);
            console.log(`✅ Image optimized: ${sizeKB.toFixed(2)}KB (${format}, quality: ${quality}) - ${compressionRatio}% of original`);
            onComplete(e.target.result);
          };
          reader.onerror = () => {
            // Fallback to data URL
            const dataUrl = canvas.toDataURL(format, quality);
            onComplete(dataUrl);
          };
          reader.readAsDataURL(blob);
        } else {
          // Fallback to data URL
          const dataUrl = canvas.toDataURL(format, quality);
          onComplete(dataUrl);
        }
      }, format, quality);
    } else {
      // Fallback for older browsers
      const dataUrl = canvas.toDataURL(format, quality);
      onComplete(dataUrl);
    }
  };
  
  // Try WebP first with aggressive compression (quality 0.5-0.6 = ~3% of original)
  if (supportsWebP && canvas.toBlob) {
    compressImage('image/webp', CONFIG.FRAGMENT_LOGO_QUALITY, (result) => {
      callback(result);
    });
  } else {
    // Fallback for browsers without WebP support
    const isPhoto = img.width > 0 && img.height > 0 && 
                    (img.width / img.height > 1.2 || img.height / img.width > 1.2);
    const format = isPhoto ? 'image/jpeg' : 'image/png';
    compressImage(format, CONFIG.FRAGMENT_LOGO_QUALITY, (result) => {
      callback(result);
    });
  }
}

// Check if browser supports WebP
function checkWebPSupport() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

// ====================================
// EDITOR PANEL
// ====================================

function setupEditor() {
  const editorContainer = document.getElementById('editorContainer');
  const editorToggle = document.getElementById('editorToggle');
  const playTestBtn = document.getElementById('playTestBtn');
  const saveBtn = document.getElementById('saveBtn');
  const saveBtnMobile = document.getElementById('saveBtnMobile');
  const publicLinkBtn = document.getElementById('publicLinkBtn');
  const publicLinkBtnMobile = document.getElementById('publicLinkBtnMobile');
  const templateSelect = document.getElementById('templateSelect');
  const mapSelect = document.getElementById('mapSelect');
  const titleInput = document.getElementById('titleInput');
  const story1Input = document.getElementById('story1Input');
  const story1Count = document.getElementById('story1Count');
  const fragmentLogoInput = document.getElementById('fragmentLogoInput');
  const fragmentLogoPreview = document.getElementById('fragmentLogoPreview');
  const fragmentLogoLoading = document.getElementById('fragmentLogoLoading');
  const mapColorButtons = document.querySelectorAll('.map-color-btn');
  const blocksWrapper = document.getElementById('blocksWrapper');
  const gameWrapperEl = document.getElementById('gameWrapper');
  const gameCanvasEl = document.getElementById('gameCanvas');
  const pacmanEditorPreview = document.getElementById('pacmanEditorPreview');
  const blocksEditorPreview = document.getElementById('blocksEditorPreview');
  const getActiveTemplate = () => {
    if (templateSelect && templateSelect.value === TEMPLATE_IDS.BLOCKS) {
      return TEMPLATE_IDS.BLOCKS;
    }
    return TEMPLATE_IDS.PACMAN;
  };
  document.body.dataset.template = getActiveTemplate();
  loadBlocksConfig();
  sendBlocksConfigToIframe('editor');
  const playTestHandlers = {
    [TEMPLATE_IDS.PACMAN]: {
      show({ scroll = false } = {}) {
        if (blocksWrapper) {
          blocksWrapper.style.display = 'none';
          blocksWrapper.style.visibility = 'hidden';
        }
        if (gameWrapperEl) {
          gameWrapperEl.style.display = 'flex';
          gameWrapperEl.style.visibility = 'visible';
          gameWrapperEl.style.opacity = '1';
          if (scroll) {
            gameWrapperEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      },
      hide() {
        if (gameWrapperEl && isMobileViewport()) {
          gameWrapperEl.style.display = 'none';
        }
      }
    },
    [TEMPLATE_IDS.BLOCKS]: {
      show({ scroll = false, sendConfig = true } = {}) {
        if (gameWrapperEl) {
          gameWrapperEl.style.display = 'none';
        }
        if (blocksWrapper) {
          blocksWrapper.style.display = 'flex';
          blocksWrapper.style.visibility = 'visible';
          blocksWrapper.style.opacity = '1';
          if (sendConfig !== false) {
            const target = isMobileViewport() ? 'both' : 'editor';
            sendBlocksConfigToIframe(target);
          }
          if (scroll) {
            blocksWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      },
      hide() {
        if (blocksWrapper) {
          blocksWrapper.style.display = 'none';
          blocksWrapper.style.visibility = 'hidden';
        }
      }
    }
  };

  const syncPlayTestStage = ({ scroll = false, sendConfig = false, reason = '' } = {}) => {
    const isMobile = isMobileViewport();
    const activeTemplate = getActiveTemplate();

    if (!isMobile) {
      playTestHandlers[TEMPLATE_IDS.PACMAN].show({ scroll: false });
      if (activeTemplate !== TEMPLATE_IDS.BLOCKS && blocksWrapper) {
        blocksWrapper.style.display = 'none';
        blocksWrapper.style.visibility = 'hidden';
      }
      return;
    }

    Object.entries(playTestHandlers).forEach(([templateId, handler]) => {
      if (templateId === activeTemplate) {
        handler.show({ scroll, sendConfig });
      } else if (typeof handler.hide === 'function') {
        handler.hide();
      }
    });
  };

  if (templateSelect) {
    templateSelect.addEventListener('change', () => {
      document.body.dataset.template = getActiveTemplate();
      if (getActiveTemplate() === TEMPLATE_IDS.BLOCKS) {
        sendBlocksConfigToIframe(isMobileViewport() ? 'both' : 'editor');
      }
      syncPlayTestStage({ scroll: true, sendConfig: true, reason: 'template-change' });
    });
  }
  if (saveBtn) {
    saveBtn.dataset.visible = 'false';
    saveBtn.dataset.saved = 'false';
  }
  if (publicLinkBtn) {
    publicLinkBtn.dataset.visible = 'false';
    publicLinkBtn.dataset.enabled = 'false';
  }

  const applyMobileGameLockState = () => {
    if (!document.body) return;
    if (!mobileGameUnlocked && isMobileViewport()) {
      document.body.classList.add('mobile-game-locked');
    } else {
      document.body.classList.remove('mobile-game-locked');
    }
  };

  applyMobileGameLockState();
  window.addEventListener('resize', () => {
    applyMobileGameLockState();
    syncPlayTestStage({ scroll: false, sendConfig: false, reason: 'resize' });
  });

  const unlockMobileGameIfNeeded = () => {
    if (isMobileViewport() && !mobileGameUnlocked) {
      mobileGameUnlocked = true;
      applyMobileGameLockState();
    }
  };

  const setPublicLinkEnabled = (enabled, btnElement = null) => {
    const btn = btnElement || publicLinkBtn;
    if (!btn) return;
    if (!btn.dataset.template) {
      btn.dataset.template = TEMPLATE_IDS.PACMAN;
    }
    btn.dataset.enabled = enabled ? 'true' : 'false';
    if (enabled) {
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      btn.style.background = '#ffb642';
      btn.style.boxShadow = '0 0 12px rgba(255, 182, 66, 0.4)';
    } else {
      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';
      btn.style.background = '#555555';
      btn.style.boxShadow = '0 0 12px rgba(255, 182, 66, 0.2)';
    }
  };

  const showSaveFlow = (templateId = TEMPLATE_IDS.PACMAN) => {
    const isMobile = isMobileViewport();
    
    if (isMobile) {
      // Mobile: Show floating buttons
      const publicLinkBtnMobile = document.getElementById('publicLinkBtnMobile');
      
      if (saveBtnMobile) {
        saveBtnMobile.style.display = 'block';
        saveBtnMobile.dataset.visible = 'true';
        saveBtnMobile.dataset.saved = 'false';
        saveBtnMobile.textContent = '💾 Save';
        saveBtnMobile.style.background = '#ffb642';
        saveBtnMobile.dataset.template = templateId;
      }
      if (publicLinkBtnMobile) {
        publicLinkBtnMobile.style.display = 'block';
        publicLinkBtnMobile.dataset.visible = 'true';
        publicLinkBtnMobile.textContent = '🔗 Get Public Link';
        publicLinkBtnMobile.dataset.template = templateId;
        setPublicLinkEnabled(false, publicLinkBtnMobile);
      }
    } else {
      // Desktop: Show editor panel buttons
      if (saveBtn) {
        saveBtn.style.display = 'block';
        saveBtn.dataset.visible = 'true';
        saveBtn.dataset.saved = 'false';
        saveBtn.textContent = '💾 Save';
        saveBtn.style.background = '#ffb642';
        saveBtn.dataset.template = templateId;
      }
      if (publicLinkBtn) {
        publicLinkBtn.style.display = 'block';
        publicLinkBtn.dataset.visible = 'true';
        publicLinkBtn.textContent = '🔗 Get Public Link';
        publicLinkBtn.dataset.template = templateId;
        setPublicLinkEnabled(false);
      }
    }
  };

  const PROJECT_HOME_URL = '../../../index.html';

  const handleFloatingButtonsVisibility = (isActive) => {
    if (saveBtn) {
      if (isActive && saveBtn.dataset.visible === 'true') {
        saveBtn.dataset.wasVisible = 'true';
        saveBtn.style.display = 'none';
      } else if (!isActive && saveBtn.dataset.wasVisible === 'true') {
        saveBtn.style.display = 'block';
        delete saveBtn.dataset.wasVisible;
      }
    }
    if (publicLinkBtn) {
      if (isActive && publicLinkBtn.dataset.visible === 'true') {
        publicLinkBtn.dataset.wasVisible = 'true';
        publicLinkBtn.style.display = 'none';
      } else if (!isActive && publicLinkBtn.dataset.wasVisible === 'true') {
        publicLinkBtn.style.display = 'block';
        delete publicLinkBtn.dataset.wasVisible;
      }
    }
  };

  if (fragmentLogoPreview && BRAND_CONFIG.fragmentLogoUrl) {
    fragmentLogoPreview.src = BRAND_CONFIG.fragmentLogoUrl;
    fragmentLogoPreview.classList.add('active');
  }
  
  // Character counter function
  const updateCharCount = (textarea, counter, maxLength) => {
    const length = textarea.value.length;
    counter.textContent = `${length}/${maxLength}`;
    if (length >= maxLength) {
      counter.classList.add('warning');
    } else {
      counter.classList.remove('warning');
    }
  };
  
  // Toggle editor
  if (editorToggle) {
    editorToggle.addEventListener('click', () => {
      // ✅ Back to page 1 of editor (creatorScreen)
      const creatorScreen = document.getElementById('creatorScreen');
      const gameWrapper = document.getElementById('gameWrapper');
      
      // Hide game wrapper if showing
      if (gameWrapper) {
        gameWrapper.style.display = 'none';
      }
      
      // Hide editor container (page 2) if showing
      if (editorContainer) {
        editorContainer.classList.remove('active');
        editorContainer.style.display = 'none';
      }
      
      // Show creator screen (page 1)
      if (creatorScreen) {
        creatorScreen.style.display = 'block';
      }
      
      // Show back button, hide save/public link buttons
      editorToggle.style.display = 'block';
      handleFloatingButtonsVisibility(false);
      
      // Scroll to page 1 (creatorScreen)
      scrollToCreatorScreen();
      
      // Remove public-game-view class if present
      if (document.body && document.body.classList.contains('public-game-view')) {
        document.body.classList.remove('public-game-view');
      }
    });
  }
  
  // Close editor button
  const closeEditorBtn = document.getElementById('closeEditorBtn');
  if (closeEditorBtn) {
    closeEditorBtn.addEventListener('click', () => {
      window.location.href = PROJECT_HOME_URL;
    });
  }
  
  // Close Home Button (X button)
  const closeHomeBtn = document.getElementById('closeHomeBtn');
  if (closeHomeBtn) {
    closeHomeBtn.addEventListener('click', () => {
      window.location.href = PROJECT_HOME_URL;
    });
  }
  
  // Title input - Auto-generate default title
  if (titleInput) {
    // Generate default title if not set or is default value
    if (!BRAND_CONFIG.title || BRAND_CONFIG.title === 'Pacman Game') {
      const timestamp = new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }).replace(',', '');
      BRAND_CONFIG.title = `Pacman Game - ${timestamp}`;
      saveBrandConfig();
    }
    titleInput.value = BRAND_CONFIG.title;
    // Disable input - title is auto-generated
    titleInput.disabled = true;
    titleInput.style.opacity = '0.6';
    titleInput.style.cursor = 'not-allowed';
    titleInput.title = 'Game title is auto-generated';
  }
  
  // Map Color buttons
  if (mapColorButtons.length > 0) {
    const highlightSelectedMapColor = (selectedColor) => {
      mapColorButtons.forEach(btn => {
        if (btn.dataset.color === selectedColor) {
          btn.classList.add('active');
          btn.setAttribute('aria-pressed', 'true');
        } else {
          btn.classList.remove('active');
          btn.setAttribute('aria-pressed', 'false');
        }
      });
    };

    highlightSelectedMapColor(BRAND_CONFIG.mapColor || '#1a1a2e');
    
    // Handle color selection
    mapColorButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const selectedColor = btn.dataset.color;
        BRAND_CONFIG.mapColor = selectedColor;
        saveBrandConfig();
        
        highlightSelectedMapColor(selectedColor);
        
        // Force re-render to apply new color
        if (ctx && canvas) {
          render();
        }
        if (editorCtx && editorCanvas) {
          render();
        }
      });
    });
  }

  
  // Story inputs with character limit (50 chars)
  const MAX_STORY_LENGTH = 50;
  
  if (story1Input) {
    const initialStory = (BRAND_CONFIG.stories[0] || BLOCKS_CONFIG.story || '').substring(0, MAX_STORY_LENGTH);
    story1Input.value = initialStory;
    BLOCKS_CONFIG.story = initialStory;
    updateCharCount(story1Input, story1Count, MAX_STORY_LENGTH);
    story1Input.addEventListener('input', (e) => {
      const value = e.target.value.substring(0, MAX_STORY_LENGTH);
      e.target.value = value;
      // ✅ FIX: Only keep story[0], remove story[1] and story[2] if they exist
      // This ensures only 1 story is saved if user only enters story 1
      BRAND_CONFIG.stories = value.trim() !== '' ? [value] : [];
      saveBrandConfig();
      BLOCKS_CONFIG.story = value;
      saveBlocksConfig(BLOCKS_CONFIG.gameId || null);
      sendBlocksConfigToIframe('both');
      updateCharCount(story1Input, story1Count, MAX_STORY_LENGTH);
    });
  }
  
  // Fragment logo upload (BNB)
  if (fragmentLogoInput) {
    fragmentLogoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        // Validate file type
        if (!file.type.match(/^image\/(png|jpeg|jpg|webp|gif)$/i)) {
          alert('Please upload a valid image file (PNG, JPEG, WebP, or GIF)');
          return;
        }
        
        // Validate file size
        if (file.size > CONFIG.FRAGMENT_LOGO_MAX_FILE_SIZE) {
          const maxMB = (CONFIG.FRAGMENT_LOGO_MAX_FILE_SIZE / (1024 * 1024)).toFixed(0);
          alert(`Image file is too large. Please use an image smaller than ${maxMB}MB.`);
          return;
        }
        
        // Show loading indicator
        if (fragmentLogoLoading) {
          fragmentLogoLoading.style.display = 'block';
        }
        if (fragmentLogoPreview) {
          fragmentLogoPreview.classList.remove('active');
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            // Always remove background automatically
            processLogoImage(img, true, (processedDataUrl) => {
              // Optimize image: resize and compress
              const processedImg = new Image();
              processedImg.onload = () => {
                optimizeImage(processedImg, (optimizedDataUrl) => {
                  const optimizedImg = new Image();
                  optimizedImg.onload = () => {
                    BRAND_CONFIG.fragmentLogo = optimizedImg;
                    BRAND_CONFIG.fragmentLogoUrl = optimizedDataUrl;
                    saveBrandConfig();
                    setBlocksFragmentLogo(optimizedDataUrl);
                    saveBlocksConfig(BLOCKS_CONFIG.gameId || null);
                    sendBlocksConfigToIframe('both');
                    
                    // Hide loading, show preview
                    if (fragmentLogoLoading) {
                      fragmentLogoLoading.style.display = 'none';
                    }
                    if (fragmentLogoPreview) {
                      fragmentLogoPreview.src = optimizedDataUrl;
                      fragmentLogoPreview.classList.add('active');
                    }
                    
                    console.log('✅ Fragment logo uploaded!');
                  };
                  optimizedImg.onerror = () => {
                    if (fragmentLogoLoading) {
                      fragmentLogoLoading.style.display = 'none';
                    }
                    alert('Failed to load optimized image. Please try again.');
                  };
                  optimizedImg.src = optimizedDataUrl;
                });
              };
              processedImg.onerror = () => {
                if (fragmentLogoLoading) {
                  fragmentLogoLoading.style.display = 'none';
                }
                alert('Failed to process image. Please try again.');
              };
              processedImg.src = processedDataUrl;
            });
          };
          img.onerror = () => {
            if (fragmentLogoLoading) {
              fragmentLogoLoading.style.display = 'none';
            }
            alert('Failed to load image. Please check the file format.');
          };
          img.src = event.target.result;
        };
        reader.onerror = () => {
          if (fragmentLogoLoading) {
            fragmentLogoLoading.style.display = 'none';
          }
          alert('Failed to read file. Please try again.');
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  // Map selection
  if (mapSelect) {
    // ✅ FIX: Load mapIndex from BRAND_CONFIG when editor loads
    // CHỈ set dropdown value để hiển thị, KHÔNG thay đổi BRAND_CONFIG.mapIndex
    const savedMapIndex = BRAND_CONFIG.mapIndex !== undefined ? BRAND_CONFIG.mapIndex : 0;
    const savedMapNumber = savedMapIndex + 1; // Convert index (0,1) to map number (1,2)
    if (savedMapNumber >= 1 && savedMapNumber <= MAPS.length) {
      mapSelect.value = String(savedMapNumber);
      // ✅ Update mapIndex and currentMap based on saved value (chỉ để hiển thị)
      mapIndex = savedMapIndex;
      const baseMap = MAPS[mapIndex] || MAPS[0] || [];
      currentMap = baseMap.map(row => [...row]);
      console.log('[setupEditor] Set dropdown to Map', savedMapNumber, 'from BRAND_CONFIG.mapIndex:', savedMapIndex);
    } else {
      // Nếu mapIndex không hợp lệ, set default nhưng KHÔNG save (tránh ghi đè)
      mapSelect.value = '1';
      console.log('[setupEditor] Invalid mapIndex, using default Map 1');
    }
    
    mapSelect.addEventListener('change', (e) => {
      const selectedMap = parseInt(e.target.value, 10);
      // ✅ FIX: Hỗ trợ tất cả map (Map 1, Map 2, Map 3...)
      if (selectedMap >= 1 && selectedMap <= MAPS.length && MAPS.length > 0) {
        // ✅ FIX: Update preview trong editor canvas
        if (editorCanvas && editorCtx && editorContainer && editorContainer.classList.contains('active')) {
          const tempLevel = currentLevel;
          const tempMap = currentMap;
          const tempMapIndex = mapIndex;
          
          // Load map tương ứng với selectedMap (Map 1 = index 0, Map 2 = index 1)
          mapIndex = selectedMap - 1;
          const previewMap = MAPS[mapIndex].map(row => [...row]);
          
          const mapCols = previewMap[0] ? previewMap[0].length : CONFIG.MAP_COLS;
          const mapRows = previewMap.length;
          const mapWidth = mapCols * CONFIG.TILE_SIZE;
          const mapHeight = mapRows * CONFIG.TILE_SIZE;
          const previewMapOffsetX = (editorCanvas.width - mapWidth) / 2;
          const previewMapOffsetY = (editorCanvas.height - mapHeight) / 2;
          
          editorCtx.fillStyle = CONFIG.PATH_COLOR;
          editorCtx.fillRect(0, 0, editorCanvas.width, editorCanvas.height);
          
          for (let row = 0; row < previewMap.length; row++) {
            for (let col = 0; col < previewMap[row].length; col++) {
              const x = previewMapOffsetX + col * CONFIG.TILE_SIZE;
              const y = previewMapOffsetY + row * CONFIG.TILE_SIZE;
              if (previewMap[row][col] === 1) {
                // Use custom map color from BRAND_CONFIG
                const wallColor = BRAND_CONFIG.mapColor || CONFIG.WALL_COLOR;
                editorCtx.fillStyle = wallColor;
                editorCtx.fillRect(x, y, CONFIG.TILE_SIZE, CONFIG.TILE_SIZE);
              }
            }
          }
          
          currentLevel = tempLevel;
          currentMap = tempMap;
          mapIndex = tempMapIndex;
        }
        
        // ✅ FIX: Update game map thực tế ngay lập tức (không cần Play Test)
        // Load map mới vào currentMap và re-render game
        const newMapIndex = selectedMap - 1;
        const newBaseMap = MAPS[newMapIndex] || MAPS[0] || [];
        mapIndex = newMapIndex;
        currentMap = newBaseMap.map(row => [...row]);
        
        // ✅ FIX: Save mapIndex to BRAND_CONFIG when map is changed
        BRAND_CONFIG.mapIndex = newMapIndex;
        // ✅ CRITICAL: Save with current gameId if exists, otherwise save without gameId (will use default)
        const currentGameId = (saveBtn && saveBtn.dataset.gameId) || 
                              (saveBtnMobile && saveBtnMobile.dataset.gameId) || 
                              (typeof getGameId === 'function' ? getGameId() : null);
        if (currentGameId) {
          saveBrandConfig(currentGameId);
          console.log('💾 Map changed: Saved mapIndex', newMapIndex, 'for gameId:', currentGameId);
        } else {
          saveBrandConfig();
          console.log('💾 Map changed: Saved mapIndex', newMapIndex, '(no gameId yet)');
        }
        
        // Re-initialize level với map mới (giữ nguyên level, chỉ đổi map)
        initLevel(currentLevel);
        
        // Re-render game map ngay lập tức
        if (ctx && canvas) {
          render();
        }
      }
    });
  }
  
  // Play test button
  if (playTestBtn) {
    // Ensure button is enabled and visible
    playTestBtn.disabled = false;
    playTestBtn.style.pointerEvents = 'auto';
    playTestBtn.style.opacity = '1';
    
    playTestBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      console.log('🎮 Play Test clicked');
      const activeTemplate = getActiveTemplate();
      if (activeTemplate === TEMPLATE_IDS.BLOCKS) {
        if (playTestBtn.textContent.trim() === 'Play Test') {
          playTestBtn.textContent = 'Play Test ✓';
          playTestBtn.style.color = '#4ade80';
        }
        playTestHandlers[TEMPLATE_IDS.BLOCKS].show({ scroll: true, sendConfig: true });
        showSaveFlow(TEMPLATE_IDS.BLOCKS);
        return;
      }
      
      const isMobile = isMobileViewport();
      
      if (isMobile) {
        // ✅ Mobile: Keep original behavior (show game wrapper)
        // Get selected map from dropdown
        const selectedMap = mapSelect ? parseInt(mapSelect.value) : currentLevel;
        
        // Ensure game wrapper is visible
        if (gameWrapperEl) {
          gameWrapperEl.style.display = 'flex';
          gameWrapperEl.style.visibility = 'visible';
          gameWrapperEl.style.opacity = '1';
          // Force reflow to ensure browser recognizes the display change
          void gameWrapperEl.offsetHeight;
          void gameWrapperEl.getBoundingClientRect(); // Additional reflow trigger
        }
        if (gameCanvasEl) {
          gameCanvasEl.style.display = 'block';
          gameCanvasEl.style.visibility = 'visible';
          gameCanvasEl.style.opacity = '1';
          // Force reflow to ensure browser recognizes the display change
          void gameCanvasEl.offsetHeight;
          void gameCanvasEl.getBoundingClientRect(); // Additional reflow trigger
        }
        
        // Trigger a resize event to force browser to recalculate layout
        if (window.dispatchEvent) {
          window.dispatchEvent(new Event('resize'));
        }
        
        // Show save & public link workflow after Play Test (mobile uses floating buttons)
        showSaveFlow(TEMPLATE_IDS.PACMAN);
        
        unlockMobileGameIfNeeded();
        
        // Reset game state but keep selected map
        isGameOver = false;
        gameState = 'playing';
        score = 0;
        
        // Reset ghost AI state
        ghostSpeedMultiplier = 0.25; // Start at 25% of Pacman speed
        firstFragmentEaten = false;
        ghostFreezeTimer = 0;
        ghostGlowTimer = 0;
        ghostGlowState = 'none';
        ghostPendingBoost = 0;
        
        // ✅ FIX: Load map được chọn từ dropdown (giữ nguyên level, chỉ load map mới)
        initLevel(currentLevel);
        
        // ✅ FIX: Auto-focus canvas để có thể điều khiển Pacman ngay lập tức (Mobile)
        if (gameCanvasEl) {
          // Use setTimeout to ensure canvas is fully rendered before focusing
          setTimeout(() => {
            gameCanvasEl.focus();
            console.log('[Pacman] Canvas auto-focused for keyboard input after Play Test (Mobile)');
          }, 200); // Delay longer for mobile to ensure unlock completes
        }
        
        // Force reflow and render immediately
        if (gameWrapperEl) {
          void gameWrapperEl.offsetHeight; // Force reflow
        }
        if (ctx && canvas) {
          // Use requestAnimationFrame to ensure render happens after reflow
          requestAnimationFrame(() => {
            render();
            // Force another render after a short delay to ensure everything is painted
            setTimeout(() => {
              if (ctx && canvas) {
                render();
              }
            }, 50);
          });
        }

        // Scroll to game area (mobile)
        if (gameWrapperEl) {
          // Mobile: wait for unlock, then scroll
          const scrollToGame = () => {
            // Ensure game is unlocked and visible
            if (document.body.classList.contains('mobile-game-locked')) {
              setTimeout(scrollToGame, 50);
              return;
            }
            
            // Ensure gameWrapper is visible
            if (gameWrapperEl.style.display === 'none') {
              gameWrapperEl.style.display = 'flex';
            }
            
            // Wait for layout update
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                // Calculate scroll position
                const rect = gameWrapperEl.getBoundingClientRect();
                const scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
                const elementTop = rect.top + scrollTop;
                
                // Scroll to game area
                window.scrollTo({
                  top: Math.max(0, elementTop - 20),
                  behavior: 'smooth'
                });
                
                // Also try scrollIntoView as backup
                setTimeout(() => {
                  gameWrapperEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  applyMobileGameScale();
                  
                  // Force render after scroll
                  if (ctx && canvas) {
                    render();
                  }
                }, 100);
              });
            });
          };
          
          // Start scrolling after unlock
          setTimeout(scrollToGame, 300);
        }
      } else {
        // ✅ Desktop: Only add checkmark and show Save/Get Public Link in editor panel
        // Add checkmark to Play Test button
        if (playTestBtn.textContent.trim() === 'Play Test') {
          playTestBtn.textContent = 'Play Test ✓';
          playTestBtn.style.color = '#4ade80'; // Green color for checkmark
        }

        // ✅ FIX: Auto-focus canvas để có thể điều khiển Pacman ngay lập tức (Desktop)
        const gameCanvasEl = document.getElementById('gameCanvas');
        if (gameCanvasEl) {
          // Use setTimeout to ensure canvas is fully rendered before focusing
          setTimeout(() => {
            gameCanvasEl.focus();
            console.log('[Pacman] Canvas auto-focused for keyboard input after Play Test (Desktop)');
          }, 100);
        }

        // Show save & public link workflow after Play Test (desktop uses editor panel buttons)
        showSaveFlow(TEMPLATE_IDS.PACMAN);
      }
    });
  }

  syncPlayTestStage({ scroll: false, sendConfig: true, reason: 'initial' });
  
  const applyBlocksSaveState = (gameId) => {
    if (saveBtn) {
      saveBtn.dataset.gameId = gameId;
      saveBtn.dataset.saved = 'true';
      saveBtn.dataset.template = TEMPLATE_IDS.BLOCKS;
    }
    if (saveBtnMobile) {
      saveBtnMobile.dataset.gameId = gameId;
      saveBtnMobile.dataset.saved = 'true';
      saveBtnMobile.dataset.template = TEMPLATE_IDS.BLOCKS;
    }
    if (publicLinkBtn) {
      publicLinkBtn.dataset.template = TEMPLATE_IDS.BLOCKS;
    }
    if (publicLinkBtnMobile) {
      publicLinkBtnMobile.dataset.template = TEMPLATE_IDS.BLOCKS;
    }
  };

  const handleBlocksSaveClick = async (button, isMobile = false) => {
    if (button.dataset.visible !== 'true') {
      return;
    }
    button.textContent = 'Saving...';
    button.style.background = '#f6c94c';
    const storyValue = story1Input ? story1Input.value.substring(0, 50) : '';
    BLOCKS_CONFIG.story = storyValue;
    if (!BLOCKS_CONFIG.fragmentLogoUrl && BRAND_CONFIG.fragmentLogoUrl) {
      BLOCKS_CONFIG.fragmentLogoUrl = BRAND_CONFIG.fragmentLogoUrl;
    }
    const existingId = button.dataset.gameId && button.dataset.gameId.startsWith('blocks-')
      ? button.dataset.gameId
      : null;
    const gameId = saveBlocksConfig(existingId || ensureBlocksGameId());
    sendBlocksConfigToIframe('both');
    applyBlocksSaveState(gameId);
    button.textContent = '✅ Saved';
    button.style.background = '#4ECDC4';
    button.dataset.gameId = gameId;
    button.dataset.saved = 'true';
    button.dataset.template = TEMPLATE_IDS.BLOCKS;
    setPublicLinkEnabled(true, publicLinkBtn);
    if (publicLinkBtnMobile) {
      setPublicLinkEnabled(true, publicLinkBtnMobile);
    }
    button.dataset.supabaseSync = 'pending';
    const synced = await syncBlocksGameToSupabase(gameId, 'manual-save');
    button.dataset.supabaseSync = synced ? 'success' : 'error';
  };
  
  // Save button handler (shared for desktop and mobile)
  const handleSaveClick = async (button, isMobile = false) => {
    if (button.dataset.visible !== 'true') {
      return;
    }
    const activeTemplate = button.dataset.template || getActiveTemplate();
    if (activeTemplate === TEMPLATE_IDS.BLOCKS) {
      await handleBlocksSaveClick(button, isMobile);
      return;
    }
    // Title is auto-generated, ensure it's set
    if (!BRAND_CONFIG.title || BRAND_CONFIG.title === 'Pacman Game') {
      const timestamp = new Date().toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit' 
      }).replace(',', '');
      BRAND_CONFIG.title = `Pacman Game - ${timestamp}`;
    }
    
    // ✅ FIX: Save mapIndex to BRAND_CONFIG before saving
    const mapSelect = document.getElementById('mapSelect');
    if (mapSelect) {
      const selectedMap = parseInt(mapSelect.value, 10);
      if (selectedMap >= 1 && selectedMap <= MAPS.length) {
        BRAND_CONFIG.mapIndex = selectedMap - 1;
      }
    }
    
    // Generate and save game ID (format: pacman-7420)
    let gameId;
    if (typeof generateGameId === 'function') {
      gameId = generateGameId();
    } else {
      // Fallback: generate pacman-7420 format
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      gameId = `pacman-${randomSuffix}`;
    }
    const savedId = saveBrandConfig(gameId);
    console.log('💾 Game saved with ID:', savedId, 'Title:', BRAND_CONFIG.title, 'MapIndex:', BRAND_CONFIG.mapIndex);
    
    // ✅ FIX: Lưu gameId vào localStorage để có thể load lại khi F5 trong editor mode
    localStorage.setItem('pacman_last_saved_game_id', gameId);
    
    // ✅ DEBUG: Verify mapIndex was saved to localStorage
    const storageKey = `pacman_brand_config_${gameId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log('💾 [DEBUG] Verified localStorage save:', {
          gameId,
          storageKey,
          savedMapIndex: parsed.mapIndex,
          currentMapIndex: BRAND_CONFIG.mapIndex
        });
      } catch (e) {
        console.error('💾 [DEBUG] Failed to parse saved config:', e);
      }
    } else {
      console.warn('💾 [DEBUG] No saved config found for gameId:', gameId);
    }
    
    // Store game ID for public link (both desktop and mobile buttons)
    if (saveBtn) {
      saveBtn.dataset.gameId = gameId;
      saveBtn.dataset.saved = 'true';
      saveBtn.dataset.template = TEMPLATE_IDS.PACMAN;
      console.log('💾 [SAVE] Desktop - gameId:', gameId, 'saved:', saveBtn.dataset.saved);
    }
    if (saveBtnMobile) {
      saveBtnMobile.dataset.gameId = gameId;
      saveBtnMobile.dataset.saved = 'true';
      saveBtnMobile.dataset.template = TEMPLATE_IDS.PACMAN;
      console.log('💾 [SAVE] Mobile - gameId:', gameId, 'saved:', saveBtnMobile.dataset.saved);
    } else {
      console.warn('💾 [SAVE] Mobile - saveBtnMobile is null!');
    }
    
    button.textContent = '✅ Saved';
    button.style.background = '#4ECDC4';
    button.dataset.saved = 'true';
    
    // ✅ FIX: Enable public link button for both desktop and mobile
    setPublicLinkEnabled(true);
    if (publicLinkBtnMobile) {
      setPublicLinkEnabled(true, publicLinkBtnMobile);
    }

    button.dataset.supabaseSync = 'pending';
    const synced = await syncGameToSupabase(gameId, 'manual-save');
    button.dataset.supabaseSync = synced ? 'success' : 'error';
  };

  // Save button (Desktop)
  if (saveBtn) {
    saveBtn.addEventListener('click', () => handleSaveClick(saveBtn, false));
  }
  
  // ✅ FIX: Save button (Mobile) - Add event listener
  if (saveBtnMobile) {
    saveBtnMobile.addEventListener('click', () => handleSaveClick(saveBtnMobile, true));
  }
  
  // Public Link button handler - FIXED for iOS Safari: Copy MUST happen in click event, no async before
  const getLastSavedGameId = (templateId) => {
    if (templateId === TEMPLATE_IDS.BLOCKS) {
      if (saveBtn && saveBtn.dataset.template === TEMPLATE_IDS.BLOCKS && saveBtn.dataset.saved === 'true') {
        return saveBtn.dataset.gameId;
      }
      if (saveBtnMobile && saveBtnMobile.dataset.template === TEMPLATE_IDS.BLOCKS && saveBtnMobile.dataset.saved === 'true') {
        return saveBtnMobile.dataset.gameId;
      }
      return BLOCKS_CONFIG.gameId || localStorage.getItem(BLOCKS_LAST_ID_KEY);
    }
    if (saveBtn && (!saveBtn.dataset.template || saveBtn.dataset.template === TEMPLATE_IDS.PACMAN) && saveBtn.dataset.saved === 'true') {
      return saveBtn.dataset.gameId;
    }
    if (saveBtnMobile && (!saveBtnMobile.dataset.template || saveBtnMobile.dataset.template === TEMPLATE_IDS.PACMAN) && saveBtnMobile.dataset.saved === 'true') {
      return saveBtnMobile.dataset.gameId;
    }
    return localStorage.getItem('pacman_last_saved_game_id');
  };

  const handlePublicLinkClick = (button) => {
    if (button.dataset.enabled !== 'true') {
      return;
    }
    
    const buttonTemplate = button.dataset.template || getActiveTemplate();
    let gameId = button.dataset.gameId || getLastSavedGameId(buttonTemplate);
    
    if (!gameId) {
      alert('Please Save the game first before getting public link.');
      return;
    }
    
    // ✅ CRITICAL FIX: Build link SYNCHRONOUSLY (no async, no API calls)
    const linkToCopy = buildPublicLinkUrl(gameId, { forceProduction: false, template: buttonTemplate });
    
    // ✅ CRITICAL FIX: Copy IMMEDIATELY in click event (iOS Safari requirement)
    // Must use execCommand with VISIBLE textarea (not hidden) for iOS Safari
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isInIframe = window.parent && window.parent !== window;
    
    let copySuccess = false;
    
    if (isMobile && isInIframe) {
      // Mobile iframe: Use visible textarea + execCommand (ONLY way that works on iOS Safari)
      const textArea = document.createElement('textarea');
      textArea.value = linkToCopy;
      textArea.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:1px;height:1px;opacity:0.01;z-index:99999;';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      textArea.setSelectionRange(0, linkToCopy.length);
      
      try {
        copySuccess = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        document.body.removeChild(textArea);
        console.error('❌ [MOBILE] execCommand failed:', err);
      }
    } else {
      // Desktop: Try Clipboard API first, fallback to execCommand
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          navigator.clipboard.writeText(linkToCopy);
          copySuccess = true;
        } catch (err) {
          console.error('❌ [DESKTOP] Clipboard API failed:', err);
          // Fallback
          const textArea = document.createElement('textarea');
          textArea.value = linkToCopy;
          textArea.style.position = 'fixed';
          textArea.style.opacity = '0';
          textArea.style.left = '-9999px';
          document.body.appendChild(textArea);
          textArea.select();
          try {
            copySuccess = document.execCommand('copy');
            document.body.removeChild(textArea);
          } catch (err2) {
            document.body.removeChild(textArea);
          }
        }
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = linkToCopy;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        try {
          copySuccess = document.execCommand('copy');
          document.body.removeChild(textArea);
        } catch (err) {
          document.body.removeChild(textArea);
        }
      }
    }
    
    // ✅ Update button feedback IMMEDIATELY (synchronous)
    const originalText = button.textContent;
    if (copySuccess) {
      button.textContent = '✅ Link Copied!';
      button.style.background = '#4ECDC4';
    } else {
      button.textContent = '⚠️ Copy Failed';
      button.style.background = '#ff6b6b';
    }
    
    setTimeout(() => {
      button.textContent = originalText;
      button.style.background = '#ffb642';
    }, 2000);
    
    // ✅ Run async operations AFTER copy (background tasks)
    (async () => {
      if (buttonTemplate === TEMPLATE_IDS.BLOCKS) {
        return;
      }
      // Title is auto-generated, ensure it's set
      if (!BRAND_CONFIG.title || BRAND_CONFIG.title === 'Pacman Game') {
        const timestamp = new Date().toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        }).replace(',', '');
        BRAND_CONFIG.title = `Pacman Game - ${timestamp}`;
      }
      
      // Save mapIndex to BRAND_CONFIG
      const mapSelect = document.getElementById('mapSelect');
      if (mapSelect) {
        const selectedMap = parseInt(mapSelect.value, 10);
        if (selectedMap >= 1 && selectedMap <= MAPS.length) {
          BRAND_CONFIG.mapIndex = selectedMap - 1;
        }
      }
      
      // Ensure game is saved
      const isSaved = (saveBtn && saveBtn.dataset.saved === 'true') || 
                      (saveBtnMobile && saveBtnMobile.dataset.saved === 'true');
      if (!isSaved) {
        const savedId = saveBrandConfig(gameId);
        if (saveBtn) {
          saveBtn.dataset.gameId = gameId;
          saveBtn.dataset.saved = 'true';
        }
        if (saveBtnMobile) {
          saveBtnMobile.dataset.gameId = gameId;
          saveBtnMobile.dataset.saved = 'true';
        }
      }
      
      // Sync to Supabase (background)
      button.dataset.supabaseSync = 'pending';
      await syncGameToSupabase(gameId, 'public-link');
      button.dataset.supabaseSync = 'success';
    })();
  };

  // Public Link button (Desktop)
  if (publicLinkBtn) {
    publicLinkBtn.addEventListener('click', () => handlePublicLinkClick(publicLinkBtn));
  }
  
  // ✅ FIX: Public Link button (Mobile) - Add event listener
  if (publicLinkBtnMobile) {
    publicLinkBtnMobile.addEventListener('click', () => handlePublicLinkClick(publicLinkBtnMobile));
  }
}

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
  const baseHeight = 800; // 70px HUD + 730px game area (no footer on mobile editor)
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
  
  // ONLY check ?game= parameter from URL query string
  // This ensures editor is visible when there's no ?game= parameter
  const urlParams = new URLSearchParams(window.location.search);
  gameId = urlParams.get('game');
  
  // Only set isPublicGame if ?game= parameter exists
  // This ensures editor is not hidden when there's no ?game= parameter
  const isPublicGame = gameId !== null && gameId !== '';
  const editorModeStorageKey = gameId ? `pacman_editor_mode_${gameId}` : null;
  
  console.log('🔍 Game ID Detection:', {
    gameId,
    isPublicGame,
    url: window.location.href,
    search: window.location.search,
    pathname: window.location.pathname,
    hasGetGameId: typeof getGameId === 'function'
  });
  
  // Get DOM elements
  const creatorScreen = document.getElementById('creatorScreen');
  const editorContainer = document.getElementById('editorContainer');
  const editorToggle = document.getElementById('editorToggle');
  const gameWrapper = document.getElementById('gameWrapper');
  const gameCanvas = document.getElementById('gameCanvas');
  
  if (isPublicGame) {
    const isBlocksPublicGame = typeof gameId === 'string' && gameId.startsWith('blocks-');
    if (isBlocksPublicGame) {
      console.log('🎮 Blocks public game mode - Game ID:', gameId);
      const blocksWrapperEl = document.getElementById('blocksWrapper');
      const blocksGameFrame = document.getElementById('blocksGameFrame');
      const blocksEditorFrame = document.getElementById('blocksEditorFrame');
      if (creatorScreen) {
        creatorScreen.style.display = 'none';
      }
      if (editorContainer) {
        editorContainer.classList.remove('active');
        editorContainer.style.display = 'none';
      }
      if (editorToggle) {
        editorToggle.style.display = 'none';
      }
      if (gameWrapper) {
        gameWrapper.style.display = 'none';
      }
      document.body.classList.add('public-game-view');
      document.body.dataset.template = TEMPLATE_IDS.BLOCKS;
      const hasLocalBlocksConfig = loadBlocksConfig(gameId);
      if (!hasLocalBlocksConfig) {
        await loadBlocksConfigFromSupabase(gameId);
      }
      if (blocksEditorFrame) {
        blocksEditorFrame.addEventListener('load', () => sendBlocksConfigToIframe('editor'), { once: true });
      }
      if (blocksGameFrame) {
        blocksGameFrame.addEventListener('load', () => sendBlocksConfigToIframe('game'), { once: true });
      }
      sendBlocksConfigToIframe('both');
      if (blocksWrapperEl) {
        blocksWrapperEl.style.display = 'flex';
        blocksWrapperEl.style.visibility = 'visible';
      }
      return;
    }
    // ====================================
    // PUBLIC GAME MODE - Show game, hide editor
    // ====================================
    console.log('🎮 Public game mode - Game ID:', gameId);

    if (editorModeStorageKey) {
      localStorage.removeItem(editorModeStorageKey);
    }

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
    
    // Hide editor elements
    if (creatorScreen) {
      creatorScreen.style.display = 'none';
    }
    if (editorContainer) {
      editorContainer.classList.remove('active');
      editorContainer.style.display = 'none';
    }
    if (editorToggle) {
      editorToggle.style.display = 'none';
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
      await loadBrandConfigFromSupabase(gameId);
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
    
      // ✅ FIX: Load mapIndex from BRAND_CONFIG before initializing level (public game mode)
      const savedMapIndex = BRAND_CONFIG.mapIndex !== undefined ? BRAND_CONFIG.mapIndex : 0;
      mapIndex = savedMapIndex;
      const baseMap = MAPS[mapIndex] || MAPS[0] || [];
      currentMap = baseMap.map(row => [...row]);
      
      // Initialize level (reset positions)
      initLevel(1);

      // ✅ CRITICAL: Auto-focus canvas so arrow keys work immediately without clicking
      if (gameCanvas) {
        gameCanvas.focus();
      }
      
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
        if (editorModeStorageKey) {
          localStorage.removeItem(editorModeStorageKey);
        }
        if (creatorScreen) creatorScreen.style.display = 'none';
        if (editorContainer) {
          editorContainer.classList.remove('active');
          editorContainer.style.display = 'none';
        }
        if (editorToggle) editorToggle.style.display = 'none';
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
        
        // ✅ FIX: Load mapIndex from BRAND_CONFIG before initializing level (recheck mode)
        const savedMapIndex = BRAND_CONFIG.mapIndex !== undefined ? BRAND_CONFIG.mapIndex : 0;
        mapIndex = savedMapIndex;
        const baseMap = MAPS[mapIndex] || MAPS[0] || [];
        currentMap = baseMap.map(row => [...row]);
        
        // Initialize level (reset positions)
        initLevel(1);
        
        // ✅ CRITICAL: Auto-focus canvas so arrow keys work immediately without clicking
        if (gameCanvas) {
          gameCanvas.focus();
        }
        
        if (ctx && canvas) {
          render();
        }
      }
    }, 200);
    // ====================================
    // EDITOR MODE - Show editor, hide game
    // ====================================
    console.log('✏️ Editor mode - No game ID');
    
    // Hide game elements
    if (gameWrapper) {
      gameWrapper.style.display = 'none';
    }
    
    // Show editor elements
    if (creatorScreen) {
      creatorScreen.style.display = 'block';
    }
    if (editorContainer) {
      editorContainer.classList.add('active');
      editorContainer.style.display = 'flex';
    }
    
    // ✅ FIX: Load brand config with saved gameId BEFORE initGame() in editor mode
    // This ensures mapIndex is loaded from the correct localStorage key
    const lastSavedGameId = localStorage.getItem('pacman_last_saved_game_id');
    if (lastSavedGameId) {
      console.log('[Editor Mode] Loading config with last saved gameId:', lastSavedGameId);
      loadBrandConfig(lastSavedGameId);
      console.log('[Editor Mode] BRAND_CONFIG.mapIndex after loadBrandConfig:', BRAND_CONFIG.mapIndex);
    } else {
      console.log('[Editor Mode] No saved gameId, loading default config');
      loadBrandConfig();
      console.log('[Editor Mode] BRAND_CONFIG.mapIndex after loadBrandConfig:', BRAND_CONFIG.mapIndex);
    }
    
    // Initialize game (for preview) and editor
    initGame();
    setupEditor();
    
    // On mobile, scroll to top (page 1) on refresh
    if (window.innerWidth <= 992) {
      setTimeout(() => {
        scrollToCreatorScreen();
      }, 100);
    }
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

// Restart button
const restartBtn = document.getElementById('restartBtn');
if (restartBtn) {
  restartBtn.addEventListener('click', restartGame);
}


