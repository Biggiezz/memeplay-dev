// ====================================
// GAME CONFIGURATION
// ====================================

// ✅ Import shared utilities
import { getGameId, generateGameId as generateGameIdUtil } from '../core/game-id-utils.js';
import { loadLogoImage } from '../core/logo-loader.js';

// Brand customization (loaded from editor)
let BRAND_CONFIG = {
  brickColor: '#4a90a4',        // Màu gạch (default: Teal)
  logo: null,                    // Logo image object (for game over screen)
  ballLogo: null,                // Logo image object (for ball sprite) - same as logo
  logoUrl: '',                   // Logo URL (dùng cho cả game over và ball)
  logoLoaded: false,             // Track logo loading state
  story: 'welcome to memeplay'   // Story text (1 string, không phải array)
};

// Cache last used storage key to keep save/load consistent
let lastUsedStorageKey = null;

// ✅ Re-export shared utilities for backward compatibility
function generateGameId() {
  return generateGameIdUtil('fallen-crypto');
}

// Load brand config from localStorage or use defaults
function loadBrandConfig(gameIdOverride = null) {
  const gameId = gameIdOverride || getGameId();
  
  // ✅ Determine storage key(s) to try
  let storageKeys = [];
  
  if (gameId === 'playtest-fallen-crypto') {
    // Direct playtest ID
    storageKeys.push('fallen_crypto_brand_config_playtest');
  } else if (gameId && gameId.startsWith('playmode-fallen-crypto-')) {
    // GameId format from editor: playmode-fallen-crypto-XXX
    // Try gameId key first, then fallback to playtest key
    storageKeys.push(`fallen_crypto_brand_config_${gameId}`);
    storageKeys.push('fallen_crypto_brand_config_playtest');
  } else if (gameId) {
    // Other gameId format
    storageKeys.push(`fallen_crypto_brand_config_${gameId}`);
  } else {
    // No gameId
    storageKeys.push('fallen_crypto_brand_config');
  }
  
  // Try each storage key until we find a saved config
  let saved = null;
  let usedKey = null;
  for (const key of storageKeys) {
    saved = localStorage.getItem(key);
    if (saved) {
      usedKey = key;
      lastUsedStorageKey = key;
      break;
    }
  }
  
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      BRAND_CONFIG = { ...BRAND_CONFIG, ...parsed };

      // ✅ Load logo using shared utility
      if (BRAND_CONFIG.logoUrl) {
        loadLogoImage(BRAND_CONFIG.logoUrl,
          (img) => {
            BRAND_CONFIG.logo = img;
          },
          () => console.warn('[loadBrandConfig] Failed to load logo')
        );
      }
      
      return true;
    } catch (e) {
      console.error('Failed to load brand config:', e);
      return false;
    }
  } else {
    return false;
  }
}

// Save brand config to localStorage
function saveBrandConfig(gameId = null) {
  // Prefer last used key to avoid creating multiple entries for the same game
  if (!gameId && lastUsedStorageKey) {
    localStorage.setItem(lastUsedStorageKey, JSON.stringify({
      brickColor: BRAND_CONFIG.brickColor || '#4a90a4',
      logoUrl: BRAND_CONFIG.logoUrl || '',
      story: BRAND_CONFIG.story || 'welcome to memeplay'
    }));
    return lastUsedStorageKey;
  }

  const id = gameId || getGameId() || 'fallen_crypto_brand_config';
  const storageKey = id.startsWith('fallen_crypto_brand_config') ? id : `fallen_crypto_brand_config_${id}`;
  lastUsedStorageKey = storageKey;
  const toSave = {
    brickColor: BRAND_CONFIG.brickColor || '#4a90a4',
    logoUrl: BRAND_CONFIG.logoUrl || '',
    story: BRAND_CONFIG.story || 'welcome to memeplay'
  };
  localStorage.setItem(storageKey, JSON.stringify(toSave));
  return id;
}

// ✅ Export for game.js (both window and ES module)
export { BRAND_CONFIG, loadBrandConfig, saveBrandConfig, generateGameId, getGameId };

// ✅ Also expose on window for backward compatibility
window.getGameId = getGameId;
window.loadBrandConfig = loadBrandConfig;
window.saveBrandConfig = saveBrandConfig;
window.generateGameId = generateGameId;
window.BRAND_CONFIG = BRAND_CONFIG;

// Initialize on load
loadBrandConfig();
