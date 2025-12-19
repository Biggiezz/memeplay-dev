# 📘 Hướng dẫn Tích hợp Game vào Template V2

## 🎯 Mục đích

Hướng dẫn này giúp bạn nhanh chóng tích hợp game mới vào hệ thống `templates-v2` với **tối thiểu lỗi** và **thời gian ngắn nhất**.

---

## ⚡ Quick Start: Dùng Script Tự Động

### Bước 1: Chạy Script

```bash
node scripts/add-template.js --name "draw-runner" --display "Draw Runner"
```

**Script sẽ tự động:**
- ✅ Tạo folder structure: `games/templates-v2/draw-runner-template/`
- ✅ Tạo các file cần thiết (config.js, game.js, index.html, style.css, editor-adapter.js)
- ✅ Cập nhật `template-registry.js`
- ✅ Cập nhật `play-v2.js` (thêm detection pattern)

### Bước 2: Migrate Game Code

Copy code từ `games/draw-runner/index.html` vào các file mới:

1. **CSS** → `style.css`
2. **JavaScript** → `game.js`
3. **HTML structure** → `index.html`

### Bước 3: Tích hợp Config System

Thay thế hardcoded values bằng `BRAND_CONFIG`:

```javascript
// ❌ Trước (hardcoded)
ctx.fillStyle = '#87CEEB';
const logo = new Image();
logo.src = 'assets/binance-logo.webp';

// ✅ Sau (dùng config)
import { BRAND_CONFIG, getEffectiveLogoUrl } from './config.js';
ctx.fillStyle = BRAND_CONFIG.mapColor || '#87CEEB';
const logo = new Image();
logo.src = getEffectiveLogoUrl();
```

### Bước 4: Thêm PostMessage Communication

**⚠️ QUAN TRỌNG:** Phải gửi `gameId` trong tất cả messages để đếm plays và lưu score!

Thêm các message handlers:

```javascript
import { getGameId, TEMPLATE_ID } from './config.js';

// Khi game start - BẮT BUỘC có gameId để đếm plays
const gameId = getGameId() || TEMPLATE_ID;
window.parent.postMessage({ 
    type: 'GAME_START', 
    gameId: gameId 
}, '*');

// Khi game over - BẮT BUỘC có gameId để stop timer
const gameId = getGameId() || TEMPLATE_ID;
window.parent.postMessage({ 
    type: 'GAME_OVER',
    gameId: gameId
}, '*');

// Khi game over - BẮT BUỘC gửi GAME_SCORE để lưu điểm và thưởng
window.parent.postMessage({ 
    type: 'GAME_SCORE',
    gameId: gameId,
    score: gameState.score,
    level: 1 // Hoặc level hiện tại nếu game có level system
}, '*');

// Khi game ready
window.parent.postMessage({ 
    type: 'DRAW_RUNNER_GAME_READY' 
}, '*');

// Listen for config updates
window.addEventListener('message', (event) => {
    if (event.data.type === 'UPDATE_CONFIG') {
        Object.assign(BRAND_CONFIG, event.data.config);
        // Re-apply config
    }
});
```

**Lưu ý:**
- `GAME_START` phải có `gameId` → Để bắt đầu đếm playtime
- `GAME_OVER` phải có `gameId` → Để dừng timer và tính rewards
- `GAME_SCORE` phải có `gameId`, `score`, `level` → Để lưu điểm vào leaderboard và thưởng PLAY points
- Nếu không có `gameId` trong URL, dùng `TEMPLATE_ID` làm fallback

### Bước 5: Test

```bash
cd games/templates-v2
npx serve . -l 5500
```

Truy cập: `http://localhost:5500/index.html`

---

## 📋 Checklist Chi Tiết

### ✅ Phase 1: Setup (Script tự động làm)

- [x] Tạo folder structure
- [x] Tạo config.js với đúng storage prefix
- [x] Tạo editor-adapter.js với đúng class name
- [x] Tạo index.html, style.css, game.js skeleton
- [x] Cập nhật template-registry.js
- [x] Cập nhật play-v2.js (detection pattern)

### ✅ Phase 2: Code Migration

