#!/usr/bin/env node
/**
 * Add Template Script - Tự động tạo template mới cho MemePlay Templates V2
 * 
 * Usage:
 *   node scripts/add-template.js --name "draw-runner" --display "Draw Runner"
 * 
 * Script này sẽ:
 * 1. Tạo folder structure: games/templates-v2/{name}-template/
 * 2. Tạo các file cần thiết (config.js, game.js, index.html, style.css, editor-adapter.js)
 * 3. Cập nhật template-registry.js
 * 4. Cập nhật play-v2.js (thêm detection pattern)
 */

const fs = require('fs');
const path = require('path');

// ==================== CONFIG ====================
const TEMPLATES_V2_PATH = path.join(__dirname, '..', 'games', 'templates-v2');
const REGISTRY_PATH = path.join(TEMPLATES_V2_PATH, 'core', 'template-registry.js');
const PLAY_V2_PATH = path.join(__dirname, 'play-v2.js');
const ARROW_TEMPLATE_PATH = path.join(TEMPLATES_V2_PATH, 'arrow-template');

// ==================== UTILITIES ====================
function toKebabCase(str) {
    return str
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .replace(/[\s_]+/g, '-')
        .toLowerCase();
}

function toCamelCase(str) {
    return str
        .split('-')
        .map((word, index) => 
            index === 0 
                ? word 
                : word.charAt(0).toUpperCase() + word.slice(1)
        )
        .join('');
}

function toPascalCase(str) {
    return str
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join('');
}

function toSnakeCase(str) {
    return str.replace(/-/g, '_');
}

function toUpperCase(str) {
    return str.replace(/-/g, '_').toUpperCase();
}

// ==================== VALIDATION ====================
function validateName(name) {
    if (!name || name.trim().length === 0) {
        throw new Error('❌ Template name is required (--name)');
    }
    
    const kebabName = toKebabCase(name);
    if (!/^[a-z][a-z0-9-]*$/.test(kebabName)) {
        throw new Error('❌ Template name must start with a letter and contain only lowercase letters, numbers, and hyphens');
    }
    
    return kebabName;
}

function validateDisplay(display) {
    if (!display || display.trim().length === 0) {
        throw new Error('❌ Display name is required (--display)');
    }
    return display.trim();
}

function checkTemplateExists(templateName) {
    const templatePath = path.join(TEMPLATES_V2_PATH, `${templateName}-template`);
    if (fs.existsSync(templatePath)) {
        throw new Error(`❌ Template "${templateName}-template" already exists at: ${templatePath}`);
    }
}

// ==================== FILE GENERATION ====================
function generateConfigJs(templateName, displayName) {
    const camelName = toCamelCase(templateName);
    const snakeName = toSnakeCase(templateName);
    const upperName = toUpperCase(templateName);
    
    return `// ${displayName} Template - Config
// Import shared utilities from core/
import { getGameId as getGameIdUtil, generateGameId as generateGameIdUtil } from '../core/game-id-utils.js';

// Template ID
export const TEMPLATE_ID = '${camelName}1';

// Storage key prefix - MUST match editor-adapter.js
const ${upperName}_STORAGE_PREFIX = '${snakeName}_brand_config_';

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
    return BRAND_CONFIG.logoUrl || DEFAULT_LOGO;
}

// Load config từ localStorage - returns true if found, false otherwise
export function loadBrandConfig(gameIdOverride = null) {
    const gameId = gameIdOverride || getGameId();
    if (!gameId) return false;
    
    const saved = localStorage.getItem(\`\${${upperName}_STORAGE_PREFIX}\${gameId}\`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(BRAND_CONFIG, parsed);
            console.log('[${displayName} Config] Loaded from localStorage:', { gameId, config: BRAND_CONFIG });
            return true;
        } catch (e) {
            console.warn('[${displayName} Config] Failed to parse localStorage config:', e);
            return false;
        }
    }
    console.log('[${displayName} Config] No config found in localStorage for:', gameId);
    return false;
}

// Save config vào localStorage
export function saveBrandConfig(config) {
    const gameId = getGameId();
    if (!gameId) return;
    
    Object.assign(BRAND_CONFIG, config);
    localStorage.setItem(\`\${${upperName}_STORAGE_PREFIX}\${gameId}\`, JSON.stringify(BRAND_CONFIG));
}

// Generate game ID với prefix ${templateName}
export function generateGameId() {
    return generateGameIdUtil('${templateName}');
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
`;
}

