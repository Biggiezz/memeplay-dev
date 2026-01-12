# 🔍 CÁCH KIỂM TRA LỖI GITHUB ACTIONS

> **Mục tiêu:** Hướng dẫn cách xem chi tiết lỗi deployment trên GitHub

**Ngày tạo:** 2024-12-19  
**Status:** ✅ Debug Guide

---

## 📍 CÁCH XEM LỖI CHI TIẾT

### **Method 1: Qua GitHub Website (Khuyến nghị)**

#### **Step 1: Vào Actions Tab**
1. Mở: `https://github.com/Biggiezz/memeplay-dev`
2. Click tab **Actions** (ở trên cùng, bên cạnh Code, Issues, Pull requests)

#### **Step 2: Xem Failed Workflow**
1. Bạn sẽ thấy list các workflows
2. Tìm workflow **"Deploy to GitHub Pages"** với status **❌ Failed** (màu đỏ)
3. Click vào workflow đó

#### **Step 3: Xem Chi Tiết Lỗi**
1. Bạn sẽ thấy các jobs (thường là "deploy")
2. Click vào job **"deploy"** (có icon ❌ màu đỏ)
3. Bạn sẽ thấy các steps:
   - ✅ Checkout (thường pass)
   - ✅ Setup Pages (thường pass)
   - ❌ Upload artifact (có thể fail ở đây)
   - ❌ Deploy to GitHub Pages (có thể fail ở đây)
4. Click vào step bị fail → Xem **error message** chi tiết

#### **Step 4: Copy Error Message**
- Copy toàn bộ error message
- Gửi cho tôi để phân tích

---

### **Method 2: Qua Email Notification**

Nếu bạn nhận email từ GitHub:
1. Email sẽ có subject: `[Biggiezz/memeplay-dev] Deploy to GitHub Pages failed`
2. Click vào link trong email → Sẽ dẫn đến Actions tab
3. Follow Step 2-4 ở trên

---

## 🔍 CÁC LỖI THƯỜNG GẶP

### **Lỗi 1: "Permission denied"**
**Error message:**
```
Error: Permission denied
```

**Nguyên nhân:**
- Workflow permissions chưa được set đúng

**Fix:**
1. Settings → Actions → General
2. Workflow permissions → **Read and write permissions**
3. Save

---

### **Lỗi 2: "Environment not found"**
**Error message:**
```
Error: Environment 'github-pages' not found
```

**Nguyên nhân:**
- GitHub Pages chưa được enable

**Fix:**
1. Settings → Pages
2. Source → **GitHub Actions**
3. Save

---

### **Lỗi 3: "No artifacts found"**
**Error message:**
```
Error: No artifacts found
```

**Nguyên nhân:**
- Upload artifact step fail
- Hoặc artifact không được tạo

**Fix:**
- Check workflow file có `upload-pages-artifact` step không
- Check `path: '.'` đúng không

---

### **Lỗi 4: "Workflow file syntax error"**
**Error message:**
```
Error: Invalid workflow file
```

**Nguyên nhân:**
- YAML syntax error trong workflow file

**Fix:**
- Check `.github/workflows/deploy.yml` có syntax error không
- Validate YAML online

---

## 📋 QUICK CHECKLIST

Để debug nhanh:

1. **Vào Actions tab:**
   ```
   https://github.com/Biggiezz/memeplay-dev/actions
   ```

2. **Click vào failed workflow** (màu đỏ)

3. **Click vào failed job** (thường là "deploy")

4. **Click vào failed step** → Xem error message

5. **Copy error message** → Gửi cho tôi

---

## 🎯 CÁCH TỐT NHẤT

**Copy link này và mở trong browser:**
```
https://github.com/Biggiezz/memeplay-dev/actions
```

Sau đó:
1. Click vào workflow mới nhất (failed)
2. Click vào job "deploy"
3. Scroll xuống xem error message
4. Copy error message và gửi cho tôi

---

## 💡 TIP

Nếu không thấy Actions tab:
- Check bạn có quyền access repo không
- Check repo có public không (hoặc bạn có access)

---

**Last Updated:** 2024-12-19  
**Status:** ✅ Ready

