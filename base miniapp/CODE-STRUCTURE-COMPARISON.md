# 🌳 CODE STRUCTURE COMPARISON

> **Mục tiêu:** So sánh cấu trúc code hiện tại vs sắp tới để dễ hình dung changes

---

## 📊 HIỆN TẠI (CURRENT STRUCTURE)

```
memeplay.dev/
│
├── index.html                          # Entry point (Desktop/Browser)
│   └── Loads: scripts/app-v3.js
│
├── telegram mini app/
│   └── telegram-mini-app.html           # Entry point (Telegram)
│       └── Loads: scripts/app-telegram.js
│
├── scripts/
│   ├── app-v3.js                       # Main script (Desktop)
│   │   ├── getUserId() → Wallet/Local
│   │   ├── Share overlay (Copy, Telegram, X)
│   │   └── Game loading logic
│   │
│   ├── app-telegram.js                 # Telegram script
│   │   ├── getUserId() → Telegram > Wallet > Local
│   │   ├── Share overlay (Copy, Telegram, X)
│   │   └── Game loading logic
│   │
│   └── [other scripts...]
│
├── games/
│   └── [game templates]/
│       ├── index.html                  # Game HTML
│       ├── game.js                     # Game logic
│       └── style.css                   # Game styles
│       │
│       └── Game-Over Overlay:          # ❌ Mỗi game khác nhau
│           ├── Canvas-based (Draw Runner, Pacman)
│           ├── HTML overlay (Pixel Shooter, Moon)
│           └── Custom styles mỗi game
│
├── .well-known/
│   └── farcaster.json                  # Base App manifest
│
└── [other files...]
```

### **Flow hiện tại:**

#### **Desktop/Browser:**
```
User → index.html → app-v3.js
  ├── getUserId() → Wallet/Local
  ├── Share overlay → Copy, Telegram, X buttons
  └── Games → Mỗi game có game-over riêng
```

#### **Telegram:**
```
User → telegram-mini-app.html → app-telegram.js
  ├── getUserId() → Telegram > Wallet > Local
  ├── Share overlay → Copy, Telegram, X buttons
  └── Games → Mỗi game có game-over riêng
```

#### **Base App:**
```
User → memeplay.dev (redirect to index.html) → app-v3.js
  ├── getUserId() → Wallet/Local (không detect Base App)
  ├── Share overlay → Copy, Telegram, X buttons (❌ Telegram/X bị block)
  └── Games → Mỗi game có game-over riêng
```

---

## 🚀 SẮP TỚI (FUTURE STRUCTURE)

```
memeplay.dev/
│
├── index.html                          # ✅ Entry point CHUNG (Base App + Desktop + Telegram)
│   ├── Meta tag: base:app_id
│   ├── Inline script: Base App detection
│   └── Loads: scripts/app-v3.js
│
├── scripts/
│   ├── app-v3.js                       # ✅ Main script (ALL environments)
│   │   ├── getUserId() → Base App > Telegram > Wallet > Local
│   │   ├── isBaseAppEnvironment() → Detection logic
│   │   ├── hideExternalLinks() → Hide social links trong Base App
│   │   ├── autoConnectWallet() → Auto-connect trong Base App
│   │   │
│   │   ├── Share overlay (ENHANCED):
│   │   │   ├── Query leaderboard → Get score/rank
│   │   │   ├── Display score card
│   │   │   ├── Web Share API (native share)
│   │   │   └── Copy to clipboard (fallback)
│   │   │
│   │   └── Standard Game-Over Overlay (NEW):
│   │       ├── Listen for SHOW_GAME_OVER postMessage
│   │       ├── Display standard overlay
│   │       └── Share button → Open share overlay
│   │
│   └── [other scripts...]
│
├── games/
│   └── [game templates]/
│       ├── index.html                  # Game HTML
│       ├── game.js                     # Game logic
│       │   └── gameOver() → Send postMessage:
│       │       └── { type: 'SHOW_GAME_OVER', score, logoUrl, storyText, gameId }
│       └── style.css                   # Game styles
│       │
│       └── Game-Over Overlay:          # ✅ TẤT CẢ DÙNG CHUNG
│           └── Standard overlay trong parent window
│
├── .well-known/
│   └── farcaster.json                  # Base App manifest
│
└── [other files...]
```

### **Flow sắp tới:**

#### **Desktop/Browser:**
```
User → index.html → app-v3.js
  ├── isBaseAppEnvironment() → false
  ├── getUserId() → Wallet/Local
  ├── Share overlay → Copy, Telegram, X buttons (✅ All visible)
  └── Games → Send postMessage → Standard game-over overlay
```

