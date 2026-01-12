# 📋 WORKFLOW CHI TIẾT - IMPLEMENTATION BASE APP MINI APP

> **Approach:** Web3 Standard (Vanilla JS)  
> **Timeline:** 1-2 ngày  
> **Status:** Sẵn sàng để code

---

## 🎯 TỔNG QUAN WORKFLOW

### Phases:
1. **Phase 1: Code Implementation** (2-4 giờ)
2. **Phase 2: Local Testing** (1-2 giờ)
3. **Phase 3: Deployment** (30 phút)
4. **Phase 4: Base App Testing** (1-2 giờ)
5. **Phase 5: Production (Mainnet)** (Tùy chọn)

---

## 📝 PHASE 1: CODE IMPLEMENTATION

### ✅ Step 1.1: Tạo `scripts/app-base.js`

**Action:**
- Copy `scripts/app-telegram.js` → `scripts/app-base.js`
- File location: `scripts/app-base.js`

**Changes cần làm:**

1. **Remove Telegram SDK initialization:**
   ```javascript
   // REMOVE:
   (function initTelegramWebApp() {
     if (typeof window.Telegram === 'undefined' || !window.Telegram.WebApp) {
       return
     }
     const tg = window.Telegram.WebApp
     tg.expand()
     tg.ready()
   })()
   
   // REPLACE với:
   (function initBaseApp() {
     const isBaseApp = window.ethereum?.isBase || window.parent !== window;
     if (!isBaseApp) {
       console.warn('[Base App] Not running in Base App');
       return;
     }
     console.log('[Base App] Initialized');
   })()
   ```

2. **Thay đổi comment header:**
   ```javascript
   // FROM:
   // ==========================================
   // Telegram Mini App - Game Loading System
   // ==========================================
   // ✅ Telegram version of app-v3.js
   // ✅ Only difference is getUserId() - detects Telegram user instead of wallet/local
   
   // TO:
   // ==========================================
   // Base App Mini App - Game Loading System
   // ==========================================
   // ✅ Base App version of app-v3.js
   // ✅ Only difference is getUserId() - detects Base App wallet instead of Telegram/local
   ```

3. **Remove getTelegramUserId():**
   ```javascript
   // REMOVE function:
   function getTelegramUserId() { ... }
   ```

4. **Thay đổi getUserId():**
   ```javascript
   // FROM:
   function getUserId() {
     // Priority 1: Telegram user (if running inside Telegram)
     const tgUserId = getTelegramUserId()
     if (tgUserId) return tgUserId
     
     // Priority 2: Wallet (fallback if opened in browser and has wallet)
     const wallet = getWalletAddress()
     if (wallet) return wallet
     
     // Priority 3: Local anonymous user
     return getLocalUserId()
   }
   
   // TO:
   function getUserId() {
     // Priority 1: Base App wallet (if running in Base App)
     const isBaseApp = window.ethereum?.isBase || window.parent !== window;
     if (isBaseApp) {
       const wallet = getWalletAddress()
       if (wallet) return wallet // Format: "0x..."
     }
     
     // Priority 2: Local anonymous user
     return getLocalUserId()
   }
   ```

5. **Thêm auto-connect wallet (optional - nếu cần):**
   ```javascript
   // Add after getUserId():
   async function connectBaseWallet() {
     const isBaseApp = window.ethereum?.isBase || window.parent !== window;
     if (!isBaseApp || !window.ethereum) return null;
     
     try {
       const accounts = await window.ethereum.request({ method: 'eth_accounts' });
       if (accounts && accounts.length > 0) {
         const address = accounts[0];
         localStorage.setItem('mp_user_wallet', address);
         return address;
       }
     } catch (error) {
       console.warn('[Base App] Wallet connection failed:', error);
     }
     return null;
   }
   
   // Call in initBaseApp():
   (function initBaseApp() {
     const isBaseApp = window.ethereum?.isBase || window.parent !== window;
     if (!isBaseApp) return;
     
     // Auto-connect wallet
     connectBaseWallet().then(address => {
       if (address) {
         console.log('[Base App] Wallet connected:', address);
       }
     });
   })()
   ```

