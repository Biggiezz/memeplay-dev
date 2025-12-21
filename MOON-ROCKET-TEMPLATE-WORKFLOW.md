# 🚀 Workflow Tạo Template cho Moon Rocket Game

## 📋 Tổng Quan

Workflow này hướng dẫn chi tiết cách tích hợp game `moon` vào hệ thống template V2 với **đầy đủ** tính năng:
- ✅ Đếm lượt plays
- ✅ Lưu score vào leaderboard
- ✅ Đếm thời gian chơi và thưởng PLAY points
- ✅ Config system (logo ở 2 vị trí, story, map color)
- ✅ PostMessage integration

**Đặc biệt:** Game này có **2 vị trí logo** cần thay thế:
1. Logo trên mặt trăng (moon) - trong game
2. Logo trong game over screen - HTML

---

## 🚀 Bước 1: Setup Template Structure (Đã hoàn thành)

✅ Script đã tự động tạo:
- Folder: `games/templates-v2/moon-rocket-template/`
- File structure:
  ```
  moon-rocket-template/
  ├── assets/
  ├── editor/
  │   └── editor-adapter.js
  ├── config.js
  ├── game.js
  ├── index.html
  └── style.css
  ```
- ✅ Cập nhật `template-registry.js`
- ✅ Cập nhật `play-v2.js` (detection pattern)

---

## 📦 Bước 2: Copy Assets

### 2.1. Copy tất cả assets từ game gốc

```powershell
# Copy assets folder
Copy-Item -Path "games\moon\assets\*" -Destination "games\templates-v2\moon-rocket-template\assets\" -Recurse -Force
```

**Assets cần copy:**
- `bg_stars (1).jpg` - Background (sẽ được thay bằng hệ thống tự vẽ)
- `bnb-logo.webp` - Logo mặc định (sẽ được thay bằng logo từ config)
- `moon.png` - Moon sprite
- `rocket.webp` - Rocket sprite
- `rocket_success.wav`, `rocket_fail_oh_oh.wav` - Sound effects
- `1download.webp` - Nếu có

### 2.2. Copy logo mặc định

```powershell
# Copy logo làm logo mặc định
Copy-Item -Path "games\moon\assets\bnb-logo.webp" -Destination "games\templates-v2\moon-rocket-template\assets\logo.webp" -Force
```

---

## 📝 Bước 3: Migrate Code

### 3.1. Extract CSS → `style.css`

**Từ:** `games/moon/style.css` hoặc `games/moon/index.html` (phần `<style>`)  
**Đến:** `games/templates-v2/moon-rocket-template/style.css`

**Cần làm:**
1. Copy toàn bộ CSS
2. Đảm bảo responsive styles được giữ nguyên
3. Kiểm tra các class: `.overlay`, `.start-screen`, `.game-over-screen`, `.restart-btn`

### 3.2. Extract HTML → `index.html`

**Từ:** `games/moon/index.html`  
**Đến:** `games/templates-v2/moon-rocket-template/index.html`

**Cấu trúc cần có:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Moon Rocket - MemePlay</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="game-container">
        <canvas id="game-canvas" width="720" height="1000"></canvas>
        
        <!-- HUD -->
        <div id="hud">
            <div id="score">0</div>
            <div id="timer">10</div>
            <div id="lives">❤️❤️❤️</div>
        </div>
        
        <!-- Start Screen -->
        <div id="start-screen" class="overlay start-screen active">
            <h1>Tap to Launch Rocket</h1>
        </div>
        
        <!-- Game Over Screen -->
        <div id="gameover-screen" class="overlay game-over-screen">
            <div class="game-over-box">
                <h2>Game Over!</h2>
                <img id="gameover-logo" src="assets/logo.webp" alt="Logo">
                <p>Score: <span id="final-score">0</span></p>
                <p id="story-text" style="font-size: 20px; color: #333; margin: 10px 0;">MEMEPLAY</p>
                <button id="restart-btn" class="restart-btn">Play Again</button>
            </div>
        </div>
    </div>
    <script type="module" src="config.js"></script>
    <script type="module" src="game.js"></script>
