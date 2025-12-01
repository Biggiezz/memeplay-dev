# 📋 HƯỚNG DẪN ĐỒNG BỘ TEMPLATE TỪ PLAY MODE LÊN HOMEPAGE

## 🎯 MỤC ĐÍCH
Khi tạo template game mới, cần đồng bộ code từ `scripts/play.js` (play mode) lên `scripts/app.js` (homepage) để game hiển thị và hoạt động đúng trên homepage.

---

## ✅ QUY TRÌNH 5 PHẦN (THEO THỨ TỰ)

### **PHẦN 1: THÊM CONSTANTS** (Dễ - 2 dòng)

**Vị trí:** `scripts/app.js` - Line ~35-39 (sau các constants khác)

**Code cần thêm:**
```javascript
const [TEMPLATE_NAME]_TEMPLATE_ID = '[template-id]'
const [TEMPLATE_NAME]_STORAGE_PREFIX = '[template]_config_'
```

**Ví dụ (Blow Bubble):**
```javascript
const BLOW_BUBBLE_TEMPLATE_ID = 'blow-bubble'
const BLOW_BUBBLE_STORAGE_PREFIX = 'blow_bubble_config_'
```

**Lưu ý:**
- `TEMPLATE_ID` phải khớp với `scripts/play.js`
- `STORAGE_PREFIX` dùng cho localStorage key

---

### **PHẦN 2: THÊM LOAD TỪ LOCALSTORAGE** (Dễ - ~30 dòng)

**Vị trí:** `scripts/app.js` - Trong function `loadLocalUserGames()` - Sau block của template trước đó

**Code cần thêm:**
```javascript
if (key.startsWith([TEMPLATE_NAME]_STORAGE_PREFIX) && key.length > [TEMPLATE_NAME]_STORAGE_PREFIX.length) {
  if (key === '[template]_config') continue
  try {
    const gameId = key.replace([TEMPLATE_NAME]_STORAGE_PREFIX, '')
    const config = JSON.parse(localStorage.getItem(key) || '{}')
    if (!config) continue
    const storyText = typeof config.story === 'string' ? config.story : ''
    
    results.push({
      source: 'localStorage',
      templateId: [TEMPLATE_NAME]_TEMPLATE_ID,
      gameId,
      title: storyText ? `[Template Name] – ${storyText.slice(0, 24)}` : '[Template Name] Game',
      creator: '[Template Name]',
      mapColor: config.backgroundColor || config.mapColor || '#[default-color]',
      backgroundColor: config.backgroundColor || config.mapColor || '#[default-color]',
      fragmentLogoUrl: config.fragmentLogoUrl || '',
      mapIndex: 0,
      stories: storyText ? [storyText] : [],
      likes: 0,
      comments: 0,
      plays: 0,
      templateUrl: `${baseUrl}/games/[template-path]/index.html?game=${gameId}`,
      publicUrl: `${baseUrl}/?game=${gameId}`
    })
  } catch (error) {
    console.warn('Failed to parse local [Template Name] game config:', key, error)
  }
  continue
}
```

**Ví dụ (Blow Bubble):**
```javascript
if (key.startsWith(BLOW_BUBBLE_STORAGE_PREFIX) && key.length > BLOW_BUBBLE_STORAGE_PREFIX.length) {
  if (key === 'blow_bubble_config') continue
  try {
    const gameId = key.replace(BLOW_BUBBLE_STORAGE_PREFIX, '')
    const config = JSON.parse(localStorage.getItem(key) || '{}')
    if (!config) continue
    const storyText = typeof config.story === 'string' ? config.story : ''
    
    results.push({
      source: 'localStorage',
      templateId: BLOW_BUBBLE_TEMPLATE_ID,
      gameId,
      title: storyText ? `Blow Bubble – ${storyText.slice(0, 24)}` : 'Blow Bubble Game',
      creator: 'Blow Bubble',
      mapColor: config.backgroundColor || config.mapColor || '#87CEEB',
      backgroundColor: config.backgroundColor || config.mapColor || '#87CEEB',
      fragmentLogoUrl: config.fragmentLogoUrl || '',
      mapIndex: 0,
      stories: storyText ? [storyText] : [],
      likes: 0,
      comments: 0,
      plays: 0,
      templateUrl: `${baseUrl}/games/blow-bubble/index.html?game=${gameId}`,
      publicUrl: `${baseUrl}/?game=${gameId}`
    })
  } catch (error) {
    console.warn('Failed to parse local Blow Bubble game config:', key, error)
  }
  continue
}
```

