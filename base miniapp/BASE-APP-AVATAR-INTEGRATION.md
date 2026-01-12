# 📸 BASE APP AVATAR INTEGRATION - MENTOR REVIEW

> **Mục tiêu:** Tài liệu chi tiết về việc lấy và hiển thị avatar từ Base App account để hỏi mentor

**Ngày tạo:** 2024-12-19  
**Status:** ⚠️ Cần mentor review và guidance

---

## 📋 CONTEXT & REQUIREMENT

### **User Requirement:**
> "Tôi muốn nếu truy cập từ base thì hiển thị avatar của user từ account base app hiện lên trên đó luôn nhé. Trước mắt là vậy cho dễ hiểu."

### **Current Situation:**
- MemePlay đang tích hợp với Base App Mini App platform
- Base App sử dụng Farcaster protocol → user có Farcaster profile với avatar
- MemePlay có profile menu item với `#profileAvatarPreview` (77x77px) đã có sẵn
- Hiện tại: Profile menu hiển thị MemePlay avatar (nếu user đã mint) hoặc plus icon (default)

### **Goal:**
- Khi user truy cập từ Base App → hiển thị avatar từ Base App account (Farcaster avatar)
- Hiển thị trong profile menu item (`#profileAvatarPreview`)
- Trước mắt: Đơn giản, dễ hiểu

---

## 🔍 PHÂN TÍCH VẤN ĐỀ

### **1. Base App Avatar System**

**Base App sử dụng Farcaster Protocol:**
- ✅ Base App built trên Farcaster protocol
- ✅ Mỗi user có Farcaster profile với:
  - Farcaster ID (fid): Số duy nhất (ví dụ: `123456`)
  - Profile Picture (pfp): Avatar URL
  - Username, Bio, etc.

**Avatar Sources:**
- **Farcaster Profile Picture:** User upload avatar trong Farcaster
- **Wallet Address:** Có thể dùng để query Farcaster profile
- **ENS Avatar:** Nếu user có ENS name → có thể có ENS avatar

---

### **2. Current MemePlay Avatar System**

**MemePlay có 2 avatar systems:**

#### **A. MemePlay Avatar NFT (Game-level)**
- ERC-721 NFT trên Base Sepolia
- User customize: actor, clothes, equipment, hat
- Idle animation (nhún nhảy)
- Dùng trong games và MemePlay profile page

#### **B. Profile Menu Avatar Preview**
- Location: Hamburger menu → Profile item
- Element: `#profileAvatarPreview` (77x77px)
- Current logic: Hiển thị MemePlay avatar (nếu minted) hoặc plus icon
- File: `avatar-system/src/profile-menu-avatar.js`

**Question:** Có cần cả 2 systems không? Hay chỉ dùng Base App avatar?

---

## 💡 SOLUTION OPTIONS

### **Option 1: Farcaster API (Recommended)**

**Approach:**
- Lấy wallet address từ Base App (đã có sẵn)
- Query Farcaster API để lấy profile picture
- Hiển thị trong `#profileAvatarPreview`

**Farcaster API Endpoints:**

#### **A. Query by Wallet Address:**
```
GET https://api.farcaster.xyz/v2/user-by-verification?address={walletAddress}
```

**Response:**
```json
{
  "result": {
    "user": {
      "fid": 123456,
      "username": "username",
      "display_name": "Display Name",
      "pfp_url": "https://...",  // ← Avatar URL
      "bio": "...",
      ...
    }
  }
}
```

#### **B. Query by Farcaster ID (fid):**
```
GET https://api.farcaster.xyz/v2/user-by-fid?fid={fid}
```

**Response:** Tương tự, có `pfp_url`

