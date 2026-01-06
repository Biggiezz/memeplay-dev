# 🐾 Pet Avatar Game - Setup Guide

## 📁 Cấu trúc Assets Cần Thiết

Bạn cần tạo các thư mục và files sau trong `assets/`:

```
assets/
├── background.jpg          # Background image (720x1000px)
├── buttons/
│   ├── shower-icon.png     # Icon vòi hoa sen (35x35px hoặc lớn hơn)
│   ├── mic-icon.png        # Icon micro (35x35px hoặc lớn hơn)
│   ├── fly-icon.png        # Icon con ruồi (35x35px hoặc lớn hơn)
│   └── beer-icon.png       # Icon lon bia (35x35px hoặc lớn hơn)
└── avatar/
    ├── idle/
    │   └── sprite.png      # Sprite sheet cho idle animation
    ├── shower/
    │   └── sprite.png      # Sprite sheet cho shower action
    ├── sing/
    │   └── sprite.png      # Sprite sheet cho sing action
    ├── fly/
    │   └── sprite.png      # Sprite sheet cho fly action
    └── drink/
        └── sprite.png      # Sprite sheet cho drink action
```

## 🎨 Sprite Sheet Format

Mỗi sprite sheet cần có format:
- **Layout:** Horizontal hoặc grid (nhiều frames trong 1 row)
- **Frame size:** Mỗi frame có kích thước cố định (ví dụ: 200x200px)
- **Naming:** `sprite.png` trong mỗi thư mục action

### Cấu hình Sprite Sheet

Bạn cần update `spriteConfig` trong `game.js` với thông tin chính xác:

```javascript
let spriteConfig = {
    idle: { frames: 8, width: 200, height: 200 },    // Số frame và kích thước
    shower: { frames: 12, width: 200, height: 200 },
    sing: { frames: 10, width: 200, height: 200 },
    fly: { frames: 8, width: 200, height: 200 },
    drink: { frames: 10, width: 200, height: 200 }
};
```

## 🎵 Âm Thanh

Game sử dụng **procedural audio** (Web Audio API) để tạo âm thanh tự động, không cần file audio.

Nếu bạn muốn thay đổi âm thanh, có thể:
1. Modify function `playOnionSound()` trong `game.js`
2. Hoặc thêm file audio và load như các game khác

## ⚙️ Cấu Hình

### Action Durations

Mặc định:
- `shower`: 3 giây
- `sing`: 4 giây
- `fly`: 2.5 giây
- `drink`: 3 giây

Bạn có thể thay đổi trong `ACTION_DURATIONS` trong `game.js`.

### Button Positions

4 nút được đặt:
- **Left side:** Shower (top), Mic (bottom)
- **Right side:** Fly (top), Beer (bottom)
- **Distance from avatar:** 120px
- **Size:** 35x35px

Có thể điều chỉnh trong `BUTTONS` và `BUTTON_OFFSET_X` trong `game.js`.

## 🚀 Testing

1. Đảm bảo tất cả assets đã được đặt đúng vị trí
2. Mở `index.html` trong browser
3. Game sẽ tự động load và hiển thị
4. Click các nút để test actions

## 📝 Notes

- Game sử dụng **40 FPS** cho game loop
- Sprite animation sử dụng **10 FPS** (chuyển frame mỗi 100ms)
- Cooldown giữa các actions: **0.5 giây**
- Actions có thể **interrupt** nhau
- Game sẽ **luôn hiển thị đầu tiên** trong danh sách games



