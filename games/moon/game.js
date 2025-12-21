// ============================================
// MOON ROCKET - MemePlay Game Template
// ============================================

// ==================== IMPORT CONFIG ====================
import { 
    BRAND_CONFIG, 
    loadBrandConfig, 
    getEffectiveLogoUrl,
    getGameId,
    TEMPLATE_ID
} from './config.js';
import { getSupabaseClient } from '../templates-v2/core/supabase-client.js';

// ==================== DOM ELEMENTS ====================
let canvas, ctx;
let startScreen, gameoverScreen, restartBtn, finalScoreEl, storyTextEl, gameoverLogoEl;
let scoreEl, timerEl, livesEl;

// ==================== GAME CONSTANTS ====================
const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 1000;
const EARTH_X = 360;
const EARTH_Y = 900;
const EARTH_RADIUS = 120; // Hitbox radius = 120px
const EARTH_DISPLAY_RADIUS = 192; // Kích thước hiển thị = 192px (giữ nguyên)
const ROCKET_SPEED = 520; // pixels per second (cố định)
const INITIAL_LIVES = 3;
const TIMER_DURATION = 10; // seconds
const INITIAL_MOON_DISTANCE = 450;
const INITIAL_MOON_SCALE = 0.45;
const INITIAL_EARTH_ROTATION_SPEED = 1.2;
const MOON_BASE_RADIUS = 240; // Base radius cho kích thước hiển thị = 240px (giữ nguyên)

// ==================== MAGIC NUMBERS ====================
const MOON_VISIBILITY_THRESHOLD = 0.4; // 40% = hiển thị ít nhất 60% diện tích
const MOON_ELLIPSE_Y_RATIO = 0.7; // Tỷ lệ bán kính dọc của quỹ đạo elip
const MOON_HITBOX_RADIUS = 66; // Hitbox radius của mặt trăng
const ROCKET_HITBOX_MULTIPLIER = 0.65; // Multiplier cho rocket hitbox (giảm 35% = còn 65%)

// ==================== DEBUG ====================
const SHOW_HITBOX = true; // Hiển thị hitbox để debug

// ==================== GAME STATE ====================
let gameState = 'start'; // start, playing, gameover
let score = 0;
let level = 1;
let lives = INITIAL_LIVES;
let timer = TIMER_DURATION;
let timerInterval = null;

// ==================== EARTH ====================
let earth = {
    x: EARTH_X,
    y: EARTH_Y,
    baseX: EARTH_X, // Vị trí center của quỹ đạo
    baseY: EARTH_Y, // Vị trí center của quỹ đạo
    radius: EARTH_RADIUS,
    rotation: 0,
    rotationSpeed: INITIAL_EARTH_ROTATION_SPEED,
    orbitAngle: 0,
    orbitSpeed: 0.1, // Tốc độ di chuyển Trái Đất
    orbitRadius: 50 // Bán kính quỹ đạo di chuyển
};

// ==================== MOON ====================
let moon = {
    x: EARTH_X,
    y: EARTH_Y - INITIAL_MOON_DISTANCE,
    scale: INITIAL_MOON_SCALE,
    orbitAngle: 0,
    orbitSpeed: 0,
    orbitRadius: 0,
    rotation: 0, // Rotation quanh tâm của chính nó
    rotationSpeed: 0.05 // Tốc độ xoay Mặt Trăng
};

// ==================== ROCKET ====================
let rocket = {
    x: EARTH_X,
    y: EARTH_Y - EARTH_RADIUS,
    angle: 0,
    speed: ROCKET_SPEED,
    active: false,
    vx: 0,
    vy: 0,
    width: 87,  // 79 * 1.1 = 86.9 ≈ 87 (tăng bề ngang thêm 10%)
    height: 138  // 120 * 1.15 = 138 (kéo dài thêm 15%)
};

// ==================== PARTICLES ====================
let particles = [];

// ==================== POWER-UPS ====================
let powerUps = [];
const POWER_UP_TYPES = {
    EXTRA_TIME: 'extra_time',
    SLOW_MOON: 'slow_moon',
    BIGGER_TARGET: 'bigger_target'
};

// ==================== ASSETS ====================
let bgImage = null;
let earthImage = null;
let moonImage = null;
let rocketImage = null;
let logoImage = null;

// ==================== AUDIO ====================
let successSound = null;
let failSound = null;

// ==================== HELPER FUNCTIONS ====================
function getLogoUrlWithCacheBuster(url) {
    if (url.startsWith('data:')) {
        return url;
    }
    return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
}

