# ✅ TEST CHECKLIST - BASE APP MINI APP

> **Mục đích:** Checklist chi tiết để test kỹ lưỡng Base App mini app

---

## 🎯 TỔNG QUAN

### 4 Test Checkpoints:
1. ✅ **Local Browser Test** (Phase 2)
2. ✅ **Wallet Connection Test** (Phase 2 - Optional)
3. ✅ **Production Browser Test** (Phase 3)
4. ⭐ **Base App Integration Test** (Phase 4 - **QUAN TRỌNG NHẤT**)

---

## 🧪 TEST CHECKPOINT 1: Local Browser Testing

**Khi nào:** Sau khi code xong (Phase 1)  
**Báo bạn:** "⚠️ TEST CHECKPOINT 1: Local Browser Testing"

### Checklist:

- [ ] **Server starts:**
  - [ ] Local server chạy được (port 5500 hoặc khác)
  - [ ] Không có errors khi start server

- [ ] **App loads:**
  - [ ] URL: `http://localhost:5500/base-mini-app.html`
  - [ ] Page loads successfully
  - [ ] Header hiển thị
  - [ ] No blank page

- [ ] **Console:**
  - [ ] Open DevTools (F12)
  - [ ] Check Console tab
  - [ ] ✅ No errors (red messages)
  - [ ] ⚠️ Warnings OK (như "[Base App] Not running in Base App")
  - [ ] Check Network tab: All scripts load (200 OK)

- [ ] **JavaScript:**
  - [ ] `scripts/app-base.js` loads successfully
  - [ ] No JavaScript errors
  - [ ] Script executes without crashing

- [ ] **UI:**
  - [ ] Header hiển thị đúng
  - [ ] Logo hiển thị
  - [ ] Game list area hiển thị (hoặc loading state)
  - [ ] No broken UI elements

### Expected Results:
- ✅ App loads successfully
- ✅ Console shows: "[Base App] Not running in Base App" (OK)
- ✅ No JavaScript errors
- ✅ UI renders correctly

### Nếu có lỗi:
- Check script path: `scripts/app-base.js` có đúng không?
- Check console errors: Fix errors trước khi tiếp tục
- Check network tab: Scripts load được không?

---

## 🧪 TEST CHECKPOINT 2: Wallet Connection Testing (Optional)

**Khi nào:** Sau Local Browser Test  
**Báo bạn:** "⚠️ TEST CHECKPOINT 2: Wallet Connection Testing (Optional)"  
**Note:** Test này optional - chủ yếu để verify wallet code

### Checklist:

- [ ] **MetaMask installed:**
  - [ ] MetaMask extension installed
  - [ ] MetaMask connected to Base Sepolia (testnet)

- [ ] **App loads:**
  - [ ] URL: `http://localhost:5500/base-mini-app.html`
  - [ ] App loads successfully

- [ ] **Wallet detection:**
  - [ ] Check console: Wallet detected
  - [ ] Wallet address được lưu vào localStorage
  - [ ] Check localStorage: `mp_user_wallet` có value

- [ ] **User ID:**
  - [ ] User ID = wallet address (format: `0x...`)
  - [ ] User ID đúng format (42 chars, starts with `0x`)

### Expected Results:
- ✅ App detects wallet (nếu có)
- ✅ Wallet address được lưu
- ✅ User ID = wallet address

### Lưu ý:
- Test này optional
- Base App sẽ auto-connect wallet, không cần test thủ công
- Nếu không có MetaMask → skip test này OK

---

## 🧪 TEST CHECKPOINT 3: Production Browser Testing

**Khi nào:** Sau khi deploy (Phase 3)  
**Báo bạn:** "⚠️ TEST CHECKPOINT 3: Production Browser Testing"

### Checklist:

- [ ] **Production URL:**
  - [ ] URL: `https://memeplay.dev/base-mini-app.html`
  - [ ] HTTPS (không dùng HTTP)
  - [ ] SSL certificate valid

- [ ] **App loads:**
  - [ ] Page loads successfully
  - [ ] No blank page
  - [ ] Header hiển thị

- [ ] **Console:**
  - [ ] Open DevTools (F12)
  - [ ] Check Console tab
  - [ ] ✅ No errors
  - [ ] ⚠️ Warnings OK

- [ ] **Network:**
  - [ ] Check Network tab
  - [ ] `app-base.js` loads (200 OK)
  - [ ] `farcaster.json` loads (200 OK)
  - [ ] All assets load successfully
  - [ ] No 404 errors

- [ ] **Manifest file:**
  - [ ] URL: `https://memeplay.dev/.well-known/farcaster.json`
  - [ ] Returns valid JSON
  - [ ] Content đúng:
    - [ ] `name`: "MemePlay"
    - [ ] `description`: Có mô tả
    - [ ] `url`: URL đúng
    - [ ] `icon`: URL icon đúng

- [ ] **HTTPS:**
  - [ ] SSL certificate valid
  - [ ] No mixed content warnings
  - [ ] All resources load via HTTPS

### Expected Results:
- ✅ App loads successfully
- ✅ All files accessible
- ✅ Manifest file accessible và valid
- ✅ No JavaScript errors
- ✅ HTTPS working

### Nếu có lỗi:
- Check deployment: Files đã upload chưa?
- Check SSL: Certificate valid không?
- Check manifest: Path đúng không?
- Check CORS: Nếu có issues

---

## ⭐ TEST CHECKPOINT 4: Base App Integration Testing

**Khi nào:** Sau Production Browser Test  
**Báo bạn:** "⚠️ TEST CHECKPOINT 4: Base App Integration Testing ⭐ QUAN TRỌNG"  
**Note:** Test này **QUAN TRỌNG NHẤT** - cần test kỹ lưỡng!

