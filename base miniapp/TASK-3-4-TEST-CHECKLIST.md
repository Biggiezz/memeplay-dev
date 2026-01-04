# 🧪 Task 3.4: Base App Testing - Test Checklist

> **Mục tiêu:** Đảm bảo Avatar System hoạt động đúng trên Base App và Web trước khi release

---

## 📋 TỔNG QUAN

**Platform cần test:**
- ✅ Base App (mobile) - Platform chính
- ✅ Web (Chrome/Firefox) - Fallback
- ✅ Telegram Mini App (nếu có)

**Test Environment:**
- Network: Base Sepolia (testnet)
- Contract: `0xC6fd96c853feD4e8EBA330955efc235c5D02a7Ba`

---

## 🧪 TEST SUITE 1: Mint Flow

### Test 1.1: Mint với Base Wallet (Base App)
- [ ] Mở Base App trên mobile
- [ ] Navigate đến `/avatar-creator`
- [ ] Wallet tự động connect (auto-connect)
- [ ] Chọn Actor/Clothes/Equipment/Hat
- [ ] Preview avatar hiển thị đúng
- [ ] Click "Mint Avatar"
- [ ] Transaction popup xuất hiện
- [ ] Approve transaction
- [ ] Mint thành công
- [ ] Success message hiển thị: "✅ Mint successful!"
- [ ] Token ID hiển thị
- [ ] Transaction link hoạt động (BaseScan)
- [ ] Avatar hiển thị trong profile menu (hamburger menu)

**Expected Results:**
- ✅ Wallet auto-connect không cần click button
- ✅ Transaction thành công
- ✅ Success message rõ ràng
- ✅ Token ID chính xác

---

### Test 1.2: Mint với MetaMask (Web Fallback)
- [ ] Mở Web (Chrome/Firefox)
- [ ] Navigate đến `/avatar-creator`
- [ ] Click "Connect Wallet"
- [ ] MetaMask popup xuất hiện
- [ ] Approve connection
- [ ] Wallet address hiển thị
- [ ] Chọn Actor/Clothes/Equipment/Hat
- [ ] Preview avatar hiển thị đúng
- [ ] Click "Mint Avatar"
- [ ] MetaMask transaction popup xuất hiện
- [ ] Approve transaction
- [ ] Mint thành công
- [ ] Success message hiển thị
- [ ] Token ID hiển thị
- [ ] Transaction link hoạt động

**Expected Results:**
- ✅ MetaMask connection hoạt động
- ✅ Transaction thành công
- ✅ Success message rõ ràng

---

### Test 1.3: Test Duplicate Mint (Config đã có)
- [ ] Mint avatar với config: `{actor: 'boy', clothes: 1, equipment: 2, hat: 3}`
- [ ] Mint thành công
- [ ] Switch sang wallet khác (hoặc dùng wallet khác)
- [ ] Mint avatar với config GIỐNG HỆT: `{actor: 'boy', clothes: 1, equipment: 2, hat: 3}`
- [ ] Mint thành công (cho phép duplicate config)
- [ ] Cả 2 wallet đều có avatar giống nhau

**Expected Results:**
- ✅ Cho phép duplicate config (nhiều user có cùng avatar)
- ✅ Mỗi wallet chỉ mint được 1 lần (check `hasMinted`)

---

### Test 1.4: Test Duplicate User (User đã mint)
- [ ] Mint avatar với wallet A
- [ ] Mint thành công
- [ ] Vẫn dùng wallet A, thử mint lại
- [ ] Error message: "You already have an avatar" hoặc "Already Minted"
- [ ] Mint button disabled hoặc hiển thị "Already Minted"

**Expected Results:**
- ✅ Không cho phép mint lại (1 wallet = 1 avatar)
- ✅ Error message rõ ràng
- ✅ UI hiển thị đúng trạng thái

---

## 🧪 TEST SUITE 2: Profile Page

