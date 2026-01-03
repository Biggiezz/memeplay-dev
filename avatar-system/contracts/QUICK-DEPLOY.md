# 🚀 QUICK DEPLOY GUIDE - Base Sepolia

## ✅ Checklist trước khi deploy:

- [x] Contract đã compile (`npm run compile`)
- [ ] File `.env` có đủ 3 thông tin:
  - [ ] `PRIVATE_KEY` - Private key của ví
  - [ ] `BASESCAN_API_KEY` - API key từ Etherscan
  - [ ] `BASE_SEPOLIA_RPC_URL` - Có thể giữ default
- [ ] Ví có Base Sepolia ETH (≥ 0.01 ETH)

---

## 📝 CÁC BƯỚC DEPLOY:

### Bước 1: Kiểm tra lại `.env` file

Mở file: `avatar-system/contracts/.env`

Đảm bảo có đủ 3 dòng:
```
PRIVATE_KEY=0x...
BASESCAN_API_KEY=...
BASE_SEPOLIA_RPC_URL=https://sepolia.base.org
```

### Bước 2: Kiểm tra Base Sepolia ETH

**Cần có ETH để trả gas fee!**

Nếu chưa có:
1. Vào: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
2. Kết nối ví MetaMask
3. Chọn network: **Base Sepolia**
4. Request testnet ETH

### Bước 3: Deploy Contract

```bash
cd avatar-system/contracts
npm run deploy:base-sepolia
```

**Quá trình:**
- Hardhat sẽ compile contract
- Gửi transaction lên Base Sepolia
- Chờ confirm (1-2 phút)
- Hiển thị contract address
- Tự động lưu vào `avatar-system/src/contract-address.js`

### Bước 4: Verify Contract (Sau khi deploy xong)

Sau khi deploy thành công, bạn sẽ thấy contract address. Copy address đó và chạy:

```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
```

**Ví dụ:**
```bash
npx hardhat verify --network baseSepolia 0xABC123DEF456...
```

---

## 🎯 KẾT QUẢ MONG ĐỢI:

Sau khi deploy thành công, bạn sẽ thấy:

```
✅ AvatarNFT deployed to: 0xABC123...
📝 Contract address: 0xABC123...

✅ Contract address and ABI saved to: avatar-system/src/contract-address.js
📦 ABI contains XX items (functions, events, errors)
```

File `avatar-system/src/contract-address.js` sẽ được cập nhật với:
- Contract address thật
- Full ABI
- Network info

---

## ⚠️ LƯU Ý:

1. **Gas fee:** Deploy contract tốn ~0.001-0.005 ETH
2. **Thời gian:** Deploy mất 1-2 phút để confirm
3. **Contract address:** Là duy nhất, không đổi sau khi deploy
4. **Verify:** Có thể verify ngay sau khi deploy hoặc sau cũng được

---

## 🐛 NẾU GẶP LỖI:

### "insufficient funds for gas"
→ Cần thêm Base Sepolia ETH vào ví

### "private key invalid"
→ Kiểm tra lại PRIVATE_KEY trong `.env`

### "network mismatch"
→ Đảm bảo MetaMask đang ở network Base Sepolia (Chain ID: 84532)

---

**Sẵn sàng deploy? Chạy lệnh: `npm run deploy:base-sepolia` 🚀**

