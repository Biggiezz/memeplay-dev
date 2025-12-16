# 🚀 Kế Hoạch Tích Hợp Rocket-BNB Template - Sử Dụng Core Modules

## 📋 Tổng Quan

Document này mô tả chi tiết cách **Rocket-BNB template** sẽ sử dụng các **core modules** có sẵn trong `templates-v2/core/` để tránh duplicate code và đảm bảo consistency.

---

## 🎯 Core Modules Có Sẵn & Cách Sử Dụng

### **1. base-adapter.js** ✅

**Chức năng:**
- Base class cho tất cả editor adapters
- Định nghĩa interface: `load()`, `save()`, `isDirty()`

**Cách Rocket-BNB sử dụng:**

```javascript
// File: rocket-bnb-template/editor/editor-adapter.js
import { BaseAdapter } from '../../core/base-adapter.js';

export class RocketBnbEditorAdapter extends BaseAdapter {
  constructor(options = {}) {
    super(options);  // ✅ Gọi constructor của BaseAdapter
    this.lastSavedGameId = null;
    this.dirty = true;
    this.editorElements = options.editorElements || {};
  }
  
  async load() {
    // ✅ Implement interface từ BaseAdapter
    return { ok: true };
  }
  
  async save(forcedGameId = null) {
    // ✅ Implement interface từ BaseAdapter
    // Collect config từ UI
    // Generate gameId
    // Save localStorage
    // Sync Supabase
  }
  
  isDirty() {
    // ✅ Implement interface từ BaseAdapter
    // Compare current config với last saved
  }
}
```

**Lợi ích:**
- ✅ Không cần implement base logic
- ✅ Consistent interface với các templates khác
- ✅ Dễ maintain và extend

---

### **2. supabase-client.js** ✅

**Chức năng:**
- Lazy singleton Supabase client
- Tự động cache client để tránh tạo nhiều instances

**Cách Rocket-BNB sử dụng:**

#### **A. Trong Editor Adapter:**
```javascript
// File: rocket-bnb-template/editor/editor-adapter.js
import { getSupabaseClient } from '../../core/supabase-client.js';

export class RocketBnbEditorAdapter extends BaseAdapter {
  async syncToSupabase(gameId, config) {
    // ✅ Dùng core module thay vì tự tạo client
    const supabase = await getSupabaseClient();
    
    if (!supabase) {
      console.error('[RocketBnb] Supabase client unavailable');
      return false;
    }
    
    // Sync config to Supabase
    const { error } = await supabase.rpc('upsert_user_created_game', {
      p_game_id: gameId,
      p_template_id: 'rocket-bnb-template',
      p_config: config
    });
    
    if (error) {
      console.error('[RocketBnb] Failed to sync to Supabase:', error);
      return false;
    }
    
    return true;
  }
}
```

#### **B. Trong Game.js (Supabase Fallback):**
```javascript
// File: rocket-bnb-template/game.js
// ✅ Import constants từ core (không hardcode)
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../core/constants.js';

// ✅ Hoặc dùng getSupabaseClient() nếu muốn lazy load
async function loadBrandConfigFromSupabase(gameId) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  
  // Load config từ Supabase
  const { data, error } = await supabase.rpc('list_user_created_games', {
    p_template_id: 'rocket-bnb-template'
  });
  
  // Find game by gameId
  const game = data?.find(g => g.game_id === gameId);
  if (game && game.config) {
    // Update BRAND_CONFIG
    BRAND_CONFIG = { ...BRAND_CONFIG, ...game.config };
    return true;
  }
  return false;
}
```

**Lợi ích:**
- ✅ Không cần hardcode Supabase URL/Key
- ✅ Tự động cache client (performance)
- ✅ Consistent với các templates khác

---

### **3. storage-manager.js** ✅

**Chức năng:**
- Wrapper around localStorage với JSON helpers
- Safe fallbacks (không crash khi localStorage unavailable)
- Cleanup old game keys

**Cách Rocket-BNB sử dụng:**

