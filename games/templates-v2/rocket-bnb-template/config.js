// ====================================
// GAME CONFIGURATION
// ====================================

// ✅ Import shared utilities
import { getGameId, generateGameId as generateGameIdUtil } from '../core/game-id-utils.js';
import { loadLogoImage } from '../core/logo-loader.js';

// Brand customization (loaded from editor)
let BRAND_CONFIG = {
  coinLogo: null, // Logo image object for coins
  coinLogoUrl: '',
  gameOverLogo: null, // Logo image object for game over screen
  gameOverLogoUrl: '',
  tokenStory: 'welcome to memeplay', // Story text for game over
  smartContract: '' // Smart contract address
};

// Cache last used storage key to keep save/load consistent
let lastUsedStorageKey = null;

// ✅ Re-export shared utilities for backward compatibility
function generateGameId() {
  return generateGameIdUtil('rocket-bnb');
}

// Load brand config from localStorage or use defaults
function loadBrandConfig(gameIdOverride = null) {
  const gameId = gameIdOverride || getGameId();
  
  // ✅ Determine storage key(s) to try
  let storageKeys = [];
  
  if (gameId === 'playtest-rocket-bnb') {
    // Direct playtest ID
    storageKeys.push('rocket_bnb_brand_config_playtest');
  } else if (gameId && gameId.startsWith('playmode-rocket-bnb-')) {
    // GameId format from editor: playmode-rocket-bnb-XXX
    // Try gameId key first, then fallback to playtest key
    storageKeys.push(`rocket_bnb_brand_config_${gameId}`);
    storageKeys.push('rocket_bnb_brand_config_playtest');
  } else if (gameId) {
    // Other gameId format
    storageKeys.push(`rocket_bnb_brand_config_${gameId}`);
  } else {
    // No gameId
    storageKeys.push('rocket_bnb_brand_config');
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

      // ✅ Load logos using shared utility
      loadLogoImage(BRAND_CONFIG.coinLogoUrl,
        (img) => {
          BRAND_CONFIG.coinLogo = img;
        },
        () => console.warn('[loadBrandConfig] Failed to load coin logo')
      );
      
      loadLogoImage(BRAND_CONFIG.gameOverLogoUrl,
        (img) => {
          BRAND_CONFIG.gameOverLogo = img;
        },
        () => console.warn('[loadBrandConfig] Failed to load game over logo')
      );
      
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
      coinLogoUrl: BRAND_CONFIG.coinLogoUrl,
      gameOverLogoUrl: BRAND_CONFIG.gameOverLogoUrl,
      tokenStory: BRAND_CONFIG.tokenStory || 'welcome to memeplay',
      smartContract: BRAND_CONFIG.smartContract || ''
    }));
    return lastUsedStorageKey;
  }

  const id = gameId || getGameId() || 'rocket_bnb_brand_config';
  const storageKey = id.startsWith('rocket_bnb_brand_config') ? id : `rocket_bnb_brand_config_${id}`;
  lastUsedStorageKey = storageKey;
  const toSave = {
    coinLogoUrl: BRAND_CONFIG.coinLogoUrl,
    gameOverLogoUrl: BRAND_CONFIG.gameOverLogoUrl,
    tokenStory: BRAND_CONFIG.tokenStory || 'welcome to memeplay',
    smartContract: BRAND_CONFIG.smartContract || ''
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