- [ ] Copy CSS từ game cũ → `style.css`
- [ ] Copy JavaScript từ game cũ → `game.js`
- [ ] Copy HTML structure → `index.html`
- [ ] Copy assets → `assets/` folder

### ✅ Phase 3: Config Integration

- [ ] Import `BRAND_CONFIG` từ `config.js`
- [ ] Thay hardcoded logo → `getEffectiveLogoUrl()`
- [ ] Thay hardcoded background color → `BRAND_CONFIG.mapColor`
- [ ] Thay hardcoded story text → `BRAND_CONFIG.storyText`
- [ ] Load config trong `initGame()`:
  ```javascript
  async function initGame() {
      const gameId = getGameId();
      const hasLocalConfig = loadBrandConfig(gameId);
      if (!hasLocalConfig && gameId) {
          await loadBrandConfigFromSupabase(gameId);
      }
      // ... rest of init
  }
  ```

### ✅ Phase 4: PostMessage Integration

**⚠️ QUAN TRỌNG NHẤT:** Phải gửi đúng messages với `gameId` để:
- ✅ Đếm lượt plays
- ✅ Lưu score vào leaderboard
- ✅ Đếm thời gian chơi và thưởng PLAY points

**Checklist:**
- [ ] Gửi `GAME_START` với `gameId` khi bắt đầu game (để đếm plays)
- [ ] Gửi `GAME_START` với `gameId` khi restart game (để đếm plays mới)
- [ ] Gửi `GAME_OVER` với `gameId` khi game kết thúc (để stop timer)
- [ ] Gửi `GAME_SCORE` với `gameId`, `score`, `level` khi game kết thúc (để lưu điểm và thưởng)
- [ ] Gửi `{TEMPLATE}_GAME_READY` khi game sẵn sàng
- [ ] Listen `UPDATE_CONFIG` để cập nhật real-time

**⚠️ Lỗi thường gặp:** 
- ❌ Quên gửi `gameId` → Không đếm plays, không lưu score
- ❌ Quên gửi `GAME_SCORE` → Không lưu điểm vào leaderboard, không thưởng PLAY points
- ❌ Quên gửi `GAME_START` khi restart → Không đếm plays mới
- ❌ Thiếu `level` trong `GAME_SCORE` → Dùng `1` nếu game không có level system

**Code mẫu đầy đủ:**
```javascript
// ✅ Khi game start
function initGame() {
    gameState = 'playing';
    // ... reset game state ...
    
    const gameId = getGameId() || TEMPLATE_ID;
    window.parent.postMessage({ 
        type: 'GAME_START', 
        gameId: gameId 
    }, '*');
}

// ✅ Khi game over
function gameOver() {
    gameState = 'gameover';
    // ... show game over screen ...
    
    const gameId = getGameId() || TEMPLATE_ID;
    
    // BẮT BUỘC: Gửi GAME_OVER để stop timer
    window.parent.postMessage({ 
        type: 'GAME_OVER',
        gameId: gameId
    }, '*');
    
    // BẮT BUỘC: Gửi GAME_SCORE để lưu điểm và thưởng
    window.parent.postMessage({ 
        type: 'GAME_SCORE',
        gameId: gameId,
        score: score,
        level: level || 1 // Dùng 1 nếu game không có level
    }, '*');
}
```

### ✅ Phase 5: Testing

**Testing Checklist:**

**1. Basic Testing:**
- [ ] Test trong editor: `http://localhost:5500/games/templates-v2/`
- [ ] Test Play Test button (mobile + desktop)
- [ ] Test Save & Copy Link button (mobile + desktop)
- [ ] Test shared link: `play-v2.html?game=playmode-{template}-XXX`
- [ ] Test config persistence (refresh page)
- [ ] Test Supabase sync (mở link trên device khác)

**2. PostMessage Testing (QUAN TRỌNG):**
- [ ] Mở DevTools Console khi chơi game
- [ ] Kiểm tra log: `[PLAY MODE] GAME_START received for playmode-{template}-XXX`
- [ ] Kiểm tra log: `[PLAY MODE] GAME_OVER received for playmode-{template}-XXX`
- [ ] Kiểm tra log: `[PLAY MODE] Received score: XXX for playmode-{template}-XXX`
- [ ] Nếu không thấy logs → Kiểm tra lại PostMessage code