### Checklist:

#### 4.1. Access Mini App

- [ ] **Open Base App:**
  - [ ] Base App installed trên mobile
  - [ ] Base App logged in

- [ ] **Access mini app:**
  - [ ] Option 1: Open URL trực tiếp: `https://memeplay.dev/base-mini-app.html`
  - [ ] Option 2: Share link và click
  - [ ] Mini app opens trong Base App

#### 4.2. Wallet Connection

- [ ] **Auto-connect:**
  - [ ] Wallet tự động connect (không cần button)
  - [ ] No "Connect Wallet" button
  - [ ] Wallet address hiển thị (nếu có UI)

- [ ] **Wallet address:**
  - [ ] Wallet address có format đúng (`0x...`)
  - [ ] Wallet address length = 42 chars
  - [ ] Wallet address được lưu vào localStorage

#### 4.3. User ID

- [ ] **User ID format:**
  - [ ] User ID = wallet address (`0x...`)
  - [ ] User ID được lưu đúng
  - [ ] User ID được dùng cho database queries

- [ ] **Database:**
  - [ ] User ID được submit cho leaderboard
  - [ ] User ID được submit cho daily check-in
  - [ ] User ID được submit cho social features

#### 4.4. Game Functionality

- [ ] **Game list:**
  - [ ] Game list loads
  - [ ] Games hiển thị
  - [ ] Click game → game loads

- [ ] **Play game:**
  - [ ] Game starts
  - [ ] Play game
  - [ ] Score increases
  - [ ] Game over screen shows

- [ ] **Score submission:**
  - [ ] Score được submit lên database
  - [ ] Leaderboard updates
  - [ ] Best score hiển thị

#### 4.5. Leaderboard

- [ ] **View leaderboard:**
  - [ ] Click leaderboard button
  - [ ] Leaderboard overlay opens
  - [ ] Top scores hiển thị

- [ ] **User rank:**
  - [ ] User rank hiển thị
  - [ ] User score hiển thị
  - [ ] Rank calculation đúng

#### 4.6. Daily Check-in

- [ ] **Daily check-in:**
  - [ ] Daily check-in button hoạt động
  - [ ] Click → streak updates
  - [ ] PLAY points tăng
  - [ ] Toast notification shows

- [ ] **Streak:**
  - [ ] Streak count hiển thị đúng
  - [ ] Streak updates khi check-in
  - [ ] Streak persists (không reset)

#### 4.7. Social Features

- [ ] **Like:**
  - [ ] Click like button
  - [ ] Like count tăng
  - [ ] Like icon changes color
  - [ ] Like saved to database

- [ ] **Comment:**
  - [ ] Click comment button
  - [ ] Comment overlay opens
  - [ ] Submit comment
  - [ ] Comment hiển thị trong list
  - [ ] Comment count updates

- [ ] **Share:**
  - [ ] Click share button
  - [ ] Share overlay opens
  - [ ] Share link generated
  - [ ] Share link copy được

#### 4.8. Error Handling

- [ ] **Network errors:**
  - [ ] Test offline mode
  - [ ] Errors handled gracefully
  - [ ] No app crashes

- [ ] **Wallet errors:**
  - [ ] Test wallet disconnect
  - [ ] Test wallet switch
  - [ ] Errors handled gracefully

#### 4.9. Performance

- [ ] **Load time:**
  - [ ] App loads < 3 seconds
  - [ ] Game list loads < 5 seconds
  - [ ] No lag or stuttering

- [ ] **Memory:**
  - [ ] No memory leaks
  - [ ] App doesn't slow down after playing multiple games

#### 4.10. UI/UX

- [ ] **Mobile responsive:**
  - [ ] UI fits screen
  - [ ] No horizontal scroll
  - [ ] Buttons clickable
  - [ ] Text readable

- [ ] **Navigation:**
  - [ ] Scroll works smoothly
  - [ ] Buttons responsive
  - [ ] Overlays open/close correctly

### Expected Results:
- ✅ Wallet auto-connects
- ✅ User ID = wallet address
- ✅ All features hoạt động
- ✅ No JavaScript errors
- ✅ Performance tốt
- ✅ UI/UX mượt mà

### Nếu có lỗi:
- Check console: Base App có DevTools không?
- Check wallet: Base Wallet có sẵn không?
- Check network: CORS issues?
- Check user ID: Format đúng không?
- Check database: Queries thành công không?

---

## 📝 TEST NOTES

### Test Environment:
- **Device:** Mobile (iOS/Android)
- **App:** Base App (latest version)
- **Network:** Internet connection
- **Wallet:** Base Wallet (tự động có trong Base App)

### Test Duration:
- **Local Browser Test:** 15-30 phút
- **Wallet Connection Test:** 10-15 phút (optional)
- **Production Browser Test:** 15-30 phút
- **Base App Integration Test:** 1-2 giờ ⭐ (QUAN TRỌNG)

### Priority:
1. ⭐ **Base App Integration Test** - QUAN TRỌNG NHẤT
2. ✅ **Production Browser Test** - Cần thiết
3. ✅ **Local Browser Test** - Cần thiết
4. ⚠️ **Wallet Connection Test** - Optional

---

## ✅ KẾT LUẬN

**Test kỹ lưỡng:**
- ✅ Tất cả 4 checkpoints
- ⭐ **Đặc biệt:** Base App Integration Test (Phase 4)
- ✅ Test tất cả features
- ✅ Test error handling
- ✅ Test performance

**Sau khi test pass:**
- ✅ Mini app sẵn sàng production
- ✅ Có thể share link
- ✅ Có thể submit để list (nếu muốn)


