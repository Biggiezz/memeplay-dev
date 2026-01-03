# Metadata System Deployment Guide

## Tổng quan

Contract đã được cập nhật với `tokenURI()` function để MetaMask có thể hiển thị hình ảnh NFT. Cần deploy lại contract mới.

## Thay đổi trong Contract

1. ✅ Thêm `tokenURI(uint256 tokenId)` function
2. ✅ Thêm `setBaseURI(string memory newBaseURI)` function (admin only)
3. ✅ Thêm `baseURI()` function để query base URI
4. ✅ Metadata API endpoint: `/avatar-system/api/avatar-metadata.html?tokenId={tokenId}`

## Bước 1: Deploy Contract Mới

```bash
cd avatar-system/contracts
npx hardhat run scripts/deploy.js --network baseSepolia
```

Contract mới sẽ có:
- `tokenURI()` function trả về metadata URL
- Có thể update base URI sau này nếu cần

## Bước 2: Verify Contract

```bash
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>
```

## Bước 3: Update Contract Address

Sau khi deploy, file `avatar-system/src/contract-address.js` sẽ được tự động update với:
- Contract address mới
- ABI mới (có thêm tokenURI, setBaseURI, baseURI)

## Bước 4: Test Metadata API

1. Mint một NFT mới từ `/avatar-creator`
2. Lấy tokenId từ success message
3. Test metadata API:
   ```
   https://memeplay.dev/avatar-system/api/avatar-metadata.html?tokenId=0
   ```
4. Kiểm tra response có đúng format JSON không:
   ```json
   {
     "name": "MemePlay Avatar #0",
     "description": "...",
     "image": "https://memeplay.dev/avatar-system/assets/avatars/a000.png",
     "external_url": "https://memeplay.dev/avatar-creator",
     "attributes": [...]
   }
   ```

## Bước 5: Test trong MetaMask

1. Import NFT vào MetaMask:
   - Contract Address: `<NEW_CONTRACT_ADDRESS>`
   - Token ID: `0` (hoặc tokenId bạn đã mint)
2. MetaMask sẽ tự động query `tokenURI()` từ contract
3. MetaMask sẽ fetch metadata từ URL trả về
4. Hình ảnh NFT sẽ hiển thị trong MetaMask

## Lưu ý

- **Contract cũ sẽ không có tokenURI()**: NFT đã mint từ contract cũ sẽ không hiển thị hình trong MetaMask
- **Contract mới cần mint lại**: User cần mint NFT mới từ contract mới để có metadata
- **Config Storage**: Config được lưu trong localStorage khi mint, metadata API sẽ query từ đó

## Troubleshooting

### Metadata API không trả về JSON
- Kiểm tra server có set `Content-Type: application/json` không
- Thử truy cập trực tiếp URL trong browser

### MetaMask không hiển thị hình
- Kiểm tra `tokenURI()` trả về đúng URL không
- Kiểm tra metadata API có trả về đúng format không
- Kiểm tra image URL có accessible không

### Config không đúng
- Kiểm tra localStorage có lưu config khi mint không
- Kiểm tra metadata API có query được config từ storage không

