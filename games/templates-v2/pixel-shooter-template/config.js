// ====================================
// GAME CONFIGURATION
// ====================================

// Brand customization (loaded from editor)
let BRAND_CONFIG = {
  fragmentLogo: null, // Logo image object
  fragmentLogoUrl: '',
  title: 'Pixel Shooter Game',
  smartContract: '', // Smart contract address
  mapColor: '#1a1a2e', // Background color (default: dark blue)
  stories: [] // Story text for game over
};

// Get game ID from URL query param ONLY
function getGameId() {
  const url = new URL(window.location.href);
  const gameIdFromQuery = url.searchParams.get('game');
  if (gameIdFromQuery) return gameIdFromQuery;
  return null;
}

// Generate unique game ID (format: playmode-pixel-shooter-XXX)
function generateGameId() {
  const digits = String(Date.now() % 1000).padStart(3, '0');
  const letter = (Math.random().toString(36).match(/[a-z]/) || ['a'])[0];
  return `playmode-pixel-shooter-${digits}${letter}`;
}

// Load brand config from localStorage or use defaults
function loadBrandConfig(gameIdOverride = null) {
  const gameId = gameIdOverride || getGameId();
  // ✅ Nếu là playtest (gameId = 'playtest-pixel-shooter'), load từ key cố định
  let storageKey;
  if (gameId === 'playtest-pixel-shooter') {
    storageKey = 'pixel_shooter_brand_config_playtest';
  } else {
    storageKey = gameId ? `pixel_shooter_brand_config_${gameId}` : 'pixel_shooter_brand_config';
  }
  const saved = localStorage.getItem(storageKey);
  console.log('[loadBrandConfig] Loading config:', { gameId, storageKey, hasSaved: !!saved });
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      BRAND_CONFIG = { ...BRAND_CONFIG, ...parsed };
      
      // ✅ FIX: Only keep stories that are actually set by user
      if (!Array.isArray(BRAND_CONFIG.stories)) {
        BRAND_CONFIG.stories = [];
      }
      // Remove empty stories (keep only stories with content)
      BRAND_CONFIG.stories = BRAND_CONFIG.stories.filter(story => story && story.trim() !== '');
      
      console.log('[loadBrandConfig] Loaded config:', { 
        title: BRAND_CONFIG.title,
        mapColor: BRAND_CONFIG.mapColor,
        storiesCount: BRAND_CONFIG.stories.length,
        stories: BRAND_CONFIG.stories
      });
      
      // Load fragment logo image if URL exists
      if (BRAND_CONFIG.fragmentLogoUrl) {
        const img = new Image();
        img.onload = () => {
          BRAND_CONFIG.fragmentLogo = img;
          console.log('[loadBrandConfig] Logo loaded');
        };
        img.onerror = () => {
          console.warn('[loadBrandConfig] Failed to load logo');
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
  const id = gameId || getGameId() || 'pixel_shooter_brand_config';
  const storageKey = id.startsWith('pixel_shooter_brand_config') ? id : `pixel_shooter_brand_config_${id}`;
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

// Export functions for game.js
window.getGameId = getGameId;
window.loadBrandConfig = loadBrandConfig;
window.saveBrandConfig = saveBrandConfig;
window.generateGameId = generateGameId;

// Initialize on load
loadBrandConfig();