// ==================== LOAD ASSETS ====================
function loadAssets() {
    return new Promise((resolve) => {
        let loaded = 0;
        const total = 5; // bgImage, earthImage, moonImage, rocketImage, logoImage
        
        // Load background
        bgImage = new Image();
        bgImage.onload = () => {
            loaded++;
            if (loaded === total) resolve();
        };
        bgImage.onerror = () => {
            console.warn('Failed to load bg_stars');
            loaded++;
            if (loaded === total) resolve();
        };
        bgImage.src = 'assets/bg_stars (1).jpg';
        
        // Load Earth
        earthImage = new Image();
        earthImage.onload = () => {
            loaded++;
            if (loaded === total) resolve();
        };
        earthImage.onerror = () => {
            console.warn('Failed to load earth');
            loaded++;
            if (loaded === total) resolve();
        };
        earthImage.src = 'assets/1download.webp';
        
        // Load Moon
        moonImage = new Image();
        moonImage.onload = () => {
            loaded++;
            if (loaded === total) resolve();
        };
        moonImage.onerror = () => {
            console.warn('Failed to load moon');
            loaded++;
            if (loaded === total) resolve();
        };
        moonImage.src = 'assets/moon.png';
        
        // Load Rocket
        rocketImage = new Image();
        rocketImage.onload = () => {
            loaded++;
            if (loaded === total) resolve();
        };
        rocketImage.onerror = () => {
            console.warn('Failed to load rocket');
            loaded++;
            if (loaded === total) resolve();
        };
        rocketImage.src = 'assets/rocket.webp';
        
        // Load Logo
        const logoUrl = getEffectiveLogoUrl();
        logoImage = new Image();
        logoImage.onload = () => {
            loaded++;
            if (loaded === total) resolve();
        };
        logoImage.onerror = () => {
            console.warn('Failed to load logo');
            loaded++;
            if (loaded === total) resolve();
        };
        logoImage.src = getLogoUrlWithCacheBuster(logoUrl);
    });
}

// ==================== LOAD AUDIO ====================
function loadAudio() {
    return new Promise((resolve) => {
        let loaded = 0;
        const total = 2;
        
        successSound = new Audio('assets/rocket_success.wav');
        successSound.oncanplaythrough = () => {
            loaded++;
            if (loaded === total) resolve();
        };
        successSound.onerror = () => {
            console.warn('Failed to load success sound');
            loaded++;
            if (loaded === total) resolve();
        };
        
        failSound = new Audio('assets/rocket_fail_oh_oh.wav');
        failSound.oncanplaythrough = () => {
            loaded++;
            if (loaded === total) resolve();
        };
        failSound.onerror = () => {
            console.warn('Failed to load fail sound');
            loaded++;
            if (loaded === total) resolve();
        };
    });
}

// ==================== INITIALIZE ====================
async function init() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    
    startScreen = document.getElementById('start-screen');
    gameoverScreen = document.getElementById('gameover-screen');
    restartBtn = document.getElementById('restart-btn');
    finalScoreEl = document.getElementById('final-score');
    storyTextEl = document.getElementById('story-text');
    gameoverLogoEl = document.getElementById('gameover-logo');
    scoreEl = document.getElementById('score');
    timerEl = document.getElementById('timer');
    livesEl = document.getElementById('lives');
    
    // Load brand config
    const gameId = getGameId();
    if (gameId) {
        loadBrandConfig(gameId);
    } else {
        loadBrandConfig();
    }
    
    // Update story text
    if (storyTextEl) {
        storyTextEl.textContent = BRAND_CONFIG.storyText || 'MEMEPLAY';
    }
    
    // Update logo
    if (gameoverLogoEl) {
        const logoUrl = getEffectiveLogoUrl();
        gameoverLogoEl.src = getLogoUrlWithCacheBuster(logoUrl);
    }
    
    // Load assets
    await loadAssets();
    await loadAudio();
    
    // Event listeners - Canvas click handler (xử lý cả start và playing state)
    canvas.addEventListener('click', (e) => {
        if (gameState === 'start') {
            e.preventDefault();
            startGame();
        } else if (gameState === 'playing') {
            handleClick(e);
        }
    });
    
    canvas.addEventListener('touchstart', (e) => {
        if (gameState === 'start') {
            e.preventDefault();
            startGame();
        } else if (gameState === 'playing') {
            handleClick(e);
        }
    });
    
    if (restartBtn) {
        restartBtn.addEventListener('click', restart);
    }
    
    // Start screen click - hỗ trợ cả click và touch
    if (startScreen) {
        const handleStartClick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            startGame();
        };
        
        startScreen.addEventListener('click', handleStartClick);
        startScreen.addEventListener('touchstart', handleStartClick);
        startScreen.addEventListener('pointerdown', handleStartClick);
    }
    
    // Initial render
    render();
    
    // Send GAME_READY message
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
            type: 'GAME_READY', 
            gameId: gameId || TEMPLATE_ID
        }, '*');
    }
}