</body>
</html>
```

**⚠️ Lưu ý:**
- Đảm bảo canvas ID là `game-canvas`
- Đảm bảo các ID khác đúng: `start-screen`, `gameover-screen`, `final-score`, `story-text`, `gameover-logo`, `restart-btn`
- Thêm `type="module"` vào script tags

### 3.3. Extract JavaScript → `game.js`

**Từ:** `games/moon/game.js`  
**Đến:** `games/templates-v2/moon-rocket-template/game.js`

**Cần làm:**
1. Copy toàn bộ JavaScript code
2. Thêm imports ở đầu file:
   ```javascript
   import { 
       BRAND_CONFIG, 
       loadBrandConfig, 
       getEffectiveLogoUrl,
       getGameId,
       TEMPLATE_ID
   } from './config.js';
   import { getSupabaseClient } from '../core/supabase-client.js';
   ```
3. Đổi `const canvas = document.getElementById('gameCanvas')` → `const canvas = document.getElementById('game-canvas')`
4. Đổi tất cả DOM references theo ID mới

---

## ⚙️ Bước 4: Tích hợp Config System

### 4.1. Update `config.js`

**Kiểm tra:** `games/templates-v2/moon-rocket-template/config.js`

**Đảm bảo có:**
```javascript
export const TEMPLATE_ID = 'moon-rocket-template';
const MOON_ROCKET_STORAGE_PREFIX = 'moon_rocket_brand_config_';
const DEFAULT_LOGO = 'assets/logo.webp'; // Đường dẫn đến logo mặc định

export const BRAND_CONFIG = {
    logoUrl: '',
    storyText: 'MEMEPLAY',
    mapColor: '#1a0a2e' // Màu mặc định (Cosmic Purple)
};

