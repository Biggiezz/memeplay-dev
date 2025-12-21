// Moon Rocket Template - Config
// Import shared utilities from core/
import { getGameId as getGameIdUtil, generateGameId as generateGameIdUtil } from '../templates-v2/core/game-id-utils.js';

// Template ID
export const TEMPLATE_ID = 'moon-template';

// Storage key prefix - MUST match editor-adapter.js
const MOON_STORAGE_PREFIX = 'moon_brand_config_';

// Default logo path (relative to template folder) - Logo BNB
const DEFAULT_LOGO = 'assets/bnb-logo.webp'; // Logo BNB

// Brand config mặc định
export const BRAND_CONFIG = {
    logoUrl: '',           // Logo (empty = use default)
    storyText: 'MEMEPLAY', // Story text hiển thị màn hình game over
};

// Get effective logo URL (returns default if empty)
export function getEffectiveLogoUrl() {
    // If logoUrl is empty or invalid, use default
    if (!BRAND_CONFIG.logoUrl || BRAND_CONFIG.logoUrl.trim() === '') {
        return DEFAULT_LOGO;
    }
    
    // If logoUrl is a data URL (base64), return as-is
    if (BRAND_CONFIG.logoUrl.startsWith('data:')) {
        return BRAND_CONFIG.logoUrl;
    }
    
    // If logoUrl is a relative path, ensure it starts with ./
    if (!BRAND_CONFIG.logoUrl.startsWith('http') && !BRAND_CONFIG.logoUrl.startsWith('/') && !BRAND_CONFIG.logoUrl.startsWith('./')) {
        return './' + BRAND_CONFIG.logoUrl;
    }
    
    return BRAND_CONFIG.logoUrl;
}

// Load config từ localStorage - returns true if found, false otherwise
export function loadBrandConfig(gameIdOverride = null) {
    const gameId = gameIdOverride || getGameId();
    if (!gameId) return false;
    
    const saved = localStorage.getItem(`${MOON_STORAGE_PREFIX}${gameId}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(BRAND_CONFIG, parsed);
            return true;
        } catch (e) {
            return false;
        }
    }
    return false;
}

// Save config vào localStorage
export function saveBrandConfig(config) {
    const gameId = getGameId();
    if (!gameId) return;
    
    Object.assign(BRAND_CONFIG, config);
    localStorage.setItem(`${MOON_STORAGE_PREFIX}${gameId}`, JSON.stringify(BRAND_CONFIG));
}

// Generate game ID với prefix moon
export function generateGameId() {
    return generateGameIdUtil('moon');
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

