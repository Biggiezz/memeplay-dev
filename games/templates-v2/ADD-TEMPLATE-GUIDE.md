# 📋 Hướng Dẫn Thêm Template Mới - Templates V2

## 🎯 Tổng Quan

Guide này rút ra từ kinh nghiệm thêm **Pacman** và **Pixel Shooter** templates, giúp thêm template mới nhanh chóng và tránh các lỗi thường gặp.

---

## ⚠️ Các Lỗi Thường Gặp & Cách Tránh

### **1. Template ID Mismatch**

**Lỗi:**
- Registry dùng: `'pixel-shooter'`
- Editor adapter lưu Supabase: `'pixel-shooter-template'`
- → `play-v2.js` không tìm thấy config

**Fix:**
- ✅ Đã có `normalizeTemplateId()` trong `play-v2.js` (tự động map)
- ✅ Đảm bảo registry ID và editor ID nhất quán

**Best Practice:**
- Registry ID: `'template-name'` (ngắn gọn)
- Editor adapter: `'template-name-template'` (đầy đủ)
- `play-v2.js` tự động normalize → không cần lo

---

### **2. GameId Format Mismatch**

**Lỗi:**
- Editor tạo: `playmode-pixel-shooter-XXX`
- User test: `pixel-shooter-XXX` (bỏ prefix)
- → Không tìm thấy game

**Fix:**
- ✅ Đã có `getGameIdVariants()` trong `play-v2.js` (tự động thử cả 2 format)
- ✅ Hỗ trợ cả có và không có `playmode-` prefix

**Best Practice:**
- Editor adapter: Luôn tạo `playmode-{template-id}-XXX`
- `play-v2.js` tự động normalize → không cần lo

---

### **3. Config Không Load Trên Mobile**

**Lỗi:**
- Desktop: Config load được (localStorage có)
- Mobile: Config không load (localStorage không có hoặc chưa sync)

**Fix:**
- ✅ Thêm `loadBrandConfigFromSupabase()` trong `game.js`
- ✅ Thêm `DOMContentLoaded` listener với fallback Supabase

**Best Practice:**
- **Bắt buộc** thêm Supabase fallback cho mọi template mới
- Pattern:
  ```javascript
  // 1. Load từ localStorage
  const hasLocal = loadBrandConfig(gameId);
  // 2. Fallback Supabase
  if (!hasLocal) {
    await loadBrandConfigFromSupabase(gameId);
  }
  ```

---

### **4. Thiếu READY Signal**

**Lỗi:**
- Game không gửi READY signal
- → Editor bị stuck "loading preview game"

**Fix:**
- ✅ Game phải gửi READY signal sau khi init xong

**Best Practice:**
- **Bắt buộc** gửi READY signal trong `game.js`:
  ```javascript
  window.parent.postMessage({
    type: '{TEMPLATE_NAME}_GAME_READY',
    gameId: getGameId()
  }, '*');
  ```

---

### **5. Thiếu UPDATE_CONFIG Listener**

**Lỗi:**
- Editor update config nhưng game không nhận
- → Config không update real-time

**Fix:**
- ✅ Game phải listen `UPDATE_CONFIG` message

**Best Practice:**
- **Bắt buộc** listen UPDATE_CONFIG trong `game.js`:
  ```javascript
  window.addEventListener('message', (event) => {
    if (event.data.type === 'UPDATE_CONFIG') {
      // Update BRAND_CONFIG ngay lập tức
    }
  });
  ```

---

### **6. Thiếu GAME_START, GAME_SCORE, GAME_OVER Messages**

**Lỗi:**
- Game không gửi messages
- → Leaderboard không hoạt động, play count không tăng, toast rewards không hiển thị

**Fix:**
- ✅ Game phải gửi `GAME_START`, `GAME_SCORE`, `GAME_OVER` messages

**Best Practice:**
- **Bắt buộc** gửi messages trong `game.js`:
  ```javascript
  // Khi bắt đầu game
  window.parent.postMessage({
    type: 'GAME_START',
    gameId: getGameId()
  }, '*');
  
  // Khi có score
  window.parent.postMessage({
    type: 'GAME_SCORE',
    gameId: getGameId(),
    score: gameState.score
  }, '*');
  
  // Khi game over
  window.parent.postMessage({
    type: 'GAME_OVER',
    gameId: getGameId()
  }, '*');
  ```

