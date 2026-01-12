# 📋 IMPLEMENTATION PLAN: BASE APP COMPLIANCE & FEATURES

> **Mục tiêu:** Tổng hợp tất cả yêu cầu và lên kế hoạch implementation để tuân thủ Base App Featured Guidelines

---

## 🎯 TỔNG HỢP YÊU CẦU

### A. YÊU CẦU TỪ USER

#### ✅ 1. Wallet Auto-Connect (HIGH PRIORITY)
**Yêu cầu:**
- Auto-connect wallet trong Base App (không cần user click)
- Hide "Connect Wallet" button trong Base App
- Show button ở Desktop/Browser

**Hiện trạng:**
- ❌ Chưa có auto-connect logic
- ❌ Button vẫn hiện trong Base App
- ❌ Chưa có `eth_requestAccounts` nếu empty

**Cần implement:**
- ✅ Auto-connect: `eth_accounts` → `eth_requestAccounts` nếu empty (Base App only)
- ✅ Hide Connect button trong Base App
- ✅ Update UI state sau auto-connect

---

#### ✅ 2. Social Links Visibility (HIGH PRIORITY)
**Yêu cầu:**
- Hide social links (X/Twitter, Telegram) trong Base App
- Giữ lại ở Desktop/Browser

**Hiện trạng:**
- ❌ Social links vẫn hiện trong Base App
- ❌ Sẽ bị block khi click (external redirect)

**Cần implement:**
- ✅ Hide dropdown: `data-action="social-x"`, `data-action="social-telegram"`
- ✅ Hide share overlay: `shareXBtn`, `shareTelegramBtn`
- ✅ Hide divider nếu tất cả social links bị ẩn
- ✅ Layout adjustment (center nếu chỉ còn Copy Link)

---

#### ✅ 3. Share Link Strategy (CRITICAL)
**Yêu cầu:**
- Share score/highlight trong Base App (in-app sharing)
- Hiển thị score card với: Game name, Score, Rank, Percentile
- Web Share API hoặc Copy to clipboard
- Không redirect ra ngoài (X/Twitter, Telegram blocked)

**Hiện trạng:**
- ❌ Share overlay không có score card
- ❌ Không hiển thị score/rank/game name
- ❌ Chỉ có Copy Link, Telegram, X buttons

**Cần implement:**
- ✅ Query leaderboard khi open share overlay
- ✅ Display score card (score, rank, game name, percentile)
- ✅ Web Share API (native share sheet)
- ✅ Copy to clipboard (fallback)
- ✅ Auto-generate share text: "Got {score} in {gameName}! Rank #{rank}"

---

#### ✅ 4. Standard Game-Over Overlay (HIGH PRIORITY)
**Yêu cầu:**
- Black semi-transparent overlay (backdrop-blur, vẫn thấy game phía sau)
- Logo user: 180x180px
- Score: font-size 40px, line-height 0.65
- Story area: 120-150px height (flexible, không cố định 1/5)
- Share button: 50x50px (trong overlay)
- Play Again button

**Hiện trạng:**
- ❌ Mỗi game có game-over overlay riêng (không đồng nhất)
- ❌ Một số game vẽ trên canvas, một số dùng HTML overlay

**Cần implement:**
- ✅ Standard game-over overlay component trong parent window (`index.html`)
- ✅ Games send postMessage: `{ type: 'SHOW_GAME_OVER', score, logoUrl, storyText, gameId }`
- ✅ Parent window hiển thị overlay standard
- ✅ Share button trong overlay → mở share overlay với score card

---

#### ✅ 5. Share Overlay với Score Card (HIGH PRIORITY)
**Yêu cầu:**
- Bottom 1/3 screen (white background overlay)
- Title: "Share Score" - 28px font
- Description: "Share your score with your friends!" - 16px font
- Score card: Game name, Score, Rank, Percentile
- 2 large buttons (vuông, bo góc, ~90px):
  - Copy Link (blue button)
  - Share (Web Share API, green button)
- Close button: Full width, bottom, black background

**Hiện trạng:**
- ❌ Share overlay không có score card
- ❌ Layout không giống reference image
- ❌ Chỉ có Copy Link, Telegram, X buttons

**Cần implement:**
- ✅ Redesign share overlay layout (bottom sheet style)
- ✅ Add score card display
- ✅ Query leaderboard để lấy score/rank
- ✅ Implement Web Share API
- ✅ Remove Telegram/X buttons trong Base App

---

#### ✅ 6. Game 0 (Pet Avatar) Removal (DONE)
- ✅ Đã xóa Pet Avatar khỏi `app-v3.js`
- ✅ Game list sort by likes DESC

---

#### ✅ 7. Base App Files Cleanup (DONE)
- ✅ Đã xóa `base-mini-app.html`
- ✅ Đã xóa `scripts/app-base.js`
- ✅ Entry point: `index.html` (chung cho Base App + Desktop)

---

### B. BASE APP COMPLIANCE REQUIREMENTS

