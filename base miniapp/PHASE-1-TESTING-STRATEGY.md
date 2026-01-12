# 🧪 PHASE 1 TESTING STRATEGY

> **Mục tiêu:** Hướng dẫn cách test Phase 1 - Base App Detection & UI Adaptation

**Ngày tạo:** 2024-12-19  
**Status:** ✅ Ready for Testing

---

## 🎯 TESTING APPROACH

### **Option 1: Test Incremental (Recommended)** ✅
- Test sau mỗi task quan trọng
- Phát hiện bug sớm
- Dễ debug hơn

### **Option 2: Test Sau Khi Hoàn Thành Phase 1**
- Test một lần sau khi làm xong tất cả
- Nhanh hơn nhưng khó debug nếu có nhiều bugs

**👉 Recommendation: Test Incremental (Option 1)**

---

## 📋 PHASE 1 TASKS & TESTING POINTS

### **Task 1.1: Base App Detection** (30min)

**Implementation:**
- Add inline script trong `index.html`
- Function: `isBaseAppEnvironment()`
- Store flag: `window.__isBaseApp`

**✅ Test Point 1.1:**
```javascript
// Test trong browser console:
console.log('Is Base App?', window.__isBaseApp);
console.log('Detection function:', typeof isBaseAppEnvironment);

// Expected:
// - Desktop: false
// - Base App: true
```

**Test Checklist:**
- [ ] Function `isBaseAppEnvironment()` exists
- [ ] `window.__isBaseApp` được set đúng
- [ ] Desktop browser → `false`
- [ ] Base App webview → `true` (cần test trên Base App)

**⚠️ Note:** Base App detection chỉ test được trên Base App webview thật. Desktop test chỉ verify function exists.

---

### **Task 1.2: Hide External Links** (1h)

**Implementation:**
- Function: `hideExternalLinks()`
- Hide dropdown social links
- Hide share overlay buttons
- Hide divider nếu cần
- Layout adjustment

**✅ Test Point 1.2:**
```javascript
// Test trong browser console:
const isBase = window.__isBaseApp;
const socialX = document.querySelector('[data-action="social-x"]');
const socialTelegram = document.querySelector('[data-action="social-telegram"]');

console.log('Base App?', isBase);
console.log('Social X visible?', socialX?.style.display !== 'none');
console.log('Social Telegram visible?', socialTelegram?.style.display !== 'none');

// Expected:
// - Desktop: visible (display !== 'none')
// - Base App: hidden (display === 'none')
```

**Test Checklist:**
- [ ] `hideExternalLinks()` function exists
- [ ] Desktop → Social links visible
- [ ] Base App → Social links hidden
- [ ] Share overlay buttons hidden trong Base App
- [ ] Divider hidden nếu tất cả social links bị ẩn
- [ ] Layout adjusted correctly (center Copy Link)

**⚠️ Note:** Có thể test trên Desktop bằng cách manually set `window.__isBaseApp = true` để simulate Base App.

---

### **Task 1.3: Base App Welcome Screen** (1h)

**Implementation:**
- HTML overlay trong `index.html`
- CSS animation
- JavaScript logic (show/hide)
- sessionStorage check

**✅ Test Point 1.3:**
```javascript
// Test trong browser console:
const welcomeScreen = document.getElementById('baseAppWelcomeScreen');
const welcomeShown = sessionStorage.getItem('baseAppWelcomeShown');

console.log('Welcome screen element:', welcomeScreen);
console.log('Welcome shown flag:', welcomeShown);
console.log('Is Base App?', window.__isBaseApp);

// Expected:
// - Desktop: welcomeScreen = null hoặc hidden
// - Base App (first visit): welcomeScreen visible, auto-hide sau 2-3s
// - Base App (after refresh): welcomeScreen hidden (sessionStorage check)
```

**Test Checklist:**
- [ ] Welcome screen HTML exists
- [ ] CSS animation works (fade in, scale up)
- [ ] Desktop → Welcome screen không hiện
- [ ] Base App (first visit) → Welcome screen hiện
- [ ] Auto-hide sau 2-3s works
- [ ] Click to skip works
- [ ] sessionStorage flag được set
- [ ] Refresh → Welcome screen không hiện lại (same session)

**⚠️ Note:** Có thể test trên Desktop bằng cách manually set `window.__isBaseApp = true`.

---

### **Task 1.4: Conditional UI Logic** (30min)

**Implementation:**
- Call `hideExternalLinks()` khi detect Base App
- Show Welcome Screen khi detect Base App
- Test trên Desktop vs Base App

**✅ Test Point 1.4:**
```javascript
// Test trong browser console:
console.log('=== PHASE 1 INTEGRATION TEST ===');
console.log('Is Base App?', window.__isBaseApp);
console.log('External links hidden?', document.querySelector('[data-action="social-x"]')?.style.display === 'none');
console.log('Welcome screen shown?', document.getElementById('baseAppWelcomeScreen')?.classList.contains('show'));
```