---

## 📝 Checklist Thêm Template Mới

### **Bước 1: Tạo Template Folder**

```
games/templates-v2/{template-name}-template/
├── index.html          ✅ Game view (không có editor UI)
├── game.js             ✅ Game logic
├── config.js           ✅ Config management (optional)
├── style.css           ✅ Template-specific styles
├── assets/             ✅ Game assets (nếu có)
└── editor/
    └── editor-adapter.js ✅ Editor adapter (BẮT BUỘC)
```

---

### **Bước 2: Tạo Editor Adapter**

**File:** `{template-name}-template/editor/editor-adapter.js`

**Pattern:**
```javascript
import { BaseAdapter } from '../../core/base-adapter.js';
import { getSupabaseClient } from '../../core/supabase-client.js';
import { buildPublicLinkUrl } from '../../core/url-builder.js';
import { cleanupOldGameKeys } from '../../core/storage-manager.js';

const STORAGE_PREFIX = '{template_name}_brand_config_';
const TEMPLATE_ID = '{template-name}-template';

export class {TemplateName}EditorAdapter extends BaseAdapter {
  constructor(options = {}) {
    super(options);
    this.lastSavedGameId = null;
    this.dirty = true;
  }

  async load() {
    return { ok: true };
  }

  async save(forcedGameId = null) {
    // 1. Collect config từ UI
    // 2. Generate gameId
    // 3. Save to localStorage
    // 4. Sync to Supabase
  }

  isDirty() {
    // Compare current config với last saved
  }

  generateGameId() {
    // Format: playmode-{template-name}-XXX
  }

  async syncToSupabase(gameId, config) {
    // Sync config to Supabase
  }
}
```

**Lưu ý:**
- ✅ `TEMPLATE_ID` phải là `'{template-name}-template'` (đầy đủ)
- ✅ `generateGameId()` phải có format `playmode-{template-name}-XXX`
- ✅ `syncToSupabase()` phải dùng `p_template_id: TEMPLATE_ID`

---

### **Bước 3: Tạo Config.js (Optional)**

**File:** `{template-name}-template/config.js`

**Pattern:**
```javascript
let BRAND_CONFIG = {
  fragmentLogo: null,
  fragmentLogoUrl: '',
  title: '{Template Name} Game',
  mapColor: '#1a1a2e', // hoặc field khác tùy template
  stories: []
};

function getGameId() {
  const url = new URL(window.location.href);
  return url.searchParams.get('game');
}

function loadBrandConfig(gameIdOverride = null) {
  const gameId = gameIdOverride || getGameId();
  // Load từ localStorage
}

function saveBrandConfig(gameId = null) {
  // Save to localStorage
}

// Export
window.getGameId = getGameId;
window.loadBrandConfig = loadBrandConfig;
window.saveBrandConfig = saveBrandConfig;
```

---

### **Bước 4: Sửa Game.js**

**File:** `{template-name}-template/game.js`

**Bắt buộc:**

1. **READY Signal:**
```javascript
setTimeout(() => {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: '{TEMPLATE_NAME}_GAME_READY',
      gameId: typeof getGameId === 'function' ? getGameId() : 'playtest-{template-name}'
    }, '*');
  }
}, 100);
```

2. **UPDATE_CONFIG Listener:**
```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'UPDATE_CONFIG') {
    // Update BRAND_CONFIG ngay lập tức
  }
});
```

3. **GAME_START, GAME_SCORE, GAME_OVER Messages:**
```javascript
// Khi bắt đầu game
window.parent.postMessage({ type: 'GAME_START', gameId: getGameId() }, '*');

// Khi có score
window.parent.postMessage({ type: 'GAME_SCORE', gameId: getGameId(), score: score }, '*');

// Khi game over
window.parent.postMessage({ type: 'GAME_OVER', gameId: getGameId() }, '*');
```

