# Phương án Migrate Game "Fallen Crypto" sang Template V2 (Chuẩn Rocket BNB)

## 📋 Tổng quan

**Game gốc:** `games/fallen-crypto/index.html`  
**Template mới:** `games/templates-v2/fallen-crypto-template/`  
**Chuẩn tham khảo:** Rocket BNB Template (đã hoàn thiện, dùng shared utilities)

---

## 🎯 Yêu cầu Customize

1. **Màu gạch (Brick Color)** - Thay đổi được trong editor
2. **Logo** - Hiển thị ở game over screen (thay thế Binance logo)
3. **Câu chuyện cuối game (Story)** - Hiển thị ở game over screen (thay thế BNB_STORIES)

---

## 📁 Cấu trúc File Template V2

```
games/templates-v2/fallen-crypto-template/
├── index.html          (Load config.js, game.js, style.css)
├── config.js           (BRAND_CONFIG, localStorage, shared utilities)
├── game.js             (Game logic + initializeGame + GAME_READY)
├── style.css           (CSS tách riêng từ inline styles)
├── editor/
│   └── editor-adapter.js  (Save/Load, syncToSupabase)
└── assets/             (Logo assets nếu cần)
```

---

## 🔧 Bước 1: Tạo Cấu trúc File

### 1.1. Tạo thư mục và file cơ bản
- Tạo `games/templates-v2/fallen-crypto-template/`
- Tạo `index.html`, `config.js`, `game.js`, `style.css`
- Tạo `editor/editor-adapter.js`

### 1.2. Copy assets (nếu cần)
- Copy `assets/binance-logo.webp` → `assets/` (hoặc để user upload logo mới)

---

## 🔧 Bước 2: Tách Code từ `fallen-crypto/index.html`

### 2.1. Phân tích code hiện tại

**Game Logic (giữ nguyên):**
- Canvas setup, game loop, paddle, balls, bricks, powerups
- Collision detection, level generation
- Audio system
- Controls (touch/keyboard)

**Branding (cần tách ra BRAND_CONFIG):**
- **Brick Color:** Line 799 - `getBrickColor()` return `#4a90a4` (hardcode)
- **Logo:** Line 234 - `<img id="bnbLogo" src="assets/binance-logo.webp">`
- **Story:** Line 452-458 - `BNB_STORIES` array, line 1134 - hiển thị story đầu tiên

**UI/CSS:**
- Inline styles (lines 7-211) → tách ra `style.css`

---

## 🔧 Bước 3: Implement `config.js` (Theo Rocket BNB)

### 3.1. BRAND_CONFIG Structure

```javascript
let BRAND_CONFIG = {
  brickColor: '#4a90a4',        // Màu gạch (customize)
  logo: null,                    // Logo image object
  logoUrl: '',                   // Logo URL
  story: 'welcome to memeplay'   // Story text (1 string, không phải array)
};
```

### 3.2. Shared Utilities (giống Rocket BNB)

```javascript
// ✅ Import shared utilities
import { getGameId, generateGameId as generateGameIdUtil } from '../core/game-id-utils.js';
import { loadLogoImage } from '../core/logo-loader.js';

// ✅ Storage prefix
const STORAGE_PREFIX = 'fallen_crypto_brand_config_';
let lastUsedStorageKey = null;
```

### 3.3. Functions (giống Rocket BNB)

- `loadBrandConfig(gameIdOverride)` - Load từ localStorage, fallback Supabase
- `saveBrandConfig(gameId)` - Save vào localStorage (1 key nhất quán)
- `generateGameId()` - Wrapper cho `generateGameIdUtil('fallen-crypto')`

**Lưu ý:**
- Cache `lastUsedStorageKey` để tránh tạo nhiều key cho cùng game
- Dùng `loadLogoImage()` shared utility thay vì `new Image()` tự tạo

---

## 🔧 Bước 4: Implement `game.js` (Theo Rocket BNB)

### 4.1. Import và Setup