// ==================== START GAME ====================
function startGame() {
    if (gameState === 'playing') return;
    
    gameState = 'playing';
    score = 0;
    level = 1;
    lives = INITIAL_LIVES;
    timer = TIMER_DURATION;
    
    // Reset positions
    earth.rotation = 0;
    earth.rotationSpeed = INITIAL_EARTH_ROTATION_SPEED;
    earth.orbitAngle = 0;
    moon.scale = INITIAL_MOON_SCALE;
    moon.orbitAngle = Math.random() * Math.PI * 2; // Góc bắt đầu ngẫu nhiên 0-360°
    moon.orbitSpeed = 0;
    moon.orbitRadius = 0;
    moon.rotation = 0;
    rocket.active = false;
    particles = [];
    powerUps = [];
    
    // Random vị trí trái đất và mặt trăng ngay từ level 1
    randomizeEarthPosition();
    resetMoonPosition();
    
    // Hide start screen
    if (startScreen) {
        startScreen.classList.remove('active');
        startScreen.style.display = 'none';
    }
    if (gameoverScreen) {
        gameoverScreen.classList.remove('active');
        gameoverScreen.style.display = 'none';
    }
    
    // Start timer
    startTimer();
    
    // Update HUD
    updateHUD();
    
    // Send GAME_START message
    const gameId = getGameId() || TEMPLATE_ID;
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
            type: 'GAME_START', 
            gameId: gameId
        }, '*');
    }
}

// ==================== START TIMER ====================
function startTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        timer -= 1;
        updateHUD();
        
        if (timer <= 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            missShot();
        }
    }, 1000);
}

// ==================== RESTART ====================
function restart() {
    if (gameoverScreen) {
        gameoverScreen.classList.remove('active');
        gameoverScreen.style.display = 'none';
    }
    startGame();
}

// ==================== HANDLE CLICK ====================
function handleClick(e) {
    if (gameState !== 'playing') return;
    if (rocket.active) return;
    
    e.preventDefault();
    launchRocket();
}

// ==================== LAUNCH ROCKET ====================
function launchRocket() {
    // Calculate rocket position on Earth surface - sát hơn 40px
    const earthAngle = earth.rotation;
    const rocketDistance = EARTH_RADIUS - 40; // Sát hơn 40px
    rocket.x = earth.x + Math.cos(earthAngle) * rocketDistance;
    rocket.y = earth.y + Math.sin(earthAngle) * rocketDistance;
    
    // Rocket rotation = earthAngle + π/2 (luôn hướng ra ngoài)
    rocket.angle = earthAngle + Math.PI / 2;
    rocket.active = true;
    
    // Tính hướng phóng: vuông góc với bề mặt (tiếp tuyến)
    // angle = rocketSprite.rotation - Math.PI / 2
    const launchAngle = rocket.angle - Math.PI / 2;
    
    // Velocity theo công thức: cos/sin * 520 px/s
    rocket.vx = Math.cos(launchAngle) * (rocket.speed / 60);
    rocket.vy = Math.sin(launchAngle) * (rocket.speed / 60);
}

// ==================== RESET MOON POSITION ====================
function resetMoonPosition() {
    // Reset vị trí mặt trăng ngẫu nhiên với khoảng cách initialMoonDistance từ Trái Đất
    const initialMoonDistance = INITIAL_MOON_DISTANCE + (level - 1) * 15;
    // Góc ngẫu nhiên 0-360° để đặt mặt trăng ở vị trí ngẫu nhiên quanh trái đất
    const randomAngle = Math.random() * Math.PI * 2;
    moon.x = earth.baseX + Math.cos(randomAngle) * initialMoonDistance;
    moon.y = earth.baseY + Math.sin(randomAngle) * initialMoonDistance;
    moon.orbitAngle = Math.random() * Math.PI * 2; // Góc quỹ đạo bắt đầu ngẫu nhiên (cho level 3+)
    moon.orbitSpeed = 0;
    moon.orbitRadius = 0;
}

// ==================== RANDOMIZE EARTH POSITION ====================
function randomizeEarthPosition() {
    // Random vị trí center mới cho quỹ đạo Trái Đất ở khắp màn hình gaming
    // Vị trí có thể ở bất kỳ đâu trong màn hình, tránh ra ngoài khi di chuyển
    const margin = EARTH_RADIUS + earth.orbitRadius + 30;
    const minX = margin;
    const maxX = CANVAS_WIDTH - margin;
    const minY = margin + 100; // Tránh quá cao (để lại chỗ cho HUD)
    const maxY = CANVAS_HEIGHT - margin;
    
    // Random vị trí center mới ở khắp màn hình
    earth.baseX = minX + Math.random() * (maxX - minX);
    earth.baseY = minY + Math.random() * (maxY - minY);
    
    // Reset orbit angle và vị trí hiện tại của Trái Đất về baseX, baseY
    earth.orbitAngle = 0;
    earth.x = earth.baseX;
    earth.y = earth.baseY;
}

