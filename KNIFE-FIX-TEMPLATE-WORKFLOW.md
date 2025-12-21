# 🔪 Workflow Tạo Template cho Knife Fix Game

## 📋 Tổng Quan

Workflow này hướng dẫn chi tiết cách tích hợp game `knife-fix` vào hệ thống template V2 với **đầy đủ** tính năng:
- ✅ Đếm lượt plays
- ✅ Lưu score vào leaderboard
- ✅ Đếm thời gian chơi và thưởng PLAY points
- ✅ Config system (logo, story)
- ✅ PostMessage integration

---

## 🚀 Bước 1: Chạy Script Tự Động

### 1.1. Chạy `add-template.js`

```bash
cd "D:\HLMT5 game memeplay.dev"
node scripts/add-template.js --name "knife-fix" --display "Knife Fix"
```

**Script sẽ tự động tạo:**
- ✅ Folder: `games/templates-v2/knife-fix-template/`
- ✅ File structure:
  ```
  knife-fix-template/
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

**⚠️ Lưu ý:** Sau khi chạy script, kiểm tra:
- Folder đã được tạo đúng chưa?
- `template-registry.js` có entry mới chưa?
- `play-v2.js` có detection pattern chưa?

---

## 📦 Bước 2: Copy Assets

### 2.1. Copy tất cả assets từ game gốc

```bash
# Copy assets folder
Copy-Item -Path "games\knife-fix\assets\*" -Destination "games\templates-v2\knife-fix-template\assets\" -Recurse -Force
```

**Assets cần copy:**
- `bg.webp` - Background
- `cake-logo.png` - Logo mặc định (sẽ được thay bằng logo từ config)
- `knife.png` - Knife sprite
- `hit.wav`, `fail.wav`, `slice.wav` - Sound effects
- `image-removebg-preview (31) (1).png` - Nếu có

### 2.2. Copy logo mặc định

```bash
# Copy logo làm logo mặc định
Copy-Item -Path "games\knife-fix\assets\cake-logo.png" -Destination "games\templates-v2\knife-fix-template\assets\logo.webp" -Force
```

**⚠️ Lưu ý:** Nếu logo là PNG, có thể giữ nguyên hoặc convert sang WebP để tối ưu.

---

## 📝 Bước 3: Migrate Code

### 3.1. Extract CSS → `style.css`

**Từ:** `games/knife-fix/index.html` (phần `<style>`)  
**Đến:** `games/templates-v2/knife-fix-template/style.css`

**Cần làm:**
1. Copy toàn bộ CSS từ `<style>` tag
2. Đảm bảo responsive styles được giữ nguyên
3. Kiểm tra các class: `.overlay`, `.start-screen`, `.game-over-screen`, `.restart-btn`

### 3.2. Extract HTML → `index.html`

**Từ:** `games/knife-fix/index.html` (phần HTML)  
**Đến:** `games/templates-v2/knife-fix-template/index.html`

**Cấu trúc cần có:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Knife Fix - MemePlay</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="game-container">
        <canvas id="game-canvas"></canvas>
        <!-- Start Screen -->
        <div id="start-screen" class="overlay start-screen active">
            <h1>Tap to Cut the Cake</h1>
        </div>
        <!-- Game Over Screen -->
        <div id="gameover-screen" class="overlay game-over-screen">
            <div class="game-over-box">
                <h2>Game Over!</h2>
                <img id="gameover-logo" src="assets/logo.webp" alt="Logo">
                <p>Score: <span id="final-score">0</span></p>
                <button id="restart-btn" class="restart-btn">Restart Game</button>
            </div>
        </div>
    </div>
    <script type="module" src="game.js"></script>
</body>
</html>
```

**⚠️ Lưu ý:**
- Đổi `id="gameCanvas"` → `id="game-canvas"`
- Đổi `id="gameOverScreen"` → `id="gameover-screen"`
- Đổi `id="startScreen"` → `id="start-screen"`
- Đổi `id="finalScore"` → `id="final-score"`
- Đổi `id="gameOverLogo"` → `id="gameover-logo"`
- Đổi `id="restart-btn"` → `id="restart-btn"`
- Thêm `type="module"` vào script tag

### 3.3. Extract JavaScript → `game.js`