```javascript
// ✅ Import config và shared utilities
import { BRAND_CONFIG, loadBrandConfig, saveBrandConfig } from './config.js';
import { getSupabaseClient } from '../core/supabase-client.js';
import { loadLogoImage } from '../core/logo-loader.js';
import { getGameId } from '../core/game-id-utils.js';

const TEMPLATE_ID = 'fallen-crypto-template';
```

### 4.2. Helper Functions (giống Rocket BNB)

```javascript
// ✅ Helper: Apply logo
function applyLogo(url) {
  if (!url) return;
  const normalizedUrl = url.trim();
  if (!normalizedUrl) return;
  BRAND_CONFIG.logoUrl = normalizedUrl;
  loadLogoImage(normalizedUrl, (img) => {
    BRAND_CONFIG.logo = img;
  });
}

// ✅ Helper: Apply brand config (logo/story/brickColor)
function applyBrandConfig({ logoUrl = '', story = 'welcome to memeplay', brickColor = '#4a90a4' }) {
  Object.assign(BRAND_CONFIG, {
    logoUrl: logoUrl ? logoUrl.trim() : '',
    story: story || 'welcome to memeplay',
    brickColor: brickColor || '#4a90a4'
  });
  applyLogo(BRAND_CONFIG.logoUrl);
}

// ✅ Load brand config from Supabase (fallback)
async function loadBrandConfigFromSupabase(gameId) {
  // Giống Rocket BNB: query Supabase, map fields, applyBrandConfig, save localStorage
}
```

### 4.3. Modify Game Logic

**A. Brick Color (Line 799 - `getBrickColor()`):**
```javascript
function getBrickColor(row, totalRows) {
  // ✅ Dùng BRAND_CONFIG.brickColor thay vì hardcode
  return BRAND_CONFIG.brickColor || '#4a90a4';
}
```

**B. Game Over Screen (Line 1121 - `endGame()`):**
```javascript
function endGame(won = false) {
  // ... existing code ...
  
  // ✅ Hiển thị story từ BRAND_CONFIG (không phải BNB_STORIES)
  const story = BRAND_CONFIG.story || 'welcome to memeplay';
  document.getElementById('bnbStory').textContent = story;
  
  // ✅ Hiển thị logo từ BRAND_CONFIG (nếu có)
  const bnbLogoEl = document.getElementById('bnbLogo');
  if (BRAND_CONFIG.logo && bnbLogoEl) {
    bnbLogoEl.src = BRAND_CONFIG.logoUrl;
    bnbLogoEl.style.display = 'block';
  } else if (BRAND_CONFIG.logoUrl && bnbLogoEl) {
    bnbLogoEl.src = BRAND_CONFIG.logoUrl;
    bnbLogoEl.style.display = 'block';
  }
  
  // ... rest of code ...
}
```

### 4.4. Initialize Game (giống Rocket BNB)

```javascript
async function initializeGame() {
  try {
    // ✅ 1. Lấy gameId từ URL
    const gameId = getGameId();
    
    // ✅ 2. Load config từ localStorage
    let loaded = loadBrandConfig(gameId);
    
    // ✅ 3. Fallback: Load từ Supabase nếu localStorage không có
    if (!loaded && gameId && gameId !== 'playtest-fallen-crypto') {
      await loadBrandConfigFromSupabase(gameId);
    }
    
    // ✅ 4. Apply default nếu vẫn không có
    if (!BRAND_CONFIG.logoUrl && !BRAND_CONFIG.story) {
      applyBrandConfig({
        logoUrl: '',
        story: 'welcome to memeplay',
        brickColor: '#4a90a4'
      });
    }
    
    // ✅ 5. Load logo nếu có URL
    if (BRAND_CONFIG.logoUrl) {
      applyLogo(BRAND_CONFIG.logoUrl);
    }
    
    // ✅ 6. Start game loop
    requestAnimationFrame(gameLoop);
    
    // ✅ 7. Gửi GAME_READY signal (SAU KHI game loop đã start)
    setTimeout(() => {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'FALLEN_CRYPTO_GAME_READY',
          gameId: gameId || 'playtest-fallen-crypto',
          timestamp: Date.now()
        }, '*');
      }
    }, 50);
    
  } catch (error) {
    console.error('[Fallen Crypto] Failed to initialize game:', error);
    // Gửi ERROR signal nếu có lỗi
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'FALLEN_CRYPTO_GAME_ERROR',
        error: error.message,
        timestamp: Date.now()
      }, '*');
    }
  }
}

// ✅ Initialize khi DOM ready
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeGame);
} else {
  initializeGame();
}
```