### Test 2.1: Profile Load từ localStorage
- [ ] Mint avatar thành công
- [ ] Navigate đến `/avatar-profile.html`
- [ ] Avatar hiển thị ngay (từ localStorage)
- [ ] Animation mượt (idle animation)
- [ ] Token ID hiển thị đúng
- [ ] Config Hash hiển thị đúng
- [ ] Transaction link hoạt động
- [ ] Minted At hiển thị (nếu có)

**Expected Results:**
- ✅ Load nhanh (< 1s)
- ✅ Avatar hiển thị đúng
- ✅ Animation mượt (≥ 30 FPS)
- ✅ Thông tin chính xác

---

### Test 2.2: Profile Load từ Contract (Recovery)
- [ ] Xóa localStorage: `localStorage.clear()`
- [ ] Refresh page `/avatar-profile.html`
- [ ] Avatar vẫn hiển thị (load từ contract)
- [ ] Animation mượt
- [ ] Token ID hiển thị đúng
- [ ] Config Hash hiển thị đúng
- [ ] Data được lưu lại vào localStorage

**Expected Results:**
- ✅ Recovery flow hoạt động
- ✅ Load từ contract thành công
- ✅ Data được cache lại

---

### Test 2.3: Profile - User chưa mint
- [ ] Mở `/avatar-profile.html` với wallet chưa mint
- [ ] Message hiển thị: "creat FREE avatar"
- [ ] Plus icon hiển thị
- [ ] Button "Create Avatar" hoạt động
- [ ] Click button → Navigate đến `/avatar-creator`

**Expected Results:**
- ✅ UI rõ ràng cho user chưa mint
- ✅ Navigation hoạt động

---

## 🧪 TEST SUITE 3: Animation Performance

### Test 3.1: Animation FPS
- [ ] Mở `/avatar-creator` hoặc `/avatar-profile.html`
- [ ] Avatar animation chạy
- [ ] Mở DevTools → Performance tab
- [ ] Record 5 giây
- [ ] Check FPS: ≥ 30 FPS
- [ ] Animation mượt, không lag

**Expected Results:**
- ✅ FPS ≥ 30
- ✅ Animation mượt
- ✅ Không có frame drops

---

### Test 3.2: Animation trên Mobile (Base App)
- [ ] Mở Base App trên mobile
- [ ] Navigate đến `/avatar-profile.html`
- [ ] Avatar animation chạy
- [ ] Animation mượt trên mobile
- [ ] Không có lag hoặc stutter
- [ ] Battery usage hợp lý

**Expected Results:**
- ✅ Animation mượt trên mobile
- ✅ Performance tốt

---

## 🧪 TEST SUITE 4: Hamburger Menu Integration

### Test 4.1: Profile Menu Item Display
- [ ] Mở homepage
- [ ] Click hamburger menu
- [ ] "Profile" item ở đầu menu (trên Docs)
- [ ] Profile item có chiều cao gấp đôi
- [ ] Avatar preview hiển thị (nếu đã mint)
- [ ] Plus icon hiển thị (nếu chưa mint)

**Expected Results:**
- ✅ UI đúng như thiết kế
- ✅ Avatar/plus icon hiển thị đúng

---

### Test 4.2: Profile Menu Navigation (Đã mint)
- [ ] Mở homepage với wallet đã mint
- [ ] Click vào avatar preview trong hamburger menu
- [ ] Navigate đến `/avatar-profile.html`
- [ ] Avatar hiển thị đúng

**Expected Results:**
- ✅ Navigation đúng
- ✅ Avatar hiển thị

---

### Test 4.3: Profile Menu Navigation (Chưa mint)
- [ ] Mở homepage với wallet chưa mint
- [ ] Click vào plus icon trong hamburger menu
- [ ] Navigate đến `/avatar-creator`
- [ ] Creator page load đúng

**Expected Results:**
- ✅ Navigation đúng
- ✅ Creator page load

---

## 🧪 TEST SUITE 5: Wallet Integration

