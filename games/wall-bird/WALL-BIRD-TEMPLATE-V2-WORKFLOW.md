# Wall-Bird Template V2 Migration Workflow

## Tổng quan
Hướng dẫn chi tiết để migrate game Wall-Bird vào Template V2 system, dựa trên kinh nghiệm từ Moon Template migration và các fix đã thực hiện.

## 🚨 CÁC ĐIỂM QUAN TRỌNG NHẤT (Must Read)

### ⚠️ Critical Fixes (Đã fix trong Wall-Bird)

1. **`loadBrandConfig()` return boolean:**
   - ❌ SAI: `return BRAND_CONFIG;` (object)
   - ✅ ĐÚNG: `return true;` hoặc `return false;` (boolean)
   - **Lý do:** Cần biết có config hay không để quyết định có load từ Supabase không

2. **Load từ Supabase khi không có localStorage:**
   - ✅ Phải có `loadBrandConfigFromSupabase()` trong `game.js`
   - ✅ Trong `initGameConfig()`, gọi `loadBrandConfigFromSupabase()` nếu `loadBrandConfig()` return false
   - **Lý do:** Khi dán link sang tab mới, localStorage không có → phải load từ Supabase

3. **`cleanupOldGameKeys()` truyền TEMPLATE_ID:**
   - ❌ SAI: `await cleanupOldGameKeys(WALL_BIRD_STORAGE_PREFIX, gameId);`
   - ✅ ĐÚNG: `await cleanupOldGameKeys(TEMPLATE_ID, 1);`
   - **Lý do:** Function nhận `templateId` chứ không phải `storagePrefix`

4. **Xử lý stories trong `normalizeGame()`:**
   - ✅ Phải thêm xử lý riêng cho `wall-bird-template` (giống moon, shooter, space-jump)
   - ✅ Map `raw.story_one` từ Supabase thành `stories` array
   - **Lý do:** Để story hiển thị đúng khi load từ Supabase

5. **Xử lý storyText trong `loadGameFromLocalStorage()`:**
   - ✅ Phải thêm case cho `wall-bird-template` (giống moon, shooter)
   - ✅ Map `config.storyText` thành `gameData.stories`
   - **Lý do:** Để story hiển thị đúng khi load từ localStorage

6. **Thêm vào `templateIdVariants` và `templateCandidates`:**
   - ✅ Phải có trong `fetchGameFromSupabase()` trong `play-v2.js`
   - **Lý do:** Để tìm game từ Supabase đúng template

7. **Thêm vào `needsBackgroundColor` check:**
   - ✅ Phải có `'wall-bird-template'` trong array
   - **Lý do:** Để map `backgroundColor` từ Supabase đúng

---

## ⚠️ QUYẾT ĐỊNH QUAN TRỌNG (Đã thống nhất)

### 1. Message Type
- **Incoming:** `UPDATE_CONFIG` (generic, dùng chung với tất cả templates)
- **Outgoing:** `WALL_BIRD_GAME_READY`, `WALL_BIRD_GAME_ERROR` (template-specific), `GAME_START`, `GAME_OVER`, `GAME_SCORE` (generic)

### 2. Storage Prefix
- **Format:** `wall_bird_brand_config_`
- **Pattern:** `{template_name}_brand_config_` (giống moon, shooter, arrow, etc.)
- **Example:** `wall_bird_brand_config_playmode-wall-bird-123a`

### 3. Element IDs
- **Format:** Kebab-case (nhất quán với các template khác)
- **Examples:** `game-canvas`, `start-screen`, `gameover-screen`, `start-btn`, `retry-btn`

### 4. Game ID Format
- **Format:** `playmode-wall-bird-XXX` (3 số + 1 chữ cái)
- **Example:** `playmode-wall-bird-123a`

### 5. Template ID
- **ID:** `wall-bird-template`
- **Format:** `{name}-template` (kebab-case + suffix `-template`)

### 6. Config Fields
- **Logo:** 1 logo (`logoUrl`) dùng cho cả 2 vị trí:
  - Pill (+5 điểm khi chim ăn được)
  - Game over screen
- **Story:** Text hiển thị ở game over screen (default: `'memeplay'`)
- **Background:** 3 màu để chọn:
  - Light Green: `#90EE90` (xanh lá nhạt)
  - Sky Blue: `#87ceeb` (xanh blue, mặc định)
  - Light Pink: `#FFB6C1` (hồng nhạt)

---

## Phần 1: Phân tích game hiện tại

### 1.1 Cấu trúc hiện tại
- **File:** `games/wall-bird/index.html` (single file với inline script)
- **Assets:** `bird.webp`, `background.webp`
- **Config fields:** 
  - `backgroundColor` (background color từ editor)
  - `fragmentLogoUrl` (logo hiển thị trong pill và game over)
  - `story` (text hiển thị ở game over)
- **Storage prefix:** `wall_bounce_bird_config_` (sẽ đổi thành `wall_bird_brand_config_` trong V2)
- **Message types:**
  - Incoming: `WALL_BOUNCE_BIRD_CONFIG` (sẽ đổi thành `UPDATE_CONFIG` trong V2)
  - Outgoing: `GAME_START`, `GAME_OVER`, `GAME_SCORE`

### 1.2 Điểm cần migrate
1. ✅ Tách HTML/CSS/JS thành các file riêng
2. ✅ Tạo `config.js` module theo pattern template v2
3. ✅ Tạo `editor-adapter.js` extend `BaseAdapter`
4. ✅ Đăng ký template vào `template-registry.js`
5. ✅ Cập nhật `play-v2.js` để hỗ trợ game lookup
6. ✅ Cập nhật editor UI (`games/templates-v2/index.html`)

---

## Phần 2: Cấu trúc thư mục mới

```
games/templates-v2/wall-bird-template/
├── assets/
│   ├── bird.webp
│   └── background.webp (nếu cần)
├── config.js                    # Brand config management
├── editor/
│   └── editor-adapter.js        # Editor integration
├── game.js                      # Core game logic (tách từ index.html)
├── index.html                   # Main HTML structure
└── style.css                    # CSS styles (tách từ inline style)
```

---

## Phần 2.5: Sử dụng bộ code chung (Shared Utilities)

Template V2 system cung cấp một bộ code chung (shared utilities) trong thư mục `games/templates-v2/core/` để giảm code duplication và đảm bảo consistency giữa các templates. **LUÔN sử dụng các utilities này thay vì tự implement.**

### 2.5.1 Game ID Utilities (`core/game-id-utils.js`)

**Chức năng:** Xử lý game ID generation và parsing.

```javascript
import { getGameId, generateGameId } from '../core/game-id-utils.js';

// ✅ Get game ID từ URL query parameter
const gameId = getGameId(); // Returns: 'playmode-wall-bird-123a' or null

// ✅ Generate unique game ID với format: playmode-{prefix}-{3digits}{1letter}
const newGameId = generateGameId('wall-bird'); // Returns: 'playmode-wall-bird-456b'
```

