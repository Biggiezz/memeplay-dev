# 🧪 Homepage V3 - Test Guide

> **Mục đích:** Test toàn bộ tính năng của Homepage V3  
> **File:** `index-v3.html` + `scripts/app-v3.js`

---

## 📋 Test Checklist

### ✅ Test 1: Load Game 0 < 1s
### ✅ Test 2: Batch Loading khi Scroll
### ✅ Test 3: Cleanup System
### ✅ Test 4: Social Interactions
### ✅ Test 5: Cache System

---

## 🎯 Test 1: Load Game 0 < 1s

### Mục tiêu
Kiểm tra game 0 (nhiều like nhất) load trong < 1 giây.

### Cách test

#### Bước 1: Mở DevTools
1. Mở `index-v3.html` trong browser
2. Nhấn `F12` hoặc `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
3. Mở tab **Console**
4. Mở tab **Network** (để xem API calls)
5. Mở tab **Performance** (để đo thời gian)

#### Bước 2: Clear cache (quan trọng)
1. Trong DevTools → **Application** tab
2. **Storage** → **Clear site data**
3. Hoặc nhấn `Ctrl+Shift+Delete` → Clear cache

#### Bước 3: Reload page và đo thời gian
1. Nhấn `F5` để reload page
2. Xem Console logs:
   ```
   [V3] 🚀 Initializing Homepage V3...
   [V3] ✅ Supabase client initialized
   [V3] ✅ Loaded 50 games from pacman-template
   [V3] ✅ Loaded 20 games from blocks-8x8
   ...
   [V3] ✅ Loaded and sorted 100 games by likes
   [V3] 📊 Top 5 games: 1. playmode-xxx (50 likes), ...
   [V3] ✅ Game 0 loaded in 850ms (target: < 1000ms)
   ```

#### Bước 4: Kiểm tra kết quả

**✅ PASS nếu:**
- Console log hiển thị: `Game 0 loaded in XXXms (target: < 1000ms)`
- XXX < 1000ms
- Game 0 hiển thị trên màn hình (có iframe, có footer với social buttons)
- Không có error trong Console

**❌ FAIL nếu:**
- Thời gian > 1000ms
- Console có error (màu đỏ)
- Game 0 không hiển thị
- Iframe không load

#### Bước 5: Kiểm tra Network tab
1. Xem **Network** tab
2. Tìm các requests:
   - `list_user_created_games` (4 requests - 1 cho mỗi template)
   - `get_social_counts` (1 request cho game 0)
3. Kiểm tra:
   - Tất cả requests đều **200 OK**
   - Không có requests failed (màu đỏ)

#### Bước 6: Kiểm tra Performance tab (Optional)
1. Mở **Performance** tab
2. Click **Record** (⏺️)
3. Reload page
4. Click **Stop** (⏹️)
5. Xem timeline:
   - Game 0 should load trong < 1s
   - Không có long tasks (> 50ms)

### Kết quả mong đợi

```
✅ Game 0 load time: 850ms (< 1000ms target)
✅ Game 0 hiển thị đầy đủ (iframe + footer)
✅ Console không có errors
✅ Network requests thành công
```

---

## 🎯 Test 2: Batch Loading khi Scroll

### Mục tiêu
Kiểm tra batch system load games khi user scroll.

### Cách test

#### Bước 1: Chuẩn bị
1. Mở `index-v3.html`
2. Mở DevTools → **Console**
3. Đảm bảo Game 0 đã load xong

#### Bước 2: Kiểm tra batch structure
1. Trong Console, gõ:
   ```javascript
   // Check batches
   console.log('Batches:', window.__V3_BATCHES || 'Not exposed')
   ```
2. Hoặc xem Console logs khi page load:
   ```
   [V3] ✅ Created 34 batches (Batch 0: 1 game, others: 3 games each)
   ```

#### Bước 3: Scroll xuống từ từ
1. Scroll xuống từ từ (không scroll nhanh)
2. Quan sát Console logs:
   ```
   [V3] 📍 Batch 0 → 1
   [V3] 🎮 Loaded iframe for playmode-xxx-1
   [V3] 🎮 Loaded iframe for playmode-xxx-2
   [V3] 🎮 Loaded iframe for playmode-xxx-3
   [V3] 🗑️ Unloaded iframe for playmode-xxx-0
   ```

#### Bước 4: Kiểm tra DOM
1. Scroll đến batch 1 (games 1-3)
2. Mở DevTools → **Elements** tab
3. Tìm `.game-container`
4. Kiểm tra:
   - Có 4 game cards (game 0 + games 1-3)
   - Games 1-3 có iframe đã load (src không phải `about:blank`)
   - Game 0 vẫn có iframe (chưa bị unload)

#### Bước 5: Scroll tiếp xuống
1. Scroll đến batch 2 (games 4-6)
2. Quan sát Console:
   ```
   [V3] 📍 Batch 1 → 2
   [V3] 🎮 Loaded iframe for playmode-xxx-4
   [V3] 🎮 Loaded iframe for playmode-xxx-5
   [V3] 🎮 Loaded iframe for playmode-xxx-6
   [V3] 🗑️ Unloaded iframe for playmode-xxx-1
   [V3] 🗑️ Unloaded iframe for playmode-xxx-2
   [V3] 🗑️ Unloaded iframe for playmode-xxx-3
   ```

#### Bước 6: Kiểm tra cleanup
1. Scroll đến batch 5 (games 13-15)
2. Kiểm tra Console:
   ```
   [V3] 🗑️ Removed DOM for playmode-xxx-0 (batch 0, distance: 5)
   [V3] 🗑️ Removed DOM for playmode-xxx-1 (batch 1, distance: 4)
   ```
3. Trong **Elements** tab:
   - Games từ batch 0, 1 đã bị xóa khỏi DOM
   - Chỉ còn games từ batch 3, 4, 5, 6, 7 (currentBatch ± 2)

#### Bước 7: Test scroll mượt
1. Scroll nhanh lên xuống
2. Kiểm tra:
   - Không có lag/jank
   - Scroll mượt (60fps)
   - Console không có errors

### Kết quả mong đợi

```
✅ Batch 1 load khi scroll đến
✅ Iframes load đúng lúc (khi vào viewport)
✅ Games ngoài batch bị unload iframe (giữ DOM)
✅ Games xa (> 2 batches) bị xóa DOM
✅ Scroll mượt, không lag
```

---

## 🎯 Test 3: Cleanup System

### Mục tiêu
Kiểm tra cleanup system xóa iframe/DOM đúng cách.

### Cách test

#### Bước 1: Kiểm tra cleanup iframes
1. Load page, scroll đến batch 2
2. Mở **Elements** tab
3. Tìm game cards từ batch 0, 1
4. Kiểm tra iframe:
   ```html
   <!-- Batch 0, 1 (đã scroll qua) -->
   <iframe src="about:blank" data-lazy-src="..."></iframe>
   <!-- ✅ PASS: iframe bị unload, giữ DOM -->
   
   <!-- Batch 2 (current) -->
   <iframe src="https://..."></iframe>
   <!-- ✅ PASS: iframe đã load -->
   ```

#### Bước 2: Kiểm tra cleanup DOM
1. Scroll đến batch 5
2. Trong **Elements** tab, tìm `.game-container`
3. Đếm số game cards:
   - Should có ~15 cards (batch 3, 4, 5, 6, 7 = currentBatch ± 2)
   - Batch 0, 1, 2 đã bị xóa DOM
4. Kiểm tra Console:
   ```
   [V3] 🗑️ Removed DOM for playmode-xxx-0
   [V3] 🗑️ Removed DOM for playmode-xxx-1
   ...
   ```

#### Bước 3: Kiểm tra memory
1. Mở DevTools → **Memory** tab (hoặc **Performance** → **Memory**)
2. Take heap snapshot trước khi scroll nhiều
3. Scroll đến batch 10
4. Take heap snapshot sau
5. So sánh:
   - Memory không tăng quá nhiều (< 50MB)
   - Không có memory leak

#### Bước 4: Test edge cases
1. Scroll rất nhanh lên xuống
2. Scroll đến batch cuối cùng
3. Scroll về batch 0
4. Kiểm tra:
   - Không có errors
   - Games load lại đúng cách
   - Cleanup vẫn hoạt động

### Kết quả mong đợi

```
✅ Iframes bị unload khi scroll qua (giữ DOM)
✅ DOM bị xóa khi > 2 batches away
✅ Memory usage ổn định (< 200MB cho 100 games)
✅ Không có memory leak
✅ Edge cases hoạt động đúng
```

---

## 🎯 Test 4: Social Interactions

### Mục tiêu
Kiểm tra các button social interactions hoạt động.

### Cách test

#### Bước 1: Test Like Button
1. Load page, tìm game card
2. Click **Like button** (trái tim)
3. Kiểm tra:
   - Icon đổi màu (nếu có CSS)
   - Count tăng lên (ví dụ: 10 → 11)
   - Console log:
     ```
     [V3] 🔄 Like toggled for playmode-xxx: liked
     ```
4. Click lại để unlike:
   - Count giảm (11 → 10)
   - Console log:
     ```
     [V3] 🔄 Like toggled for playmode-xxx: unliked
     ```
5. Kiểm tra localStorage:
   - Mở DevTools → **Application** → **Local Storage**
   - Tìm key: `mp_like_playmode-xxx`
   - Value: `1` (liked) hoặc `0` (unliked)

#### Bước 2: Test Comment Button
1. Click **Comment button** (bubble icon)
2. Kiểm tra Console:
   ```
   [V3] 💬 Comments overlay for playmode-xxx
   ```
3. **Lưu ý:** Hiện tại chỉ log, chưa có overlay (TODO)

#### Bước 3: Test Share Button
1. Click **Share button** (share icon)
2. Kiểm tra Console:
   ```
   [V3] 📤 Share overlay for playmode-xxx
   ```
3. **Lưu ý:** Hiện tại chỉ log, chưa có overlay (TODO)

#### Bước 4: Test Leaderboard Button
1. Click **Leaderboard button** (trophy icon)
2. Kiểm tra Console:
   ```
   [V3] 🏆 Leaderboard overlay for playmode-xxx
   ```
3. **Lưu ý:** Hiện tại chỉ log, chưa có overlay (TODO)

#### Bước 5: Test Market Cap Button
1. Click **Market Cap button** ("...")
2. Kiểm tra Console:
   ```
   [V3] Market cap clicked for playmode-xxx
   ```
3. **Lưu ý:** Hiện tại chỉ log, chưa có implementation (TODO)

#### Bước 6: Test Social Counts Update
1. Load page
2. Xem Console logs:
   ```
   [V3] ✅ Updated social counts for playmode-xxx: 50 likes, 10 comments
   ```
3. Kiểm tra game card:
   - Like count hiển thị đúng (50)
   - Comment count hiển thị đúng (10)

#### Bước 7: Test Multiple Games
1. Scroll đến nhiều games
2. Click like trên nhiều games khác nhau
3. Kiểm tra:
   - Mỗi game có localStorage key riêng
   - Counts update đúng cho từng game
   - Không có conflicts

### Kết quả mong đợi

```
✅ Like button toggle hoạt động
✅ Counts update đúng (localStorage + UI)
✅ Comment/Share/Leaderboard buttons log đúng
✅ Social counts load từ Supabase
✅ Multiple games không conflict
```

---

## 🎯 Test 5: Cache System

### Mục tiêu
Kiểm tra cache system với TTL 5 phút.

### Cách test

#### Bước 1: Kiểm tra cache khi load lần đầu
1. Clear localStorage (DevTools → Application → Clear storage)
2. Load page
3. Xem Console:
   ```
   [V3] ✅ Cached like counts for 100 games
   ```
4. Kiểm tra localStorage:
   - Key: `mp_like_counts_cache`
   - Value: JSON object với `timestamp` và `games` array

#### Bước 2: Kiểm tra cache khi reload (chưa hết TTL)
1. Reload page (F5)
2. Xem Console:
   ```
   [V3] ✅ Using cached like counts (age: 2s)
   ```
3. Kiểm tra:
   - Không có API call `get_social_counts` cho từng game
   - Chỉ có 4 calls `list_user_created_games` (load games mới)

#### Bước 3: Kiểm tra cache expired
1. Mở DevTools → **Application** → **Local Storage**
2. Tìm `mp_like_counts_cache`
3. Edit value, thay đổi `timestamp` thành thời gian > 5 phút trước:
   ```json
   {
     "timestamp": 1000000000000,  // Thời gian cũ
     "games": [...]
   }
   ```
4. Reload page
5. Xem Console:
   ```
   [V3] ℹ️ Cache expired, will refresh
   [V3] ✅ Cached like counts for 100 games
   ```
6. Kiểm tra:
   - Cache được update với timestamp mới
   - Games được sort lại nếu có thay đổi

#### Bước 4: Test background update
1. Load page
2. Đợi 5 giây
3. Xem Console:
   ```
   [V3] 🔄 Updating like counts in background...
   [V3] ✅ Background like counts updated
   ```
4. Kiểm tra:
   - Background update không block UI
   - Cache được update
   - Không có errors

#### Bước 5: Test cache với nhiều games
1. Load page với 100+ games
2. Kiểm tra cache:
   - Cache chứa đủ 100 games
   - JSON size hợp lý (< 1MB)
   - Parse nhanh (< 10ms)

#### Bước 6: Test cache khi Supabase fail
1. Disconnect internet (hoặc block Supabase domain)
2. Load page
3. Kiểm tra:
   - Vẫn dùng cache cũ (nếu có)
   - Không có errors
   - Games vẫn hiển thị (từ cache)

### Kết quả mong đợi

```
✅ Cache được tạo khi load lần đầu
✅ Cache được dùng khi reload (chưa hết TTL)
✅ Cache được refresh khi expired
✅ Background update hoạt động
✅ Cache handle nhiều games
✅ Cache fallback khi Supabase fail
```

---

## 🔍 Debug Tips

### Console Commands

```javascript
// Check game list
console.log('Game list:', gameList)

