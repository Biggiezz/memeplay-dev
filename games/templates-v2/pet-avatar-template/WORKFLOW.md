# 🐾 PET AVATAR GAME - WORKFLOW & OPTIMIZATION PLAN

## 📋 TỔNG QUAN DỰ ÁN

**Game:** Pet Avatar (Nuôi Avatar)  
**Kích thước màn hình:** 720 x 1000px  
**Template ID:** `pet-avatar-template`  
**Vị trí hiển thị:** Luôn ở đầu danh sách (không sort theo likes)

---

## 🎮 WORKFLOW CHI TIẾT

### **PHASE 1: CẤU TRÚC DỰ ÁN**

#### 1.1. Tạo cấu trúc thư mục
```
games/templates-v2/pet-avatar-template/
├── index.html              # Main game HTML (720x1000px)
├── game.js                 # Game logic chính
├── config.js               # Config & brand customization
├── style.css               # Styling
├── assets/
│   ├── background.jpg      # Background (ảnh phòng bừa bộn)
│   ├── avatar/             # Thư mục chứa sprite sheets
│   │   ├── idle/           # Animation idle (nhiều frame)
│   │   ├── shower/         # Animation tắm (nhiều frame)
│   │   ├── sing/           # Animation hát (nhiều frame)
│   │   ├── fly/            # Animation đuổi ruồi (nhiều frame)
│   │   └── drink/          # Animation uống bia (nhiều frame)
│   ├── buttons/            # Icons nút bấm
│   │   ├── shower-icon.png
│   │   ├── mic-icon.png
│   │   ├── fly-icon.png
│   │   └── beer-icon.png
│   └── sounds/             # Âm thanh
│       ├── shower.wav
│       ├── sing.wav
│       ├── fly.wav
│       └── drink.wav
└── editor/
    └── editor-adapter.js    # Editor integration
```

#### 1.2. Cấu hình template registry
- Thêm `pet-avatar-template` vào `template-registry.js`
- Set `enabled: true`
- Cấu hình UI fields (logo, story text)

---

### **PHASE 2: GAME LOGIC**

#### 2.1. Canvas Setup (720x1000px)
```javascript
const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 1000;
```

#### 2.2. Game State Management
```javascript
let gameState = {
    currentAction: 'idle',      // idle, shower, sing, fly, drink
    actionProgress: 0,          // 0-100% progress của action
    avatarState: {
        x: 360,                 // Vị trí X (center)
        y: 500,                 // Vị trí Y
        scale: 1.0,             // Scale của avatar
        currentFrame: 0,        // Frame hiện tại trong animation
        frameCount: 0           // Counter để chuyển frame
    },
    buttons: {
        shower: { x: 100, y: 900, radius: 40, icon: 'shower' },
        mic: { x: 220, y: 900, radius: 40, icon: 'mic' },
        fly: { x: 340, y: 900, radius: 40, icon: 'fly' },
        beer: { x: 460, y: 900, radius: 40, icon: 'beer' }
    }
};
```

#### 2.3. Animation System
- **Sprite Sheet Loading:** Load tất cả sprite sheets vào Image objects
- **Frame Animation:** 
  - Mỗi action có số frame cố định (ví dụ: idle = 8 frames, shower = 12 frames)
  - Frame rate: 10 FPS (mỗi 100ms chuyển frame)
  - Loop animation khi action đang chạy
- **Action Sequence:**
  1. User click nút → Set `currentAction`
  2. Play sound effect
  3. Start animation từ frame 0
  4. Sau khi animation xong → Return về idle

#### 2.4. Button Interaction
- **Hit Detection:** Check click/touch trong vòng tròn button
- **Visual Feedback:** 
  - Scale button khi click (0.9x)
  - Highlight khi hover
- **Cooldown:** Mỗi action có cooldown 2-3 giây để tránh spam

#### 2.5. Audio System
- **Preload sounds:** Load tất cả sounds khi game init
- **Play on action:** Mỗi action trigger sound tương ứng
- **Volume control:** Có thể mute/unmute
- **Mobile-safe:** Sử dụng Web Audio API với user interaction

---

### **PHASE 3: RENDERING**

#### 3.1. Render Loop
```javascript
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // 1. Draw background
    drawBackground();
    
    // 2. Draw avatar (current frame của current action)
    drawAvatar();
    
    // 3. Draw buttons
    drawButtons();
    
    // 4. Update animation frames
    updateAnimation();
    
    requestAnimationFrame(gameLoop);
}
```

#### 3.2. Background Rendering
- Load background image (720x1000px)
- Draw full screen
- Có thể thêm parallax effect nhẹ nếu cần

#### 3.3. Avatar Rendering
- Draw sprite frame hiện tại từ sprite sheet
- Center tại vị trí (360, 500)
- Scale theo `avatarState.scale`
- Flip horizontal nếu cần (tùy animation)