**Khi nào dùng:**
- Trong `config.js`: `getGameId()` để load config từ localStorage
- Trong `editor-adapter.js`: `generateGameId()` để tạo game ID mới khi save

### 2.5.2 Supabase Sync Helper (`core/supabase-sync.js`)

**Chức năng:** Sync game config lên Supabase database.

```javascript
import { syncGameToSupabase } from '../core/supabase-sync.js';

// ✅ TRONG editor-adapter.js - LUÔN dùng helper này
async save(forcedGameId = null) {
    // ... save to localStorage ...
    
    // ✅ Sync to Supabase (shared helper)
    try {
        const stories = config.storyText ? [config.storyText] : [];
        const success = await syncGameToSupabase({
            gameId,
            templateId: TEMPLATE_ID,
            title: config.storyText || 'Wall Bounce Bird Game',
            fragmentLogoUrl: config.logoUrl || null,
            stories,
            creatorId: this.getCreatorId(),
            templatePath: '/games/templates-v2/wall-bird-template/index.html',
            mapColor: config.backgroundColor || '#87ceeb',
            mapIndex: 0
        });
        if (!success) {
            console.warn('[WallBirdEditorAdapter] Supabase sync failed');
        }
    } catch (error) {
        console.error('[WallBirdEditorAdapter] Failed to sync to Supabase:', error);
    }
}
```

**Parameters:**
- `gameId` (string): Game ID (e.g., 'playmode-wall-bird-123a')
- `templateId` (string): Template ID (e.g., 'wall-bird-template')
- `title` (string): Game title
- `fragmentLogoUrl` (string|null): Logo URL (null nếu không có)
- `stories` (string[]): Array of story texts
- `creatorId` (string): Creator ID
- `templatePath` (string): Path to template HTML (e.g., '/games/templates-v2/wall-bird-template/index.html')
- `mapColor` (string, optional): Background color (default: '#1A0A2E')
- `mapIndex` (number, optional): Map index (default: 0)

**Lưu ý quan trọng:**
- ✅ **LUÔN dùng helper này** - không tự implement Supabase sync logic
- ✅ Chỉ gửi `fragmentLogoUrl` (không gửi `logoUrl` riêng)
- ✅ Chỉ gửi `stories` array (không gửi `story_one`, `story_two`, `story_three` riêng)
- ✅ `templatePath` phải là absolute path từ root (bắt đầu với `/`)

### 2.5.3 Storage Manager (`core/storage-manager.js`)

**Chức năng:** Quản lý localStorage với JSON helpers và cleanup old keys.

```javascript
import { getJSON, setJSON, cleanupOldGameKeys } from '../core/storage-manager.js';

// ✅ Get JSON từ localStorage
const config = getJSON('wall_bird_brand_config_playtest-wall-bird', null);

// ✅ Set JSON vào localStorage
setJSON('wall_bird_brand_config_playtest-wall-bird', { logoUrl: '...', storyText: '...' });

// ✅ Cleanup old game keys (trong editor-adapter.js save() method)
await cleanupOldGameKeys(WALL_BIRD_STORAGE_PREFIX, gameId);
```

**Khi nào dùng:**
- Trong `config.js`: Load/save config từ localStorage
- Trong `editor-adapter.js`: Cleanup old game keys trước khi save mới

### 2.5.4 Base Adapter (`core/base-adapter.js`)

**Chức năng:** Base class cho editor adapter.

```javascript
import { BaseAdapter } from '../../core/base-adapter.js';

export class WallBirdEditorAdapter extends BaseAdapter {
    constructor(options = {}) {
        super(options); // ✅ Gọi super constructor
        this.lastSavedGameId = null;
        this.dirty = true;
        this.editorElements = options.editorElements || {};
    }

    async load() {
        // ✅ Implement load logic
        return { ok: true };
    }

    async save(forcedGameId = null) {
        // ✅ Implement save logic
        // Must return { gameId: string }
        return { gameId: 'playmode-wall-bird-123a' };
    }

    isDirty() {
        // ✅ Optional: Implement dirty check
        return this.dirty;
    }
}
```

**Methods cần implement:**
- `load()`: Load editor state hoặc defaults (return `{ ok: true }` hoặc config object)
- `save(forcedGameId?)`: Save editor state và return `{ gameId: string }`
- `isDirty()`: (Optional) Check if config has changed (default: return `true`)

### 2.5.5 Logo Loader (`core/logo-loader.js`)

**Chức năng:** Load logo images với error handling.

```javascript
import { loadLogoImage } from '../core/logo-loader.js';

// ✅ Load single logo
const img = loadLogoImage(
    BRAND_CONFIG.logoUrl,
    (loadedImg) => {
        // onLoad callback
        state.customLogoImage = loadedImg;
    },
    () => {
        // onError callback
        console.warn('Failed to load logo');
        state.customLogoImage = null;
    }
);

// ✅ Load multiple logos (cho templates có nhiều logo types)
import { loadMultipleLogos } from '../core/logo-loader.js';

const logos = loadMultipleLogos(
    { coinLogoUrl: '...', gameOverLogoUrl: '...' },
    {
        coinLogo: (img) => state.coinLogoImage = img,
        gameOverLogo: (img) => state.gameOverLogoImage = img,
        coinLogoError: () => console.warn('Coin logo failed'),
        gameOverLogoError: () => console.warn('Game over logo failed')
    }
);
```

**Khi nào dùng:**
- Trong `game.js`: Load logo images từ config
- Trong `config.js`: Load default logos

### 2.5.6 URL Builder (`core/url-builder.js`)

**Chức năng:** Build public link URL cho games.

```javascript
import { buildPublicLinkUrl } from '../core/url-builder.js';

// ✅ Build public link URL (trong editor-adapter.js hoặc editor UI)
const publicUrl = buildPublicLinkUrl('playmode-wall-bird-123a');
// Returns: 'https://memeplay.dev/play-v2.html?game=playmode-wall-bird-123a'
// (hoặc local URL nếu đang dev)
```

**Khi nào dùng:**
- Trong `editor-adapter.js`: Build public URL sau khi save
- Trong editor UI: Hiển thị shareable link

### 2.5.7 Supabase Client (`core/supabase-client.js`)

**Chức năng:** Get Supabase client instance.

```javascript
import { getSupabaseClient } from '../core/supabase-client.js';

// ✅ Get Supabase client (thường dùng trong supabase-sync.js, không cần dùng trực tiếp)
const supabase = await getSupabaseClient();
if (!supabase) {
    console.warn('Supabase client unavailable');
    return;
}
```

