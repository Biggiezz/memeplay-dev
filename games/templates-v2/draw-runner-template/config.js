// Draw Runner Template - Config
// Import shared utilities from core/
import { getGameId as getGameIdUtil, generateGameId as generateGameIdUtil } from '../core/game-id-utils.js';

// Template ID
export const TEMPLATE_ID = 'drawRunner1';

// Storage key prefix - MUST match editor-adapter.js
const DRAW_RUNNER_STORAGE_PREFIX = 'draw_runner_brand_config_';

// Default logo path (relative to template folder)
const DEFAULT_LOGO = 'assets/logo.webp';

// Brand config mặc định
export const BRAND_CONFIG = {
    logoUrl: '',           // Logo (empty = use default)
    storyText: 'MEMEPLAY'  // Story text hiển thị màn hình game over
};

// Get effective logo URL (returns default if empty)
export function getEffectiveLogoUrl() {
    return BRAND_CONFIG.logoUrl || DEFAULT_LOGO;
}

// Load config từ localStorage - returns true if found, false otherwise
export function loadBrandConfig(gameIdOverride = null) {
    const gameId = gameIdOverride || getGameId();
    if (!gameId) return false;
    
    const saved = localStorage.getItem(`${DRAW_RUNNER_STORAGE_PREFIX}${gameId}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(BRAND_CONFIG, parsed);
            console.log('[Draw Runner Config] Loaded from localStorage:', { gameId, config: BRAND_CONFIG });
            return true;
        } catch (e) {
            console.warn('[Draw Runner Config] Failed to parse localStorage config:', e);
            return false;
        }
    }
    console.log('[Draw Runner Config] No config found in localStorage for:', gameId);
    return false;
}

// Save config vào localStorage
export function saveBrandConfig(config) {
    const gameId = getGameId();
    if (!gameId) return;
    
    Object.assign(BRAND_CONFIG, config);
    localStorage.setItem(`${DRAW_RUNNER_STORAGE_PREFIX}${gameId}`, JSON.stringify(BRAND_CONFIG));
}

// Generate game ID với prefix draw-runner
export function generateGameId() {
    return generateGameIdUtil('draw-runner');
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
window.getEffectiveLogoUrl = getEffectiveLogoUrl;
window.TEMPLATE_ID = TEMPLATE_ID;