**3. Supabase Testing (QUAN TRỌNG):**
- [ ] Chơi game và check Supabase table `user_game_scores`
- [ ] Kiểm tra plays được đếm (check `play_count` hoặc `plays` column)
- [ ] Kiểm tra score được lưu vào leaderboard
- [ ] Kiểm tra PLAY points được thưởng (check `user_points` hoặc tương tự)
- [ ] Nếu không thấy data → Kiểm tra lại PostMessage code và `gameId`

**4. Config Testing:**
- [ ] Upload logo trong editor → Logo hiển thị trong game
- [ ] Nhập story text → Story text hiển thị trong game over screen
- [ ] Save config → Refresh page → Config vẫn còn
- [ ] Copy link → Mở link mới → Config được load từ Supabase

---

## 🔍 Tại sao Script Đặt Ở `scripts/` Thay Vì `templates-v2/`?

### ❌ Nếu đặt trong `templates-v2/`:

```
games/templates-v2/
├── scripts/
│   └── add-template.js  ← Script ở đây
├── core/
├── arrow-template/
└── ...
```

**Vấn đề:**
1. **Script cần truy cập `scripts/play-v2.js`** (ở root level)
   - Đường dẫn tương đối phức tạp: `../../../scripts/play-v2.js`
   - Dễ sai khi refactor

2. **Không phải code chạy trong browser**
   - Script này là **development tool** (Node.js)
   - Không liên quan đến template runtime

3. **Khó tìm và sử dụng**
   - Developer phải vào sâu trong folder structure
   - Không rõ ràng đây là tool chung

### ✅ Đặt ở `scripts/` (root level):

```
D:\HLMT5 game memeplay.dev\
├── scripts/
│   ├── add-template.js  ← Script ở đây ✅
│   ├── play-v2.js       ← Dễ truy cập
│   └── play.js
├── games/
│   └── templates-v2/
│       ├── core/
│       └── ...
```

**Lợi ích:**
1. **Dễ truy cập:**
   ```bash
   node scripts/add-template.js  # Đơn giản, rõ ràng
   ```

2. **Đường dẫn tương đối đơn giản:**
   ```javascript
   const PLAY_V2_PATH = path.join(__dirname, 'play-v2.js');  // Cùng folder
   const TEMPLATES_V2_PATH = path.join(__dirname, '..', 'games', 'templates-v2');
   ```

3. **Phân biệt rõ ràng:**
   - `scripts/` = Development tools (Node.js)
   - `games/templates-v2/` = Runtime code (Browser)

4. **Có thể mở rộng:**
   - Thêm script khác: `scripts/validate-templates.js`
   - Thêm script khác: `scripts/build-templates.js`
   - Tất cả dev tools ở một chỗ

---

## 🎓 Kinh Nghiệm Từ Arrow Game Integration

### ✅ Những gì làm đúng:

1. **Object Pooling** - Giảm memory allocation
2. **Mobile Speed Multiplier** - Đồng bộ tốc độ mobile/desktop
3. **Supabase Fallback** - Load config khi không có localStorage
4. **PostMessage Standard** - GAME_START, GAME_OVER, GAME_SCORE

### ⚠️ Những lỗi đã gặp và cách tránh:

1. **Storage Key Mismatch**
   - ❌ `playtestKey: 'arrow_brand_config_playtest'`
   - ✅ `playtestKey: 'arrow_brand_config_playtest-arrow'`
   - **Fix:** Script tự động generate đúng format

2. **Missing Detection Pattern**
   - ❌ Quên thêm vào `play-v2.js`
   - ✅ Script tự động thêm

3. **Message Type Mismatch**
   - ❌ Game gửi `GAME_STARTED`, editor expect `GAME_START`
   - ✅ Script generate đúng message type

4. **Config Not Loading in Playtest**
   - ❌ Không listen `UPDATE_CONFIG`
   - ✅ Script generate sẵn handler

---

## 📝 Template Structure Reference

