// Shooter Template - Config
// Import shared utilities from core/
import { getGameId as getGameIdUtil, generateGameId as generateGameIdUtil } from '../core/game-id-utils.js';

// Storage key prefix - MUST match editor-adapter.js
const SHOOTER_STORAGE_PREFIX = 'shooter_brand_config_';

// Default logo path (relative to template folder)
const DEFAULT_LOGO = 'assets/binance-logo.webp';

// Brand config mặc định
export const BRAND_CONFIG = {
    logoUrl: '',           // Logo trong shooter + game over (empty = use default)
    storyText: 'memeplay', // Story text
    mapColor: '#1a1a2e'    // Background color (Dark Blue default)
};

// Get effective logo URL (returns default if empty)
export function getEffectiveLogoUrl() {
    return BRAND_CONFIG.logoUrl || DEFAULT_LOGO;
}

// Load config từ localStorage
export function loadBrandConfig() {
    const gameId = getGameId();
    if (!gameId) return BRAND_CONFIG;
    
    // Try with correct prefix (matching editor-adapter.js)
    const saved = localStorage.getItem(`${SHOOTER_STORAGE_PREFIX}${gameId}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(BRAND_CONFIG, parsed);
        } catch (e) {
            // Silent fail - use default config
        }
    }
    return BRAND_CONFIG;
}

// Save config vào localStorage
export function saveBrandConfig(config) {
    const gameId = getGameId();
    if (!gameId) return;
    
    Object.assign(BRAND_CONFIG, config);
    localStorage.setItem(`${SHOOTER_STORAGE_PREFIX}${gameId}`, JSON.stringify(BRAND_CONFIG));
}

// Generate game ID với prefix shooter
export function generateGameId() {
    return generateGameIdUtil('shooter');
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