**Checkpoint:** ✅ File `scripts/app-base.js` đã tạo và thay đổi xong

---

### ✅ Step 1.2: Tạo `base-mini-app.html`

**Action:**
- Copy `telegram mini app/telegram-mini-app.html` → `base-mini-app.html`
- File location: `base-mini-app.html` (root folder)

**Changes cần làm:**

1. **Change title:**
   ```html
   <!-- FROM: -->
   <title>MemePlay - Telegram</title>
   
   <!-- TO: -->
   <title>MemePlay - Base App</title>
   ```

2. **Remove Telegram SDK:**
   ```html
   <!-- REMOVE: -->
   <script src="https://telegram.org/js/telegram-web-app.js"></script>
   ```

3. **Change script:**
   ```html
   <!-- FROM: -->
   <script type="module" src="scripts/app-telegram.js?v=5"></script>
   
   <!-- TO: -->
   <script type="module" src="scripts/app-base.js?v=1"></script>
   ```

4. **Update meta tags (optional):**
   ```html
   <!-- Có thể update description nếu muốn -->
   <meta name="description" content="MemePlay - Play games on Base App">
   ```

**Checkpoint:** ✅ File `base-mini-app.html` đã tạo và thay đổi xong

---

### ✅ Step 1.3: Tạo `/.well-known/farcaster.json`

**Action:**
- Tạo folder `.well-known` (nếu chưa có)
- Tạo file `farcaster.json` trong folder `.well-known`
- File location: `/.well-known/farcaster.json`

**Content:**
```json
{
  "version": "1.0",
  "name": "MemePlay",
  "description": "Play games and earn rewards on Base App",
  "icon": "https://memeplay.dev/assets/favicon.svg",
  "url": "https://memeplay.dev/base-mini-app.html",
  "splash": {
    "image": "https://memeplay.dev/assets/favicon.svg",
    "backgroundColor": "#111111"
  }
}
```

**Lưu ý:**
- Thay `memeplay.dev` bằng domain thật của bạn
- `icon` và `splash.image` có thể dùng favicon hoặc logo riêng
- `splash.backgroundColor` nên match với theme của app

**Checkpoint:** ✅ File `/.well-known/farcaster.json` đã tạo

---

### ✅ Step 1.4: Verify Code Changes

**Checklist:**
- [ ] `scripts/app-base.js` đã remove Telegram code
- [ ] `scripts/app-base.js` đã thay đổi `getUserId()`
- [ ] `base-mini-app.html` đã remove Telegram SDK
- [ ] `base-mini-app.html` đã update script path
- [ ] `/.well-known/farcaster.json` đã tạo với content đúng

**Checkpoint:** ✅ Code implementation hoàn tất

---

## 🧪 PHASE 2: LOCAL TESTING

### ⚠️ **TEST CHECKPOINT 1: Local Browser Testing**

**Action:**
- Test app trên local browser (không cần Base App)
- Kiểm tra app có load không, có lỗi console không

**Test steps:**

1. **Start local server:**
   ```bash
   # Option 1: Dùng script có sẵn
   npm run dev
   
   # Option 2: Dùng Python
   python -m http.server 5500
   
   # Option 3: Dùng serve
   npx serve -l 5500
   ```

2. **Open browser:**
   - URL: `http://localhost:5500/base-mini-app.html`
   - Browser: Chrome/Edge/Firefox

3. **Check console:**
   - Open DevTools (F12)
   - Check Console tab
   - ✅ Không có lỗi (errors)
   - ⚠️ Warnings OK (như "[Base App] Not running in Base App")

4. **Check functionality:**
   - ✅ Page loads
   - ✅ Header hiển thị
   - ✅ Game list loads (hoặc loading state)
   - ✅ No JavaScript errors

**Expected results:**
- ✅ App loads successfully
- ✅ Console shows: "[Base App] Not running in Base App" (OK - vì không trong Base App)
- ✅ No JavaScript errors
- ✅ Game list loads (hoặc shows loading)