**Khi nào dùng:**
- **KHÔNG cần dùng trực tiếp** - đã được wrap trong `syncGameToSupabase()`
- Chỉ dùng nếu cần custom Supabase queries (hiếm khi cần)

### 2.5.8 Template Registry (`core/template-registry.js`)

**Chức năng:** Centralized registry cho tất cả templates.

```javascript
import { 
    getTemplateConfig,
    getPlaytestKey,
    getPlaytestGameId,
    getTemplateUrl,
    getMessageType
} from '../core/template-registry.js';

// ✅ Get template config
const config = getTemplateConfig('wall-bird-template');
// Returns: { adapterPath, playtestKey, templateUrl, messageTypes, uiFields, ... }

// ✅ Get playtest key
const playtestKey = getPlaytestKey('wall-bird-template');
// Returns: 'wall_bird_brand_config_playtest'

// ✅ Get template URL
const templateUrl = getTemplateUrl('wall-bird-template');
// Returns: '/games/templates-v2/wall-bird-template/index.html'
```

**Khi nào dùng:**
- Trong editor UI: Load template config để hiển thị UI fields
- Trong playtest manager: Get playtest keys và URLs

### 2.5.9 Constants (`core/constants.js`)

**Chức năng:** Centralized constants.

```javascript
import { PRODUCTION_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY } from '../core/constants.js';

// ✅ Use constants thay vì hardcode
const publicUrl = `${PRODUCTION_BASE_URL}/play-v2.html?game=${gameId}`;
```

**Khi nào dùng:**
- Khi cần production URL hoặc Supabase config
- Thường được sử dụng bởi các utilities khác (không cần dùng trực tiếp)

### 2.5.10 Playtest Manager (`core/playtest-manager.js`)

**Chức năng:** Quản lý playtest iframes và config (dùng trong editor UI).

```javascript
import { 
    createPlaytestIframe,
    sendConfigToIframe,
    savePlaytestConfig
} from '../core/playtest-manager.js';

// ✅ Create playtest iframe (trong editor UI)
const iframe = createPlaytestIframe(
    'wall-bird-template',
    'playtest-wall-bird',
    previewContainer
);

// ✅ Send config to iframe (trong editor UI)
sendConfigToIframe(iframe, 'wall-bird-template', config);

// ✅ Save playtest config (trong editor UI)
savePlaytestConfig('wall-bird-template', config);
```

**Khi nào dùng:**
- **Chỉ dùng trong editor UI** (`games/templates-v2/index.html`)
- Không cần dùng trong template code (game.js, config.js, editor-adapter.js)

---

## Best Practices khi sử dụng Shared Utilities

### ✅ DO (Nên làm)

1. **Luôn import từ `core/` thay vì tự implement:**
```javascript
// ✅ ĐÚNG
import { getGameId, generateGameId } from '../core/game-id-utils.js';
import { syncGameToSupabase } from '../core/supabase-sync.js';

// ❌ SAI - Không tự implement
function getGameId() {
    const url = new URL(window.location.href);
    return url.searchParams.get('game');
}
```

2. **Dùng shared `syncGameToSupabase` trong editor-adapter.js:**
```javascript
// ✅ ĐÚNG
import { syncGameToSupabase } from '../../core/supabase-sync.js';

async save() {
    // ... save to localStorage ...
    await syncGameToSupabase({ gameId, templateId, ... });
}

// ❌ SAI - Không tự implement Supabase sync
async save() {
    const supabase = await getSupabaseClient();
    await supabase.rpc('upsert_user_created_game', { ... });
}
```

3. **Extend `BaseAdapter` cho editor adapter:**
```javascript
// ✅ ĐÚNG
import { BaseAdapter } from '../../core/base-adapter.js';

export class WallBirdEditorAdapter extends BaseAdapter {
    // ...
}

// ❌ SAI - Không tạo class từ đầu
export class WallBirdEditorAdapter {
    // ...
}
```

4. **Dùng `cleanupOldGameKeys` trước khi save:**
```javascript
// ✅ ĐÚNG
import { cleanupOldGameKeys } from '../../core/storage-manager.js';

async save(forcedGameId = null) {
    await cleanupOldGameKeys(WALL_BIRD_STORAGE_PREFIX, gameId);
    // ... save logic ...
}

// ❌ SAI - Không cleanup old keys
async save(forcedGameId = null) {
    // ... save logic ... (keys sẽ tích tụ trong localStorage)
}
```

### ❌ DON'T (Không nên làm)

1. **Không hardcode paths hoặc URLs:**
```javascript
// ❌ SAI
const templateUrl = '/games/templates-v2/wall-bird-template/index.html';
const publicUrl = 'https://memeplay.dev/play-v2.html?game=' + gameId;

// ✅ ĐÚNG
const templateUrl = getTemplateUrl('wall-bird-template');
const publicUrl = buildPublicLinkUrl(gameId);
```

2. **Không tự implement game ID generation:**
```javascript
// ❌ SAI
function generateGameId() {
    return 'wall-bird-' + Date.now();
}

// ✅ ĐÚNG
import { generateGameId } from '../core/game-id-utils.js';
const gameId = generateGameId('wall-bird');
```

3. **Không duplicate Supabase sync logic:**
```javascript
// ❌ SAI
async save() {
    const supabase = await getSupabaseClient();
    await supabase.rpc('upsert_user_created_game', {
        p_game_id: gameId,
        p_template_id: templateId,
        // ... nhiều fields ...
    });
}

// ✅ ĐÚNG
import { syncGameToSupabase } from '../../core/supabase-sync.js';
await syncGameToSupabase({ gameId, templateId, ... });
```

---

## Tóm tắt các Utilities theo Use Case

### Trong `config.js`
- ✅ `getGameId()` từ `game-id-utils.js`
- ✅ `generateGameId()` từ `game-id-utils.js`
- ✅ `getJSON()`, `setJSON()` từ `storage-manager.js` (optional, có thể dùng `localStorage` trực tiếp)

### Trong `editor-adapter.js`
- ✅ `BaseAdapter` từ `base-adapter.js` (extend class)
- ✅ `generateGameId()` từ `game-id-utils.js`
- ✅ `cleanupOldGameKeys()` từ `storage-manager.js`
- ✅ `syncGameToSupabase()` từ `supabase-sync.js`
- ✅ `buildPublicLinkUrl()` từ `url-builder.js` (optional)

### Trong `game.js`
- ✅ `getGameId()` từ `game-id-utils.js`
- ✅ `loadLogoImage()` từ `logo-loader.js` (nếu cần load logos)
- ✅ Import `BRAND_CONFIG`, `loadBrandConfig` từ `config.js` (local)

