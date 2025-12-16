# Crypto Blocks 8×8 - Mobile Testing Guide

## 📱 Test trên Mobile

### Option 1: Local Network (Recommended)

1. **Start server với IP address:**
   ```bash
   # Windows PowerShell
   python -m http.server 5500 --bind 0.0.0.0
   
   # Hoặc dùng script
   START-MOBILE-SERVER.bat
   ```

2. **Tìm IP address của máy:**
   ```bash
   # Windows
   ipconfig
   # Tìm "IPv4 Address" (ví dụ: 192.168.1.3)
   ```

3. **Mở trên mobile:**
   ```
   http://192.168.1.3:5500/games/crypto-blocks/index.html
   ```
   (Thay `192.168.1.3` bằng IP của máy bạn)

### Option 2: Ngrok (Public URL)

1. **Cài đặt ngrok:**
   ```bash
   # Download từ https://ngrok.com/
   ```

2. **Start local server:**
   ```bash
   python -m http.server 5500
   ```

3. **Start ngrok:**
   ```bash
   ngrok http 5500
   ```

4. **Copy URL từ ngrok** (ví dụ: `https://abc123.ngrok.io`)

5. **Mở trên mobile:**
   ```
   https://abc123.ngrok.io/games/crypto-blocks/index.html
   ```

### Option 3: Deploy lên GitHub Pages

1. Push code lên GitHub
2. Enable GitHub Pages
3. Access: `https://username.github.io/repo/games/crypto-blocks/index.html`

## 🔧 Quick Test Script

Chạy `START-MOBILE-SERVER.bat` để tự động:
- Start server với IP binding
- Hiển thị IP address
- Mở browser với link mobile

## 📝 Notes

- Đảm bảo mobile và máy tính cùng WiFi network
- Firewall có thể block port 5500
- Test trên nhiều devices để đảm bảo responsive

