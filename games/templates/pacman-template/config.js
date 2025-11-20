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
  TILE_SIZE: 20, // Optimized for 35 cols (35 * 20 = 700px < 720px)
  
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
  stories: [
    'Congratulations! You collected all fragments!',
    'Amazing! You completed the level!',
    'Well done! Ready for the next challenge?'
  ]
};

// Get game ID from URL query param or generate new one
function getGameId() {
  const urlParams = new URLSearchParams(window.location.search);
  const gameId = urlParams.get('game');
  return gameId || null;
}

// Generate unique game ID
function generateGameId() {
  const titleInput = document.getElementById('titleInput');
  const rawTitle = titleInput ? titleInput.value.trim() : '';
  const slug = rawTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'memeplay-project';
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `${slug}-${randomSuffix}`;
}

// Load brand config from localStorage or use defaults
function loadBrandConfig() {
  const gameId = getGameId();
  const storageKey = gameId ? `pacman_brand_config_${gameId}` : 'pacman_brand_config';
  const saved = localStorage.getItem(storageKey);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      BRAND_CONFIG = { ...BRAND_CONFIG, ...parsed };
      
      // Load fragment logo image if URL exists
      if (BRAND_CONFIG.fragmentLogoUrl) {
        const img = new Image();
        img.onload = () => {
          BRAND_CONFIG.fragmentLogo = img;
        };
        img.src = BRAND_CONFIG.fragmentLogoUrl;
      }
    } catch (e) {
      console.error('Failed to load brand config:', e);
    }
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
    stories: BRAND_CONFIG.stories
  };
  localStorage.setItem(storageKey, JSON.stringify(toSave));
  return id;
}

// Initialize on load
loadBrandConfig();

