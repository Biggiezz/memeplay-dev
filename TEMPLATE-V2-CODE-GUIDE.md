# 📘 Hướng Dẫn Code Template V2 - Code Patterns & Best Practices

## 🎯 Mục Đích

Hướng dẫn này tổng hợp **code patterns chung** và **best practices** để viết code trong Template V2, dựa trên kinh nghiệm từ các template đã làm (draw-runner, knife-fix, moon-rocket).

---

## 📁 Cấu Trúc File Template

```
template-name-template/
├── assets/              # Game assets (images, sounds)
├── editor/
│   └── editor-adapter.js  # Editor adapter class
├── config.js            # Config system (BRAND_CONFIG, load/save)
├── game.js              # Game logic (main code)
├── index.html           # HTML shell
└── style.css            # CSS styles
```

---

## 1️⃣ Config System (`config.js`)

### 1.1. Template ID & Storage Prefix

```javascript
// Template ID - phải khớp với template-registry.js
export const TEMPLATE_ID = 'template-name-template';

// Storage prefix - dùng cho localStorage keys
const TEMPLATE_STORAGE_PREFIX = 'template_name_brand_config_';

// Default logo path
const DEFAULT_LOGO = 'assets/logo.webp';
```

### 1.2. BRAND_CONFIG

```javascript
export const BRAND_CONFIG = {
    logoUrl: '',           // Logo URL (empty = use default)
    storyText: 'MEMEPLAY', // Story text hiển thị game over
    mapColor: '#1a0a2e'    // Map color (nếu game có map customization)
};

// Get effective logo URL (returns default if empty)
export function getEffectiveLogoUrl() {
    return BRAND_CONFIG.logoUrl || DEFAULT_LOGO;
}
```

### 1.3. Load/Save Config

```javascript
// Load config từ localStorage
export function loadBrandConfig(gameIdOverride = null) {
    const gameId = gameIdOverride || getGameId();
    if (!gameId) return false;
    
    const saved = localStorage.getItem(`${TEMPLATE_STORAGE_PREFIX}${gameId}`);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            Object.assign(BRAND_CONFIG, parsed);
            console.log('[Template Config] Loaded from localStorage:', { gameId, config: BRAND_CONFIG });
            return true;
        } catch (e) {
            console.warn('[Template Config] Failed to parse localStorage config:', e);
            return false;
        }
    }
    return false;
}

// Save config vào localStorage
export function saveBrandConfig(config) {
    const gameId = getGameId();
    if (!gameId) return;
    
    localStorage.setItem(
        `${TEMPLATE_STORAGE_PREFIX}${gameId}`,
        JSON.stringify(config)
    );
    console.log('[Template Config] Saved to localStorage:', { gameId, config });
}
```

### 1.4. Get Game ID

```javascript
import { getGameId as getGameIdUtil } from '../core/game-id-utils.js';

export function getGameId() {
    return getGameIdUtil();
}
```

---

## 2️⃣ Game Logic (`game.js`)

### 2.1. Imports

```javascript
// Import config system
import { 
    BRAND_CONFIG, 
    loadBrandConfig, 
    getEffectiveLogoUrl,
    getGameId,
    TEMPLATE_ID
} from './config.js';
import { getSupabaseClient } from '../core/supabase-client.js';
```

### 2.2. DOM Elements

```javascript
// ✅ Đúng: Dùng kebab-case cho IDs
let canvas, ctx;
let startScreen, gameoverScreen, restartBtn, finalScoreEl, storyTextEl, gameoverLogoEl;

// ❌ Sai: camelCase
let gameCanvas, gameOverScreen, restartButton;
```

### 2.3. Init Function

