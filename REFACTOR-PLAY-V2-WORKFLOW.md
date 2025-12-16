# 🔄 Workflow Refactor play-v2.js để dùng Registry Pattern

## 📊 Phân Tích: Cách Pacman Dùng Registry

### **1. Trong Editor (`games/templates-v2/index.html`)**

```javascript
// ✅ Import registry functions
import { 
  getTemplateConfig,
  getPlaytestKey,
  getPlaytestGameId,
  getTemplateUrl,
  getEnabledTemplates,
  loadAdapter
} from './core/template-registry.js';

// ✅ Lấy config từ registry (không hardcode)
let CURRENT_TEMPLATE = 'pacman';
const templateConfig = getTemplateConfig(CURRENT_TEMPLATE);
const PLAYTEST_STORAGE_KEY = getPlaytestKey(CURRENT_TEMPLATE);
const PLAYTEST_GAME_ID = getPlaytestGameId(CURRENT_TEMPLATE);

// ✅ Populate template selector từ registry
const enabledTemplates = getEnabledTemplates();
enabledTemplates.forEach(template => {
  // Tạo option cho mỗi template
});

// ✅ Load adapter động từ registry
const AdapterClass = await loadAdapter(newTemplateId);
adapter = new AdapterClass({...});
```

**Kết quả**: Editor tự động hỗ trợ mọi template có trong registry, không cần sửa code.

---

### **2. Trong play-v2.js (HIỆN TẠI - Hardcode)**

```javascript
// ❌ Hardcode constants
const PACMAN_TEMPLATE_ID = 'pacman-template'
const BLOCKS_TEMPLATE_ID = 'blocks-8x8'
const PIXEL_SHOOTER_TEMPLATE_ID = 'pixel-shooter-template' // Chưa có!

// ❌ Hardcode trong guessTemplateFromId()
if (gameId.startsWith('playmode-pacman-')) return PACMAN_TEMPLATE_ID
if (gameId.startsWith('playmode-blocks-')) return BLOCKS_TEMPLATE_ID
// ❌ Thiếu pixel-shooter!

// ❌ Hardcode trong loadGameFromLocalStorage()
if (gameId.startsWith('playmode-pacman-')) {
  const raw = localStorage.getItem(`${PACMAN_STORAGE_PREFIX}${gameId}`)
  // ...
}
// ❌ Thiếu pixel-shooter!

// ❌ Hardcode trong buildUserGameCard()
const isBlocks = game.templateId === BLOCKS_TEMPLATE_ID
const isPacman = game.templateId === PACMAN_TEMPLATE_ID
// ❌ Thiếu pixel-shooter!
```

**Vấn đề**: Mỗi template mới cần sửa 7-8 chỗ trong code.

---

## 🎯 Workflow Refactor

### **Bước 1: Import Registry vào play-v2.js**

```javascript
import { 
  getTemplateConfig,
  TEMPLATE_REGISTRY,
  getTemplateUrl
} from '../games/templates-v2/core/template-registry.js';
```

### **Bước 2: Tạo Helper Functions**

#### **2.1. `guessTemplateFromId()` - Dùng Registry**

**Hiện tại (Hardcode)**:
```javascript
function guessTemplateFromId(gameId) {
  if (gameId.startsWith('playmode-pacman-')) return PACMAN_TEMPLATE_ID
  if (gameId.startsWith('playmode-blocks-')) return BLOCKS_TEMPLATE_ID
  // ...
}
```

**Sau khi refactor (Dùng Registry)**:
```javascript
function guessTemplateFromId(gameId) {
  if (!gameId) return null
  
  // Loop qua tất cả templates trong registry
  for (const [templateId, config] of Object.entries(TEMPLATE_REGISTRY)) {
    if (!config.enabled) continue
    
    // Check gameId pattern: playmode-{template-id}-XXX hoặc {template-id}-XXX
    const patterns = [
      `playmode-${templateId}-`,
      `${templateId}-`
    ]
    
    for (const pattern of patterns) {
      if (gameId.startsWith(pattern)) {
        return templateId
      }
    }
  }
  
  return null
}
```

