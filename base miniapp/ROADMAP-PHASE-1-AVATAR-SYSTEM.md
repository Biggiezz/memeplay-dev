# 🎮 ROADMAP PHASE 1: AVATAR SYSTEM - TASK LIST CHI TIẾT

> **Mục tiêu:** Chứng minh nhu cầu onchain - User mint avatar FREE và dùng làm profile với idle animation

---

## 📋 TỔNG QUAN

- **Timeline:** 2-3 tuần
- **Network:** Base Sepolia (testnet) → Mainnet sau
- **Platform:** Base App Mini App (mobile-first)
- **Art Style:** Pixel art 8-bit / Chibi, 256x256px
- **Success Metrics:** 10-20 avatars minted, 30-50% retention

---

## 🎯 MỤC TIÊU PHASE 1

1. ✅ User tạo avatar (5 layers: skin, face, hair, clothes, equipment)
2. ✅ FREE Mint onchain (Base Sepolia, user tự trả gas)
3. ✅ Avatar có idle animation (nhún nhảy nhẹ, 4-6 frames) + **blink animation** (mắt nhắm khi nhún)
4. ✅ Profile page hiển thị avatar với animation
5. ✅ Base App integration (auto-connect wallet)
6. ✅ Simple tracking (Supabase)
7. ✅ **Blink logic:** Mắt mở khi đứng (0.15s), mắt nhắm khi nhún (0.15s)

---

## 📁 CẤU TRÚC THƯ MỤC

```
avatar-system/
├── assets/
│   ├── avatars/          (Pre-rendered: a000.png, a100.png, c153.png, ...)
│   │                     (Vẽ theo combinations user chọn, không cần vẽ hết 450 combinations)
│   ├── layers/           (Layers cũ - không dùng, giữ lại để tham khảo)
│   │   ├── clothes/      (4 files)
│   │   ├── equipment/    (5 files)
│   │   ├── faces/        (4 files)
│   │   └── hair/         (4 files)
│   └── animations/
│       └── move*.png      (move animations: movea000.png, movea123.png, movec153.png, ...)
│                          (4 frames mỗi animation, 0.2s/frame, vẽ theo nhu cầu)
├── src/
│   ├── animation-config.js       # Config animation (frame count, duration, FPS)
│   ├── animation-loader.js       # Load và parse sprite sheet
│   ├── animation-renderer.js    # Render idle animation (fallback)
│   ├── mint-service.js           # Smart contract interaction (TODO)
│   ├── contract-address.js      # Contract address (env) (TODO)
│   └── tracking.js               # Supabase tracking (TODO)
├── contracts/
│   └── AvatarNFT.sol             # ERC-721 contract (TODO)
├── avatar-creator.html           # Creator page (logic inline)
└── avatar-profile.html           # Profile page (TODO)
```

**Routes:**
- `/avatar-creator` - Creator page
- `/avatar-profile` - Profile page
- `/avatar-system/` - Assets folder

---

# 📅 TUẦN 1: Assets + Creator + Animation

## 🎯 Milestone 1: Avatar Creator hoạt động + Idle Animation

---

### **NGÀY 1-2: Setup + Assets cơ bản**

#### Task 1.1: Tạo cấu trúc thư mục

**Files cần tạo:**
- `avatar-system/src/avatar-config.js` - Config layers
- `avatar-system/src/contract-address.js` - Contract config

