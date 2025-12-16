# 📋 Tổng Hợp Templates-V2 - Hướng Dẫn Chuyển Đoạn Chat Mới

## 🎯 Tổng Quan Đoạn Chat Này Đã Làm

### ✅ Những Gì Đã Hoàn Thành

#### **Phase 1: Tách Templates V2 từ V1**
- ✅ Tạo cấu trúc `templates-v2/` độc lập
- ✅ Clone `pacman-template` từ V1 sang V2
- ✅ Xóa code editor-specific khỏi `game.js` (giảm từ 3527 → 2411 dòng)
- ✅ Tạo `index.html` game-only (không có editor UI)
- ✅ Fix URLs trỏ về V2 thay vì V1

#### **Phase 2: Tối Ưu localStorage & Real-time Updates**
- ✅ **Nén ảnh logo** (`core/image-optimizer.js`): Resize max 128px, compress WebP/PNG, xử lý transparency
- ✅ **Key cố định cho playtest**: `pacman_brand_config_playtest` (tránh tích lũy key)
- ✅ **Cleanup old keys**: Xóa key cũ khi Save (`core/storage-manager.js`)
- ✅ **PostMessage**: Update config ngay lập tức không reload iframe

#### **Phase 3: Kiến Trúc Modular (4 Bước)**
- ✅ **Bước 1: Template Registry** (`core/template-registry.js`)
  - Centralized config cho tất cả templates
  - Helper functions: `getPlaytestKey()`, `getPlaytestGameId()`, `getTemplateUrl()`, `getMessageType()`
  
- ✅ **Bước 2: Tích Hợp Registry**
  - Thay hardcode bằng registry functions
  - `CURRENT_TEMPLATE = 'pacman'` (có thể thay đổi)
  
- ✅ **Bước 3: Playtest Manager** (`core/playtest-manager.js`)
  - Tách toàn bộ playtest logic vào core
  - Functions: `createPlaytestIframe()`, `savePlaytestConfig()`, `updatePlaytestIframe()`, `cleanupOldPlaytestKeys()`
  
- ✅ **Bước 4: Template Selector**
  - Populate dropdown từ registry
  - Switch template với async load adapter
  - Update UI fields theo template

---

## 📁 Cấu Trúc Hình Cây Templates-V2

```
games/templates-v2/
├── core/                                    ✅ DÙNG CHUNG (100%)
│   ├── base-adapter.js                     ✅ Base class cho tất cả adapters
│   ├── template-registry.js                ✅ Registry quản lý tất cả templates
│   ├── playtest-manager.js                 ✅ Quản lý playtest iframe (dùng chung)
│   ├── storage-manager.js                  ✅ Quản lý localStorage (dùng chung)
│   ├── image-optimizer.js                  ✅ Nén ảnh logo (dùng chung)
│   ├── shared-editor.js                    ✅ Shared editor logic (dùng chung)
│   ├── url-builder.js                      ✅ Build public URLs (dùng chung)
│   ├── supabase-client.js                  ✅ Supabase integration (dùng chung)
│   └── constants.js                        ✅ Constants (dùng chung)
│
├── pacman-template/                        ✅ TEMPLATE RIÊNG (reference)
│   ├── index.html                          ✅ Game view (riêng)
│   ├── game.js                             ✅ Game logic (riêng)
│   ├── config.js                           ✅ Config management (riêng)
│   ├── maps.js                             ✅ Game data (riêng)
│   ├── style.css                           ✅ Template-specific styles (riêng)
│   └── editor/
│       └── editor-adapter.js               ✅ Editor adapter (riêng, extend BaseAdapter)
│
├── index.html                              ✅ Main editor UI (dùng chung)
├── redirect.html                           ✅ Redirect helper
└── test-registry.html                      ✅ Test registry functions
```

---

## 🔍 Phân Tích Code: Dùng Chung vs Dùng Riêng

### ✅ **CODE DÙNG CHUNG (100% - Không cần sửa khi thêm template mới)**

#### **1. Core Modules (`core/`)**
- **`base-adapter.js`**: Base class interface cho tất cả adapters
- **`template-registry.js`**: Quản lý config tất cả templates
- **`playtest-manager.js`**: Tạo/quản lý playtest iframe cho mọi template
- **`storage-manager.js`**: Cleanup old keys, localStorage helpers
- **`image-optimizer.js`**: Nén ảnh logo (dùng chung)
- **`shared-editor.js`**: Shared editor behaviors
- **`url-builder.js`**: Build public link URLs
- **`supabase-client.js`**: Supabase client
- **`constants.js`**: Constants