// Check batches
console.log('Batches:', batches)

// Check loaded games
console.log('Loaded games:', Array.from(loadedGames))

// Check cache
const cache = localStorage.getItem('mp_like_counts_cache')
console.log('Cache:', JSON.parse(cache))

// Check current batch
console.log('Current batch:', currentBatchIndex)
```

### Common Issues

#### Issue 1: Game 0 không load
- **Check:** Console có errors không?
- **Fix:** Kiểm tra Supabase connection, network tab

#### Issue 2: Batch không load khi scroll
- **Check:** IntersectionObserver có hoạt động không?
- **Fix:** Kiểm tra `.game-container` có đúng selector không

#### Issue 3: Cleanup không hoạt động
- **Check:** `currentBatchIndex` có update không?
- **Fix:** Kiểm tra batch observer logic

#### Issue 4: Social counts không update
- **Check:** Supabase RPC `get_social_counts` có hoạt động không?
- **Fix:** Kiểm tra network tab, console errors

#### Issue 5: Cache không hoạt động
- **Check:** localStorage có key `mp_like_counts_cache` không?
- **Fix:** Kiểm tra TTL logic, timestamp format

---

## ✅ Final Checklist

Sau khi test xong, đảm bảo:

- [ ] Game 0 load < 1s
- [ ] Batch loading hoạt động khi scroll
- [ ] Cleanup system xóa iframe/DOM đúng
- [ ] Social interactions hoạt động (like, comment, share)
- [ ] Cache system với TTL 5 phút hoạt động
- [ ] Không có errors trong Console
- [ ] Performance tốt (scroll mượt, memory ổn)
- [ ] Edge cases hoạt động (scroll nhanh, scroll đến cuối, etc.)

---

**Happy Testing!** 🚀


