# 📋 Homepage V3 - Workflow Làm Việc

> **Last Updated:** 2024-12-25  
> **Status:** Đã xóa code cũ, bắt đầu viết lại từ đầu

---

## 🎯 Mục Tiêu

Tạo Homepage V3 với:
- ✅ CSS giống 100% production (không đổi kích thước khi zoom)
- ✅ Load game 0 (nhiều like nhất) < 1s
- ✅ Scroll mượt, load games tiếp theo
- ✅ Social interactions (like, comment, share, leaderboard)

---

## 📝 Workflow - Từng Bước

### **PHASE 1: Fix CSS Zoom Issue** 🎨

#### **Step 1.1: So sánh CSS Production vs V3**
**Mục tiêu:** Đảm bảo CSS V3 giống 100% production

**Tasks:**
- [ ] Đọc CSS production (index.html) - `.game-card`, `.game-stage`, `.game-footer`
- [ ] Đọc CSS V3 (index-v3.html) - so sánh từng rule
- [ ] Ghi chú các điểm khác biệt
- [ ] Copy chính xác CSS từ production sang V3

**Test:**
- [ ] Desktop (min-width: 1024px):
  - [ ] `.game-card` có `width: 720px !important` không?
  - [ ] `.game-stage` có `flex: 1 !important` không?
  - [ ] `.game-footer` có `flex-shrink: 0 !important` không?
- [ ] Mobile (< 1024px):
  - [ ] `.game-card` có `width: min(calc(100vw - 8px), 720px)` không?
  - [ ] Base styles KHÔNG có `!important` không?

**Kết quả mong đợi:**
- CSS V3 giống 100% production
- Không có `transform: scale()` trong CSS
- Base styles không có `!important`
- Desktop media query có `!important`

---

#### **Step 1.2: Test CSS Zoom**
**Mục tiêu:** Đảm bảo kích thước không đổi khi zoom

**Tasks:**
- [ ] Test trên Desktop (min-width: 1024px)
- [ ] Test trên Mobile (< 1024px)
- [ ] So sánh với Production

**Test Checklist:**
- [ ] **Desktop Test:**
  - [ ] Zoom in (Ctrl +) → Game card vẫn 720px, không scale
  - [ ] Zoom out (Ctrl -) → Game card vẫn 720px, không scale
  - [ ] Zoom 50%, 75%, 100%, 125%, 150% → Game card vẫn 720px
  - [ ] Game stage không đổi kích thước
  - [ ] Footer không đổi kích thước
  - [ ] Iframe không bị scale
- [ ] **Mobile Test:**
  - [ ] Zoom in/out → Game card responsive nhưng không scale
  - [ ] Footer không đổi kích thước
- [ ] **So sánh với Production:**
  - [ ] Test cùng zoom level trên production và V3
  - [ ] Kích thước phải giống nhau
  - [ ] Chụp screenshot so sánh

**Kết quả mong đợi:**
- ✅ Kích thước game card, stage, footer không đổi khi zoom
- ✅ Giống 100% production

**Nếu FAIL:**
- Kiểm tra DevTools → Elements → Computed styles
- Xem có rules nào từ `style.css` override không
- Fix CSS cho đến khi pass

---

### **PHASE 2: Load Game 0 (Đơn Giản)** 🎮

#### **Step 2.1: Setup Supabase Client**
**Mục tiêu:** Kết nối Supabase để load games

**Tasks:**
- [ ] Tạo file `scripts/app-v3.js` mới
- [ ] Import Supabase client
- [ ] Setup config (URL, ANON_KEY)
- [ ] Test connection

**Code Structure:**
```javascript
// scripts/app-v3.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

const SUPABASE_URL = 'https://iikckrcdrvnqctzacxgx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'

let supabaseClient = null

function initSupabaseClient() {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  }
  return supabaseClient
}
```

**Test:**
- [ ] Console: `initSupabaseClient()` → Không có error
- [ ] Console: `supabaseClient` → Có object

**Kết quả mong đợi:**
- ✅ Supabase client khởi tạo thành công
- ✅ Không có errors trong console

---

#### **Step 2.2: Load Game List & Sort by Likes**
**Mục tiêu:** Load danh sách games và sort theo likes DESC

**Tasks:**
- [ ] Tạo function `loadGameListFromSupabase()`
- [ ] Gọi RPC `list_user_created_games` (4 template IDs)
- [ ] Merge tất cả games vào 1 array
- [ ] Sort theo `likes_count` DESC
- [ ] Return game list

**Code Structure:**
```javascript
async function loadGameListFromSupabase() {
  const supabase = initSupabaseClient()
  const templateIds = ['pacman-template', 'blocks-8x8', 'wall-bounce-bird', 'blow-bubble']
  
  const promises = templateIds.map(templateId => 
    supabase.rpc('list_user_created_games', { template_id: templateId })
  )
  
  const results = await Promise.all(promises)
  const allGames = results.flatMap(r => r.data || [])
  
  // Sort by likes_count DESC
  allGames.sort((a, b) => (b.likes_count || 0) - (a.likes_count || 0))
  
  return allGames
}
```