#### **2. Main Editor (`index.html`)**
- Editor UI (dùng chung)
- Template selector (tự động populate từ registry)
- Event listeners (top-level, không wrap trong function)
- Playtest iframe management (dùng playtest-manager)

### ✅ **CODE DÙNG RIÊNG (Cần implement cho mỗi template mới)**

#### **1. Template Folder Structure**
```
{template-name}-template/
├── index.html          ✅ Game view (riêng)
├── game.js             ✅ Game logic (riêng)
├── config.js           ✅ Config management (riêng, optional)
├── style.css           ✅ Template-specific styles (riêng)
└── editor/
    └── editor-adapter.js ✅ Editor adapter (riêng, extend BaseAdapter)
```

#### **2. Editor Adapter (Bắt buộc)**
- **File**: `{template-name}-template/editor/editor-adapter.js`
- **Pattern**: Extend `BaseAdapter`
- **Required Methods**:
  - `async load()` - Load config từ localStorage
  - `async save(forcedGameId)` - Save config + sync Supabase
  - `isDirty()` - Check if config changed
  - `markDirty()` - Mark as dirty
  - `generateGameId()` - Generate unique gameId

#### **3. Game Logic (Bắt buộc)**
- **File**: `{template-name}-template/game.js`
- **Required**:
  - Gửi `READY` signal khi init xong:
    ```javascript
    window.parent.postMessage({
      type: '{TEMPLATE_NAME}_GAME_READY',
      gameId: getGameId()
    }, '*');
    ```
  - Listen `UPDATE_CONFIG` message:
    ```javascript
    window.addEventListener('message', (event) => {
      if (event.data.type === 'UPDATE_CONFIG') {
        // Update config ngay lập tức
      }
    });
    ```

#### **4. Template Registry Config (Bắt buộc)**
- **File**: `core/template-registry.js`
- **Thêm entry vào `TEMPLATE_REGISTRY`**:
  ```javascript
  '{template-name}': {
    adapterPath: '../{template-name}-template/editor/editor-adapter.js',
    adapterName: '{TemplateName}EditorAdapter',
    playtestKey: '{template_name}_brand_config_playtest',
    playtestGameId: 'playtest-{template-name}',
    storagePrefix: '{template_name}_brand_config_',
    templateUrl: '/games/templates-v2/{template-name}-template/index.html',
    messageTypes: {
      READY: '{TEMPLATE_NAME}_GAME_READY',
      ERROR: '{TEMPLATE_NAME}_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: { /* Define UI fields */ },
    displayName: '{Template Name}',
    description: 'Description...'
  }
  ```

---

## 🚀 Workflow Thêm Template Game Mới

### **Bước 1: Tạo Folder Structure** (5 phút)
```bash
# Copy từ pacman-template làm reference
cp -r games/templates-v2/pacman-template games/templates-v2/{template-name}-template
```

### **Bước 2: Tạo Editor Adapter** (30-60 phút)
1. Tạo file `{template-name}-template/editor/editor-adapter.js`
2. Extend `BaseAdapter`
3. Implement:
   - `constructor()` - Khởi tạo với `editorElements`
   - `async save()` - Lấy config từ DOM, lưu localStorage, sync Supabase
   - `isDirty()` / `markDirty()` - Track dirty state
   - `generateGameId()` - Format: `playmode-{template-name}-XXX`

**Reference**: Xem `pacman-template/editor/editor-adapter.js`

### **Bước 3: Implement Game Logic** (1-3 giờ)
1. Sửa `game.js`:
   - Implement game logic
   - Gửi `READY` signal khi init xong
   - Listen `UPDATE_CONFIG` để update config ngay lập tức
2. Sửa `config.js` (nếu cần):
   - Load/save config từ localStorage
   - Format: `{template_name}_brand_config_playmode-{template-name}-XXX`
3. Sửa `style.css`:
   - Template-specific styles

**Reference**: Xem `pacman-template/game.js`, `config.js`

### **Bước 4: Thêm Vào Template Registry** (10 phút)
1. Mở `core/template-registry.js`
2. Thêm entry vào `TEMPLATE_REGISTRY`:
   - `adapterPath`: Đường dẫn đến adapter
   - `adapterName`: Tên class adapter
   - `playtestKey`, `playtestGameId`, `storagePrefix`: Storage keys
   - `templateUrl`: URL đến `index.html`
   - `messageTypes`: READY, ERROR, UPDATE_CONFIG
   - `uiFields`: Define UI fields cần thiết
   - `displayName`, `description`: Metadata