function generateEditorAdapterJs(templateName, displayName) {
    const camelName = toCamelCase(templateName);
    const snakeName = toSnakeCase(templateName);
    const upperName = toUpperCase(templateName);
    const pascalName = toPascalCase(templateName);
    
    return `import { BaseAdapter } from '../../core/base-adapter.js';
import { getSupabaseClient } from '../../core/supabase-client.js';
import { buildPublicLinkUrl } from '../../core/url-builder.js';
import { PRODUCTION_BASE_URL } from '../../core/constants.js';
import { cleanupOldGameKeys } from '../../core/storage-manager.js';
import { generateGameId as generateGameIdUtil } from '../../core/game-id-utils.js';

const ${upperName}_STORAGE_PREFIX = '${snakeName}_brand_config_';
const TEMPLATE_ID = '${templateName}-template';

/**
 * Editor Adapter for ${displayName} Template
 * Handles save/load with localStorage and Supabase sync
 */
export class ${pascalName}EditorAdapter extends BaseAdapter {
    constructor(options = {}) {
        super(options);
        this.lastSavedGameId = null;
        this.dirty = true;
        this.editorElements = options.editorElements || {};
    }

    async load() {
        return { ok: true };
    }

    async save(forcedGameId = null) {
        const isDirty = this.isDirty();
        const gameId = forcedGameId || (isDirty ? this.generateGameId() : this.lastSavedGameId || this.generateGameId());
        
        if (!this.editorElements) {
            throw new Error('Editor elements not initialized');
        }
        
        // Get editor values
        const logoPreview = this.editorElements.logoPreview || document.getElementById('logoPreview');
        const storyInput = this.editorElements.storyInput || document.getElementById('storyInput');
        const mapColors = this.editorElements.mapColors || document.getElementById('mapColors');
        
        const logoUrl = logoPreview?.src || '';
        const storyText = (storyInput?.value || '').trim() || 'MEMEPLAY';
        
        // Get selected map color
        let mapColor = '#87CEEB'; // default Sky Blue
        if (mapColors) {
            const activeColorBtn = mapColors.querySelector('.chip-btn.active');
            if (activeColorBtn) {
                mapColor = activeColorBtn.dataset.color || mapColor;
            }
        }
        
        // Cleanup old game keys before save
        cleanupOldGameKeys(TEMPLATE_ID, 1);
        
        // Save to localStorage
        const config = {
            logoUrl: logoUrl,
            storyText: storyText,
            mapColor: mapColor
        };
        
        try {
            const storageKey = \`\${${upperName}_STORAGE_PREFIX}\${gameId}\`;
            localStorage.setItem(storageKey, JSON.stringify(config));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                cleanupOldGameKeys(TEMPLATE_ID, 0);
                try {
                    const storageKey = \`\${${upperName}_STORAGE_PREFIX}\${gameId}\`;
                    localStorage.setItem(storageKey, JSON.stringify(config));
                } catch (retryError) {
                    // Silent fail
                }
            }
        }
        
        // Sync to Supabase
        try {
            await this.syncToSupabase(gameId, config);
        } catch (error) {
            // Silent fail - game still saved to localStorage
        }
        
        this.lastSavedGameId = gameId;
        this.dirty = false;
        return { gameId };
    }

    isDirty() {
        if (this.dirty || !this.lastSavedGameId) return true;
        
        const logoPreview = this.editorElements.logoPreview;
        const storyInput = this.editorElements.storyInput;
        const mapColors = this.editorElements.mapColors || document.getElementById('mapColors');
        
        if (!logoPreview || !storyInput) return true;
        
        const storageKey = \`\${${upperName}_STORAGE_PREFIX}\${this.lastSavedGameId}\`;
        const savedRaw = localStorage.getItem(storageKey);
        if (!savedRaw) return true;
        
        try {
            const saved = JSON.parse(savedRaw);
            const currentLogo = logoPreview.src || '';
            if (saved.logoUrl !== currentLogo) return true;
            if (saved.storyText !== (storyInput.value?.trim() || 'MEMEPLAY')) return true;
            
            // Check mapColor
            if (mapColors) {
                const activeColorBtn = mapColors.querySelector('.chip-btn.active');
                const currentMapColor = activeColorBtn?.dataset.color || '#87CEEB';
                if (saved.mapColor !== currentMapColor) return true;
            }
            
            return false;
        } catch (error) {
            return true;
        }
    }

    markDirty() {
        this.dirty = true;
    }

    generateGameId() {
        return generateGameIdUtil('${templateName}');
    }

    async syncToSupabase(gameId, config) {
        try {
            const supabase = await getSupabaseClient();
            if (!supabase) return false;

            const origin = window.location.origin.toLowerCase();
            const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('0.0.0.0');
            const baseUrl = isLocal ? PRODUCTION_BASE_URL : window.location.origin.replace(/\\/$/, '');
            const templateUrl = \`\${baseUrl}/games/templates-v2/${templateName}-template/index.html?game=\${gameId}\`;
            const publicUrl = buildPublicLinkUrl(gameId, { forceProduction: true });
            
            const creatorKey = '${templateName}_creator_id';
            let creatorId = localStorage.getItem(creatorKey);
            if (!creatorId) {
                creatorId = 'creator_' + Math.random().toString(36).slice(2, 10);
                localStorage.setItem(creatorKey, creatorId);
            }

            const payload = {
                p_game_id: gameId,
                p_template_id: TEMPLATE_ID,
                p_title: config.storyText || '${displayName} Game',
                p_map_color: config.mapColor || '#87CEEB',
                p_map_index: 0,
                p_fragment_logo_url: config.logoUrl || null,
                p_story_one: config.storyText || '',
                p_story_two: '',
                p_story_three: '',
                p_public_url: publicUrl,
                p_template_url: templateUrl,
                p_creator_id: creatorId,
                p_context: 'template-v2-editor'
            };

            const { error } = await supabase.rpc('upsert_user_created_game', payload);
            return !error;
        } catch (err) {
            return false;
        }
    }
}
`;
}

