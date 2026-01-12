# 📚 BASE APP INTEGRATION DOCUMENTATION

> **Mục tiêu:** Tài liệu cho Base App Mini App integration

**Last Updated:** 2024-12-19  
**Status:** ✅ Mentor Approved - Ready for Implementation

---

## 📋 CÁC FILE CHÍNH

### **1. SPRINT-SCOPE-DO-DONT.md** ⭐ **QUAN TRỌNG NHẤT**
- **Mục đích:** Scope chính xác, DO / DON'T list, 3 quyết định cứng
- **Khi nào dùng:** Trước khi implement, check scope và quyết định cứng
- **Status:** ✅ Mentor Approved

### **2. TASKS-SUMMARY.md**
- **Mục đích:** Tổng hợp đầy đủ tất cả tasks cần làm (5 phases)
- **Khi nào dùng:** Khi cần xem chi tiết tasks và timeline
- **Status:** ✅ Mentor Approved

### **3. MENTOR-REVIEW-SUMMARY.md**
- **Mục đích:** Chi tiết implementation plan, technical decisions
- **Khi nào dùng:** Khi cần reference technical details
- **Status:** ✅ Mentor Approved

### **4. IMPLEMENTATION-PLAN.md**
- **Mục đích:** Original implementation plan, roadmap
- **Khi nào dùng:** Khi cần xem original plan
- **Status:** ✅ Reference

### **5. TEST-CHECKLIST.md**
- **Mục đích:** Testing checklist cho Base App integration
- **Khi nào dùng:** Khi test features
- **Status:** ✅ Ready

### **6. BASE-APP-AVATAR-INTEGRATION.md**
- **Mục đích:** Avatar integration analysis (tạm bỏ qua)
- **Khi nào dùng:** Khi implement avatar Base App (P2 - sau khi list)
- **Status:** ⏸️ Tạm bỏ qua (P2)

---

## 🎯 QUICK START

### **Bắt đầu implement:**
1. Đọc `SPRINT-SCOPE-DO-DONT.md` → Hiểu scope và quyết định cứng
2. Đọc `TASKS-SUMMARY.md` → Xem chi tiết tasks
3. Bắt đầu Phase 1 → Base App Detection & UI Adaptation

### **Khi cần reference:**
- Technical details → `MENTOR-REVIEW-SUMMARY.md`
- Original plan → `IMPLEMENTATION-PLAN.md`
- Testing → `TEST-CHECKLIST.md`

---

## 🔴 3 QUYẾT ĐỊNH CỨNG (KHÔNG BÀN LẠI)

### **1. Username Display Rule**
```
1. MemePlay username → dùng
2. Nếu không → ENS (nếu có)
3. Nếu không → "Player"
❌ KHÔNG HIỂN THỊ 0x
```

### **2. Welcome Screen**
```
- Chỉ 1 lần mỗi session (sessionStorage)
- Không block gameplay hoặc wallet
```

### **3. Share Text V1**
```
"Got {score} in {gameName}! Rank #{rank}"
❌ Không thêm percentile
```

---

## ❌ KHÔNG LÀM TRONG SPRINT NÀY

- ❌ Base App Avatar Integration (P2 - Làm sau khi list)
- ❌ Pull-to-Refresh Fix (Có thể là limitation)
- ❌ Over-engineering (routes riêng, server-side detect, etc.)

---

## 📊 TIMELINE

| Phase | Time | Status |
|-------|------|--------|
| Phase 1 | 2-3h | ⏳ Pending |
| Phase 2 | 2-3h | ⏳ Pending |
| Phase 3 | 3-4h | ⏳ Pending |
| Phase 4 | 4-5h | ⏳ Pending |
| Phase 5 | 2-3h | ⏳ Pending |
| **TOTAL** | **13-18h** | **2-3 ngày** |

---

## 🚀 NEXT STEPS

1. ✅ Review documents
2. ⏳ Start Phase 1: Base App Detection & UI Adaptation
3. ⏳ Implement theo checklist
4. ⏳ Test & Deploy

---

**Note:** Tất cả quyết định cứng đã được mentor approve. **KHÔNG BÀN LẠI** trong sprint này.