export function getEffectiveLogoUrl() {
    return BRAND_CONFIG.logoUrl || DEFAULT_LOGO;
}
```

### 4.2. Thay hardcoded logo bằng config (2 VỊ TRÍ)

**Vị trí 1: Logo trên mặt trăng (moon) - trong game**

Tìm trong `game.js`:
```javascript
// ❌ Trước (hardcoded)
// Draw logo BNB trên mặt trăng
if (logoImage && logoImage.complete) {
    const logoSize = moonDisplayRadius * 0.6;
    ctx.drawImage(logoImage, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
}
```

**✅ Sau (dùng config):**
```javascript
// Draw logo trên mặt trăng (từ config)
if (logoImage && logoImage.complete && !logoImage.error && logoImage.naturalWidth > 0) {
    try {
        const logoSize = moonDisplayRadius * 0.6;
        ctx.drawImage(logoImage, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
    } catch (e) {
        console.warn('[Moon Rocket] Failed to draw logo on moon:', e);
        // Fallback: vẽ hình tròn màu vàng
        ctx.fillStyle = '#F4D03F';
        ctx.beginPath();
        ctx.arc(0, 0, moonDisplayRadius * 0.3, 0, Math.PI * 2);
        ctx.fill();
    }
}
```

**Vị trí 2: Logo trong game over screen**

Tìm trong `game.js`:
```javascript
// ❌ Trước (hardcoded)
if (gameoverLogoEl) {
    gameoverLogoEl.src = 'assets/bnb-logo.webp';
}
```

**✅ Sau (dùng config):**
```javascript
// Update logo trong game over screen
if (gameoverLogoEl) {
    const logoUrl = getEffectiveLogoUrl();
    gameoverLogoEl.src = getLogoUrlWithCacheBuster(logoUrl);
    // Thêm error handler
    gameoverLogoEl.onerror = () => {
        console.warn('[Moon Rocket] Failed to load gameover logo');
        // Fallback: ẩn logo hoặc hiển thị placeholder
    };
}
```

### 4.3. Thay hardcoded story text

**Tìm và thay thế:**

```javascript
// ❌ Trước (hardcoded)
if (storyTextEl) {
    storyTextEl.textContent = 'MEMEPLAY';
}

// ✅ Sau (dùng config)
import { BRAND_CONFIG } from './config.js';
if (storyTextEl) {
    storyTextEl.textContent = BRAND_CONFIG.storyText || 'MEMEPLAY';
}
```

### 4.4. Thay background bằng hệ thống tự vẽ (map color)

**Tìm trong `game.js` function `render()`:**

```javascript
// ❌ Trước (dùng image)
if (bgImage && bgImage.complete) {
    ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
} else {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}
```

**✅ Sau (tự vẽ với map color + ánh sao):**

```javascript
// Draw background với map color từ config
drawBackground(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);

// Function mới để vẽ background
function drawBackground(ctx, width, height) {
    const mapColor = BRAND_CONFIG.mapColor || '#1a0a2e';
    
    // Parse màu để tạo gradient
    const colors = parseMapColor(mapColor);
    
    // Tạo gradient từ trên xuống dưới
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, colors.top);      // Màu trên (tím/xanh nhạt)
    gradient.addColorStop(0.5, colors.middle); // Màu giữa (đen)
    gradient.addColorStop(1, colors.bottom);   // Màu dưới (tím/xanh nhạt)
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Vẽ ánh sao nhỏ trang trí
    drawStars(ctx, width, height);
}

function parseMapColor(color) {
    // Map color có thể là: '#1a0a2e' (Cosmic Purple), '#0a0a1a' (Deep Space), '#0a1a2e' (Nebula Blue)
    if (color === '#1a0a2e') {
        // Cosmic Purple
        return {
            top: '#2d1a4e',    // Tím nhạt
            middle: '#0a0a1a', // Đen
            bottom: '#1a0a2e'   // Tím đậm
        };
    } else if (color === '#0a0a1a') {
        // Deep Space
        return {
            top: '#1a1a2e',    // Xanh nhạt
            middle: '#000000', // Đen
            bottom: '#0a0a1a'   // Đen đậm
        };
    } else if (color === '#0a1a2e') {
        // Nebula Blue
        return {
            top: '#1a2a4e',    // Xanh nhạt
            middle: '#0a0a1a', // Đen
            bottom: '#0a1a2e'  // Xanh đậm
        };
    }
    // Default
    return {
        top: '#2d1a4e',
        middle: '#0a0a1a',
        bottom: '#1a0a2e'
    };
}

function drawStars(ctx, width, height) {
    // Vẽ ~50-100 ngôi sao nhỏ ngẫu nhiên
    ctx.fillStyle = '#FFFFFF';
    const starCount = 80;
    
    for (let i = 0; i < starCount; i++) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const size = Math.random() * 1.5 + 0.5; // 0.5-2px
        
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        
        // Một số sao lớn hơn (twinkle effect)
        if (Math.random() > 0.9) {
            ctx.globalAlpha = 0.6;
            ctx.beginPath();
            ctx.arc(x, y, size * 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
        }
    }
}
```

---

## 📡 Bước 5: PostMessage Integration (QUAN TRỌNG NHẤT!)

### 5.1. Thêm GAME_START message

**Vị trí:** Trong function `startGame()`

```javascript
function startGame() {
    if (gameState === 'playing') return;
    
    gameState = 'playing';
    score = 0;
    level = 1;
    lives = INITIAL_LIVES;
    timer = TIMER_DURATION;
    // ... reset game state ...
    
    // ✅ BẮT BUỘC: Gửi GAME_START với gameId để đếm plays
    const gameId = getGameId() || TEMPLATE_ID;
    window.parent.postMessage({ 
        type: 'GAME_START', 
        gameId: gameId 
    }, '*');
    
    // ... rest of init code ...
}
```

### 5.2. Thêm GAME_OVER message

**Vị trí:** Trong function `gameOver()`

```javascript
function gameOver() {
    gameState = 'gameover';
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    // ... show game over screen ...
    
    // ✅ BẮT BUỘC: Gửi GAME_OVER với gameId để stop timer
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
        level: level
    }, '*');
}
```

### 5.3. Thêm GAME_READY message

**Vị trí:** Trong function `init()` sau khi config load xong

```javascript
async function init() {
    // ... load config ...
    await initGameConfig();
    
    // ... load assets ...
    await loadAssets();
    
    // ✅ Gửi ready signal
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
            type: 'MOON_ROCKET_GAME_READY',
            gameId: getGameId() || TEMPLATE_ID
        }, '*');
    }
}
```

### 5.4. Listen UPDATE_CONFIG message

**Vị trí:** Ở cuối file `game.js`, sau `DOMContentLoaded`

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
        
        console.log('[Moon Rocket] Config updated:', BRAND_CONFIG);
    }
});

function reloadLogo() {
    const newLogoUrl = getEffectiveLogoUrl();
    
    // Reload logo image cho moon
    logoImage = new Image();
    logoImage.onload = () => {
        console.log('[Moon Rocket] Logo reloaded for moon');
    };
    logoImage.onerror = () => {
        console.warn('[Moon Rocket] Failed to reload logo for moon');
    };
    logoImage.src = getLogoUrlWithCacheBuster(newLogoUrl);
    
    // Reload logo trong game over screen
    if (gameoverLogoEl) {
        gameoverLogoEl.src = getLogoUrlWithCacheBuster(newLogoUrl);
    }
}
```

