# 🏗️ Homepage V3 - Architecture Tree

> **Last Updated:** 2024  
> **Status:** 🚧 Ready for Development  
> **Decisions:** All confirmed ✅

## 📋 Key Decisions Summary

### ✅ Confirmed Requirements
- **Game Card Structure:** Giữ nguyên như V1 (game-stage, game-footer, social buttons)
- **Social Interactions:** Có (like, comment, share, leaderboard buttons)
- **Focus Mode:** Có (button "⤢" toggle)
- **Market Cap:** Có (hiển thị market cap)
- **CSS Styling:** Tự viết CSS mới (không copy từ V1)
- **Game Card Events:** Có (bind events cho like/comment/share/leaderboard)
- **Supabase RPC:** Option A - Client sort (dùng `list_user_created_games`, sort ở client)
- **Template Support:** Cả v2 và legacy (backward compatibility)
- **Error Handling:** Có fallback (Supabase → localStorage → Error)

### 🎯 Performance Targets
- ✅ Game 0 Load: < 1s
- ✅ Scroll FPS: 60fps
- ✅ Memory Usage: < 200MB (100 games)
- ✅ Batch Load Time: < 500ms
- ✅ Cache Hit Rate: > 80%

---

## 📁 File Structure

```
HLMT5 game memeplay.dev/
│
├── index-v3.html                    # Main HTML file
│   ├── <head>
│   │   ├── style.css               # Global styles
│   │   └── <style>                 # Inline styles (header, game-container, wallet overlay)
│   │
│   ├── <body>
│   │   ├── .main-header            # Fixed header
│   │   │   ├── .logo               # Logo + hamburger menu
│   │   │   └── .header-actions     # Search, Creator, Wallet buttons
│   │   │
│   │   ├── .game-container         # Scrollable game container
│   │   │   └── (game cards sẽ được inject vào đây)
│   │   │
│   │   └── #walletOverlay          # Wallet overlay modal
│   │
│   └── <script>
│       ├── Header handlers         # Hamburger, search, creator, wallet
│       ├── Wallet connection       # MetaMask connect/disconnect
│       └── Wallet overlay          # Wallet overlay handlers
│
└── scripts/
    └── app-v3.js                    # Main game loading logic (NEW)
        ├── Supabase Setup
        ├── Game Loading System
        ├── Batch System
        ├── Cleanup System
        └── Sync System
```

---

## 🌳 Function Hierarchy Tree