```javascript
async function init() {
    // 1. Setup canvas
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    // 2. Get DOM elements
    startScreen = document.getElementById('start-screen');
    gameoverScreen = document.getElementById('gameover-screen');
    restartBtn = document.getElementById('restart-btn');
    finalScoreEl = document.getElementById('final-score');
    storyTextEl = document.getElementById('story-text');
    gameoverLogoEl = document.getElementById('gameover-logo');
    
    // 3. Load config TRƯỚC khi load assets
    await initGameConfig();
    
    // 4. Load assets
    await loadAssets();
    
    // 5. Setup event listeners
    setupEventListeners();
    
    // 6. Initial render
    render();
    
    // 7. Send ready signal
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
            type: 'TEMPLATE_GAME_READY', // Message type từ template-registry.js
            gameId: getGameId() || TEMPLATE_ID
        }, '*');
    }
}
```

### 2.4. Config Loading

```javascript
async function initGameConfig() {
    let gameId = getGameId();
    
    // Load config từ playtest nếu không có gameId trong URL
    if (!gameId) {
        const playtestKey = 'template_name_brand_config_playtest-template-name';
        const playtestConfig = localStorage.getItem(playtestKey);
        if (playtestConfig) {
            try {
                const parsed = JSON.parse(playtestConfig);
                Object.assign(BRAND_CONFIG, parsed);
                console.log('[Template] Loaded playtest config:', BRAND_CONFIG);
                reloadLogo();
            } catch (e) {
                console.warn('[Template] Failed to parse playtest config:', e);
            }
        }
    } else {
        const hasLocalConfig = loadBrandConfig(gameId);
        
        if (!hasLocalConfig && gameId) {
            await loadBrandConfigFromSupabase(gameId);
        }
    }
    
    // Update UI với config
    updateUIWithConfig();
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
        
        // Map Supabase fields to BRAND_CONFIG
        if (data.fragment_logo_url) BRAND_CONFIG.logoUrl = data.fragment_logo_url;
        if (data.story_one) BRAND_CONFIG.storyText = data.story_one;
        if (data.p_map_color) BRAND_CONFIG.mapColor = data.p_map_color;
        
        console.log('[Template] Loaded config from Supabase:', BRAND_CONFIG);
        return true;
    } catch (err) {
        console.warn('[Template] Failed to load from Supabase:', err);
        return false;
    }
}

function updateUIWithConfig() {
    // Update story text
    if (storyTextEl) {
        storyTextEl.textContent = BRAND_CONFIG.storyText || 'MEMEPLAY';
    }
    
    // Update logo
    reloadLogo();
}

function reloadLogo() {
    const newLogoUrl = getEffectiveLogoUrl();
    
    // Reload logo image (nếu có)
    if (logoImage) {
        logoImage = new Image();
        logoImage.onload = () => {
            console.log('[Template] Logo reloaded');
        };
        logoImage.onerror = () => {
            console.warn('[Template] Failed to reload logo');
        };
        logoImage.src = getLogoUrlWithCacheBuster(newLogoUrl);
    }
    
    // Reload logo trong HTML (game over screen)
    if (gameoverLogoEl) {
        gameoverLogoEl.src = getLogoUrlWithCacheBuster(newLogoUrl);
    }
}

function getLogoUrlWithCacheBuster(url) {
    if (url.startsWith('data:')) {
        return url;
    }
    return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
}
```

### 2.5. PostMessage Integration (QUAN TRỌNG NHẤT!)

#### GAME_START

```javascript
function startGame() {
    gameState = 'playing';
    // ... reset game state ...
    
    // ✅ BẮT BUỘC: Gửi GAME_START với gameId
    const gameId = getGameId() || TEMPLATE_ID;
    window.parent.postMessage({ 
        type: 'GAME_START', 
        gameId: gameId 
    }, '*');
    
    // ... rest of init ...
}
```

#### GAME_OVER & GAME_SCORE

```javascript
function gameOver() {
    gameState = 'gameover';
    
    // ... show game over screen ...
    
    // ✅ BẮT BUỘC: Gửi GAME_OVER với gameId
    const gameId = getGameId() || TEMPLATE_ID;
    window.parent.postMessage({ 
        type: 'GAME_OVER',
        gameId: gameId
    }, '*');
    
    // ✅ BẮT BUỘC: Gửi GAME_SCORE để lưu điểm và thưởng
    window.parent.postMessage({ 
        type: 'GAME_SCORE',
        gameId: gameId,
        score: score,
        level: level || 1 // Dùng 1 nếu game không có level
    }, '*');
}
```

