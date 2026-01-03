# 🚀 HƯỚNG DẪN DEPLOY CONTRACT LÊN BASE SEPOLIA

> **Task 2.3:** Deploy AvatarNFT Contract lên Base Sepolia Testnet

---

## 📋 MỤC LỤC

1. [Chuẩn bị](#1-chuẩn-bị)
2. [Test Local (Khuyến nghị)](#2-test-local-khuyến-nghị)
3. [Deploy lên Base Sepolia](#3-deploy-lên-base-sepolia)
4. [Verify Contract](#4-verify-contract)
5. [Kiểm tra kết quả](#5-kiểm-tra-kết-quả)
6. [Troubleshooting](#6-troubleshooting)

---

## 1. CHUẨN BỊ

### 1.1. Cài đặt Dependencies

```bash
cd avatar-system/contracts
npm install
```

### 1.2. Setup Environment Variables

**Bước 1:** Copy `.env.example` thành `.env`:

```powershell
# Windows (PowerShell)
Copy-Item .env.example .env

# Linux/Mac
cp .env.example .env
```

**Bước 2:** Mở file `.env` và điền thông tin:

```env
PRIVATE_KEY=your_private_key_here
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
BASESCAN_API_KEY=your_basescan_api_key_here
```

#### 🔑 Lấy Private Key:

**⚠️ CẢNH BÁO:** Private key có quyền truy cập vào ví của bạn!

1. **Tạo ví mới (Khuyến nghị cho testnet):**
   - Dùng MetaMask tạo ví mới
   - Export private key (Settings → Security & Privacy → Show Private Key)
   - **CHỈ dùng ví này cho testnet, KHÔNG dùng ví chính!**

2. **Hoặc dùng ví hiện có:**
   - Export private key từ MetaMask
   - Format: `0x1234567890abcdef...` (có hoặc không có `0x` đều được)

#### 🌐 Lấy Base Sepolia RPC URL:

- **Public RPC (Free, có thể bị rate limit):**
  ```
  https://sepolia.base.org
  ```

- **Private RPC (Tốt hơn, cần đăng ký):**
  - Alchemy: https://www.alchemy.com/ → Tạo app → Base Sepolia
  - Infura: https://infura.io/ → Tạo project → Base Sepolia
  - Format: `https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY`

#### 🔍 Lấy BaseScan API Key (Optional - chỉ cần khi verify):

1. Đăng ký tài khoản tại: https://basescan.org/
2. Vào: https://basescan.org/myapikey
3. Tạo API key mới
4. Copy API key vào `.env`

### 1.3. Lấy Testnet ETH (Base Sepolia)

**Bạn cần ETH trên Base Sepolia để trả gas fee khi deploy!**

#### Cách 1: Base Sepolia Faucet (Khuyến nghị)
1. Vào: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
2. Kết nối ví MetaMask
3. Chọn network: **Base Sepolia**
4. Request testnet ETH (miễn phí)

#### Cách 2: Bridge từ Sepolia
1. Có Sepolia ETH trước (lấy từ: https://sepoliafaucet.com/)
2. Vào: https://bridge.base.org/
3. Bridge từ Sepolia → Base Sepolia

**Số tiền cần:** ~0.01 ETH (đủ để deploy contract, gas fee khoảng 0.001-0.005 ETH)

---

## 2. TEST LOCAL (Khuyến nghị)

**Trước khi deploy lên testnet, nên test trên local network trước!**

### 2.1. Test trên Hardhat Local Network

```bash
# Deploy lên local network (không cần private key, không tốn gas thật)
npx hardhat run scripts/deploy.js --network hardhat
```

**Kết quả mong đợi:**
```
🚀 Deploying AvatarNFT contract...
✅ AvatarNFT deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
📝 Contract address: 0x5FbDB2315678afecb367f032d93F642f64180aa3

✅ Contract address and ABI saved to: avatar-system/src/contract-address.js
📦 ABI contains XX items (functions, events, errors)
```

**Kiểm tra:**
- File `avatar-system/src/contract-address.js` đã được tạo/cập nhật
- Contract address không phải `0x0000...`
- ABI không phải `[]`

### 2.2. Test với Hardhat Console (Optional)

```bash
# Mở Hardhat console
npx hardhat console --network hardhat

# Trong console, test contract:
const AvatarNFT = await ethers.getContractFactory("AvatarNFT");
const avatarNFT = await AvatarNFT.deploy();
await avatarNFT.waitForDeployment();
const address = await avatarNFT.getAddress();
console.log("Contract address:", address);

# Test mint function:
const [owner, user1] = await ethers.getSigners();
await avatarNFT.mintAvatar(user1.address, "0x12345678");
console.log("Mint successful!");
```

---

## 3. DEPLOY LÊN BASE SEPOLIA

### 3.1. Kiểm tra lại trước khi deploy

**✅ Checklist:**
- [ ] Contract đã compile thành công: `npm run compile`
- [ ] Tests đã pass: `npm run test`
- [ ] File `.env` đã được tạo và điền đầy đủ
- [ ] Ví có đủ Base Sepolia ETH (≥ 0.01 ETH)
- [ ] Đã test local thành công

### 3.2. Deploy

```bash
npm run deploy:base-sepolia
```

**Hoặc:**

```bash
npx hardhat run scripts/deploy.js --network baseSepolia
```

### 3.3. Quá trình deploy

**Bạn sẽ thấy:**

```
🚀 Deploying AvatarNFT contract...
```

**Sau đó:**
- Hardhat sẽ compile contract
- Gửi transaction lên Base Sepolia
- Chờ transaction được confirm (thường 1-2 phút)
- Hiển thị contract address

**Kết quả mong đợi:**

```
✅ AvatarNFT deployed to: 0xABC123DEF456...
📝 Contract address: 0xABC123DEF456...

🔍 Verify contract:
npx hardhat verify --network baseSepolia 0xABC123DEF456...

✅ Contract address and ABI saved to: avatar-system/src/contract-address.js
📦 ABI contains XX items (functions, events, errors)
```

### 3.4. Lưu Contract Address

**Script tự động lưu vào:** `avatar-system/src/contract-address.js`

**Kiểm tra file:**

```javascript
// avatar-system/src/contract-address.js
export const CONTRACT_ADDRESS = '0xABC123DEF456...'; // ✅ Address thật
export const CONTRACT_NETWORK = 'baseSepolia';
export const CONTRACT_CHAIN_ID = 84532;
export const CONTRACT_ABI = [...]; // ✅ ABI đầy đủ
```

---

## 4. VERIFY CONTRACT

**Verify contract trên BaseScan để người khác có thể xem source code.**

### 4.1. Verify bằng Hardhat

```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
```

**Ví dụ:**
```bash
npx hardhat verify --network baseSepolia 0xABC123DEF456...
```

**Kết quả:**
```
Successfully verified contract AvatarNFT on BaseScan.
https://sepolia.basescan.org/address/0xABC123DEF456...#code
```

### 4.2. Verify thủ công (nếu auto-verify fail)

1. Vào: https://sepolia.basescan.org/address/<CONTRACT_ADDRESS>
2. Click tab "Contract"
3. Click "Verify and Publish"
4. Chọn:
   - Compiler: `v0.8.20`
   - License: `MIT`
   - Optimization: `Yes` (200 runs)
5. Paste source code từ `contracts/AvatarNFT.sol`
6. Submit

---

## 5. KIỂM TRA KẾT QUẢ

### 5.1. Kiểm tra trên BaseScan

1. Vào: https://sepolia.basescan.org/address/<CONTRACT_ADDRESS>
2. Kiểm tra:
   - ✅ Contract đã được deploy
   - ✅ Transaction hash có
   - ✅ Contract verified (nếu đã verify)

### 5.2. Test Contract Functions

**Có thể test bằng BaseScan:**

1. Vào contract page trên BaseScan
2. Tab "Contract" → "Write Contract"
3. Connect wallet
4. Test function `mintAvatar`:
   - `to`: Địa chỉ ví của bạn
   - `configHash`: `0x12345678`
   - Click "Write"
   - Confirm transaction

### 5.3. Kiểm tra Frontend Integration

**File `contract-address.js` đã được cập nhật:**

```javascript
// Frontend có thể import và dùng ngay:
import { CONTRACT_ADDRESS, CONTRACT_ABI } from './contract-address.js';

const contract = new ethers.Contract(
  CONTRACT_ADDRESS, 
  CONTRACT_ABI, 
  signer
);

await contract.mintAvatar(userAddress, configHash);
```

---

## 6. TROUBLESHOOTING

### ❌ Lỗi: "insufficient funds for gas"

**Nguyên nhân:** Ví không đủ ETH để trả gas fee

**Giải pháp:**
1. Kiểm tra balance trên Base Sepolia: https://sepolia.basescan.org/address/<YOUR_ADDRESS>
2. Lấy thêm testnet ETH từ faucet
3. Đảm bảo có ≥ 0.01 ETH

### ❌ Lỗi: "nonce too high" hoặc "replacement transaction underpriced"

**Nguyên nhân:** Có transaction đang pending

**Giải pháp:**
1. Đợi transaction cũ được confirm
2. Hoặc reset nonce (không khuyến nghị)

### ❌ Lỗi: "network mismatch"

**Nguyên nhân:** Network config sai

**Giải pháp:**
1. Kiểm tra `hardhat.config.js`:
   - Chain ID: `84532` (Base Sepolia)
   - RPC URL đúng
2. Kiểm tra MetaMask network: Phải là "Base Sepolia"

### ❌ Lỗi: "private key invalid"

**Nguyên nhân:** Private key sai format

**Giải pháp:**
1. Kiểm tra private key trong `.env`:
   - Có thể có hoặc không có `0x` prefix
   - Phải là 64 hex characters
2. Đảm bảo không có spaces hoặc newlines

### ❌ Lỗi: "contract verification failed"

**Nguyên nhân:** Source code không match

**Giải pháp:**
1. Đảm bảo compiler version đúng: `0.8.20`
2. Đảm bảo optimization settings đúng: `200 runs`
3. Thử verify thủ công trên BaseScan

### ❌ File `contract-address.js` không được tạo

**Nguyên nhân:** Path sai hoặc permission issue

**Giải pháp:**
1. Kiểm tra path trong `deploy.js`: `../../src/contract-address.js`
2. Đảm bảo thư mục `avatar-system/src/` tồn tại
3. Kiểm tra file permissions

---

## 📝 NOTES QUAN TRỌNG

### ⚠️ Bảo mật

- **KHÔNG commit `.env` file vào git!**
- **KHÔNG share private key với ai!**
- **CHỈ dùng testnet private key cho testnet!**

### 💰 Gas Fees

- Deploy contract: ~0.001-0.005 ETH (tùy network load)
- Mint avatar: ~0.0001-0.0005 ETH mỗi lần
- Base Sepolia gas fees thấp hơn Ethereum mainnet nhiều

### 🔄 Re-deploy

- Nếu cần deploy lại (sửa contract):
  1. Sửa contract code
  2. Compile lại: `npm run compile`
  3. Test lại: `npm run test`
  4. Deploy lại: `npm run deploy:base-sepolia`
  5. **Lưu ý:** Contract address mới sẽ khác!

### 📦 Contract Address

- **Contract address là duy nhất và không đổi** sau khi deploy
- Lưu contract address vào `contract-address.js` để frontend dùng
- Có thể tìm lại trên BaseScan bằng transaction hash

---

## ✅ CHECKLIST HOÀN THÀNH TASK 2.3

- [ ] Setup `.env` file với private key và RPC URL
- [ ] Có đủ Base Sepolia ETH trong ví
- [ ] Test local thành công
- [ ] Deploy lên Base Sepolia thành công
- [ ] Contract address đã được lưu vào `contract-address.js`
- [ ] Verify contract trên BaseScan (optional nhưng khuyến nghị)
- [ ] Test contract functions trên BaseScan
- [ ] Frontend có thể import và dùng contract address

---

**Chúc bạn deploy thành công! 🚀**