#### ✅ 1. No External Redirects
**Rule:**
- Base App không cho phép external redirect (X/Twitter, Telegram)
- Chỉ được share trong Base App ecosystem

**Implementation:**
- ✅ Hide external share buttons trong Base App
- ✅ Use Web Share API hoặc Copy to clipboard
- ✅ No `window.open()` với external URLs

---

#### ✅ 2. In-App Sharing Only
**Rule:**
- Share functionality phải trong Base App
- Không redirect ra browser ngoài

**Implementation:**
- ✅ Web Share API (native share sheet)
- ✅ Copy to clipboard (fallback)
- ✅ Share overlay trong app (không mở external)

---

#### ✅ 3. Wallet Auto-Connect
**Rule:**
- Base App yêu cầu wallet connection
- User không cần manual connect

**Implementation:**
- ✅ Auto-connect: `eth_accounts` → `eth_requestAccounts`
- ✅ Hide Connect button trong Base App
- ✅ Show wallet status nếu connected

---

#### ✅ 4. Pull-to-Refresh Fix (ONGOING)
**Rule:**
- Không cho phép pull-to-refresh trigger browser refresh (F5)

**Hiện trạng:**
- ⚠️ Đã thử nhiều cách (CSS, JavaScript) nhưng chưa thành công
- ⚠️ User báo "vẫn bị F5" khi swipe down

**Cần research thêm:**
- ⚠️ Base App webview behavior
- ⚠️ Có thể là limitation của Base App webview

---

## 📊 PRIORITY MATRIX

| Priority | Task | Status | Estimated Time |
|----------|------|--------|----------------|
| **P0 (Critical)** | Share overlay với score card | ❌ Pending | 4-6h |
| **P0 (Critical)** | Hide social links trong Base App | ❌ Pending | 1-2h |
| **P0 (Critical)** | Wallet auto-connect | ❌ Pending | 2-3h |
| **P1 (High)** | Standard game-over overlay | ❌ Pending | 4-6h |
| **P1 (High)** | Web Share API integration | ❌ Pending | 2-3h |
| **P2 (Medium)** | Pull-to-refresh fix | ⚠️ Ongoing | TBD |
| **P3 (Low)** | Layout polish | ❌ Pending | 1-2h |

**Total Estimated Time:** 14-22 hours

---

## 🗺️ IMPLEMENTATION ROADMAP

### **Phase 1: Base App Detection & UI Adaptation (2-3h)**
**Mục tiêu:** Implement detection logic và hide/show elements dựa trên environment

**Tasks:**
1. ✅ Create detection function: `isBaseAppEnvironment()`
2. ✅ Hide Connect Wallet button trong Base App
3. ✅ Hide social links (dropdown + share overlay) trong Base App
4. ✅ Layout adjustment (center nếu chỉ còn Copy Link)
5. ✅ Test trên Base App webview

**Deliverables:**
- ✅ Detection logic hoạt động
- ✅ UI adapts correctly (hide/show elements)
- ✅ No external redirect buttons trong Base App

---

### **Phase 2: Wallet Auto-Connect (2-3h)**
**Mục tiêu:** Auto-connect wallet trong Base App

**Tasks:**
1. ✅ Implement auto-connect logic: `eth_accounts` → `eth_requestAccounts`
2. ✅ Update UI state sau auto-connect
3. ✅ Handle edge cases (wallet not available, user rejects, etc.)
4. ✅ Test auto-connect flow

**Deliverables:**
- ✅ Wallet auto-connects trong Base App
- ✅ UI updates correctly
- ✅ Edge cases handled

---

### **Phase 3: Share Overlay với Score Card (4-6h)**
**Mục tiêu:** Redesign share overlay với score card và Web Share API

**Tasks:**
1. ✅ Redesign share overlay layout (bottom sheet style, white background)
2. ✅ Query leaderboard khi open share overlay
3. ✅ Display score card (score, rank, game name, percentile)
4. ✅ Implement Web Share API
5. ✅ Auto-generate share text
6. ✅ Copy to clipboard (fallback)
7. ✅ Test share functionality

**Deliverables:**
- ✅ Share overlay với score card
- ✅ Web Share API works
- ✅ Share text auto-generated
- ✅ Copy fallback works

---

### **Phase 4: Standard Game-Over Overlay (4-6h)**
**Mục tiêu:** Create standard game-over overlay component

**Tasks:**
1. ✅ Create standard game-over overlay HTML/CSS
2. ✅ Implement postMessage listener cho `SHOW_GAME_OVER`
3. ✅ Display overlay với logo, score, story
4. ✅ Integrate share button trong overlay
5. ✅ Update games để gửi postMessage
6. ✅ Test với multiple games

**Deliverables:**
- ✅ Standard overlay component
- ✅ All games use standard overlay
- ✅ Share button trong overlay works

---

### **Phase 5: Testing & Polish (2-3h)**
**Mục tiêu:** Test tất cả features và polish UI/UX

