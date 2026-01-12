# 📋 TỔNG HỢP CHI TIẾT: BASE APP COMPLIANCE & FEATURES IMPLEMENTATION

> **Mục tiêu:** Tổng hợp đầy đủ các requirements, implementation plan, và current status để mentor review

**Ngày tạo:** 2024-12-19  
**Status:** ✅ Requirements đã được làm rõ, sẵn sàng implement

---

## 📊 TỔNG QUAN DỰ ÁN

### **Context:**
- MemePlay đang tích hợp với Base App Mini App platform
- Base App redirect về domain root (`memeplay.dev`) → load `index.html`
- Cần tuân thủ Base App Featured Guidelines
- Cần implement các features: wallet auto-connect, share overlay với score card, standard game-over overlay

### **Current Architecture:**
- **Entry Points:**
  - Desktop/Browser: `index.html` → `scripts/app-v3.js`
  - Telegram: `telegram-mini-app.html` → `scripts/app-telegram.js`
  - Base App: `index.html` → `scripts/app-v3.js` (✅ Single entry point)

### **Key Decisions:**
- ✅ Consolidate Base App logic vào `index.html` và `app-v3.js` (client-side detection)
- ✅ Xóa `base-mini-app.html` và `scripts/app-base.js` (không cần nữa)
- ✅ Tất cả games dùng standard game-over overlay
- ✅ Share overlay với score card + Web Share API

---

## ✅ REQUIREMENTS ĐÃ ĐƯỢC LÀM RÕ

### **1. Base App Detection & Environment Differentiation**

**Requirement:**
- Detect Base App environment tại runtime
- Phân biệt Base App vs Telegram vs Desktop/Browser
- Base App redirect về domain root → cần client-side detection

**Solution:**
- Detect Base App via Coinbase Wallet context (UA + `isCoinbaseWallet`)
- Function: `isBaseAppEnvironment()` → check `window.ethereum?.isCoinbaseWallet` và User Agent
- Single entry point: `index.html` với conditional logic
- Conditional UI: Hide/show elements dựa trên environment

**⚠️ IMPORTANT - Detection Method:**
```javascript
function isBaseAppEnvironment() {
  const ua = navigator.userAgent || '';
  return (
    window.ethereum?.isCoinbaseWallet === true ||
    ua.includes('CoinbaseWallet') ||
    ua.includes('CBWallet')
  );
}
```

**❌ KHÔNG dùng:**
- `window.parent !== window` (Base App WebView KHÔNG phải iframe, sẽ false positive)
- `window.ethereum?.isBase` (không chuẩn, không documented chính thức)

**✅ Chỉ dùng:**
- `window.ethereum?.isCoinbaseWallet`
- User Agent check (`CoinbaseWallet`, `CBWallet`)

**Status:** ✅ Đã làm rõ

---

### **2. External Links/Redirects - Hide trong Base App**

**Requirement:**
- Base App không cho phép external redirects
- Phải ẩn tất cả external links khi truy cập từ Base App
- Giữ nguyên links khi truy cập từ Desktop/Telegram

**Scope cần ẩn:**
- ✅ Social links (dropdown): `data-action="social-x"`, `data-action="social-telegram"`
- ✅ Share overlay buttons: `shareXBtn`, `shareTelegramBtn`
- ✅ Divider (nếu tất cả social links bị ẩn)
- ✅ Layout adjustment (center nếu chỉ còn Copy Link)

**Status:** ✅ Đã làm rõ, bao gồm trong Implementation Plan Phase 1

---

### **3. Wallet Auto-Connect cho Base App**

**Requirement:**
- Base App cần auto-connect wallet khi load
- Không hiển thị "Connect Wallet" button trong Base App
- Giữ manual connect flow cho Desktop/Telegram

**Logic:**
1. Detect Base App environment
2. On load:
   - Call `eth_accounts` (silent check)
   - If accounts exist → auto-connect without UI
   - If empty → call `eth_requestAccounts` (Base App only)
3. For non-Base environments → keep manual connect flow

**UI:**
- Base App → hide "Connect Wallet" button completely
- Desktop/Telegram → show "Connect Wallet" button as usual

**Status:** ✅ Đã làm rõ, bao gồm trong Implementation Plan Phase 2

---

### **4. Share Overlay với Score Card**

**Requirement:**
- Share overlay hiển thị score card (score, rank, game name, percentile)
- Auto-generate share text: "Got {score} in {gameName}! Rank #{rank}" (English)
- Web Share API integration (native share)
- Copy to clipboard fallback
- Hide external buttons (Telegram, X) trong Base App

