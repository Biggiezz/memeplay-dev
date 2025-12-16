# 📋 Workflow Thêm Pixel Shooter Template vào Templates-V2

## ✅ Bước 1: Tạo Folder Structure (HOÀN THÀNH)
- ✅ `pixel-shooter-template/`
- ✅ `pixel-shooter-template/editor/`
- ✅ `pixel-shooter-template/assets/` (đã copy assets)

## 📝 Bước 2: Copy & Tách Game Files
- [ ] Copy `index.html` từ `games/pixel-shooter/`
- [ ] Tách CSS → `style.css`
- [ ] Tách JS → `game.js`
- [ ] Giữ lại `index.html` chỉ có HTML structure + link CSS/JS

## 📝 Bước 3: Tạo config.js
- [ ] Copy pattern từ `pacman-template/config.js`
- [ ] Sửa:
  - `pacman_brand_config_` → `pixel_shooter_brand_config_`
  - `pacman_brand_config_playtest` → `pixel_shooter_brand_config_playtest`
  - `playtest-pacman` → `playtest-pixel-shooter`
  - Template ID: `pixel-shooter-template`

## 📝 Bước 4: Tạo editor-adapter.js
- [ ] Copy pattern từ `pacman-template/editor/editor-adapter.js`
- [ ] Sửa:
  - Class name: `PacmanEditorAdapter` → `PixelShooterEditorAdapter`
  - Storage prefix: `pacman_brand_config_` → `pixel_shooter_brand_config_`
  - Template ID: `pacman-template` → `pixel-shooter-template`
  - GameId format: `playmode-pacman-XXX` → `playmode-pixel-shooter-XXX`
  - Config object: KHÔNG có `mapIndex` (khác Pacman)
  - Config object: Có `mapColor` (3 màu nhạt)

## 📝 Bước 5: Sửa game.js - READY Signal + UPDATE_CONFIG
- [ ] Thêm READY signal sau khi game init xong
- [ ] Thêm UPDATE_CONFIG listener
- [ ] Load config từ localStorage khi khởi động

## 📝 Bước 6: Sửa game.js - Thay Gem Vàng bằng Logo
- [ ] HUD (góc trên trái): Thay vẽ circle vàng bằng vẽ logo
- [ ] In-game: Thay gem vàng bằng logo khi collect
- [ ] Logic level up: Giữ nguyên (khi đủ logo)

## 📝 Bước 7: Sửa game.js - Game Over Screen
- [ ] Thêm logo vào HTML game over overlay
- [ ] Layout: "GAME OVER" → Logo → Story text
- [ ] Load logo từ `fragmentLogoUrl`

## 📝 Bước 8: Sửa game.js - Map Color
- [ ] 3 màu nhạt: `#1a1a2e` (dark blue), `#2d1b3d` (dark purple), `#1a2e1a` (dark green)
- [ ] Áp dụng vào canvas/body background từ `BRAND_CONFIG.mapColor`

## 📝 Bước 9: Thêm vào Template Registry
- [ ] Thêm entry vào `core/template-registry.js`
- [ ] Config:
  - `adapterPath`, `adapterName`
  - `playtestKey`, `playtestGameId`, `storagePrefix`
  - `templateUrl`
  - `messageTypes`: `PIXEL_SHOOTER_GAME_READY`, `PIXEL_SHOOTER_GAME_ERROR`
  - `uiFields`: story, logo, mapColor (KHÔNG có map)
  - `enabled: true`

## ✅ Bước 10: Test
- [ ] Template xuất hiện trong dropdown
- [ ] Switch template hoạt động
- [ ] Upload logo hoạt động
- [ ] Play Test hiển thị game
- [ ] Logo thay gem vàng ở HUD
- [ ] Logo xuất hiện khi collect
- [ ] Game Over hiển thị logo + story
- [ ] Map color thay đổi
- [ ] Save & Copy Link hoạt động


