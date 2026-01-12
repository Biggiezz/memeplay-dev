# 🔒 SETUP HTTPS LOCAL CHO BASE APP TESTING

> **Vấn đề:** Base App yêu cầu HTTPS, không thể dùng HTTP local

**Ngày tạo:** 2024-12-19  
**Status:** ✅ Solutions Available

---

## 🚨 VẤN ĐỀ

Base App yêu cầu **HTTPS** để hoạt động. Khi truy cập qua HTTP local (`http://192.168.1.100:5500`), sẽ báo lỗi:
```
SSL error has occurred and a secure connection to the server cannot be made.
```

---

## ✅ GIẢI PHÁP

### **Option 1: Dùng ngrok (Khuyến nghị - Dễ nhất)** ⭐

**Ngrok** tạo HTTPS tunnel tự động, không cần setup SSL certificate.

#### **Step 1: Cài đặt ngrok**
```bash
# Download từ: https://ngrok.com/download
# Hoặc dùng npm:
npm install -g ngrok
```

#### **Step 2: Chạy local server**
```bash
# Terminal 1: Chạy local server
npm start
# Hoặc
python -m http.server 5500
```

#### **Step 3: Tạo HTTPS tunnel**
```bash
# Terminal 2: Chạy ngrok
ngrok http 5500
```

#### **Step 4: Lấy HTTPS URL**
Ngrok sẽ hiển thị:
```
Forwarding: https://abc123.ngrok.io -> http://localhost:5500
```

#### **Step 5: Test trên Base App**
- Mở Base App trên mobile
- Navigate to: `https://abc123.ngrok.io/index.html`
- ✅ Không còn SSL error!

**Pros:**
- ✅ Dễ setup (chỉ cần 1 command)
- ✅ HTTPS tự động
- ✅ Có thể share link cho người khác
- ✅ Free plan đủ dùng

**Cons:**
- ⚠️ URL thay đổi mỗi lần chạy (free plan)
- ⚠️ Cần internet connection

---

### **Option 2: Dùng mkcert (Self-signed Certificate)**

Tạo self-signed SSL certificate cho local development.

#### **Step 1: Cài đặt mkcert**
```bash
# Windows (choco):
choco install mkcert

# Mac (homebrew):
brew install mkcert

# Linux:
# Xem: https://github.com/FiloSottile/mkcert
```

#### **Step 2: Setup local CA**
```bash
mkcert -install
```

#### **Step 3: Tạo certificate**
```bash
# Tạo certificate cho localhost và IP local
mkcert 192.168.1.100 localhost 127.0.0.1 ::1
```

Sẽ tạo 2 files:
- `192.168.1.100+3.pem` (certificate)
- `192.168.1.100+3-key.pem` (private key)

#### **Step 4: Chạy HTTPS server**

**Với Node.js (serve):**
```bash
npx serve -s . -l tls://0.0.0.0:5500 --ssl-cert 192.168.1.100+3.pem --ssl-key 192.168.1.100+3-key.pem
```

**Với Python:**
```python
# Cần install: pip install pyopenssl
# Tạo script: https-server.py
```

**Pros:**
- ✅ URL cố định (IP local)
- ✅ Không cần internet
- ✅ Hoạt động offline

**Cons:**
- ⚠️ Setup phức tạp hơn
- ⚠️ Cần install certificate trên mobile

---

### **Option 3: Deploy lên Production (Khuyến nghị cho test thật)** ⭐⭐

Deploy lên server có HTTPS (Vercel, Netlify, hoặc server của bạn).

#### **Step 1: Deploy**
```bash
git add .
git commit -m "feat: Task 1.1 - Base App Detection"
git push origin main

# Deploy lên production
# (tùy vào deployment method của bạn)
```

#### **Step 2: Test trên Base App**
- Mở Base App trên mobile
- Navigate to: `https://memeplay.dev`
- ✅ HTTPS tự động!

**Pros:**
- ✅ HTTPS tự động (production)
- ✅ URL cố định
- ✅ Giống production environment nhất

**Cons:**
- ⚠️ Cần deploy mỗi lần thay đổi
- ⚠️ Có thể ảnh hưởng production

---

## 🎯 KHUYẾN NGHỊ

### **Cho Development/Testing:**
1. **Option 1: ngrok** - Dễ nhất, nhanh nhất
2. **Option 2: mkcert** - Nếu muốn URL cố định

### **Cho Production Testing:**
- **Option 3: Deploy** - Test trên production thật

---

## 📋 QUICK START VỚI NGROK

```bash
# 1. Install ngrok
npm install -g ngrok

# 2. Chạy local server (Terminal 1)
npm start

# 3. Tạo HTTPS tunnel (Terminal 2)
ngrok http 5500

# 4. Copy HTTPS URL từ ngrok
# Ví dụ: https://abc123.ngrok.io

# 5. Test trên Base App
# Navigate to: https://abc123.ngrok.io/index.html
```

---

## 🔍 TROUBLESHOOTING

### **Issue 1: ngrok không chạy**
**Solution:** 
- Check internet connection
- Check port 5500 đã được dùng chưa
- Try: `ngrok http 5500 --region us` (hoặc `eu`, `ap`)

### **Issue 2: Base App vẫn báo SSL error với ngrok**
**Solution:**
- Check URL có `https://` không (không phải `http://`)
- Check ngrok tunnel đang chạy
- Try restart ngrok

### **Issue 3: mkcert certificate không được trust**
**Solution:**
- Check đã chạy `mkcert -install` chưa
- Check certificate đã được install trên mobile chưa
- Try clear browser cache

---

## 📝 NOTES

- **ngrok free plan:** URL thay đổi mỗi lần chạy
- **ngrok paid plan:** Có thể set custom domain
- **mkcert:** Cần install certificate trên mobile để trust
- **Production:** Luôn dùng HTTPS, không cần setup gì

---

**Last Updated:** 2024-12-19  
**Status:** ✅ Ready to Use