**Tasks:**
1. ✅ Test trên Base App webview
2. ✅ Test trên Desktop browser
3. ✅ Test edge cases
4. ✅ UI/UX polish
5. ✅ Performance check

**Deliverables:**
- ✅ All features working
- ✅ UI/UX polished
- ✅ No critical bugs

---

## 🔧 TECHNICAL APPROACH

### **1. Environment Detection**
```javascript
// Centralized detection function
function isBaseAppEnvironment() {
  return window.ethereum?.isBase || window.parent !== window;
}

// Global flag
window.MEMEPLAY_IS_BASE_APP = isBaseAppEnvironment();
```

**Location:** `index.html` (inline script) hoặc `scripts/app-v3.js`

---

### **2. Conditional UI Logic**
```javascript
// Hide/show elements based on environment
if (isBaseAppEnvironment()) {
  // Hide external links
  hideExternalLinks();
  
  // Auto-connect wallet
  autoConnectWallet();
}
```

**Location:** `index.html` (DOM ready script)

---

### **3. Share Overlay với Score Card**
```javascript
// Query leaderboard khi open share
async function openShareOverlayWithScore(gameId) {
  const shareData = await getShareData(gameId); // Query leaderboard
  displayScoreCard(shareData); // Show score card
  shareOverlay.classList.add('open');
}
```

**Location:** `scripts/app-v3.js`

---

### **4. Standard Game-Over Overlay**
```javascript
// Listen for game-over message
window.addEventListener('message', (event) => {
  if (event.data?.type === 'SHOW_GAME_OVER') {
    showStandardGameOver(event.data);
  }
});
```

**Location:** `index.html` hoặc `scripts/app-v3.js`

---

## 📝 CHECKLIST TỔNG HỢP

### **A. Wallet (HIGH PRIORITY)**
- [ ] Auto-connect: `eth_accounts` → `eth_requestAccounts` nếu empty
- [ ] Hide Connect button trong Base App
- [ ] Update UI state sau auto-connect
- [ ] Handle edge cases

### **B. Social Links (HIGH PRIORITY)**
- [ ] Hide dropdown: `data-action="social-x"`, `data-action="social-telegram"`
- [ ] Hide share overlay: `shareXBtn`, `shareTelegramBtn`
- [ ] Hide divider nếu tất cả social links bị ẩn
- [ ] Layout adjustment (center nếu chỉ còn Copy Link)

### **C. Share Strategy (CRITICAL)**
- [ ] Query leaderboard khi open share overlay
- [ ] Display score card (score, rank, game name, percentile)
- [ ] Implement Web Share API
- [ ] Auto-generate share text
- [ ] Copy to clipboard (fallback)
- [ ] Remove external share buttons trong Base App

### **D. Game-Over Overlay (HIGH PRIORITY)**
- [ ] Create standard overlay component
- [ ] Implement postMessage listener
- [ ] Display logo, score, story
- [ ] Integrate share button
- [ ] Update games để gửi postMessage

### **E. Testing & Polish**
- [ ] Test trên Base App webview
- [ ] Test trên Desktop browser
- [ ] Test edge cases
- [ ] UI/UX polish

---

## 🚨 RISKS & MITIGATION

### **Risk 1: Pull-to-Refresh vẫn không fix được**
**Mitigation:**
- Research thêm về Base App webview behavior
- Có thể là limitation của Base App
- Focus vào các features khác trước

### **Risk 2: Web Share API không support**
**Mitigation:**
- Fallback to copy to clipboard
- Test trên Base App webview để confirm

### **Risk 3: Leaderboard query slow**
**Mitigation:**
- Cache leaderboard data
- Show loading state
- Optimize query

---

## 📅 TIMELINE ESTIMATE

| Phase | Tasks | Estimated Time | Dependencies |
|-------|-------|----------------|--------------|
| **Phase 1** | Detection & UI Adaptation | 2-3h | None |
| **Phase 2** | Wallet Auto-Connect | 2-3h | Phase 1 |
| **Phase 3** | Share Overlay với Score Card | 4-6h | Phase 1 |
| **Phase 4** | Standard Game-Over Overlay | 4-6h | Phase 3 |
| **Phase 5** | Testing & Polish | 2-3h | All phases |

**Total:** 14-22 hours (2-3 days)

---

## 🎯 SUCCESS CRITERIA

1. ✅ Wallet auto-connects trong Base App
2. ✅ Social links hidden trong Base App
3. ✅ Share overlay hiển thị score card
4. ✅ Web Share API works hoặc copy fallback
5. ✅ Standard game-over overlay works
6. ✅ All games use standard overlay
7. ✅ No external redirects trong Base App
8. ✅ UI adapts correctly (Base App vs Desktop)

---

## 📌 NOTES

- **Entry Point:** `index.html` (chung cho Base App + Desktop)
- **Detection:** Client-side JavaScript detection
- **Scripts:** `scripts/app-v3.js` (main script)
- **Manifest:** `/.well-known/farcaster.json` (vẫn cần)

---

**Last Updated:** 2024-12-19

