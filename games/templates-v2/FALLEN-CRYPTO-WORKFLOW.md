# 🎯 Workflow Migrate Fallen Crypto → Template V2

## 📋 Tổng quan

**Mục tiêu:** Migrate game `games/fallen-crypto/index.html` → `games/templates-v2/fallen-crypto-template/`

**Chuẩn tham khảo:** Rocket BNB Template (đã hoàn thiện)

**Thời gian ước tính:** 2-3 giờ (với testing)

---

## ✅ Phase 1: Setup Cấu trúc File (15 phút)

### Bước 1.1: Tạo thư mục và file cơ bản
- [ ] Tạo `games/templates-v2/fallen-crypto-template/`
- [ ] Tạo `games/templates-v2/fallen-crypto-template/editor/`
- [ ] Tạo `games/templates-v2/fallen-crypto-template/assets/`
- [ ] Tạo file rỗng: `index.html`, `config.js`, `game.js`, `style.css`
- [ ] Tạo file rỗng: `editor/editor-adapter.js`

### Bước 1.2: Copy assets
- [ ] Copy `games/fallen-crypto/assets/binance-logo.webp` → `games/templates-v2/fallen-crypto-template/assets/binance-logo.webp`
- [ ] Copy `games/fallen-crypto/assets/binance-logo-white.webp` → `games/templates-v2/fallen-crypto-template/assets/binance-logo-white.webp` (nếu có)

### ✅ Checkpoint 1: Verify Structure
```bash
# Kiểm tra cấu trúc
ls games/templates-v2/fallen-crypto-template/
# Phải có: index.html, config.js, game.js, style.css, editor/, assets/
```

---

## ✅ Phase 2: Tách CSS (20 phút)

### Bước 2.1: Đọc CSS từ game gốc
- [ ] Đọc `<style>` tag từ `games/fallen-crypto/index.html` (lines 7-211)
- [ ] Copy toàn bộ CSS vào `style.css`

### Bước 2.2: Update index.html
- [ ] Thêm `<link rel="stylesheet" href="style.css">` vào `<head>`
- [ ] Xóa `<style>` tag từ `index.html` (giữ lại structure HTML)

### ✅ Checkpoint 2: Test CSS Visual
**🔴 TEST DESKTOP NGAY:**
- [ ] Mở `games/templates-v2/fallen-crypto-template/index.html` trên desktop
- [ ] Kiểm tra: Visual giống game gốc (màu sắc, layout, responsive)
- [ ] Nếu khác → Fix CSS ngay

---

## ✅ Phase 3: Tạo config.js (30 phút)

### Bước 3.1: Setup BRAND_CONFIG
- [ ] Tạo `BRAND_CONFIG` object với:
  - `brickColor: '#4a90a4'` (default)
  - `logo: null`
  - `logoUrl: ''`
  - `story: 'welcome to memeplay'`

### Bước 3.2: Import shared utilities
- [ ] Import `getGameId`, `generateGameIdUtil` từ `core/game-id-utils.js`
- [ ] Import `loadLogoImage` từ `core/logo-loader.js`

### Bước 3.3: Implement functions
- [ ] `generateGameId()` - wrapper cho `generateGameIdUtil('fallen-crypto')`
- [ ] `loadBrandConfig(gameIdOverride)` - Load từ localStorage với playtest support
- [ ] `saveBrandConfig(gameId)` - Save vào localStorage với `lastUsedStorageKey` cache

### Bước 3.4: Export và window exposure
- [ ] Export: `BRAND_CONFIG`, `loadBrandConfig`, `saveBrandConfig`, `generateGameId`, `getGameId`
- [ ] Expose trên `window` cho backward compatibility
- [ ] Call `loadBrandConfig()` khi load

### ✅ Checkpoint 3: Test config.js
**🔴 TEST DESKTOP NGAY:**
- [ ] Mở `index.html` trên desktop
- [ ] Mở Console → Kiểm tra:
  - `window.BRAND_CONFIG` có tồn tại
  - `window.getGameId()` hoạt động
  - `window.loadBrandConfig()` không lỗi
- [ ] Test localStorage: Thay đổi `BRAND_CONFIG.brickColor` → Save → Reload → Check

---

## ✅ Phase 4: Modify game.js - Part 1: Imports & Setup (20 phút)

### Bước 4.1: Copy game logic từ game gốc
- [ ] Copy toàn bộ JavaScript từ `games/fallen-crypto/index.html` (lines 240-1178)
- [ ] Paste vào `game.js`