function generateIndexHtml(displayName) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>${displayName} - MemePlay</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="game-container">
        <!-- Game canvas -->
        <canvas id="game-canvas"></canvas>

        <!-- Start screen -->
        <div id="start-screen" role="button" aria-label="Tap to start game">
            <div class="tap-to-start">TAP TO START</div>
        </div>

        <!-- Game over screen -->
        <div id="gameover-screen">
            <h1>GAME OVER</h1>
            <div class="logo-gameover">
                <img src="assets/logo.webp" alt="Logo" width="160" height="160">
            </div>
            <div class="brand">MEMEPLAY</div>
            <div id="final-score">Final Score: <span>0</span></div>
            <button id="restart-btn">PLAY AGAIN</button>
        </div>
    </div>

    <script type="module" src="game.js"></script>
</body>
</html>
`;
}

function generateGameJs(templateName, displayName) {
    const camelName = toCamelCase(templateName);
    const upperName = toUpperCase(templateName);
    
    return `// ${displayName} Template - Game Logic

// ==================== IMPORT CONFIG ====================
import { 
    BRAND_CONFIG, 
    loadBrandConfig, 
    getEffectiveLogoUrl,
    getGameId,
    TEMPLATE_ID
} from './config.js';
import { getSupabaseClient } from '../core/supabase-client.js';

// ==================== GAME CONFIG ====================
const CONFIG = {
    CANVAS_WIDTH: 720,
    CANVAS_HEIGHT: 1000
};

// ==================== GAME STATE ====================
let gameState = {
    isRunning: false,
    score: 0
};

// ==================== DOM ELEMENTS ====================
let canvas, ctx, gameContainer, startScreen, gameoverScreen;
let restartBtn, scoreDisplay;

// ==================== ASSETS ====================
let gameLogo = null;

// ==================== INITIALIZATION ====================
async function initGame() {
    const gameId = getGameId();
    const hasLocalConfig = loadBrandConfig(gameId);
    
    if (!hasLocalConfig && gameId) {
        console.log('[${displayName}] No local config, trying Supabase...');
        await loadBrandConfigFromSupabase(gameId);
    }
    
    // Load logo
    loadLogo();
    
    // Setup event listeners
    setupEventListeners();
    
    // Send ready signal
    sendReadySignal();
}

function loadLogo() {
    gameLogo = new Image();
    gameLogo.src = getEffectiveLogoUrl();
    gameLogo.onerror = () => {
        console.warn('[${displayName}] Failed to load logo, using default');
    };
}