**Nội dung `avatar-config.js`:**
```javascript
export const AVATAR_CONFIG = {
  layers: {
    skin: {
      count: 3,
      path: 'avatar-system/assets/layers/skins/',
      fileName: 'skin',
      zIndex: 0
    },
    face: {
      count: 1, // ✅ Chỉ 1 style (bình thường), có 2 versions: open + closed
      path: 'avatar-system/assets/layers/faces/',
      fileName: 'face', // face-open.png, face-closed.png
      zIndex: 1
    },
    hair: {
      count: 5,
      path: 'avatar-system/assets/layers/hair/',
      fileName: 'hair',
      zIndex: 2
    },
    clothes: {
      count: 5,
      path: 'avatar-system/assets/layers/clothes/',
      fileName: 'clothes',
      zIndex: 3
    },
    equipment: {
      count: 5,
      path: 'avatar-system/assets/layers/equipment/',
      fileName: 'equipment',
      zIndex: 4
    }
  },
  canvasSize: { width: 256, height: 256 },
  get totalCombinations() {
    // 1 face × 5 hair × 5 clothes × 5 equipment × 3 skin = 375 combinations
    return Object.values(this.layers).reduce((acc, layer) => acc * layer.count, 1);
  }
}

export const DEFAULT_AVATAR_CONFIG = {
  skin: 1,
  face: 1, // ✅ Chỉ có 1 face style (bình thường)
  hair: 1,
  clothes: 1,
  equipment: 1
}
```

**Checklist:**
- [ ] Tạo thư mục `avatar-system/` và subfolders
- [ ] Tạo `avatar-config.js` với config trên
- [ ] Tạo `contract-address.js` (placeholder cho contract address)
- [ ] Commit: "Setup avatar system folder structure"

---

#### Task 1.2: Vẽ Pre-rendered Avatars (theo combinations user chọn)

**Approach:** Vẽ từng ảnh hoàn chỉnh cho mỗi combination mà user chọn

**Naming convention:**
- Format: `{skin}{clothes}{equipment}{hat}.png`
- Skin mapping: a=boy(1), b=fish(2), c=supergirl(3)
- Example: 
  - `a000.png` = Boy base (skin=a, clothes=0, equipment=0, hat=0)
  - `a100.png` = Boy + Clothes 1
  - `c153.png` = Super Girl + Clothes 1 + Equipment 5 + Hat 3

**Số lượng combinations:**
- 3 actors × 5 clothes (0-4) × 6 equipment (0-5) × 5 hat (0-4) = **450 combinations tiềm năng**
- **KHÔNG cần vẽ hết ngay** - vẽ theo nhu cầu user chọn
- Mỗi ngày vẽ 20 combinations → hoàn thành trong ~22 ngày