### Trong Editor UI (`games/templates-v2/index.html`)
- ✅ `getTemplateConfig()` từ `template-registry.js`
- ✅ `createPlaytestIframe()`, `sendConfigToIframe()`, `savePlaytestConfig()` từ `playtest-manager.js`
- ✅ `buildPublicLinkUrl()` từ `url-builder.js` (optional)

---

## Phần 3: Implementation Steps

### Bước 1: Tạo thư mục và copy assets

```bash
mkdir -p games/templates-v2/wall-bird-template/assets
mkdir -p games/templates-v2/wall-bird-template/editor
cp games/wall-bird/bird.webp games/templates-v2/wall-bird-template/assets/
# Copy background.webp nếu cần
```

### Bước 2: Tạo `config.js`

**File:** `games/templates-v2/wall-bird-template/config.js`

```javascript
// Wall-Bird Template - Config
// Import shared utilities from core/
import { getGameId as getGameIdUtil, generateGameId as generateGameIdUtil } from '../core/game-id-utils.js';

// Template ID
export const TEMPLATE_ID = 'wall-bird-template';

// Storage key prefix - MUST match editor-adapter.js
const WALL_BIRD_STORAGE_PREFIX = 'wall_bird_brand_config_';

// Default logo path (nếu có)
const DEFAULT_LOGO = null; // Wall-bird không có default logo

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
// ✅ QUAN TRỌNG: Return boolean (true nếu có config, false nếu không) để có thể load từ Supabase
export function loadBrandConfig(gameIdOverride = null) {
    const gameId = gameIdOverride || getGameIdUtil();
    if (!gameId) {
        return false; // ✅ Return false thay vì BRAND_CONFIG
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
```

**Lưu ý quan trọng:**
- ✅ Storage prefix: `wall_bird_brand_config_` (phải match với editor-adapter.js và template-registry.js)
- ✅ Logo: 1 logo (`logoUrl`) dùng cho cả 2 vị trí (pill +5đ và gameover screen)
- ✅ Story: Text hiển thị ở game over screen (default: 'memeplay')
- ✅ Background: 3 màu (xanh lá nhạt `#90EE90`, xanh blue `#87ceeb`, hồng nhạt `#FFB6C1`)
- ✅ Support cả `fragmentLogoUrl` và `logoUrl` cho backward compatibility
- ✅ Support cả `story`, `storyText`, `story_one` cho backward compatibility
- ✅ Support cả `backgroundColor` và `mapColor` cho backward compatibility

### Bước 3: Tạo `editor-adapter.js`

**File:** `games/templates-v2/wall-bird-template/editor/editor-adapter.js`

```javascript
import { BaseAdapter } from '../../core/base-adapter.js';
import { cleanupOldGameKeys } from '../../core/storage-manager.js';
import { generateGameId as generateGameIdUtil } from '../../core/game-id-utils.js';
import { syncGameToSupabase } from '../../core/supabase-sync.js';

const WALL_BIRD_STORAGE_PREFIX = 'wall_bird_brand_config_';
const TEMPLATE_ID = 'wall-bird-template';

/**
 * Editor Adapter for Wall-Bird Template
 * Handles save/load with localStorage and Supabase sync
 */
export class WallBirdEditorAdapter extends BaseAdapter {
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
        const storyText = (storyInput?.value || '').trim() || 'memeplay';
        
        // Get selected background color (1 trong 3 màu: xanh lá nhạt, xanh blue, hồng nhạt)
        let backgroundColor = '#87ceeb'; // default Sky Blue
        if (mapColors) {
            const activeColorBtn = mapColors.querySelector('.chip-btn.active');
            if (activeColorBtn) {
                backgroundColor = activeColorBtn.dataset.color || backgroundColor;
            }
        }
        
        // ✅ Cleanup old game keys before save (truyền TEMPLATE_ID, không phải storagePrefix)
        await cleanupOldGameKeys(TEMPLATE_ID, 1);
        
        // Build config object
        const config = {
            fragmentLogoUrl: logoUrl,
            story: storyText,
            backgroundColor: backgroundColor
        };
        
        // Save to localStorage với format đúng
        const storageKey = `${WALL_BIRD_STORAGE_PREFIX}${gameId}`;
        localStorage.setItem(storageKey, JSON.stringify(config));
        
        // ✅ Sync to Supabase (shared helper)
        try {
            const stories = config.story ? [config.story] : [];
            const success = await syncGameToSupabase({
                gameId,
                templateId: TEMPLATE_ID,
                title: config.story || 'Wall Bounce Bird Game',
                fragmentLogoUrl: config.fragmentLogoUrl || null,
                stories,
                creatorId: this.getCreatorId(),
                templatePath: '/games/templates-v2/wall-bird-template/index.html',
                mapColor: config.backgroundColor || '#87ceeb',
                mapIndex: 0
            });
            if (!success) {
                console.warn('[WallBirdEditorAdapter] Supabase sync failed, but game saved to localStorage');
            }
        } catch (error) {
            console.error('[WallBirdEditorAdapter] Failed to sync to Supabase:', error);
            // Don't fail the save if Supabase sync fails
        }
        
        this.lastSavedGameId = gameId;
        this.dirty = false;
        return { gameId };
    }

    isDirty() {
        return this.dirty;
    }

    markDirty() {
        this.dirty = true;
    }

    generateGameId() {
        return generateGameIdUtil('wall-bird');
    }

    getCreatorId() {
        const creatorKey = 'wall_bird_creator_id';
        let creatorId = localStorage.getItem(creatorKey);
        if (!creatorId) {
            creatorId = 'creator_' + Math.random().toString(36).slice(2, 10);
            localStorage.setItem(creatorKey, creatorId);
        }
        return creatorId;
    }
}
```

**Lưu ý quan trọng:**
- ✅ Storage prefix: `wall_bird_brand_config_` (phải match với config.js và template-registry.js)
- ✅ Game ID format: `playmode-wall-bird-XXX` (3 số + 1 chữ cái)
- ✅ Template ID: `wall-bird-template`
- ✅ Dùng `syncGameToSupabase` shared helper (giống moon-template)
- ✅ Không gửi `p_logo_url` và `p_story_text` riêng (chỉ dùng `p_fragment_logo_url` và `p_story_one`)
- ✅ `templatePath` phải đúng đường dẫn: `/games/templates-v2/wall-bird-template/index.html`

### Bước 4: Tách và tạo `index.html`

**File:** `games/templates-v2/wall-bird-template/index.html`

**Những điểm cần chú ý:**