---

## 🔧 Bước 6: Fix Code Issues

### 6.1. Fix DOM References

**Tìm và thay thế tất cả:**

```javascript
// ❌ Cũ
document.getElementById('gameCanvas')
document.getElementById('gameOverScreen')
document.getElementById('startScreen')
document.getElementById('finalScore')
document.getElementById('gameOverLogo')
document.getElementById('restart-btn').onclick = restart;

// ✅ Mới
document.getElementById('game-canvas')
document.getElementById('gameover-screen')
document.getElementById('start-screen')
document.getElementById('final-score')
document.getElementById('gameover-logo')
document.getElementById('restart-btn').addEventListener('click', restart);
```

### 6.2. Fix Canvas ID

**Tìm và thay thế:**

```javascript
// ❌ Cũ
const canvas = document.getElementById('gameCanvas');

// ✅ Mới
const canvas = document.getElementById('game-canvas');
```

### 6.3. Fix Asset Paths

**Tìm và thay thế:**

```javascript
// ❌ Cũ
bgImage.src = 'assets/bg_stars (1).jpg';
moonImage.src = 'assets/moon.png';

// ✅ Mới (relative paths)
bgImage.src = './assets/bg_stars (1).jpg';
moonImage.src = './assets/moon.png';
```

### 6.4. Fix Touch Events (QUAN TRỌNG cho mobile)

**Thêm `{ passive: false }` cho touch events:**