**Flow:**
1. User click share button trong game-over overlay
2. Query leaderboard → Get score/rank/percentile
3. Display score card với:
   - Game name
   - Score
   - Rank (#X)
   - Percentile (Top X%)
4. Web Share API hoặc Copy fallback

**Status:** ✅ Đã làm rõ, bao gồm trong Implementation Plan Phase 3

---

### **5. Standard Game-Over Overlay**

**Requirement:**
- Tất cả games dùng cùng một standard game-over overlay
- Design specifications:
  - Black, semi-transparent overlay (backdrop-blur)
  - Logo: 180x180px
  - Score: 40px font, 0.65 line-height
  - Story area: 1/5 screen height
  - Share button: 50x50px (trong overlay)
  - Background game screen vẫn visible (blurred)

**Implementation:**
- Standard overlay component trong `index.html` (parent window)
- Games send `postMessage` với `SHOW_GAME_OVER` event:
  ```javascript
  {
    type: 'SHOW_GAME_OVER',
    score: number,
    logoUrl: string,
    storyText: string,
    gameId: string
  }
  ```
- Parent window listen và hiển thị standard overlay
- Share button trong overlay → open share overlay với score card

**Status:** ✅ Đã làm rõ, bao gồm trong Implementation Plan Phase 4

---

### **6. Game Integration Scope**

**Requirement:**
- Tất cả games phải update để dùng standard overlay
- Games chỉ cần gửi postMessage, không cần implement overlay riêng

**Status:** ✅ Đã làm rõ - Tất cả games dùng chung standard overlay

---

### **7. Share Text Format**

**Requirement:**
- Format: "Got {score} in {gameName}! Rank #{rank}"
- Language: English
- Optional: Có thể thêm percentile nếu cần

**Status:** ✅ Đã làm rõ - English format

---

### **8. Testing Approach**

**Requirement:**
- Test trên Base App webview thực tế
- Up lên production và test trực tiếp
- Không có test environment riêng

**Status:** ✅ Đã làm rõ - Test trên production

---

### **9. Pull-to-Refresh Fix**

**Requirement:**
- Base App webview có vấn đề pull-to-refresh (swipe down → F5)
- Đã thử nhiều cách (CSS `overscroll-behavior`, `touch-action`, JavaScript `preventDefault`)
- Vẫn chưa fix được

**Decision:**
- ⚠️ Tạm bỏ qua
- Có thể là limitation của Base App webview
- Focus vào các features khác trước

**Status:** ⚠️ Tạm bỏ qua - Có thể là limitation

---

### **10. Meta Tag cho Base App Discovery**

**Requirement:**
- Thêm `<meta name="base:app_id" content="69635c568a6eeb04b568de27" />` vào `index.html`
- File `/.well-known/farcaster.json` đã có sẵn

**Status:** ✅ Đã implement

---

### **11. Game 0 (Pet Avatar) Removal**

**Requirement:**
- Xóa "Game 0" (Pet Avatar) khỏi game list
- Game này làm user rối não khi vào hệ thống lần đầu

**Status:** ✅ Đã implement - Đã xóa khỏi `app-v3.js`

---

## 📋 IMPLEMENTATION PLAN

### **Phase 1: Base App Detection & UI Adaptation** (2-3h)

**Tasks:**
1. **Base App Detection** (30min)
   - Add inline script trong `index.html` để detect Base App
   - Function: `isBaseAppEnvironment()` → check `window.ethereum?.isCoinbaseWallet` và User Agent
   - Store flag: `window.__isBaseApp`
   - ⚠️ **KHÔNG dùng** `window.parent !== window` hoặc `window.ethereum?.isBase`

2. **Hide External Links** (1h)
   - Function: `hideExternalLinks()`
   - Hide dropdown social links: `data-action="social-x"`, `data-action="social-telegram"`
   - Hide share overlay buttons: `shareXBtn`, `shareTelegramBtn`
   - Hide divider nếu tất cả social links bị ẩn
   - Layout adjustment: center nếu chỉ còn Copy Link

3. **Conditional UI Logic** (1h)
   - Call `hideExternalLinks()` khi detect Base App
   - Show Base App Welcome Screen (Logo + Slogan "PLAY.CREAT")
   - Test trên Desktop → links visible, no welcome screen
   - Test trên Base App → links hidden, welcome screen shows

**Deliverables:**
- ✅ Base App detection working (chuẩn: `isCoinbaseWallet` + UA)
- ✅ External links hidden trong Base App
- ✅ UI layout adjusted correctly
- ✅ Welcome screen hiển thị khi detect Base App

---

### **Phase 2: Wallet Auto-Connect** (2-3h)

**Tasks:**
1. **Auto-Connect Logic** (1.5h)
   - Function: `autoConnectWallet()`
   - Check `isBaseAppEnvironment()`
   - Call `eth_accounts` (silent check)
   - If accounts exist → auto-connect, update UI state
   - If empty → call `eth_requestAccounts` (Base App only)
   - Handle edge cases: wallet not available, user rejects, etc.

2. **UI State Management** (1h)
   - Hide "Connect Wallet" button trong Base App
   - Show wallet status sau khi auto-connect
   - Update `getUserId()` → Base App wallet priority

3. **Testing** (30min)
   - Test auto-connect trong Base App
   - Test manual connect trong Desktop
   - Test edge cases

**Deliverables:**
- ✅ Wallet auto-connect working trong Base App
- ✅ "Connect Wallet" button hidden trong Base App
- ✅ Manual connect vẫn hoạt động trong Desktop/Telegram

---

### **Phase 3: Share Overlay với Score Card** (3-4h)

**Tasks:**
1. **Leaderboard Query** (1h)
   - Function: `queryLeaderboard(gameId, userId)`
   - Query Supabase để get score, rank, percentile
   - Handle errors gracefully

2. **Score Card UI** (1.5h)
   - Redesign share overlay layout (bottom sheet style, white background)
   - Display score card với:
     - Game name
     - Score
     - Rank (#X)
     - Percentile (Top X%)
   - Auto-generate share text: "Got {score} in {gameName}! Rank #{rank}"

3. **Web Share API Integration** (1h)
   - Function: `handleShareScore(gameId, score, rank)`
   - Use `navigator.share()` nếu available (native sharing experience without navigating away)
   - Fallback: Copy to clipboard
   - Update `openShareOverlay()` → `openShareOverlayWithScore()`
   - ⚠️ **Wording:** Use "native sharing experience without navigating away" thay vì "no external redirects"

4. **Testing** (30min)
   - Test share flow
   - Test Web Share API
   - Test clipboard fallback

**Deliverables:**
- ✅ Share overlay với score card
- ✅ Web Share API integration
- ✅ Auto-generate share text

---

### **Phase 4: Standard Game-Over Overlay** (4-5h)

**Tasks:**
1. **Standard Overlay HTML/CSS** (1.5h)
   - Create standard game-over overlay trong `index.html`
   - Design:
     - Black, semi-transparent overlay (backdrop-blur)
     - Logo: 180x180px
     - Score: 40px font, 0.65 line-height
     - Story area: 1/5 screen height
     - Share button: 50x50px
   - CSS: `backdrop-filter: blur(10px)`

2. **PostMessage Listener** (1h)
   - Listen for `SHOW_GAME_OVER` postMessage trong `app-v3.js`
   - Parse data: `score`, `logoUrl`, `storyText`, `gameId`
   - Display standard overlay với data
   - Share button → open share overlay với score card

3. **Game Integration** (2h)
   - Update tất cả games: `games/templates-v2/*/game.js`
   - Update `gameOver()` function:
     - Remove custom game-over overlay code
     - Send postMessage:
       ```javascript
       window.parent.postMessage({
         type: 'SHOW_GAME_OVER',
         score: finalScore,
         logoUrl: tokenLogoUrl,
         storyText: tokenStory,
         gameId: gameId
       }, '*');
       ```

4. **Testing** (30min)
   - Test với 1-2 games trước
   - Verify overlay hiển thị đúng
   - Test share button flow

**Deliverables:**
- ✅ Standard game-over overlay component
- ✅ PostMessage listener working
- ✅ Tất cả games updated

---

### **Phase 5: Testing & Polish** (2-3h)

**Tasks:**
1. **Integration Testing** (1.5h)
   - Test tất cả features trên Base App
   - Test trên Desktop/Telegram (đảm bảo không bị ảnh hưởng)
   - Test edge cases

2. **UI/UX Polish** (1h)
   - Check responsive design
   - Check animations/transitions
   - Check accessibility

3. **Documentation** (30min)
   - Update README nếu cần
   - Document API changes

**Deliverables:**
- ✅ Tất cả features working
- ✅ No regressions
- ✅ UI/UX polished

---

## 📊 CURRENT STATUS

### **✅ Đã Hoàn Thành:**

1. **Meta Tag:** ✅ Đã thêm `base:app_id` vào `index.html`
2. **Game 0 Removal:** ✅ Đã xóa Pet Avatar khỏi game list
3. **Files Cleanup:** ✅ Đã xóa `base-mini-app.html` và `scripts/app-base.js`
4. **Trade Menu Item:** ✅ Đã thêm "Trade" vào dropdown menu với overlay
5. **Requirements Clarification:** ✅ Tất cả questions đã được trả lời

### **⏳ Đang Chờ Implement:**

1. **Phase 1:** Base App Detection & UI Adaptation
2. **Phase 2:** Wallet Auto-Connect
3. **Phase 3:** Share Overlay với Score Card
4. **Phase 4:** Standard Game-Over Overlay
5. **Phase 5:** Testing & Polish

### **⚠️ Tạm Bỏ Qua:**

1. **Pull-to-Refresh Fix:** Có thể là limitation của Base App webview

---

## 🔍 KEY TECHNICAL DECISIONS

### **1. Single Entry Point Strategy**

**Decision:** Base App redirect về `index.html` → dùng client-side detection

**Rationale:**
- Base App không cho phép custom URL paths
- Client-side detection đơn giản và linh hoạt
- Không cần maintain multiple HTML files

**Implementation:**
- Inline script trong `index.html` để detect Base App
- Conditional logic trong `app-v3.js` dựa trên `window.__isBaseApp`

---

### **2. Standard Game-Over Overlay**

**Decision:** Tất cả games dùng standard overlay trong parent window

**Rationale:**
- Consistent UX across all games
- Easier maintenance (single component)
- Better performance (no duplicate code)

**Implementation:**
- Standard overlay component trong `index.html`
- Games send postMessage → parent hiển thị overlay
- Games không cần implement overlay riêng

---

### **3. Web Share API vs Custom Share**

**Decision:** Use Web Share API với clipboard fallback

**Rationale:**
- Native share experience (better UX)
- Works trong Base App (native sharing experience without navigating away from the app)
- Fallback cho browsers không support

**⚠️ IMPORTANT - Wording:**
- ✅ Use Web Share API for native sharing experience without navigating away from the app
- ❌ KHÔNG dùng wording "no external redirects" (Base reviewer không thích)

**Implementation:**
- `navigator.share()` nếu available
- Copy to clipboard nếu không support

---

## 📝 FILES TO MODIFY

### **Files Modified:**

1. **`index.html`**
   - ✅ Add Base App detection script (inline) - dùng `isCoinbaseWallet` + UA
   - ✅ Add Base App Welcome Screen HTML (Logo + Slogan "PLAY.CREAT")
   - ✅ Add standard game-over overlay HTML
   - ✅ Conditional hide/show elements
   - ✅ Add Trade overlay (✅ Done)

2. **`scripts/app-v3.js`**
   - ⏳ Add `isBaseAppEnvironment()` function
   - ⏳ Add `hideExternalLinks()` function
   - ⏳ Add `autoConnectWallet()` function
   - ⏳ Enhance `openShareOverlay()` → `openShareOverlayWithScore()`
   - ⏳ Add standard game-over overlay listener
   - ⏳ Update `getUserId()` → Base App priority

3. **`games/[templates]/game.js`** (All games)
   - ⏳ Update `gameOver()` → Send postMessage `SHOW_GAME_OVER`
   - ⏳ Remove custom game-over overlay code

### **Files Deleted:**

1. ✅ `base-mini-app.html` (Đã xóa)
2. ✅ `scripts/app-base.js` (Đã xóa)

### **Files Unchanged:**

1. ✅ `telegram-mini-app.html` (Vẫn dùng riêng)
2. ✅ `scripts/app-telegram.js` (Vẫn dùng riêng)
3. ✅ `/.well-known/farcaster.json` (Vẫn cần)

---

## 🎯 SUCCESS CRITERIA

### **Phase 1: Detection & UI**
- ✅ Base App được detect correctly
- ✅ External links hidden trong Base App
- ✅ Links visible trong Desktop/Telegram
- ✅ Layout adjusted correctly

### **Phase 2: Wallet**
- ✅ Wallet auto-connect trong Base App
- ✅ "Connect Wallet" button hidden trong Base App
- ✅ Manual connect vẫn hoạt động trong Desktop/Telegram

### **Phase 3: Share Overlay**
- ✅ Score card hiển thị correctly
- ✅ Web Share API works
- ✅ Clipboard fallback works
- ✅ External buttons hidden trong Base App

### **Phase 4: Game-Over Overlay**
- ✅ Standard overlay hiển thị correctly
- ✅ Tất cả games updated
- ✅ Share button flow works

### **Phase 5: Testing**
- ✅ Tất cả features working
- ✅ No regressions
- ✅ UI/UX polished

---

## ❓ QUESTIONS FOR MENTOR

### **1. Pull-to-Refresh Issue**

**Question:** Có cách nào fix pull-to-refresh trong Base App webview không? Hay đây là limitation của platform?

**Context:**
- Đã thử: CSS `overscroll-behavior`, `touch-action`, JavaScript `preventDefault`
- Vẫn chưa fix được
- Có thể là limitation của Base App webview

**Recommendation:** Tạm bỏ qua, focus vào features khác trước

---

### **2. Testing Strategy**

**Question:** Có test environment nào cho Base App không? Hay phải test trực tiếp trên production?

**Current Plan:** Test trên production

**Recommendation:** Có thể setup staging environment nếu cần

---

### **3. Game Integration Priority**

**Question:** Có nên update tất cả games cùng lúc, hay update từng game một?

**Current Plan:** Update tất cả games

**Recommendation:** Update 1-2 games trước để test, sau đó update tất cả

---

## 📚 RELATED DOCUMENTS

1. **`base miniapp/IMPLEMENTATION-PLAN.md`** - Chi tiết implementation plan
2. **`base miniapp/QUESTIONS-TO-CLARIFY.md`** - Questions đã được làm rõ
3. **`base miniapp/CODE-STRUCTURE-COMPARISON.md`** - So sánh code structure hiện tại vs sắp tới
4. **`base miniapp/TEST-CHECKLIST.md`** - Testing checklist

---

## 🎨 BASE APP WELCOME SCREEN DESIGN

### **Requirement:**
Khi user truy cập từ Base App, hiển thị welcome screen với:
- **Logo MemePlay** (icon/logo chính)
- **Slogan:** "PLAY.CREAT" (hiển thị dưới logo)

### **Design Specifications:**

**Layout:**
- Full screen overlay (semi-transparent dark background)
- Centered content:
  - Logo MemePlay (icon, size: ~120-150px)
  - Slogan "PLAY.CREAT" (font size: 24-32px, color: #ffb642)
  - Subtle animation (fade in, scale up)

**Timing:**
- Show khi detect Base App environment
- Auto-hide sau 2-3 seconds
- User có thể click để skip

**Implementation:**
- HTML overlay trong `index.html`
- CSS animation (fade in + scale)
- JavaScript: Show khi `isBaseAppEnvironment() === true`
- Auto-hide sau 2-3s hoặc user click

**Code Structure:**
```html
<!-- Base App Welcome Screen -->
<div id="baseAppWelcomeScreen" class="base-app-welcome-overlay">
  <div class="base-app-welcome-content">
    <img src="assets/logo.svg" alt="MemePlay" class="base-app-logo" />
    <div class="base-app-slogan">PLAY.CREAT</div>
  </div>
</div>
```

**CSS:**
- Overlay: `position: fixed`, `inset: 0`, `background: rgba(0,0,0,0.8)`
- Content: Centered, flex column
- Logo: 120-150px, animation: fade in + scale up
- Slogan: 24-32px, color: #ffb642, animation: fade in delay

**JavaScript:**
- Show khi detect Base App
- Auto-hide sau 2-3s
- Click to skip

**Integration:**
- Part of Phase 1: Base App Detection & UI Adaptation
- Show immediately after Base App detection
- Hide before main content loads

---

## 🚀 NEXT STEPS

1. **Review với Mentor:** ✅ Đang làm (document này)
2. **Start Implementation:** ⏳ Chờ mentor approval
3. **Phase 1:** Base App Detection & UI Adaptation + Welcome Screen
4. **Phase 2:** Wallet Auto-Connect
5. **Phase 3:** Share Overlay với Score Card
6. **Phase 4:** Standard Game-Over Overlay
7. **Phase 5:** Testing & Polish
8. **Deploy:** Up lên production và test

---

**Last Updated:** 2024-12-19  
**Status:** ✅ Ready for Mentor Review  
**Updates:** ✅ Fixed Base App detection method, Share API wording, Added Welcome Screen design

