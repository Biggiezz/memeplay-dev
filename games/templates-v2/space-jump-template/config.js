// Space Jump Template - Config
// Import shared utilities from core/
import { getGameId as getGameIdUtil, generateGameId as generateGameIdUtil } from '../core/game-id-utils.js';

// Brand config mặc định
export const BRAND_CONFIG = {
    headLogoUrl: '',           // Logo trong đầu nhân vật (hình vuông)
    gameOverLogoUrl: '',       // Logo màn hình game over
    storyText: 'memeplay'      // Story text
};

// ✅ FIX BUG 2: Use correct storage prefix matching editor-adapter.js
const SPACE_JUMP_STORAGE_PREFIX = 'space_jump_brand_config_';

// Load config từ localStorage
export function loadBrandConfig(gameIdOverride = null) {
    const gameId = gameIdOverride || getGameId();
    if (!gameId) {
        // Try playtest key
        const playtestKey = `${SPACE_JUMP_STORAGE_PREFIX}playtest`;
        const saved = localStorage.getItem(playtestKey);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                Object.assign(BRAND_CONFIG, parsed);
                return true;
            } catch (e) {
                console.warn('[SpaceJump Config] Failed to parse playtest config:', e);
            }
        }
        return false;
    }
    
    // ✅ FIX: Use correct storage prefix matching editor-adapter.js
    const storageKey = `${SPACE_JUMP_STORAGE_PREFIX}${gameId}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(BRAND_CONFIG, parsed);
            console.log('[SpaceJump Config] Loaded config:', { gameId, storageKey, config: BRAND_CONFIG });
            return true;
        } catch (e) {
            console.warn('[SpaceJump Config] Failed to parse saved config:', e);
        }
    }
    console.log('[SpaceJump Config] No config found for:', storageKey);
    return false;
}

// Save config vào localStorage
export function saveBrandConfig(config) {
    const gameId = getGameId();
    if (!gameId) return;
    
    Object.assign(BRAND_CONFIG, config);
    // ✅ FIX: Use correct storage prefix matching editor-adapter.js
    const storageKey = `${SPACE_JUMP_STORAGE_PREFIX}${gameId}`;
    localStorage.setItem(storageKey, JSON.stringify(BRAND_CONFIG));
}

// Generate game ID với prefix space-jump
export function generateGameId() {
    return generateGameIdUtil('space-jump');
}

// Get game ID từ URL
export function getGameId() {
    return getGameIdUtil();
}

// Window expose (backward compatibility)
window.BRAND_CONFIG = BRAND_CONFIG;
window.loadBrandConfig = loadBrandConfig;
window.saveBrandConfig = saveBrandConfig;
window.generateGameId = generateGameId;
window.getGameId = getGameId;