1. **Meta viewport cho mobile:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
```

2. **Script imports (module type):**
```html
<script type="module" src="config.js"></script>
<script type="module" src="game.js"></script>
```

3. **Element IDs (dùng kebab-case):**
- ✅ `game-canvas` (thay vì `game`)
- ✅ `start-screen`, `gameover-screen` (thay vì `startOverlay`, `gameOverOverlay`)
- ✅ `start-btn`, `retry-btn`

4. **PostMessage integration:**
- ✅ Gửi `WALL_BIRD_GAME_READY` khi game ready (template-specific)
- ✅ Lắng nghe `UPDATE_CONFIG` từ editor (generic message type, dùng chung với tất cả templates)

**Template structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
    <title>Wall Bounce Bird - MemePlay</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div id="game-container">
        <canvas id="game-canvas" width="720" height="1000"></canvas>
        
        <!-- HUD -->
        <div id="hud">
            <span id="score-label">Score: 0</span>
        </div>

        <!-- Start Screen -->
        <div id="start-screen" class="overlay start-screen active">
            <button id="start-btn">Tap to Start</button>
        </div>

        <!-- Game Over Screen -->
        <div id="gameover-screen" class="overlay game-over-screen" style="display: none !important;">
            <div class="overlay-card">
                <h1>GAME OVER</h1>
                <img id="gameover-logo" class="game-over-logo" src="" alt="Logo" style="display: none;">
                <canvas id="gameover-pill-logo" class="game-over-pill-logo" style="display: none;"></canvas>
                <p id="final-score-text">Score: 0</p>
                <p class="promo-text" id="promo-text"></p>
                <button id="retry-btn">Play Again</button>
            </div>
        </div>
    </div>
    
    <script type="module" src="config.js"></script>
    <script type="module" src="game.js"></script>
</body>
</html>
```

### Bước 5: Tạo `style.css`

**File:** `games/templates-v2/wall-bird-template/style.css`

**Những điểm quan trọng:**

1. **Mobile optimization:**
```css
@media (max-width: 768px) {
    .hud { top: 12px; font-size: 16px; }
    canvas { 
        width: calc(100vw - 16px);
        aspect-ratio: 720 / 1000;
        max-height: calc(100vh - 24px);
    }
}
```

2. **Touch events:**
```css
canvas {
    touch-action: none;
}

body {
    -webkit-touch-callout: none;
    -webkit-user-select: none;
    user-select: none;
    touch-action: none;
}
```

3. **Overlay pointer events:**
```css
.overlay {
    pointer-events: none;
}

.overlay.active {
    pointer-events: auto !important;
}

.overlay button {
    pointer-events: auto;
}
```

### Bước 6: Tách và tạo `game.js`

**File:** `games/templates-v2/wall-bird-template/game.js`

**Những điểm QUAN TRỌNG dựa trên kinh nghiệm Moon Template:**

#### 6.1 Initialization Pattern (FIX MOBILE PLAY ISSUE)

❌ **SAI (có thể không chạy trên mobile iframe):**
```javascript
async function init() {
    await loadConfig();
    await loadAssets();
    gameLoop();
}
init();
```

✅ **ĐÚNG (pattern từ knife-fix template - đã test trên mobile):**
```javascript
document.addEventListener('DOMContentLoaded', () => {
    // Setup DOM elements
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    initSetup(); // Setup event listeners, etc.
    
    // Initialize với .then() chain (không dùng async/await wrapper)
    initGameConfig().then(() => {
        loadAssets().then(() => {
            loadAudio(); // Nếu có
            gameLoop(performance.now());
        });
    });
});

function initGameConfig() {
    return new Promise((resolve) => {
        // Load config từ localStorage
        loadBrandConfig();
        // Apply config to game state
        applyConfigToGame();
        resolve();
    });
}
```

#### 6.2 Game Loop Pattern (FIX MOBILE PLAY ISSUE)

❌ **SAI (2 separate loops có thể gây sync issues):**
```javascript
function gameLoop() {
    updateGame();
    requestAnimationFrame(gameLoop);
}

function renderLoop() {
    render();
    requestAnimationFrame(renderLoop);
}
gameLoop();
renderLoop();
```

✅ **ĐÚNG (single loop, render được gọi từ gameLoop):**
```javascript
function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    if (gameState === 'playing' || gameState === 'start') {
        updateGame(deltaTime);
    }
    
    render(); // ✅ Render được gọi trực tiếp từ gameLoop
    
    requestAnimationFrame(gameLoop);
}
```

#### 6.3 PostMessage Integration

```javascript
// ✅ Send READY message khi game loaded
window.parent?.postMessage({ 
    type: 'WALL_BIRD_GAME_READY',
    gameId: getGameId()
}, '*');

// ✅ Listen for UPDATE_CONFIG từ editor
window.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'UPDATE_CONFIG' && event.data.config) {
        const config = event.data.config;
        
        // Update background color
        if (config.backgroundColor || config.mapColor) {
            state.backgroundColor = config.backgroundColor || config.mapColor;
        }
        
        // Update logo
        if (config.logoUrl || config.fragmentLogoUrl) {
            const logoUrl = config.logoUrl || config.fragmentLogoUrl;
            state.customLogo = logoUrl;
            // Load logo image
            const logoImg = new Image();
            logoImg.onload = () => {
                state.customLogoImage = logoImg;
            };
            logoImg.onerror = () => {
                state.customLogoImage = null;
            };
            logoImg.src = logoUrl;
        } else {
            state.customLogo = null;
            state.customLogoImage = null;
        }
        
        // Update story
        if (config.storyText || config.story) {
            state.customStory = config.storyText || config.story;
        }
    }
});

// ✅ Send GAME_START khi bắt đầu game
function beginGame() {
    // ... game start logic ...
    window.parent?.postMessage({ 
        type: 'GAME_START', 
        gameId: getGameId() 
    }, '*');
}

// ✅ Send GAME_OVER và GAME_SCORE khi game kết thúc
function triggerGameOver() {
    // ... game over logic ...
    window.parent?.postMessage({ 
        type: 'GAME_OVER', 
        gameId: getGameId() 
    }, '*');
    window.parent?.postMessage({ 
        type: 'GAME_SCORE', 
        gameId: getGameId(),
        score: state.score,
        level: 1
    }, '*');
}
```

#### 6.4 Config Loading