**Lưu ý:**
- Copy format từ template trước đó (Wall Bounce Bird hoặc Blocks)
- Điều chỉnh `templateUrl` path cho đúng
- Điều chỉnh default color cho đúng

---

### **PHẦN 3: THÊM CACHE FUNCTION** (Dễ - ~15 dòng)

**Vị trí:** `scripts/app.js` - Sau function `cache[PreviousTemplate]BrandConfig()`

**Code cần thêm:**
```javascript
function cache[TemplateName]BrandConfig(game) {
  if (!game?.gameId || !game.gameId.startsWith('[template]-')) return
  try {
    const payload = {
      fragmentLogoUrl: game.fragmentLogoUrl || '',
      story: Array.isArray(game.stories) && game.stories.length > 0
        ? game.stories[0]
        : (typeof game.story === 'string' ? game.story : ''),
      backgroundColor: game.backgroundColor || game.mapColor || '#[default-color]'
    }
    localStorage.setItem(`[template]_config_${game.gameId}`, JSON.stringify(payload))
    console.log(`[cache[TemplateName]BrandConfig] Cached [Template Name] config for ${game.gameId}`)
  } catch (error) {
    console.warn('[cache[TemplateName]BrandConfig] Failed to cache [Template Name] config:', error)
  }
}
```

**Ví dụ (Blow Bubble):**
```javascript
function cacheBlowBubbleBrandConfig(game) {
  if (!game?.gameId || !game.gameId.startsWith('blow-bubble-')) return
  try {
    const payload = {
      fragmentLogoUrl: game.fragmentLogoUrl || '',
      story: Array.isArray(game.stories) && game.stories.length > 0
        ? game.stories[0]
        : (typeof game.story === 'string' ? game.story : ''),
      backgroundColor: game.backgroundColor || game.mapColor || '#87CEEB'
    }
    localStorage.setItem(`${BLOW_BUBBLE_STORAGE_PREFIX}${game.gameId}`, JSON.stringify(payload))
    console.log(`[cacheBlowBubbleBrandConfig] Cached Blow Bubble config for ${game.gameId}`)
  } catch (error) {
    console.warn('[cacheBlowBubbleBrandConfig] Failed to cache Blow Bubble config:', error)
  }
}
```

**Lưu ý:**
- Copy format từ template trước đó
- Điều chỉnh `gameId.startsWith()` cho đúng prefix
- Điều chỉnh default color cho đúng

---

### **PHẦN 4: THÊM FETCH TỪ SUPABASE** (Khó - Nhiều chỗ)

**Vị trí:** `scripts/app.js` - Trong function `fetchSupabaseUserGames()` → `fetchByTemplate()`

#### **4.1. Thêm template check (Line ~952)**
```javascript
const is[TemplateName]Template = templateId === [TEMPLATE_NAME]_TEMPLATE_ID
```

#### **4.2. Thêm vào stories parsing (Line ~963)**
```javascript
if (isBlocksTemplate || isWallBounceBirdTemplate || is[TemplateName]Template) {
  const story = typeof item.story_one === 'string' ? item.story_one.trim() : ''
  if (story) stories.push(story)
}
```

#### **4.3. Thêm vào defaultTemplateUrl (Line ~988)**
```javascript
const defaultTemplateUrl = isBlocksTemplate
  ? `${baseUrl}/games/crypto-blocks/index.html?game=${gameId}`
  : isWallBounceBirdTemplate
  ? `${baseUrl}/games/wall-bounce-bird/index.html?game=${gameId}`
  : is[TemplateName]Template
  ? `${baseUrl}/games/[template-path]/index.html?game=${gameId}`
  : `${baseUrl}/games/templates/pacman-template/index.html?game=${gameId}`
```

#### **4.4. Thêm vào title và creator (Line ~1006)**
```javascript
title: item.title || (isBlocksTemplate ? 'Blocks 8x8 Game' : isWallBounceBirdTemplate ? 'Wall Bounce Bird Game' : is[TemplateName]Template ? '[Template Name] Game' : 'Pacman Game'),
creator: item.creator_name || item.creator_id || item.title || (isBlocksTemplate ? 'Blocks 8x8' : isWallBounceBirdTemplate ? 'Wall Bounce Bird' : is[TemplateName]Template ? '[Template Name]' : 'Creator'),
```