#### 3.4. Button Rendering
- Draw circle với icon ở giữa
- Position: Bottom của màn hình (y = 900)
- Spacing: 120px giữa các nút
- Visual states: normal, hover, pressed

---

### **PHASE 4: INTEGRATION**

#### 4.1. Template Registry
```javascript
'pet-avatar-template': {
    adapterPath: '../pet-avatar-template/editor/editor-adapter.js',
    adapterName: 'PetAvatarEditorAdapter',
    playtestKey: 'pet_avatar_brand_config_playtest',
    playtestGameId: 'playtest-pet-avatar',
    storagePrefix: 'pet_avatar_brand_config_',
    templateUrl: '/games/templates-v2/pet-avatar-template/index.html',
    messageTypes: {
        READY: 'PET_AVATAR_GAME_READY',
        ERROR: 'PET_AVATAR_GAME_ERROR',
        UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: {
        story: { enabled: true, inputId: 'storyInput', maxLength: 50 },
        logo: { enabled: true, inputId: 'logoInput', previewId: 'logoPreview' }
    },
    displayName: 'Pet Avatar',
    description: 'Virtual pet avatar game - interact with your pet',
    enabled: true,
    // ✅ SPECIAL: Always show first
    priority: true  // Flag để sort game này lên đầu
}
```

#### 4.2. Sort Logic (Always First)
Trong `app-v3.js` và `app-telegram.js`, modify sort function:
```javascript
allGames.sort((a, b) => {
    // ✅ Priority: pet-avatar-template luôn đầu tiên
    if (a.templateId === 'pet-avatar-template' && b.templateId !== 'pet-avatar-template') {
        return -1; // a trước b
    }
    if (b.templateId === 'pet-avatar-template' && a.templateId !== 'pet-avatar-template') {
        return 1; // b trước a
    }
    
    // Sort bình thường cho các game khác
    const aLikes = a.likes_count || 0;
    const bLikes = b.likes_count || 0;
    if (bLikes !== aLikes) {
        return bLikes - aLikes;
    }
    return (b.plays_count || 0) - (a.plays_count || 0);
});
```

---

## ⚡ TỐI ƯU PERFORMANCE

### **1. IMAGE OPTIMIZATION**

#### 1.1. Sprite Sheet Strategy
- **Tối ưu:** Dùng sprite sheets thay vì nhiều file riêng lẻ
- **Format:** WebP (tốt nhất) hoặc PNG với compression
- **Kích thước:** 
  - Mỗi frame: ~200x200px (đủ cho avatar)
  - Sprite sheet: 8-12 frames/row
  - Tổng size mỗi sprite sheet: < 500KB

#### 1.2. Background Image
- **Format:** WebP hoặc JPEG (quality 80%)
- **Kích thước:** 720x1000px, target < 200KB
- **Lazy load:** Chỉ load khi game init

#### 1.3. Button Icons
- **Format:** SVG (scalable, nhẹ) hoặc PNG 80x80px
- **Total size:** < 50KB cho tất cả icons

#### 1.4. Image Preloading
```javascript
async function preloadAssets() {
    const images = {
        background: 'assets/background.jpg',
        avatarIdle: 'assets/avatar/idle/sprite.png',
        avatarShower: 'assets/avatar/shower/sprite.png',
        // ... các sprite sheets khác
    };
    
    // Load parallel
    const promises = Object.entries(images).map(([key, path]) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ key, img });
            img.onerror = reject;
            img.src = path;
        });
    });
    
    return Promise.all(promises);
}
```

---

### **2. ANIMATION OPTIMIZATION**

#### 2.1. Frame Rate Control
- **Target FPS:** 30 FPS (đủ mượt cho pet game)
- **Frame skip:** Nếu device chậm, skip frames
```javascript
let lastFrameTime = 0;
const TARGET_FPS = 30;
const FRAME_DURATION = 1000 / TARGET_FPS;

function gameLoop(currentTime) {
    if (currentTime - lastFrameTime >= FRAME_DURATION) {
        updateAnimation();
        render();
        lastFrameTime = currentTime;
    }
    requestAnimationFrame(gameLoop);
}
```

#### 2.2. Sprite Caching
- Cache rendered frames vào offscreen canvas
- Chỉ re-render khi frame thay đổi
```javascript
const frameCache = new Map();

function getCachedFrame(spriteSheet, frameIndex) {
    const key = `${spriteSheet.src}_${frameIndex}`;
    if (!frameCache.has(key)) {
        // Render frame vào offscreen canvas và cache
        const canvas = document.createElement('canvas');
        // ... render logic
        frameCache.set(key, canvas);
    }
    return frameCache.get(key);
}
```

#### 2.3. Dirty Rectangle Rendering
- Chỉ render phần thay đổi (avatar area)
- Background chỉ render 1 lần, cache lại

---

### **3. AUDIO OPTIMIZATION**