```javascript
import { BRAND_CONFIG, loadBrandConfig, getGameId } from './config.js';

// ✅ Load config ngay khi game init (với Supabase fallback)
import { getSupabaseClient } from '../core/supabase-client.js';

function initGameConfig() {
    return new Promise(async (resolve) => {
        const gameId = getGameId();
        
        if (!gameId) {
            // Load từ playtest nếu không có gameId
            const playtestKey = 'wall_bird_brand_config_playtest';
            const playtestConfig = localStorage.getItem(playtestKey);
            if (playtestConfig) {
                try {
                    const parsed = JSON.parse(playtestConfig);
                    if (parsed.fragmentLogoUrl || parsed.logoUrl) {
                        BRAND_CONFIG.logoUrl = parsed.fragmentLogoUrl || parsed.logoUrl || '';
                    }
                    if (parsed.story || parsed.storyText || parsed.story_one) {
                        BRAND_CONFIG.storyText = parsed.story || parsed.storyText || parsed.story_one || 'memeplay';
                    }
                    if (parsed.backgroundColor || parsed.mapColor) {
                        BRAND_CONFIG.backgroundColor = parsed.backgroundColor || parsed.mapColor || '#87ceeb';
                    }
                } catch (e) {
                    console.warn('[Wall-Bird] Failed to parse playtest config:', e);
                }
            }
        } else {
            // ✅ Load từ localStorage trước
            const hasLocalConfig = loadBrandConfig(gameId);
            
            // ✅ Load từ Supabase nếu không có trong localStorage (quan trọng cho tab mới)
            if (!hasLocalConfig && gameId) {
                await loadBrandConfigFromSupabase(gameId);
            }
        }
        
        // Apply config to state
        applyConfigToGame();
        resolve();
    });
}

// ✅ Load config từ Supabase (quan trọng khi mở link mới - tab mới không có localStorage)
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
        if (data.fragment_logo_url || data.logo_url) {
            BRAND_CONFIG.logoUrl = data.fragment_logo_url || data.logo_url || '';
        }
        if (data.story_one || data.story_text || data.storyText) {
            BRAND_CONFIG.storyText = data.story_one || data.story_text || data.storyText || 'memeplay';
        }
        if (data.map_color || data.mapColor) {
            BRAND_CONFIG.backgroundColor = data.map_color || data.mapColor || '#87ceeb';
        }
        
        return true;
    } catch (err) {
        console.warn('[Wall-Bird] Failed to load from Supabase:', err);
        return false;
    }
}

function applyConfigToGame() {
    // Apply background color
    state.backgroundColor = BRAND_CONFIG.backgroundColor || '#87ceeb';
    
    // Apply logo
    if (BRAND_CONFIG.logoUrl) {
        const logoImg = new Image();
        logoImg.onload = () => {
            state.customLogoImage = logoImg;
        };
        logoImg.onerror = () => {
            state.customLogoImage = null;
        };
        logoImg.src = BRAND_CONFIG.logoUrl;
    }
    
    // Apply story
    state.customStory = BRAND_CONFIG.storyText || 'memeplay';
}
```

### Bước 7: Đăng ký template vào `template-registry.js`

**File:** `games/templates-v2/core/template-registry.js`

Thêm entry mới vào `TEMPLATE_REGISTRY`:

```javascript
export const TEMPLATE_REGISTRY = {
  // ... existing templates ...
  
  // ✅ Wall-Bird Template
  'wall-bird-template': {
    adapterPath: '../wall-bird-template/editor/editor-adapter.js',
    adapterName: 'WallBirdEditorAdapter',
    
    // Storage keys
    playtestKey: 'wall_bird_brand_config_playtest',
    playtestGameId: 'playtest-wall-bird',
    storagePrefix: 'wall_bird_brand_config_',
    
    // Template URL
    templateUrl: '/games/templates-v2/wall-bird-template/index.html',
    
    // Message types
    messageTypes: {
      READY: 'WALL_BIRD_GAME_READY',      // Template-specific (gửi khi game ready)
      ERROR: 'WALL_BIRD_GAME_ERROR',      // Template-specific (gửi khi có lỗi)
      UPDATE_CONFIG: 'UPDATE_CONFIG'       // Generic (dùng chung với tất cả templates, nhận config từ editor)
    },
    
    // UI Fields configuration
    uiFields: {
      mapColor: {
        enabled: true,
        containerId: 'mapColors',
        colors: [
          { value: '#90EE90', label: 'Light Green' },  // Xanh lá nhạt
          { value: '#87ceeb', label: 'Sky Blue' },      // Xanh blue (mặc định)
          { value: '#FFB6C1', label: 'Light Pink' }     // Hồng nhạt
        ]
      },
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      logo: {
        enabled: true,
        inputId: 'logoInput',
        previewId: 'logoPreview'
      }
    },
    
    // Template metadata
    displayName: 'Wall Bounce Bird',
    description: 'Bounce bird between walls, avoid spikes',
    enabled: true
  }
};
```

### Bước 8: Cập nhật Editor UI

**File:** `games/templates-v2/index.html`

#### 8.1 Thêm case trong `getConfigFromDOM()`

```javascript
// ✅ Wall-Bird: logoUrl (1 logo cho 2 vị trí: pill +5đ và gameover), storyText, backgroundColor
if (CURRENT_TEMPLATE === 'wall-bird-template') {
    return {
        logoUrl: fragmentLogoUrl,           // Logo trong pill (+5đ) và game over (1 logo cho 2 vị trí)
        storyText: story || 'memeplay',     // Story text ở game over screen
        backgroundColor: mapColor           // Background color (1 trong 3 màu: xanh lá nhạt, xanh blue, hồng nhạt)
    };
}
```

#### 8.2 Thêm case trong Desktop Play Test logic (FIX DESKTOP PLAYTEST RESET)

```javascript
// ✅ Desktop: Send UPDATE_CONFIG after iframe loads (FIX cho desktop playtest reset)
if (currentPlaytestIframe) {
    const config = getConfigFromDOM();
    currentPlaytestIframe.addEventListener('load', () => {
        sendConfigToIframe(currentPlaytestIframe, CURRENT_TEMPLATE, config);
        // Retry after 300ms to ensure game is ready
        setTimeout(() => {
            sendConfigToIframe(currentPlaytestIframe, CURRENT_TEMPLATE, config);
        }, 300);
    });
}
```

### Bước 9: Cập nhật `play-v2.js`

**File:** `scripts/play-v2.js`

#### 9.1 Thêm template ID constant

```javascript
const WALL_BIRD_TEMPLATE_ID = 'wall-bird-template'
```

#### 9.2 Thêm vào `guessTemplateFromId()`

```javascript
// ✅ Game ID format: playmode-wall-bird-XXX (3 số + 1 chữ cái)
if (gameId.startsWith('playmode-wall-bird-') || gameId.startsWith('wall-bird-')) {
    console.log(`[PLAY MODE V2] 🎯 Detected wall-bird-template from gameId: ${gameId}`)
    return 'wall-bird-template'
}
```

#### 9.3 Thêm vào `templateIdVariants` và `templateCandidates`

```javascript
const templateIdVariants = {
    // ... existing ...
    'wall-bird-template': ['wall-bird-template', 'wall-bird'],
    'wall-bird': ['wall-bird-template', 'wall-bird']
}

// ✅ Thêm vào templateCandidates (fallback list khi không guess được)
const templateCandidates = [
    // ... existing ...
    'wall-bird-template',
    'wall-bird' // editor variant
]
```

#### 9.4 Thêm vào `normalizeGame()` - Xử lý stories và backgroundColor