#### **2.2. `getStoragePrefix()` - Helper mới**

```javascript
function getStoragePrefix(templateId) {
  const config = getTemplateConfig(templateId)
  return config?.storagePrefix || null
}
```

#### **2.3. `loadGameFromLocalStorage()` - Dùng Registry**

**Hiện tại (Hardcode)**:
```javascript
function loadGameFromLocalStorage(gameId) {
  if (gameId.startsWith('playmode-pacman-')) {
    const raw = localStorage.getItem(`${PACMAN_STORAGE_PREFIX}${gameId}`)
    // ...
  }
  if (gameId.startsWith('playmode-blocks-')) {
    // ...
  }
}
```

**Sau khi refactor (Dùng Registry)**:
```javascript
function loadGameFromLocalStorage(gameId) {
  if (!gameId) return null
  
  // 1. Guess template từ gameId
  const templateId = guessTemplateFromId(gameId)
  if (!templateId) return null
  
  // 2. Lấy storage prefix từ registry
  const storagePrefix = getStoragePrefix(templateId)
  if (!storagePrefix) return null
  
  // 3. Load từ localStorage
  try {
    const storageKey = `${storagePrefix}${gameId}`
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    
    const config = JSON.parse(raw)
    
    // 4. Normalize game data
    return normalizeGame(templateId, gameId, config, { 
      source: 'local',
      creatorFallback: getTemplateConfig(templateId)?.displayName || 'Creator'
    })
  } catch (error) {
    console.warn('[PLAY MODE] Failed to read local game config:', error)
    return null
  }
}
```

#### **2.4. `defaultTemplatePath()` - Dùng Registry**

**Hiện tại (Hardcode)**:
```javascript
function defaultTemplatePath(templateId, gameId) {
  if (templateId === BLOCKS_TEMPLATE_ID) return `/games/crypto-blocks/index.html?game=${gameId}`
  if (templateId === WALL_BOUNCE_BIRD_TEMPLATE_ID) return `/games/wall-bounce-bird/index.html?game=${gameId}`
  // ...
}
```

**Sau khi refactor (Dùng Registry)**:
```javascript
function defaultTemplatePath(templateId, gameId) {
  // 1. Lấy templateUrl từ registry
  const templateUrl = getTemplateUrl(templateId, gameId)
  if (templateUrl) return templateUrl
  
  // 2. Fallback: Build từ templateId pattern
  // Templates-v2: /games/templates-v2/{template-id}-template/index.html
  if (templateId.includes('-template') || TEMPLATE_REGISTRY[templateId]) {
    return `/games/templates-v2/${templateId}-template/index.html?game=${gameId}`
  }
  
  // 3. Legacy templates (blocks, wall-bounce-bird, blow-bubble)
  const legacyPaths = {
    'blocks-8x8': `/games/crypto-blocks/index.html?game=${gameId}`,
    'wall-bounce-bird': `/games/wall-bounce-bird/index.html?game=${gameId}`,
    'blow-bubble': `/games/blow-bubble/index.html?game=${gameId}`
  }
  
  return legacyPaths[templateId] || `/games/templates-v2/pacman-template/index.html?game=${gameId}`
}
```

#### **2.5. `normalizeGame()` - Dùng Registry**

**Hiện tại (Hardcode)**:
```javascript
function normalizeGame(templateId, gameId, raw = {}, options = {}) {
  const isBlocks = templateId === BLOCKS_TEMPLATE_ID
  const isWall = templateId === WALL_BOUNCE_BIRD_TEMPLATE_ID
  // ...
  
  const templateName = isBlocks ? 'Blocks 8x8' : isWall ? 'Wall Bounce Bird' : 'Pacman'
}
```