```
scripts/app-v3.js
│
├── 🔧 SETUP & CONFIGURATION
│   ├── initSupabaseClient()
│   │   ├── SUPABASE_URL
│   │   ├── SUPABASE_ANON_KEY
│   │   └── createClient() [disable realtime]
│   │
│   ├── getTemplateConfig()
│   │   ├── Template Registry (templates-v2)
│   │   └── Legacy Template Paths
│   │
│   └── getStoragePrefix()
│       ├── pacman_brand_config_
│       ├── blocks_brand_config_
│       ├── wall_bounce_bird_config_
│       └── blow_bubble_config_
│
├── 📥 GAME LOADING SYSTEM
│   │
│   ├── loadGameListFromSupabase()
│   │   ├── supabase.rpc('list_user_created_games', { p_template_id })
│   │   │   ├── Call for each template: pacman, blocks, wall-bounce-bird, blow-bubble
│   │   │   └── Response includes: likes_count, comments_count, plays_count
│   │   ├── Merge all games from all templates
│   │   ├── Sort by likes_count DESC (client-side sort - Option A)
│   │   ├── Filter localhost games
│   │   └── Return: Array<Game> (sorted by likes)
│   │
│   ├── getGame0(games)
│   │   ├── games[0] (nhiều like nhất)
│   │   └── Return: Game object
│   │
│   ├── loadGameConfig(gameId)
│   │   ├── Try: localStorage (config)
│   │   │   ├── pacman_brand_config_{gameId}
│   │   │   ├── blocks_brand_config_{gameId}
│   │   │   └── ...
│   │   ├── Fallback: Supabase
│   │   │   └── supabase.rpc('get_user_created_games')
│   │   └── Return: Game config object
│   │
│   ├── renderGameCard(game)
│   │   ├── Create .game-card DOM (giống V1 structure)
│   │   ├── Add .game-stage với iframe (placeholder)
│   │   ├── Add .game-footer với:
│   │   │   ├── Like button + count
│   │   │   ├── Comment button + count
│   │   │   ├── Share button
│   │   │   ├── Leaderboard button
│   │   │   ├── Market cap button
│   │   │   └── Creator text
│   │   ├── Add focus-toggle button ("⤢")
│   │   ├── Bind social interaction events
│   │   └── Return: DOM element
│   │
│   └── loadGame0()
│       ├── loadGameListFromSupabase() [Priority]
│       ├── getGame0()
│       ├── loadGameConfig()
│       ├── renderGameCard()
│       ├── Load iframe src
│       └── Append to .game-container [Target: < 1s]
│
├── 📊 CACHE SYSTEM
│   │
│   ├── cacheLikeCounts(games)
│   │   ├── localStorage.setItem('mp_like_counts_cache')
│   │   ├── Include: timestamp, games data
│   │   └── TTL: 5 phút
│   │
│   ├── getCachedLikeCounts()
│   │   ├── Check TTL (5 phút)
│   │   ├── If valid → return cache
│   │   └── If expired → return null
│   │
│   └── updateLikeCountsBackground()
│       ├── Check cache TTL
│       ├── If expired → fetch from Supabase
│       ├── Update cache
│       └── Re-sort if needed (optional)
│
├── 📦 BATCH SYSTEM
│   │
│   ├── createBatches(games)
│   │   ├── Batch 0: [Game 0] (đã load)
│   │   ├── Batch 1: [Game 1, 2, 3]
│   │   ├── Batch 2: [Game 4, 5, 6]
│   │   └── Return: Array<Batch>
│   │
│   ├── preloadBatchDOM(batch)
│   │   ├── renderGameCard() for each game
│   │   ├── Append to container (hidden/off-screen)
│   │   └── NO iframe (chỉ DOM)
│   │
│   ├── initBatchObserver()
│   │   ├── IntersectionObserver
│   │   ├── root: .game-container
│   │   ├── rootMargin: '100px 0px'
│   │   └── threshold: [0, 0.3, 0.7, 1.0]
│   │
│   └── loadBatchIframes(batch)
│       ├── When batch enters viewport
│       ├── For each game in batch:
│       │   ├── Get iframe element
│       │   ├── Set iframe.src from config
│       │   └── Load game
│       └── Trigger cleanupGames()
│
├── 🧹 CLEANUP SYSTEM
│   │
│   ├── cleanupGames(currentBatch)
│   │   ├── Get all loaded games
│   │   ├── For each game NOT in currentBatch:
│   │   │   ├── Remove iframe (unloadGameIframe)
│   │   │   └── Keep DOM (chỉ xóa iframe)
│   │   └── Keep: currentBatch ± 1 batch
│   │
│   └── cleanupDistantBatches(currentBatchIndex)
│       ├── Calculate: keepRange = currentBatchIndex ± 2
│       ├── For each batch outside range:
│       │   ├── Remove DOM (removeChild)
│       │   └── Remove iframe
│       └── Keep: currentBatch ± 2 batches
│
├── 🔄 SYNC SYSTEM
│   │
│   ├── syncGameData(gameId)
│   │   ├── Load config from localStorage
│   │   │   ├── title, stories, mapColor
│   │   │   ├── fragmentLogoUrl, mapIndex
│   │   │   └── templateUrl
│   │   ├── Load social counts from Supabase
│   │   │   ├── likes_count
│   │   │   ├── comments_count
│   │   │   └── plays_count
│   │   ├── Merge data
│   │   └── Return: Complete game object
│   │
│   └── handleScrollBack(batchIndex)
│       ├── Detect scroll up to old batch
│       ├── Load from cache/localStorage
│       ├── Render DOM + iframe
│       └── Restore state
│
├── 🎮 SOCIAL INTERACTIONS SYSTEM
│   │
│   ├── bindSocialInteractions(card, gameId)
│   │   ├── Like button → toggleLike() → update localStorage + Supabase
│   │   ├── Comment button → openCommentsOverlay()
│   │   ├── Share button → openShareOverlay()
│   │   ├── Leaderboard button → openLeaderboardOverlay()
│   │   └── Market cap button → showMarketCap()
│   │
│   ├── toggleLike(gameId)
│   │   ├── Update localStorage (mp_like_{gameId})
│   │   ├── Call Supabase API
│   │   └── Update UI (heart icon + count)
│   │
│   └── hydrateSocialCounts(gameId, card)
│       ├── Load counts from Supabase
│       └── Update counts in card
│
└── 🚨 ERROR HANDLING
    │
    ├── loadGameListWithFallback()
    │   ├── Try: loadGameListFromSupabase()
    │   ├── Catch: loadFromLocalStorage()
    │   │   └── Show warning (không phải error)
    │   └── Fallback: Show error message
    │
    └── handleSupabaseError(error)
        ├── Log error
        ├── Try localStorage fallback
        └── Show user-friendly message
```

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    PAGE LOAD (index-v3.html)                │
└───────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              scripts/app-v3.js được load                     │
└───────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              initSupabaseClient()                           │
│              - Setup Supabase client                        │
│              - Disable realtime                             │
└───────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              loadGame0() [PRIORITY: < 1s]                   │
│              ├─► loadGameListFromSupabase()                 │
│              │   ├─► Try: Supabase RPC                      │
│              │   │   └─► Sort by likes DESC                 │
│              │   └─► Fallback: localStorage                │
│              │                                             │
│              ├─► getGame0(games)                            │
│              │   └─► games[0] (nhiều like nhất)           │
│              │                                             │
│              ├─► loadGameConfig(game0Id)                    │
│              │   ├─► Try: localStorage                      │
│              │   └─► Fallback: Supabase                    │
│              │                                             │
│              ├─► renderGameCard(game0)                      │
│              │   └─► Create DOM + iframe                   │
│              │                                             │
│              └─► Append to .game-container                 │
│                  └─► Load iframe src [< 1s]                │
└───────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              cacheLikeCounts(games)                         │
│              - Save to localStorage                          │
│              - TTL: 5 phút                                  │
└───────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              createBatches(games)                           │
│              - Batch 0: [Game 0] ✓                         │
│              - Batch 1: [Game 1, 2, 3]                      │
│              - Batch 2: [Game 4, 5, 6]                     │
│              - ...                                          │
└───────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              preloadBatchDOM(Batch 1)                        │
│              - Render DOM (không có iframe)                 │
│              - Append to container (hidden)                 │
└───────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              initBatchObserver()                            │
│              - IntersectionObserver                         │
│              - Watch for batch entering viewport            │
└───────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              USER SCROLLS                                   │
│              └─► Batch enters viewport                       │
└───────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              loadBatchIframes(batch)                        │
│              - Load iframe for each game                    │
│              - Set iframe.src                               │
└───────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              cleanupGames(currentBatch)                     │
│              - Remove iframe của games ngoài batch          │
│              - Keep DOM                                     │
└───────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              cleanupDistantBatches(currentBatchIndex)       │
│              - Remove DOM của batches xa (> 2 batches)     │
│              - Keep: currentBatch ± 2 batches               │
└───────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Background: updateLikeCountsBackground()       │
│              - Check cache TTL                              │
│              - If expired → fetch from Supabase            │
│              - Update cache                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                      index-v3.html                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  .main-header                                         │  │
│  │  ├─► Hamburger → Docs/Stats                          │  │
│  │  ├─► Search → Filter dropdown                        │  │
│  │  ├─► Creator → Navigate to /games/templates-v2/     │  │
│  │  └─► Wallet → Connect/Disconnect MetaMask            │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  .game-container (Scrollable)                         │  │
│  │  ├─► Game 0 Card (loaded < 1s)                       │  │
│  │  ├─► Batch 1 Cards (DOM preloaded)                   │  │
│  │  ├─► Batch 2 Cards (DOM preloaded)                   │  │
│  │  └─► ... (lazy load khi scroll)                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  #walletOverlay                                       │  │
│  │  ├─► Address display                                  │  │
│  │  ├─► Copy button                                     │  │
│  │  └─► Disconnect button                               │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ <script src="scripts/app-v3.js">
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    scripts/app-v3.js                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Supabase Client                                      │  │
│  │  ├─► SUPABASE_URL                                     │  │
│  │  ├─► SUPABASE_ANON_KEY                               │  │
│  │  └─► createClient() [no realtime]                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Game Loading System                                  │  │
│  │  ├─► loadGameListFromSupabase()                      │  │
│  │  ├─► getGame0()                                       │  │
│  │  ├─► loadGameConfig()                                 │  │
│  │  ├─► renderGameCard()                                 │  │
│  │  └─► loadGame0() [< 1s]                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Batch System                                         │  │
│  │  ├─► createBatches()                                  │  │
│  │  ├─► preloadBatchDOM()                                │  │
│  │  ├─► initBatchObserver()                              │  │
│  │  └─► loadBatchIframes()                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Cleanup System                                       │  │
│  │  ├─► cleanupGames()                                   │  │
│  │  └─► cleanupDistantBatches()                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Sync System                                          │  │
│  │  ├─► syncGameData()                                   │  │
│  │  ├─► cacheLikeCounts() [TTL: 5 phút]                  │  │
│  │  ├─► updateLikeCountsBackground()                     │  │
│  │  └─► handleScrollBack()                              │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬──────────────────────────────────┘
                            │
                            │ localStorage
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    localStorage                              │
│  ├─► mp_like_counts_cache (TTL: 5 phút)                    │
│  ├─► pacman_brand_config_{gameId}                         │
│  ├─► blocks_brand_config_{gameId}                          │
│  ├─► wall_bounce_bird_config_{gameId}                     │
│  └─► blow_bubble_config_{gameId}                          │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 State Management