**Test:**
- [ ] Console: `loadGameListFromSupabase()` → Return array games
- [ ] Console: Games được sort đúng (game đầu tiên có likes cao nhất)
- [ ] Console: Có bao nhiêu games? (nên > 0)
- [ ] Console: Không có errors

**Kết quả mong đợi:**
- ✅ Load được danh sách games
- ✅ Games được sort theo likes DESC
- ✅ Game đầu tiên là game có likes cao nhất

---

#### **Step 2.3: Get Game 0 (Nhiều Like Nhất)**
**Mục tiêu:** Lấy game có nhiều like nhất làm Game 0

**Tasks:**
- [ ] Tạo function `getGame0(gameList)`
- [ ] Return game đầu tiên trong sorted list (đã sort ở Step 2.2)

**Code Structure:**
```javascript
function getGame0(gameList) {
  if (!gameList || gameList.length === 0) return null
  return gameList[0] // Game đầu tiên đã là game có likes cao nhất
}
```

**Test:**
- [ ] Console: `getGame0(gameList)` → Return game object
- [ ] Console: Game 0 có `likes_count` cao nhất
- [ ] Console: Game 0 có `id` và `template_id`

**Kết quả mong đợi:**
- ✅ Game 0 là game có likes cao nhất
- ✅ Game 0 có đầy đủ thông tin (id, template_id, likes_count)

---

#### **Step 2.4: Load Game Config (localStorage → Supabase)**
**Mục tiêu:** Load config của game (title, stories, mapColor, etc.)

**Tasks:**
- [ ] Tạo function `loadGameConfig(gameId, templateId)`
- [ ] Check localStorage trước (key: `{template}_brand_config_{gameId}`)
- [ ] Nếu không có, load từ Supabase
- [ ] Return config object

**Code Structure:**
```javascript
async function loadGameConfig(gameId, templateId) {
  // Check localStorage first
  const storageKey = getStorageKey(templateId, gameId)
  const cached = localStorage.getItem(storageKey)
  if (cached) {
    try {
      return JSON.parse(cached)
    } catch (e) {
      console.warn('[V3] Failed to parse cached config:', e)
    }
  }
  
  // Load from Supabase
  const supabase = initSupabaseClient()
  // ... load from Supabase
  return config
}
```

**Test:**
- [ ] Console: `loadGameConfig(gameId, templateId)` → Return config object
- [ ] Console: Config có `title`, `stories`, `mapColor` (nếu có)
- [ ] Console: Load từ localStorage nhanh hơn Supabase

**Kết quả mong đợi:**
- ✅ Load được config từ localStorage hoặc Supabase
- ✅ Config có đầy đủ thông tin cần thiết

---

#### **Step 2.5: Render Game Card HTML**
**Mục tiêu:** Render HTML cho game card

**Tasks:**
- [ ] Tạo function `renderGameCard(game, config)`
- [ ] Tạo HTML structure: `.game-card` > `.game-stage` > `iframe` + `.game-footer`
- [ ] Set game ID, template ID
- [ ] Set iframe src
- [ ] Append vào `.game-container`

**Code Structure:**
```javascript
function renderGameCard(game, config) {
  const container = document.querySelector('.game-container')
  if (!container) return null
  
  const card = document.createElement('div')
  card.className = 'game-card'
  card.id = game.id
  
  // Game stage với iframe
  const stage = document.createElement('div')
  stage.className = 'game-stage'
  
  const iframe = document.createElement('iframe')
  iframe.src = getGameUrl(game.id, game.template_id)
  iframe.loading = 'lazy'
  
  stage.appendChild(iframe)
  
  // Game footer
  const footer = document.createElement('div')
  footer.className = 'game-footer'
  // ... footer content
  
  card.appendChild(stage)
  card.appendChild(footer)
  container.appendChild(card)
  
  return card
}
```

**Test:**
- [ ] Console: `renderGameCard(game, config)` → Return card element
- [ ] Elements: Có `.game-card` trong `.game-container`
- [ ] Elements: Card có `id` = game.id
- [ ] Elements: Card có iframe với src đúng
- [ ] Elements: Card có footer

**Kết quả mong đợi:**
- ✅ Game card được render vào DOM
- ✅ Card có đầy đủ structure (stage, iframe, footer)
- ✅ Iframe src đúng

---

#### **Step 2.6: Load Game 0 (< 1s)**
**Mục tiêu:** Load game 0 trong < 1s

**Tasks:**
- [ ] Tạo function `loadGame0()`
- [ ] Measure load time
- [ ] Load game list → Get game 0 → Load config → Render card
- [ ] Log time: `[V3] Game 0 loaded in Xms`