**Sau khi refactor (Dùng Registry)**:
```javascript
function normalizeGame(templateId, gameId, raw = {}, options = {}) {
  const config = getTemplateConfig(templateId)
  const templateName = config?.displayName || templateId
  
  // Stories: Tất cả templates-v2 dùng stories array
  let stories = []
  if (Array.isArray(raw.stories)) {
    stories = raw.stories
  } else if (typeof raw.stories === 'string') {
    try {
      const parsed = JSON.parse(raw.stories)
      if (Array.isArray(parsed)) stories = parsed
    } catch (_) {}
  }
  if (!stories.length) {
    const legacy = [raw.story_one, raw.story_two, raw.story_three].filter(
      (s) => typeof s === 'string' && s.trim() !== ''
    )
    stories = legacy
  }
  
  // Map Color: Lấy từ config hoặc default
  const defaultMapColor = config?.uiFields?.mapColor?.colors?.[0]?.value || '#1a1a2e'
  const mapColor = raw.mapColor || raw.map_color || defaultMapColor
  
  // Background Color: Chỉ cho wall-bounce-bird và blow-bubble
  const needsBackgroundColor = ['wall-bounce-bird', 'blow-bubble'].includes(templateId)
  const backgroundColor = needsBackgroundColor 
    ? (raw.backgroundColor || raw.background_color || raw.map_color || mapColor)
    : undefined
  
  // Title
  const title = raw.title || `${templateName} Game`
  
  // Creator
  const creator = raw.creator_id || raw.creator_name || raw.creator || 
    (options.source === 'local' ? options.creatorFallback : 'Creator')
  
  // Counts
  const likes = raw.likes_count ?? raw.likes ?? 0
  const comments = raw.comments_count ?? raw.comments ?? 0
  const plays = raw.plays_count ?? raw.plays ?? 0
  
  const fragmentLogoUrl = raw.fragmentLogoUrl || raw.fragment_logo_url || ''
  const templateUrl = buildTemplateUrl(templateId, gameId, raw.templateUrl || raw.template_url)
  
  return {
    gameId,
    templateId,
    title,
    creator,
    likes,
    comments,
    plays,
    stories,
    mapColor,
    backgroundColor,
    fragmentLogoUrl,
    templateUrl
  }
}
```

#### **2.6. `buildUserGameCard()` - Hỗ trợ Pixel Shooter**

**Hiện tại (Hardcode)**:
```javascript
function buildUserGameCard(game) {
  const isBlocks = game.templateId === BLOCKS_TEMPLATE_ID
  const isPacman = game.templateId === PACMAN_TEMPLATE_ID
  // ...
  
  // PostMessage config cho từng template
  if (isBlocks) {
    iframe.contentWindow?.postMessage({
      type: 'CRYPTO_BLOCKS_CONFIG',
      payload: {...}
    }, '*')
  }
  // ❌ Thiếu pixel-shooter!
}
```

**Sau khi refactor (Dùng Registry)**:
```javascript
function buildUserGameCard(game) {
  const templateId = game.templateId
  const config = getTemplateConfig(templateId)
  
  // ... tạo card HTML ...
  
  // PostMessage config: Chỉ cho legacy templates (blocks, wall, bubble)
  // Templates-v2 (pacman, pixel-shooter) dùng UPDATE_CONFIG listener
  const legacyTemplates = ['blocks-8x8', 'wall-bounce-bird', 'blow-bubble']
  const needsPostMessage = legacyTemplates.includes(templateId)
  
  if (needsPostMessage && iframe) {
    const messageTypes = {
      'blocks-8x8': 'CRYPTO_BLOCKS_CONFIG',
      'wall-bounce-bird': 'WALL_BOUNCE_BIRD_CONFIG',
      'blow-bubble': 'BLOW_BUBBLE_CONFIG'
    }
    
    const payload = {
      type: messageTypes[templateId],
      payload: {
        story: Array.isArray(game.stories) && game.stories.length > 0 ? game.stories[0] : '',
        mapColor: game.mapColor || game.backgroundColor || '#1a1a2e',
        logoUrl: game.fragmentLogoUrl || ''
      }
    }
    
    const sendConfig = () => {
      try {
        iframe.contentWindow?.postMessage(payload, '*')
      } catch (err) {
        console.warn(`[PLAY MODE] ${templateId} config postMessage failed:`, err)
      }
    }
    
    iframe.addEventListener('load', () => {
      sendConfig()
      setTimeout(sendConfig, 300)
    })
  }
  
  // ✅ Templates-v2 (pacman, pixel-shooter) KHÔNG cần postMessage
  // Vì chúng đã có UPDATE_CONFIG listener trong game.js
}
```