**Từ:** `games/knife-fix/index.html` (phần `<script>`)  
**Đến:** `games/templates-v2/knife-fix-template/game.js`

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

**Kiểm tra:** `games/templates-v2/knife-fix-template/config.js`

**Đảm bảo có:**
```javascript
export const TEMPLATE_ID = 'knife-fix-template';
const KNIFE_FIX_STORAGE_PREFIX = 'knife_fix_brand_config_';
const DEFAULT_LOGO = 'assets/logo.webp'; // Đường dẫn đến logo mặc định

export const BRAND_CONFIG = {
    logoUrl: '',
    storyText: 'MEMEPLAY'
};

export function getEffectiveLogoUrl() {
    return BRAND_CONFIG.logoUrl || DEFAULT_LOGO;
}
```

### 4.2. Thay hardcoded logo bằng config

**Tìm và thay thế:**

```javascript
// ❌ Trước (hardcoded)
const logoImg = new Image();
logoImg.src = 'assets/cake-logo.png';

// ✅ Sau (dùng config)
import { getEffectiveLogoUrl } from './config.js';
const logoImg = new Image();
logoImg.src = getEffectiveLogoUrl();
```

**Vị trí cần sửa:**
1. **Load assets function:** Thay logo path
2. **Game over screen:** Thay logo src trong HTML hoặc JavaScript
3. **Start screen:** Nếu có logo

### 4.3. Thay hardcoded story text

**Tìm và thay thế:**

```javascript
// ❌ Trước (hardcoded)
ctx.fillText('MEMEPLAY', x, y);

// ✅ Sau (dùng config)
import { BRAND_CONFIG } from './config.js';
ctx.fillText(BRAND_CONFIG.storyText || 'MEMEPLAY', x, y);
```

---

## 📡 Bước 5: PostMessage Integration (QUAN TRỌNG NHẤT!)

### 5.1. Thêm GAME_START message

**Vị trí:** Trong function `initGame()` hoặc khi game bắt đầu

```javascript
function initGame() {
    gameState = 'playing';
    score = 0;
    level = 1;
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

**⚠️ Lưu ý:**
- Phải có `gameId` trong message
- Gửi ngay sau khi `gameState = 'playing'`
- Cũng gửi khi restart game (trong `restartGame()`)

### 5.2. Thêm GAME_OVER message

**Vị trí:** Trong function `gameOver()`

```javascript
function gameOver() {
    gameState = 'gameover';
    document.getElementById('final-score').textContent = score;
    document.getElementById('gameover-screen').classList.add('active');
    
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
        level: level // Knife Fix có level system
    }, '*');
}
```

**⚠️ Lưu ý:**
- Phải gửi CẢ HAI messages: `GAME_OVER` và `GAME_SCORE`
- `GAME_OVER` → Dừng timer, tính rewards
- `GAME_SCORE` → Lưu vào leaderboard, thưởng PLAY points
- Phải có `gameId`, `score`, `level` trong `GAME_SCORE`

### 5.3. Thêm GAME_READY message

**Vị trí:** Trong function `initGameConfig()` hoặc khi game sẵn sàng

```javascript
async function initGameConfig() {
    // ... load config ...
    
    // ✅ Gửi ready signal để editor biết game đã sẵn sàng
    window.parent.postMessage({ 
        type: 'KNIFE_FIX_GAME_READY' // Message type từ template-registry.js
    }, '*');
}
```

**⚠️ Lưu ý:**
- Message type phải khớp với `messageTypes.READY` trong `template-registry.js`
- Gửi sau khi config đã load xong

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
        
        // Reload logo nếu thay đổi
        if (config.logoUrl !== undefined) {
            reloadLogo(); // Function để reload logo image
        }
        
        console.log('[Knife Fix] Config updated:', BRAND_CONFIG);
    }
});
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
document.getElementById('restart-btn').onclick = restartGame;

// ✅ Mới
document.getElementById('game-canvas')
document.getElementById('gameover-screen')
document.getElementById('start-screen')
document.getElementById('final-score')
document.getElementById('gameover-logo')
document.getElementById('restart-btn').addEventListener('click', restartGame);
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
bgImage.src = 'assets/bg.webp';
knifeImage.src = 'assets/knife.png';

// ✅ Mới (relative paths)
bgImage.src = './assets/bg.webp';
knifeImage.src = './assets/knife.png';
```

