# 📊 Supabase Tracking Setup Guide

## Bước 1: Tạo Table trong Supabase

1. **Mở Supabase Dashboard:**
   - Vào: https://supabase.com/dashboard
   - **Hoặc:** https://app.supabase.com/project/iikckrcdrvnqctzacxgx
   - **Lưu ý:** Phải login vào Supabase account trước
   - Sau khi login, chọn project: `iikckrcdrvnqctzacxgx`
   - Click "SQL Editor" (sidebar bên trái)

2. **Chạy SQL Script:**
   - Mở file: `avatar-system/contracts/SUPABASE-SETUP.sql`
   - Copy toàn bộ SQL code
   - Paste vào SQL Editor
   - Click "Run" (hoặc `Ctrl+Enter`)

3. **Verify Table:**
   - Vào "Table Editor" → Tìm table `avatar_mints`
   - Kiểm tra columns:
     - `id` (SERIAL PRIMARY KEY)
     - `token_id` (INTEGER)
     - `user_address` (TEXT)
     - `config_hash` (TEXT)
     - `config_json` (JSONB)
     - `transaction_hash` (TEXT)
     - `minted_at` (TIMESTAMP)

---

## Bước 2: Test Tracking

1. **Mint một avatar mới:**
   - Vào: https://memeplay.dev/avatar-creator
   - Connect wallet
   - Mint avatar

2. **Kiểm tra Console:**
   - Mở F12 → Console
   - Tìm log: `[Tracking] ✅ Mint tracked successfully`

3. **Verify trong Supabase:**
   - Vào Supabase Dashboard → Table Editor → `avatar_mints`
   - Kiểm tra row mới được insert với:
     - `token_id`: Token ID vừa mint
     - `user_address`: Wallet address của bạn
     - `config_json`: Config object (actor, skin, clothes, equipment, hat)
     - `transaction_hash`: TX hash

---

## Bước 3: Query Stats (Optional)

Bạn có thể test query stats bằng cách:

```javascript
// Trong browser console (F12)
import { getMintStats, getConfigStats } from './avatar-system/src/tracking.js';

// Get mint statistics
const stats = await getMintStats();
console.log('Mint Stats:', stats);
// Output: { totalMints: 5, todayMints: 2, uniqueUsers: 3 }

// Get config popularity
const configStats = await getConfigStats();
console.log('Config Stats:', configStats);
// Output: { actors: { boy: 3, fish: 1, supergirl: 1 }, ... }
```

---

## Troubleshooting

### Lỗi: "Failed to track mint"

**Nguyên nhân:**
- Table chưa được tạo
- RLS policy chưa được setup
- Network error

**Fix:**
1. Kiểm tra table `avatar_mints` đã tồn tại chưa
2. Chạy lại SQL script
3. Kiểm tra RLS policies:
   - "Allow public insert" → enabled
   - "Allow public read" → enabled

### Lỗi: "Supabase client not available"

**Nguyên nhân:**
- CDN không load được
- Network issue

**Fix:**
- Kiểm tra network connection
- Tracking sẽ fail silently (không ảnh hưởng mint flow)

---

## Notes

- **Non-blocking:** Tracking không block mint flow, nếu fail thì chỉ log warning
- **Privacy:** RLS policies cho phép public insert/read (có thể restrict sau)
- **Performance:** Tracking chạy async, không ảnh hưởng UX

---

## Next Steps

Sau khi tracking hoạt động, bạn có thể:
1. Tạo dashboard để hiển thị stats
2. Query popular configs
3. Track retention (user quay lại xem profile)