```javascript
// ✅ Wall-Bird: Xử lý storyText (từ localStorage) hoặc story_one (từ Supabase)
const isWallBird = normalizedTemplateId === 'wall-bird-template' || templateId === 'wall-bird-template' || templateId === 'wall-bird'
if (isWallBird) {
    const storyText = raw.storyText || raw.story_one || raw.story_text
    if (typeof storyText === 'string' && storyText.trim()) {
        stories = [storyText.trim()]
    }
}

// ✅ Background Color: Chỉ cho wall-bounce-bird, wall-bird-template và blow-bubble
const needsBackgroundColor = ['wall-bounce-bird', 'wall-bird-template', 'blow-bubble'].includes(normalizedTemplateId)
const backgroundColor = needsBackgroundColor 
    ? (raw.backgroundColor || raw.background_color || raw.map_color || mapColor)
    : undefined
```

#### 9.5 Thêm vào `loadGameFromLocalStorage()` - Xử lý storyText

```javascript
// ✅ Wall-Bird: Hỗ trợ storyText, logoUrl, backgroundColor
if (templateId === 'wall-bird-template' || templateId === 'wall-bird') {
    if (config.storyText || config.story) {
        const storyText = config.storyText || config.story || 'memeplay'
        gameData.stories = [storyText]
        if (!gameData.title) {
            gameData.title = config.title || `Wall Bird – ${storyText.slice(0, 24)}`
        }
    }
    // Wall-Bird dùng logoUrl làm fragmentLogoUrl
    if (config.logoUrl && !gameData.fragmentLogoUrl) {
        gameData.fragmentLogoUrl = config.logoUrl
    }
    // Wall-Bird dùng backgroundColor
    if (config.backgroundColor) {
        gameData.backgroundColor = config.backgroundColor
    }
}
```

#### 9.6 Thêm vào `buildUserGameCard` payload

```javascript
} else if (templateId === 'wall-bird-template') {
    payload = {
        type: 'UPDATE_CONFIG',
        config: {
            logoUrl: game.fragmentLogoUrl || '',
            storyText: Array.isArray(game.stories) && game.stories.length > 0 ? game.stories[0] : 'memeplay',
            backgroundColor: game.backgroundColor || game.mapColor || '#87ceeb'
        }
    }
}
```

#### 9.7 Thêm vào `normalizeTemplateId` map (nếu có)

```javascript
const normalizeTemplateId = {
    // ... existing ...
    'wall-bird-template': 'wall-bird-template',
    'wall-bird': 'wall-bird-template'
}
```

#### 9.8 Thêm vào error message cho "Game not found"

```javascript
const isWallBird = gameId.startsWith('playmode-wall-bird-') || gameId.startsWith('wall-bird-')
if (isBlowBubble || isRocketBnb || isSpaceJump || isShooter || isArrow || isDrawRunner || isKnifeFix || isMoon || isWallBird) {
    console.error(`[PLAY MODE] 💡 Tip: Make sure you clicked "Save" button in the template editor to sync this game to Supabase.`)
    console.error(`[PLAY MODE] 💡 If you just created this game, go back to the editor and click "Save" again.`)
    console.error(`[PLAY MODE] 💡 Game ID: ${gameId}`)
    console.error(`[PLAY MODE] 💡 Template ID: ${guessTemplateFromId(gameId)}`)
}
throw new Error(`Game "${gameId}" not found. Please make sure you saved this ${guessTemplateFromId(gameId) === 'wall-bird-template' ? 'Wall Bounce Bird' : 'game'} from the editor.`);
```

#### 9.9 Thêm vào `buildTemplateUrl` (nếu cần)

```javascript
const templateUrls = {
    // ... existing ...
    [WALL_BIRD_TEMPLATE_ID]: `/games/templates-v2/wall-bird-template/index.html?game=${gameId}`
}
```

---

## Phần 4: Common Issues & Fixes

### Issue 1: Desktop Play Test reset config về default

**Nguyên nhân:** Desktop iframe được tạo nhưng không gửi `UPDATE_CONFIG` sau khi load.

**Fix:** Thêm `sendConfigToIframe` call với retry mechanism sau khi iframe load (xem Bước 8.2).

### Issue 2: Mobile game không chơi được (Earth/Moon/Rocket đứng im)

**Nguyên nhân:** 
1. Initialization pattern dùng `async function init()` với `.then()` có thể không reliable trên mobile iframe
2. Có 2 separate `requestAnimationFrame` loops (gameLoop và renderLoop) gây sync issues

**Fix:**
1. Dùng `.then()` chain trực tiếp trong `DOMContentLoaded` (không wrap trong async function)
2. Merge render vào gameLoop (gọi `render()` trực tiếp từ `gameLoop()`)

**Reference:** Xem pattern từ `knife-fix-template` - template này đã test và hoạt động tốt trên mobile.

### Issue 3: "Game not found in catalog" trên mobile

**Nguyên nhân:**
1. Template ID không được nhận diện đúng từ gameId
2. Storage prefix không match
3. Supabase payload structure không đúng
4. `templateIdVariants` và `templateCandidates` thiếu wall-bird-template

**Fix:**
1. Đảm bảo `guessTemplateFromId()` nhận diện đúng `wall-bird-template` từ gameId format `playmode-wall-bird-XXX`
2. Đảm bảo storage prefix `wall_bird_brand_config_` trong `config.js`, `editor-adapter.js`, và `template-registry.js` đều match
3. Dùng shared `syncGameToSupabase` helper (không tự viết logic riêng)
4. Chỉ gửi `p_fragment_logo_url` và `p_story_one` (không gửi `p_logo_url` và `p_story_text` riêng)
5. ✅ **QUAN TRỌNG:** Thêm `wall-bird-template` vào `templateIdVariants` và `templateCandidates` trong `fetchGameFromSupabase()`

### Issue 4: Config không apply trên mobile

**Nguyên nhân:** Config được load nhưng không apply vào game state.

**Fix:**
1. Đảm bảo `loadBrandConfig()` được gọi trong `initGameConfig()` Promise
2. Đảm bảo `applyConfigToGame()` được gọi sau khi load config
3. Đảm bảo `UPDATE_CONFIG` listener hoạt động đúng và update state

### Issue 5: Story và backgroundColor không lưu khi dán link sang tab mới

**Nguyên nhân:**
1. `loadBrandConfig()` return object thay vì boolean → không biết có config hay không
2. Không load từ Supabase khi không có localStorage
3. `normalizeGame()` không xử lý stories cho wall-bird-template
4. `loadGameFromLocalStorage()` không xử lý storyText cho wall-bird-template