### 6.4. Fix Restart Game Logic

**Đảm bảo `restartGame()` gửi GAME_START:**

```javascript
function restartGame() {
    gameState = 'start';
    document.getElementById('gameover-screen').classList.remove('active');
    document.getElementById('start-screen').classList.add('active');
    
    // ✅ Khi user click "Restart", sẽ gọi initGame() → tự động gửi GAME_START
    // Hoặc gửi ngay ở đây:
    // const gameId = getGameId() || TEMPLATE_ID;
    // window.parent.postMessage({ type: 'GAME_START', gameId: gameId }, '*');
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
        const playtestKey = 'knife_fix_brand_config_playtest-knife-fix';
        const playtestConfig = localStorage.getItem(playtestKey);
        if (playtestConfig) {
            try {
                const parsed = JSON.parse(playtestConfig);
                Object.assign(BRAND_CONFIG, parsed);
                console.log('[Knife Fix] Loaded playtest config:', BRAND_CONFIG);
                reloadLogo();
            } catch (e) {
                console.warn('[Knife Fix] Failed to parse playtest config:', e);
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
    
    // Send ready signal
    window.parent.postMessage({ 
        type: 'KNIFE_FIX_GAME_READY' 
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
        
        if (data.fragment_logo_url) BRAND_CONFIG.logoUrl = data.fragment_logo_url;
        if (data.story_one) BRAND_CONFIG.storyText = data.story_one;
        
        console.log('[Knife Fix] Loaded config from Supabase:', BRAND_CONFIG);
        return true;
    } catch (err) {
        console.warn('[Knife Fix] Failed to load from Supabase:', err);
        return false;
    }
}

function reloadLogo() {
    const newLogoUrl = getEffectiveLogoUrl();
    const logoImg = document.getElementById('gameover-logo');
    if (logoImg) {
        logoImg.src = newLogoUrl;
    }
    // Nếu có logo trong game (không phải HTML), reload ở đây
}
```

### 7.2. Gọi `initGameConfig()` khi DOM ready

**Trong `DOMContentLoaded`:**

```javascript
document.addEventListener('DOMContentLoaded', async () => {
    // ... setup canvas ...
    
    // Load config trước khi load assets
    await initGameConfig();
    
    // Load assets
    await loadAssets();
    
    // ... rest of init ...
});
```

---

## ✅ Bước 8: Checklist Kiểm Tra

### 8.1. PostMessage Checklist

- [ ] `GAME_START` được gửi với `gameId` khi game bắt đầu
- [ ] `GAME_START` được gửi khi restart game
- [ ] `GAME_OVER` được gửi với `gameId` khi game kết thúc
- [ ] `GAME_SCORE` được gửi với `gameId`, `score`, `level` khi game kết thúc
- [ ] `KNIFE_FIX_GAME_READY` được gửi sau khi config load xong
- [ ] `UPDATE_CONFIG` listener được thêm và hoạt động

### 8.2. Config Checklist

- [ ] Logo được load từ `getEffectiveLogoUrl()`
- [ ] Story text được load từ `BRAND_CONFIG.storyText`
- [ ] Config được load từ localStorage (playtest) hoặc Supabase
- [ ] Logo reload khi nhận `UPDATE_CONFIG`
- [ ] Fallback logo nếu config không có

### 8.3. Code Checklist

- [ ] Tất cả DOM IDs đã đổi đúng
- [ ] Canvas ID đã đổi đúng
- [ ] Asset paths đã đổi đúng (relative paths)
- [ ] Event listeners đã đổi từ `onclick` sang `addEventListener`
- [ ] `gameId` được lấy từ `getGameId() || TEMPLATE_ID`

### 8.4. Testing Checklist

- [ ] Test trong editor: `http://localhost:5500/games/templates-v2/`
- [ ] Test Play Test button (mobile + desktop)
- [ ] Test Save & Copy Link button
- [ ] Test shared link: `play-v2.html?game=playmode-knife-fix-XXX`
- [ ] Test config persistence (refresh page)
- [ ] Test Supabase sync (mở link trên device khác)
- [ ] **QUAN TRỌNG:** Kiểm tra console log:
  - `[PLAY MODE] GAME_START received for playmode-knife-fix-XXX`
  - `[PLAY MODE] GAME_OVER received for playmode-knife-fix-XXX`
  - `[PLAY MODE] Received score: XXX for playmode-knife-fix-XXX`