**Nếu có lỗi:**
- Check script path: `scripts/app-base.js` có đúng không?
- Check console errors: Fix errors trước
- Check network tab: Scripts load được không?

**Checkpoint:** ✅ Local browser test pass

---

### ⚠️ **TEST CHECKPOINT 2: Wallet Connection Testing (Optional)**

**Action:**
- Test wallet connection trên local browser
- Cần MetaMask hoặc Base Wallet extension

**Test steps:**

1. **Install MetaMask (nếu chưa có):**
   - Install MetaMask extension
   - Switch network sang Base Sepolia (testnet)

2. **Open app:**
   - URL: `http://localhost:5500/base-mini-app.html`

3. **Test wallet connection:**
   - App sẽ detect wallet (nhưng không phải Base App)
   - Check console: Wallet detection hoạt động

**Expected results:**
- ✅ App detects wallet (nếu có)
- ✅ Wallet address được lưu vào localStorage
- ✅ User ID = wallet address

**Lưu ý:**
- Test này optional - chủ yếu để verify wallet code hoạt động
- Base App sẽ auto-connect wallet, không cần test thủ công

**Checkpoint:** ✅ Wallet connection test pass (optional)

---

## 🚀 PHASE 3: DEPLOYMENT

### ✅ Step 3.1: Deploy to Server

**Action:**
- Deploy files lên server hiện tại
- Verify files accessible

**Files cần deploy:**
1. ✅ `scripts/app-base.js`
2. ✅ `base-mini-app.html`
3. ✅ `/.well-known/farcaster.json`

**Deployment steps:**

1. **Upload files:**
   - Upload `scripts/app-base.js` → `scripts/` folder
   - Upload `base-mini-app.html` → root folder
   - Upload `farcaster.json` → `/.well-known/` folder

2. **Verify files accessible:**
   - ✅ `https://memeplay.dev/base-mini-app.html` → loads
   - ✅ `https://memeplay.dev/scripts/app-base.js` → loads
   - ✅ `https://memeplay.dev/.well-known/farcaster.json` → loads (JSON format)

3. **Check HTTPS:**
   - ✅ Base App **REQUIRES HTTPS**
   - ✅ Verify SSL certificate valid

**Checkpoint:** ✅ Deployment hoàn tất

---

### ⚠️ **TEST CHECKPOINT 3: Production Browser Testing**

**Action:**
- Test app trên production URL
- Kiểm tra tất cả files load được

**Test steps:**

1. **Open browser:**
   - URL: `https://memeplay.dev/base-mini-app.html`
   - Browser: Chrome/Edge/Firefox

2. **Check console:**
   - Open DevTools (F12)
   - Check Console tab
   - ✅ No errors
   - ⚠️ Warnings OK

3. **Check network:**
   - Check Network tab
   - ✅ `app-base.js` loads (200 OK)
   - ✅ `farcaster.json` loads (200 OK)
   - ✅ All assets load

4. **Verify manifest:**
   - URL: `https://memeplay.dev/.well-known/farcaster.json`
   - ✅ Returns valid JSON
   - ✅ Content đúng (name, description, url, etc.)

**Expected results:**
- ✅ App loads successfully
- ✅ All files accessible
- ✅ Manifest file accessible
- ✅ No JavaScript errors

**Checkpoint:** ✅ Production browser test pass

---

## 📱 PHASE 4: BASE APP TESTING

### ⚠️ **TEST CHECKPOINT 4: Base App Integration Testing** ⭐ **QUAN TRỌNG**

**Action:**
- Test app trên Base App (thật)
- Kiểm tra wallet auto-connect, user ID, functionality

**Test steps:**

1. **Open Base App:**
   - Open Base App trên mobile
   - Navigate đến Mini Apps section
   - Tìm MemePlay mini app (hoặc open URL trực tiếp)

2. **Test wallet connection:**
   - ✅ Wallet tự động connect (không cần button)
   - ✅ Wallet address hiển thị (nếu có UI)
   - ✅ Check console: Wallet connected

3. **Test user ID:**
   - ✅ User ID = wallet address (`0x...`)
   - ✅ User ID được lưu vào localStorage
   - ✅ User ID được dùng cho leaderboard