4. **Supabase Fallback (BẮT BUỘC):**
```javascript
// Thêm constants
const TEMPLATE_ID = '{template-name}-template';
const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// Thêm function
async function loadBrandConfigFromSupabase(gameId) {
  // Load từ Supabase
}

// Thêm DOMContentLoaded listener
window.addEventListener('DOMContentLoaded', async () => {
  const gameId = new URLSearchParams(window.location.search).get('game');
  if (gameId) {
    const hasLocal = loadBrandConfig(gameId);
    if (!hasLocal) {
      await loadBrandConfigFromSupabase(gameId);
    }
  }
});
```

---

### **Bước 5: Thêm Vào Template Registry**

**File:** `games/templates-v2/core/template-registry.js`

**Thêm entry:**
```javascript
'{template-name}': {
  adapterPath: '../{template-name}-template/editor/editor-adapter.js',
  adapterName: '{TemplateName}EditorAdapter',
  playtestKey: '{template_name}_brand_config_playtest',
  playtestGameId: 'playtest-{template-name}',
  storagePrefix: '{template_name}_brand_config_',
  templateUrl: '/games/templates-v2/{template-name}-template/index.html',
  messageTypes: {
    READY: '{TEMPLATE_NAME}_GAME_READY',
    ERROR: '{TEMPLATE_NAME}_GAME_ERROR',
    UPDATE_CONFIG: 'UPDATE_CONFIG'
  },
  uiFields: {
    // Define UI fields (story, logo, mapColor, etc.)
  },
  displayName: '{Template Name}',
  description: '{Description}',
  enabled: true
}
```

**Lưu ý:**
- ✅ Registry ID: `'{template-name}'` (ngắn gọn, không có `-template`)
- ✅ `adapterPath`: Relative path từ `core/`
- ✅ `storagePrefix`: Format `'{template_name}_brand_config_'` (snake_case)

---

### **Bước 6: Test Checklist**

- [ ] Tạo game mới → Save → Copy link
- [ ] Truy cập link dài: `play-v2.html?game=playmode-{template-name}-XXX`
- [ ] Game load được (không báo "Game not found")
- [ ] Config load đúng (logo, colors, story)
- [ ] Editor update config → Game update real-time
- [ ] Leaderboard hoạt động
- [ ] Toast rewards hoạt động (10s, 60s, 300s)
- [ ] Play count tăng
- [ ] Test trên Desktop
- [ ] Test trên Mobile
- [ ] Test link không có prefix (nếu có)

---

## 🎯 Best Practices Tổng Hợp

### **1. Code Organization**

- ✅ **Code chung** → `scripts/play-v2.js`, `core/`
- ✅ **Code riêng** → `{template-name}-template/`
- ✅ **Không duplicate code** → Dùng helper functions

### **2. Template ID**

- ✅ Registry ID: `'template-name'` (ngắn)
- ✅ Editor ID: `'template-name-template'` (đầy đủ)
- ✅ `play-v2.js` tự động normalize → không cần lo

### **3. GameId Format**

- ✅ Editor tạo: `playmode-{template-name}-XXX`
- ✅ `play-v2.js` tự động normalize → hỗ trợ cả 2 format

### **4. Config Loading**

- ✅ **Bắt buộc** có Supabase fallback
- ✅ Pattern: localStorage → Supabase → defaults

### **5. Messages**

- ✅ **Bắt buộc** gửi READY signal
- ✅ **Bắt buộc** listen UPDATE_CONFIG
- ✅ **Bắt buộc** gửi GAME_START, GAME_SCORE, GAME_OVER

### **6. Testing**

- ✅ Test trên Desktop trước
- ✅ Test trên Mobile sau
- ✅ Test cả link có và không có prefix
- ✅ Test config load từ localStorage và Supabase

---

## 📚 Reference Templates

- **Pacman**: `games/templates-v2/pacman-template/` (Reference implementation)
- **Pixel Shooter**: `games/templates-v2/pixel-shooter-template/` (Latest implementation)

---

## 🚀 Quick Start

1. Copy `pacman-template` hoặc `pixel-shooter-template` làm base
2. Đổi tên folder và files
3. Sửa `editor-adapter.js` theo pattern
4. Sửa `game.js` thêm messages và Supabase fallback
5. Thêm entry vào `template-registry.js`
6. Test theo checklist

---

**Last Updated:** Sau khi hoàn thành Pixel Shooter template
**Author:** AI Assistant
**Version:** 1.0