**Implementation:**
```javascript
async function getBaseAppAvatar(walletAddress) {
  try {
    const response = await fetch(
      `https://api.farcaster.xyz/v2/user-by-verification?address=${walletAddress}`
    );
    const data = await response.json();
    return data.result?.user?.pfp_url || null;
  } catch (error) {
    console.warn('Failed to fetch Farcaster avatar:', error);
    return null;
  }
}
```

**Pros:**
- ✅ Official Farcaster API
- ✅ Đơn giản (chỉ cần fetch API)
- ✅ Có wallet address là đủ (không cần fid)
- ✅ Works với Vanilla JS

**Cons:**
- ⚠️ CORS restrictions? (Cần test)
- ⚠️ Rate limiting? (Cần check)
- ⚠️ API có thể thay đổi

---

### **Option 2: ENS Avatar Resolver (Fallback)**

**Approach:**
- Nếu user có ENS name → query ENS resolver để lấy avatar
- Fallback nếu Farcaster không có avatar

**ENS Avatar:**
- ENS name → resolver → avatar URL
- Có thể query qua ENS resolver contract hoặc API

**Pros:**
- ✅ Fallback option
- ✅ Nhiều user có ENS name

**Cons:**
- ⚠️ Phức tạp hơn (cần query ENS resolver)
- ⚠️ Không phải tất cả user có ENS

---

### **Option 3: Base App SDK/API (Nếu có)**

**Approach:**
- Base App có thể có SDK hoặc API riêng để lấy user info
- Cần research Base App documentation

**Pros:**
- ✅ Official Base App API
- ✅ Có thể có thêm info (username, etc.)

**Cons:**
- ❓ Chưa rõ có API này không
- ❓ Có thể cần authentication

---

### **Option 4: PostMessage từ Base App (Nếu Base App support)**

**Approach:**
- Base App có thể gửi user info qua `postMessage`
- Mini app listen và nhận avatar URL

**Pros:**
- ✅ Không cần API call
- ✅ Base App tự động cung cấp

**Cons:**
- ❓ Chưa rõ Base App có support không
- ❓ Cần research Base App documentation

---

## 🎯 RECOMMENDED APPROACH

### **Phase 1: Farcaster API (Simple)**

**Flow:**
1. Detect Base App environment
2. Lấy wallet address (đã có sẵn)
3. Query Farcaster API: `user-by-verification?address={walletAddress}`
4. Lấy `pfp_url` từ response
5. Hiển thị trong `#profileAvatarPreview`

**Implementation:**
- Function: `getBaseAppAvatar(walletAddress)`
- Update: `avatar-system/src/profile-menu-avatar.js`
- Logic: Nếu Base App → query Farcaster API → hiển thị avatar

**Fallback:**
- Nếu Farcaster API fail → giữ default (plus icon hoặc MemePlay avatar)

---

## ❓ QUESTIONS FOR MENTOR

### **1. Farcaster API Access**

**Question:** Có thể query Farcaster API từ mini app không? Có CORS restrictions không?

**Context:**
- Farcaster API: `https://api.farcaster.xyz/v2/user-by-verification?address={walletAddress}`
- Mini app chạy trong Base App webview
- Cần fetch từ client-side (Vanilla JS)

**Concerns:**
- ⚠️ CORS restrictions?
- ⚠️ Rate limiting?
- ⚠️ Authentication required?

**Need mentor guidance:**
- ✅ Có thể dùng Farcaster API không?
- ✅ Có cách nào tốt hơn không?

---

### **2. Base App Avatar vs MemePlay Avatar**

**Question:** Có cần cả 2 avatar systems không? Hay chỉ dùng Base App avatar?

**Context:**
- Base App avatar: Farcaster profile picture (platform-level)
- MemePlay avatar: NFT avatar với customization (game-level)

**Options:**
- **Option A:** Chỉ dùng Base App avatar (đơn giản)
- **Option B:** Dùng cả 2 với priority (Base App → MemePlay → Default)
- **Option C:** User chọn avatar nào hiển thị

**Need mentor guidance:**
- ✅ Approach nào tốt nhất?
- ✅ Có cần MemePlay avatar system nữa không?

---

### **3. Avatar Display Location**

**Question:** Hiển thị avatar ở đâu? Chỉ profile menu hay cả header?

**Current:**
- Profile menu item: `#profileAvatarPreview` (77x77px)
- Header: Có thể thêm avatar icon

**Options:**
- **Option A:** Chỉ profile menu (đơn giản)
- **Option B:** Profile menu + Header avatar icon
- **Option C:** Profile menu + Welcome screen

**Need mentor guidance:**
- ✅ Nên hiển thị ở đâu?
- ✅ Có cần hiển thị ở nhiều nơi không?

---

### **4. Farcaster ID (fid) Access**

**Question:** Có cách nào lấy Farcaster ID (fid) từ Base App không?

**Context:**
- Base App có Farcaster ID (fid) - số duy nhất
- Để lấy `fid` cần MiniKit (React) hoặc API
- Với Web3 Standard → chỉ có wallet address

**Options:**
- **Option A:** Chỉ dùng wallet address (đơn giản)
- **Option B:** Research cách lấy fid (nếu có)
- **Option C:** Query Farcaster API với wallet → lấy fid từ response

**Need mentor guidance:**
- ✅ Có cần fid không? Hay wallet address đủ?
- ✅ Có cách nào lấy fid với Vanilla JS không?

---

### **5. Caching Strategy**

**Question:** Có nên cache avatar URL không? Cache ở đâu?

**Context:**
- Avatar URL có thể thay đổi (user update avatar)
- Query API mỗi lần load → có thể chậm
- Cache → nhanh hơn nhưng có thể outdated

**Options:**
- **Option A:** Không cache (luôn query mới)
- **Option B:** Cache trong localStorage (1 ngày)
- **Option C:** Cache trong memory (session only)