#### 3.1. Audio Format
- **Format:** WAV (chất lượng) hoặc OGG (nhẹ hơn)
- **Duration:** Mỗi sound < 2 giây
- **Total size:** < 200KB cho tất cả sounds

#### 3.2. Audio Preloading
```javascript
const audioCache = new Map();

async function preloadAudio() {
    const sounds = ['shower.wav', 'sing.wav', 'fly.wav', 'drink.wav'];
    const promises = sounds.map(name => {
        return new Promise((resolve) => {
            const audio = new Audio(`assets/sounds/${name}`);
            audio.preload = 'auto';
            audio.oncanplaythrough = () => resolve({ name, audio });
            audio.load();
        });
    });
    return Promise.all(promises);
}
```

#### 3.3. Audio Pooling
- Reuse Audio objects thay vì tạo mới mỗi lần
```javascript
const audioPool = {
    shower: [],
    sing: [],
    // ...
};

function playSound(type) {
    let audio = audioPool[type].find(a => a.paused);
    if (!audio) {
        audio = new Audio(`assets/sounds/${type}.wav`);
        audioPool[type].push(audio);
    }
    audio.currentTime = 0;
    audio.play();
}
```

---

### **4. MEMORY OPTIMIZATION**

#### 4.1. Asset Cleanup
- Unload assets không dùng
- Clear frame cache khi chuyển action

#### 4.2. Garbage Collection
- Tránh tạo object mới trong game loop
- Reuse objects (particles, buttons, etc.)

---

### **5. MOBILE OPTIMIZATION**

#### 5.1. Touch Events
- Sử dụng `touchstart`, `touchend` thay vì `click` trên mobile
- Prevent default để tránh double-tap zoom

#### 5.2. Performance Monitoring
```javascript
let frameCount = 0;
let lastFPS = 0;

function updateFPS() {
    frameCount++;
    if (frameCount % 60 === 0) {
        lastFPS = frameCount;
        frameCount = 0;
        console.log(`FPS: ${lastFPS}`);
    }
}
```

#### 5.3. Adaptive Quality
- Giảm frame rate trên device yếu
- Skip một số frames nếu FPS < 20

---

### **6. LOADING OPTIMIZATION**

#### 6.1. Progressive Loading
1. Load background trước (hiển thị ngay)
2. Load avatar idle animation (hiển thị ngay)
3. Load buttons (hiển thị ngay)
4. Load các animation khác (background)
5. Load sounds (background)

#### 6.2. Loading Screen
- Hiển thị progress bar
- Show "Loading assets..." message

---

## 🎯 CHECKLIST IMPLEMENTATION

### **Step 1: Setup (30 phút)**
- [ ] Tạo cấu trúc thư mục
- [ ] Tạo `index.html` với canvas 720x1000px
- [ ] Tạo `config.js` với template ID
- [ ] Tạo `game.js` với basic structure
- [ ] Tạo `style.css`

### **Step 2: Core Game (2 giờ)**
- [ ] Load background image
- [ ] Load avatar sprite sheets
- [ ] Implement animation system
- [ ] Implement button rendering
- [ ] Implement click/touch detection

### **Step 3: Actions (2 giờ)**
- [ ] Implement shower action
- [ ] Implement sing action
- [ ] Implement fly action
- [ ] Implement drink action
- [ ] Add sound effects

### **Step 4: Integration (1 giờ)**
- [ ] Add vào template registry
- [ ] Implement sort logic (always first)
- [ ] Create editor adapter
- [ ] Test trong hệ thống

### **Step 5: Optimization (1 giờ)**
- [ ] Optimize images (WebP, compression)
- [ ] Implement frame caching
- [ ] Optimize audio loading
- [ ] Test performance trên mobile

---

## 📊 ESTIMATED PERFORMANCE TARGETS

- **Initial Load:** < 2 giây
- **FPS:** 30 FPS stable
- **Memory:** < 100MB
- **Total Assets:** < 2MB
- **Frame Time:** < 33ms per frame

---

## 🚨 POTENTIAL ISSUES & SOLUTIONS

### **Issue 1: Lag khi chuyển animation**
- **Solution:** Preload tất cả sprite sheets, cache frames

### **Issue 2: Sound delay trên mobile**
- **Solution:** Preload audio, sử dụng Web Audio API

### **Issue 3: Memory leak**
- **Solution:** Cleanup listeners, clear caches khi không dùng

### **Issue 4: Game không hiện đầu tiên**
- **Solution:** Check sort logic trong `app-v3.js` và `app-telegram.js`

---

## 📝 NOTES

- Game này là **interactive pet**, không phải game có điểm số
- Focus vào **smooth animation** và **responsive interaction**
- Có thể thêm **idle animations** (nháy mắt, cử động nhẹ) khi không có action
- Có thể thêm **particle effects** (nước khi tắm, nhạc notes khi hát, etc.)