#### **A. Trong Editor Adapter:**
```javascript
// File: rocket-bnb-template/editor/editor-adapter.js
import { setJSON, getJSON } from '../../core/storage-manager.js';
import { cleanupOldGameKeys } from '../../core/storage-manager.js';

export class RocketBnbEditorAdapter extends BaseAdapter {
  async save(forcedGameId = null) {
    const gameId = forcedGameId || this.generateGameId();
    const config = {
      story: storyInput.value,
      logoUrl: logoPreview.src,
      // ...
    };
    
    // ✅ Cleanup old keys trước khi save
    cleanupOldGameKeys('rocket-bnb-template', 1);
    
    // ✅ Dùng core module thay vì localStorage trực tiếp
    const storageKey = `rocket_bnb_brand_config_${gameId}`;
    setJSON(storageKey, config);
    
    // Sync to Supabase
    await this.syncToSupabase(gameId, config);
  }
}
```

#### **B. Trong Config.js:**
```javascript
// File: rocket-bnb-template/config.js
import { getJSON } from '../core/storage-manager.js';

function loadBrandConfig(gameIdOverride = null) {
  const gameId = gameIdOverride || getGameId();
  const storageKey = gameId 
    ? `rocket_bnb_brand_config_${gameId}` 
    : 'rocket_bnb_brand_config_playtest';
  
  // ✅ Dùng core module thay vì localStorage trực tiếp
  const saved = getJSON(storageKey, null);
  
  if (saved) {
    BRAND_CONFIG = { ...BRAND_CONFIG, ...saved };
    return true;
  }
  return false;
}
```

**Lợi ích:**
- ✅ Safe fallbacks (không crash khi localStorage unavailable)
- ✅ Auto JSON parse/stringify
- ✅ Cleanup old keys tự động

---

### **4. url-builder.js** ✅

**Chức năng:**
- Build public link URL cho templates
- Auto-detect local vs production
- Format: `{baseUrl}/{gameId}`

**Cách Rocket-BNB sử dụng:**

```javascript
// File: rocket-bnb-template/editor/editor-adapter.js
import { buildPublicLinkUrl } from '../../core/url-builder.js';

export class RocketBnbEditorAdapter extends BaseAdapter {
  async save(forcedGameId = null) {
    const gameId = forcedGameId || this.generateGameId();
    
    // Save config...
    
    // ✅ Build public link URL
    const publicUrl = buildPublicLinkUrl(gameId, {
      forceProduction: false  // Auto-detect local vs production
    });
    
    // Return URL cho editor UI
    return {
      gameId,
      publicUrl,
      ok: true
    };
  }
}
```

**Lợi ích:**
- ✅ Không cần hardcode URLs
- ✅ Auto-detect local vs production
- ✅ Consistent URL format

---

### **5. constants.js** ✅

**Chức năng:**
- Centralized constants (Supabase URL/Key, Production URL, Template IDs)

**Cách Rocket-BNB sử dụng:**

```javascript
// File: rocket-bnb-template/game.js
import { SUPABASE_URL, SUPABASE_ANON_KEY, PRODUCTION_BASE_URL } from '../core/constants.js';

// ✅ Dùng constants thay vì hardcode
const TEMPLATE_ID = 'rocket-bnb-template';

async function loadBrandConfigFromSupabase(gameId) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  // ...
}
```

**Lợi ích:**
- ✅ Không hardcode constants
- ✅ Dễ update khi constants thay đổi
- ✅ Consistent với các templates khác

---

### **6. template-registry.js** ✅

**Chức năng:**
- Centralized registry cho tất cả templates
- Helper functions: `getTemplateConfig()`, `loadAdapter()`, etc.

**Cách Rocket-BNB sử dụng:**

#### **A. Thêm Entry Vào Registry:**
```javascript
// File: core/template-registry.js
export const TEMPLATE_REGISTRY = {
  // ... existing templates ...
  
  'rocket-bnb': {  // ✅ Registry ID (ngắn gọn)
    adapterPath: '../rocket-bnb-template/editor/editor-adapter.js',
    adapterName: 'RocketBnbEditorAdapter',
    playtestKey: 'rocket_bnb_brand_config_playtest',
    playtestGameId: 'playtest-rocket-bnb',
    storagePrefix: 'rocket_bnb_brand_config_',
    templateUrl: '/games/templates-v2/rocket-bnb-template/index.html',
    messageTypes: {
      READY: 'ROCKET_BNB_GAME_READY',
      ERROR: 'ROCKET_BNB_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: {
      story: { enabled: true, inputId: 'storyInput', maxLength: 100 },
      logo: { enabled: true, inputId: 'logoInput', previewId: 'logoPreview' }
    },
    displayName: 'Rocket BNB',
    description: 'Rocket flying game with obstacles',
    enabled: true
  }
};
```