**Need mentor guidance:**
- ✅ Có nên cache không?
- ✅ Cache strategy nào tốt nhất?

---

### **6. Error Handling**

**Question:** Nếu Farcaster API fail → hiển thị gì?

**Context:**
- API có thể fail (network error, rate limit, etc.)
- User có thể không có Farcaster profile
- User có thể không có avatar

**Options:**
- **Option A:** Fallback to default (plus icon)
- **Option B:** Fallback to MemePlay avatar (nếu có)
- **Option C:** Show error message

**Need mentor guidance:**
- ✅ Fallback strategy nào tốt nhất?

---

### **7. Performance Considerations**

**Question:** Query Farcaster API có ảnh hưởng performance không?

**Context:**
- API call mỗi lần load page → có thể chậm
- Cần optimize để không block UI
- Có thể cần loading state

**Options:**
- **Option A:** Query ngay khi detect Base App
- **Option B:** Lazy load (query sau khi page loaded)
- **Option C:** Background fetch (không block UI)

**Need mentor guidance:**
- ✅ Có cần optimize performance không?
- ✅ Approach nào tốt nhất?

---

## 📊 COMPARISON TABLE

| Aspect | Farcaster API | ENS Resolver | Base App SDK | PostMessage |
|--------|---------------|--------------|--------------|-------------|
| **Complexity** | ⭐⭐ Low | ⭐⭐⭐ Medium | ❓ Unknown | ⭐ Low |
| **Reliability** | ⭐⭐⭐ High | ⭐⭐ Medium | ❓ Unknown | ❓ Unknown |
| **Availability** | ✅ Yes | ⚠️ Partial | ❓ Unknown | ❓ Unknown |
| **CORS Issues** | ⚠️ Possible | ✅ No | ❓ Unknown | ✅ No |
| **Rate Limiting** | ⚠️ Possible | ✅ No | ❓ Unknown | ✅ No |
| **Vanilla JS** | ✅ Yes | ✅ Yes | ❓ Unknown | ✅ Yes |

---

## 🎯 RECOMMENDED IMPLEMENTATION PLAN

### **Phase 1: Simple Farcaster API Integration**

**Steps:**
1. **Detect Base App** (đã có)
2. **Get Wallet Address** (đã có)
3. **Query Farcaster API:**
   - Endpoint: `https://api.farcaster.xyz/v2/user-by-verification?address={walletAddress}`
   - Extract: `data.result.user.pfp_url`
4. **Display Avatar:**
   - Update `#profileAvatarPreview` với avatar URL
   - Fallback: Default icon nếu không có avatar

**Files to Modify:**
- `avatar-system/src/profile-menu-avatar.js` (hoặc tạo file mới)
- `scripts/app-v3.js` (nếu cần)

**Estimated Time:** 1-2 hours

---

### **Phase 2: Optimization (Nếu cần)**

**Steps:**
1. **Caching:** Cache avatar URL trong localStorage
2. **Error Handling:** Better error messages
3. **Loading State:** Show loading indicator
4. **Performance:** Lazy load, background fetch

**Estimated Time:** 1-2 hours

---

## 🔍 TECHNICAL DETAILS

### **Farcaster API Documentation**

**Endpoint:**
```
GET https://api.farcaster.xyz/v2/user-by-verification?address={walletAddress}
```

**Headers:**
- `Content-Type: application/json`
- Có thể cần API key? (Cần check)

**Response Format:**
```json
{
  "result": {
    "user": {
      "fid": 123456,
      "username": "username",
      "display_name": "Display Name",
      "pfp_url": "https://i.imgur.com/...",  // ← Avatar URL
      "bio": "...",
      "verified_addresses": {
        "eth_addresses": ["0x..."]
      }
    }
  }
}
```

**Error Cases:**
- User không có Farcaster profile → `result.user` = null
- Network error → catch và fallback
- Rate limit → retry sau

---

### **Current Profile Menu Implementation**

**Location:** `index.html` line 573-585

**HTML:**
```html
<div class="dropdown-item profile-item" data-action="profile" id="profileMenuItem">
  <div class="profile-item-content">
    <div class="profile-icon-wrapper">
      <svg>...</svg>
    </div>
    <div class="profile-avatar-preview" id="profileAvatarPreview">
      <!-- Avatar image or plus icon will be rendered here -->
    </div>
  </div>
</div>
```

**CSS:**
- `.profile-avatar-preview`: 77x77px, border-radius 8px
- Background: `rgba(255, 182, 66, 0.1)`
- Border: `2px solid rgba(255, 182, 66, 0.3)`