### 4.5. UPDATE_CONFIG Listener (giống Rocket BNB)

```javascript
window.addEventListener('message', (event) => {
  if (event.origin !== window.location.origin && 
      !event.origin.includes('127.0.0.1') && 
      !event.origin.includes('localhost')) {
    return;
  }
  
  if (event.data && event.data.type === 'UPDATE_CONFIG') {
    const config = event.data.config;
    if (!config) return;
    
    // ✅ Update config ngay lập tức
    applyBrandConfig({
      logoUrl: config.logoUrl || '',
      story: config.story || 'welcome to memeplay',
      brickColor: config.brickColor || '#4a90a4'
    });
    
    // ✅ Save to localStorage
    const gameId = getGameId();
    if (gameId) {
      saveBrandConfig(gameId);
    }
  }
});
```

---

## 🔧 Bước 5: Implement `editor/editor-adapter.js` (Theo Rocket BNB)

### 5.1. Class Structure

```javascript
import { BaseAdapter } from '../../core/base-adapter.js';
import { syncGameToSupabase } from '../../core/supabase-sync.js';
import { cleanupOldGameKeys } from '../../core/storage-manager.js';
import { generateGameId as generateGameIdUtil } from '../../core/game-id-utils.js';

const FALLEN_CRYPTO_STORAGE_PREFIX = 'fallen_crypto_brand_config_';
const TEMPLATE_ID = 'fallen-crypto-template';

export class FallenCryptoEditorAdapter extends BaseAdapter {
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
    // ✅ Giống Rocket BNB: validate, get values, cleanup, save localStorage, sync Supabase
  }
  
  isDirty() {
    // ✅ So sánh với localStorage để check dirty
  }
  
  generateGameId() {
    return generateGameIdUtil('fallen-crypto');
  }
  
  async syncToSupabase(gameId, config) {
    // ✅ Dùng syncGameToSupabase shared utility (KHÔNG tự viết RPC)
    const creatorKey = 'fallen_crypto_creator_id';
    let creatorId = localStorage.getItem(creatorKey);
    if (!creatorId) {
      creatorId = 'creator_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(creatorKey, creatorId);
    }
    
    return await syncGameToSupabase({
      gameId,
      templateId: TEMPLATE_ID,
      title: config.story || 'Fallen Crypto Game',
      fragmentLogoUrl: config.logoUrl || null,
      stories: [config.story || ''],
      creatorId,
      templatePath: '/games/templates-v2/fallen-crypto-template/index.html',
      mapColor: config.brickColor || '#4a90a4',  // ✅ Dùng brickColor làm mapColor
      mapIndex: 0
    });
  }
}
```

### 5.2. Editor Elements (cần có trong `index.html` editor)

```html
<!-- Logo Input -->
<input type="file" id="logoInput" accept="image/*">
<img id="logoPreview" src="" alt="Logo Preview">

<!-- Story Input -->
<textarea id="storyInput" maxlength="50" placeholder="Enter story..."></textarea>

<!-- Brick Color Picker -->
<div id="brickColors">
  <button data-color="#4a90a4">Teal</button>
  <button data-color="#ff0000">Red</button>
  <button data-color="#00ff00">Green</button>
  <!-- ... more colors ... -->
</div>
```

---

## 🔧 Bước 6: Đăng ký Template trong Registry

### 6.1. Thêm vào `core/template-registry.js`

