# 🔧 GITHUB PAGES SETUP GUIDE

> **Mục tiêu:** Hướng dẫn setup GitHub Pages để deployment không bị fail

**Ngày tạo:** 2024-12-19  
**Status:** ✅ Setup Guide

---

## 🚨 VẤN ĐỀ

GitHub Actions deployment fail với lỗi permissions hoặc configuration.

---

## ✅ GIẢI PHÁP

### **Step 1: Enable GitHub Pages**

1. Vào GitHub repo: `https://github.com/Biggiezz/memeplay-dev`
2. Click **Settings** → **Pages**
3. **Source:** Chọn **GitHub Actions** (không phải "Deploy from a branch")
4. Click **Save**

---

### **Step 2: Set Workflow Permissions**

1. Vào **Settings** → **Actions** → **General**
2. Scroll xuống **Workflow permissions**
3. Chọn: **Read and write permissions**
4. Check: **Allow GitHub Actions to create and approve pull requests**
5. Click **Save**

---

### **Step 3: Verify Workflow File**

File `.github/workflows/deploy.yml` đã được update với:
- ✅ Permissions: `contents: read`, `pages: write`, `id-token: write`
- ✅ Official GitHub Pages actions (v4)
- ✅ Environment configuration

---

## 🔍 TROUBLESHOOTING

### **Issue 1: "Permission denied"**
**Solution:**
- Check Step 2: Workflow permissions phải là "Read and write"
- Check Step 1: GitHub Pages source phải là "GitHub Actions"

---

### **Issue 2: "Environment not found"**
**Solution:**
- GitHub Pages environment sẽ tự động tạo khi enable GitHub Actions
- Nếu vẫn lỗi → Disable và enable lại GitHub Pages

---

### **Issue 3: "No artifacts found"**
**Solution:**
- Check workflow file có `upload-pages-artifact` step không
- Check `publish_dir` đúng không

---

## 📋 CHECKLIST

- [ ] GitHub Pages enabled (Settings > Pages > Source: GitHub Actions)
- [ ] Workflow permissions set (Settings > Actions > General > Read and write)
- [ ] Workflow file updated (`.github/workflows/deploy.yml`)
- [ ] Push code → Check Actions tab → Deployment should succeed

---

## 🎯 ALTERNATIVE: Nếu không dùng GitHub Pages

Nếu bạn dùng **Vercel** hoặc **server riêng**, có thể:
1. Disable GitHub Pages workflow
2. Hoặc giữ workflow nhưng không dùng (không ảnh hưởng)

---

**Last Updated:** 2024-12-19  
**Status:** ✅ Ready

