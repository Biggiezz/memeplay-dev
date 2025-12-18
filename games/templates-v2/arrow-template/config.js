// Arrow Template - Config
// Import shared utilities from core/
import { getGameId as getGameIdUtil, generateGameId as generateGameIdUtil } from '../core/game-id-utils.js';

// Template ID
export const TEMPLATE_ID = 'arrow1';

// Storage key prefix - MUST match editor-adapter.js
const ARROW_STORAGE_PREFIX = 'arrow_brand_config_';

// Default logo path (relative to template folder)
const DEFAULT_LOGO = 'assets/binance-logo.webp';

// Available background colors
export const MAP_COLORS = [
    { id: 'sky-blue', name: 'Sky Blue', color: '#87CEEB' },
    { id: 'light-green', name: 'Light Green', color: '#90EE90' },
    { id: 'light-purple', name: 'Light Purple', color: '#DDA0DD' }
];

// Brand config mặc định
export const BRAND_CONFIG = {
    logoUrl: '',           // Logo trên chim trắng + game over (empty = use default)
    storyText: 'MEMEPLAY', // Story text hiển thị màn hình game over
    mapColor: '#87CEEB'    // Background color (Sky Blue default)
};

// Get effective logo URL (returns default if empty)
export function getEffectiveLogoUrl() {
    return BRAND_CONFIG.logoUrl || DEFAULT_LOGO;
}

// Load config từ localStorage - returns true if found, false otherwise
export function loadBrandConfig(gameIdOverride = null) {
    const gameId = gameIdOverride || getGameId();
    if (!gameId) return false;
    
    // Try with correct prefix (matching editor-adapter.js)
    const saved = localStorage.getItem(`${ARROW_STORAGE_PREFIX}${gameId}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(BRAND_CONFIG, parsed);
            console.log('[Arrow Config] Loaded from localStorage:', { gameId, config: BRAND_CONFIG });
            return true;
        } catch (e) {
            console.warn('[Arrow Config] Failed to parse localStorage config:', e);
            return false;
        }
    }
    console.log('[Arrow Config] No config found in localStorage for:', gameId);
    return false;
}

// Save config vào localStorage
export function saveBrandConfig(config) {
    const gameId = getGameId();
    if (!gameId) return;
    
    Object.assign(BRAND_CONFIG, config);
    localStorage.setItem(`${ARROW_STORAGE_PREFIX}${gameId}`, JSON.stringify(BRAND_CONFIG));
}

// Generate game ID với prefix arrow
export function generateGameId() {
    return generateGameIdUtil('arrow');
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
window.MAP_COLORS = MAP_COLORS;
window.TEMPLATE_ID = TEMPLATE_ID;