// ==================== UPDATE EARTH ====================
function updateEarth(deltaTime) {
    // Calculate rotation speed based on level
    const baseSpeed = INITIAL_EARTH_ROTATION_SPEED;
    const speedMultiplier = 1 + (level - 1) * 0.05;
    earth.rotationSpeed = baseSpeed * speedMultiplier;
    
    // Xoay Trái Đất
    earth.rotation += earth.rotationSpeed * (deltaTime / 1000);
    
    // Di chuyển Trái Đất theo quỹ đạo (quanh baseX, baseY)
    earth.orbitAngle += earth.orbitSpeed * (deltaTime / 1000);
    earth.x = earth.baseX + Math.cos(earth.orbitAngle) * earth.orbitRadius;
    earth.y = earth.baseY + Math.sin(earth.orbitAngle) * earth.orbitRadius;
}

// ==================== UPDATE MOON ====================
function updateMoon(deltaTime) {
    // Xoay Mặt Trăng quanh tâm của chính nó
    moon.rotation += moon.rotationSpeed * (deltaTime / 1000);
    
    // Calculate distance based on level: 450 + (level × 15)
    const initialMoonDistance = INITIAL_MOON_DISTANCE + (level - 1) * 15;
    
    // Calculate scale: 0.45 - (floor(level/5) × 0.05), tối thiểu 0.2
    const scaleReduction = Math.floor((level - 1) / 5) * 0.05;
    moon.scale = Math.max(0.2, INITIAL_MOON_SCALE - scaleReduction);
    
    // Tính bán kính hiển thị của Mặt Trăng
    const moonDisplayRadius = (moon.scale * MOON_BASE_RADIUS * 2) / 2;
    
    // Ràng buộc: Clamp màn hình - đảm bảo ít nhất 60% Mặt Trăng hiển thị (ƯU TIÊN ĐẦU TIÊN)
    // Tâm Mặt Trăng có thể di chuyển từ -40% radius (hiển thị 60%) đến +100% radius (hiển thị 100%)
    const minX = -moonDisplayRadius * MOON_VISIBILITY_THRESHOLD;
    const maxX = CANVAS_WIDTH - moonDisplayRadius * MOON_VISIBILITY_THRESHOLD;
    const minY = -moonDisplayRadius * MOON_VISIBILITY_THRESHOLD;
    const maxY = CANVAS_HEIGHT - moonDisplayRadius * MOON_VISIBILITY_THRESHOLD;
    
    // Level 1-2: Mặt Trăng đứng yên (chỉ xoay, không di chuyển)
    if (level <= 2) {
        // Áp dụng ràng buộc 60% hiển thị (ưu tiên đầu tiên) cho Level 1-2
        moon.x = Math.max(minX, Math.min(maxX, moon.x));
        moon.y = Math.max(minY, Math.min(maxY, moon.y));
        // Không di chuyển, chỉ xoay quanh trục
        return;
    }
    
    // Level 3+: Mặt Trăng bắt đầu bay quanh Trái Đất
    
    // Tốc độ quỹ đạo: 0.3 + (level - 3) × 0.05 rad/s
    if (moon.orbitSpeed === 0) {
        moon.orbitSpeed = 0.3 + (level - 3) * 0.05;
    }
    
    // Bán kính quỹ đạo: initialMoonDistance + 30
    moon.orbitRadius = initialMoonDistance + 30;
    
    // Quỹ đạo hình elip: sử dụng 2 bán kính khác nhau (elip ngang)
    const ellipseRadiusX = moon.orbitRadius; // Bán kính ngang
    const ellipseRadiusY = moon.orbitRadius * MOON_ELLIPSE_Y_RATIO; // Bán kính dọc
    
    // Cập nhật góc quỹ đạo
    moon.orbitAngle += moon.orbitSpeed * (deltaTime / 1000);
    
    // Vị trí Mặt Trăng theo quỹ đạo elip (quanh Trái Đất)
    moon.x = earth.x + Math.cos(moon.orbitAngle) * ellipseRadiusX;
    moon.y = earth.y + Math.sin(moon.orbitAngle) * ellipseRadiusY;
    
    // Áp dụng ràng buộc 60% hiển thị TRƯỚC (ưu tiên cao nhất - điều kiện đầu tiên)
    moon.x = Math.max(minX, Math.min(maxX, moon.x));
    moon.y = Math.max(minY, Math.min(maxY, moon.y));
    
    // Ràng buộc: Khoảng cách tối thiểu đến Trái Đất = initialMoonDistance
    // Chỉ áp dụng nếu không vi phạm 60% visibility (ưu tiên 60% visibility là cao nhất)
    const dx = moon.x - earth.x;
    const dy = moon.y - earth.y;
    const distanceFromEarthSquared = dx * dx + dy * dy;
    const minDistanceSquared = initialMoonDistance * initialMoonDistance;
    if (distanceFromEarthSquared < minDistanceSquared) {
        const distanceFromEarth = Math.sqrt(distanceFromEarthSquared);
        const angle = Math.atan2(dy, dx);
        // Tính vị trí mới với initialMoonDistance
        const newX = earth.x + Math.cos(angle) * initialMoonDistance;
        const newY = earth.y + Math.sin(angle) * initialMoonDistance;
        
        // Chỉ áp dụng nếu vị trí mới vẫn thỏa mãn 60% hiển thị
        // (ưu tiên điều kiện 60% visibility hơn khoảng cách tối thiểu - đây là điều kiện ưu tiên đầu tiên)
        if (newX >= minX && newX <= maxX && newY >= minY && newY <= maxY) {
            moon.x = newX;
            moon.y = newY;
        }
        // Nếu không thỏa mãn 60% visibility, giữ nguyên vị trí đã đảm bảo 60% 
        // (ưu tiên 60% visibility là điều kiện ưu tiên đầu tiên, cao hơn khoảng cách tối thiểu)
    }
}