```
Global State (scripts/app-v3.js)
│
├── supabaseClient
│   └── Supabase client instance
│
├── gameList
│   └── Array<Game> (sorted by likes DESC)
│
├── game0
│   └── Game object (nhiều like nhất)
│
├── batches
│   └── Array<Batch> (3 games/batch)
│
├── currentBatchIndex
│   └── Number (batch hiện tại đang view)
│
├── likeCountsCache
│   ├── data: Map<gameId, likes>
│   └── timestamp: Date
│
└── loadedGames
    └── Set<gameId> (games đã load iframe)
```

---

## 🎨 Template Support Matrix

```
Templates Supported:
│
├── ✅ templates-v2 (Priority)
│   ├── pacman-template
│   ├── blocks-8x8-template
│   ├── wall-bounce-bird-template
│   ├── blow-bubble-template
│   └── pixel-shooter-template
│
└── ✅ Legacy (Backward Compatibility)
    ├── pacman (games/templates/pacman-template/)
    ├── blocks-8x8 (games/crypto-blocks/)
    ├── wall-bounce-bird (games/wall-bounce-bird/)
    └── blow-bubble (games/blow-bubble/)
```

## 🎮 Game Card HTML Structure

```html
<div class="game-card" id="{gameId}" data-game-id="{gameId}">
  <!-- Game Stage -->
  <div class="game-stage">
    <iframe
      data-game-url="{templateUrl}"
      src="about:blank"  <!-- Lazy load -->
      width="720"
      height="1000"
      frameborder="0"
      scrolling="no"
      allow="autoplay; fullscreen; gamepad"
      title="{game.title}">
    </iframe>
    <button class="focus-toggle" type="button" aria-label="Toggle focus mode">⤢</button>
  </div>
  
  <!-- Game Footer -->
  <footer class="game-footer">
    <div class="game-icons">
      <div class="game-icons-left">
        <!-- Like Button -->
        <div class="icon-wrapper" data-role="like">
          <button type="button" title="Like">
            <svg>...</svg>
          </button>
          <span class="icon-count" data-label="likes">{likes}</span>
        </div>
        
        <!-- Comment Button -->
        <div class="icon-wrapper" data-role="comment">
          <button type="button" title="Comments">
            <svg>...</svg>
          </button>
          <span class="icon-count" data-label="comments">{comments}</span>
        </div>
        
        <!-- Share Button -->
        <div class="icon-wrapper" data-role="share">
          <button type="button" title="Share">
            <svg>...</svg>
          </button>
        </div>
        
        <!-- Leaderboard Button -->
        <div class="icon-wrapper" data-role="leaderboard">
          <button type="button" title="Leaderboard & Rewards">
            <svg>...</svg>
          </button>
        </div>
      </div>
      
      <div class="game-icons-right">
        <!-- Market Cap Button -->
        <div class="icon-wrapper" data-role="marketcap">
          <button type="button" title="Market Cap">
            <span>...</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Creator Text -->
    <div class="creator-text">
      Creator: <strong>{creator}</strong>
    </div>
  </footer>
</div>
```

