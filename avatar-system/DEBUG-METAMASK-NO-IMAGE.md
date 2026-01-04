# 🔍 Debug MetaMask Không Hiển Thị Hình

## Vấn đề
MetaMask vẫn hiển thị broken image placeholder, không load được hình avatar.

## Debug Steps

### Step 1: Kiểm tra Contract tokenURI

1. Mở Basescan:
   ```
   https://sepolia.basescan.org/address/0xC6fd96c853feD4e8EBA330955efc235c5D02a7Ba#readContract
   ```

2. Gọi function: `tokenURI(0)`
   - Phải trả về: `https://lingering-star-26e9.tuongmeocp66.workers.dev?tokenId=0`
   - Nếu trả về URL cũ → Contract chưa update đúng

### Step 2: Test Worker URL

1. Mở browser:
   ```
   https://lingering-star-26e9.tuongmeocp66.workers.dev?tokenId=0
   ```

2. Kiểm tra:
   - [ ] Response là JSON hợp lệ
   - [ ] Mở Network tab (F12) → Check Response Headers
   - [ ] `Content-Type` phải là `application/json`
   - [ ] `image` field có URL: `https://memeplay.dev/avatar-system/assets/avatars/c000.png`

### Step 3: Test Image URL

1. Mở browser:
   ```
   https://memeplay.dev/avatar-system/assets/avatars/c000.png
   ```

2. Kiểm tra:
   - [ ] Hình avatar hiển thị đúng
   - [ ] Không có 404 error
   - [ ] File accessible

### Step 4: Check MetaMask Console

1. Mở MetaMask → Settings → Advanced
2. Enable "Show in-app browser" (nếu có)
3. Mở Console trong MetaMask
4. Import NFT lại
5. Xem console logs:
   - Có error không?
   - Metadata fetch thành công không?
   - Image URL có load được không?

### Step 5: Clear MetaMask Cache Hoàn Toàn

1. **Remove NFT:**
   - MetaMask → NFTs → Tìm NFT #0
   - Click vào → Remove/Delete

2. **Clear Activity:**
   - Settings → Advanced
   - "Xóa dữ liệu hoạt động và số nonce"

3. **Restart MetaMask:**
   - Close và mở lại MetaMask extension

4. **Import lại:**
   - Contract: `0xC6fd96c853feD4e8EBA330955efc235c5D02a7Ba`
   - Token ID: `0`

---

## Các Vấn Đề Có Thể

### Vấn đề 1: Contract tokenURI vẫn trả về URL cũ
**Kiểm tra:** Basescan → `tokenURI(0)`
**Giải pháp:** Chạy lại script update baseURI

### Vấn đề 2: Worker URL không trả về JSON đúng
**Kiểm tra:** Test Worker URL trong browser
**Giải pháp:** Check Worker code, logs

### Vấn đề 3: Image URL không accessible
**Kiểm tra:** Test image URL trực tiếp
**Giải pháp:** Check file tồn tại, CORS headers

### Vấn đề 4: MetaMask cache
**Kiểm tra:** Clear cache và import lại
**Giải pháp:** Remove NFT, clear activity, restart MetaMask

### Vấn đề 5: CORS issue
**Kiểm tra:** Worker có set CORS headers không
**Giải pháp:** Check Worker code có `Access-Control-Allow-Origin: *`

---

## Quick Fix

1. **Test Worker URL:** `https://lingering-star-26e9.tuongmeocp66.workers.dev?tokenId=0`
2. **Test Image URL:** `https://memeplay.dev/avatar-system/assets/avatars/c000.png`
3. **Check Contract:** Basescan → `tokenURI(0)`
4. **Clear MetaMask:** Remove NFT, clear activity, restart
5. **Import lại:** Contract + Token ID 0