### Bước 4.2: Thêm imports
- [ ] Import `BRAND_CONFIG`, `loadBrandConfig`, `saveBrandConfig` từ `./config.js`
- [ ] Import `getSupabaseClient` từ `../core/supabase-client.js`
- [ ] Import `loadLogoImage` từ `../core/logo-loader.js`
- [ ] Import `getGameId` từ `../core/game-id-utils.js`
- [ ] Thêm `const TEMPLATE_ID = 'fallen-crypto-template';`

### Bước 4.3: Thêm helper functions (giống Rocket BNB)
- [ ] `applyLogo(url)` - Apply logo với `loadLogoImage()`
- [ ] `applyBrandConfig({ logoUrl, story, brickColor })` - Apply config
- [ ] `loadBrandConfigFromSupabase(gameId)` - Load từ Supabase fallback

### ✅ Checkpoint 4: Test Imports
**🔴 TEST DESKTOP NGAY:**
- [ ] Mở `index.html` trên desktop
- [ ] Mở Console → Kiểm tra:
  - Không có lỗi import
  - `BRAND_CONFIG` accessible từ game.js
  - Helper functions không lỗi

---

## ✅ Phase 5: Modify game.js - Part 2: Integrate Branding (40 phút)

### Bước 5.1: Modify `getBrickColor()`
- [ ] Thay hardcode `#4a90a4` → `BRAND_CONFIG.brickColor || '#4a90a4'`

### Bước 5.2: Modify `endGame()`
- [ ] Thay `BNB_STORIES[0]` → `BRAND_CONFIG.story || 'welcome to memeplay'`
- [ ] Thay hardcode logo → `BRAND_CONFIG.logoUrl` hoặc `BRAND_CONFIG.logo`
- [ ] Update `bnbLogo` element với logo từ config

### Bước 5.3: Remove hardcoded values
- [ ] Xóa `BNB_STORIES` array (không cần nữa)
- [ ] Xóa hardcoded `assets/binance-logo.webp` (dùng từ config)

### ✅ Checkpoint 5: Test Branding Integration
**🔴 TEST DESKTOP NGAY:**
- [ ] Mở `index.html` trên desktop
- [ ] Chơi game đến game over
- [ ] Kiểm tra:
  - Story hiển thị từ `BRAND_CONFIG.story`
  - Logo hiển thị từ `BRAND_CONFIG.logoUrl` (nếu có)
  - Brick color = `BRAND_CONFIG.brickColor`
- [ ] Test thay đổi config trong Console:
  ```javascript
  BRAND_CONFIG.brickColor = '#ff0000';
  BRAND_CONFIG.story = 'Test story';
  // Restart game → Check changes
  ```

---

## ✅ Phase 6: Modify game.js - Part 3: Initialize & Messages (30 phút)

### Bước 6.1: Tạo `initializeGame()` function
- [ ] Lấy `gameId` từ `getGameId()`
- [ ] Load config từ localStorage
- [ ] Fallback: Load từ Supabase nếu không có
- [ ] Apply default config nếu vẫn không có
- [ ] Load logo nếu có URL
- [ ] Start game loop: `requestAnimationFrame(gameLoop)`
- [ ] Gửi `FALLEN_CRYPTO_GAME_READY` signal (sau 50ms delay)

### Bước 6.2: Thêm UPDATE_CONFIG listener
- [ ] Listen `UPDATE_CONFIG` message
- [ ] Update `BRAND_CONFIG` ngay lập tức
- [ ] Save to localStorage
- [ ] Apply logo nếu có

### Bước 6.3: Thêm GAME_START, GAME_SCORE, GAME_OVER messages
- [ ] `GAME_START` - Khi `startGame()` được gọi
- [ ] `GAME_SCORE` - Khi score thay đổi (trong `endGame()`)
- [ ] `GAME_OVER` - Khi `endGame()` được gọi

### Bước 6.4: Replace initialization
- [ ] Thay code init cũ → gọi `initializeGame()`
- [ ] Wrap trong `DOMContentLoaded` hoặc check `document.readyState`

### ✅ Checkpoint 6: Test Initialization & Messages
**🔴 TEST DESKTOP NGAY:**
- [ ] Mở `index.html` trên desktop
- [ ] Mở Console → Kiểm tra:
  - `FALLEN_CRYPTO_GAME_READY` message được gửi
  - Game load không lỗi
  - Config load đúng
- [ ] Test UPDATE_CONFIG:
  ```javascript
  // Trong parent window (nếu có iframe)
  window.postMessage({
    type: 'UPDATE_CONFIG',
    config: {
      logoUrl: 'data:image/png;base64,...',
      story: 'New story',
      brickColor: '#00ff00'
    }
  }, '*');
  // Check game update ngay lập tức
  ```

---

## ✅ Phase 7: Tạo editor-adapter.js (40 phút)

