# 🎯 SPRINT SCOPE - DO / DON'T (FINAL)

> **Mục tiêu:** Chốt cứng scope cho sprint Base App integration. **KHÔNG BÀN LẠI.**

**Ngày tạo:** 2024-12-19  
**Status:** ✅ FINAL - Mentor Approved  
**Timeline:** 2-3 ngày (13-18 hours)

---

## ✅ DO (PHẢI LÀM)

### **Phase 1: Base App Detection & UI Adaptation (2-3h)**
- ✅ Detect Base App: `isCoinbaseWallet` + User Agent (KHÔNG dùng `window.parent !== window`)
- ✅ Hide external links (X, Telegram) trong Base App
- ✅ Welcome Screen: Logo + "PLAY.CREAT" (chỉ 1 lần/session - sessionStorage)
- ✅ Layout adjustment (center Copy Link nếu chỉ còn 1 button)

### **Phase 2: Wallet Auto-Connect (2-3h)**
- ✅ Auto-connect: `eth_accounts` → `eth_requestAccounts` nếu empty
- ✅ Hide "Connect Wallet" button trong Base App
- ✅ Username display rule (xem bên dưới)

### **Phase 3: Share Overlay với Score Card (3-4h)**
- ✅ Query leaderboard: score, rank
- ✅ Share text V1: `"Got {score} in {gameName}! Rank #{rank}"` (English)
- ✅ Web Share API (native sharing experience)
- ✅ Copy fallback

### **Phase 4: Standard Game-Over Overlay (4-5h)**
- ✅ Standard overlay: logo 180x180px, score 40px, story 1/5 screen
- ✅ PostMessage listener: `SHOW_GAME_OVER`
- ✅ Update tất cả games → send postMessage

### **Phase 5: Testing & Polish (2-3h)**
- ✅ Test trên Base App webview
- ✅ Test trên Desktop (no regressions)
- ✅ UI/UX polish

---

## ❌ DON'T (TUYỆT ĐỐI KHÔNG LÀM)

### **🚫 Base App Avatar Integration**
- ❌ **KHÔNG làm trong sprint này**
- ❌ Không gọi Farcaster API
- ❌ Không query avatar từ Base App
- ❌ **Priority: P2 - Làm sau khi list**
- ❌ **Không thảo luận lại trong sprint này**

### **🚫 Pull-to-Refresh Fix**
- ❌ **KHÔNG tối ưu pull-to-refresh**
- ❌ Có thể là limitation của Base App webview
- ❌ Focus vào features khác trước

### **🚫 Over-Engineering**
- ❌ Không thêm route riêng cho Base
- ❌ Không thêm logic server-side detect Base
- ❌ Không mở rộng scope (percentile, etc.)

---

## 🔴 3 QUYẾT ĐỊNH CỨNG (KHÔNG BÀN LẠI)

### **1. USERNAME DISPLAY RULE (FINAL)**

```text
USERNAME DISPLAY RULE (FINAL):

1. Nếu user có MemePlay username → dùng
2. Nếu không → dùng ENS (nếu có)
3. Nếu không → "Player"
❌ KHÔNG HIỂN THỊ 0x DƯỚI MỌI HÌNH THỨC
```

**Implementation:**
- Check MemePlay username trước
- Fallback to ENS resolver
- Fallback to "Player"
- **KHÔNG BAO GIỜ hiển thị 0x address**

---

### **2. WELCOME SCREEN - CHỈ 1 LẦN / SESSION**

```text
Welcome Screen:
- Chỉ hiển thị 1 lần mỗi session
- Lưu flag bằng sessionStorage
- Không bao giờ block gameplay hoặc wallet
```

**Implementation:**
- Check `sessionStorage.getItem('baseAppWelcomeShown')`
- Nếu chưa có → show welcome screen
- Set flag: `sessionStorage.setItem('baseAppWelcomeShown', 'true')`
- Auto-hide sau 2-3s hoặc user click
- **KHÔNG hiện lại trong cùng session**

---

### **3. SHARE TEXT V1 (FINAL)**

```text
Share text V1 (FINAL):
"Got {score} in {gameName}! Rank #{rank}"

❌ Không thêm percentile trong sprint này
```

**Implementation:**
- Format: `"Got {score} in {gameName}! Rank #{rank}"`
- Language: English
- **KHÔNG thêm percentile, emoji, hay format khác**

