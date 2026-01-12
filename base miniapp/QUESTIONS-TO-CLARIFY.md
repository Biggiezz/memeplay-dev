# ❓ CÂU HỎI CẦN LÀM RÕ

> **Mục tiêu:** Tổng hợp các câu hỏi cần hỏi user trước khi implement

---

## ✅ ĐÃ LÀM RÕ

### 1. Base App Redirect Behavior
- ✅ Base App redirect về domain root (`memeplay.dev`)
- ✅ Base App load `index.html` (không phải `base-mini-app.html`)
- ✅ Không cần file riêng cho Base App

### 2. Standard Game-Over Overlay
- ✅ Quy chuẩn tất cả game-over overlay về cùng một design
- ✅ Logo: 180x180px
- ✅ Score: 40px font, 0.65 line-height
- ✅ Story area: 120-150px height
- ✅ Share button: 50x50px
- ✅ Approach: Standard component trong parent window

### 3. Share Overlay với Score Card
- ✅ Share overlay hiển thị score card (score, rank, game name, percentile)
- ✅ Web Share API + Copy fallback
- ✅ Bottom sheet style (white background, bottom 1/3 screen)

### 4. Files Cleanup
- ✅ Đã xóa `base-mini-app.html`
- ✅ Đã xóa `scripts/app-base.js`

---

## ❓ CÂU HỎI CẦN LÀM RÕ

### 1. External Links/Redirects - Scope
**Câu hỏi:**
- Tất cả external links/redirects phải ẩn trong Base App đúng không?
- Có external links nào khác ngoài social links (X/Twitter, Telegram) không?
- Có external redirect nào khác cần ẩn không?

**Scope cần check:**
- ✅ Social links (dropdown): `data-action="social-x"`, `data-action="social-telegram"`
- ✅ Share overlay buttons: `shareXBtn`, `shareTelegramBtn`
- ❓ External links trong footer/header?
- ❓ Links trong game descriptions/comments?
- ❓ External URLs trong game configs?

**Status:** ✅ Đã bao gồm trong Implementation Plan (Phase 1)

---

### 2. Share Button trong Game-Over Overlay
**Câu hỏi:**
- Share button trong game-over overlay → mở share overlay với score card đúng không?
- Hay share button → trigger Web Share API trực tiếp?

**Clarification cần:**
- Flow khi click share button trong game-over overlay?
- Share overlay hiển thị ngay sau game-over, hay user phải click share button?

**Status:** ✅ **ĐÃ CLARIFY**
**Answer:** Click share button → mở share overlay với score card (giống 2 ảnh user gửi)

---

### 3. Pull-to-Refresh Fix
**Câu hỏi:**
- Pull-to-refresh vẫn chưa fix được → có cần research thêm không?
- Hay tạm thời bỏ qua và focus vào các features khác?

**Status:** ✅ **ĐÃ CLARIFY**
**Answer:** Tạm bỏ qua - có thể là limitation của Base App webview

---

### 4. Game Integration - Standard Game-Over Overlay
**Câu hỏi:**
- Tất cả games phải update để gửi postMessage `SHOW_GAME_OVER`?
- Hay chỉ một số games (mới)?
- Có games nào cần giữ game-over riêng không?

**Status:** ✅ **ĐÃ CLARIFY**
**Answer:** Tất cả games dùng cùng một bảng game-over (standard overlay)

---

### 5. Share Overlay - Auto-generate Share Text
**Câu hỏi:**
- Share text format: "Got {score} in {gameName}! Rank #{rank}" đúng không?
- Có cần thêm percentile không? ("Top X%")
- Language: English hay Vietnamese?

**Status:** ✅ **ĐÃ CLARIFY**
**Answer:** English - Format: "Got {score} in {gameName}! Rank #{rank}"

---

### 6. Web Share API - Fallback Strategy
**Câu hỏi:**
- Nếu Web Share API không support → chỉ copy to clipboard?
- Hay có fallback khác (show share overlay với Copy button)?

**Status:** ✅ Đã bao gồm trong Implementation Plan (Phase 3)

---

### 7. Wallet Auto-Connect - Edge Cases
**Câu hỏi:**
- Nếu user reject wallet connection → hiện Connect button lại?
- Hay chỉ show error message?

**Status:** ✅ Đã bao gồm trong Implementation Plan (Phase 2)

---

### 8. Priority Order
**Câu hỏi:**
- Priority order trong Implementation Plan đúng chưa?
- Có features nào cần làm trước không?

**Suggested order (từ Plan):**
1. Phase 1: Detection & UI Adaptation (hide external links)
2. Phase 2: Wallet Auto-Connect
3. Phase 3: Share Overlay với Score Card
4. Phase 4: Standard Game-Over Overlay
5. Phase 5: Testing & Polish

**Status:** ✅ Plan looks good

---

### 9. Testing Strategy
**Câu hỏi:**
- Test trên Base App webview như thế nào?
- Có test environment nào không?
- Hay test trực tiếp trên production?

**Status:** ✅ **ĐÃ CLARIFY**
**Answer:** Up lên production và test trực tiếp trên Base App

---

### 10. Timeline & Deadlines
**Câu hỏi:**
- Có deadline cụ thể không?
- Timeline 14-22 hours (2-3 days) có OK không?

**Status:** ✅ Đã estimate trong Plan

---

## ✅ XÁC NHẬN: HIDE EXTERNAL LINKS

### **Tất cả external links/redirects phải ẩn trong Base App**

**Đã bao gồm trong Implementation Plan:**

#### **Phase 1: Base App Detection & UI Adaptation**

**Tasks:**
1. ✅ Create detection function: `isBaseAppEnvironment()`
2. ✅ Hide Connect Wallet button trong Base App
3. ✅ **Hide social links (dropdown + share overlay) trong Base App** ← ĐÃ CÓ
4. ✅ Layout adjustment (center nếu chỉ còn Copy Link)
5. ✅ Test trên Base App webview

**External links cần hide:**
- ✅ Dropdown: `data-action="social-x"`, `data-action="social-telegram"`
- ✅ Share overlay: `shareXBtn`, `shareTelegramBtn`
- ✅ Any external `window.open()` calls
- ✅ Any external `href` links (nếu có)

**Status:** ✅ **ĐÃ CÓ TRONG WORKFLOW (Phase 1)**

---

## 📋 SUMMARY

### ✅ Đã có trong Implementation Plan:
1. ✅ Hide external links (Phase 1)
2. ✅ Wallet auto-connect (Phase 2)
3. ✅ Share overlay với score card (Phase 3)
4. ✅ Standard game-over overlay (Phase 4)
5. ✅ Testing & polish (Phase 5)

### ❓ Cần clarify:
1. ⚠️ Share button flow trong game-over overlay
2. ⚠️ Pull-to-refresh fix strategy
3. ⚠️ Game integration scope (tất cả games hay một số?)
4. ⚠️ Share text format & language
5. ⚠️ Testing approach

### ✅ Xác nhận:
- ✅ **Tất cả external links/redirects phải ẩn trong Base App**
- ✅ **Đã bao gồm trong Implementation Plan (Phase 1)**
- ✅ **Workflow đã có đầy đủ**

---

**Last Updated:** 2024-12-19