#### UPDATE_CONFIG Listener

```javascript
// Listen for config updates from editor
window.addEventListener('message', (event) => {
    if (event.data.type === 'UPDATE_CONFIG') {
        const config = event.data.config || {};
        
        // Update BRAND_CONFIG
        if (config.logoUrl !== undefined) BRAND_CONFIG.logoUrl = config.logoUrl;
        if (config.storyText !== undefined) BRAND_CONFIG.storyText = config.storyText;
        if (config.mapColor !== undefined) BRAND_CONFIG.mapColor = config.mapColor;
        
        // Reload logo nếu thay đổi
        if (config.logoUrl !== undefined) {
            reloadLogo();
        }
        
        // Re-render nếu map color thay đổi
        if (config.mapColor !== undefined) {
            render(); // Trigger re-render
        }
        
        // Update UI
        updateUIWithConfig();
        
        console.log('[Template] Config updated:', BRAND_CONFIG);
    }
});
```

### 2.6. Event Listeners

#### Canvas Events

```javascript
// ✅ Đúng: Có { passive: false } cho touch events
canvas.addEventListener('click', (e) => {
    if (gameState === 'start') {
        e.preventDefault();
        startGame();
    } else if (gameState === 'playing') {
        handleClick(e);
    }
});

canvas.addEventListener('touchstart', (e) => {
    if (gameState === 'start') {
        e.preventDefault();
        startGame();
    } else if (gameState === 'playing') {
        handleClick(e);
    }
}, { passive: false }); // ✅ QUAN TRỌNG cho mobile
```

#### Start Screen Events

```javascript
if (startScreen) {
    const handleStartClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        startGame();
    };
    
    startScreen.addEventListener('click', handleStartClick);
    startScreen.addEventListener('touchstart', handleStartClick, { passive: false }); // ✅ QUAN TRỌNG
    startScreen.addEventListener('pointerdown', handleStartClick);
}
```

#### Restart Button

```javascript
if (restartBtn) {
    restartBtn.addEventListener('click', () => {
        restart();
    });
}
```

### 2.7. Logo Drawing (Nếu có logo trong game)

```javascript
// ✅ Đúng: Có error handling và fallback
function drawLogo(ctx, x, y, size) {
    if (logoImage && logoImage.complete && !logoImage.error && logoImage.naturalWidth > 0) {
        try {
            ctx.drawImage(logoImage, x - size / 2, y - size / 2, size, size);
        } catch (e) {
            console.warn('[Template] Failed to draw logo:', e);
            // Fallback: vẽ hình tròn màu vàng
            ctx.fillStyle = '#F4D03F';
            ctx.beginPath();
            ctx.arc(x, y, size / 2, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // Fallback nếu logo chưa load
        ctx.fillStyle = '#F4D03F';
        ctx.beginPath();
        ctx.arc(x, y, size / 2, 0, Math.PI * 2);
        ctx.fill();
    }
}
```

### 2.8. Background Drawing (Nếu có map color)

```javascript
function drawBackground(ctx, width, height) {
    const mapColor = BRAND_CONFIG.mapColor || '#1a0a2e';
    
    // Parse màu để tạo gradient
    const colors = parseMapColor(mapColor);
    
    // Tạo gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, colors.top);
    gradient.addColorStop(0.5, colors.middle);
    gradient.addColorStop(1, colors.bottom);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Vẽ trang trí (sao, particles, etc.)
    drawDecorations(ctx, width, height);
}

function parseMapColor(color) {
    // Map các màu từ config
    const colorMap = {
        '#1a0a2e': { top: '#2d1a4e', middle: '#0a0a1a', bottom: '#1a0a2e' },
        '#0a0a1a': { top: '#1a1a2e', middle: '#000000', bottom: '#0a0a1a' },
        '#0a1a2e': { top: '#1a2a4e', middle: '#0a0a1a', bottom: '#0a1a2e' }
    };
    
    return colorMap[color] || colorMap['#1a0a2e'];
}
```

