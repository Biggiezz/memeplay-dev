# 📖 Hệ Thống Referral Telegram - Giải Thích (KHÔNG CODE)

## 🎯 Tổng Quan

Hệ thống referral này **CHỈ DÀNH CHO TELEGRAM USERS**. Web users không thể sử dụng tính năng này.

---

## 🔍 Cách Hệ Thống Phân Biệt User Telegram vs Web

### 1. **User ID Format**

Hệ thống phân biệt user bằng **prefix** trong `user_id`:

| Platform | User ID Format | Ví dụ |
|----------|---------------|-------|
| **Telegram** | `tg_<telegram_user_id>` | `tg_123456789` |
| **Web (Wallet)** | `<wallet_address>` | `0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb` |
| **Web (Anonymous)** | `u_<uuid>` | `u_550e8400-e29b-41d4-a716-446655440000` |

### 2. **Code Logic**

Trong `scripts/app-telegram.js`, hàm `getUserId()` có **priority**:

1. **Priority 1**: Telegram user → Check `window.Telegram.WebApp.initDataUnsafe.user.id`
   - Nếu có → Return `tg_${telegram_user_id}`
   - Nếu không → Chuyển sang Priority 2

2. **Priority 2**: Wallet address → Check `localStorage.getItem('mp_user_wallet')`
   - Nếu có → Return wallet address
   - Nếu không → Chuyển sang Priority 3

3. **Priority 3**: Local anonymous user → Generate UUID
   - Return `u_${uuid}`

### 3. **Database Check**

Tất cả các bảng database (`game_likes`, `game_comments`, `game_scores`, `game_playtime`) đều dùng `user_id TEXT`:

- ✅ **Telegram user**: `user_id = 'tg_123456789'`
- ✅ **Web user**: `user_id = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'` hoặc `user_id = 'u_550e8400-...'`

**→ Hệ thống tự động phân biệt bằng cách check prefix `tg_`**

---

## 🎁 Hệ Thống Referral Hoạt Động Như Thế Nào?

### **Bước 1: User A (Referrer) Lấy Referral Code**

1. User A mở Telegram Mini App
2. Click vào menu → "Referral"
3. Hệ thống tạo referral code duy nhất: `ABC123`
4. Referral link: `https://t.me/memeplay_bot?start=ABC123`

### **Bước 2: User B (Referred) Click Referral Link**

1. User B click link → Mở Telegram bot với start parameter `ABC123`
2. Bot redirect đến Mini App với `?start=ABC123`
3. Mini App detect start parameter → Process referral
4. Database lưu relationship: User A refer User B

### **Bước 3: User B Chơi Game & Nhận Reward**

Khi User B nhận reward (daily check-in, playtime reward):

1. **Daily Check-in**: User B nhận `100 PLAY`
   - Referrer (User A) nhận `10 PLAY` (10% commission)

2. **Playtime Reward**: User B nhận `300 PLAY` từ chơi game
   - Referrer (User A) nhận `30 PLAY` (10% commission)

### **Bước 4: User A Xem Stats**

User A mở Referral overlay → Hiển thị:
- **Referral Code**: `ABC123`
- **Referral Link**: `https://t.me/memeplay_bot?start=ABC123`
- **Friends Referred**: `5` (số người đã refer)
- **Total Commission**: `150 PLAY` (tổng commission đã nhận)

---

## 📊 Database Schema Cần Thiết

### **Bảng 1: `telegram_referral_codes`**
Lưu referral code của mỗi Telegram user:
- `user_id TEXT PRIMARY KEY` (format: `tg_123456789`)
- `referral_code TEXT UNIQUE` (ví dụ: `ABC123`)
- `created_at TIMESTAMPTZ`

### **Bảng 2: `telegram_referrals`**
Lưu relationship referrer → referred:
- `referrer_id TEXT` (User A: `tg_123456789`)
- `referred_id TEXT UNIQUE` (User B: `tg_987654321`)
- `referral_code TEXT` (`ABC123`)
- `created_at TIMESTAMPTZ`

### **Bảng 3: `telegram_referral_rewards`**
Lưu commission đã trả cho referrer:
- `referrer_id TEXT` (User A)
- `referred_id TEXT` (User B)
- `game_id TEXT` (optional)
- `reward_type TEXT` (`daily_checkin` | `playtime`)
- `reward_amount INTEGER` (reward của User B)
- `commission_rate DECIMAL(5,2)` (10.00 = 10%)
- `commission_earned INTEGER` (commission của User A)
- `created_at TIMESTAMPTZ`

---

## 🔐 Security & Validation

### **1. Chỉ Telegram Users**
- Tất cả RPC functions check `user_id LIKE 'tg_%'`
- Nếu không phải Telegram user → Return error

### **2. Không Tự Refer Chính Mình**
- Check: `referrer_id != referred_id`

### **3. Mỗi User Chỉ Được Refer 1 Lần**
- `UNIQUE(referred_id)` trong bảng `telegram_referrals`

### **4. Referral Code Unique**
- `referral_code TEXT UNIQUE` trong bảng `telegram_referral_codes`

---

## 🚀 Implementation Steps (Khi Sẵn Sàng Code)

### **Bước 1: Database Setup**
1. Tạo 3 bảng: `telegram_referral_codes`, `telegram_referrals`, `telegram_referral_rewards`
2. Tạo RPC functions:
   - `get_or_create_referral_code(p_user_id TEXT)`
   - `process_referral(p_referred_id TEXT, p_referral_code TEXT)`
   - `get_referral_stats(p_user_id TEXT)`
   - `grant_referral_commission(...)`

### **Bước 2: Frontend Code**
1. Check referral code từ Telegram start parameter khi Mini App load
2. Update Referral overlay để hiển thị code, link, stats
3. Tích hợp grant commission vào `daily_checkin()` và `track_playtime_and_reward()`

### **Bước 3: Testing**
1. Test lấy referral code
2. Test process referral từ link
3. Test grant commission khi referred user nhận reward

---

## 📝 Notes

1. **Commission Rate**: 10% (có thể config trong database)

2. **Reward Types**: 
   - `daily_checkin`: Commission từ daily check-in reward
   - `playtime`: Commission từ playtime rewards (10s, 60s, 300s thresholds)

3. **Future Enhancements**:
   - Thêm bonus cho cả referrer và referred khi first join
   - Thêm leaderboard cho top referrers
   - Thêm analytics (referral conversion rate, etc.)

---

## ✅ Tóm Tắt

**Cách phân biệt user:**
- Telegram: `user_id` bắt đầu bằng `tg_`
- Web: `user_id` là wallet address hoặc `u_<uuid>`

**Hệ thống referral:**
- Chỉ dành cho Telegram users
- Referrer nhận 10% commission từ rewards của referred users
- Cần 3 bảng database + 4 RPC functions
- Frontend cần check start parameter và hiển thị stats