**Code Structure:**
```javascript
async function loadGame0() {
  const startTime = performance.now()
  
  const gameList = await loadGameListFromSupabase()
  const game0 = getGame0(gameList)
  if (!game0) {
    console.error('[V3] No games found')
    return
  }
  
  const config = await loadGameConfig(game0.id, game0.template_id)
  const card = renderGameCard(game0, config)
  
  const loadTime = performance.now() - startTime
  console.log(`[V3] ✅ Game 0 loaded in ${Math.round(loadTime)}ms`)
  
  if (loadTime > 1000) {
    console.warn(`[V3] ⚠️ Game 0 load time exceeded target: ${Math.round(loadTime)}ms`)
  }
  
  return card
}
```

**Test:**
- [ ] Console: `[V3] ✅ Game 0 loaded in Xms` → X < 1000ms
- [ ] Visual: Game 0 hiển thị trên màn hình
- [ ] Visual: Iframe load game thành công
- [ ] Console: Không có errors

**Kết quả mong đợi:**
- ✅ Game 0 load trong < 1000ms
- ✅ Game 0 hiển thị trên màn hình
- ✅ Iframe load game thành công

**Nếu FAIL:**
- Kiểm tra network tab → Xem requests nào chậm
- Optimize: Cache game list, preload config
- Retry và measure lại

---

### **PHASE 3: Scroll & Load Games Tiếp Theo** 📜

#### **Step 3.1: Load Tất Cả Games (Không Batch)**
**Mục tiêu:** Load tất cả games vào DOM (chưa load iframe)

**Tasks:**
- [ ] Tạo function `loadAllGames()`
- [ ] Load game list (đã có từ Step 2.2)
- [ ] Render tất cả game cards vào DOM (chưa có iframe)
- [ ] Chỉ render HTML structure, chưa load iframe

**Code Structure:**
```javascript
async function loadAllGames() {
  const gameList = await loadGameListFromSupabase()
  const container = document.querySelector('.game-container')
  
  for (const game of gameList) {
    const config = await loadGameConfig(game.id, game.template_id)
    renderGameCard(game, config, { loadIframe: false }) // Chưa load iframe
  }
  
  console.log(`[V3] ✅ Loaded ${gameList.length} game cards into DOM`)
  return gameList
}
```

**Test:**
- [ ] Console: `[V3] ✅ Loaded X game cards into DOM` → X > 0
- [ ] Elements: Có X `.game-card` trong `.game-container`
- [ ] Elements: Cards chưa có iframe (hoặc iframe chưa load)
- [ ] Visual: Có thể scroll xuống thấy nhiều cards

**Kết quả mong đợi:**
- ✅ Tất cả game cards được render vào DOM
- ✅ Có thể scroll xuống thấy nhiều cards
- ✅ Cards chưa load iframe (performance tốt)

---

#### **Step 3.2: Load Iframe Khi Scroll Vào Viewport**
**Mục tiêu:** Load iframe khi game card vào viewport

**Tasks:**
- [ ] Tạo IntersectionObserver
- [ ] Observe tất cả `.game-card`
- [ ] Khi card vào viewport → Load iframe
- [ ] Load iframe với `src` đúng

**Code Structure:**
```javascript
function initScrollObserver() {
  const cards = document.querySelectorAll('.game-card')
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const card = entry.target
        loadCardIframe(card)
        observer.unobserve(card) // Chỉ load 1 lần
      }
    })
  }, {
    root: document.querySelector('.game-container'),
    rootMargin: '100px',
    threshold: 0.1
  })
  
  cards.forEach(card => observer.observe(card))
}

function loadCardIframe(card) {
  const gameId = card.id
  const iframe = card.querySelector('iframe')
  if (!iframe || iframe.src) return // Đã load rồi
  
  const gameUrl = getGameUrl(gameId, card.dataset.templateId)
  iframe.src = gameUrl
  console.log(`[V3] Loaded iframe for ${gameId}`)
}
```

**Test:**
- [ ] Console: `[V3] Loaded iframe for {gameId}` → Khi scroll vào card
- [ ] Visual: Iframe load game khi scroll vào viewport
- [ ] Visual: Scroll mượt, không lag
- [ ] Console: Không có errors

**Kết quả mong đợi:**
- ✅ Iframe chỉ load khi scroll vào viewport
- ✅ Scroll mượt, không lag
- ✅ Games load đúng thứ tự

---

#### **Step 3.3: Test Scroll Performance**
**Mục tiêu:** Đảm bảo scroll mượt, performance tốt

**Tasks:**
- [ ] Test scroll trên Desktop
- [ ] Test scroll trên Mobile
- [ ] Check FPS (nên 60fps)
- [ ] Check memory usage