- [ ] **QUAN TRỌNG:** Kiểm tra Supabase:
  - Plays được đếm
  - Score được lưu vào leaderboard
  - PLAY points được thưởng

---

## 🐛 Bước 9: Fix Common Issues

### Issue 1: Game không đếm plays

**Nguyên nhân:** Thiếu `gameId` trong `GAME_START` message

**Fix:**
```javascript
// ✅ Đúng
const gameId = getGameId() || TEMPLATE_ID;
window.parent.postMessage({ type: 'GAME_START', gameId: gameId }, '*');

// ❌ Sai
window.parent.postMessage({ type: 'GAME_START' }, '*');
```

### Issue 2: Score không được lưu

**Nguyên nhân:** Thiếu `GAME_SCORE` message hoặc thiếu `gameId`

**Fix:**
```javascript
// ✅ Đúng
window.parent.postMessage({ 
    type: 'GAME_SCORE',
    gameId: gameId,
    score: score,
    level: level
}, '*');
```

### Issue 3: Logo không hiển thị

**Nguyên nhân:** Logo path sai hoặc chưa load

**Fix:**
```javascript
// ✅ Đúng
const logoUrl = getEffectiveLogoUrl();
const logoImg = new Image();
logoImg.onload = () => { /* use logo */ };
logoImg.onerror = () => { /* fallback */ };
logoImg.src = logoUrl;
```

### Issue 4: Play Again button không hoạt động

**Nguyên nhân:** Event listener sai hoặc DOM ID sai

**Fix:**
```javascript
// ✅ Đúng
document.getElementById('restart-btn').addEventListener('click', restartGame);

// ❌ Sai
document.getElementById('restart-btn').onclick = restartGame;
```

---

## 📚 Tài Liệu Tham Khảo

- **Template Integration Guide:** `TEMPLATE-INTEGRATION-GUIDE.md`
- **Example Template:** `games/templates-v2/arrow-template/`
- **Example Template:** `games/templates-v2/draw-runner-template/`
- **Script:** `scripts/add-template.js`
- **Registry:** `games/templates-v2/core/template-registry.js`
- **Play Script:** `scripts/play-v2.js`

---

## 🎯 Tóm Tắt Workflow

1. ✅ **Chạy script:** `node scripts/add-template.js --name "knife-fix" --display "Knife Fix"`
2. ✅ **Copy assets:** Copy từ `games/knife-fix/assets/` → `games/templates-v2/knife-fix-template/assets/`
3. ✅ **Migrate code:** Extract CSS, HTML, JS vào các file riêng
4. ✅ **Tích hợp config:** Thay hardcoded values bằng `BRAND_CONFIG`
5. ✅ **PostMessage:** Thêm `GAME_START`, `GAME_OVER`, `GAME_SCORE` với `gameId`
6. ✅ **Fix code:** Đổi DOM IDs, asset paths, event listeners
7. ✅ **Config loading:** Thêm `initGameConfig()` và `loadBrandConfigFromSupabase()`
8. ✅ **Test:** Test tất cả features và kiểm tra console logs

**⏱️ Thời gian ước tính:** 1-2 giờ (nếu làm đúng workflow)

---

## ⚠️ Lưu Ý Quan Trọng

1. **BẮT BUỘC:** Phải gửi `gameId` trong tất cả PostMessage để đếm plays và lưu score
2. **BẮT BUỘC:** Phải gửi CẢ `GAME_OVER` và `GAME_SCORE` khi game kết thúc
3. **BẮT BUỘC:** Phải có `level` trong `GAME_SCORE` (dùng `1` nếu game không có level)
4. **QUAN TRỌNG:** Test trên cả desktop và mobile
5. **QUAN TRỌNG:** Kiểm tra console logs để đảm bảo messages được gửi đúng
6. **QUAN TRỌNG:** Kiểm tra Supabase để đảm bảo plays/score được lưu

---

**Happy Coding! 🚀**