---

## 3️⃣ HTML Structure (`index.html`)

### 3.1. Basic Structure

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Template Name - MemePlay</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="game-container">
        <canvas id="game-canvas" width="720" height="1000"></canvas>
        
        <!-- HUD (nếu có) -->
        <div id="hud">
            <!-- HUD elements -->
        </div>
        
        <!-- Start Screen -->
        <div id="start-screen" class="overlay start-screen active">
            <h1>Tap to Start</h1>
        </div>
        
        <!-- Game Over Screen -->
        <div id="gameover-screen" class="overlay game-over-screen">
            <div class="game-over-box">
                <h2>Game Over!</h2>
                <img id="gameover-logo" src="assets/logo.webp" alt="Logo">
                <p>Score: <span id="final-score">0</span></p>
                <p id="story-text">MEMEPLAY</p>
                <button id="restart-btn" class="restart-btn">Play Again</button>
            </div>
        </div>
    </div>
    <script type="module" src="config.js"></script>
    <script type="module" src="game.js"></script>
</body>
</html>
```

### 3.2. ID Naming Convention

```html
<!-- ✅ Đúng: kebab-case -->
<canvas id="game-canvas"></canvas>
<div id="start-screen"></div>
<div id="gameover-screen"></div>
<span id="final-score"></span>
<img id="gameover-logo">

<!-- ❌ Sai: camelCase -->
<canvas id="gameCanvas"></canvas>
<div id="gameOverScreen"></div>
```

---

## 4️⃣ CSS Styles (`style.css`)

### 4.1. Overlay Styles

```css
.overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    z-index: 100;
    pointer-events: none; /* Mặc định block events */
    display: none;
}

.overlay.active {
    display: flex;
    pointer-events: auto !important; /* ✅ Enable events khi active */
    cursor: pointer;
}

.start-screen.active {
    display: flex;
    pointer-events: auto !important; /* ✅ QUAN TRỌNG cho mobile */
}
```

### 4.2. Touch Action

```css
html, body {
    touch-action: none; /* ✅ Tốt cho game */
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
}
```

---

## 5️⃣ Editor Adapter (`editor/editor-adapter.js`)

### 5.1. Basic Structure

```javascript
import { BaseEditorAdapter } from '../../core/base-adapter.js';

export class TemplateNameEditorAdapter extends BaseEditorAdapter {
    constructor() {
        super();
        this.templateId = 'template-name-template';
        this.storagePrefix = 'template_name_brand_config_';
    }
    
    // Load config từ localStorage
    load() {
        const playtestKey = `${this.storagePrefix}playtest-${this.templateId}`;
        const saved = localStorage.getItem(playtestKey);
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.warn('[Template Adapter] Failed to parse config:', e);
            }
        }
        return {
            logoUrl: '',
            storyText: 'MEMEPLAY',
            mapColor: '#1a0a2e'
        };
    }
    
    // Save config vào localStorage
    save(config) {
        const playtestKey = `${this.storagePrefix}playtest-${this.templateId}`;
        localStorage.setItem(playtestKey, JSON.stringify(config));
        return true;
    }
    
    // Check if config is dirty (changed)
    isDirty(currentConfig) {
        const saved = this.load();
        return (
            currentConfig.logoUrl !== saved.logoUrl ||
            currentConfig.storyText !== saved.storyText ||
            currentConfig.mapColor !== saved.mapColor
        );
    }
}
```

---

## 6️⃣ Common Patterns & Best Practices

### 6.1. Asset Loading

```javascript
function loadAssets() {
    return new Promise((resolve) => {
        let loaded = 0;
        const total = 3; // Số lượng assets
        
        // Load image với error handling
        const img = new Image();
        img.onload = () => {
            loaded++;
            if (loaded === total) resolve();
        };
        img.onerror = () => {
            console.warn('Failed to load asset');
            loaded++;
            if (loaded === total) resolve();
        };
        img.src = './assets/image.png';
    });
}
```

### 6.2. Error Handling cho Logo

```javascript
// ✅ Luôn check logo state trước khi draw
if (logoImage && logoImage.complete && !logoImage.error && logoImage.naturalWidth > 0) {
    try {
        ctx.drawImage(logoImage, x, y, width, height);
    } catch (e) {
        console.warn('[Template] Failed to draw logo:', e);
        // Fallback
    }
}
```

### 6.3. Mobile Detection

```javascript
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                 ('ontouchstart' in window) ||
                 (window.innerWidth <= 768);