```javascript
// ✅ Canvas touchstart
canvas.addEventListener('touchstart', (e) => {
    if (gameState === 'start') {
        e.preventDefault();
        startGame();
    } else if (gameState === 'playing') {
        handleClick(e);
    }
}, { passive: false }); // ✅ QUAN TRỌNG

// ✅ Start screen touchstart
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

### 6.5. Fix CSS Pointer Events

**Đảm bảo start screen có pointer-events:**

```css
/* style.css */
.start-screen.active {
    display: flex;
    pointer-events: auto !important; /* ✅ Thêm dòng này */
}
```

---

## 🎮 Bước 7: Thêm Config Loading Logic

### 7.1. Thêm `initGameConfig()` function

**Thêm vào `game.js`:**

```javascript
async function initGameConfig() {
    let gameId = getGameId();
    
    // Load config từ playtest nếu không có gameId trong URL
    if (!gameId) {
        const playtestKey = 'moon_rocket_brand_config_playtest-moon-rocket';
        const playtestConfig = localStorage.getItem(playtestKey);
        if (playtestConfig) {
            try {
                const parsed = JSON.parse(playtestConfig);
                Object.assign(BRAND_CONFIG, parsed);
                console.log('[Moon Rocket] Loaded playtest config:', BRAND_CONFIG);
                reloadLogo();
            } catch (e) {
                console.warn('[Moon Rocket] Failed to parse playtest config:', e);
            }
        }
    } else {
        const hasLocalConfig = loadBrandConfig(gameId);
        
        if (!hasLocalConfig && gameId) {
            await loadBrandConfigFromSupabase(gameId);
        }
    }
    
    // Load logo
    reloadLogo();
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
        
        if (data.fragment_logo_url) BRAND_CONFIG.logoUrl = data.fragment_logo_url;
        if (data.story_one) BRAND_CONFIG.storyText = data.story_one;
        if (data.p_map_color) BRAND_CONFIG.mapColor = data.p_map_color;
        
        console.log('[Moon Rocket] Loaded config from Supabase:', BRAND_CONFIG);
        return true;
    } catch (err) {
        console.warn('[Moon Rocket] Failed to load from Supabase:', err);
        return false;
    }
}
```

### 7.2. Gọi `initGameConfig()` khi DOM ready

**Trong `init()`:**

```javascript
async function init() {
    // ... setup canvas ...
    
    // Load config trước khi load assets
    await initGameConfig();
    
    // Load assets
    await loadAssets();
    
    // ... rest of init ...
}
```

---

## ✅ Bước 8: Checklist Kiểm Tra

### 8.1. PostMessage Checklist

- [ ] `GAME_START` được gửi với `gameId` khi game bắt đầu
- [ ] `GAME_START` được gửi khi restart game
- [ ] `GAME_OVER` được gửi với `gameId` khi game kết thúc
- [ ] `GAME_SCORE` được gửi với `gameId`, `score`, `level` khi game kết thúc
- [ ] `MOON_ROCKET_GAME_READY` được gửi sau khi config load xong
- [ ] `UPDATE_CONFIG` listener được thêm và hoạt động

### 8.2. Config Checklist

- [ ] Logo được load từ `getEffectiveLogoUrl()` ở **2 vị trí**:
  - [ ] Logo trên mặt trăng (moon) - trong game
  - [ ] Logo trong game over screen
- [ ] Story text được load từ `BRAND_CONFIG.storyText`
- [ ] Map color được load từ `BRAND_CONFIG.mapColor`
- [ ] Background được vẽ tự động với map color + ánh sao
- [ ] Config được load từ localStorage (playtest) hoặc Supabase
- [ ] Logo reload khi nhận `UPDATE_CONFIG`
- [ ] Fallback logo nếu config không có

### 8.3. Code Checklist

- [ ] Tất cả DOM IDs đã đổi đúng
- [ ] Canvas ID đã đổi đúng
- [ ] Asset paths đã đổi đúng (relative paths)
- [ ] Event listeners đã đổi từ `onclick` sang `addEventListener`
- [ ] Touch events có `{ passive: false }`
- [ ] CSS có `pointer-events: auto !important` cho start screen
- [ ] `gameId` được lấy từ `getGameId() || TEMPLATE_ID`

### 8.4. Testing Checklist

- [ ] Test trong editor: `http://localhost:5500/games/templates-v2/`
- [ ] Test Play Test button (mobile + desktop)
- [ ] Test Save & Copy Link button
- [ ] Test shared link: `play-v2.html?game=playmode-moon-rocket-XXX`
- [ ] Test config persistence (refresh page)
- [ ] Test Supabase sync (mở link trên device khác)
- [ ] **QUAN TRỌNG:** Kiểm tra console log:
  - `[PLAY MODE] GAME_START received for playmode-moon-rocket-XXX`
  - `[PLAY MODE] GAME_OVER received for playmode-moon-rocket-XXX`
  - `[PLAY MODE] Received score: XXX for playmode-moon-rocket-XXX`