// ==================== UPDATE ROCKET ====================
function updateRocket(deltaTime) {
    if (!rocket.active) return;
    
    // Tính deltaTime multiplier một lần
    const dt = deltaTime / 16;
    
    // Move rocket
    rocket.x += rocket.vx * dt;
    rocket.y += rocket.vy * dt;
    
    // Check if rocket is off screen
    if (rocket.x < -100 || rocket.x > CANVAS_WIDTH + 100 || 
        rocket.y < -100 || rocket.y > CANVAS_HEIGHT + 100) {
        rocket.active = false;
        missShot();
        return;
    }
    
    // Check collision with moon (sử dụng distance squared để tránh sqrt)
    const collisionRadius = MOON_HITBOX_RADIUS;
    const collisionRadiusSquared = collisionRadius * collisionRadius;
    
    const dx = rocket.x - moon.x;
    const dy = rocket.y - moon.y;
    const distanceSquared = dx * dx + dy * dy;
    
    // Debug: Log collision info (đã tắt để giảm log)
    // if (SHOW_HITBOX && distanceSquared < (collisionRadius + 50) * (collisionRadius + 50)) {
    //     const distance = Math.sqrt(distanceSquared);
    //     const moonDisplayRadius = (moon.scale * MOON_BASE_RADIUS * 2) / 2;
    //     console.log(`Distance: ${distance.toFixed(1)}, Collision Radius: ${collisionRadius.toFixed(1)}, Moon R: ${moonDisplayRadius.toFixed(1)}`);
    // }
    
    if (distanceSquared < collisionRadiusSquared) {
        hitMoon();
    }
}

// ==================== HIT MOON ====================
function hitMoon() {
    rocket.active = false;
    
    // Create explosion particles
    createExplosion(moon.x, moon.y);
    
    // Play success sound
    if (successSound) {
        successSound.currentTime = 0;
        successSound.play().catch(() => {});
    }
    
    // Increase score and level
    score += 1;
    level += 1;
    timer = TIMER_DURATION;
    
    // Đổi vị trí ngẫu nhiên cho Trái Đất và reset mặt trăng sau mỗi level
    randomizeEarthPosition();
    resetMoonPosition();
    
    // Restart timer
    startTimer();
    
    // Spawn power-up randomly (20% chance)
    if (Math.random() < 0.2) {
        spawnPowerUp();
    }
    
    // Update HUD
    updateHUD();
    
    // Send score update
    const gameId = getGameId() || TEMPLATE_ID;
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
            type: 'SCORE_UPDATE', 
            gameId: gameId,
            score: score
        }, '*');
    }
}

// ==================== MISS SHOT ====================
function missShot() {
    rocket.active = false;
    
    // Play fail sound
    if (failSound) {
        failSound.currentTime = 0;
        failSound.play().catch(() => {});
    }
    
    // Lose a life
    lives -= 1;
    
    if (lives <= 0) {
        gameOver();
    } else {
        // Reset timer về 10s
        timer = TIMER_DURATION;
        
        // Random vị trí Trái Đất mới và reset mặt trăng
        randomizeEarthPosition();
        resetMoonPosition();
        
        // Restart timer
        startTimer();
        updateHUD();
    }
}

// ==================== CREATE EXPLOSION ====================
function createExplosion(x, y) {
    const particleCount = 50; // Tăng số lượng particle
    const colors = ['#FFD700', '#FF8C00', '#FF4500', '#FF0000', '#FFFF00', '#FFFFFF'];
    
    for (let i = 0; i < particleCount; i++) {
        const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
        const speed = 3 + Math.random() * 6;
        const colorIndex = Math.floor(Math.random() * colors.length);
        
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 1.0,
            decay: 0.015 + Math.random() * 0.025,
            size: 4 + Math.random() * 8,
            color: colors[colorIndex],
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.3
        });
    }
}

