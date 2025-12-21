// Moon Template - Config
// Import shared utilities from core/
import { getGameId as getGameIdUtil, generateGameId as generateGameIdUtil } from '../core/game-id-utils.js';

// Template ID
export const TEMPLATE_ID = 'moon-template';

// Storage key prefix - MUST match editor-adapter.js
const MOON_STORAGE_PREFIX = 'moon_brand_config_';

// Default logo path (relative to template folder)
const DEFAULT_LOGO = 'assets/bnb-logo.webp';

// Available background colors
export const MAP_COLORS = [
    { id: 'cosmic-purple', name: 'Cosmic Purple', color: '#1a0a2e' },
    { id: 'deep-space', name: 'Deep Space', color: '#0a0a1a' },
    { id: 'nebula-blue', name: 'Nebula Blue', color: '#0a1a2e' }
];

// Brand config mặc định
export const BRAND_CONFIG = {
    logoUrl: '',           // Logo (empty = use default)
    storyText: 'MEMEPLAY', // Story text hiển thị màn hình game over
    mapColor: '#1a0a2e'    // Background color (Cosmic Purple default)
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

// Get logo URL with cache buster
export function getLogoUrlWithCacheBuster(url) {
    if (!url || url.startsWith('data:')) {
        return url;
    }
    return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
}

// Load config từ localStorage - returns true if found, false otherwise
export function loadBrandConfig(gameIdOverride = null) {
    const gameId = gameIdOverride || getGameId();
    
    // Nếu không có gameId, load từ playtest key
    const storageKey = gameId 
        ? `${MOON_STORAGE_PREFIX}${gameId}`
        : `${MOON_STORAGE_PREFIX}playtest`;
    
    if (!storageKey) return false;
    
    const saved = localStorage.getItem(storageKey);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(BRAND_CONFIG, parsed);
            console.log('[Moon Config] Loaded from localStorage:', { gameId, config: BRAND_CONFIG });
            return true;
        } catch (e) {
            console.warn('[Moon Config] Failed to parse localStorage config:', e);
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
    console.log('[Moon Config] Saved to localStorage:', { gameId, config: BRAND_CONFIG });
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
window.getLogoUrlWithCacheBuster = getLogoUrlWithCacheBuster;
window.MAP_COLORS = MAP_COLORS;
window.TEMPLATE_ID = TEMPLATE_ID;