- [ ] **QUAN TRỌNG:** Kiểm tra Supabase:
  - Plays được đếm
  - Score được lưu vào leaderboard
  - PLAY points được thưởng
- [ ] **QUAN TRỌNG:** Kiểm tra logo hiển thị ở 2 vị trí:
  - Logo trên mặt trăng khi chơi game
  - Logo trong game over screen

---

## 🐛 Bước 9: Fix Common Issues

### Issue 1: Logo không hiển thị trên mặt trăng

**Nguyên nhân:** Logo image chưa load hoặc error

**Fix:**
```javascript
// ✅ Đúng - có error handling
if (logoImage && logoImage.complete && !logoImage.error && logoImage.naturalWidth > 0) {
    try {
        ctx.drawImage(logoImage, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
    } catch (e) {
        // Fallback
    }
}
```

### Issue 2: Background không thay đổi khi đổi map color

**Nguyên nhân:** Không re-render sau khi update config

**Fix:**
```javascript
// ✅ Trong UPDATE_CONFIG listener
if (config.mapColor !== undefined) {
    BRAND_CONFIG.mapColor = config.mapColor;
    render(); // Trigger re-render
}
```

### Issue 3: Game không ấn được trên mobile

**Nguyên nhân:** Thiếu `{ passive: false }` hoặc CSS pointer-events

**Fix:**
1. Thêm `{ passive: false }` cho touch events
2. Thêm `pointer-events: auto !important` cho `.start-screen.active`

---

## 📚 Tài Liệu Tham Khảo

- **Template Integration Guide:** `TEMPLATE-INTEGRATION-GUIDE.md`
- **Knife Fix Workflow:** `KNIFE-FIX-TEMPLATE-WORKFLOW.md`
- **Example Template:** `games/templates-v2/draw-runner-template/`
- **Script:** `scripts/add-template.js`
- **Registry:** `games/templates-v2/core/template-registry.js`
- **Play Script:** `scripts/play-v2.js`

---

## 🎯 Tóm Tắt Workflow

1. ✅ **Setup:** Script đã tự động tạo structure
2. ✅ **Copy assets:** Copy từ `games/moon/assets/` → `games/templates-v2/moon-rocket-template/assets/`
3. ✅ **Migrate code:** Extract CSS, HTML, JS vào các file riêng
4. ✅ **Tích hợp config:** 
   - Logo ở 2 vị trí (moon + game over screen)
   - Story text
   - Map color với background tự vẽ + ánh sao
5. ✅ **PostMessage:** Thêm `GAME_START`, `GAME_OVER`, `GAME_SCORE` với `gameId`
6. ✅ **Fix code:** Đổi DOM IDs, asset paths, event listeners, touch events
7. ✅ **Config loading:** Thêm `initGameConfig()` và `loadBrandConfigFromSupabase()`
8. ✅ **Test:** Test tất cả features và kiểm tra console logs

**⏱️ Thời gian ước tính:** 2-3 giờ (do có 2 vị trí logo và background tự vẽ)

---

## ⚠️ Lưu Ý Quan Trọng

1. **BẮT BUỘC:** Phải gửi `gameId` trong tất cả PostMessage để đếm plays và lưu score
2. **BẮT BUỘC:** Phải gửi CẢ `GAME_OVER` và `GAME_SCORE` khi game kết thúc
3. **BẮT BUỘC:** Logo phải hiển thị ở **2 vị trí** (moon + game over screen)
4. **QUAN TRỌNG:** Background phải tự vẽ với map color + ánh sao (không dùng image)
5. **QUAN TRỌNG:** Test trên cả desktop và mobile
6. **QUAN TRỌNG:** Kiểm tra console logs để đảm bảo messages được gửi đúng
7. **QUAN TRỌNG:** Kiểm tra Supabase để đảm bảo plays/score được lưu

---

**Happy Coding! 🚀**