**Test Checklist:**
- [ ] Desktop → Links visible, no welcome screen
- [ ] Base App → Links hidden, welcome screen shows
- [ ] All functions called correctly
- [ ] No console errors

---

## 🧪 TESTING WORKFLOW

### **Step 1: Local Development Testing (Desktop)**

**1.1. Test Base App Detection:**
```bash
# 1. Implement Task 1.1
# 2. Open index.html in browser
# 3. Open DevTools Console
# 4. Check:
console.log(window.__isBaseApp); // Should be false
```

**1.2. Test Hide External Links (Simulate Base App):**
```javascript
// In browser console:
window.__isBaseApp = true; // Simulate Base App
hideExternalLinks(); // Call function manually
// Check: Social links should be hidden
```

**1.3. Test Welcome Screen (Simulate Base App):**
```javascript
// In browser console:
window.__isBaseApp = true; // Simulate Base App
// Check: Welcome screen should show
// Wait 2-3s: Should auto-hide
// Refresh page: Should not show again (sessionStorage)
```

**1.4. Integration Test:**
```javascript
// In browser console:
// Simulate Base App:
window.__isBaseApp = true;
// Reload page or trigger initialization
// Check: All features work together
```

---

### **Step 2: Base App Webview Testing (Real Environment)**

**⚠️ Important:** Base App detection chỉ test được trên Base App webview thật.

**2.1. Deploy to Production:**
```bash
# 1. Commit changes
git add .
git commit -m "feat: Phase 1 - Base App Detection & UI Adaptation"
git push origin main

# 2. Deploy to production server
# (tùy vào deployment method của bạn)
```

**2.2. Test trên Base App:**
1. Open Base App trên mobile
2. Navigate to `https://memeplay.dev`
3. Check:
   - ✅ Welcome screen shows (first visit)
   - ✅ Social links hidden
   - ✅ Layout adjusted
   - ✅ No console errors

**2.3. Test Edge Cases:**
- Refresh page → Welcome screen không hiện lại
- Close và reopen Base App → Welcome screen hiện lại (new session)
- Test trên Desktop → Links visible, no welcome screen

---

## 📊 TESTING CHECKLIST SUMMARY

### **Desktop Testing (Simulation):**
- [ ] Task 1.1: Base App Detection function exists
- [ ] Task 1.2: Hide External Links works (simulate Base App)
- [ ] Task 1.3: Welcome Screen works (simulate Base App)
- [ ] Task 1.4: Integration test (simulate Base App)

### **Base App Testing (Real):**
- [ ] Task 1.1: Base App Detection works (`window.__isBaseApp === true`)
- [ ] Task 1.2: External Links hidden
- [ ] Task 1.3: Welcome Screen shows (first visit)
- [ ] Task 1.3: Welcome Screen auto-hides (2-3s)
- [ ] Task 1.3: Welcome Screen không hiện lại (refresh)
- [ ] Task 1.4: All features work together
- [ ] No console errors
- [ ] No UI regressions

---

## 🚨 COMMON ISSUES & SOLUTIONS

### **Issue 1: Welcome Screen hiện mỗi reload**
**Solution:** Check sessionStorage logic - flag phải được set đúng

### **Issue 2: External Links vẫn visible trong Base App**
**Solution:** Check `hideExternalLinks()` được gọi đúng lúc, check selectors

### **Issue 3: Base App Detection không work**
**Solution:** Check `isCoinbaseWallet` và User Agent detection logic

### **Issue 4: Layout không adjust**
**Solution:** Check CSS cho Copy Link button (center nếu chỉ còn 1 button)

---

## ✅ SUCCESS CRITERIA

### **Phase 1 Complete khi:**
- ✅ Base App được detect correctly
- ✅ External links hidden trong Base App
- ✅ Links visible trong Desktop
- ✅ Welcome screen hiển thị đúng (chỉ 1 lần/session)
- ✅ Layout adjusted correctly
- ✅ No console errors
- ✅ No UI regressions

---

## 🎯 RECOMMENDED TESTING APPROACH

### **Incremental Testing (Recommended):**

1. **Implement Task 1.1** → Test detection function
2. **Implement Task 1.2** → Test hide links (simulate Base App)
3. **Implement Task 1.3** → Test welcome screen (simulate Base App)
4. **Implement Task 1.4** → Integration test (simulate Base App)
5. **Deploy to Production** → Test trên Base App webview thật

**Benefits:**
- ✅ Phát hiện bug sớm
- ✅ Dễ debug hơn
- ✅ Confident hơn khi deploy

---

## 📝 NOTES

- **Desktop Testing:** Có thể simulate Base App bằng cách set `window.__isBaseApp = true`
- **Base App Testing:** Cần deploy lên production và test trên Base App webview thật
- **SessionStorage:** Welcome screen chỉ hiện 1 lần/session - test bằng cách refresh page
- **Console Errors:** Luôn check console để đảm bảo không có errors

---

**Last Updated:** 2024-12-19  
**Status:** ✅ Ready for Testing