### Bước 7.1: Setup class structure
- [ ] Extend `BaseAdapter`
- [ ] Import: `syncGameToSupabase`, `cleanupOldGameKeys`, `generateGameIdUtil`
- [ ] Setup constructor với `editorElements`, `lastSavedGameId`, `dirty`

### Bước 7.2: Implement `load()`
- [ ] Return `{ ok: true }`

### Bước 7.3: Implement `save(forcedGameId)`
- [ ] Validate `editorElements`
- [ ] Get values từ UI: `logoPreview.src`, `storyInput.value`, `brickColors` active color
- [ ] Generate gameId nếu cần
- [ ] Cleanup old keys
- [ ] Save to localStorage
- [ ] Sync to Supabase với `syncGameToSupabase()`
- [ ] Return `{ gameId }`

### Bước 7.4: Implement `isDirty()`
- [ ] Compare current UI values với last saved config
- [ ] Return `true` nếu có thay đổi

### Bước 7.5: Implement `generateGameId()`
- [ ] Return `generateGameIdUtil('fallen-crypto')`

### Bước 7.6: Implement `syncToSupabase(gameId, config)`
- [ ] Get/create `creatorId`
- [ ] Call `syncGameToSupabase()` với:
  - `fragmentLogoUrl`: `config.logoUrl`
  - `stories`: `[config.story]`
  - `mapColor`: `config.brickColor` (dùng cho brickColor)

### ✅ Checkpoint 7: Test Editor Adapter
**🔴 TEST DESKTOP NGAY:**
- [ ] Mở editor Templates V2
- [ ] Chọn template "Fallen Crypto"
- [ ] Kiểm tra:
  - Editor UI hiển thị (logo input, story input, color picker)
  - Upload logo → Preview hiển thị
  - Nhập story → Text hiển thị
  - Chọn màu → Active state đúng
- [ ] Test Save:
  - Click "Save & Copy Link"
  - Kiểm tra localStorage có key mới
  - Kiểm tra Supabase có record mới (SQL query)
  - Copy link → Mở link → Game load với config đúng

---

## ✅ Phase 8: Đăng ký Template Registry (15 phút)

### Bước 8.1: Thêm entry vào `template-registry.js`
- [ ] Thêm `'fallen-crypto-template'` entry với:
  - `adapterPath`, `adapterName`
  - `playtestKey`, `playtestGameId`, `storagePrefix`
  - `templateUrl`
  - `messageTypes`: `FALLEN_CRYPTO_GAME_READY`, `FALLEN_CRYPTO_GAME_ERROR`
  - `uiFields`: `story`, `logo`, `brickColor` (3 màu: xanh nước biển, vàng nhạt, nâu)
  - `displayName`, `description`, `enabled: true`

### Bước 8.2: Update `play-v2.js` (nếu cần)
- [ ] Thêm template variants nếu cần normalize

### ✅ Checkpoint 8: Test Template Registry
**🔴 TEST DESKTOP NGAY:**
- [ ] Mở editor Templates V2
- [ ] Kiểm tra:
  - Template "Fallen Crypto" xuất hiện trong list
  - Click vào template → Editor load đúng
  - Play Test → Game load trong iframe
  - READY signal không timeout

---

## ✅ Phase 9: Update index.html Template (20 phút)

### Bước 9.1: Setup HTML structure
- [ ] Copy HTML structure từ game gốc (canvas, screens, buttons)
- [ ] Thêm `<script type="module" src="config.js"></script>`
- [ ] Thêm `<script type="module" src="game.js"></script>`
- [ ] Đảm bảo logo và story elements có đúng ID:
  - `<img id="bnbLogo">`
  - `<p id="bnbStory">`

### Bước 9.2: Thêm early detection script
- [ ] Thêm script trong `<head>` để detect `?game=` parameter
- [ ] Add `public-game-view` class nếu có gameId

### ✅ Checkpoint 9: Test HTML Structure
**🔴 TEST DESKTOP NGAY:**
- [ ] Mở `index.html` trên desktop
- [ ] Kiểm tra:
  - Game load không lỗi
  - Canvas hiển thị
  - Controls hoạt động
  - Game over screen hiển thị đúng

---

## ✅ Phase 10: Integration Test - Desktop (30 phút)

### Test 10.1: Editor Playtest
- [ ] Mở editor Templates V2
- [ ] Chọn template "Fallen Crypto"
- [ ] Upload logo → Preview hiển thị
- [ ] Nhập story: "Test story"
- [ ] Chọn màu gạch: Xanh nước biển
- [ ] Click "Play Test"
- [ ] Kiểm tra:
  - Game load trong iframe
  - READY signal không timeout
  - Logo hiển thị ở game over
  - Story hiển thị đúng
  - Màu gạch = xanh nước biển