function setupEventListeners() {
    // Start screen
    if (startScreen) {
        startScreen.addEventListener('click', startGame);
    }
    
    // Restart button
    if (restartBtn) {
        restartBtn.addEventListener('click', () => {
            gameState.isRunning = false;
            gameState.score = 0;
            startGame();
        });
    }
    
    // Listen for config updates from editor
    window.addEventListener('message', handleConfigMessage);
}

function handleConfigMessage(event) {
    if (event.data.type === 'UPDATE_CONFIG') {
        Object.assign(BRAND_CONFIG, event.data.config);
        loadLogo();
        console.log('[${displayName}] Config updated:', BRAND_CONFIG);
    }
}

function sendReadySignal() {
    window.parent.postMessage({ 
        type: '${upperName}_GAME_READY' 
    }, '*');
}

async function loadBrandConfigFromSupabase(gameId) {
    try {
        const supabase = await getSupabaseClient();
        if (!supabase) return false;
        
        const { data, error } = await supabase
            .from('user_created_games')
            .select('*')
            .eq('game_id', gameId)
            .single();
        
        if (error || !data) return false;
        
        // Map Supabase data to BRAND_CONFIG
        if (data.fragment_logo_url) BRAND_CONFIG.logoUrl = data.fragment_logo_url;
        if (data.story_one) BRAND_CONFIG.storyText = data.story_one;
        if (data.map_color) BRAND_CONFIG.mapColor = data.map_color;
        
        console.log('[${displayName}] Loaded config from Supabase:', BRAND_CONFIG);
        return true;
    } catch (err) {
        console.warn('[${displayName}] Failed to load from Supabase:', err);
        return false;
    }
}

function startGame() {
    gameState.isRunning = true;
    if (startScreen) startScreen.style.display = 'none';
    if (gameoverScreen) gameoverScreen.style.display = 'none';
    
    // Post message for tracking
    window.parent.postMessage({ type: 'GAME_START' }, '*');
    
    // Start game loop
    gameLoop();
}

function gameLoop() {
    if (!gameState.isRunning) return;
    
    update();
    render();
    requestAnimationFrame(gameLoop);
}

function update() {
    // TODO: Implement game logic
}

function render() {
    // Clear canvas
    ctx.fillStyle = BRAND_CONFIG.mapColor || '#87CEEB';
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    // TODO: Draw game elements
}

function gameOver() {
    gameState.isRunning = false;
    if (gameoverScreen) {
        gameoverScreen.style.display = 'flex';
        const scoreSpan = gameoverScreen.querySelector('#final-score span');
        if (scoreSpan) scoreSpan.textContent = gameState.score;
    }
    
    // Update brand text
    const brandEl = document.querySelector('.brand');
    if (brandEl) brandEl.textContent = BRAND_CONFIG.storyText || 'MEMEPLAY';
    
    // Post message for tracking
    window.parent.postMessage({ 
        type: 'GAME_OVER',
        score: gameState.score 
    }, '*');
}

// ==================== DOM READY ====================
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('[${displayName}] Canvas not found!');
        return;
    }
    
    ctx = canvas.getContext('2d');
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;
    
    gameContainer = document.getElementById('game-container');
    startScreen = document.getElementById('start-screen');
    gameoverScreen = document.getElementById('gameover-screen');
    restartBtn = document.getElementById('restart-btn');
    scoreDisplay = document.getElementById('score');
    
    initGame();
});
`;
}

function generateStyleCss(displayName) {
    return `/* ${displayName} Template - Styles */

* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: 'Courier New', monospace;
    overflow: hidden;
}

#game-container {
    position: relative;
    width: 720px;
    height: 1000px;
    max-width: 100vw;
    max-height: 100vh;
    overflow: hidden;
    touch-action: none;
    border: 4px solid #2d2d2d;
    box-shadow: 0 0 30px rgba(0,0,0,0.5);
}

#game-canvas {
    display: block;
    width: 100%;
    height: 100%;
}

/* Start Screen */
#start-screen {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 10;
    cursor: pointer;
}

.tap-to-start {
    color: #ffd700;
    font-size: 32px;
    font-weight: bold;
    text-align: center;
    animation: blink 1s infinite;
}

@keyframes blink {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
}

/* Game Over Screen */
#gameover-screen {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: none;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 20;
    color: white;
}

