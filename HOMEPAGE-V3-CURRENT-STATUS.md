# 📊 Homepage V3 - Current Workflow Status

> **Last Updated:** 2024  
> **Current Phase:** Phase 1-3 Completed, CSS Fix Needed

---

## ✅ Đã Hoàn Thành

### Phase 1: Setup & Game 0 Loading
- [x] ✅ **Setup Supabase client** (`initSupabaseClient()`)
- [x] ✅ **Load game list** (`loadGameListFromSupabase()` - 4 RPC calls, client sort)
- [x] ✅ **Get game 0** (`getGame0()` - game nhiều like nhất)
- [x] ✅ **Load game config** (`loadGameConfig()` - localStorage → Supabase)
- [x] ✅ **Render game card** (`renderGameCard()` - full HTML structure)
- [x] ✅ **Load game 0** (`loadGame0()` - < 1s target) ✅ **PASS: 994ms**
- [x] ✅ **Cache like counts** (`cacheLikeCounts()` - TTL 5 phút)

### Phase 2: Batch System
- [x] ✅ **Create batches** (`createBatches()` - 3 games/batch)
- [x] ✅ **Preload batch DOM** (`preloadBatchDOM()` - DOM only, no iframe)
- [x] ✅ **Init batch observer** (`initBatchObserver()` - IntersectionObserver)
- [x] ✅ **Load batch iframes** (`loadBatchIframes()` - load when scroll)

### Phase 3: Cleanup & Social
- [x] ✅ **Cleanup games** (`cleanupGames()` - remove iframes outside batch)
- [x] ✅ **Cleanup distant batches** (`cleanupDistantBatches()` - remove DOM > 2 batches)
- [x] ✅ **Bind social interactions** (`bindSocialInteractions()` - all games)
- [x] ✅ **Toggle like** (`toggleLike()` - localStorage + Supabase)
- [x] ✅ **Hydrate social counts** (`hydrateSocialCounts()` - load from Supabase)
- [x] ✅ **Background update** (`updateLikeCountsBackground()` - TTL check)

---

## ⚠️ Đang Gặp Vấn Đề

### Issue 1: Zoom In/Out - Kích thước thay đổi ❌
**Mô tả:** Khi zoom browser (Ctrl +/-, Ctrl + mouse wheel), kích thước màn hình gaming và footer bị thay đổi.

**Task:** #18 - Cố định màn hình gaming chuẩn giống production

**Nguyên nhân:**
- CSS responsive có `transform: scale()` khi zoom
- Production KHÔNG dùng `transform: scale()` - dùng fixed width/height
- CSS V3 hiện tại khác với production

**Cần fix:**
- Copy chính xác CSS từ production (không dùng transform scale)
- Desktop: `width: 720px !important` (fixed)
- Mobile: `width: min(calc(100vw - 8px), 720px)` (responsive nhưng không scale)
- Base styles: KHÔNG có `!important` (giống production)
- Desktop media query: CÓ `!important` (giống production)

---

### Issue 2: Scroll - Chỉ load được 4 games ❌
**Mô tả:** Hệ thống không cuộn được, chỉ load được 4 games cùng lúc. Không load đủ tất cả các game trên subapage.

**Task:** #19 - Load đủ tất cả các game trên subapage

**Nguyên nhân có thể:**
- Container height issue
- Batch observer không hoạt động đúng
- Games không đủ để scroll (chỉ có 4 games?)
- IntersectionObserver không detect scroll vào batch tiếp theo

**Cần check:**
- Console logs: Có thấy "Batch observer initialized" không?
- Có bao nhiêu games được load? (Console: "Created X batches")
- Container có đủ height để scroll không?
- Batch observer có trigger khi scroll không? (Console: "Batch 0 → 1")

---

### Issue 3: Social Interactions - Chỉ like được game đầu tiên ❌
**Mô tả:** 
- Chỉ like được game đầu tiên
- Nút like không tô đậm khi đã like
- Các nút footer khác không hoạt động

**Đã fix:**
- ✅ Bind events cho tất cả games (trong `preloadBatchDOM()` và `loadBatchIframes()`)
- ✅ Thêm `updateLikeButtonState()` để check và update UI
- ✅ Thêm CSS class `liked` với color `#ff4d4d`
- ✅ Thêm `stopPropagation()` để tránh conflict