### Test 5.1: Base App Auto-Connect
- [ ] Mở Base App
- [ ] Navigate đến `/avatar-creator`
- [ ] Wallet tự động connect (không cần click button)
- [ ] Wallet address hiển thị
- [ ] Avatar hiển thị trong profile menu (nếu đã mint)

**Expected Results:**
- ✅ Auto-connect hoạt động
- ✅ Không cần user action

---

### Test 5.2: MetaMask Fallback
- [ ] Mở Web (không có Base App)
- [ ] Navigate đến `/avatar-creator`
- [ ] Click "Connect Wallet"
- [ ] MetaMask popup xuất hiện
- [ ] Approve connection
- [ ] Wallet address hiển thị

**Expected Results:**
- ✅ Fallback hoạt động
- ✅ MetaMask connection thành công

---

### Test 5.3: Wallet Switch
- [ ] Connect wallet A (đã mint NFT)
- [ ] Avatar hiển thị trong profile menu
- [ ] Switch sang wallet B (chưa mint NFT)
- [ ] Plus icon hiển thị trong profile menu
- [ ] Switch lại wallet A
- [ ] Avatar hiển thị lại

**Expected Results:**
- ✅ Auto-update khi switch wallet
- ✅ UI update đúng

---

## 🧪 TEST SUITE 6: Error Handling

### Test 6.1: Network Error
- [ ] Disconnect internet
- [ ] Thử mint avatar
- [ ] Error message hiển thị: "Network error" hoặc tương tự
- [ ] Retry button hoạt động (nếu có)

**Expected Results:**
- ✅ Error message rõ ràng
- ✅ User có thể retry

---

### Test 6.2: Gas Fee Không Đủ
- [ ] Dùng wallet có < 0.001 ETH
- [ ] Thử mint avatar
- [ ] Error message hiển thị: "Gas fee không đủ" hoặc tương tự

**Expected Results:**
- ✅ Error message rõ ràng
- ✅ User biết cần thêm ETH

---

### Test 6.3: User Reject Transaction
- [ ] Click "Mint Avatar"
- [ ] Transaction popup xuất hiện
- [ ] Reject transaction trong MetaMask/Base Wallet
- [ ] Error message hiển thị: "Transaction rejected" hoặc tương tự
- [ ] UI quay về trạng thái ban đầu

**Expected Results:**
- ✅ Error message rõ ràng
- ✅ UI không bị stuck

---

## 🧪 TEST SUITE 7: Cross-Platform

### Test 7.1: Web (Chrome)
- [ ] Tất cả test cases trên đều pass trên Chrome

### Test 7.2: Web (Firefox)
- [ ] Tất cả test cases trên đều pass trên Firefox

### Test 7.3: Base App (Mobile)
- [ ] Tất cả test cases trên đều pass trên Base App mobile

### Test 7.4: Telegram Mini App (nếu có)
- [ ] Tất cả test cases trên đều pass trên Telegram Mini App

---

## 📊 TEST RESULTS SUMMARY

### Pass Rate
- Total Tests: ___
- Passed: ___
- Failed: ___
- Pass Rate: ___%

### Critical Bugs
- [ ] Bug 1: ___
- [ ] Bug 2: ___
- [ ] Bug 3: ___

### Performance
- Animation FPS: ___ (Target: ≥ 30)
- Profile Load Time: ___ (Target: < 1s)
- Mint Transaction Time: ___ (Target: < 30s)

---

## ✅ SIGN-OFF

**Tester:** ___
**Date:** ___
**Status:** [ ] Pass [ ] Fail [ ] Needs Fix

**Notes:**
___
___
___

---

## 🔧 BUG FIX LOG

### Bug #1: ___
- **Description:** ___
- **Steps to Reproduce:** ___
- **Expected:** ___
- **Actual:** ___
- **Fix:** ___
- **Status:** [ ] Fixed [ ] Pending

---

**Chúc bạn test thành công! 🚀**