### **Bước 5: Test** (15-30 phút)
1. ✅ Template xuất hiện trong dropdown
2. ✅ Switch template hoạt động
3. ✅ Upload logo, story, config khác hoạt động
4. ✅ Play Test hiển thị game
5. ✅ Save & Copy Link hoạt động
6. ✅ Console không có lỗi

**Tổng thời gian ước tính**: 2-4 giờ (tùy độ phức tạp game)

---

## 🎯 4 Bước Vừa Làm Có Tác Dụng Gì?

### **Bước 1: Template Registry** (`core/template-registry.js`)
**Tác dụng**:
- ✅ **Centralized Configuration**: Tất cả config templates ở một chỗ
- ✅ **Single Source of Truth**: Không cần hardcode template-specific values
- ✅ **Easy to Add Templates**: Chỉ cần thêm entry vào registry
- ✅ **Type Safety**: Helper functions đảm bảo consistency

**Lợi ích**:
- Thêm template mới: Chỉ cần thêm 1 entry vào registry
- Không cần sửa code editor (`index.html`)
- Dễ maintain và scale

### **Bước 2: Tích Hợp Registry**
**Tác dụng**:
- ✅ **Replace Hardcode**: Thay `'pacman'`, `'pacman_brand_config_playtest'` bằng registry functions
- ✅ **Template-Agnostic**: Editor không biết template cụ thể nào đang active
- ✅ **Dynamic**: Có thể switch template mà không cần reload

**Lợi ích**:
- Code editor sạch hơn, không hardcode
- Dễ switch template sau này

### **Bước 3: Playtest Manager** (`core/playtest-manager.js`)
**Tác dụng**:
- ✅ **Separation of Concerns**: Tách playtest logic khỏi editor UI
- ✅ **Reusable**: Dùng chung cho tất cả templates
- ✅ **Centralized**: Tất cả playtest logic ở một chỗ
- ✅ **Maintainable**: Sửa một chỗ, tất cả templates được lợi

**Lợi ích**:
- Editor code (`index.html`) gọn hơn (~200 dòng code được tách ra)
- Dễ test và debug
- Dễ thêm features mới (ví dụ: analytics, error tracking)

### **Bước 4: Template Selector**
**Tác dụng**:
- ✅ **Dynamic Template Switching**: User có thể switch template trong UI
- ✅ **Lazy Load Adapters**: Chỉ load adapter khi cần (async)
- ✅ **Auto Populate**: Dropdown tự động populate từ registry
- ✅ **UI Fields Management**: Show/hide fields theo template

**Lợi ích**:
- User experience tốt hơn (không cần reload page)
- Performance tốt (lazy load)
- Scalable (tự động support template mới)

---

## 💡 Chính Kiến: Có Cần Tối Ưu Gì Nữa Không?

### ✅ **Đã Tối Ưu Tốt**
1. ✅ **Code Organization**: Core modules tách biệt rõ ràng
2. ✅ **Reusability**: 100% core code dùng chung
3. ✅ **Maintainability**: Dễ maintain, dễ scale
4. ✅ **Performance**: Lazy load adapters, postMessage cho instant updates
5. ✅ **Storage**: Image optimization, cleanup old keys

### 🔄 **Có Thể Cải Thiện (Không Bắt Buộc)**

#### **1. Generic Message Types** (Low Priority)
**Hiện tại**: Mỗi template có message types riêng (`PACMAN_GAME_READY`, `BLOCKS_GAME_READY`)
**Đề xuất**: Dùng generic message types (`GAME_READY`, `GAME_ERROR`) + `templateId` trong payload
**Lợi ích**: Code đơn giản hơn, không cần define message types cho mỗi template
**Ưu tiên**: Thấp (hiện tại đã hoạt động tốt)

#### **2. UI Fields Dynamic Rendering** (Medium Priority)
**Hiện tại**: UI fields được hardcode trong HTML, chỉ show/hide theo template
**Đề xuất**: Dynamic render UI fields từ registry `uiFields` config
**Lợi ích**: Thêm template mới không cần sửa HTML
**Ưu tiên**: Trung bình (hiện tại vẫn OK, nhưng sẽ tốt hơn khi có nhiều templates)