#### **2.7. `fetchGameFromSupabase()` - Dùng Registry**

**Hiện tại (Hardcode)**:
```javascript
async function fetchGameFromSupabase(gameId) {
  const templateCandidates = guessTemplateFromId(gameId)
    ? [guessTemplateFromId(gameId)]
    : [PACMAN_TEMPLATE_ID, BLOCKS_TEMPLATE_ID, WALL_BOUNCE_BIRD_TEMPLATE_ID, BLOW_BUBBLE_TEMPLATE_ID]
  // ...
}
```

**Sau khi refactor (Dùng Registry)**:
```javascript
async function fetchGameFromSupabase(gameId) {
  if (!gameId) return null
  
  // 1. Guess template từ gameId
  const guessedTemplate = guessTemplateFromId(gameId)
  
  // 2. Fallback: Tất cả enabled templates
  const templateCandidates = guessedTemplate
    ? [guessedTemplate]
    : Object.entries(TEMPLATE_REGISTRY)
        .filter(([id, config]) => config.enabled !== false)
        .map(([id]) => id)
  
  for (const templateId of templateCandidates) {
    try {
      // ... fetch từ Supabase ...
      const match = data.find(item => {
        const itemId = item?.game_id || item?.id
        return itemId === gameId
      })
      
      if (match) {
        return normalizeGame(templateId, gameId, match, { 
          source: 'supabase',
          creatorFallback: 'Creator'
        })
      }
    } catch (err) {
      console.error('[PLAY MODE] Supabase fetch error:', err)
    }
  }
  
  return null
}
```

#### **2.8. `updateDocumentTitle()` - Dùng Registry**

**Hiện tại (Hardcode)**:
```javascript
function updateDocumentTitle(card) {
  const templateId = card?.dataset?.templateId
  const templateName = (() => {
    switch (templateId) {
      case PACMAN_TEMPLATE_ID: return 'Pacman'
      case BLOCKS_TEMPLATE_ID: return 'Blocks 8x8'
      // ...
    }
  })()
  document.title = `${templateName} – MemePlay`
}
```

**Sau khi refactor (Dùng Registry)**:
```javascript
function updateDocumentTitle(card) {
  const templateId = card?.dataset?.templateId
  const config = getTemplateConfig(templateId)
  const templateName = config?.displayName || templateId || 'MemePlay'
  document.title = `${templateName} – MemePlay`
}
```

---

## ✅ Checklist Refactor

- [x] **Bước 1**: Import registry vào play-v2.js
- [ ] **Bước 2**: Tạo helper `getStoragePrefix()`
- [ ] **Bước 3**: Refactor `guessTemplateFromId()` - Dùng registry loop
- [ ] **Bước 4**: Refactor `loadGameFromLocalStorage()` - Dùng registry
- [ ] **Bước 5**: Refactor `defaultTemplatePath()` - Dùng `getTemplateUrl()`
- [ ] **Bước 6**: Refactor `normalizeGame()` - Dùng registry config
- [ ] **Bước 7**: Refactor `buildUserGameCard()` - Hỗ trợ pixel-shooter
- [ ] **Bước 8**: Refactor `fetchGameFromSupabase()` - Dùng registry
- [ ] **Bước 9**: Refactor `updateDocumentTitle()` - Dùng registry
- [ ] **Bước 10**: Xóa hardcoded constants (PACMAN_TEMPLATE_ID, etc.)
- [ ] **Bước 11**: Test với pixel-shooter link

---

## 🎯 Kết Quả Mong Đợi

Sau khi refactor:
- ✅ **Thêm template mới**: Chỉ cần thêm entry vào `template-registry.js`, không cần sửa `play-v2.js`
- ✅ **Pixel-shooter**: Tự động được hỗ trợ sau khi có trong registry
- ✅ **Maintainability**: Code dễ maintain hơn, ít duplicate logic
- ✅ **Consistency**: Cùng pattern với editor (`index.html`)

