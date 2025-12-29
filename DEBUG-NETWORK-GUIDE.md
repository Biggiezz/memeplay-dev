# Hướng dẫn Debug Network trên Base App iPhone

## Cách 1: Safari Web Inspector (Khuyến nghị)

### Bước 1: Enable Web Inspector trên iPhone
1. Mở **Settings** → **Safari** → **Advanced**
2. Bật **Web Inspector**

### Bước 2: Kết nối iPhone với Mac
1. Dùng USB cable kết nối iPhone với Mac
2. Mở iPhone → Trust computer nếu được hỏi

### Bước 3: Mở Safari trên Mac
1. Mở Safari trên Mac
2. Menu **Develop** → Chọn iPhone của bạn
3. Chọn **memeplay.dev/base-app-mini-app.html**

### Bước 4: Check Network Tab
1. Trong Safari Developer Tools, click tab **Network**
2. Reload page (Cmd + R)
3. Tìm request đến:
   - `app-base.js`
   - `@farcaster/miniapp-sdk`
   - Các CDN requests
4. Check status:
   - ✅ **200** = Success
   - ❌ **404** = Not found
   - ❌ **Blocked** = CSP/CORS issue
   - ❌ **Timeout** = Network issue

---

## Cách 2: Base App Client Debug (Nếu có)

### Kiểm tra Base App có Developer Mode không:
1. Mở Base App
2. Tìm Settings/Preferences
3. Tìm "Developer Mode" hoặc "Debug Mode"
4. Enable nếu có

---

## Cách 3: Thêm Network Log vào Code

Thêm code này vào `base-app-mini-app.html` để log network requests:

```javascript
// Log all script loads
const originalAppendChild = document.head.appendChild.bind(document.head);
document.head.appendChild = function(element) {
  if (element.tagName === 'SCRIPT') {
    console.log('[Network] Loading script:', element.src || 'inline');
    element.addEventListener('load', () => {
      console.log('[Network] ✅ Script loaded:', element.src || 'inline');
    });
    element.addEventListener('error', (e) => {
      console.error('[Network] ❌ Script failed:', element.src || 'inline', e);
    });
  }
  return originalAppendChild(element);
};
```

---

## Checklist để báo lại:

- [ ] Console có log `[Base App] Trying SDK from: ...`?
- [ ] Console có log `[Base App] ✅ SDK loaded from: ...`?
- [ ] Console có log `[Base App] SDK ready, loading app-base.js`?
- [ ] Console có log `[Base App] ✅ app-base.js loaded from: ...`?
- [ ] Network tab: Request `app-base.js` status là gì? (200/404/Blocked/Timeout)
- [ ] Network tab: Request `@farcaster/miniapp-sdk` status là gì?
- [ ] Có error message nào trong Network tab không?

