# 📋 Tóm Tắt Đoạn Chat - Templates V2 Integration

## 🎯 Mục Tiêu Đoạn Chat Này

Tích hợp template **Pixel Shooter** vào hệ thống **Templates V2**, đảm bảo:
- ✅ Sử dụng code chung từ `core/`
- ✅ Tích hợp với editor UI
- ✅ Load config từ localStorage và Supabase
- ✅ Hoạt động trên Desktop và Mobile

---

## ✅ Những Gì Đã Hoàn Thành

### **1. Tích Hợp Pixel Shooter Template**

#### **Files Đã Tạo/Sửa:**

**Template Files:**
- ✅ `games/templates-v2/pixel-shooter-template/index.html` - Game view
- ✅ `games/templates-v2/pixel-shooter-template/game.js` - Game logic
- ✅ `games/templates-v2/pixel-shooter-template/config.js` - Config management
- ✅ `games/templates-v2/pixel-shooter-template/style.css` - Styles
- ✅ `games/templates-v2/pixel-shooter-template/editor/editor-adapter.js` - Editor adapter
- ✅ `games/templates-v2/pixel-shooter-template/assets/` - Game assets

**Core Integration:**
- ✅ `games/templates-v2/core/template-registry.js` - Thêm entry `'pixel-shooter'`
- ✅ `games/templates-v2/index.html` - Dynamic UI fields (hide map selection cho Pixel)

**Public Play Mode:**
- ✅ `scripts/play-v2.js` - Refactor để dùng registry thay vì hardcode

---

### **2. Fix Template ID Mismatch**

**Vấn đề:**
- Registry dùng: `'pixel-shooter'`
- Editor adapter lưu Supabase: `'pixel-shooter-template'`
- → `play-v2.js` không tìm thấy config

**Giải pháp:**
- ✅ Thêm `normalizeTemplateId()` trong `play-v2.js`
- ✅ Tự động map `'pixel-shooter-template'` → `'pixel-shooter'`
- ✅ Áp dụng cho tất cả templates

**Code Location:**
- `scripts/play-v2.js` (dòng 439-451)

---

### **3. Fix GameId Format Mismatch**

**Vấn đề:**
- Editor tạo: `playmode-pixel-shooter-XXX`
- User test: `pixel-shooter-XXX` (bỏ prefix)
- → Không tìm thấy game

**Giải pháp:**
- ✅ Thêm `getGameIdVariants()` trong `play-v2.js`
- ✅ Tự động thử cả 2 format (có và không có `playmode-` prefix)
- ✅ Áp dụng cho tất cả templates

**Code Location:**
- `scripts/play-v2.js` (dòng 455-472)

---

### **4. Fix Config Không Load Trên Mobile**

**Vấn đề:**
- Desktop: Config load được (localStorage có)
- Mobile: Config không load (localStorage không có hoặc chưa sync)

**Giải pháp:**
- ✅ Thêm `loadBrandConfigFromSupabase()` trong `pixel-shooter-template/game.js`
- ✅ Thêm `DOMContentLoaded` listener với fallback Supabase
- ✅ Pattern: localStorage → Supabase → defaults

**Code Location:**
- `games/templates-v2/pixel-shooter-template/game.js` (dòng 32-120, 1948-2004)

---

### **5. Refactor play-v2.js Dùng Registry**

**Thay đổi:**
- ✅ Thay hardcode bằng registry functions
- ✅ `guessTemplateFromId()` - Dùng registry
- ✅ `loadGameFromLocalStorage()` - Dùng registry + normalize
- ✅ `fetchGameFromSupabase()` - Dùng registry + normalize
- ✅ `normalizeGame()` - Dùng registry + normalize
- ✅ `buildUserGameCard()` - Dùng registry

**Lợi ích:**
- ✅ Tự động hỗ trợ template mới
- ✅ Không cần sửa code khi thêm template
- ✅ Maintainable hơn

**Code Location:**
- `scripts/play-v2.js` (toàn bộ file)

---

## 🔧 Các Helper Functions Đã Tạo

