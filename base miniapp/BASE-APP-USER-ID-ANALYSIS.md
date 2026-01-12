# 🔍 PHÂN TÍCH: Base App User ID

> **Câu hỏi:** Base App có user ID riêng (như Telegram) không? Hay chỉ có wallet address?

---

## 📋 TỔNG QUAN

### Telegram Mini App:
- ✅ Có **Telegram User ID** riêng: `window.Telegram.WebApp.initDataUnsafe.user.id`
- ✅ Format: `tg_123456789` (prefix `tg_` + user ID)
- ✅ Khác với wallet address

### Base App:
- ❓ Có **Farcaster ID (fid)** riêng
- ❓ Hay chỉ có **Wallet Address**?

---

## 🔍 RESEARCH KẾT QUẢ

### Base App có Farcaster ID (fid):

**Theo documentation:**
- ✅ Base App sử dụng **Farcaster protocol**
- ✅ Mỗi user có **Farcaster ID (fid)** - số duy nhất (ví dụ: `123456`)
- ✅ `fid` là ID riêng, khác với wallet address
- ✅ `fid` được quản lý bởi Farcaster network

**Ví dụ:**
- Wallet address: `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` (42 chars)
- Farcaster ID: `123456` (số)
- Format có thể: `base_123456` hoặc `fid_123456` (tương tự `tg_123456789`)

---

## ⚠️ VẤN ĐỀ

### Để lấy Farcaster ID (fid):

**Option 1: MiniKit (React)**
```javascript
// Cần React + MiniKit
import { useContext } from 'react';
import { BaseContext } from '@farcaster/miniapp-sdk';

function MyComponent() {
  const { fid } = useContext(BaseContext);
  // fid = 123456 (số)
}
```

**Option 2: Web3 Standard (Vanilla JS)**
- ❓ **CHƯA RÕ** có cách lấy `fid` không
- ❓ Có thể cần API call?
- ❓ Hay chỉ có wallet address?

---

## 🤔 SO SÁNH

| Aspect | Telegram | Base App (fid) | Base App (wallet) |
|--------|----------|----------------|-------------------|
| **ID Type** | Telegram User ID | Farcaster ID (fid) | Wallet Address |
| **Format** | `tg_123456789` | `123456` (số) | `0x...` (42 chars) |
| **Access** | `window.Telegram.WebApp` | MiniKit/Context API | `window.ethereum` |
| **Vanilla JS** | ✅ Có | ❓ Chưa rõ | ✅ Có |
| **Unique** | ✅ Unique | ✅ Unique | ✅ Unique |

---

## 💡 ĐỀ XUẤT

### Option 1: Dùng Wallet Address (Đơn giản)
- ✅ Đã có sẵn với Web3 Standard
- ✅ Không cần MiniKit
- ✅ Unique cho mỗi user
- ✅ Format: `0x...`

**Code:**
```javascript
function getBaseAppUserId() {
  // User ID = Wallet address
  const isBaseApp = window.ethereum?.isBase || window.parent !== window;
  if (isBaseApp) {
    const wallet = getWalletAddress(); // "0x..."
    if (wallet) return wallet;
  }
  return getLocalUserId(); // Fallback
}
```

**Leaderboard:**
- `user_id = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"`
- Tương thích với database hiện tại (TEXT)

### Option 2: Dùng Farcaster ID (Nếu có thể)
- ✅ ID riêng (không phải wallet address)
- ✅ Tương tự Telegram (`tg_123456789`)
- ⚠️ Cần research thêm cách lấy với Vanilla JS
- ⚠️ Format: `fid_123456` hoặc `base_123456`

**Code (nếu tìm được cách):**
```javascript
function getBaseAppUserId() {
  // Priority 1: Farcaster ID (nếu có)
  const fid = getFarcasterId(); // Cần research cách lấy
  if (fid) return `fid_${fid}`; // Format: "fid_123456"
  
  // Priority 2: Wallet address (fallback)
  const wallet = getWalletAddress();
  if (wallet) return wallet;
  
  return getLocalUserId();
}
```

---

## ✅ KHUYẾN NGHỊ

### Cho Phase 1 (MVP):

**→ Dùng Wallet Address**

**Lý do:**
1. ✅ Đơn giản, đã có sẵn
2. ✅ Không cần research thêm
3. ✅ Unique cho mỗi user
4. ✅ Tương thích với codebase hiện tại
5. ✅ Database đã support TEXT user_id

**Code pattern:**
```javascript
// Base App User ID = Wallet Address
function getUserId() {
  // Priority 1: Base App wallet (nếu trong Base App)
  const isBaseApp = window.ethereum?.isBase || window.parent !== window;
  if (isBaseApp) {
    const wallet = getWalletAddress();
    if (wallet) return wallet; // Format: "0x..."
  }
  
  // Priority 2: Local anonymous user
  return getLocalUserId(); // Format: "u_..."
}
```

### Cho Phase 2 (Nâng cấp):

**→ Research cách lấy Farcaster ID (fid) với Vanilla JS**
- Nếu tìm được → Dùng `fid_123456` (tương tự `tg_123456789`)
- Nếu không → Giữ wallet address

---

## 📝 TỔNG KẾT

**Hiện tại:**
- ✅ Base App có Farcaster ID (fid) - ID riêng
- ⚠️ Để lấy `fid` cần MiniKit (React) hoặc API
- ✅ Với Web3 Standard → chỉ có wallet address

**Quyết định:**
- ✅ **Phase 1 (MVP):** Dùng **Wallet Address** làm user ID
- ✅ **Phase 2 (Nâng cấp):** Research cách lấy `fid`, nếu có → dùng `fid_${fid}`

**Database:**
- ✅ Đã support TEXT user_id → tương thích với cả wallet address và fid

---

## 🔄 TƯƠNG TỰ TELEGRAM

**Telegram pattern:**
```javascript
// Telegram User ID
function getTelegramUserId() {
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    const tgUserId = window.Telegram.WebApp.initDataUnsafe.user.id;
    return `tg_${tgUserId}`; // Format: "tg_123456789"
  }
  return null;
}
```

**Base App pattern (tương tự):**
```javascript
// Base App User ID (tương tự)
function getBaseAppUserId() {
  // Nếu có fid → Format: "fid_123456"
  // Nếu không → Format: "0x..." (wallet address)
  // Fallback → Format: "u_..." (local)
}
```

**Leaderboard:**
- Telegram: `user_id = "tg_123456789"`
- Base App (Phase 1): `user_id = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"`
- Base App (Phase 2): `user_id = "fid_123456"` (nếu tìm được cách lấy)