---

## ⚡ Performance Targets

```
✅ Game 0 Load: < 1s
✅ Scroll FPS: 60fps
✅ Memory Usage: < 200MB (100 games)
✅ Batch Load Time: < 500ms
✅ Cache Hit Rate: > 80%
```

---

## 🔗 Dependencies

```
index-v3.html
├── style.css (global styles)
└── scripts/app-v3.js
    ├── Supabase JS (CDN: esm.sh/@supabase/supabase-js@2)
    └── Browser APIs
        ├── IntersectionObserver
        ├── localStorage
        └── fetch API
```

---

## 📊 Complete Workflow Summary

### Phase 1: Initial Load (< 1s target)
```
1. Page Load (index-v3.html)
   ↓
2. Load scripts/app-v3.js
   ↓
3. initSupabaseClient()
   ↓
4. loadGame0() [PRIORITY]
   ├─► loadGameListFromSupabase()
   │   ├─► Call list_user_created_games (4 templates)
   │   ├─► Merge all games
   │   └─► Sort by likes_count DESC (client)
   ├─► getGame0() → games[0]
   ├─► loadGameConfig() → localStorage → Supabase
   ├─► renderGameCard() → Full HTML structure
   ├─► bindSocialInteractions() → Events
   ├─► hydrateSocialCounts() → Load counts
   └─► Append to DOM + Load iframe [< 1s]
```