#### **B. Editor UI Sử Dụng Registry:**
```javascript
// File: templates-v2/index.html (editor UI)
import { getTemplateConfig, loadAdapter } from './core/template-registry.js';

// Load adapter cho rocket-bnb
const config = getTemplateConfig('rocket-bnb');
const AdapterClass = await loadAdapter('rocket-bnb');
const adapter = new AdapterClass({ editorElements: {...} });
```

#### **C. play-v2.js Sử Dụng Registry:**
```javascript
// File: scripts/play-v2.js
import { getTemplateConfig, getTemplateUrl } from '../games/templates-v2/core/template-registry.js';

// Load game từ registry
const config = getTemplateConfig('rocket-bnb');
const gameUrl = getTemplateUrl('rocket-bnb', gameId);
```

**Lợi ích:**
- ✅ Single source of truth
- ✅ Tự động hỗ trợ template mới (không cần sửa code editor/play-v2.js)
- ✅ Type-safe với helper functions

---

### **7. playtest-manager.js** ✅

**Chức năng:**
- Quản lý playtest config (load/save playtest state)

**Cách Rocket-BNB sử dụng:**

```javascript
// File: rocket-bnb-template/editor/editor-adapter.js
import { savePlaytestConfig, loadPlaytestConfig } from '../../core/playtest-manager.js';

export class RocketBnbEditorAdapter extends BaseAdapter {
  async save(forcedGameId = null) {
    // Save normal game...
    
    // ✅ Save playtest config (cho editor preview)
    if (!forcedGameId) {
      await savePlaytestConfig('rocket-bnb', config);
    }
  }
  
  async load() {
    // ✅ Load playtest config
    const playtestConfig = await loadPlaytestConfig('rocket-bnb');
    if (playtestConfig) {
      // Update UI với playtest config
      return { ok: true, config: playtestConfig };
    }
    return { ok: true };
  }
}
```

**Lợi ích:**
- ✅ Consistent playtest behavior
- ✅ Không cần implement playtest logic riêng

---

### **8. image-optimizer.js** ✅

**Chức năng:**
- Optimize images trước khi upload (resize, compress)

**Cách Rocket-BNB sử dụng:**

```javascript
// File: rocket-bnb-template/editor/editor-adapter.js
import { optimizeImage } from '../../core/image-optimizer.js';

export class RocketBnbEditorAdapter extends BaseAdapter {
  async handleLogoUpload(file) {
    // ✅ Optimize image trước khi save
    const optimized = await optimizeImage(file, {
      maxWidth: 256,
      maxHeight: 256,
      quality: 0.8
    });
    
    // Convert to data URL
    const logoUrl = await fileToDataURL(optimized);
    
    // Save config với optimized logo
    // ...
  }
}
```

**Lợi ích:**
- ✅ Auto-optimize images (performance)
- ✅ Consistent image handling

---

## 📊 So Sánh: Code Riêng vs Code Chung

### **❌ Nếu KHÔNG dùng Core Modules (Bad):**

```javascript
// ❌ BAD: Hardcode Supabase
const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

// ❌ BAD: Tự tạo Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ❌ BAD: localStorage trực tiếp (không safe)
localStorage.setItem(key, JSON.stringify(config));

// ❌ BAD: Hardcode URL
const publicUrl = `https://memeplay.dev/${gameId}`;
```

**Vấn đề:**
- ❌ Duplicate code
- ❌ Khó maintain (phải update nhiều chỗ)
- ❌ Không consistent
- ❌ Dễ lỗi (không có safe fallbacks)

---

### **✅ Nếu DÙNG Core Modules (Good):**

```javascript
// ✅ GOOD: Import từ core
import { getSupabaseClient } from '../../core/supabase-client.js';
import { setJSON } from '../../core/storage-manager.js';
import { buildPublicLinkUrl } from '../../core/url-builder.js';

