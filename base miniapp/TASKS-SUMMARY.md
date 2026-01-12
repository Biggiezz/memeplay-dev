# 📋 TỔNG HỢP TẤT CẢ TASKS CẦN LÀM - BASE APP COMPLIANCE

> **Mục tiêu:** Tổng hợp đầy đủ các tasks cần làm để tuân thủ Base App Featured Guidelines và implement các features

**Ngày tạo:** 2024-12-19  
**Status:** ✅ **MENTOR APPROVED** - Sẵn sàng implement  
**Note:** Xem `SPRINT-SCOPE-DO-DONT.md` để biết scope chính xác và các quyết định cứng

---

## 🎯 TỔNG QUAN

### **Mục tiêu chính:**
1. ✅ Tuân thủ Base App Featured Guidelines
2. ✅ Implement wallet auto-connect cho Base App
3. ✅ Hide external links trong Base App
4. ✅ Implement share overlay với score card
5. ✅ Standardize game-over overlay cho tất cả games
6. ✅ Base App Welcome Screen (Logo + Slogan "PLAY.CREAT")

### **Timeline ước tính:** 14-22 hours (2-3 ngày)

---

## 📋 PHASE 1: BASE APP DETECTION & UI ADAPTATION (2-3h)

### **1.1. Base App Detection** (30min)

**Task:**
- Add inline script trong `index.html` để detect Base App
- Function: `isBaseAppEnvironment()` → check `window.ethereum?.isCoinbaseWallet` và User Agent
- Store flag: `window.__isBaseApp`

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
- `window.parent !== window` (Base App WebView KHÔNG phải iframe)
- `window.ethereum?.isBase` (không chuẩn, không documented)

**✅ Chỉ dùng:**
- `window.ethereum?.isCoinbaseWallet`
- User Agent check (`CoinbaseWallet`, `CBWallet`)

**Files:**
- `index.html` (inline script)

---

### **1.2. Hide External Links** (1h)

**Task:**
- Function: `hideExternalLinks()`
- Hide dropdown social links: `data-action="social-x"`, `data-action="social-telegram"`
- Hide share overlay buttons: `shareXBtn`, `shareTelegramBtn`
- Hide divider nếu tất cả social links bị ẩn
- Layout adjustment: center nếu chỉ còn Copy Link

**Scope:**
- ✅ Dropdown menu: Social X, Telegram links
- ✅ Share overlay: Telegram, X buttons
- ✅ Divider (nếu tất cả social links bị ẩn)
- ✅ Layout adjustment (center Copy Link)

**Files:**
- `scripts/app-v3.js` (function `hideExternalLinks()`)

---

### **1.3. Base App Welcome Screen** (1h)

**Task:**
- Create Base App Welcome Screen overlay
- Design: Logo MemePlay + Slogan "PLAY.CREAT"
- Show khi detect Base App environment
- Auto-hide sau 2-3 seconds hoặc user click
- **⚠️ QUAN TRỌNG:** Chỉ hiển thị 1 lần mỗi session (dùng sessionStorage)