#gameover-screen h1 {
    font-size: 72px;
    color: #ff4444;
    margin-bottom: 20px;
}

.logo-gameover {
    margin: 20px 0;
}

.logo-gameover img {
    display: block;
}

.brand {
    font-size: 36px;
    color: #ffd700;
    margin: 20px 0;
}

#final-score {
    font-size: 32px;
    margin: 20px 0;
}

#restart-btn {
    margin-top: 30px;
    padding: 15px 40px;
    font-size: 24px;
    font-weight: bold;
    background: #ffd700;
    color: #000;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: transform 0.2s;
}

#restart-btn:hover {
    transform: scale(1.05);
}

#restart-btn:active {
    transform: scale(0.95);
}

/* Mobile Responsive */
@media (max-width: 720px) {
    #game-container {
        width: 100vw;
        height: calc(100vw * 1000 / 720);
    }
}

@media (max-height: 1000px) and (min-width: 720px) {
    #game-container {
        height: 100vh;
        width: calc(100vh * 720 / 1000);
    }
}
`;
}

// ==================== UPDATE FILES ====================
function updateTemplateRegistry(templateName, displayName) {
    const registryContent = fs.readFileSync(REGISTRY_PATH, 'utf8');
    
    const snakeName = toSnakeCase(templateName);
    const upperName = toUpperCase(templateName);
    const pascalName = toPascalCase(templateName);
    
    const newEntry = `
  // ✅ ${displayName} Template
  '${templateName}-template': {
    adapterPath: '../${templateName}-template/editor/editor-adapter.js',
    adapterName: '${pascalName}EditorAdapter',
    playtestKey: '${snakeName}_brand_config_playtest-${templateName}',
    playtestGameId: 'playtest-${templateName}',
    storagePrefix: '${snakeName}_brand_config_',
    templateUrl: '/games/templates-v2/${templateName}-template/index.html',
    messageTypes: {
      READY: '${upperName}_GAME_READY',
      ERROR: '${upperName}_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: {
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      logo: {
        enabled: true,
        inputId: 'logoInput',
        previewId: 'logoPreview'
      },
      mapColor: {
        enabled: true,
        containerId: 'mapColors',
        colors: [
          { value: '#87CEEB', label: 'Sky Blue' },
          { value: '#90EE90', label: 'Light Green' },
          { value: '#DDA0DD', label: 'Light Purple' }
        ]
      }
    },
    displayName: '${displayName}',
    description: '${displayName} game template',
    enabled: true
  },`;
    
    // Find the last entry (ends with } without comma) and add comma, then insert new entry before };
    // Pattern: enabled: true\n  }\n};
    const lastEntryMatch = registryContent.match(/(\s+enabled: true\s+\n\s+\})\s*(\n\s+\};)/);
    if (lastEntryMatch) {
        // Add comma to last entry and insert new entry
        const newContent = registryContent.replace(
            lastEntryMatch[0],
            `${lastEntryMatch[1]},\n${newEntry}${lastEntryMatch[2]}`
        );
        fs.writeFileSync(REGISTRY_PATH, newContent, 'utf8');
        return true;
    }
    
    // Fallback: Find }; and insert before it
    const fallbackMatch = registryContent.match(/(\n\s+\};)/);
    if (fallbackMatch) {
        const newContent = registryContent.replace(
            fallbackMatch[0],
            `,\n${newEntry}${fallbackMatch[0]}`
        );
        fs.writeFileSync(REGISTRY_PATH, newContent, 'utf8');
        return true;
    }
    
    throw new Error('❌ Could not find insertion point in template-registry.js (looking for }; before export)');
}

function updatePlayV2(templateName, displayName) {
    const playV2Content = fs.readFileSync(PLAY_V2_PATH, 'utf8');
    
    // Find the arrow-template detection pattern (ends with return 'arrow-template'\n  })
    const arrowPattern = /(\/\/ ✅ Special case: Arrow.*?\n  return 'arrow-template'\n  \}\n)/s;
    
    if (arrowPattern.test(playV2Content)) {
        const newDetection = `  // ✅ Special case: ${displayName} (gameId format: playmode-${templateName}-XXX, template ID: ${templateName}-template)
  if (gameId.startsWith('playmode-${templateName}-') || gameId.startsWith('${templateName}-')) {
    console.log(\`[PLAY MODE V2] 🎯 Detected ${templateName}-template from gameId: \${gameId}\`)
    return '${templateName}-template'
  }
`;
        
        const newContent = playV2Content.replace(
            arrowPattern,
            match => match + newDetection
        );
        
        fs.writeFileSync(PLAY_V2_PATH, newContent, 'utf8');
        return true;
    }
    
    throw new Error('❌ Could not find insertion point in play-v2.js (arrow-template pattern not found)');
}

