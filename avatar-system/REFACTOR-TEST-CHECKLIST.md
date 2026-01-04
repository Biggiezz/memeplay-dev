# 🔍 Refactor Test Checklist

## ✅ Đã hoàn thành refactor

### Files mới được tạo:
1. ✅ `avatar-system/src/avatar-utils.js` - AVATAR_CONFIG, getAvatarFilePath(), generateHash()
2. ✅ `avatar-system/src/loading-utils.js` - showLoading(), hideLoading()
3. ✅ `avatar-system/src/avatar-renderer.js` - renderAvatarWithAnimation() (shared animation logic)
4. ✅ `avatar-system/src/wallet-display.js` - initWalletDisplay() (shared wallet UI)

### Files đã refactor:
1. ✅ `scripts/avatar-creator.js` - Giảm từ 580 → ~336 dòng (-244 dòng)
2. ✅ `scripts/avatar-profile.js` - Giảm từ 466 → ~264 dòng (-202 dòng)

**Tổng giảm:** ~446 dòng code trùng lặp

---

## 🧪 TEST CHECKLIST

### **TEST 1: Avatar Creator Page** (`/avatar-creator`)

#### 1.1. Page Load
- [ ] Page load không có lỗi console
- [ ] Avatar preview hiển thị (default: Boy)
- [ ] Hash display hiển thị ở góc dưới bên phải
- [ ] Loading indicator hoạt động khi load avatar

#### 1.2. Selector Buttons
- [ ] Click "Boy" → Avatar thay đổi, hash update
- [ ] Click "Fish" → Avatar thay đổi, hash update
- [ ] Click "Super Girl" → Avatar thay đổi, hash update
- [ ] Click Clothes 1, 2, 3, 4 → Avatar thay đổi
- [ ] Click Equipment 1, 2, 3, 4, 5 → Avatar thay đổi
- [ ] Click Hat 1, 2, 3, 4 → Avatar thay đổi

#### 1.3. Animation & Image Loading
- [ ] Chọn config có animation (ví dụ: Super Girl + Clothes 1 + Equipment 4)
  - [ ] Animation chạy ngay khi chọn
  - [ ] Animation chạy đủ 0.8s (1 cycle) trước khi dừng
  - [ ] Pre-rendered image load xong → animation dừng, hiển thị image tĩnh
- [ ] Chọn config không có animation (ví dụ: Boy + Clothes 0 + Equipment 0)
  - [ ] Pre-rendered image load ngay, không có animation

#### 1.4. Wallet Connection
- [ ] Click "Connect Wallet" → MetaMask popup hiện
- [ ] Connect thành công → Hiển thị address (0x...)
- [ ] Click copy button → Address được copy vào clipboard
- [ ] Đổi account trong MetaMask → Wallet display update tự động

#### 1.5. Mint Button (nếu chưa mint)
- [ ] Click "Mint Avatar" → Button disabled, text "Preparing..."
- [ ] Text chuyển: "Waiting for wallet..." → "Minting..." → "Confirming..."
- [ ] Mint thành công → Hiển thị success message với Token ID
- [ ] Button chuyển thành "Already Minted" (disabled)
- [ ] localStorage được lưu: mp_avatar_minted, mp_avatar_config, mp_avatar_tokenId, mp_avatar_address

#### 1.6. Already Minted State
- [ ] Nếu đã mint → Button "Already Minted" (disabled)
- [ ] Message hiển thị: "✅ You already have an avatar!" + Token ID
- [ ] Hướng dẫn import NFT vào MetaMask hiển thị

#### 1.7. Hash Display Debug
- [ ] Click vào hash display → Console log config details
- [ ] Alert hiển thị config string và hash

---

### **TEST 2: Avatar Profile Page** (`/avatar-profile`)

#### 2.1. Page Load (chưa mint)
- [ ] Page load không có lỗi console
- [ ] Hiển thị "CREAT FREE AVATAR" message
- [ ] Button "+" (200x200px) hiển thị với animation nhấp nháy
- [ ] Click button "+" → Redirect về `/avatar-creator`

#### 2.2. Page Load (đã mint)
- [ ] Page load → Avatar hiển thị (từ localStorage hoặc contract)
- [ ] Profile info hiển thị: Token ID, Config Hash, Transaction, Minted At
- [ ] Avatar animation chạy (nếu có) → dừng khi image load xong

#### 2.3. Wallet Connection
- [ ] Click "Connect Wallet" → MetaMask popup hiện
- [ ] Connect thành công → Hiển thị address
- [ ] Đổi account → Avatar reload tự động (check wallet address match)

#### 2.4. Wallet Address Change
- [ ] Connect wallet A (đã mint) → Avatar hiển thị
- [ ] Đổi sang wallet B (chưa mint) → Hiển thị "CREAT FREE AVATAR"
- [ ] localStorage cache được clear khi đổi wallet

#### 2.5. Avatar Loading
- [ ] Load từ localStorage (nhanh) → Avatar hiển thị ngay
- [ ] Load từ contract (nếu mất localStorage) → Avatar vẫn hiển thị
- [ ] Animation chạy trong khi load image
- [ ] Animation dừng khi image load xong (sau 0.8s minimum)

---

### **TEST 3: Cross-Page Consistency**

#### 3.1. Mint từ Creator → View Profile
- [ ] Mint avatar từ `/avatar-creator`
- [ ] Mở `/avatar-profile` → Avatar hiển thị đúng config đã mint
- [ ] Token ID, Config Hash khớp với thông tin mint

#### 3.2. Cache Consistency
- [ ] Mint từ Creator → localStorage được lưu
- [ ] Mở Profile → Load từ localStorage (nhanh)
- [ ] Clear localStorage → Profile vẫn load từ contract (recovery)

---

### **TEST 4: Error Handling**

#### 4.1. Network Errors
- [ ] Disconnect internet → Load avatar → Error được handle gracefully
- [ ] Reconnect → Avatar load lại được

#### 4.2. Missing Assets
- [ ] Chọn config không có pre-rendered image → Animation chạy liên tục
- [ ] Chọn config không có animation → Hiển thị error message (nếu có)

#### 4.3. Wallet Errors
- [ ] Reject wallet connection → Error message hiển thị
- [ ] Wrong network → Error message hiển thị

---

## 📊 Kết quả mong đợi

### ✅ Không có regression:
- Tất cả chức năng hoạt động như trước refactor
- UI/UX không thay đổi
- Performance không giảm

### ✅ Code quality cải thiện:
- Không còn code trùng lặp
- Dễ maintain hơn
- Dễ test hơn

---

## 🐛 Nếu có lỗi:

1. **Console errors:**
   - Check import paths
   - Check function names
   - Check parameter types

2. **Avatar không hiển thị:**
   - Check `renderAvatarWithAnimation()` được gọi đúng
   - Check `imageCache` được pass đúng
   - Check `animationRenderer` được manage đúng

3. **Wallet không connect:**
   - Check `initWalletDisplay()` được gọi đúng
   - Check `mintService` được pass đúng

4. **Animation không chạy:**
   - Check `renderAvatarWithAnimation()` return `animationRenderer`
   - Check `animationRenderer` được store và reuse

---

## 📝 Notes

- **Giao diện:** KHÔNG thay đổi (chỉ refactor code)
- **Functionality:** GIỐNG HỆT như trước
- **Performance:** Tương đương hoặc tốt hơn (do code ngắn hơn)