#### **4.5. Thêm vào mapColor (Line ~1008)**
```javascript
mapColor: item.map_color || (isBlocksTemplate ? '#0a0a0a' : isWallBounceBirdTemplate ? '#87ceeb' : is[TemplateName]Template ? '#[default-color]' : '#1a1a2e'),
```

#### **4.6. Thêm backgroundColor (Line ~1020)**
```javascript
if (is[TemplateName]Template) {
  game.backgroundColor = item.map_color || item.background_color || '#[default-color]'
}
```

#### **4.7. Thêm cache call (Line ~1024)**
```javascript
} else if (is[TemplateName]Template) {
  cache[TemplateName]BrandConfig(game)
} else {
```

#### **4.8. Thêm vào Promise.all (Line ~1041)**
```javascript
const [pacmanGames, blocksGames, wallBounceBirdGames, [templateName]Games] = await Promise.all([
  fetchByTemplate(PACMAN_TEMPLATE_ID),
  fetchByTemplate(BLOCKS_TEMPLATE_ID),
  fetchByTemplate(WALL_BOUNCE_BIRD_TEMPLATE_ID),
  fetchByTemplate([TEMPLATE_NAME]_TEMPLATE_ID)
])

return [...pacmanGames, ...blocksGames, ...wallBounceBirdGames, ...[templateName]Games]
```

**Lưu ý:**
- Copy từ template trước đó (Wall Bounce Bird)
- Điều chỉnh tất cả các chỗ có `isWallBounceBirdTemplate` → thêm `|| is[TemplateName]Template`
- Điều chỉnh default color cho đúng

---

### **PHẦN 5: THÊM RENDER VÀ POSTMESSAGE** (Khó - Nhiều chỗ)

**Vị trí:** `scripts/app.js` - Trong function `renderUserGameCard()`

#### **5.1. Thêm game check (Line ~1071)**
```javascript
const is[TemplateName]Game = (game.templateId === [TEMPLATE_NAME]_TEMPLATE_ID) || (game.gameId && game.gameId.startsWith('[template]-'))
```

#### **5.2. Thêm vào data-template-id (Line ~1072)**
```javascript
gameCard.setAttribute('data-template-id', isBlocksGame ? BLOCKS_TEMPLATE_ID : isWallBounceBirdGame ? WALL_BOUNCE_BIRD_TEMPLATE_ID : is[TemplateName]Game ? [TEMPLATE_NAME]_TEMPLATE_ID : (game.templateId || PACMAN_TEMPLATE_ID))
```

#### **5.3. Thêm vào defaultPath (Line ~1093)**
```javascript
const defaultPath = isBlocksGame
  ? `/games/crypto-blocks/index.html?game=${game.gameId}`
  : isWallBounceBirdGame
  ? `/games/wall-bounce-bird/index.html?game=${game.gameId}`
  : is[TemplateName]Game
  ? `/games/[template-path]/index.html?game=${game.gameId}`
  : `/games/templates/pacman-template/index.html?game=${game.gameId}`
```

#### **5.4. Thêm vào title (Line ~1120)**
```javascript
title="${game.title || (isBlocksGame ? 'Blocks 8x8 Game' : isWallBounceBirdGame ? 'Wall Bounce Bird Game' : is[TemplateName]Game ? '[Template Name] Game' : 'Pacman Game')}">
```

#### **5.5. Thêm postMessage config (Line ~1224, sau Wall Bounce Bird block)**
```javascript
// ✅ Send [Template Name] config to iframe (similar to Wall Bounce Bird)
if (is[TemplateName]Game && iframeEl) {
  const [templateName]Payload = {
    type: '[TEMPLATE_NAME]_CONFIG',
    payload: {
      story: (Array.isArray(game.stories) && game.stories.length > 0) ? game.stories[0] : '',
      backgroundColor: game.backgroundColor || game.mapColor || '#[default-color]',
      logoUrl: game.fragmentLogoUrl || '' // ✅ Game file expects logoUrl, not fragmentLogoUrl
    }
  }
  const send[TemplateName]Config = () => {
    try {
      iframeEl.contentWindow?.postMessage([templateName]Payload, '*')
    } catch (err) {
      console.warn('[[Template Name] card] Failed to send config:', err)
    }
  }
  iframeEl.addEventListener('load', () => {
    send[TemplateName]Config()
    setTimeout(send[TemplateName]Config, 300)
  })
}
```

