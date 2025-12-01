# 🧪 HƯỚNG DẪN TEST FIX 3 - BLOW BUBBLE PUBLIC LINK SYNC

## ✅ ĐÃ SỬA:
- Thêm case cho `BLOW_BUBBLE` trong `handlePublicLinkClick()`
- Gọi đúng `syncBlowBubbleGameToSupabase()` thay vì `syncGameToSupabase()` (Pacman)
- Đảm bảo game được save trước khi sync

---

## 📋 TEST CASE 1: Test Save + Public Link (Happy Path)

### Bước 1: Setup
1. Mở editor: `http://127.0.0.1:5500/games/templates/`
2. Chọn template: **Blow Bubble**
3. Mở **Chrome DevTools** → Tab **Console**

### Bước 2: Upload Logo
1. Click **"Upload Logo"**
2. Chọn một logo (PNG/JPG)
3. **Check Console:**
   ```
   ✅ Blow Bubble logo uploaded!
   ```
4. **Verify:** Logo hiển thị trong preview

### Bước 3: Nhập Story
1. Nhập story: `"Test Story 123"`
2. Chọn background color (ví dụ: Purple)

### Bước 4: Save Game
1. Click button **"Save"** (hoặc **"✅ Saved"** nếu đã save)
2. **Check Console:**
   ```
   [BlowBubbleTemplate] 📤 Sending to Supabase: {
     gameId: "blow-bubble-XXXX",
     templateId: "blow-bubble",
     title: "...",
     hasStory: true,
     hasLogo: true  ← QUAN TRỌNG: Phải là true
   }
   [BlowBubbleTemplate] ✅ Supabase upsert success: ...
   ```
3. **Verify:** Button chuyển thành **"✅ Saved"** (màu xanh)

### Bước 5: Get Public Link
1. Click button **"🔗 Get Public Link"**
2. **Check Console:**
   ```
   [handlePublicLinkClick] Debug: {
     buttonTemplate: "blow-bubble",
     gameId: "blow-bubble-XXXX",
     ...
   }
   [buildPublicLinkUrl] Final publicUrl: "http://127.0.0.1:5500/play.html?game=blow-bubble-XXXX"
   ```
3. **Verify:** Button chuyển thành **"✅ Link Copied!"** (màu xanh)
4. **Verify:** Link đã được copy vào clipboard

### Bước 6: Check Background Sync
1. **Wait 2-3 seconds** sau khi click Public Link
2. **Check Console:**
   ```
   [BlowBubbleTemplate] 📤 Sending to Supabase: {
     gameId: "blow-bubble-XXXX",
     ...
     hasLogo: true  ← QUAN TRỌNG: Vẫn là true
   }
   [BlowBubbleTemplate] ✅ Supabase upsert success: ...
   ```
3. **Verify:** `button.dataset.supabaseSync = 'success'` (check trong Elements tab)

---

## 📋 TEST CASE 2: Test Public Link Khi Chưa Save

### Bước 1: Setup Fresh
1. **Refresh page** (F5)
2. Chọn template: **Blow Bubble**
3. **KHÔNG** click Save

### Bước 2: Try Get Public Link
1. Click **"🔗 Get Public Link"**
2. **Expected:** Alert hiện lên:
   ```
   "Please Save the game first before getting public link."
   ```
3. **Verify:** Link KHÔNG được copy

### Bước 3: Save Rồi Get Link
1. Click **"Save"**
2. Wait cho sync xong
3. Click **"🔗 Get Public Link"**
4. **Verify:** Link được copy thành công

---

## 📋 TEST CASE 3: Test Logo Hiển Thị Trên Trình Duyệt Khác

### Bước 1: Tạo Game Với Logo
1. Trong editor: Upload logo, nhập story, Save
2. Click **"🔗 Get Public Link"**
3. Copy link (ví dụ: `http://127.0.0.1:5500/play.html?game=blow-bubble-3426`)

### Bước 2: Test Trên Trình Duyệt Khác
1. **Mở trình duyệt khác** (hoặc Incognito window)
2. **Paste link** vào address bar
3. **Enter**

### Bước 3: Verify Logo
1. **Check:** Logo có hiển thị trong game không?
   - Logo phải hiện ở **Game Over screen** (circular, 138px)
   - Logo phải là logo bạn upload, KHÔNG phải logo mặc định
2. **Check Console:**
   ```
   [Blow Bubble] Background color updated from postMessage: ...
   Config updated: {
     LogoUrl: "data:image/...",  ← QUAN TRỌNG: Phải có logoUrl
     backgroundColor: "...",
     story: "..."
   }
   Logo updated from config
   [Game Over] Logo displayed: data:image/...  ← QUAN TRỌNG
   ```