```
draw-runner-template/
├── assets/
│   └── logo.webp          ← Logo mặc định
├── editor/
│   └── editor-adapter.js  ← Editor adapter class
├── config.js              ← Config system
├── game.js                ← Game logic
├── index.html             ← HTML shell
└── style.css              ← Styles
```

---

## 🔗 Related Files

- **Template Registry:** `games/templates-v2/core/template-registry.js`
- **Play Script:** `scripts/play-v2.js`
- **Base Adapter:** `games/templates-v2/core/base-adapter.js`
- **Example:** `games/templates-v2/arrow-template/`

---

## ❓ FAQ

**Q: Script có thể customize được không?**  
A: Có, bạn có thể sửa các hàm `generate*()` trong script để thay đổi template structure.

**Q: Nếu muốn thêm UI field mới (không phải story/logo/mapColor)?**  
A: Sửa `template-registry.js` và `editor-adapter.js` thủ công sau khi chạy script.

**Q: Script có validate input không?**  
A: Có, script validate:
- Template name format (kebab-case, bắt đầu bằng chữ)
- Template không được trùng
- Display name không được rỗng

**Q: Có thể rollback không?**  
A: Có, xóa folder template và revert 2 file: `template-registry.js`, `play-v2.js`

**Q: Tại sao game không đếm plays?**  
A: Kiểm tra:
1. `GAME_START` message có `gameId` chưa?
2. `gameId` được lấy từ `getGameId() || TEMPLATE_ID` chưa?
3. Console có log `[PLAY MODE] GAME_START received` chưa?
4. Nếu không có log → PostMessage không được gửi hoặc `gameId` sai

**Q: Tại sao score không được lưu vào leaderboard?**  
A: Kiểm tra:
1. `GAME_SCORE` message có đầy đủ `gameId`, `score`, `level` chưa?
2. Console có log `[PLAY MODE] Received score: XXX` chưa?
3. Supabase có data trong table `user_game_scores` chưa?
4. Nếu không có log → PostMessage không được gửi hoặc thiếu fields

**Q: Tại sao không thưởng PLAY points?**  
A: Kiểm tra:
1. `GAME_SCORE` message có `gameId` và `score` chưa?
2. `GAME_OVER` message có `gameId` chưa? (để stop timer)
3. Timer có chạy không? (check `GAME_START` được gửi chưa)
4. Supabase function `track_playtime_and_reward` có được gọi không?

**Q: Game có level system, phải làm gì?**  
A: Gửi `level` hiện tại trong `GAME_SCORE`:
```javascript
window.parent.postMessage({ 
    type: 'GAME_SCORE',
    gameId: gameId,
    score: score,
    level: currentLevel // Level hiện tại của game
}, '*');
```

**Q: Game không có level system, phải làm gì?**  
A: Dùng `level: 1` trong `GAME_SCORE`:
```javascript
window.parent.postMessage({ 
    type: 'GAME_SCORE',
    gameId: gameId,
    score: score,
    level: 1 // Game không có level, dùng 1
}, '*');
```

**Q: Làm sao debug PostMessage?**  
A: 
1. Mở DevTools Console
2. Thêm log trước khi gửi message:
   ```javascript
   console.log('[Game] Sending GAME_START:', { type: 'GAME_START', gameId });
   window.parent.postMessage({ type: 'GAME_START', gameId }, '*');
   ```
3. Check parent window có nhận được không (check `play-v2.js` logs)
4. Nếu không thấy logs → Kiểm tra `window.parent` có tồn tại không (có thể game đang chạy standalone)

**Q: Game chạy standalone (không trong iframe), PostMessage có hoạt động không?**  
A: Không, `window.parent === window` khi standalone. PostMessage chỉ hoạt động khi game chạy trong iframe (editor hoặc play-v2.html). Để test, phải mở qua `play-v2.html?game=playmode-{template}-XXX`.

---

## 🎉 Kết Luận

Script `add-template.js` giúp bạn:
- ⏱️ **Tiết kiệm 30-60 phút** mỗi lần thêm game
- 🎯 **Giảm 90% lỗi** typo và mismatch
- 📋 **Chuẩn hóa** cấu trúc template
- 🧠 **Không cần nhớ** format của từng file

**Happy Coding! 🚀**