### **1. normalizeTemplateId()**
- **Location:** `scripts/play-v2.js` (dòng 439)
- **Purpose:** Map editor template ID → registry template ID
- **Usage:** Tự động gọi trong `normalizeGame()`, `fetchGameFromSupabase()`

### **2. getGameIdVariants()**
- **Location:** `scripts/play-v2.js` (dòng 455)
- **Purpose:** Generate gameId variants (có và không có prefix)
- **Usage:** Tự động gọi trong `loadGameFromLocalStorage()`, `fetchGameFromSupabase()`

### **3. loadBrandConfigFromSupabase() (Pixel Shooter)**
- **Location:** `games/templates-v2/pixel-shooter-template/game.js` (dòng 32)
- **Purpose:** Load config từ Supabase khi localStorage không có
- **Usage:** Fallback trong `DOMContentLoaded` listener

---

## 📁 Cấu Trúc Code Sau Khi Hoàn Thành

```
games/templates-v2/
├── core/                                    ✅ CODE CHUNG
│   ├── template-registry.js                ✅ Có entry 'pixel-shooter'
│   ├── base-adapter.js                     ✅ Base class
│   ├── playtest-manager.js                 ✅ Playtest logic
│   ├── storage-manager.js                  ✅ localStorage helpers
│   └── ... (các modules khác)
│
├── pacman-template/                        ✅ CODE RIÊNG
│   ├── game.js                             ✅ Có Supabase fallback
│   ├── config.js                           ✅ Config management
│   └── editor/editor-adapter.js            ✅ Editor adapter
│
├── pixel-shooter-template/                 ✅ CODE RIÊNG (MỚI)
│   ├── game.js                             ✅ Có Supabase fallback (MỚI)
│   ├── config.js                           ✅ Config management
│   └── editor/editor-adapter.js            ✅ Editor adapter
│
└── index.html                              ✅ CODE CHUNG
    └── Dynamic UI fields (hide map cho Pixel)

scripts/
└── play-v2.js                              ✅ CODE CHUNG
    ├── normalizeTemplateId()               ✅ MỚI
    ├── getGameIdVariants()                 ✅ MỚI
    ├── loadGameFromLocalStorage()          ✅ Refactor
    ├── fetchGameFromSupabase()             ✅ Refactor
    └── normalizeGame()                     ✅ Refactor
```

---

## ⚠️ Các Lỗi Đã Gặp & Cách Fix

### **1. Template ID Mismatch**
- **Lỗi:** Registry ID ≠ Editor ID
- **Fix:** `normalizeTemplateId()` tự động map
- **Lesson:** Luôn dùng normalize khi so sánh template ID

### **2. GameId Format Mismatch**
- **Lỗi:** Link không có prefix không hoạt động
- **Fix:** `getGameIdVariants()` tự động thử cả 2 format
- **Lesson:** Luôn normalize gameId khi tìm trong storage

### **3. Config Không Load Trên Mobile**
- **Lỗi:** localStorage không có config trên mobile
- **Fix:** Thêm Supabase fallback
- **Lesson:** **Bắt buộc** có Supabase fallback cho mọi template

### **4. Syntax Error**
- **Lỗi:** `</script>` tag trong `game.js`
- **Fix:** Xóa tag
- **Lesson:** Kiểm tra syntax khi extract code từ HTML

### **5. Race Condition**
- **Lỗi:** `updateGems()` crash khi `nextLevel()` clear array
- **Fix:** Thêm null check
- **Lesson:** Luôn check null khi iterate array có thể bị modify

### **6. Hardcoded GameId**
- **Lỗi:** GameId hardcode trong messages
- **Fix:** Dùng `getGameId()` hoặc `EMBEDDED_GAME_ID`
- **Lesson:** Luôn dùng dynamic gameId

---

## 🎯 Best Practices Rút Ra

### **1. Code Organization**
- ✅ Code chung → `scripts/play-v2.js`, `core/`
- ✅ Code riêng → `{template-name}-template/`
- ✅ Không duplicate code