**Ví dụ (Blow Bubble):**
```javascript
// ✅ Send Blow Bubble config to iframe (similar to Wall Bounce Bird)
if (isBlowBubbleGame && iframeEl) {
  const blowBubblePayload = {
    type: 'BLOW_BUBBLE_CONFIG',
    payload: {
      story: (Array.isArray(game.stories) && game.stories.length > 0) ? game.stories[0] : '',
      backgroundColor: game.backgroundColor || game.mapColor || '#87CEEB',
      logoUrl: game.fragmentLogoUrl || ''
    }
  }
  const sendBlowBubbleConfig = () => {
    try {
      iframeEl.contentWindow?.postMessage(blowBubblePayload, '*')
    } catch (err) {
      console.warn('[Blow Bubble card] Failed to send config:', err)
    }
  }
  iframeEl.addEventListener('load', () => {
    sendBlowBubbleConfig()
    setTimeout(sendBlowBubbleConfig, 300)
  })
}
```

**Lưu ý:**
- `type` phải khớp với message type trong game file (ví dụ: `BLOW_BUBBLE_CONFIG`)
- `logoUrl` (không phải `fragmentLogoUrl`) - game file expect `logoUrl`
- Copy format từ Wall Bounce Bird block

---

## 🧪 QUY TRÌNH TEST

### **Bước 1: Test 3 phần dễ trước**
1. Thêm Phần 1, 2, 3
2. Tạo test game trong localStorage:
```javascript
const testGameId = '[template]-test-123'
const testConfig = {
  story: 'Test Game',
  backgroundColor: '#[default-color]',
  fragmentLogoUrl: ''
}
localStorage.setItem(`[template]_config_${testGameId}`, JSON.stringify(testConfig))
```
3. Reload trang
4. Kiểm tra game có xuất hiện không

### **Bước 2: Test 2 phần khó sau**
1. Thêm Phần 4, 5
2. Reload trang
3. Kiểm tra Console có lỗi không
4. Kiểm tra games từ Supabase có load không
5. Kiểm tra postMessage có gửi config không

---

## 📝 CHECKLIST CHO TEMPLATE MỚI

- [ ] **Phần 1:** Thêm constants (TEMPLATE_ID, STORAGE_PREFIX)
- [ ] **Phần 2:** Thêm load từ localStorage block
- [ ] **Phần 3:** Thêm cache function
- [ ] **Phần 4:** Thêm fetch từ Supabase (8 chỗ)
  - [ ] Template check
  - [ ] Stories parsing
  - [ ] defaultTemplateUrl
  - [ ] Title và creator
  - [ ] mapColor
  - [ ] backgroundColor
  - [ ] Cache call
  - [ ] Promise.all
- [ ] **Phần 5:** Thêm render và postMessage (5 chỗ)
  - [ ] Game check
  - [ ] data-template-id
  - [ ] defaultPath
  - [ ] Title
  - [ ] postMessage config

---

## 🔍 SO SÁNH VỚI TEMPLATE KHÁC

Khi làm template mới, **LUÔN** so sánh với template đã làm trước đó:
- **Blow Bubble** → Copy từ **Wall Bounce Bird**
- **Wall Bounce Bird** → Copy từ **Blocks**
- **Blocks** → Copy từ **Pacman**

**Nguyên tắc:** Copy format, thay tên và path.

---

## ⚠️ LƯU Ý QUAN TRỌNG

1. **Thứ tự làm:** Làm 3 phần dễ trước → Test → Làm 2 phần khó sau
2. **Backup code:** Luôn backup `app.js` trước khi sửa
3. **Test từng phần:** Test sau mỗi phần để tránh lỗi tích tụ
4. **So sánh với play.js:** Đảm bảo constants, paths, message types khớp với `scripts/play.js`
5. **Default color:** Điều chỉnh màu mặc định cho đúng với template
6. **postMessage type:** Phải khớp với message type trong game file

---

## 📚 TÀI LIỆU THAM KHẢO

- **Blow Bubble sync:** Đã làm thành công (12/2024)
- **Wall Bounce Bird sync:** Đã làm thành công (12/2024)
- **Blocks sync:** Đã làm thành công (12/2024)

---

## 🎯 KẾT LUẬN

Quy trình này **BẮT BUỘC** phải làm cho mọi template mới để đảm bảo:
- ✅ Games từ localStorage hiển thị trên homepage
- ✅ Games từ Supabase hiển thị trên homepage
- ✅ Config được gửi qua postMessage khi iframe load
- ✅ Games hoạt động đúng trên homepage

**Lưu ý:** File này sẽ được cập nhật khi có template mới.

