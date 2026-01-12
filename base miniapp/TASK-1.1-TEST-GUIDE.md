# 🧪 TASK 1.1 TEST GUIDE - Base App Detection

> **Mục tiêu:** Hướng dẫn chi tiết cách test Task 1.1

**Ngày tạo:** 2024-12-19  
**Status:** ✅ Ready for Testing

---

## 🎯 TESTING OVERVIEW

### **2 Cách Test:**

1. **Desktop Testing (Simulation)** - Test function exists và logic
2. **Base App Testing (Real)** - Test trên Base App webview thật

---

## 📋 TEST 1: DESKTOP TESTING (Simulation)

### **Step 1: Mở file trong browser**

1. Mở `index.html` trong browser (Chrome/Firefox/Edge)
2. Hoặc chạy local server:
   ```bash
   # Nếu có npm:
   npm start
   
   # Hoặc dùng Python:
   python -m http.server 5500
   ```
3. Truy cập: `http://localhost:5500/index.html`

---

### **Step 2: Mở DevTools Console**

- **Chrome/Edge:** `F12` hoặc `Ctrl+Shift+I` (Windows) / `Cmd+Option+I` (Mac)
- **Firefox:** `F12` hoặc `Ctrl+Shift+K` (Windows) / `Cmd+Option+K` (Mac)
- Chọn tab **Console**

---

### **Step 3: Test Function Exists**

Trong Console, gõ:

```javascript
// Test 1: Check function exists
console.log('Function exists?', typeof isBaseAppEnvironment);

// Expected output: "function"
```

**✅ Pass nếu:** Output là `"function"`

---

### **Step 4: Test Detection Result (Desktop)**

```javascript
// Test 2: Check detection result on Desktop
console.log('Is Base App?', window.__isBaseApp);

// Expected output: false (vì đang ở Desktop)
```

**✅ Pass nếu:** Output là `false` (Desktop không phải Base App)

---

### **Step 5: Test Function Logic (Manual)**

```javascript
// Test 3: Test function logic manually
const result = isBaseAppEnvironment();
console.log('Detection result:', result);

// Expected output: false (Desktop)
```

**✅ Pass nếu:** Output là `false`

---

### **Step 6: Simulate Base App (Advanced)**

Để test logic khi Base App được detect:

```javascript
// Simulate Base App environment
// Option 1: Set isCoinbaseWallet flag
window.ethereum = {
  isCoinbaseWallet: true
};

// Re-run detection
window.__isBaseApp = isBaseAppEnvironment();
console.log('Simulated Base App?', window.__isBaseApp);

// Expected output: true
```

**✅ Pass nếu:** Output là `true`

---

### **Step 7: Test User Agent Detection**

```javascript
// Simulate Base App via User Agent
// (This is harder to test, but you can verify the logic)

// Check current User Agent
console.log('Current UA:', navigator.userAgent);

// The function checks for:
// - 'CoinbaseWallet' in UA
// - 'CBWallet' in UA
```

**Note:** User Agent simulation khó hơn, nhưng bạn có thể verify logic trong code.

---

## 📋 TEST 2: BASE APP TESTING (Real Environment)

### **⚠️ Important:**

Base App detection chỉ test được đầy đủ trên Base App webview thật. Desktop chỉ test được function exists và logic.

---

### **Step 1: Deploy to Production**

```bash
# Commit changes
git add index.html
git commit -m "feat: Task 1.1 - Base App Detection"
git push origin main

# Deploy to production server
# (tùy vào deployment method của bạn)
```

---

### **Step 2: Test trên Base App**

1. **Mở Base App trên mobile** (iOS/Android)
2. **Navigate to:** `https://memeplay.dev`
3. **Open DevTools** (nếu có thể):
   - iOS: Safari → Develop → [Your Device] → [memeplay.dev]
   - Android: Chrome → chrome://inspect → [Your Device]

---

### **Step 3: Check Detection Result**

Trong Console, gõ:

```javascript
// Test: Check detection result
console.log('Is Base App?', window.__isBaseApp);

// Expected output: true (vì đang ở Base App)
```

