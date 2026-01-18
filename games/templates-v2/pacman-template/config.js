// ====================================
// GAME CONFIGURATION
// ====================================

const CONFIG = {
  // Canvas dimensions (game area only - 700x730)
  CANVAS_WIDTH: 700,
  CANVAS_HEIGHT: 730,
  
  // Layout dimensions
  HEADER_HEIGHT: 70, // Header for score and level (HTML overlay)
  GAME_AREA_HEIGHT: 730, // Game area where map, player, and ghosts move
  FOOTER_HEIGHT: 200, // Footer for mobile controls (HTML overlay)
  
  // Tile size (calculated to fit map in 720x600 game area)
  // Maps are now dynamic size (35 cols max, variable rows)
  // TILE_SIZE calculated dynamically based on current map dimensions
  TILE_SIZE: 20, // 35 cols * 20 = 700px; 45 rows * 20 = 900px
  
  // Map dimensions are now dynamic (calculated from currentMap)
  // MAP_COLS and MAP_ROWS are calculated per map in initLevel()
  MAP_COLS: 35, // Max columns (for MAP1-MAP5)
  MAP_ROWS: 13, // Max rows (for MAP5)
  
  // Game settings
  FRAGMENTS_PER_LEVEL: 5,
  MAX_GHOSTS: 10,
  MIN_GHOSTS: 3, // Level 1 starts with 3 ghosts
  
  // Player settings
  PLAYER_SPEED: 4, // 2x faster (was 2)
  PLAYER_SIZE: 28, // Slightly smaller than TILE_SIZE (30px) to match visual collision
  
  // Ghost settings
  GHOST_SPEED: 1.2, // Slower for smoother movement
  GHOST_SIZE: 24,
  
  // Fragment settings
  FRAGMENT_SIZE: 16,
  FRAGMENT_COLORS: ['#FFD700', '#FF6B6B', '#4ECDC4', '#95E1D3', '#F38181'],
  FRAGMENT_LABELS: ['A', 'B', 'C', 'D', 'E'],
  
  // Gate settings
  GATE_BLINK_INTERVAL: 400, // milliseconds
  GATE_SIZE: 32,
  
  // Mobile controls
  MOBILE_BUTTON_SIZE: 100,
  MOBILE_BUTTON_OPACITY: 0.4,
  
  // Fragment logo optimization settings
  FRAGMENT_LOGO_MAX_SIZE: 128,
  FRAGMENT_LOGO_TARGET_SIZE_KB: 30,
  FRAGMENT_LOGO_QUALITY: 0.6,
  FRAGMENT_LOGO_MAX_FILE_SIZE: 5 * 1024 * 1024,
  HUD_FONT_SIZE: 20,
  HUD_COLOR: '#FFFFFF',
  
  // Colors
  WALL_COLOR: '#1a1a2e',
  PATH_COLOR: '#0f0f1e',
  GATE_COLOR: '#00ff00',
  GATE_COLOR_ALT: '#00cc00',
  
  // Animation
  ANIMATION_FPS: 60,
  
  // Editor panel
  EDITOR_PANEL_WIDTH: 300
};

// Brand customization (loaded from editor)
let BRAND_CONFIG = {
  fragmentLogo: null, // Fragment logo (BNB) image object
  fragmentLogoUrl: '',
  title: 'Hitmen Game',
  smartContract: '', // Smart contract address
  mapColor: '#1a1a2e', // Map wall color (default: dark blue)
  mapIndex: 0, // Selected map index (0 = Map 1, 1 = Map 2, etc.)
  stories: [] // ✅ FIX: Empty array by default - only add stories when user enters them
};

// Get game ID from URL (?game= param or pathname starting with playmode-)
function getGameId() {
  try {
    const url = new URL(window.location.href);
    const gameIdFromQuery = url.searchParams.get('game');
    if (gameIdFromQuery) return gameIdFromQuery;
    
    const path = url.pathname.replace(/^\/+/, '');
    if (path.startsWith('playmode-')) return path;
    
    return null; // Editor mode
  } catch (error) {
    console.error('[getGameId] Error:', error);
    return null;
  }
}

// Generate unique game ID (format: hitmen-7420)
function generateGameId() {
  // Generate 4-digit random number (1000-9999)
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `hitmen-${randomSuffix}`;
}

// Load brand config from localStorage (try both hitmen/pacman prefixes for backward compatibility)
function loadBrandConfig(gameIdOverride = null) {
  const gameId = gameIdOverride || getGameId();
  
  // Build storage keys to try
  const isPlaytest = gameId === 'playtest-hitmen' || gameId === 'playtest-pacman';
  const prefixes = ['hitmen_brand_config_', 'pacman_brand_config_'];
  const storageKeys = isPlaytest
    ? ['hitmen_brand_config_playtest', 'pacman_brand_config_playtest']
    : gameId
    ? prefixes.map(p => `${p}${gameId}`)
    : prefixes.map(p => p.slice(0, -1)); // Remove trailing underscore
  
  // Try each key until we find config
  for (const key of storageKeys) {
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        BRAND_CONFIG = { ...BRAND_CONFIG, ...parsed };
        
        // Normalize stories array
        if (!Array.isArray(BRAND_CONFIG.stories)) BRAND_CONFIG.stories = [];
        BRAND_CONFIG.stories = BRAND_CONFIG.stories.filter(s => s && s.trim() !== '');
        
        // Load logo image if URL exists
        if (BRAND_CONFIG.fragmentLogoUrl) {
          const img = new Image();
          img.onload = () => { BRAND_CONFIG.fragmentLogo = img; };
          img.src = BRAND_CONFIG.fragmentLogoUrl;
        }
        
        return true;
      } catch (e) {
        console.error('[loadBrandConfig] Parse error:', e);
        return false;
      }
    }
  }
  
  return false;
}

// Save brand config to localStorage (prefer pacman prefix for legacy gameIds)
function saveBrandConfig(gameId = null) {
  const id = gameId || getGameId() || 'hitmen_brand_config';
  const prefix = (id && (id.startsWith('playmode-pacman-') || id.startsWith('pacman-')))
    ? 'pacman_brand_config_'
    : 'hitmen_brand_config_';
  const storageKey = id.startsWith('hitmen_brand_config') || id.startsWith('pacman_brand_config')
    ? id
    : `${prefix}${id}`;
  
  localStorage.setItem(storageKey, JSON.stringify({
    fragmentLogoUrl: BRAND_CONFIG.fragmentLogoUrl,
    title: BRAND_CONFIG.title,
    smartContract: BRAND_CONFIG.smartContract || '',
    mapColor: BRAND_CONFIG.mapColor || '#1a1a2e',
    mapIndex: BRAND_CONFIG.mapIndex !== undefined ? BRAND_CONFIG.mapIndex : 0,
    stories: BRAND_CONFIG.stories
  }));
  
  return id;
}

// Initialize on load
loadBrandConfig();