#### **3. Template Validation** (Low Priority)
**Đề xuất**: Validate template config khi load (check required fields, adapter exists)
**Lợi ích**: Catch errors sớm, better error messages
**Ưu tiên**: Thấp (có thể làm sau)

#### **4. Template Metadata** (Low Priority)
**Đề xuất**: Thêm metadata (version, author, thumbnail) vào registry
**Lợi ích**: Hiển thị thông tin template trong UI
**Ưu tiên**: Thấp (nice to have)

### 🎯 **Kết Luận**
**Hiện tại đã sẵn sàng 95% để thêm template mới**. Những cải thiện trên là "nice to have", không bắt buộc. Có thể làm sau khi đã có 2-3 templates hoạt động.

---

## 📝 Checklist Khi Thêm Template Mới

### **Bắt Buộc**
- [ ] Tạo folder `{template-name}-template/`
- [ ] Tạo `editor/editor-adapter.js` (extend BaseAdapter)
- [ ] Implement `save()`, `load()`, `isDirty()`, `generateGameId()`
- [ ] Implement `game.js` với READY signal và UPDATE_CONFIG listener
- [ ] Thêm entry vào `TEMPLATE_REGISTRY`
- [ ] Test: Template xuất hiện trong dropdown
- [ ] Test: Switch template hoạt động
- [ ] Test: Upload logo, story, config hoạt động
- [ ] Test: Play Test hiển thị game
- [ ] Test: Save & Copy Link hoạt động

### **Optional**
- [ ] Thêm `config.js` nếu cần custom config logic
- [ ] Thêm `style.css` cho template-specific styles
- [ ] Thêm game data files (như `maps.js`)

---

## 🔗 Files Quan Trọng Cần Nhớ

### **Core (Dùng Chung)**
- `core/template-registry.js` - **QUAN TRỌNG**: Thêm template config ở đây
- `core/playtest-manager.js` - Quản lý playtest iframe
- `core/base-adapter.js` - Base class cho adapters
- `core/storage-manager.js` - Cleanup old keys
- `core/image-optimizer.js` - Nén ảnh logo

### **Template (Dùng Riêng)**
- `{template-name}-template/editor/editor-adapter.js` - **BẮT BUỘC**: Implement adapter
- `{template-name}-template/game.js` - **BẮT BUỘC**: Game logic + READY signal
- `{template-name}-template/index.html` - Game view

### **Editor**
- `index.html` - Main editor UI (không cần sửa khi thêm template mới)

---

## 🎓 Lessons Learned

### **Những Gì Đã Học**
1. ✅ **Synchronous vs Asynchronous**: Template đầu tiên nên synchronous, switch template mới async
2. ✅ **Top-level Event Listeners**: Không wrap trong function để tránh timing gap
3. ✅ **Separation of Concerns**: Tách playtest logic vào core, editor chỉ focus UI
4. ✅ **Registry Pattern**: Centralized config dễ maintain và scale
5. ✅ **Lazy Loading**: Chỉ load adapter khi cần (switch template)

### **Best Practices**
- ✅ Template đầu tiên: Synchronous initialization
- ✅ Event listeners: Top-level, không wrap trong function
- ✅ Core modules: Dùng chung 100%
- ✅ Template-specific: Chỉ trong template folder
- ✅ Registry: Single source of truth

---

## 📞 Hướng Dẫn Chuyển Đoạn Chat Mới

### **Thông Tin Cần Cung Cấp**
1. **Mục tiêu**: "Tôi muốn thêm template game mới vào templates-v2"
2. **Reference**: "Xem `pacman-template/` làm reference"
3. **Workflow**: "Theo workflow trong README-TEMPLATE-V2.md"
4. **Registry**: "Thêm config vào `core/template-registry.js`"

### **Files Cần Đọc**
- `games/templates-v2/README-TEMPLATE-V2.md` (file này)
- `games/templates-v2/pacman-template/editor/editor-adapter.js` (reference)
- `games/templates-v2/core/template-registry.js` (thêm config ở đây)
- `games/templates-v2/core/base-adapter.js` (interface cần implement)

### **Quick Start**
```
1. Copy pacman-template → {template-name}-template
2. Implement editor-adapter.js (extend BaseAdapter)
3. Implement game.js (READY signal + UPDATE_CONFIG listener)
4. Thêm entry vào TEMPLATE_REGISTRY
5. Test
```

---

**✅ Kết luận**: Templates-V2 đã sẵn sàng 95% để thêm template mới. Chỉ cần follow workflow trên là có thể thêm template mới trong 2-4 giờ.

