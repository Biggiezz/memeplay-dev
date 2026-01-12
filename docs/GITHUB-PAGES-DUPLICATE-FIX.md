# 🔧 FIX: DUPLICATE WORKFLOWS - GitHub Pages

> **Vấn đề:** Mỗi lần push có 2 workflows chạy (1 fail, 1 success)

**Ngày tạo:** 2024-12-19  
**Status:** ✅ Solution Guide

---

## 🚨 VẤN ĐỀ

Mỗi lần push GitHub, có **2 workflows** chạy:
1. ❌ **"Deploy to GitHub Pages"** (fail) - Workflow manual của chúng ta
2. ✅ **"pages build and deployment"** (success) - GitHub tự động deploy

**Nguyên nhân:**
- GitHub Pages đang được set **"Deploy from a branch"** thay vì **"GitHub Actions"**
- GitHub tự động tạo workflow "pages build and deployment"
- Workflow manual của chúng ta conflict với workflow tự động

---

## ✅ GIẢI PHÁP

### **Option 1: Dùng GitHub Actions (Khuyến nghị)** ⭐

**Nếu bạn muốn control deployment qua workflow:**

#### **Step 1: Enable GitHub Actions Source**
1. Vào: `https://github.com/Biggiezz/memeplay-dev/settings/pages`
2. **Source:** Chọn **"GitHub Actions"** (không phải "Deploy from a branch")
3. Click **Save**

#### **Step 2: Disable Auto Deployment**
- GitHub sẽ tự động disable workflow "pages build and deployment"
- Chỉ còn workflow manual "Deploy to GitHub Pages"

**Kết quả:**
- ✅ Chỉ có 1 workflow chạy
- ✅ Control được deployment qua workflow file
- ✅ Có thể customize deployment process

---

### **Option 2: Dùng "Deploy from a branch" (Đơn giản hơn)** ⭐⭐

**Nếu bạn không cần control deployment:**

#### **Step 1: Xóa Workflow Manual**
```bash
# Xóa file workflow manual
rm .github/workflows/deploy.yml

# Commit và push
git add .github/workflows/deploy.yml
git commit -m "chore: Remove manual GitHub Pages workflow (use auto deployment)"
git push origin main
```

#### **Step 2: Giữ "Deploy from a branch"**
1. Vào: `https://github.com/Biggiezz/memeplay-dev/settings/pages`
2. **Source:** Giữ **"Deploy from a branch"**
3. **Branch:** Chọn `main` (hoặc branch bạn muốn)

**Kết quả:**
- ✅ Chỉ có 1 workflow tự động chạy
- ✅ Đơn giản hơn, không cần maintain workflow file
- ✅ GitHub tự động deploy mỗi khi push

---

## 🎯 KHUYẾN NGHỊ

### **Nếu bạn đang dùng Vercel/server riêng:**
→ **Option 2:** Xóa workflow manual, không cần GitHub Pages

### **Nếu bạn muốn dùng GitHub Pages:**
→ **Option 2:** Dùng "Deploy from a branch" (đơn giản nhất)

### **Nếu bạn muốn control deployment:**
→ **Option 1:** Dùng GitHub Actions

---

## 📋 CHECKLIST

### **Option 1 (GitHub Actions):**
- [ ] Settings → Pages → Source: **GitHub Actions**
- [ ] Workflow "pages build and deployment" tự động disable
- [ ] Chỉ còn workflow "Deploy to GitHub Pages"
- [ ] Test push → Chỉ có 1 workflow chạy

### **Option 2 (Deploy from branch):**
- [ ] Xóa `.github/workflows/deploy.yml`
- [ ] Settings → Pages → Source: **Deploy from a branch**
- [ ] Branch: `main`
- [ ] Test push → Chỉ có 1 workflow tự động chạy

---

## 🔍 VERIFY

Sau khi fix, check:
```
https://github.com/Biggiezz/memeplay-dev/actions
```

**Expected:**
- ✅ Chỉ có 1 workflow chạy mỗi lần push
- ✅ Không còn duplicate workflows
- ✅ Deployment thành công

---

**Last Updated:** 2024-12-19  
**Status:** ✅ Ready