**Design Specifications:**
- Full screen overlay (semi-transparent dark background)
- Centered content:
  - Logo MemePlay (icon, size: ~120-150px)
  - Slogan "PLAY.CREAT" (font size: 24-32px, color: #ffb642)
  - Subtle animation (fade in, scale up)

**Files:**
- `index.html` (HTML overlay)
- `index.html` (CSS animation)
- `scripts/app-v3.js` (JavaScript logic)

---

### **1.4. Conditional UI Logic** (30min)

**Task:**
- Call `hideExternalLinks()` khi detect Base App
- Show Base App Welcome Screen khi detect Base App
- Test trên Desktop → links visible, no welcome screen
- Test trên Base App → links hidden, welcome screen shows

**Files:**
- `scripts/app-v3.js` (conditional logic)

---

**Deliverables Phase 1:**
- ✅ Base App detection working (chuẩn: `isCoinbaseWallet` + UA)
- ✅ External links hidden trong Base App
- ✅ UI layout adjusted correctly
- ✅ Welcome screen hiển thị khi detect Base App

---

## 📋 PHASE 2: WALLET AUTO-CONNECT (2-3h)

### **2.1. Auto-Connect Logic** (1.5h)

**Task:**
- Function: `autoConnectWallet()`
- Check `isBaseAppEnvironment()` (dùng `isCoinbaseWallet` + UA, không dùng `window.parent`)
- Call `eth_accounts` (silent check)
- If accounts exist → auto-connect, update UI state
- If empty → call `eth_requestAccounts` (Base App only)
- Handle edge cases: wallet not available, user rejects, etc.

**Logic Flow:**
1. Detect Base App environment
2. On load:
   - Call `eth_accounts` (silent check)
   - If accounts exist → auto-connect without UI
   - If empty → call `eth_requestAccounts` (Base App only)
3. For non-Base environments → keep manual connect flow

**Files:**
- `scripts/app-v3.js` (function `autoConnectWallet()`)

---

### **2.2. UI State Management** (1h)

**Task:**
- Hide "Connect Wallet" button trong Base App
- Show wallet status sau khi auto-connect
- Update `getUserId()` → Base App wallet priority
- **⚠️ QUAN TRỌNG:** Implement Username Display Rule (MemePlay → ENS → "Player", KHÔNG hiển thị 0x)

**UI Changes:**
- Base App → hide "Connect Wallet" button completely
- Desktop/Telegram → show "Connect Wallet" button as usual
- Show wallet status badge sau khi auto-connect

**Files:**
- `scripts/app-v3.js` (UI state management)
- `index.html` (conditional hide/show button)

---

### **2.3. Testing** (30min)

**Task:**
- Test auto-connect trong Base App
- Test manual connect trong Desktop
- Test edge cases (wallet not available, user rejects)

**Files:**
- Test trên Base App webview
- Test trên Desktop browser

---

**Deliverables Phase 2:**
- ✅ Wallet auto-connect working trong Base App
- ✅ "Connect Wallet" button hidden trong Base App
- ✅ Manual connect vẫn hoạt động trong Desktop/Telegram

---

## 📋 PHASE 3: SHARE OVERLAY VỚI SCORE CARD (3-4h)

### **3.1. Leaderboard Query** (1h)

**Task:**
- Function: `queryLeaderboard(gameId, userId)`
- Query Supabase để get score, rank, percentile
- Handle errors gracefully

**Query Logic:**
- Get user score từ leaderboard
- Calculate rank (#X)
- Calculate percentile (Top X%)
- Return: `{ score, rank, percentile, gameName }`

**Files:**
- `scripts/app-v3.js` (function `queryLeaderboard()`)

---

### **3.2. Score Card UI** (1.5h)

**Task:**
- Redesign share overlay layout (bottom sheet style, white background)
- Display score card với:
  - Game name
  - Score
  - Rank (#X)
  - Percentile (Top X%) - chỉ hiển thị trong UI, không thêm vào share text
- Auto-generate share text: "Got {score} in {gameName}! Rank #{rank}" (English)
- **⚠️ QUAN TRỌNG:** Share text V1 - KHÔNG thêm percentile vào share text

**Design:**
- Bottom 1/3 screen (white background overlay)
- Title: "Share Score" - 28px font
- Description: "Share your score with your friends!" - 16px font
- Score card: Game name, Score, Rank, Percentile
- 2 large buttons (vuông, bo góc, ~90px):
  - Copy Link (blue button)
  - Share (Web Share API, green button)
- Close button: Full width, bottom, black background

**Files:**
- `index.html` (HTML structure)
- `style.css` hoặc inline CSS (styling)
- `scripts/app-v3.js` (display logic)

---

### **3.3. Web Share API Integration** (1h)

**Task:**
- Function: `handleShareScore(gameId, score, rank)`
- Use `navigator.share()` nếu available (native sharing experience without navigating away)
- Fallback: Copy to clipboard
- Update `openShareOverlay()` → `openShareOverlayWithScore()`

**⚠️ IMPORTANT - Wording:**
- ✅ Use "native sharing experience without navigating away from the app"
- ❌ KHÔNG dùng wording "no external redirects" (Base reviewer không thích)

**Share Text Format:**
- Format: "Got {score} in {gameName}! Rank #{rank}"
- Language: English

**Files:**
- `scripts/app-v3.js` (function `handleShareScore()`)

---

### **3.4. Testing** (30min)

**Task:**
- Test share flow
- Test Web Share API
- Test clipboard fallback
- Test score card display

**Files:**
- Test trên Base App webview
- Test trên Desktop browser

---

**Deliverables Phase 3:**
- ✅ Share overlay với score card
- ✅ Web Share API integration
- ✅ Auto-generate share text
- ✅ Copy fallback works

---

## 📋 PHASE 4: STANDARD GAME-OVER OVERLAY (4-5h)

### **4.1. Standard Overlay HTML/CSS** (1.5h)

**Task:**
- Create standard game-over overlay trong `index.html`
- Design:
  - Black, semi-transparent overlay (backdrop-blur)
  - Logo: 180x180px
  - Score: 40px font, 0.65 line-height
  - Story area: 1/5 screen height
  - Share button: 50x50px (trong overlay)
  - Background game screen vẫn visible (blurred)
- CSS: `backdrop-filter: blur(10px)`

**Design Specifications:**
- Overlay: `position: fixed`, `inset: 0`, `background: rgba(0,0,0,0.7)`
- Backdrop blur: `backdrop-filter: blur(10px)`
- Centered content:
  - Logo: 180x180px
  - Score: 40px font, 0.65 line-height
  - Story area: 1/5 screen height (flexible)
  - Share button: 50x50px
  - Play Again button

**Files:**
- `index.html` (HTML structure)
- `index.html` hoặc `style.css` (CSS styling)

---

### **4.2. PostMessage Listener** (1h)

**Task:**
- Listen for `SHOW_GAME_OVER` postMessage trong `app-v3.js`
- Parse data: `score`, `logoUrl`, `storyText`, `gameId`
- Display standard overlay với data
- Share button → open share overlay với score card (native sharing experience)

**PostMessage Format:**
```javascript
{
  type: 'SHOW_GAME_OVER',
  score: number,
  logoUrl: string,
  storyText: string,
  gameId: string
}
```

**Files:**
- `scripts/app-v3.js` (postMessage listener)

---

### **4.3. Game Integration** (2h)

**Task:**
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

**Games cần update:**
- Tất cả games trong `games/templates-v2/*/game.js`
- Remove custom game-over overlay code
- Replace với postMessage

**Files:**
- `games/templates-v2/*/game.js` (tất cả games)

---

### **4.4. Testing** (30min)

**Task:**
- Test với 1-2 games trước
- Verify overlay hiển thị đúng
- Test share button flow
- Test với tất cả games

**Files:**
- Test trên Base App webview
- Test trên Desktop browser

---

**Deliverables Phase 4:**
- ✅ Standard game-over overlay component
- ✅ PostMessage listener working
- ✅ Tất cả games updated

---

## 📋 PHASE 5: TESTING & POLISH (2-3h)

### **5.1. Integration Testing** (1.5h)

**Task:**
- Test tất cả features trên Base App
- Test trên Desktop/Telegram (đảm bảo không bị ảnh hưởng)
- Test edge cases

**Test Checklist:**
- ✅ Base App detection works
- ✅ External links hidden trong Base App
- ✅ Welcome screen shows trong Base App
- ✅ Wallet auto-connect works
- ✅ Share overlay với score card works
- ✅ Standard game-over overlay works
- ✅ Tất cả games use standard overlay
- ✅ No regressions trên Desktop/Telegram

---

### **5.2. UI/UX Polish** (1h)

**Task:**
- Check responsive design
- Check animations/transitions
- Check accessibility
- Verify all UI elements display correctly

**Polish Items:**
- Responsive design (mobile, tablet, desktop)
- Animations smooth
- Loading states
- Error messages clear
- Accessibility (ARIA labels, keyboard navigation)

---

### **5.3. Documentation** (30min)

**Task:**
- Update README nếu cần
- Document API changes
- Document new features

---

**Deliverables Phase 5:**
- ✅ Tất cả features working
- ✅ No regressions
- ✅ UI/UX polished

---

## 📊 TỔNG HỢP TASKS

### **Files to Modify:**

1. **`index.html`**
   - ✅ Add Base App detection script (inline) - dùng `isCoinbaseWallet` + UA
   - ✅ Add Base App Welcome Screen HTML (Logo + Slogan "PLAY.CREAT")
   - ✅ Add standard game-over overlay HTML
   - ✅ Conditional hide/show elements

2. **`scripts/app-v3.js`**
   - ⏳ Add `isBaseAppEnvironment()` function
   - ⏳ Add `hideExternalLinks()` function
   - ⏳ Add `autoConnectWallet()` function
   - ⏳ Enhance `openShareOverlay()` → `openShareOverlayWithScore()`
   - ⏳ Add `queryLeaderboard()` function
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

## ⚠️ TẠM BỎ QUA (CHƯA LÀM)

### **1. Base App Avatar Integration** ❌ **KHÔNG LÀM TRONG SPRINT NÀY**
- ❌ **Priority: P2 - Làm sau khi list**
- ❌ **Không thảo luận lại trong sprint này**
- File: `base miniapp/BASE-APP-AVATAR-INTEGRATION.md` (đã có document)
- **Lý do:** Chưa có API chính thức, không tăng xác suất Featured, chỉ tăng rủi ro & delay

### **2. Pull-to-Refresh Fix** ❌ **KHÔNG TỐI ƯU**
- ⏸️ Tạm bỏ qua
- Có thể là limitation của Base App webview
- Đã thử nhiều cách nhưng chưa thành công
- **Focus vào features khác trước**

---

## 🎯 PRIORITY ORDER

### **P0 (Critical - Phải làm):**
1. ✅ Phase 1: Base App Detection & UI Adaptation
2. ✅ Phase 2: Wallet Auto-Connect
3. ✅ Phase 3: Share Overlay với Score Card
4. ✅ Phase 4: Standard Game-Over Overlay

### **P1 (High - Nên làm):**
5. ✅ Phase 5: Testing & Polish

### **P2 (Medium - Có thể làm sau):**
6. ⏸️ Base App Avatar Integration (tạm bỏ qua)
7. ⏸️ Pull-to-Refresh Fix (tạm bỏ qua)

---

## 📅 TIMELINE ESTIMATE

| Phase | Tasks | Estimated Time | Dependencies |
|-------|-------|----------------|--------------|
| **Phase 1** | Detection & UI Adaptation + Welcome Screen | 2-3h | None |
| **Phase 2** | Wallet Auto-Connect | 2-3h | Phase 1 |
| **Phase 3** | Share Overlay với Score Card | 3-4h | Phase 1 |
| **Phase 4** | Standard Game-Over Overlay | 4-5h | Phase 3 |
| **Phase 5** | Testing & Polish | 2-3h | All phases |

**Total:** 13-18 hours (2-3 ngày)

---

## ✅ SUCCESS CRITERIA

### **Phase 1: Detection & UI**
- ✅ Base App được detect correctly (chuẩn: `isCoinbaseWallet` + UA)
- ✅ External links hidden trong Base App
- ✅ Links visible trong Desktop/Telegram
- ✅ Layout adjusted correctly
- ✅ Welcome screen hiển thị khi detect Base App

### **Phase 2: Wallet**
- ✅ Wallet auto-connect trong Base App
- ✅ "Connect Wallet" button hidden trong Base App
- ✅ Manual connect vẫn hoạt động trong Desktop/Telegram

### **Phase 3: Share Overlay**
- ✅ Score card hiển thị correctly
- ✅ Web Share API works (native sharing experience)
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

## 🔍 KEY TECHNICAL DECISIONS

### **1. Base App Detection**
- ✅ Chỉ dùng: `window.ethereum?.isCoinbaseWallet` + User Agent
- ❌ KHÔNG dùng: `window.parent !== window`, `window.ethereum?.isBase`

### **2. Share API Wording**
- ✅ Use: "native sharing experience without navigating away from the app"
- ❌ KHÔNG dùng: "no external redirects"

### **3. Standard Game-Over Overlay**
- ✅ Tất cả games dùng chung standard overlay
- ✅ Games chỉ cần gửi postMessage
- ✅ Parent window hiển thị overlay

### **4. Welcome Screen**
- ✅ Show khi detect Base App
- ✅ Auto-hide sau 2-3s hoặc user click
- ✅ Logo + Slogan "PLAY.CREAT"

---

## ❓ QUESTIONS CẦN LÀM RÕ

### **1. Game Integration Priority**
**Question:** Có nên update tất cả games cùng lúc, hay update từng game một?

**Current Plan:** Update tất cả games

**Recommendation:** Update 1-2 games trước để test, sau đó update tất cả

---

### **2. Testing Strategy**
**Question:** Có test environment nào cho Base App không? Hay phải test trực tiếp trên production?

**Current Plan:** Test trên production

**Recommendation:** Có thể setup staging environment nếu cần

---

### **3. Share Text Format**
**Question:** Có cần thêm percentile vào share text không?

**Current Plan:** "Got {score} in {gameName}! Rank #{rank}"

**Optional:** "Got {score} in {gameName}! Rank #{rank} (Top X%)"

---

## 📚 RELATED DOCUMENTS

1. **`base miniapp/MENTOR-REVIEW-SUMMARY.md`** - Chi tiết implementation plan
2. **`base miniapp/IMPLEMENTATION-PLAN.md`** - Original implementation plan
3. **`base miniapp/CODE-STRUCTURE-COMPARISON.md`** - So sánh code structure
4. **`base miniapp/BASE-APP-AVATAR-INTEGRATION.md`** - Base App avatar (tạm bỏ qua)
5. **`base miniapp/TEST-CHECKLIST.md`** - Testing checklist

---

## 🚀 NEXT STEPS

1. **Review Tasks:** ✅ Đang làm (document này)
2. **Bàn bạc với Team:** ⏳ Chờ review
3. **Start Implementation:** ⏳ Chờ approval
4. **Phase 1:** Base App Detection & UI Adaptation + Welcome Screen
5. **Phase 2:** Wallet Auto-Connect
6. **Phase 3:** Share Overlay với Score Card
7. **Phase 4:** Standard Game-Over Overlay
8. **Phase 5:** Testing & Polish
9. **Deploy:** Up lên production và test

---

**Last Updated:** 2024-12-19  
**Status:** ✅ **MENTOR APPROVED** - Ready for Implementation  
**Note:** 
- Base App Avatar Integration: ❌ **KHÔNG LÀM TRONG SPRINT NÀY** (P2 - Làm sau khi list)
- Xem `SPRINT-SCOPE-DO-DONT.md` để biết scope chính xác và 3 quyết định cứng