// ✅ GOOD: Dùng core modules
const supabase = await getSupabaseClient();
setJSON(storageKey, config);
const publicUrl = buildPublicLinkUrl(gameId);
```

**Lợi ích:**
- ✅ Không duplicate code
- ✅ Dễ maintain (update 1 chỗ)
- ✅ Consistent với templates khác
- ✅ Safe fallbacks tự động

---

## 🔄 Flow Diagram: Rocket-BNB Template Sử Dụng Core Modules

```
┌─────────────────────────────────────────────────────────────┐
│ Editor UI (templates-v2/index.html)                        │
│                                                             │
│ 1. Load template từ registry                                │
│    → getTemplateConfig('rocket-bnb')                        │
│    → loadAdapter('rocket-bnb')                              │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ RocketBnbEditorAdapter (editor/editor-adapter.js)          │
│                                                             │
│ 2. save()                                                  │
│    → cleanupOldGameKeys() [storage-manager]               │
│    → setJSON() [storage-manager]                           │
│    → getSupabaseClient() [supabase-client]                 │
│    → syncToSupabase()                                      │
│    → buildPublicLinkUrl() [url-builder]                    │
│                                                             │
│ 3. load()                                                  │
│    → loadPlaytestConfig() [playtest-manager]               │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ Game View (rocket-bnb-template/index.html)                 │
│                                                             │
│ 4. Load config.js                                           │
│    → getJSON() [storage-manager]                           │
│    → loadBrandConfig()                                      │
│                                                             │
│ 5. Load game.js                                             │
│    → SUPABASE_URL, SUPABASE_ANON_KEY [constants]          │
│    → loadBrandConfigFromSupabase()                         │
│    → Gửi READY signal                                      │
│    → Listen UPDATE_CONFIG                                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ play-v2.js (Public Play Mode)                              │
│                                                             │
│ 6. Load game từ URL                                         │
│    → getTemplateConfig('rocket-bnb') [template-registry]   │
│    → getTemplateUrl('rocket-bnb', gameId) [template-registry]│
│    → Load config từ localStorage hoặc Supabase             │
└─────────────────────────────────────────────────────────────┘
```

---

## 📝 Checklist: Core Modules Rocket-BNB Cần Dùng

### **Editor Adapter (`editor/editor-adapter.js`):**
- [x] `BaseAdapter` - Extend base class
- [x] `getSupabaseClient()` - Sync config to Supabase
- [x] `setJSON()` / `getJSON()` - Save/load localStorage
- [x] `cleanupOldGameKeys()` - Cleanup old configs
- [x] `buildPublicLinkUrl()` - Build public link
- [x] `savePlaytestConfig()` / `loadPlaytestConfig()` - Playtest support

### **Config.js (`config.js`):**
- [x] `getJSON()` - Load config từ localStorage
- [x] `SUPABASE_URL`, `SUPABASE_ANON_KEY` - Supabase constants

### **Game.js (`game.js`):**
- [x] `SUPABASE_URL`, `SUPABASE_ANON_KEY` - Supabase fallback
- [x] `getGameId()` - Get gameId từ URL (có thể tự implement hoặc dùng helper)

### **Template Registry (`core/template-registry.js`):**
- [x] Thêm entry `'rocket-bnb'` - Registry config

---

## 🎯 Tóm Tắt: Code Chung vs Code Riêng

### **Code CHUNG (Dùng Core Modules):**
```
✅ Supabase client
✅ localStorage helpers
✅ URL building
✅ Constants (URLs, keys)
✅ Template registry
✅ Playtest management
✅ Image optimization
```

### **Code RIÊNG (Rocket-BNB Specific):**
```
✅ Game logic (rocket, rocks, coins, collision)
✅ Editor adapter implementation (save/load logic)
✅ Config structure (BRAND_CONFIG fields)
✅ UI fields (story, logo - không có mapColor)
✅ Message types (ROCKET_BNB_GAME_READY, etc.)
```

---

## ✅ Kết Luận

**Rocket-BNB template sẽ:**
1. ✅ **Extend BaseAdapter** - Không implement base logic
2. ✅ **Dùng getSupabaseClient()** - Không hardcode Supabase
3. ✅ **Dùng storage-manager** - Không dùng localStorage trực tiếp
4. ✅ **Dùng url-builder** - Không hardcode URLs
5. ✅ **Dùng constants** - Không hardcode constants
6. ✅ **Thêm vào registry** - Single source of truth

**Kết quả:**
- ✅ Không duplicate code
- ✅ Consistent với templates khác
- ✅ Dễ maintain
- ✅ Safe fallbacks tự động


