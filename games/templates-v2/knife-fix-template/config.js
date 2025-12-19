// Knife Fix Template - Config
// Import shared utilities from core/
import { getGameId as getGameIdUtil, generateGameId as generateGameIdUtil } from '../core/game-id-utils.js';

// Template ID
export const TEMPLATE_ID = 'knife-fix-template';

// Storage key prefix - MUST match editor-adapter.js
const KNIFE_FIX_STORAGE_PREFIX = 'knife_fix_brand_config_';

// Default logo path (relative to template folder)
const DEFAULT_LOGO = 'assets/logo.webp';

// Available background colors
export const MAP_COLORS = [
    { id: 'sky-blue', name: 'Sky Blue', color: '#87CEEB' },
    { id: 'light-green', name: 'Light Green', color: '#90EE90' },
    { id: 'light-purple', name: 'Light Purple', color: '#DDA0DD' }
];

// Brand config mặc định
export const BRAND_CONFIG = {
    logoUrl: '',           // Logo (empty = use default)
    storyText: 'MEMEPLAY', // Story text hiển thị màn hình game over
    mapColor: '#87CEEB'    // Background color (Sky Blue default)
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
    
    const saved = localStorage.getItem(`${KNIFE_FIX_STORAGE_PREFIX}${gameId}`);
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
    localStorage.setItem(`${KNIFE_FIX_STORAGE_PREFIX}${gameId}`, JSON.stringify(BRAND_CONFIG));
}

// Generate game ID với prefix knife-fix
export function generateGameId() {
    return generateGameIdUtil('knife-fix');
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