// ==================== MAIN ====================
function main() {
    try {
        // Parse arguments
        const args = process.argv.slice(2);
        let name = null;
        let display = null;
        
        for (let i = 0; i < args.length; i++) {
            if (args[i] === '--name' && args[i + 1]) {
                name = args[i + 1];
                i++;
            } else if (args[i] === '--display' && args[i + 1]) {
                display = args[i + 1];
                i++;
            }
        }
        
        // Validate
        const templateName = validateName(name);
        const displayName = validateDisplay(display);
        
        console.log(`\n🚀 Creating template: ${templateName}-template`);
        console.log(`   Display name: ${displayName}\n`);
        
        // Check if template already exists
        checkTemplateExists(templateName);
        
        // Create folder structure
        const templatePath = path.join(TEMPLATES_V2_PATH, `${templateName}-template`);
        const assetsPath = path.join(templatePath, 'assets');
        const editorPath = path.join(templatePath, 'editor');
        
        fs.mkdirSync(templatePath, { recursive: true });
        fs.mkdirSync(assetsPath, { recursive: true });
        fs.mkdirSync(editorPath, { recursive: true });
        
        console.log(`✅ Created: ${path.relative(process.cwd(), templatePath)}/`);
        
        // Generate files
        fs.writeFileSync(
            path.join(templatePath, 'config.js'),
            generateConfigJs(templateName, displayName),
            'utf8'
        );
        console.log(`✅ Created: ${path.relative(process.cwd(), path.join(templatePath, 'config.js'))}`);
        
        fs.writeFileSync(
            path.join(templatePath, 'game.js'),
            generateGameJs(templateName, displayName),
            'utf8'
        );
        console.log(`✅ Created: ${path.relative(process.cwd(), path.join(templatePath, 'game.js'))}`);
        
        fs.writeFileSync(
            path.join(templatePath, 'index.html'),
            generateIndexHtml(displayName),
            'utf8'
        );
        console.log(`✅ Created: ${path.relative(process.cwd(), path.join(templatePath, 'index.html'))}`);
        
        fs.writeFileSync(
            path.join(templatePath, 'style.css'),
            generateStyleCss(displayName),
            'utf8'
        );
        console.log(`✅ Created: ${path.relative(process.cwd(), path.join(templatePath, 'style.css'))}`);
        
        fs.writeFileSync(
            path.join(editorPath, 'editor-adapter.js'),
            generateEditorAdapterJs(templateName, displayName),
            'utf8'
        );
        console.log(`✅ Created: ${path.relative(process.cwd(), path.join(editorPath, 'editor-adapter.js'))}`);
        
        // Update registry
        updateTemplateRegistry(templateName, displayName);
        console.log(`✅ Updated: ${path.relative(process.cwd(), REGISTRY_PATH)}`);
        
        // Update play-v2.js
        updatePlayV2(templateName, displayName);
        console.log(`✅ Updated: ${path.relative(process.cwd(), PLAY_V2_PATH)}`);
        
        // Summary
        const snakeName = toSnakeCase(templateName);
        const upperName = toUpperCase(templateName);
        
        console.log(`\n📋 Generated values:`);
        console.log(`   - Template ID: ${templateName}-template`);
        console.log(`   - Storage Prefix: ${snakeName}_brand_config_`);
        console.log(`   - Playtest Key: ${snakeName}_brand_config_playtest-${templateName}`);
        console.log(`   - Playtest Game ID: playtest-${templateName}`);
        console.log(`   - Message Type: ${upperName}_GAME_READY`);
        
        console.log(`\n🎉 Done! Next steps:`);
        console.log(`   1. Add your game logic to game.js`);
        console.log(`   2. Customize style.css`);
        console.log(`   3. Add assets to assets/ folder`);
        console.log(`   4. Test with: cd games/templates-v2 && npx serve . -l 5500\n`);
        
    } catch (error) {
        console.error(`\n${error.message}\n`);
        process.exit(1);
    }
}

main();