**Fix:**
1. ✅ **QUAN TRỌNG:** `loadBrandConfig()` phải return `boolean` (true nếu có config, false nếu không)
2. ✅ Thêm `loadBrandConfigFromSupabase()` trong `game.js` để load từ Supabase khi không có localStorage
3. ✅ Trong `initGameConfig()`, gọi `loadBrandConfigFromSupabase()` nếu `loadBrandConfig()` return false
4. ✅ Thêm xử lý stories cho `wall-bird-template` trong `normalizeGame()` (giống moon, shooter, space-jump)
5. ✅ Thêm xử lý storyText cho `wall-bird-template` trong `loadGameFromLocalStorage()` (giống moon, shooter)
6. ✅ Thêm `wall-bird-template` vào `needsBackgroundColor` check trong `normalizeGame()`

---

## Phần 5: Testing Checklist

### Desktop Testing
- [ ] Editor load được template mới
- [ ] Upload logo → Preview hiển thị đúng
- [ ] Thay đổi story → Preview update
- [ ] Thay đổi background color → Preview update
- [ ] Play Test → Game chạy với config đã set (KHÔNG reset về default)
- [ ] Save → Game được lưu vào localStorage và Supabase
- [ ] Copy link → Link hoạt động khi mở tab mới

### Mobile Testing
- [ ] Game load được trên mobile
- [ ] Game chơi được (bird di chuyển, bounce, etc.)
- [ ] Config apply đúng (background color, logo, story)
- [ ] Game over screen hiển thị đúng logo và story
- [ ] PostMessage hoạt động (GAME_START, GAME_OVER, GAME_SCORE)
- [ ] Link từ editor hoạt động trên mobile (không báo "Game not found")

### Integration Testing
- [ ] Template hiển thị trong template selector
- [ ] Play-v2.js nhận diện được gameId format `playmode-wall-bird-XXX`
- [ ] Game được tìm thấy trong localStorage (key: `wall_bird_brand_config_playmode-wall-bird-XXX`) và Supabase
- [ ] Game card hiển thị đúng trên play mode
- [ ] Message type `UPDATE_CONFIG` hoạt động đúng (editor → game)

---

## Phần 6: Code Quality Checklist

### Code Organization
- [ ] Tách HTML/CSS/JS thành các file riêng
- [ ] Dùng ES6 modules (`type="module"`)
- [ ] Dùng shared utilities từ `core/`

### Config Management
- [ ] Storage prefix `wall_bird_brand_config_` consistent giữa các files (config.js, editor-adapter.js, template-registry.js)
- [ ] Logo: 1 logo (`logoUrl`) dùng cho cả 2 vị trí (pill +5đ và gameover)
- [ ] Background: 3 màu (xanh lá nhạt, xanh blue, hồng nhạt)
- [ ] Support backward compatibility (nhiều field names: `fragmentLogoUrl`/`logoUrl`, `story`/`storyText`, `backgroundColor`/`mapColor`)
- [ ] Default values hợp lý (Sky Blue `#87ceeb` cho background, 'memeplay' cho story)
- [ ] ✅ **QUAN TRỌNG:** `loadBrandConfig()` return `boolean` (true/false) thay vì object
- [ ] ✅ **QUAN TRỌNG:** Có `loadBrandConfigFromSupabase()` trong `game.js` để load từ Supabase khi không có localStorage
- [ ] ✅ **QUAN TRỌNG:** `cleanupOldGameKeys()` truyền `TEMPLATE_ID` thay vì `storagePrefix`

### Editor Integration
- [ ] Extend `BaseAdapter` đúng cách
- [ ] Dùng shared `syncGameToSupabase` helper
- [ ] Error handling đầy đủ

### Game Logic
- [ ] Single game loop (không tách render loop)
- [ ] Initialization pattern phù hợp với mobile
- [ ] PostMessage integration đầy đủ
- [ ] Config loading và application đúng

### Template Registry
- [ ] Đăng ký đầy đủ trong `template-registry.js` với template ID `wall-bird-template`
- [ ] Message types đúng: `WALL_BIRD_GAME_READY`, `WALL_BIRD_GAME_ERROR`, `UPDATE_CONFIG` (generic)
- [ ] UI fields config đúng: `logo` (1 logo cho 2 vị trí), `story`, `mapColor` (3 màu)
- [ ] Storage prefix `wall_bird_brand_config_` match với config.js và editor-adapter.js

### Play Mode Integration
- [ ] `guessTemplateFromId()` nhận diện đúng
- [ ] `buildUserGameCard` payload đúng
- [ ] Error messages helpful
- [ ] ✅ **QUAN TRỌNG:** `normalizeGame()` xử lý stories cho `wall-bird-template` (giống moon, shooter, space-jump)
- [ ] ✅ **QUAN TRỌNG:** `loadGameFromLocalStorage()` xử lý storyText cho `wall-bird-template` (giống moon, shooter)
- [ ] ✅ **QUAN TRỌNG:** `wall-bird-template` có trong `templateIdVariants` và `templateCandidates` trong `fetchGameFromSupabase()`
- [ ] ✅ **QUAN TRỌNG:** `wall-bird-template` có trong `needsBackgroundColor` check trong `normalizeGame()`

---

## Phần 7: References

### Templates để tham khảo

1. **Moon Template** (`games/templates-v2/moon-template/`)
   - ✅ Full integration với template v2
   - ✅ Dùng shared `syncGameToSupabase`
   - ✅ Mobile play fix đã apply
   - ✅ Desktop playtest fix đã apply

2. **Knife Fix Template** (`games/templates-v2/knife-fix-template/`)
   - ✅ Initialization pattern reliable trên mobile
   - ✅ Single game loop pattern
   - ✅ Clean code structure

3. **Shooter Template** (`games/templates-v2/shooter-template/`)
   - ✅ Config structure tương tự (logoUrl, storyText, mapColor)
   - ✅ PostMessage integration

### Files quan trọng

- `games/templates-v2/core/base-adapter.js` - Base class cho editor adapter
- `games/templates-v2/core/supabase-sync.js` - Shared Supabase sync helper
- `games/templates-v2/core/template-registry.js` - Template registry
- `games/templates-v2/core/playtest-manager.js` - Playtest iframe management
- `scripts/play-v2.js` - Play mode game loading

---

## Kết luận

Workflow này dựa trên kinh nghiệm thực tế từ Moon Template migration và các fix đã thực hiện. Tuân thủ các pattern và best practices này sẽ giúp tránh được các lỗi thường gặp và đảm bảo game hoạt động tốt trên cả desktop và mobile.

**Lưu ý cuối cùng:**
- ✅ Luôn test trên mobile thật (không chỉ mobile emulator)
- ✅ Kiểm tra cả desktop playtest và mobile playtest
- ✅ Đảm bảo config apply đúng sau mỗi thay đổi
- ✅ Kiểm tra PostMessage hoạt động đúng
- ✅ Đảm bảo game được tìm thấy trong play mode