#### **Telegram:**
```
User → telegram-mini-app.html → app-telegram.js
  ├── isBaseAppEnvironment() → false
  ├── getUserId() → Telegram > Wallet > Local
  ├── Share overlay → Copy, Telegram, X buttons (✅ All visible)
  └── Games → Send postMessage → Standard game-over overlay
```

#### **Base App:**
```
User → memeplay.dev (redirect to index.html) → app-v3.js
  ├── isBaseAppEnvironment() → true ✅
  ├── hideExternalLinks() → Hide Telegram/X buttons ✅
  ├── autoConnectWallet() → Auto-connect ✅
  ├── getUserId() → Wallet (auto-connected)
  │
  ├── Share overlay (ENHANCED):
  │   ├── Query leaderboard → Score card ✅
  │   ├── Web Share API (native share) ✅
  │   └── Copy to clipboard (fallback) ✅
  │
  └── Games → Send postMessage → Standard game-over overlay ✅
      └── Share button → Open share overlay với score card
```

---

## 🔄 SO SÁNH CHI TIẾT

### **1. Entry Points**

| Environment | Hiện tại | Sắp tới |
|-------------|----------|---------|
| **Desktop** | `index.html` → `app-v3.js` | `index.html` → `app-v3.js` (✅ Same) |
| **Telegram** | `telegram-mini-app.html` → `app-telegram.js` | `telegram-mini-app.html` → `app-telegram.js` (✅ Same) |
| **Base App** | `index.html` → `app-v3.js` (❌ Không detect) | `index.html` → `app-v3.js` (✅ Detect Base App) |

**Changes:**
- ✅ Base App detection trong `index.html` + `app-v3.js`
- ✅ Conditional logic dựa trên environment

---

### **2. User ID Detection**

| Environment | Hiện tại | Sắp tới |
|-------------|----------|---------|
| **Desktop** | Wallet > Local | Wallet > Local (✅ Same) |
| **Telegram** | Telegram > Wallet > Local | Telegram > Wallet > Local (✅ Same) |
| **Base App** | Wallet > Local (❌ Không detect Base App) | **Wallet (auto-connected)** (✅ NEW) |

**Changes:**
- ✅ Base App: Auto-connect wallet
- ✅ Priority: Base App wallet > Telegram > Wallet > Local

---

### **3. Share Overlay**

| Feature | Hiện tại | Sắp tới |
|---------|----------|---------|
| **Buttons** | Copy, Telegram, X | Copy, Web Share API (✅ NEW) |
| **Score Card** | ❌ Không có | ✅ Score, Rank, Game name, Percentile |
| **Share Text** | ❌ Không có | ✅ Auto-generate: "Got {score} in {gameName}! Rank #{rank}" |
| **Base App** | ❌ Telegram/X bị block | ✅ Hide Telegram/X, Web Share API works |

**Changes:**
- ✅ Query leaderboard khi open share
- ✅ Display score card
- ✅ Web Share API integration
- ✅ Hide external buttons trong Base App

---

### **4. Game-Over Overlay**

| Feature | Hiện tại | Sắp tới |
|---------|----------|---------|
| **Implementation** | ❌ Mỗi game khác nhau | ✅ Standard component (parent window) |
| **Design** | ❌ Không đồng nhất | ✅ Đồng nhất (180x180 logo, 40px score, etc.) |
| **Share Button** | ❌ Không có | ✅ 50x50px button → Open share overlay |
| **Games Integration** | ❌ Mỗi game tự implement | ✅ Games send postMessage → Parent hiển thị |

**Changes:**
- ✅ Standard overlay component trong `index.html`
- ✅ Games chỉ cần gửi postMessage
- ✅ Tất cả games dùng chung overlay

---

### **5. External Links Handling**

| Location | Hiện tại | Sắp tới |
|----------|----------|---------|
| **Dropdown** | Social X, Telegram (✅ Visible) | Base App: ❌ Hidden, Desktop: ✅ Visible |
| **Share Overlay** | Telegram, X buttons (✅ Visible) | Base App: ❌ Hidden, Desktop: ✅ Visible |
| **Base App** | ❌ Buttons visible nhưng bị block | ✅ Buttons hidden, Web Share API works |

**Changes:**
- ✅ Conditional hide/show dựa trên environment
- ✅ No external redirects trong Base App

---

## 📋 FILE CHANGES SUMMARY

### **Files Modified:**

1. **`index.html`**
   - ✅ Add Base App detection script (inline)
   - ✅ Add standard game-over overlay HTML
   - ✅ Conditional hide/show elements