// ==================== UPDATE PARTICLES ====================
function updateParticles(deltaTime) {
    // Tính deltaTime multiplier một lần
    const dt = deltaTime / 16;
    
    // Update explosion particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        
        // Di chuyển particle
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        
        // Thêm gravity nhẹ
        p.vy += 0.1 * dt;
        
        // Xoay particle
        if (p.rotation !== undefined) {
            p.rotation += p.rotationSpeed * dt;
        }
        
        // Giảm life
        p.life -= p.decay;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
    
}

// ==================== SPAWN POWER-UP ====================
function spawnPowerUp() {
    const types = Object.values(POWER_UP_TYPES);
    const type = types[Math.floor(Math.random() * types.length)];
    
    powerUps.push({
        x: moon.x + (Math.random() - 0.5) * 200,
        y: moon.y + (Math.random() - 0.5) * 200,
        type: type,
        life: 5.0, // 5 seconds
        size: 20
    });
}

// ==================== UPDATE POWER-UPS ====================
function updatePowerUps(deltaTime) {
    for (let i = powerUps.length - 1; i >= 0; i--) {
        const pu = powerUps[i];
        pu.life -= deltaTime / 1000;
        
        if (pu.life <= 0) {
            powerUps.splice(i, 1);
            continue;
        }
        
        // Check collision with rocket (sử dụng distance squared để tránh sqrt)
        if (rocket.active) {
            const dx = rocket.x - pu.x;
            const dy = rocket.y - pu.y;
            const distanceSquared = dx * dx + dy * dy;
            const rocketHitboxRadius = (rocket.width / 2) * ROCKET_HITBOX_MULTIPLIER;
            const collisionDistance = pu.size + rocketHitboxRadius;
            const collisionDistanceSquared = collisionDistance * collisionDistance;
            
            if (distanceSquared < collisionDistanceSquared) {
                applyPowerUp(pu.type);
                powerUps.splice(i, 1);
            }
        }
    }
}

// ==================== APPLY POWER-UP ====================
function applyPowerUp(type) {
    switch (type) {
        case POWER_UP_TYPES.EXTRA_TIME:
            timer += 5;
            break;
        case POWER_UP_TYPES.SLOW_MOON:
            moon.orbitSpeed *= 0.5;
            earth.rotationSpeed *= 0.5;
            setTimeout(() => {
                moon.orbitSpeed /= 0.5;
                earth.rotationSpeed /= 0.5;
            }, 5000);
            break;
        case POWER_UP_TYPES.BIGGER_TARGET:
            moon.scale *= 1.5;
            setTimeout(() => {
                moon.scale /= 1.5;
            }, 5000);
            break;
    }
}

// ==================== UPDATE HUD ====================
function updateHUD() {
    if (scoreEl) {
        scoreEl.textContent = score;
    }
    if (timerEl) {
        timerEl.textContent = Math.ceil(timer);
    }
    if (livesEl) {
        let hearts = '';
        for (let i = 0; i < lives; i++) {
            hearts += '❤️';
        }
        livesEl.textContent = hearts;
    }
}

// ==================== GAME OVER ====================
function gameOver() {
    gameState = 'gameover';
    
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    
    if (finalScoreEl) {
        finalScoreEl.textContent = score;
    }
    
    if (gameoverScreen) {
        gameoverScreen.classList.add('active');
        gameoverScreen.style.display = 'flex';
    }
    
    // Send GAME_OVER message
    const gameId = getGameId() || TEMPLATE_ID;
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
            type: 'GAME_OVER', 
            gameId: gameId,
            score: score,
            level: level
        }, '*');
    }
}