### Bước 4: Verify Story & Background
1. **Check:** Story hiển thị đúng
2. **Check:** Background color đúng

---

## 📋 TEST CASE 4: Test Sync Function Được Gọi Đúng

### Bước 1: Setup
1. Mở editor
2. Chọn **Blow Bubble**
3. Upload logo, Save

### Bước 2: Check Sync Function
1. Click **"🔗 Get Public Link"**
2. **Check Console:**
   - **Tìm:** `syncBlowBubbleGameToSupabase` (KHÔNG phải `syncGameToSupabase`)
   - **Verify:** Có log:
     ```
     [BlowBubbleTemplate] 📤 Sending to Supabase: ...
     ```
3. **Check Network Tab:**
   - **Tìm:** Request đến `supabase.co` với RPC `upsert_user_created_game`
   - **Check Payload:**
     ```json
     {
       "p_template_id": "blow-bubble",  ← QUAN TRỌNG
       "p_fragment_logo_url": "data:image/...",  ← QUAN TRỌNG: Phải có giá trị
       ...
     }
     ```

---

## 📋 TEST CASE 5: Test Multiple Saves

### Bước 1: Save Lần 1
1. Upload logo A, Save
2. Get Public Link
3. **Note:** gameId (ví dụ: `blow-bubble-3426`)

### Bước 2: Save Lần 2 (Update)
1. Upload logo B (khác logo A)
2. Click **"Save"** (cùng gameId)
3. **Check Console:**
   ```
   [BlowBubbleTemplate] 📤 Sending to Supabase: {
     gameId: "blow-bubble-3426",  ← Cùng gameId
     hasLogo: true
   }
   ```

### Bước 3: Verify Update
1. Get Public Link (cùng gameId)
2. Mở link trên trình duyệt khác
3. **Verify:** Logo B hiển thị (KHÔNG phải logo A)

---

## 🐛 DEBUGGING CHECKLIST

### Nếu Logo KHÔNG hiện trên trình duyệt khác:

1. **Check Console (Editor):**
   - `hasLogo: true` khi save?
   - `syncBlowBubbleGameToSupabase` được gọi?
   - Có error nào không?

2. **Check Console (Play Page):**
   - `LogoUrl` có trong `Config updated`?
   - `Logo updated from config` có log?
   - Có error load logo không?

3. **Check Network Tab:**
   - Request `upsert_user_created_game` có `p_fragment_logo_url`?
   - Response có success?
   - Request `list_user_created_games` có trả về `fragment_logo_url`?

4. **Check Database:**
   - Vào Supabase Dashboard → Table `user_created_games`
   - Tìm row với `game_id = "blow-bubble-XXXX"`
   - Check column `fragment_logo_url`:
     - **NULL** → Logo không được lưu (có thể Base64 quá dài)
     - **Có giá trị** → Logo đã lưu, vấn đề ở load

5. **Check localStorage:**
   - Mở DevTools → Application → Local Storage
   - Tìm key: `blow_bubble_config_blow-bubble-XXXX`
   - Check value có `fragmentLogoUrl` không?

---

## ✅ KẾT QUẢ MONG ĐỢI

### ✅ PASS nếu:
- Logo hiển thị trên trình duyệt khác
- Console log `hasLogo: true`
- `syncBlowBubbleGameToSupabase` được gọi (KHÔNG phải `syncGameToSupabase`)
- Database có `fragment_logo_url` (KHÔNG phải NULL)

### ❌ FAIL nếu:
- Logo KHÔNG hiện trên trình duyệt khác
- Console log `hasLogo: false`
- Vẫn gọi `syncGameToSupabase` (Pacman sync)
- Database `fragment_logo_url` = NULL

---

## 📝 NOTES

1. **Fix 3 chỉ sửa sync function**, không sửa vấn đề Base64 quá dài
2. Nếu logo vẫn không hiện, có thể do:
   - Base64 quá dài → Supabase RPC truncate → DB lưu NULL
   - Cần fix thêm: Compress logo hoặc upload lên Storage

3. **Test trên production:**
   - Thay `127.0.0.1:5500` bằng `https://memeplay.dev`
   - Đảm bảo Supabase connection hoạt động

---

## 🎯 QUICK TEST (5 phút)

1. Upload logo → Save → Check console `hasLogo: true`
2. Get Public Link → Check console có `syncBlowBubbleGameToSupabase`
3. Mở link Incognito → Check logo hiện không

Nếu 3 bước trên đều PASS → Fix 3 thành công! ✅

