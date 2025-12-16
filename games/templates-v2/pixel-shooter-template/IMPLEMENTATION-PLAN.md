# 📋 Workflow Chi Tiết: Thêm Pixel Shooter Template

## ✅ Bước 1: Tạo Folder Structure (HOÀN THÀNH)
- ✅ `pixel-shooter-template/`
- ✅ `pixel-shooter-template/editor/`
- ✅ `pixel-shooter-template/assets/` (đã copy assets)

## 📝 Bước 2: Copy & Tách Game Files
**File cần tạo:**
1. `style.css` - Extract CSS từ `games/pixel-shooter/index.html` (line 8-339)
2. `game.js` - Extract JS từ `games/pixel-shooter/index.html` (line 365-2073)
3. `index.html` - HTML structure mới (chỉ có HTML + link CSS/JS/config.js)

**Chi tiết:**
- CSS: Copy từ `<style>` tag (line 8-339), bỏ thẻ `<style>`
- JS: Copy từ `<script>` tag (line 365-2073), bỏ thẻ `<script>`
- HTML: Tạo mới với structure đơn giản, link đến CSS/JS/config.js

## 📝 Bước 3: Tạo config.js
**Pattern:** Copy từ `pacman-template/config.js`
**Sửa:**
- `pacman_brand_config_` → `pixel_shooter_brand_config_`
- `pacman_brand_config_playtest` → `pixel_shooter_brand_config_playtest`
- `playtest-pacman` → `playtest-pixel-shooter`
- Template ID: `pixel-shooter-template`

## 📝 Bước 4: Tạo editor-adapter.js
**Pattern:** Copy từ `pacman-template/editor/editor-adapter.js`
**Sửa:**
- Class name: `PacmanEditorAdapter` → `PixelShooterEditorAdapter`
- Storage prefix: `pacman_brand_config_` → `pixel_shooter_brand_config_`
- Template ID: `pacman-template` → `pixel-shooter-template`
- GameId format: `playmode-pacman-XXX` → `playmode-pixel-shooter-XXX`
- Config object: **KHÔNG có `mapIndex`** (khác Pacman)
- Config object: Có `mapColor` (3 màu nhạt: #1a1a2e, #2d1b3d, #1a2e1a)

## 📝 Bước 5: Sửa game.js - READY Signal + UPDATE_CONFIG
**Thêm READY signal:**
- Sau khi game init xong (sau `game.start()` và `gameLoop()`)
- Gửi `PIXEL_SHOOTER_GAME_READY` message

**Thêm UPDATE_CONFIG listener:**
- Listen `UPDATE_CONFIG` message từ editor
- Update `BRAND_CONFIG` ngay lập tức
- Load logo nếu có
- Update map color nếu có

**Load config khi khởi động:**
- Gọi `loadBrandConfig()` trong `DOMContentLoaded` hoặc sau `game.start()`

## 📝 Bước 6: Sửa game.js - Thay Gem Vàng bằng Logo
**HUD (góc trên trái):**
- Tìm function `drawUI()` (line ~1874)
- Thay vẽ circle vàng (line 1894-1901) bằng vẽ logo từ `BRAND_CONFIG.fragmentLogo`
- Vị trí: `gemIconX = 24`, `gemIconY = 130`, `gemIconSize = 40`

**In-game (khi collect):**
- Tìm function `drawGems()` (line ~1186)
- Thay vẽ circle vàng (line 1188-1200) bằng vẽ logo nhỏ
- Chỉ thay `type === 'gold'`, giữ nguyên `type === 'blue'`

**Logic level up:**
- Giữ nguyên (khi `gemsCollected >= gemsRequired`)

## 📝 Bước 7: Sửa game.js - Game Over Screen
**HTML:**
- Thêm `<img id="gameOverLogo">` vào game over overlay
- Thêm `<p id="gameOverStory">` để hiển thị story

**Layout:**
- "GAME OVER" (h2)
- Logo (img)
- Story text (p)
- "Play Again" button

**Load logo và story:**
- Trong function `gameOver()`, load logo từ `BRAND_CONFIG.fragmentLogoUrl`
- Load story từ `BRAND_CONFIG.stories[0]`

## 📝 Bước 8: Sửa game.js - Map Color
**3 màu nhạt:**
- `#1a1a2e` (dark blue)
- `#2d1b3d` (dark purple)
- `#1a2e1a` (dark green)

**Áp dụng:**
- Tìm nơi set canvas/body background (line ~1950: `ctx.fillStyle = '#000000'`)
- Thay bằng `BRAND_CONFIG.mapColor || '#000000'`
- Hoặc set `body` background color từ CSS

## 📝 Bước 9: Thêm vào Template Registry
**File:** `core/template-registry.js`
**Entry:**
```javascript
'pixel-shooter': {
  adapterPath: '../pixel-shooter-template/editor/editor-adapter.js',
  adapterName: 'PixelShooterEditorAdapter',
  playtestKey: 'pixel_shooter_brand_config_playtest',
  playtestGameId: 'playtest-pixel-shooter',
  storagePrefix: 'pixel_shooter_brand_config_',
  templateUrl: '/games/templates-v2/pixel-shooter-template/index.html',
  messageTypes: {
    READY: 'PIXEL_SHOOTER_GAME_READY',
    ERROR: 'PIXEL_SHOOTER_GAME_ERROR',
    UPDATE_CONFIG: 'UPDATE_CONFIG'
  },
  uiFields: {
    story: {
      enabled: true,
      inputId: 'storyInput',
      maxLength: 50
    },
    logo: {
      enabled: true,
      inputId: 'logoInput',
      previewId: 'logoPreview'
    },
    mapColor: {
      enabled: true,
      containerId: 'mapColors',
      colors: [
        { value: '#1a1a2e', label: 'Dark Blue' },
        { value: '#2d1b3d', label: 'Dark Purple' },
        { value: '#1a2e1a', label: 'Dark Green' }
      ]
    }
    // KHÔNG có map field
  },
  displayName: 'Pixel Shooter',
  description: 'Space shooter game',
  enabled: true
}
```

## ✅ Bước 10: Test Checklist
- [ ] Template xuất hiện trong dropdown
- [ ] Switch template hoạt động
- [ ] Upload logo hoạt động
- [ ] Play Test hiển thị game
- [ ] Logo thay gem vàng ở HUD (góc trên trái)
- [ ] Logo xuất hiện khi collect (thay gem vàng)
- [ ] Game Over hiển thị logo (dưới "GAME OVER")
- [ ] Game Over hiển thị story (dưới logo)
- [ ] Map color thay đổi (3 màu nhạt)
- [ ] Save & Copy Link hoạt động
- [ ] Console không có lỗi