**✅ Pass nếu:** Output là `true`

---

### **Step 4: Verify Function Works**

```javascript
// Test: Verify function
const result = isBaseAppEnvironment();
console.log('Detection result:', result);

// Expected output: true
```

**✅ Pass nếu:** Output là `true`

---

### **Step 5: Check Debug Log**

Trong Console, bạn sẽ thấy:

```
[Base App Detection] Base App environment detected
```

**✅ Pass nếu:** Thấy log này

---

## ✅ TEST CHECKLIST

### **Desktop Testing:**
- [ ] Function `isBaseAppEnvironment()` exists
- [ ] `window.__isBaseApp` được set (false trên Desktop)
- [ ] Function returns `false` trên Desktop
- [ ] Simulate Base App → `window.__isBaseApp` = `true`
- [ ] No console errors

### **Base App Testing (Real):**
- [ ] `window.__isBaseApp` = `true` trên Base App
- [ ] Function returns `true` trên Base App
- [ ] Debug log hiển thị: "Base App environment detected"
- [ ] No console errors

---

## 🚨 COMMON ISSUES

### **Issue 1: Function không tồn tại**
**Error:** `Uncaught ReferenceError: isBaseAppEnvironment is not defined`

**Solution:**
- Check script đã được add vào `index.html` chưa
- Check script nằm trong `<head>` và chạy trước các script khác
- Hard refresh page (`Ctrl+F5`)

---

### **Issue 2: window.__isBaseApp là undefined**
**Error:** `window.__isBaseApp` returns `undefined`

**Solution:**
- Check script đã chạy chưa
- Check có lỗi syntax trong script không
- Check console có errors không

---

### **Issue 3: Detection không chính xác**
**Error:** `window.__isBaseApp` = `false` trên Base App

**Solution:**
- Check `window.ethereum?.isCoinbaseWallet` có tồn tại không
- Check User Agent có chứa `CoinbaseWallet` hoặc `CBWallet` không
- Verify Base App webview thật (không phải browser thường)

---

## 📊 EXPECTED RESULTS

### **Desktop Browser:**
```javascript
window.__isBaseApp          // false
isBaseAppEnvironment()       // false
typeof isBaseAppEnvironment  // "function"
```

### **Base App Webview:**
```javascript
window.__isBaseApp          // true
isBaseAppEnvironment()       // true
typeof isBaseAppEnvironment  // "function"
// Console log: "[Base App Detection] Base App environment detected"
```

---

## 🎯 QUICK TEST COMMANDS

Copy và paste vào Console để test nhanh:

```javascript
// Quick test suite
console.log('=== TASK 1.1 TEST ===');
console.log('1. Function exists?', typeof isBaseAppEnvironment === 'function');
console.log('2. Is Base App?', window.__isBaseApp);
console.log('3. Function result:', isBaseAppEnvironment());
console.log('4. window.ethereum exists?', !!window.ethereum);
console.log('5. isCoinbaseWallet?', window.ethereum?.isCoinbaseWallet);
console.log('6. User Agent:', navigator.userAgent);
console.log('=== END TEST ===');
```

**Expected Output (Desktop):**
```
=== TASK 1.1 TEST ===
1. Function exists? true
2. Is Base App? false
3. Function result: false
4. window.ethereum exists? true/false (depends on wallet)
5. isCoinbaseWallet? undefined/false
6. User Agent: Mozilla/5.0...
=== END TEST ===
```

**Expected Output (Base App):**
```
=== TASK 1.1 TEST ===
1. Function exists? true
2. Is Base App? true
3. Function result: true
4. window.ethereum exists? true
5. isCoinbaseWallet? true
6. User Agent: ...CoinbaseWallet...
=== END TEST ===
```

---

## 🚀 NEXT STEPS

Sau khi test xong Task 1.1:

1. ✅ Verify function works trên Desktop
2. ✅ Verify logic đúng (simulate Base App)
3. ⏳ Deploy và test trên Base App thật (khi có thể)
4. ⏳ Move to Task 1.2: Hide External Links

---

**Last Updated:** 2024-12-19  
**Status:** ✅ Ready for Testing