**Cần test lại:**
- Click like trên game 2, 3, 4... → Nên toggle
- Like button nên tô đậm (màu đỏ) khi liked
- Comment/Share/Leaderboard buttons nên có console log

---

## 📋 Workflow Hiện Tại

### ✅ Completed Tasks

```
1. ✅ Setup Supabase client
2. ✅ Load game list (4 RPC calls, sort client-side)
3. ✅ Get game 0 (nhiều like nhất)
4. ✅ Load game config (localStorage → Supabase)
5. ✅ Render game card (full HTML structure)
6. ✅ Load game 0 (< 1s) ✅ PASS: 994ms
7. ✅ Cache like counts (TTL 5 phút)
8. ✅ Create batches (3 games/batch)
9. ✅ Preload batch DOM
10. ✅ Init batch observer
11. ✅ Load batch iframes
12. ✅ Cleanup games
13. ✅ Cleanup distant batches
14. ✅ Bind social interactions
15. ✅ Toggle like
16. ✅ Hydrate social counts
17. ✅ Background update
```

### ⚠️ Pending Tasks

```
18. ⚠️ Cố định màn hình gaming chuẩn giống production (không đổi kích thước khi zoom in/out)
19. ⚠️ Load đủ tất cả các game trên subapage (scroll và batch loading hoạt động đúng)
20. ⚠️ Test social interactions - Cần test lại sau khi fix
21. ⚠️ Test scroll back - Chưa implement
22. ⚠️ Test performance - Chưa test đầy đủ
```

---

## 🧪 Cần Test Tiếp

### ✅ Test 1: CSS Zoom Issue (Task #18)
**Mục tiêu:** Đảm bảo kích thước màn hình gaming và footer không đổi khi zoom

**Checklist:**
- [ ] **Desktop (min-width: 1024px):**
  - [ ] Zoom in (Ctrl +) → Game card vẫn 720px, không scale
  - [ ] Zoom out (Ctrl -) → Game card vẫn 720px, không scale
  - [ ] Game stage không đổi kích thước
  - [ ] Footer không đổi kích thước
  - [ ] Iframe không bị scale
- [ ] **Mobile (< 1024px):**
  - [ ] Zoom in/out → Game card responsive nhưng không scale
  - [ ] Footer không đổi kích thước
- [ ] **So sánh với Production:**
  - [ ] Test cùng zoom level trên production và V3
  - [ ] Kích thước phải giống nhau

### ✅ Test 2: Scroll & Batch Loading (Task #19)
**Mục tiêu:** Load đủ tất cả các game trên subapage, scroll mượt, batch loading hoạt động đúng

**Checklist:**
- [ ] **Console Logs:**
  - [ ] `[V3] Created X batches` → Có bao nhiêu batches? (nên > 1)
  - [ ] `[V3] Batch observer initialized for X cards` → Có bao nhiêu cards?
  - [ ] `[V3] Batch 0 → 1` → Có trigger khi scroll không?
- [ ] **Scroll Test:**
  - [ ] Scroll xuống → Games tiếp theo (batch 1, 2, 3...) có load không?
  - [ ] Scroll mượt, không lag
  - [ ] Scroll đến cuối → Tất cả games đã load chưa?
- [ ] **Container Check:**
  - [ ] `.game-container` có đủ height để scroll không?
  - [ ] Có bao nhiêu `.game-card` trong container? (nên = tổng số games)
- [ ] **Batch Loading:**
  - [ ] Batch 0 (game 0-2) load ngay
  - [ ] Batch 1 (game 3-5) load khi scroll vào viewport
  - [ ] Batch 2 (game 6-8) load khi scroll vào viewport
  - [ ] ... tiếp tục cho đến hết

### ✅ Test 3: Social Interactions (Task #20)
**Mục tiêu:** Tất cả social buttons hoạt động đúng trên tất cả games

**Checklist:**
- [ ] **Like Button:**
  - [ ] Click like trên game 1, 2, 3, 4... → Tất cả đều toggle được
  - [ ] Like button tô đậm (màu đỏ `#ff4d4d`) khi đã like
  - [ ] Like count tăng/giảm đúng
  - [ ] localStorage có key `mp_like_{gameId}` khi like