```

### 6.4. Game Loop

```javascript
let lastTime = performance.now();

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Update
    if (gameState === 'playing') {
        update(deltaTime);
    }
    
    // Render
    render();
    
    // Continue loop
    requestAnimationFrame(gameLoop);
}

// Start loop
requestAnimationFrame(gameLoop);
```

---

## 7️⃣ Checklist Trước Khi Deploy

### 7.1. PostMessage

- [ ] `GAME_START` có `gameId`
- [ ] `GAME_OVER` có `gameId`
- [ ] `GAME_SCORE` có `gameId`, `score`, `level`
- [ ] `TEMPLATE_GAME_READY` được gửi sau khi init xong
- [ ] `UPDATE_CONFIG` listener được thêm

### 7.2. Config

- [ ] Logo được load từ `getEffectiveLogoUrl()`
- [ ] Story text được load từ `BRAND_CONFIG.storyText`
- [ ] Map color được load từ `BRAND_CONFIG.mapColor` (nếu có)
- [ ] Config được load từ localStorage/Supabase
- [ ] Logo reload khi nhận `UPDATE_CONFIG`

### 7.3. Code Quality

- [ ] Tất cả DOM IDs dùng kebab-case
- [ ] Asset paths dùng relative paths (`./assets/`)
- [ ] Touch events có `{ passive: false }`
- [ ] CSS có `pointer-events: auto !important` cho overlays
- [ ] Error handling cho logo drawing
- [ ] Mobile detection và optimization

### 7.4. Testing

- [ ] Test trên desktop
- [ ] Test trên mobile
- [ ] Test trong editor (playtest)
- [ ] Test shared link (play-v2.html)
- [ ] Test config persistence
- [ ] Test Supabase sync
- [ ] Kiểm tra console logs
- [ ] Kiểm tra Supabase data (plays, scores, rewards)

---

## 8️⃣ Common Issues & Fixes

### Issue 1: Game không đếm plays

**Fix:** Đảm bảo `GAME_START` có `gameId`

### Issue 2: Score không được lưu

**Fix:** Đảm bảo `GAME_SCORE` có đầy đủ `gameId`, `score`, `level`

### Issue 3: Logo không hiển thị

**Fix:** 
- Check logo state: `logoImage.complete && !logoImage.error && logoImage.naturalWidth > 0`
- Wrap `drawImage` trong `try-catch`
- Có fallback

### Issue 4: Game không ấn được trên mobile

**Fix:**
- Thêm `{ passive: false }` cho touch events
- Thêm `pointer-events: auto !important` cho `.start-screen.active`

### Issue 5: Config không load trong playtest

**Fix:**
- Check playtest key format: `template_name_brand_config_playtest-template-name`
- Load từ localStorage trong `initGameConfig()`

---

## 📚 Tài Liệu Tham Khảo

- **Template Integration Guide:** `TEMPLATE-INTEGRATION-GUIDE.md`
- **Workflow Examples:** 
  - `KNIFE-FIX-TEMPLATE-WORKFLOW.md`
  - `MOON-ROCKET-TEMPLATE-WORKFLOW.md`
- **Example Templates:**
  - `games/templates-v2/draw-runner-template/`
  - `games/templates-v2/knife-fix-template/`
  - `games/templates-v2/moon-rocket-template/`

---

**Happy Coding! 🚀**


