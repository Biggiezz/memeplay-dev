# Local Development - Short URL Support

## Vấn đề

URL ngắn `/pacman-game-6919` không hoạt động trên local server vì static server không hỗ trợ rewrite rules.

## Giải pháp

### Option 1: Dùng `serve` package (Hỗ trợ short URL) ✅

1. **Cài đặt:**
   ```bash
   npm install
   ```

2. **Chạy server:**
   ```bash
   # Windows
   START-LOCAL-SERVER.bat
   
   # Hoặc
   npm run dev
   ```

3. **Truy cập:**
   ```
   http://localhost:5500/pacman-game-6919 ✅
   ```

### Option 2: Dùng full URL (Không cần cài thêm)

Chỉ cần dùng full URL khi test local:

```
http://localhost:5500/games/templates/pacman-template/index.html?game=pacman-game-6919
```

## Production

Trên production (memeplay.dev), cả 2 format đều hoạt động:
- Short: `https://memeplay.dev/pacman-game-6919` ✅
- Full: `https://memeplay.dev/games/templates/pacman-template/index.html?game=pacman-game-6919` ✅

## Lưu ý

- **Local development:** Dùng full URL hoặc `serve` package
- **Production:** Cả 2 format đều hoạt động nhờ Vercel rewrite rules