```javascript
'fallen-crypto-template': {
  adapterPath: '../fallen-crypto-template/editor/editor-adapter.js',
  adapterName: 'FallenCryptoEditorAdapter',
  playtestKey: 'fallen_crypto_brand_config_playtest',
  playtestGameId: 'playtest-fallen-crypto',
  storagePrefix: 'fallen_crypto_brand_config_',
  templateUrl: '/games/templates-v2/fallen-crypto-template/index.html',
  messageTypes: {
    READY: 'FALLEN_CRYPTO_GAME_READY',
    ERROR: 'FALLEN_CRYPTO_GAME_ERROR',
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
    brickColor: {  // ✅ Mới: Color picker cho gạch
      enabled: true,
      containerId: 'brickColors',
      colors: [
        { value: '#4a90a4', label: 'Teal' },
        { value: '#ff0000', label: 'Red' },
        { value: '#00ff00', label: 'Green' },
        { value: '#0000ff', label: 'Blue' },
        { value: '#ffff00', label: 'Yellow' },
        { value: '#ff00ff', label: 'Magenta' }
      ]
    }
  },
  displayName: 'Fallen Crypto',
  description: 'Brick breaker game with customizable bricks, logo, and story',
  enabled: true
}
```

---

## 🔧 Bước 7: Cập nhật `play-v2.js` (Nếu cần)

### 7.1. Template ID Variants

```javascript
// Trong guessTemplateFromId() hoặc templateIdVariants
templateIdVariants['fallen-crypto-template'] = ['fallen-crypto-template', 'fallen-crypto'];
```

### 7.2. Normalize Game (nếu cần xử lý đặc biệt)

```javascript
// Trong normalizeGame()
const isFallenCrypto = normalizedTemplateId === 'fallen-crypto-template' || 
                       templateId === 'fallen-crypto-template' || 
                       templateId === 'fallen-crypto';

if (isFallenCrypto) {
  // Xử lý brickColor từ mapColor (nếu cần)
  const brickColor = raw.map_color || raw.mapColor || '#4a90a4';
  // ... map vào gameData nếu cần
}
```

---

## 🔧 Bước 8: Tách CSS ra `style.css`

### 8.1. Copy inline styles từ `index.html` (lines 7-211)
- Tách tất cả `<style>` → `style.css`
- Link trong `index.html`: `<link rel="stylesheet" href="style.css">`

---

## 🔧 Bước 9: Cập nhật `index.html` Template

### 9.1. Structure (giống Rocket BNB)

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Fallen Crypto Template - V2</title>
  <link rel="stylesheet" href="style.css">
  <script type="module" src="config.js"></script>
  <script type="module" src="game.js"></script>
</head>
<body>
  <canvas id="gameCanvas"></canvas>
  
  <!-- Touch zones, screens (start, level, game-over) -->
  <!-- ... existing HTML ... -->
  
  <!-- ✅ Đảm bảo logo và story elements có ID đúng -->
  <img id="bnbLogo" src="" alt="Logo" class="bnb-logo" style="display: none;">
  <p id="bnbStory" class="bnb-story"></p>