---

## 📋 CHECKLIST TỐI THIỂU (MUST HAVE)

### **Base App Detection:**
- [ ] `isBaseAppEnvironment()` → `isCoinbaseWallet` + UA
- [ ] Store flag: `window.__isBaseApp`

### **UI Adaptation:**
- [ ] Hide dropdown: `data-action="social-x"`, `data-action="social-telegram"`
- [ ] Hide share overlay: `shareXBtn`, `shareTelegramBtn`
- [ ] Hide divider nếu tất cả social links bị ẩn
- [ ] Welcome Screen (chỉ 1 lần/session)

### **Wallet:**
- [ ] Auto-connect: `eth_accounts` → `eth_requestAccounts`
- [ ] Hide "Connect Wallet" button trong Base App
- [ ] Username display rule (MemePlay → ENS → "Player")

### **Share Overlay:**
- [ ] Query leaderboard: score, rank
- [ ] Share text: `"Got {score} in {gameName}! Rank #{rank}"`
- [ ] Web Share API + Copy fallback

### **Game-Over Overlay:**
- [ ] Standard overlay HTML/CSS
- [ ] PostMessage listener: `SHOW_GAME_OVER`
- [ ] Update tất cả games

### **Testing:**
- [ ] Test trên Base App webview
- [ ] Test trên Desktop (no regressions)

---

## 🎯 SUCCESS CRITERIA

### **Phase 1:**
- ✅ Base App detected correctly
- ✅ External links hidden trong Base App
- ✅ Welcome Screen shows (chỉ 1 lần/session)
- ✅ Layout adjusted correctly

### **Phase 2:**
- ✅ Wallet auto-connects trong Base App
- ✅ "Connect Wallet" button hidden
- ✅ Username displays correctly (no 0x)

### **Phase 3:**
- ✅ Share overlay với score card
- ✅ Share text: `"Got {score} in {gameName}! Rank #{rank}"`
- ✅ Web Share API works

### **Phase 4:**
- ✅ Standard game-over overlay works
- ✅ Tất cả games updated

### **Phase 5:**
- ✅ All features working
- ✅ No regressions

---

## ⚠️ RED FLAGS (STOP IMMEDIATELY)

Nếu ai trong team:

1. **Đề xuất làm Base App Avatar** → **STOP. P2. Làm sau.**
2. **Đề xuất thêm percentile vào share text** → **STOP. V1 only.**
3. **Đề xuất hiện Welcome Screen mỗi reload** → **STOP. Chỉ 1 lần/session.**
4. **Đề xuất hiển thị 0x address** → **STOP. Username rule.**
5. **Đề xuất thêm route riêng cho Base** → **STOP. Client-side detection only.**

---

## 📊 TIMELINE

| Phase | Time | Status |
|-------|------|--------|
| Phase 1 | 2-3h | ⏳ Pending |
| Phase 2 | 2-3h | ⏳ Pending |
| Phase 3 | 3-4h | ⏳ Pending |
| Phase 4 | 4-5h | ⏳ Pending |
| Phase 5 | 2-3h | ⏳ Pending |
| **TOTAL** | **13-18h** | **2-3 ngày** |

---

## 🚀 NEXT STEPS

1. ✅ **Review document này với team** → Chốt scope
2. ⏳ **Start Phase 1** → Base App Detection & UI Adaptation
3. ⏳ **Implement theo checklist** → Không mở rộng scope
4. ⏳ **Test & Deploy** → Ship trong 2-3 ngày

---

## 💬 MENTOR SIGN-OFF

> **Task list này: APPROVED.**
> **Nhưng chỉ APPROVED nếu bạn CHỐT 3 quyết định cứng ở trên và KHÔNG bàn lại trong sprint này.**

Nếu bạn:
- implement đúng Phase 1 → 4
- không mở thêm scope
- ship trong 2–3 ngày

👉 **MemePlay đủ điều kiện list Base Mini App.**
👉 **Featured hay không phụ thuộc polish & traction, không phải avatar Base App.**

---

**Last Updated:** 2024-12-19  
**Status:** ✅ FINAL - Mentor Approved  
**Note:** **KHÔNG BÀN LẠI** các quyết định cứng trong sprint này.