2. **`scripts/app-v3.js`**
   - ✅ Add `isBaseAppEnvironment()` function
   - ✅ Add `hideExternalLinks()` function
   - ✅ Add `autoConnectWallet()` function
   - ✅ Enhance `openShareOverlay()` → Query leaderboard, display score card
   - ✅ Add Web Share API integration
   - ✅ Add standard game-over overlay listener
   - ✅ Update `getUserId()` → Base App priority

3. **`games/[templates]/game.js`** (All games)
   - ✅ Update `gameOver()` → Send postMessage `SHOW_GAME_OVER`
   - ✅ Remove custom game-over overlay code

### **Files Deleted:**

1. ✅ `base-mini-app.html` (Đã xóa)
2. ✅ `scripts/app-base.js` (Đã xóa)

### **Files Unchanged:**

1. ✅ `telegram-mini-app.html` (Vẫn dùng riêng)
2. ✅ `scripts/app-telegram.js` (Vẫn dùng riêng)
3. ✅ `/.well-known/farcaster.json` (Vẫn cần)

---

## 🎯 IMPLEMENTATION FLOW

### **Phase 1: Detection & UI Adaptation**
```
index.html
  └── Inline script:
      ├── isBaseAppEnvironment() → Check window.ethereum?.isBase
      └── if (isBaseApp) {
            hideExternalLinks();
          }
```

### **Phase 2: Wallet Auto-Connect**
```
app-v3.js
  └── autoConnectWallet():
      ├── eth_accounts (silent check)
      └── if (empty) → eth_requestAccounts (Base App only)
```

### **Phase 3: Share Overlay Enhancement**
```
app-v3.js
  └── openShareOverlayWithScore(gameId):
      ├── Query leaderboard → Get score/rank
      ├── Display score card
      └── Web Share API or Copy fallback
```

### **Phase 4: Standard Game-Over Overlay**
```
index.html
  └── Standard overlay HTML

app-v3.js
  └── Listen for SHOW_GAME_OVER:
      ├── Display standard overlay
      └── Share button → Open share overlay

games/[templates]/game.js
  └── gameOver():
      └── postMessage({ type: 'SHOW_GAME_OVER', ... })
```

---

## 🔍 KEY DIFFERENCES

### **Before (Hiện tại):**
- ❌ Base App không được detect
- ❌ External links visible nhưng bị block
- ❌ Share overlay không có score card
- ❌ Mỗi game có game-over riêng
- ❌ Wallet cần manual connect

### **After (Sắp tới):**
- ✅ Base App được detect và handle riêng
- ✅ External links hidden trong Base App
- ✅ Share overlay có score card với Web Share API
- ✅ Tất cả games dùng standard game-over overlay
- ✅ Wallet auto-connect trong Base App

---

## 📊 VISUAL COMPARISON

### **Share Overlay - Before:**
```
┌─────────────────────────┐
│   Share Game            │
├─────────────────────────┤
│   [Copy Link]           │
│   [Share on Telegram]   │ ← ❌ Bị block trong Base App
│   [Share on X]          │ ← ❌ Bị block trong Base App
└─────────────────────────┘
```

### **Share Overlay - After:**
```
┌─────────────────────────┐
│   Share Score           │
├─────────────────────────┤
│   ┌─────────────────┐   │
│   │  Score Card     │   │ ← ✅ NEW
│   │  Score: 100     │   │
│   │  Rank: #5       │   │
│   │  Game: Pacman   │   │
│   └─────────────────┘   │
│                         │
│   [Copy]  [Share]       │ ← ✅ Web Share API
└─────────────────────────┘
```

### **Game-Over Overlay - Before:**
```
Game 1: Canvas-based (Draw Runner)
Game 2: HTML overlay (Pixel Shooter)
Game 3: Custom style (Moon)
Game 4: Another style (Rocket BNB)
... (Mỗi game khác nhau)
```

### **Game-Over Overlay - After:**
```
┌─────────────────────────┐
│   [Black overlay]       │
│                         │
│      [Logo 180x180]     │
│      Score: 100         │
│      Story text...      │
│                         │
│   [Share] [Play Again]  │
└─────────────────────────┘
(✅ Tất cả games dùng chung)
```

---

## ✅ SUMMARY

### **Architecture Changes:**
- ✅ Single entry point: `index.html` (Base App + Desktop)
- ✅ Environment detection: Client-side JavaScript
- ✅ Conditional UI: Hide/show dựa trên environment
- ✅ Standard components: Game-over overlay, Share overlay

### **Key Improvements:**
- ✅ Base App compliance: No external redirects
- ✅ Better UX: Auto-connect wallet, score card sharing
- ✅ Consistent design: Standard game-over overlay
- ✅ Maintainability: Centralized components

---

**Last Updated:** 2024-12-19