### **2. Template ID**
- ✅ Registry ID: `'template-name'` (ngắn)
- ✅ Editor ID: `'template-name-template'` (đầy đủ)
- ✅ `play-v2.js` tự động normalize

### **3. GameId Format**
- ✅ Editor tạo: `playmode-{template-name}-XXX`
- ✅ `play-v2.js` tự động normalize

### **4. Config Loading**
- ✅ **Bắt buộc** có Supabase fallback
- ✅ Pattern: localStorage → Supabase → defaults

### **5. Messages**
- ✅ **Bắt buộc** gửi READY signal
- ✅ **Bắt buộc** listen UPDATE_CONFIG
- ✅ **Bắt buộc** gửi GAME_START, GAME_SCORE, GAME_OVER

---

## 📝 Checklist Thêm Template Mới

### **Bước 1: Tạo Template Folder**
- [ ] Copy template cũ làm base
- [ ] Đổi tên folder và files
- [ ] Sửa game logic

### **Bước 2: Tạo Editor Adapter**
- [ ] Extend `BaseAdapter`
- [ ] Implement `save()`, `load()`, `isDirty()`
- [ ] `generateGameId()` format: `playmode-{template-name}-XXX`
- [ ] `syncToSupabase()` dùng `p_template_id: '{template-name}-template'`

### **Bước 3: Sửa Game.js**
- [ ] Gửi READY signal
- [ ] Listen UPDATE_CONFIG
- [ ] Gửi GAME_START, GAME_SCORE, GAME_OVER
- [ ] Thêm Supabase fallback (bắt buộc)

### **Bước 4: Thêm Vào Registry**
- [ ] Thêm entry vào `template-registry.js`
- [ ] Registry ID: `'template-name'` (ngắn)
- [ ] Define `uiFields` (story, logo, mapColor, etc.)

### **Bước 5: Test**
- [ ] Desktop: Tạo game → Save → Copy link → Truy cập
- [ ] Mobile: Tạo game → Save → Copy link → Truy cập
- [ ] Config load đúng (logo, colors, story)
- [ ] Leaderboard hoạt động
- [ ] Toast rewards hoạt động
- [ ] Play count tăng

---

## 🚀 Next Steps

### **Immediate:**
1. ✅ Pixel Shooter đã hoàn thành
2. ⏭️ Thêm 2-3 templates nữa để test scale

### **Future:**
1. ⏭️ Homepage V2 (sau khi có 4-5 templates)
2. ⏭️ Tối ưu performance
3. ⏭️ Scale lên 30+ templates

---

## 📚 Files Quan Trọng

### **Code Chung:**
- `scripts/play-v2.js` - Public play mode (đã refactor)
- `games/templates-v2/core/template-registry.js` - Template registry
- `games/templates-v2/core/base-adapter.js` - Base adapter class
- `games/templates-v2/index.html` - Editor UI

### **Code Riêng:**
- `games/templates-v2/pacman-template/` - Reference template
- `games/templates-v2/pixel-shooter-template/` - Latest template

### **Documentation:**
- `games/templates-v2/README-TEMPLATE-V2.md` - Architecture overview
- `games/templates-v2/ADD-TEMPLATE-GUIDE.md` - Guide thêm template mới (MỚI)
- `games/templates-v2/SESSION-SUMMARY.md` - Tóm tắt đoạn chat này

---

## 🎓 Kinh Nghiệm Quan Trọng

1. **Luôn có Supabase fallback** - Config không load trên mobile nếu không có
2. **Luôn normalize template ID** - Tránh mismatch giữa registry và editor
3. **Luôn normalize gameId** - Hỗ trợ cả 2 format (có và không có prefix)
4. **Luôn gửi messages** - Leaderboard, rewards, play count cần messages
5. **Test trên cả Desktop và Mobile** - Mobile có thể có vấn đề khác

---

**Last Updated:** Sau khi hoàn thành Pixel Shooter template
**Status:** ✅ Hoàn thành
**Next:** Thêm templates mới hoặc Homepage V2







