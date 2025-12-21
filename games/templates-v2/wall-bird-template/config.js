// Wall-Bird Template - Config
// Import shared utilities from core/
import { getGameId as getGameIdUtil, generateGameId as generateGameIdUtil } from '../core/game-id-utils.js';

// Template ID
export const TEMPLATE_ID = 'wall-bird-template';

// Storage key prefix - MUST match editor-adapter.js
const WALL_BIRD_STORAGE_PREFIX = 'wall_bird_brand_config_';

// Default logo path (nếu có) - không dùng, có thể xóa

// Available background colors (3 màu: xanh lá nhạt, xanh blue, hồng nhạt)
export const MAP_COLORS = [
    { id: 'light-green', name: 'Light Green', color: '#90EE90' },  // Xanh lá nhạt
    { id: 'sky-blue', name: 'Sky Blue', color: '#87ceeb' },        // Xanh blue (mặc định)
    { id: 'light-pink', name: 'Light Pink', color: '#FFB6C1' }     // Hồng nhạt
];

// Brand config mặc định
export const BRAND_CONFIG = {
    logoUrl: '',              // Logo hiển thị trong pill (+5đ) và game over (1 logo cho 2 vị trí)
    storyText: 'memeplay',    // Story text ở game over screen
    backgroundColor: '#87ceeb' // Background color (Sky Blue default)
};

// Get effective logo URL (returns null nếu empty)
export function getEffectiveLogoUrl() {
    if (!BRAND_CONFIG.logoUrl || BRAND_CONFIG.logoUrl.trim() === '') {
        return null;
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

// Load config từ localStorage
export function loadBrandConfig(gameIdOverride = null) {
    const gameId = gameIdOverride || getGameIdUtil();
    if (!gameId) {
        return false;
    }
    
    const saved = localStorage.getItem(`${WALL_BIRD_STORAGE_PREFIX}${gameId}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Merge với default config (support backward compatibility)
            Object.assign(BRAND_CONFIG, {
                logoUrl: parsed.fragmentLogoUrl || parsed.logoUrl || '',
                storyText: parsed.story || parsed.storyText || parsed.story_one || 'memeplay',
                backgroundColor: parsed.backgroundColor || parsed.mapColor || '#87ceeb'
            });
            return true; // ✅ Có config trong localStorage
        } catch (e) {
            console.warn('[Wall-Bird Config] Failed to load config:', e);
        }
    }
    
    return false; // ✅ Không có config trong localStorage
}

// Save config vào localStorage
export function saveBrandConfig(config, gameIdOverride = null) {
    const gameId = gameIdOverride || getGameIdUtil();
    if (!gameId) return;
    
    Object.assign(BRAND_CONFIG, config);
    const toSave = {
        fragmentLogoUrl: BRAND_CONFIG.logoUrl,
        story: BRAND_CONFIG.storyText,
        backgroundColor: BRAND_CONFIG.backgroundColor
    };
    
    localStorage.setItem(`${WALL_BIRD_STORAGE_PREFIX}${gameId}`, JSON.stringify(toSave));
}

// Get game ID từ URL
export function getGameId() {
    return getGameIdUtil();
}

// Generate game ID với prefix wall-bird
export function generateGameId() {
    return generateGameIdUtil('wall-bird');
}

// Window expose (backward compatibility nếu cần)
window.BRAND_CONFIG = BRAND_CONFIG;
window.loadBrandConfig = loadBrandConfig;
window.saveBrandConfig = saveBrandConfig;
window.getGameId = getGameId;
window.generateGameId = generateGameId;
window.MAP_COLORS = MAP_COLORS;
window.TEMPLATE_ID = TEMPLATE_ID;