- [ ] **Comment Button:**
  - [ ] Click comment → Overlay hiện ra
  - [ ] Submit comment → Comment được lưu
  - [ ] Comment list hiển thị đúng
- [ ] **Share Button:**
  - [ ] Click share → Overlay hiện ra
  - [ ] Copy link hoạt động
- [ ] **Leaderboard Button:**
  - [ ] Click leaderboard → Overlay hiện ra
  - [ ] Leaderboard data hiển thị đúng

### ✅ Test 4: Scroll Back (Task #21)
**Mục tiêu:** Khi scroll lên lại batch cũ, games được load lại từ cache

**Checklist:**
- [ ] Scroll xuống batch 2, 3 → Games load
- [ ] Scroll lên lại batch 1, 0 → Games load lại từ cache/localStorage
- [ ] Không có lỗi console
- [ ] Performance mượt, không lag

### ✅ Test 5: Performance (Task #22)
**Mục tiêu:** Đảm bảo performance tốt, không lag, memory tối ưu

**Checklist:**
- [ ] **Game 0 Load Time:**
  - [ ] Console: `[V3] Game 0 loaded in Xms` → < 1000ms?
- [ ] **Memory Usage:**
  - [ ] Chrome DevTools → Memory tab → Check heap size
  - [ ] Scroll nhiều → Memory không tăng quá nhiều
  - [ ] Cleanup system hoạt động → Memory giảm khi scroll xa
- [ ] **Scroll Performance:**
  - [ ] Scroll mượt, không lag
  - [ ] FPS ổn định (60fps)
  - [ ] Không có jank khi load batch mới
- [ ] **Network:**
  - [ ] Network tab → Check số lượng requests
  - [ ] Iframes chỉ load khi cần (khi scroll vào viewport)

---

## 🎯 Next Steps

### Priority 1: Fix CSS (Task #18)
- [ ] Copy CSS từ production (không dùng transform scale)
- [ ] Desktop: Fixed 720px width
- [ ] Mobile: `min(100vw - 8px, 720px)`
- [ ] Test zoom in/out → Kích thước không đổi

### Priority 2: Fix Scroll Issue (Task #19)
- [ ] Debug batch observer
- [ ] Check container height
- [ ] Check có đủ games để scroll không
- [ ] Test scroll → Games tiếp theo load

---

## 📊 Test Results

### ✅ Test 1: Load Game 0 < 1s
- **Result:** ✅ **PASS** - 994ms (< 1000ms target)
- **Status:** ✅ Working

### ❌ Test 2: Batch Loading khi Scroll
- **Result:** ❌ **FAIL** - Chỉ load được 4 games, không scroll được
- **Status:** ⚠️ Need Debug

### ❌ Test 3: Cleanup System
- **Result:** ❌ **FAIL** - Không scroll được nên không test được
- **Status:** ⚠️ Blocked by scroll issue

### ⚠️ Test 4: Social Interactions
- **Result:** ⚠️ **PARTIAL** - Like button hoạt động nhưng chỉ game đầu tiên, không tô đậm
- **Status:** ⚠️ Need Fix

### ⏳ Test 5: Cache System
- **Result:** ⏳ **NOT TESTED**
- **Status:** ⏳ Pending

---

## 🔍 Debug Checklist

### Scroll Issue
- [ ] Check console: "Created X batches" - Có bao nhiêu batches?
- [ ] Check console: "Batch observer initialized for X cards" - Có bao nhiêu cards?
- [ ] Check Elements: `.game-container` có đủ height không?
- [ ] Check Elements: Có bao nhiêu `.game-card` trong container?
- [ ] Test: Scroll xuống → Console có log "Batch 0 → 1" không?

### Social Interactions
- [ ] Check: `bindSocialInteractions()` có được gọi cho tất cả games không?
- [ ] Check: `updateLikeButtonState()` có được gọi không?
- [ ] Check: localStorage có key `mp_like_{gameId}` khi click like không?
- [ ] Check: CSS class `liked` có được add vào button không?

### Zoom Issue
- [ ] Check: CSS có `transform: scale()` không? → Nên xóa
- [ ] Check: Desktop có `width: 720px !important` không?
- [ ] Test: Zoom in/out → Kích thước có thay đổi không?

---

**Current Status:** Phase 1-3 code completed, but CSS and scroll issues need fixing.

