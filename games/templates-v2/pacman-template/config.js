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
  title: 'Pacman Game',
  smartContract: '', // Smart contract address
  mapColor: '#1a1a2e', // Map wall color (default: dark blue)
  mapIndex: 0, // Selected map index (0 = Map 1, 1 = Map 2, etc.)
  stories: [] // ✅ FIX: Empty array by default - only add stories when user enters them
};

// Get game ID from URL query param ONLY
// This ensures editor is visible when there's no ?game= parameter
function getGameId() {
  const url = new URL(window.location.href);
  
  // ✅ ONLY check ?game= parameter from URL query string
  // This ensures editor is not hidden when there's no ?game= parameter
  const gameIdFromQuery = url.searchParams.get('game');
  if (gameIdFromQuery) return gameIdFromQuery;
  
  // Don't parse from hash/pathname to avoid hiding editor
  // Hash/pathname parsing is only for backward compatibility when ?game= exists
  return null;
}

// Generate unique game ID (format: pacman-7420)
function generateGameId() {
  // Generate 4-digit random number (1000-9999)
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `pacman-${randomSuffix}`;
}

// Load brand config from localStorage or use defaults
function loadBrandConfig(gameIdOverride = null) {
  const gameId = gameIdOverride || getGameId();
  // ✅ Bước 2: Nếu là playtest (gameId = 'playtest-pacman'), load từ key cố định
  let storageKey;
  if (gameId === 'playtest-pacman') {
    storageKey = 'pacman_brand_config_playtest';
  } else {
    storageKey = gameId ? `pacman_brand_config_${gameId}` : 'pacman_brand_config';
  }
  const saved = localStorage.getItem(storageKey);
  console.log('[loadBrandConfig] Loading config:', { gameId, storageKey, hasSaved: !!saved });
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      BRAND_CONFIG = { ...BRAND_CONFIG, ...parsed };
      
      // ✅ FIX: Only keep stories that are actually set by user
      // Don't fill with defaults - if user only set story 1, only use story 1
      if (!Array.isArray(BRAND_CONFIG.stories)) {
        BRAND_CONFIG.stories = [];
      }
      // Remove empty stories (keep only stories with content)
      BRAND_CONFIG.stories = BRAND_CONFIG.stories.filter(story => story && story.trim() !== '');
      
      console.log('[loadBrandConfig] Loaded config:', { 
        mapIndex: BRAND_CONFIG.mapIndex, 
        title: BRAND_CONFIG.title,
        storiesCount: BRAND_CONFIG.stories.length,
        stories: BRAND_CONFIG.stories
      });
      
      // Load fragment logo image if URL exists
      if (BRAND_CONFIG.fragmentLogoUrl) {
        const img = new Image();
        img.onload = () => {
          BRAND_CONFIG.fragmentLogo = img;
        };
        img.src = BRAND_CONFIG.fragmentLogoUrl;
      }
      return true;
    } catch (e) {
      console.error('Failed to load brand config:', e);
      return false;
    }
  } else {
    console.log('[loadBrandConfig] No saved config found for:', storageKey);
    return false;
  }
}

// Save brand config to localStorage
function saveBrandConfig(gameId = null) {
  const id = gameId || getGameId() || 'pacman_brand_config';
  const storageKey = id.startsWith('pacman_brand_config') ? id : `pacman_brand_config_${id}`;
  const toSave = {
    fragmentLogoUrl: BRAND_CONFIG.fragmentLogoUrl,
    title: BRAND_CONFIG.title,
    smartContract: BRAND_CONFIG.smartContract || '',
    mapColor: BRAND_CONFIG.mapColor || '#1a1a2e',
    mapIndex: BRAND_CONFIG.mapIndex !== undefined ? BRAND_CONFIG.mapIndex : 0,
    stories: BRAND_CONFIG.stories
  };
  localStorage.setItem(storageKey, JSON.stringify(toSave));
  return id;
}

// Initialize on load
loadBrandConfig();