4. **Test game functionality:**
   - ✅ Game list loads
   - ✅ Click game → game loads
   - ✅ Play game → score submits
   - ✅ Leaderboard hiển thị

5. **Test daily check-in:**
   - ✅ Daily check-in button hoạt động
   - ✅ Streak updates
   - ✅ PLAY points tăng

6. **Test social features:**
   - ✅ Like game → count tăng
   - ✅ Comment game → comment submit được
   - ✅ Share game → share link

**Expected results:**
- ✅ Wallet auto-connects
- ✅ User ID = wallet address
- ✅ All features hoạt động
- ✅ No JavaScript errors

**Nếu có lỗi:**
- Check console: Base App có DevTools không?
- Check wallet connection: Base Wallet có sẵn không?
- Check network: CORS issues?
- Check user ID: Format đúng không?

**Checkpoint:** ✅ Base App integration test pass

---

## 🌐 PHASE 5: SUBMIT & DISCOVERY

### ⚠️ **QUAN TRỌNG: Base App Mini App Discovery**

**Câu hỏi:** Khi nào mini app xuất hiện trên Base App?

**Trả lời:**

**1. Access trực tiếp (NGAY LẬP TỨC):**
- ✅ Mini app có thể access qua **URL trực tiếp** ngay sau khi deploy
- ✅ User có thể share link và access được
- ✅ Không cần approval để access qua URL

**2. Xuất hiện trong Mini Apps List (CẦN SUBMIT):**
- ⚠️ Để xuất hiện trong **Mini Apps list** (discoverable) → **CẦN SUBMIT**
- ⚠️ Cần submit form trên **Base Build dashboard**
- ⚠️ Có **approval process** (vài ngày đến vài tuần)
- ⚠️ Sau khi approve → xuất hiện trong Mini Apps list

**3. Để được Featured (NÂNG CẤP):**
- ⚠️ Để được **featured** (nổi bật) → cần đáp ứng requirements
- ⚠️ Cần submit qua Base Build dashboard
- ⚠️ Có guidelines về product, design, technical

**Action items:**

1. **Sau khi deploy xong (Phase 3):**
   - ✅ Mini app access được qua URL: `https://memeplay.dev/base-mini-app.html`
   - ✅ Có thể share link trực tiếp
   - ✅ User có thể access và dùng được

2. **Để xuất hiện trong Mini Apps list:**
   - ⏸️ Research Base Build dashboard
   - ⏸️ Submit mini app để review
   - ⏸️ Chờ approval (vài ngày đến vài tuần)

3. **Base Build Dashboard:**
   - ⏸️ Truy cập: Base Build dashboard (cần tìm link)
   - ⏸️ Submit form với:
     - Name: MemePlay
     - Description
     - URL: https://memeplay.dev/base-mini-app.html
     - Icon/screenshots
     - Manifest file location

**Timeline:**
- **Access qua URL:** NGAY LẬP TỨC (sau khi deploy)
- **Xuất hiện trong list:** VÀI NGÀY - VÀI TUẦN (sau khi submit + approve)
- **Featured:** CẦN REVIEW + APPROVE (có thể lâu hơn)

**Tạm thời (MVP):**
- ✅ **Focus:** Access qua URL trực tiếp
- ✅ **Share link:** User có thể dùng ngay
- ⏸️ **Submit để list:** Làm sau khi MVP test OK

---

### ✅ Step 5.1: Deploy Contracts to Mainnet (Nếu cần)

**Action:**
- Deploy smart contracts lên Base Mainnet
- Update contract addresses trong code

**Note:**
- ⚠️ Phase 1 (MVP) không cần contracts (chỉ games)
- ⚠️ Phase 2 (NFT milestones) mới cần contracts
- ✅ Có thể skip bước này cho MVP

---

## ✅ TỔNG KẾT WORKFLOW

### Timeline:
- **Phase 1 (Code):** 2-4 giờ
- **Phase 2 (Local Test):** 1-2 giờ
- **Phase 3 (Deploy):** 30 phút
- **Phase 4 (Base App Test):** 1-2 giờ
- **Total:** 5-9 giờ (1 ngày)