**Lưu ý:**
- Tất cả cùng style (pixel art 8-bit / chibi)
- Mỗi ảnh là 1 avatar hoàn chỉnh (không phải ghép layers)
- Màu sắc: giữ theme MemePlay (#ffb642 vàng)
- Fallback: Nếu combination chưa vẽ → dùng animation

**Checklist:**
- [x] Vẽ các combinations cơ bản (a000, b000, c000, ...)
- [x] Vẽ một số combinations phổ biến (a100, c153, ...)
- [ ] Vẽ thêm theo nhu cầu user
- [x] Test load trong browser
- [x] Commit: "Add pre-rendered avatar assets"

---

### **NGÀY 3-4: Avatar Renderer + Creator UI**

#### Task 1.3: Pre-rendered Avatar System (NEW APPROACH)

**Approach:** Vẽ từng ảnh hoàn chỉnh cho mỗi combination thay vì layer system

**File naming convention:**
- Format: `{skin}{clothes}{equipment}{hat}.png`
- Example: `a000.png` = Boy base, `c153.png` = Super Girl + Clothes 1 + Equipment 5 + Hat 3
- Skin mapping: a=boy(1), b=fish(2), c=supergirl(3)

**Chức năng:**
- Load pre-rendered image từ file path
- Fallback: Nếu không tìm thấy → dùng animation renderer
- Generate config hash từ config

**Features:**
- Simple image loading (không cần layer system)
- Fallback mechanism (animation khi không có pre-rendered)
- In-memory cache cho loaded images

**Checklist:**
- [x] Implement pre-rendered image loading
- [x] Test với các combinations đã vẽ
- [x] Test fallback animation
- [x] Commit: "Add pre-rendered avatar system"

---

#### Task 1.4: Creator UI HTML

**File:** `avatar-creator.html`

**UI cần có:**
- Canvas preview (256x256px, scale lên cho dễ xem)
- 5 layer selectors (skin, face, hair, clothes, equipment) - ✅ Face chỉ có 1 style (không cần selector)
- Config hash display
- "Mint Avatar" button
- Loading states
- Success/Error messages

**Style:**
- Theme MemePlay (#ffb642 vàng)
- Responsive (mobile-first cho Base App)
- Dark background

**Checklist:**
- [ ] Tạo `avatar-creator.html`
- [ ] Test responsive trên mobile
- [ ] Commit: "Add avatar creator HTML UI"

---

#### Task 1.5: Creator UI Logic

**File:** Logic inline trong `avatar-creator.html` (hoặc `avatar-system/src/avatar-creator.js`)

**Chức năng:**
- Handle Actor/Clothes/Equipment/Hat selection → update preview
- Load pre-rendered image hoặc fallback animation
- Generate config hash và hiển thị
- Disable mint button khi pending
- Show success/error messages

**Selectors:**
- Actor: Boy, Fish, Super Girl (thay vì Skin selector)
- Clothes: 0-4 (None + 4 outfits)
- Equipment: 0-5 (None + 5 weapons)
- Hat: 0-4 (None + 4 hats)
- ✅ Bỏ Skin và Hair selectors (đã tích hợp vào Actor)

**Checklist:**
- [x] Logic chọn Actor/Clothes/Equipment/Hat
- [x] Update preview real-time
- [x] Generate và hiển thị hash
- [x] Mint button handler (demo)
- [x] Commit: "Add creator UI logic"

---

### **NGÀY 5: Idle Animation**

#### Task 1.6: Animation Assets

**Assets cần vẽ:**
- `avatar-system/assets/animations/move{actor}{clothes}{equipment}{hat}.png` - Move animations

**Naming convention:**
- Format: `move{actor}{clothes}{equipment}{hat}.png`
- Actor mapping: a=boy, b=fish, c=supergirl
- Example: 
  - `movea000.png` = Boy base animation (4 frames)
  - `movea123.png` = Boy + Clothes 1 + Equipment 2 + Hat 3 (4 frames)
  - `movec153.png` = Super Girl + Clothes 1 + Equipment 5 + Hat 3 (4 frames)

**Animation specs:**
- 4 frames cho mỗi animation
- Mỗi frame 256x256px
- Horizontal layout (frames nằm ngang)
- Frame duration: 0.2s (200ms) mỗi frame
- Total cycle: 0.8s (4 × 0.2s)
- Target FPS: 30 FPS

**Animation cycle:**
1. Frame 1: Đứng thẳng
2. Frame 2: Hơi nhún xuống
3. Frame 3: Nhảy lên nhẹ
4. Frame 4: Về lại frame 1

**Lưu ý:**
- **KHÔNG cần vẽ hết 450 combinations** - vẽ theo nhu cầu user chọn
- Mỗi ngày vẽ 20 move animations → hoàn thành trong ~22 ngày
- Nếu move animation không có → hiển thị error (không có fallback idle)

**Checklist:**
- [x] Vẽ một số move animations cơ bản (movea000, moveb000, movec000, ...)
- [ ] Vẽ thêm move animations theo nhu cầu
- [x] Test load và parse sprite sheet
- [x] Commit: "Add move animation assets"

---

#### Task 1.7: Animation Renderer (Fallback System)

**File:** `avatar-system/src/animation-renderer.js`

**Chức năng:**
- Load sprite sheet (move animations)
- Parse frames từ sprite sheet (4 frames)
- Render frame theo animation state
- Loop animation
- Update frame theo timing (30 FPS, 200ms/frame)

**Animation Loading Logic:**
1. Ưu tiên: Load move animation theo config (`move{actor}{clothes}{equipment}{hat}.png`)
2. Fallback: Nếu move animation không có → show error

**Integration với Pre-rendered System:**
- ✅ Fallback chain: Pre-rendered image → Move animation → Error
- Animation chạy độc lập (không cần layer system)
- Auto-start khi pre-rendered image load fail

**Files:**
- `animation-config.js` - Config animation (frame count, duration, FPS, getAnimationPath)
- `animation-loader.js` - Load và parse sprite sheet
- `animation-renderer.js` - Render animation loop

**Checklist:**
- [x] Tạo `animation-renderer.js`
- [x] Tạo `animation-loader.js`
- [x] Tạo `animation-config.js` với getAnimationPath()
- [x] Test render move animation (4 frames, 0.2s/frame)
- [x] Test fallback mechanism
- [x] Commit: "Add AnimationRenderer with move animations"

---

#### Task 1.8: Test Animation trong Creator

**Update:** `avatar-creator.html`

**Chức năng:**
- ✅ Auto animated preview (fallback khi không có pre-rendered image)
- Test animation với các combinations chưa có pre-rendered
- Test pre-rendered images load đúng
- Test fallback mechanism hoạt động

**Checklist:**
- [x] Preview auto animated (fallback mechanism)
- [x] Test animation mượt (30 FPS)
- [x] Test pre-rendered images load
- [x] Test fallback khi image không tìm thấy
- [x] Commit: "Add animation preview as fallback"

---

## ✅ TUẦN 1 - CHECKPOINT

**Deliverables:**
- ✅ Avatar Creator UI hoàn chỉnh
- ✅ User có thể chọn Actor/Clothes/Equipment/Hat và xem preview
- ✅ Pre-rendered avatar system hoạt động
- ✅ Move animation system hoạt động (4 frames, 0.2s/frame)
- ✅ Có một số pre-rendered avatars (vẽ thêm theo nhu cầu)
- ✅ Có một số move animations (vẽ thêm theo nhu cầu)

**Approach:**
- ✅ Pre-rendered images: Mỗi combination là 1 ảnh hoàn chỉnh
- ✅ Fallback chain: Pre-rendered image → Move animation → Error
- ✅ Naming pre-rendered: `{skin}{clothes}{equipment}{hat}.png` (ví dụ: `a000.png`, `c153.png`)
- ✅ Naming animation: `move{actor}{clothes}{equipment}{hat}.png` (ví dụ: `movea000.png`, `movec153.png`)

---

# 📅 TUẦN 2: Smart Contract + Mint + Profile

## 🎯 Milestone 2: Contract deployed + Mint hoạt động + Profile page

---

### **NGÀY 6-7: Smart Contract**

#### Task 2.1: Setup Hardhat/Foundry

**Mục tiêu:** Setup môi trường để viết contract

**Files cần tạo:**
- `contracts/` folder
- `hardhat.config.js` hoặc `foundry.toml`
- Update `package.json` với dependencies

**Checklist:**
- [ ] Setup Hardhat hoặc Foundry
- [ ] Test compile contract mẫu
- [ ] Commit: "Setup smart contract environment"

---

#### Task 2.2: AvatarNFT Contract

**File:** `contracts/AvatarNFT.sol`

**Contract functions:**
```solidity
// Mint
function mintAvatar(address to, string memory configHash) public;

// Query
function getAvatarByOwner(address owner) public view returns (uint256);
function getConfigHash(uint256 tokenId) public view returns (string memory);
function hasMinted(address owner) public view returns (bool);
function balanceOf(address owner) public view returns (uint256); // ERC721

// Admin
function pause() public onlyOwner;
function unpause() public onlyOwner;
```

**Features:**
- ERC-721 standard
- FREE mint (không charge phí)
- ✅ Duplicate check: **1 user = 1 avatar** (check `hasMinted[address]`, KHÔNG check configHash)
- ✅ Allow multiple users with same avatar config (avatar trùng OK)
- Pause function (admin)
- Events: `AvatarMinted(address indexed to, uint256 indexed tokenId, string configHash)`

**Contract logic:**
```solidity
mapping(address => bool) public hasMinted; // ✅ Check user đã mint chưa

function mintAvatar(address to, string memory configHash) public {
    require(!paused, "Contract is paused");
    require(!hasMinted[to], "User already minted"); // ✅ 1 user = 1 avatar
    require(totalSupply < MAX_MINT, "Max mint reached"); // ✅ Max 2000
    
    hasMinted[to] = true;
    uint256 tokenId = totalSupply++;
    _safeMint(to, tokenId);
    tokenConfigHash[tokenId] = configHash;
    
    emit AvatarMinted(to, tokenId, configHash);
}
```

**Checklist:**
- [ ] Tạo `AvatarNFT.sol`
- [ ] Compile thành công
- [ ] Test unit test cơ bản
- [ ] Commit: "Add AvatarNFT ERC-721 contract"

---

#### Task 2.3: Deploy Contract

**File:** `scripts/deploy.js` hoặc `scripts/deploy.sh`

**Yêu cầu:**
- Deploy lên Base Sepolia testnet
- Lưu contract address vào `contract-address.js`
- Verify contract trên BaseScan

**Checklist:**
- [ ] Tạo deploy script
- [ ] Deploy thành công
- [ ] Verify trên BaseScan
- [ ] Update `contract-address.js` với address
- [ ] Commit: "Deploy AvatarNFT to Base Sepolia"

---

### **NGÀY 8-9: Mint Integration**

#### Task 2.4: MintService Class

**File:** `avatar-system/src/mint-service.js`

**Chức năng:**
- Connect wallet (Base Wallet hoặc MetaMask)
- ✅ Check user đã mint chưa (query `hasMinted[address]` từ contract)
- ✅ KHÔNG check configHash duplicate (cho phép avatar trùng)
- Call contract `mintAvatar`
- Handle transaction (pending, success, error)
- Track mint to Supabase

**Base App detection:**
```javascript
const isBaseApp = window.ethereum?.isBase || window.parent !== window;
```

**Error handling:**
- Gas không đủ → show "Gas fee không đủ" (Tiếng Việt)
- User đã mint → show "You already have an avatar" (check từ contract)
- Network error → show "Network error" + retry button

**Checklist:**
- [ ] Tạo `mint-service.js`
- [ ] Test connect Base Wallet
- [ ] Test connect MetaMask (fallback)
- [ ] Test check duplicate
- [ ] Commit: "Add MintService for contract interaction"

---

#### Task 2.5: Mint UI Integration

**Update:** `avatar-creator.js`

**Chức năng:**
- Import MintService
- Handle "Mint Avatar" button click
- Show loading states:
  1. "Preparing..."
  2. "Waiting for wallet..."
  3. "Minting..."
  4. "Confirming..."
- Disable button khi pending (prevent duplicate mint)
- Show success: ✅ + avatar image + transaction link
- Show error: error message + retry button

**Success feedback:**
- ✅ Tích xanh lá
- Avatar tĩnh (đã mint)
- Confetti animation (dùng MemePlay confetti system)
- Transaction link (BaseScan)
- Button "View Profile"

**Checklist:**
- [ ] Update `avatar-creator.js` với mint logic
- [ ] Test mint flow end-to-end
- [ ] Test duplicate check
- [ ] Test error handling
- [ ] Commit: "Connect mint button with MintService"

---

#### Task 2.6: Supabase Tracking

**File:** `avatar-system/src/tracking.js`

**Supabase table:**
```sql
CREATE TABLE avatar_mints (
  id SERIAL PRIMARY KEY,
  token_id INTEGER,
  user_address TEXT,
  config_hash TEXT,
  config_json JSONB,
  transaction_hash TEXT,
  minted_at TIMESTAMP DEFAULT NOW()
);
```

**Chức năng:**
- Track mint event → insert vào Supabase
- Query stats (total minted, today, unique users)

**Checklist:**
- [ ] Tạo Supabase table
- [ ] Tạo `tracking.js`
- [ ] Test track mint event
- [ ] Commit: "Add Supabase tracking for mints"

---

### **NGÀY 10: Profile Page**

#### Task 2.7: Profile Page HTML

**File:** `avatar-profile.html`

**UI cần có:**
- Avatar animation (idle, nhún nhảy)
- Background nền nhạt, không chói
- Token ID
- Config Hash
- Transaction link (BaseScan)
- Date minted

**User chưa mint:**
- Background trắng/nhạt
- Message: "You haven't created an avatar yet"
- Button "Create Avatar" → redirect creator

**Checklist:**
- [ ] Tạo `avatar-profile.html`
- [ ] Test responsive trên mobile
- [ ] Commit: "Add avatar profile HTML"

---

#### Task 2.8: Profile Page Logic

**File:** `avatar-system/src/avatar-profile.js`

**Chức năng:**
- Check user có avatar không:
  1. Check localStorage trước (nhanh nhất)
  2. Nếu không có → query contract `getAvatarByOwner`
  3. Nếu có → load config và render avatar
- Render avatar với idle animation
- Display profile info
- Handle "Create Avatar" redirect

**Recovery flow:**
- Nếu mất localStorage → query contract → lấy config hash → decode → render

**Checklist:**
- [ ] Tạo `avatar-profile.js`
- [ ] Test load avatar từ localStorage
- [ ] Test recovery từ contract
- [ ] Test animation mượt (30 FPS)
- [ ] Commit: "Add profile page logic"

---

## ✅ TUẦN 2 - CHECKPOINT

**Deliverables:**
- ✅ Smart contract deployed (Base Sepolia)
- ✅ User có thể mint avatar
- ✅ Profile page hoạt động
- ✅ Tracking hoạt động

---

# 📅 TUẦN 3: Integration + Polish

## 🎯 Milestone 3: Integration hoàn chỉnh + Base App support + Testing pass

---

### **NGÀY 11-12: Integration với MemePlay**

#### Task 3.1: Hamburger Menu Integration

**Update:** `index.html` (hamburger menu)

**Thêm menu item:**
- "Profile" (cùng mục với Stats, Docs, Referral)
- Icon: avatar hoặc user icon
- Click → mở `/avatar-profile`

**Checklist:**
- [ ] Thêm "Profile" vào hamburger menu
- [ ] Test navigation
- [ ] Commit: "Add Profile to hamburger menu"

---

#### Task 3.2: Wallet Integration

**Update:** Sử dụng `memeplayWallet` API (đã có)

**Chức năng:**
- Dùng `memeplayWallet.getAddress()` để lấy address
- Dùng `memeplayWallet.isConnected()` để check connection
- Base App: auto-connect (không cần button)
- Web: fallback MetaMask

**Checklist:**
- [ ] Integrate với `memeplayWallet` API
- [ ] Test Base App auto-connect
- [ ] Test MetaMask fallback
- [ ] Commit: "Integrate wallet with MemePlay API"

---

#### Task 3.3: Shared Components

**Reuse:**
- Confetti system (MemePlay đã có)
- Overlay styles (comments overlay)
- Color scheme (#ffb642 vàng)

**Checklist:**
- [ ] Reuse confetti cho mint success
- [ ] Reuse overlay styles
- [ ] Commit: "Reuse MemePlay components"

---

### **NGÀY 13-14: Testing + Polish**

#### Task 3.4: Base App Testing

**Test checklist:**
- [ ] Mint với Base Wallet
- [ ] Mint với MetaMask (fallback)
- [ ] Test duplicate (mint config đã có)
- [ ] Test profile load
- [ ] Test animation mượt
- [ ] Test trên mobile (Base App)
- [ ] Test recovery (mất localStorage)

**Checklist:**
- [ ] Test tất cả flows
- [ ] Fix bugs
- [ ] Commit: "Base App testing complete"

---

#### Task 3.5: Performance Optimization

**Optimizations:**
- Image caching (in-memory)
- Contract query caching (localStorage + memory)
- Animation FPS check (target 30 FPS)
- Asset loading (load cùng lúc, không lazy load)

**Checklist:**
- [ ] Test performance
- [ ] Optimize nếu cần
- [ ] Commit: "Performance optimization"

---

#### Task 3.6: Final Polish

**Polish items:**
- UI/UX improvements
- Error messages rõ ràng
- Loading states mượt
- Mobile responsive 100%
- Documentation (README)

**Checklist:**
- [ ] Polish UI/UX
- [ ] Test trên nhiều devices
- [ ] Write README
- [ ] Commit: "Final polish Phase 1"

---

## ✅ TUẦN 3 - CHECKPOINT

**Deliverables:**
- ✅ Integration hoàn chỉnh
- ✅ Base App support
- ✅ Testing pass
- ✅ 0 critical bugs

---

# 📊 TỔNG KẾT PHASE 1

## ✅ Deliverables cuối cùng

1. **Avatar Creator** - User tạo và preview avatar
2. **Smart Contract** - ERC-721 trên Base Sepolia (FREE mint)
3. **Mint Integration** - User mint avatar với Base Wallet/MetaMask
4. **Idle Animation** - Avatar nhún nhảy nhẹ (4-6 frames, 30 FPS)
5. **Profile Page** - Hiển thị avatar với animation
6. **Base App Integration** - Auto-connect wallet
7. **Tracking** - Supabase tracking cho stats

## 🎯 Success Criteria

- [ ] Ít nhất 10-20 avatar được mint (proof of demand)
- [ ] 30-50% user retention (quay lại xem profile trong 7 ngày)
- [ ] Animation mượt (≥ 30 FPS)
- [ ] 0 critical bugs
- [ ] Mobile responsive 100%

## 📝 Tech Stack

- **Frontend:** Vanilla JS (ES6 modules)
- **Blockchain:** ethers.js, Base Sepolia
- **Smart Contract:** Solidity (ERC-721), Hardhat/Foundry
- **Storage:** localStorage (client), Supabase (tracking)
- **Animation:** Canvas API, requestAnimationFrame

## 🚀 Next Steps (Phase 2)

- Trade avatar (marketplace)
- More games integration
- Avatar customization mở rộng
- Onchain rewards
- Migrate to Base Mainnet

---

# 📋 NOTES CHO DEVELOPMENT

## Commands thường dùng

```bash
# Start local server
npm run dev

# Deploy contract
npx hardhat run scripts/deploy.js --network baseSepolia

# Verify contract
npx hardhat verify --network baseSepolia <CONTRACT_ADDRESS>

# Test contract
npx hardhat test
```

## Environment Variables

```javascript
// contract-address.js
export const CONTRACT_ADDRESS = '0x...'; // Base Sepolia
export const CONTRACT_ABI = [...]; // ABI từ contract
```

## Supabase Setup

```sql
-- Create tracking table
CREATE TABLE avatar_mints (
  id SERIAL PRIMARY KEY,
  token_id INTEGER,
  user_address TEXT,
  config_hash TEXT,
  config_json JSONB,
  transaction_hash TEXT,
  minted_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_address ON avatar_mints(user_address);
CREATE INDEX idx_minted_at ON avatar_mints(minted_at);
```

## Testing Checklist

- [ ] Mint với Base Wallet
- [ ] Mint với MetaMask
- [ ] Test duplicate check
- [ ] Test profile load
- [ ] Test animation
- [ ] Test recovery (mất localStorage)
- [ ] Test trên mobile
- [ ] Test error handling

---

**Chúc bạn thành công với Phase 1! 🚀**