</body>
</html>
```

---

## ✅ Checklist Test (Theo Rocket BNB)

### Test 1: Editor Playtest
- [ ] Mở editor Templates V2
- [ ] Chọn template "Fallen Crypto"
- [ ] Upload logo, nhập story, chọn màu gạch
- [ ] Click "Play Test"
- [ ] Game load, logo/story/màu gạch hiển thị đúng
- [ ] READY signal không timeout

### Test 2: Save & Copy (Mobile)
- [ ] Trên mobile, vào editor Fallen Crypto
- [ ] Upload logo, nhập story, chọn màu gạch
- [ ] Click "Save & Copy Link"
- [ ] Kiểm tra Supabase: có record mới (SQL query)
- [ ] Dán link dài vào tab khác (mobile)
- [ ] Game load, logo/story/màu gạch hiển thị đúng

### Test 3: Desktop Playmode
- [ ] Mở link dài trên desktop
- [ ] Game load, logo/story/màu gạch hiển thị đúng
- [ ] Không có lỗi JS trong console

### Test 4: UPDATE_CONFIG (Live Preview)
- [ ] Trong editor, thay đổi logo/story/màu gạch
- [ ] Game iframe tự động update (không cần reload)
- [ ] Logo/story/màu gạch thay đổi ngay lập tức

---

## ⚠️ Lưu ý Quan Trọng (Tránh Lỗi Rocket BNB)

### 1. ✅ Dùng Shared Utilities (KHÔNG hardcode)
- `getGameId()` / `generateGameId()` từ `game-id-utils.js`
- `loadLogoImage()` từ `logo-loader.js`
- `syncGameToSupabase()` từ `supabase-sync.js`
- `getSupabaseClient()` từ `supabase-client.js`

### 2. ✅ Gửi GAME_READY Signal ĐÚNG THỜI ĐIỂM
- **SAU KHI** game loop đã start (`requestAnimationFrame(gameLoop)`)
- **SAU KHI** config đã load xong
- Thêm delay 50ms để đảm bảo game thực sự ready
- **KHÔNG** gửi trước khi `initializeGame()` hoàn tất

### 3. ✅ Payload Supabase: Chỉ Legacy Fields
- Dùng `syncGameToSupabase()` shared utility
- Payload: `fragment_logo_url`, `story_one`, `map_color` (dùng cho brickColor)
- **KHÔNG** thêm fields mới nếu RPC chưa hỗ trợ

### 4. ✅ LocalStorage: 1 Key Nhất Quán
- Cache `lastUsedStorageKey` trong `config.js`
- Khi save không có gameId, dùng `lastUsedStorageKey` (tránh tạo nhiều key)

### 5. ✅ Object.assign (KHÔNG reassign binding)
- `Object.assign(BRAND_CONFIG, { ... })` thay vì `BRAND_CONFIG = { ... }`
- Tránh lỗi "Assignment to constant variable"

### 6. ✅ Error Handling
- Try-catch trong `initializeGame()`
- Gửi ERROR signal nếu có lỗi
- Log warning/error (không spam info log)

---

## 📊 So sánh với Rocket BNB

| Feature | Rocket BNB | Fallen Crypto |
|---------|------------|--------------|
| Logo | 1 logo (coin + game-over) | 1 logo (game-over) |
| Story | 1 string (tokenStory) | 1 string (story) |
| Color | Không có | **Brick Color** (mới) |
| BRAND_CONFIG | coinLogoUrl, gameOverLogoUrl, tokenStory | logoUrl, story, **brickColor** |
| Editor Fields | logo, story | logo, story, **brickColor** |
| Supabase Payload | fragment_logo_url, story_one | fragment_logo_url, story_one, **map_color** (brickColor) |

---

## 🎯 Kết luận

**Fallen Crypto Template V2 sẽ:**
1. ✅ Dùng shared utilities (giống Rocket BNB)
2. ✅ Có 3 customize fields: logo, story, brickColor
3. ✅ Sync Supabase qua `syncGameToSupabase()` shared
4. ✅ LocalStorage 1 key nhất quán
5. ✅ GAME_READY signal đúng thời điểm
6. ✅ Error handling đầy đủ

**Thời gian ước tính:** 2-3 giờ (nếu làm theo đúng checklist, tránh lỗi Rocket BNB)

---

## 📝 Files Cần Tạo/Sửa

### Tạo mới:
- `games/templates-v2/fallen-crypto-template/index.html`
- `games/templates-v2/fallen-crypto-template/config.js`
- `games/templates-v2/fallen-crypto-template/game.js`
- `games/templates-v2/fallen-crypto-template/style.css`
- `games/templates-v2/fallen-crypto-template/editor/editor-adapter.js`

### Sửa:
- `games/templates-v2/core/template-registry.js` (thêm entry)
- `scripts/play-v2.js` (thêm template variants nếu cần)

### Giữ nguyên:
- `games/fallen-crypto/index.html` (V1, không đụng)

---

**✅ Sẵn sàng bắt đầu code khi bạn đồng ý phương án này!**