### Phase 2: Batch System
```
5. cacheLikeCounts() → localStorage (TTL: 5 phút)
   ↓
6. createBatches() → [Game 0], [1-3], [4-6], ...
   ↓
7. preloadBatchDOM(Batch 1) → DOM only (no iframe)
   ↓
8. initBatchObserver() → IntersectionObserver
   ↓
9. User Scrolls → Batch enters viewport
   ↓
10. loadBatchIframes(batch) → Load iframes
   ↓
11. cleanupGames() → Remove iframes outside batch
   ↓
12. cleanupDistantBatches() → Remove DOM > 2 batches away
```

### Phase 3: Social Interactions
```
13. User clicks Like → toggleLike()
    ├─► Update localStorage
    ├─► Call Supabase API
    └─► Update UI
   ↓
14. User clicks Comment → openCommentsOverlay()
   ↓
15. User clicks Share → openShareOverlay()
   ↓
16. User clicks Leaderboard → openLeaderboardOverlay()
```

### Phase 4: Background Updates
```
17. updateLikeCountsBackground()
    ├─► Check cache TTL (5 phút)
    ├─► If expired → Fetch from Supabase
    └─► Update cache + Re-sort if needed
```

### Phase 5: Scroll Back
```
18. User scrolls up → handleScrollBack()
    ├─► Detect old batch
    ├─► Load from cache/localStorage
    ├─► Render DOM + iframe
    └─► Restore state
```

---

## 🔧 Implementation Checklist

### ✅ Setup & Configuration
- [x] Supabase client setup
- [x] Template registry support (v2 + legacy)
- [x] Storage prefix helpers

### 📥 Game Loading
- [ ] `loadGameListFromSupabase()` - 4 RPC calls, client sort
- [ ] `getGame0()` - Get top game
- [ ] `loadGameConfig()` - localStorage → Supabase
- [ ] `renderGameCard()` - Full HTML structure
- [ ] `loadGame0()` - Priority load < 1s

### 📊 Cache System
- [ ] `cacheLikeCounts()` - localStorage with TTL
- [ ] `getCachedLikeCounts()` - Check TTL
- [ ] `updateLikeCountsBackground()` - Background update

### 📦 Batch System
- [ ] `createBatches()` - 3 games/batch
- [ ] `preloadBatchDOM()` - DOM only
- [ ] `initBatchObserver()` - IntersectionObserver
- [ ] `loadBatchIframes()` - Load on scroll

### 🧹 Cleanup System
- [ ] `cleanupGames()` - Remove iframes
- [ ] `cleanupDistantBatches()` - Remove DOM

### 🔄 Sync System
- [ ] `syncGameData()` - Merge localStorage + Supabase
- [ ] `handleScrollBack()` - Load old batches

### 🎮 Social Interactions
- [ ] `bindSocialInteractions()` - Bind events
- [ ] `toggleLike()` - Like/unlike
- [ ] `hydrateSocialCounts()` - Load counts
- [ ] Comments overlay handler
- [ ] Share overlay handler
- [ ] Leaderboard overlay handler

### 🚨 Error Handling
- [ ] `loadGameListWithFallback()` - Supabase → localStorage
- [ ] `handleSupabaseError()` - User-friendly messages

### 🎨 CSS Styling
- [ ] Game card styles (new CSS)
- [ ] Game footer styles
- [ ] Social button styles
- [ ] Focus mode styles
- [ ] Responsive styles

---

**Last Updated:** 2024  
**Version:** 3.0  
**Status:** ✅ Ready for Development  
**All Decisions:** Confirmed