### Test 10.2: Save & Copy Link
- [ ] Trong editor, click "Save & Copy Link"
- [ ] Copy link dài
- [ ] Mở link trong tab mới (desktop)
- [ ] Kiểm tra:
  - Game load với config đúng
  - Logo/story/màu gạch hiển thị đúng
  - Không có lỗi JS trong console

### Test 10.3: UPDATE_CONFIG Live Preview
- [ ] Trong editor, thay đổi logo/story/màu gạch
- [ ] Kiểm tra:
  - Game iframe tự động update (không reload)
  - Logo/story/màu gạch thay đổi ngay lập tức

### ✅ Checkpoint 10: Desktop Test Complete
**🔴 TEST DESKTOP HOÀN TẤT**
- [ ] Tất cả test trên desktop đều pass
- [ ] Không có lỗi JS
- [ ] Config load/save đúng
- [ ] Live preview hoạt động

---

## ✅ Phase 11: Integration Test - Mobile (30 phút)

### ⚠️ BÁO USER: BẮT ĐẦU TEST MOBILE

### Test 11.1: Mobile Editor
- [ ] Trên mobile, mở editor Templates V2
- [ ] Chọn template "Fallen Crypto"
- [ ] Upload logo từ mobile
- [ ] Nhập story
- [ ] Chọn màu gạch
- [ ] Click "Play Test"
- [ ] Kiểm tra:
  - Game load trong iframe
  - READY signal không timeout
  - Touch controls hoạt động

### Test 11.2: Mobile Save & Copy Link
- [ ] Trên mobile, click "Save & Copy Link"
- [ ] Copy link dài
- [ ] Mở link trong browser mới (mobile)
- [ ] Kiểm tra:
  - Game load với config đúng
  - Logo/story/màu gạch hiển thị đúng
  - Touch controls hoạt động
  - Game play được

### Test 11.3: Mobile Supabase Fallback
- [ ] Xóa localStorage trên mobile
- [ ] Mở link dài (không có localStorage)
- [ ] Kiểm tra:
  - Game load config từ Supabase
  - Logo/story/màu gạch hiển thị đúng
  - Không có lỗi

### ✅ Checkpoint 11: Mobile Test Complete
**🔴 TEST MOBILE HOÀN TẤT**
- [ ] Tất cả test trên mobile đều pass
- [ ] Config sync giữa desktop và mobile
- [ ] Supabase fallback hoạt động

---

## ✅ Phase 12: Final Polish (20 phút)

### Bước 12.1: Code cleanup
- [ ] Xóa console.log debug (giữ lại warnings/errors)
- [ ] Xóa commented code không cần
- [ ] Verify imports đầy đủ

### Bước 12.2: Documentation
- [ ] Thêm comments cho các functions quan trọng
- [ ] Document BRAND_CONFIG structure

### Bước 12.3: Final test
- [ ] Test lại toàn bộ flow trên desktop
- [ ] Test lại toàn bộ flow trên mobile
- [ ] Verify không có regression

---

## 📊 Checklist Tổng Kết

### Desktop Tests
- [ ] Editor Playtest hoạt động
- [ ] Save & Copy Link hoạt động
- [ ] UPDATE_CONFIG live preview hoạt động
- [ ] Config load/save đúng
- [ ] Không có lỗi JS

### Mobile Tests
- [ ] Mobile Editor hoạt động
- [ ] Mobile Save & Copy Link hoạt động
- [ ] Supabase fallback hoạt động
- [ ] Touch controls hoạt động
- [ ] Config sync giữa desktop/mobile

### Code Quality
- [ ] Dùng shared utilities (không duplicate)
- [ ] Error handling đầy đủ
- [ ] Code clean, có comments
- [ ] Follow Rocket BNB pattern

---

## 🎯 Kết Quả Mong Đợi

Sau khi hoàn thành:
- ✅ Template V2 hoạt động hoàn chỉnh
- ✅ Editor có thể customize: logo, story, brickColor (3 màu)
- ✅ Config sync giữa desktop và mobile
- ✅ Supabase fallback hoạt động
- ✅ Live preview hoạt động
- ✅ Code clean, dùng shared utilities

---

## ⚠️ Lưu Ý Quan Trọng

1. **Test sau mỗi phase** - Không làm hết rồi mới test
2. **Commit sau mỗi checkpoint** - Dễ rollback nếu có lỗi
3. **Báo user khi test mobile** - Phase 11
4. **Giữ game gốc V1** - Không xóa `games/fallen-crypto/`

---

**✅ Sẵn sàng bắt đầu!**