### Test Checkpoints:

1. ✅ **Local Browser Test** (Phase 2)
   - **Khi nào:** Sau khi code xong (Phase 1)
   - **Báo bạn:** "⚠️ TEST CHECKPOINT 1: Local Browser Testing"
   - **Mục đích:** Verify code không có lỗi

2. ✅ **Wallet Connection Test** (Phase 2 - Optional)
   - **Khi nào:** Sau Local Browser Test
   - **Báo bạn:** "⚠️ TEST CHECKPOINT 2: Wallet Connection Testing (Optional)"
   - **Mục đích:** Verify wallet code hoạt động

3. ✅ **Production Browser Test** (Phase 3)
   - **Khi nào:** Sau khi deploy (Phase 3)
   - **Báo bạn:** "⚠️ TEST CHECKPOINT 3: Production Browser Testing"
   - **Mục đích:** Verify deployment OK, files accessible

4. ⭐ **Base App Integration Test** (Phase 4 - **QUAN TRỌNG NHẤT**)
   - **Khi nào:** Sau Production Browser Test
   - **Báo bạn:** "⚠️ TEST CHECKPOINT 4: Base App Integration Testing ⭐ QUAN TRỌNG"
   - **Mục đích:** Test trên Base App thật, verify tất cả features
   - **Cần test kỹ:** Wallet, User ID, Games, Leaderboard, Daily check-in, Social features

### Next Steps:
1. ⏸️ Code implementation (Phase 1)
2. ⏸️ Local testing (Phase 2) → **BÁO BẠN TEST CHECKPOINT 1**
3. ⏸️ Deployment (Phase 3) → **BÁO BẠN TEST CHECKPOINT 3**
4. ⏸️ Base App testing (Phase 4) → **BÁO BẠN TEST CHECKPOINT 4 ⭐ QUAN TRỌNG**
5. ⏸️ Submit để list (Optional - nếu muốn)

### Test Checkpoints (Khi nào báo bạn test):

1. ✅ **Phase 2 - Local Browser Test:**
   - **Khi nào:** Sau Phase 1 (code xong)
   - **Báo bạn:** "⚠️ TEST CHECKPOINT 1: Local Browser Testing"
   - **Mục đích:** Verify code không có lỗi
   - **Xem chi tiết:** `TEST-CHECKLIST.md`

2. ✅ **Phase 2 - Wallet Connection Test (Optional):**
   - **Khi nào:** Sau Local Browser Test
   - **Báo bạn:** "⚠️ TEST CHECKPOINT 2: Wallet Connection Testing (Optional)"
   - **Mục đích:** Verify wallet code hoạt động
   - **Note:** Optional - có thể skip

3. ✅ **Phase 3 - Production Browser Test:**
   - **Khi nào:** Sau khi deploy (Phase 3)
   - **Báo bạn:** "⚠️ TEST CHECKPOINT 3: Production Browser Testing"
   - **Mục đích:** Verify deployment OK, files accessible
   - **Xem chi tiết:** `TEST-CHECKLIST.md`

4. ⭐ **Phase 4 - Base App Integration Test:**
   - **Khi nào:** Sau Production Browser Test
   - **Báo bạn:** "⚠️ TEST CHECKPOINT 4: Base App Integration Testing ⭐ QUAN TRỌNG"
   - **Mục đích:** Test trên Base App thật, verify tất cả features
   - **Cần test kỹ:** Wallet, User ID, Games, Leaderboard, Daily check-in, Social
   - **Xem chi tiết:** `TEST-CHECKLIST.md`

---

## 📝 NOTES

- ✅ Base App **REQUIRES HTTPS** (không dùng HTTP)
- ✅ Manifest file **REQUIRED** tại `/.well-known/farcaster.json`
- ⚠️ Discovery process cần research thêm
- ✅ Mini app có thể access qua URL trực tiếp
- ✅ Testing trên Base App là **QUAN TRỌNG NHẤT**