**JavaScript:**
- File: `avatar-system/src/profile-menu-avatar.js`
- Function: `setupProfileMenuAvatar()` và `initProfileMenuAvatar()`
- Current logic: 
  - Step 1: Check localStorage cho MemePlay avatar (fastest)
  - Step 2: Nếu không có → check contract (nếu wallet connected)
  - Step 3: Nếu có MemePlay avatar → hiển thị MemePlay avatar
  - Step 4: Nếu không có → hiển thị plus icon (default)
- **Cần update:** 
  - Thêm Step 0: Nếu Base App → query Farcaster API → hiển thị Base App avatar
  - Priority: Base App avatar → MemePlay avatar → Default icon

---

## 📝 IMPLEMENTATION CHECKLIST

### **Phase 1: Basic Integration**

- [ ] Research Farcaster API (CORS, rate limits, authentication)
- [ ] Test Farcaster API với wallet address
- [ ] Create function: `getBaseAppAvatar(walletAddress)`
- [ ] Update `profile-menu-avatar.js` để query Farcaster API
- [ ] Display avatar trong `#profileAvatarPreview`
- [ ] Handle error cases (API fail, no avatar)
- [ ] Test trên Base App webview

### **Phase 2: Optimization (Nếu cần)**

- [ ] Implement caching (localStorage)
- [ ] Add loading state
- [ ] Optimize performance (lazy load)
- [ ] Add error messages
- [ ] Test edge cases

---

## 🚨 RISKS & MITIGATION

### **Risk 1: CORS Restrictions**

**Issue:** Farcaster API có thể block CORS requests từ browser

**Mitigation:**
- Test trên Base App webview (có thể không có CORS restrictions)
- Nếu có CORS → cần proxy server hoặc Base App SDK

---

### **Risk 2: Rate Limiting**

**Issue:** Farcaster API có thể có rate limits

**Mitigation:**
- Cache avatar URL
- Query chỉ khi cần (không query mỗi lần load)
- Handle rate limit errors gracefully

---

### **Risk 3: API Changes**

**Issue:** Farcaster API có thể thay đổi

**Mitigation:**
- Monitor API changes
- Version API calls
- Fallback strategy

---

### **Risk 4: User không có Farcaster Profile**

**Issue:** Không phải tất cả user có Farcaster profile

**Mitigation:**
- Fallback to default icon
- Fallback to MemePlay avatar (nếu có)
- Handle gracefully (không show error)

---

## 🎯 SUCCESS CRITERIA

### **Phase 1:**
- ✅ Avatar hiển thị trong profile menu khi truy cập từ Base App
- ✅ Avatar load từ Farcaster API
- ✅ Fallback works nếu không có avatar
- ✅ No errors trong console

### **Phase 2:**
- ✅ Performance tốt (load nhanh)
- ✅ Caching works
- ✅ Error handling tốt
- ✅ UX smooth

---

## 📚 RELATED DOCUMENTS

1. **`base miniapp/BASE-APP-USER-ID-ANALYSIS.md`** - User ID analysis
2. **`base miniapp/MENTOR-REVIEW-SUMMARY.md`** - Main implementation plan
3. **`base miniapp/ROADMAP-PHASE-1-AVATAR-SYSTEM.md`** - MemePlay avatar system

---

## 🔗 REFERENCES

### **Farcaster API:**
- Documentation: `https://docs.farcaster.xyz/`
- API Endpoint: `https://api.farcaster.xyz/v2/`
- User by Verification: `user-by-verification?address={address}`

### **Base App:**
- Base App uses Farcaster protocol
- User có Farcaster profile với avatar
- Wallet address có thể dùng để query Farcaster profile

---

## ❓ SUMMARY QUESTIONS FOR MENTOR

### **Critical Questions:**

1. **Farcaster API Access:**
   - ✅ Có thể query Farcaster API từ mini app không?
   - ✅ Có CORS restrictions không?
   - ✅ Có cần API key không?

2. **Avatar Strategy:**
   - ✅ Có cần cả Base App avatar và MemePlay avatar không?
   - ✅ Hay chỉ dùng Base App avatar?
   - ✅ Priority: Base App → MemePlay → Default?

3. **Implementation Approach:**
   - ✅ Farcaster API là approach tốt nhất không?
   - ✅ Có cách nào tốt hơn không?
   - ✅ Base App có SDK/API riêng không?

4. **Technical Details:**
   - ✅ Có cần Farcaster ID (fid) không? Hay wallet address đủ?
   - ✅ Có nên cache avatar URL không?
   - ✅ Error handling strategy?

---

## 🚀 NEXT STEPS

1. **Mentor Review:** ✅ Đang làm (document này)
2. **Research:** ⏳ Chờ mentor guidance về Farcaster API
3. **Implementation:** ⏳ Chờ mentor approval
4. **Testing:** Test trên Base App webview
5. **Optimization:** Nếu cần

---

**Last Updated:** 2024-12-19  
**Status:** ⚠️ Awaiting Mentor Review & Guidance