**Test Checklist:**
- [ ] **Desktop Test:**
  - [ ] Scroll xuống → Mượt, không lag
  - [ ] Scroll lên → Mượt, không lag
  - [ ] FPS ổn định (60fps)
  - [ ] Memory không tăng quá nhiều
- [ ] **Mobile Test:**
  - [ ] Scroll bằng touch → Mượt
  - [ ] Không có jank
- [ ] **Performance:**
  - [ ] Chrome DevTools → Performance tab → Record scroll
  - [ ] Check FPS, memory, CPU usage

**Kết quả mong đợi:**
- ✅ Scroll mượt, 60fps
- ✅ Memory usage ổn định
- ✅ Không có jank

---

### **PHASE 4: Social Interactions** ❤️

#### **Step 4.1: Like Button**
**Mục tiêu:** Like button hoạt động đúng

**Tasks:**
- [ ] Tạo function `bindLikeButton(card, gameId)`
- [ ] Click like → Toggle like state
- [ ] Update localStorage: `mp_like_{gameId}`
- [ ] Update UI: Add class `liked`, change color
- [ ] Call Supabase API để update like count

**Code Structure:**
```javascript
function bindLikeButton(card, gameId) {
  const likeBtn = card.querySelector('[data-role="like"] button')
  if (!likeBtn) return
  
  likeBtn.addEventListener('click', async (e) => {
    e.stopPropagation()
    
    const isLiked = localStorage.getItem(`mp_like_${gameId}`) === 'true'
    const newState = !isLiked
    
    localStorage.setItem(`mp_like_${gameId}`, String(newState))
    updateLikeButtonUI(likeBtn, newState)
    
    // Call Supabase API
    await updateLikeCount(gameId, newState ? 'increment' : 'decrement')
  })
}

function updateLikeButtonUI(button, isLiked) {
  if (isLiked) {
    button.classList.add('liked')
    button.querySelector('svg').style.fill = '#ff4d4d'
  } else {
    button.classList.remove('liked')
    button.querySelector('svg').style.fill = 'none'
  }
}
```

**Test:**
- [ ] Click like → Button toggle (liked/unliked)
- [ ] Click like → Button tô đậm (màu đỏ) khi liked
- [ ] Click like → localStorage có key `mp_like_{gameId}`
- [ ] Click like → Like count tăng/giảm
- [ ] Test trên tất cả games → Tất cả đều hoạt động

**Kết quả mong đợi:**
- ✅ Like button hoạt động trên tất cả games
- ✅ UI update đúng (tô đậm khi liked)
- ✅ Like count update đúng

---

#### **Step 4.2: Comment/Share/Leaderboard Buttons**
**Mục tiêu:** Các buttons khác hoạt động

**Tasks:**
- [ ] Tạo function `bindSocialButtons(card, gameId)`
- [ ] Comment button → Open comments overlay
- [ ] Share button → Open share overlay
- [ ] Leaderboard button → Open leaderboard overlay

**Code Structure:**
```javascript
function bindSocialButtons(card, gameId) {
  // Comment button
  const commentBtn = card.querySelector('[data-role="comment"] button')
  commentBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    openCommentsOverlay(gameId)
  })
  
  // Share button
  const shareBtn = card.querySelector('[data-role="share"] button')
  shareBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    openShareOverlay(gameId)
  })
  
  // Leaderboard button
  const leaderboardBtn = card.querySelector('[data-role="leaderboard"] button')
  leaderboardBtn?.addEventListener('click', (e) => {
    e.stopPropagation()
    openLeaderboardOverlay(gameId)
  })
}
```

**Test:**
- [ ] Click comment → Comments overlay hiện ra
- [ ] Click share → Share overlay hiện ra
- [ ] Click leaderboard → Leaderboard overlay hiện ra
- [ ] Test trên tất cả games → Tất cả đều hoạt động

**Kết quả mong đợi:**
- ✅ Tất cả buttons hoạt động
- ✅ Overlays hiện ra đúng

---

## 📊 Tổng Kết

### **Tổng Số Bước: 15 bước**

1. **PHASE 1 (CSS):** 2 bước
2. **PHASE 2 (Game 0):** 6 bước
3. **PHASE 3 (Scroll):** 3 bước
4. **PHASE 4 (Social):** 2 bước

### **Test Points:**

- **Step 1.2:** Test CSS zoom (CRITICAL)
- **Step 2.6:** Test Game 0 load time < 1s (CRITICAL)
- **Step 3.2:** Test scroll & iframe loading (CRITICAL)
- **Step 3.3:** Test scroll performance (IMPORTANT)
- **Step 4.1:** Test like button (IMPORTANT)
- **Step 4.2:** Test other buttons (NICE TO HAVE)

---

## 🎯 Next Step

**Bắt đầu với Step 1.1: So sánh CSS Production vs V3**