// ==================== RENDER ====================
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background
    if (bgImage && bgImage.complete) {
        ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        ctx.fillStyle = '#000011';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    // Luôn render game để hiển thị đằng sau start screen
    if (gameState === 'playing' || gameState === 'start') {
        // Draw Earth - Sử dụng hình ảnh (hình tròn)
        ctx.save();
        ctx.translate(earth.x, earth.y);
        ctx.rotate(earth.rotation);
        
        // Tạo clipping path hình tròn với kích thước hiển thị (giữ nguyên)
        ctx.beginPath();
        ctx.arc(0, 0, EARTH_DISPLAY_RADIUS, 0, Math.PI * 2);
        ctx.clip();
        
        if (earthImage && earthImage.complete && earthImage.naturalWidth > 0) {
            // Tính toán để giữ tỷ lệ và vừa khít với kích thước hiển thị
            const imgAspect = earthImage.naturalWidth / earthImage.naturalHeight;
            const earthDiameter = EARTH_DISPLAY_RADIUS * 2;
            let drawWidth, drawHeight, offsetX, offsetY;
            
            if (imgAspect > 1) {
                // Hình ảnh ngang hơn: căn theo chiều rộng, chiều cao sẽ nhỏ hơn
                drawWidth = earthDiameter;
                drawHeight = earthDiameter / imgAspect;
                offsetX = -EARTH_DISPLAY_RADIUS;
                offsetY = -drawHeight / 2;
            } else {
                // Hình ảnh dọc hơn hoặc vuông: căn theo chiều cao, chiều rộng sẽ nhỏ hơn
                drawHeight = earthDiameter;
                drawWidth = earthDiameter * imgAspect;
                offsetX = -drawWidth / 2;
                offsetY = -EARTH_DISPLAY_RADIUS;
            }
            
            // Vẽ hình ảnh với tỷ lệ đúng, vừa khít với kích thước hiển thị
            ctx.drawImage(earthImage, offsetX, offsetY, drawWidth, drawHeight);
        } else {
            // Fallback: Vẽ Earth bằng gradient hình tròn với kích thước hiển thị
            const earthGradient = ctx.createRadialGradient(0, -EARTH_DISPLAY_RADIUS * 0.3, 0, 0, 0, EARTH_DISPLAY_RADIUS);
            earthGradient.addColorStop(0, '#6BB6FF');
            earthGradient.addColorStop(0.7, '#4A90E2');
            earthGradient.addColorStop(1, '#2E5C8A');
            ctx.fillStyle = earthGradient;
            ctx.beginPath();
            ctx.arc(0, 0, EARTH_DISPLAY_RADIUS, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1E3A5F';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.restore(); // Restore clipping
        ctx.save(); // Save lại để vẽ hitbox
        ctx.translate(earth.x, earth.y);
        ctx.rotate(earth.rotation);
        
        // Hiển thị hitbox Earth
        if (SHOW_HITBOX) {
            // Vẽ hitbox Earth (màu đỏ)
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, EARTH_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Vẽ text thông tin Earth
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText(`Earth R: ${EARTH_RADIUS}`, 0, -EARTH_RADIUS - 15);
            ctx.fillText(`Earth R: ${EARTH_RADIUS}`, 0, -EARTH_RADIUS - 15);
        }
        
        ctx.restore();
        
        // Draw Moon - Sử dụng hình ảnh (hình tròn)
        ctx.save();
        ctx.translate(moon.x, moon.y);
        
        // Xoay Mặt Trăng quanh tâm của chính nó
        ctx.rotate(moon.rotation);
        
        // Tính kích thước Moon sau khi scale (moonScale × 300 / 2)
        const moonDisplayRadius = (moon.scale * MOON_BASE_RADIUS * 2) / 2;
        
        // Tạo clipping path hình tròn với kích thước đúng bằng hitbox
        ctx.beginPath();
        ctx.arc(0, 0, moonDisplayRadius, 0, Math.PI * 2);
        ctx.clip();
        
        if (moonImage && moonImage.complete && moonImage.naturalWidth > 0) {
            // Tính toán để giữ tỷ lệ và vừa khít với hitbox
            const imgAspect = moonImage.naturalWidth / moonImage.naturalHeight;
            const moonDiameter = moonDisplayRadius * 2;
            let drawWidth, drawHeight, offsetX, offsetY;
            
            if (imgAspect > 1) {
                // Hình ảnh ngang hơn: căn theo chiều rộng, chiều cao sẽ nhỏ hơn
                drawWidth = moonDiameter;
                drawHeight = moonDiameter / imgAspect;
                offsetX = -moonDisplayRadius;
                offsetY = -drawHeight / 2;
            } else {
                // Hình ảnh dọc hơn hoặc vuông: căn theo chiều cao, chiều rộng sẽ nhỏ hơn
                drawHeight = moonDiameter;
                drawWidth = moonDiameter * imgAspect;
                offsetX = -drawWidth / 2;
                offsetY = -moonDisplayRadius;
            }
            
            // Vẽ hình ảnh với tỷ lệ đúng, vừa khít với kích thước hiển thị
            ctx.drawImage(moonImage, offsetX, offsetY, drawWidth, drawHeight);
        } else {
            // Fallback: Vẽ Moon bằng gradient hình tròn
            const moonGradient = ctx.createRadialGradient(-moonDisplayRadius * 0.3, -moonDisplayRadius * 0.3, 0, 0, 0, moonDisplayRadius);
            moonGradient.addColorStop(0, '#F5F5F5');
            moonGradient.addColorStop(0.7, '#CCCCCC');
            moonGradient.addColorStop(1, '#999999');
            ctx.fillStyle = moonGradient;
            ctx.beginPath();
            ctx.arc(0, 0, moonDisplayRadius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        
        ctx.restore(); // Restore clipping
        ctx.save(); // Save lại để vẽ border và hitbox
        ctx.translate(moon.x, moon.y);
        ctx.rotate(moon.rotation);
        
        // Draw logo BNB trên mặt trăng
        if (logoImage && logoImage.complete) {
            const logoSize = moonDisplayRadius * 0.6;
            ctx.drawImage(logoImage, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
        }
        
        // Hiển thị hitbox Moon
        if (SHOW_HITBOX) {
            // Hitbox Moon (màu xanh lá)
            const moonHitboxRadius = MOON_HITBOX_RADIUS;
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(0, 0, moonHitboxRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
            
            // Vẽ text hiển thị thông tin
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 3;
            ctx.strokeText(`Moon Hitbox R: ${moonHitboxRadius} | Display R: ${moonDisplayRadius.toFixed(1)}`, 0, -moonDisplayRadius - 10);
            ctx.fillText(`Moon Hitbox R: ${moonHitboxRadius} | Display R: ${moonDisplayRadius.toFixed(1)}`, 0, -moonDisplayRadius - 10);
        }
        
        ctx.restore();
        
        // Draw rocket on Earth (if not active)
        // Rocket rotation = earthAngle + π/2 (luôn hướng ra ngoài)
        if (!rocket.active) {
            ctx.save();
            ctx.translate(earth.x, earth.y);
            ctx.rotate(earth.rotation + Math.PI / 2);
            const rocketDistance = EARTH_RADIUS - 40; // Sát hơn 40px
            ctx.translate(0, -rocketDistance);
            if (rocketImage && rocketImage.complete) {
                ctx.drawImage(rocketImage, -rocket.width / 2, -rocket.height, rocket.width, rocket.height);
            } else {
                ctx.fillStyle = '#FF4444';
                ctx.fillRect(-rocket.width / 2, -rocket.height, rocket.width, rocket.height);
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(-rocket.width / 2, -rocket.height, rocket.width, rocket.height * 0.3);
            }
            ctx.restore();
        }
        
        // Draw active rocket
        if (rocket.active) {
            ctx.save();
            ctx.translate(rocket.x, rocket.y);
            ctx.rotate(rocket.angle);
            if (rocketImage && rocketImage.complete) {
                ctx.drawImage(rocketImage, -rocket.width / 2, -rocket.height, rocket.width, rocket.height);
            } else {
                // Vẽ rocket đơn giản
                ctx.fillStyle = '#FF4444';
                ctx.fillRect(-rocket.width / 2, -rocket.height, rocket.width, rocket.height);
                ctx.fillStyle = '#FF0000';
                ctx.fillRect(-rocket.width / 2, -rocket.height, rocket.width, rocket.height * 0.3);
            }
            
            // Hiển thị hitbox rocket (giảm 35%, còn 65%)
            if (SHOW_HITBOX) {
                ctx.strokeStyle = '#FFFF00';
                ctx.lineWidth = 2;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                const rocketHitboxRadius = (rocket.width / 2) * ROCKET_HITBOX_MULTIPLIER;
                ctx.arc(0, 0, rocketHitboxRadius, 0, Math.PI * 2);
                ctx.stroke();
                ctx.setLineDash([]);
            }
            ctx.restore();
        }
        
        // Draw particles với hiệu ứng tốt hơn
        particles.forEach(p => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
            ctx.translate(p.x, p.y);
            
            if (p.rotation !== undefined) {
                ctx.rotate(p.rotation);
            }
            
            // Vẽ particle với gradient
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
            gradient.addColorStop(0, p.color);
            gradient.addColorStop(0.7, p.color);
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(0, 0, p.size, 0, Math.PI * 2);
            ctx.fill();
            
            // Vẽ viền sáng
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 1;
            ctx.globalAlpha = Math.max(0, Math.min(0.5, p.life * 0.5));
            ctx.stroke();
            
            ctx.restore();
        });
        
        // Draw power-ups
        powerUps.forEach(pu => {
            ctx.save();
            ctx.globalAlpha = 0.7 + Math.sin(Date.now() / 200) * 0.3;
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(pu.x, pu.y, pu.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.restore();
        });
    }
    
    requestAnimationFrame(render);
}

// ==================== GAME LOOP ====================
let lastTime = performance.now();

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    if (gameState === 'playing' || gameState === 'start') {
        updateEarth(deltaTime);
        updateMoon(deltaTime);
        if (gameState === 'playing') {
            updateRocket(deltaTime);
        }
        updateParticles(deltaTime);
        updatePowerUps(deltaTime);
    }
    
    requestAnimationFrame(gameLoop);
}

// ==================== INITIALIZE ON LOAD ====================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        init().then(() => {
            gameLoop(performance.now());
        });
    });
} else {
    init().then(() => {
        gameLoop(performance.now());
    });
}

