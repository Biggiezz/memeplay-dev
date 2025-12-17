// Space Jump Template - Config
// Import shared utilities from core/
import { getGameId as getGameIdUtil, generateGameId as generateGameIdUtil } from '../core/game-id-utils.js';

// Brand config mặc định
export const BRAND_CONFIG = {
    headLogoUrl: '',           // Logo trong đầu nhân vật (hình vuông)
    gameOverLogoUrl: '',       // Logo màn hình game over
    storyText: 'memeplay'      // Story text
};

// Load config từ localStorage
export function loadBrandConfig() {
    const gameId = getGameId();
    if (!gameId) return BRAND_CONFIG;
    
    const saved = localStorage.getItem(`space-jump-config-${gameId}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(BRAND_CONFIG, parsed);
        } catch (e) {
            console.warn('Failed to parse saved config:', e);
        }
    }
    return BRAND_CONFIG;
}

// Save config vào localStorage
export function saveBrandConfig(config) {
    const gameId = getGameId();
    if (!gameId) return;
    
    Object.assign(BRAND_CONFIG, config);
    localStorage.setItem(`space-jump-config-${gameId}`, JSON.stringify(BRAND_CONFIG));
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

