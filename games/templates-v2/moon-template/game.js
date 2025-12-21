// ============================================
// MOON ROCKET - MemePlay Game Template
// ============================================

// ==================== IMPORT CONFIG ====================
import { 
    BRAND_CONFIG, 
    loadBrandConfig, 
    getEffectiveLogoUrl,
    getGameId,
    getLogoUrlWithCacheBuster,
    TEMPLATE_ID
} from './config.js';
import { getSupabaseClient } from '../core/supabase-client.js';

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
const SHOW_HITBOX = false; // Hiển thị hitbox để debug (disabled in production)

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

// ==================== ASSETS ====================
let bgImage = null;
let earthImage = null;
let moonImage = null;
let rocketImage = null;
let logoImage = null;

// ==================== AUDIO ====================
let successSound = null;
let failSound = null;

// ==================== STARS ====================
let stars = [];
const STAR_COUNT = 100;

function initStars() {
    stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * CANVAS_WIDTH,
            y: Math.random() * CANVAS_HEIGHT,
            size: 1 + Math.random() * 2,
            opacity: 0.3 + Math.random() * 0.4
        });
    }
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
        bgImage.src = './assets/bg_stars (1).jpg';
        
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
        earthImage.src = './assets/1download.webp';
        
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
        moonImage.src = './assets/moon.png';
        
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
        rocketImage.src = './assets/rocket.webp';
        
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
        
        successSound = new Audio('./assets/rocket_success.wav');
        successSound.oncanplaythrough = () => {
            loaded++;
            if (loaded === total) resolve();
        };
        successSound.onerror = () => {
            console.warn('Failed to load success sound');
            loaded++;
            if (loaded === total) resolve();
        };
        
        failSound = new Audio('./assets/rocket_fail_oh_oh.wav');
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

// ==================== CONFIG LOADING ====================
function initGameConfig() {
    return new Promise(async (resolve) => {
        let gameId = getGameId();
        
        // Load config từ playtest nếu không có gameId trong URL
        if (!gameId) {
            const playtestKey = 'moon_brand_config_playtest';
            const playtestConfig = localStorage.getItem(playtestKey);
            if (playtestConfig) {
                try {
                    const parsed = JSON.parse(playtestConfig);
                    Object.assign(BRAND_CONFIG, parsed);
                } catch (e) {
                    console.warn('[Moon] Failed to parse playtest config:', e);
                }
            }
        } else {
            const hasLocalConfig = loadBrandConfig(gameId);
            
            if (!hasLocalConfig && gameId) {
                await loadBrandConfigFromSupabase(gameId);
            }
        }
        
        // Update UI với config
        updateUIWithConfig();
        
        resolve();
    });
}

async function loadBrandConfigFromSupabase(gameId) {
    try {
        const supabase = await getSupabaseClient();
        if (!supabase) return false;
        
        const { data, error } = await supabase
            .from('user_created_games')
            .select('*')
            .eq('game_id', gameId)
            .single();
        
        if (error || !data) return false;
        
        // Map Supabase fields to BRAND_CONFIG
        if (data.fragment_logo_url || data.logo_url) {
            BRAND_CONFIG.logoUrl = data.fragment_logo_url || data.logo_url || '';
        }
        if (data.story_one || data.story_text || data.storyText) {
            BRAND_CONFIG.storyText = data.story_one || data.story_text || data.storyText || 'MEMEPLAY';
        }
        if (data.map_color || data.mapColor) {
            BRAND_CONFIG.mapColor = data.map_color || data.mapColor || '#1a0a2e';
        }
        
        return true;
    } catch (err) {
        console.warn('[Moon] Failed to load from Supabase:', err);
        return false;
    }
}

function updateUIWithConfig() {
    // Update story text
    if (storyTextEl) {
        storyTextEl.textContent = BRAND_CONFIG.storyText || 'MEMEPLAY';
    }
    
    // Update logo trong game over screen
    if (gameoverLogoEl) {
        const logoUrl = getEffectiveLogoUrl();
        gameoverLogoEl.src = getLogoUrlWithCacheBuster(logoUrl);
        gameoverLogoEl.onerror = () => {
            console.warn('[Moon] Failed to load gameover logo');
        };
    }
    
    // Reload logo cho moon (sẽ được load trong loadAssets)
    reloadLogo();
}

function reloadLogo() {
    const newLogoUrl = getEffectiveLogoUrl();
    
    // Reload logo image cho moon (nếu đã có logoImage variable)
    if (typeof logoImage !== 'undefined') {
        logoImage = new Image();
        logoImage.onload = () => {
            // Logo reloaded
        };
        logoImage.onerror = () => {
            console.warn('[Moon] Failed to reload logo for moon');
        };
        logoImage.src = getLogoUrlWithCacheBuster(newLogoUrl);
    }
    
    // Reload logo trong game over screen
    if (gameoverLogoEl) {
        gameoverLogoEl.src = getLogoUrlWithCacheBuster(newLogoUrl);
    }
}

// ==================== INITIALIZE ====================
// ✅ PHƯƠNG ÁN 2: Không dùng async function - dùng .then() chain như knife-fix template
// Đây là pattern đã WORK trên mobile
function initSetup() {
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
    
    // Event listeners - Đơn giản như knife-fix template (đây là code đã WORK trên mobile)
    if (startScreen) {
        startScreen.addEventListener('click', handleInput);
        startScreen.addEventListener('touchstart', (e) => {
            e.preventDefault();
            handleInput(e);
        }, { passive: false });
    }
    
    canvas.addEventListener('click', handleInput);
    canvas.addEventListener('touchstart', handleInput, { passive: false });
    
    if (restartBtn) {
        restartBtn.addEventListener('click', restart);
    }
    
    // Init stars cho background
    initStars();
    
    // Send MOON_GAME_READY message
    const gameId = getGameId();
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
            type: 'MOON_GAME_READY',
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

// ==================== HANDLE INPUT ====================
function handleInput(e) {
    if (e) e.preventDefault();
    
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'playing') {
        if (!rocket.active) {
            launchRocket();
        }
    }
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
    
    // ✅ BẮT BUỘC: Gửi GAME_OVER với gameId
    const gameId = getGameId() || TEMPLATE_ID;
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
            type: 'GAME_OVER',
            gameId: gameId
        }, '*');
        
        // ✅ BẮT BUỘC: Gửi GAME_SCORE để lưu điểm và thưởng
        window.parent.postMessage({ 
            type: 'GAME_SCORE',
            gameId: gameId,
            score: score,
            level: level || 1
        }, '*');
    }
}

// ==================== RENDER ====================
function render() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw background với map color từ config + stars
    const mapColor = BRAND_CONFIG.mapColor || '#1a0a2e';
    ctx.fillStyle = mapColor;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Draw stars
    ctx.fillStyle = '#ffffff';
    stars.forEach(star => {
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0; // Reset alpha
    
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
        
        // Draw logo trên mặt trăng (từ config) - 30% increase từ 0.6 = 0.78
        if (logoImage && logoImage.complete && !logoImage.error && logoImage.naturalWidth > 0) {
            try {
                const logoSize = moonDisplayRadius * 0.78; // 30% increase từ 0.6
                ctx.drawImage(logoImage, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
            } catch (e) {
                console.warn('[Moon] Failed to draw logo on moon:', e);
                // Fallback: vẽ hình tròn màu vàng
                ctx.fillStyle = '#F4D03F';
                ctx.beginPath();
                ctx.arc(0, 0, moonDisplayRadius * 0.3, 0, Math.PI * 2);
                ctx.fill();
            }
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
    }
    
    // ✅ PHƯƠNG ÁN 1: Xóa render loop riêng - render() sẽ được gọi từ gameLoop()
    // Không gọi requestAnimationFrame(render) nữa
}

// ==================== GAME LOOP ====================
let lastTime = performance.now();

function gameLoop(currentTime) {
    const deltaTime = currentTime - lastTime;
    lastTime = currentTime;
    
    // Update game logic
    if (gameState === 'playing' || gameState === 'start') {
        updateEarth(deltaTime);
        updateMoon(deltaTime);
        if (gameState === 'playing') {
            updateRocket(deltaTime);
        }
        updateParticles(deltaTime);
    }
    
    // Render
    render();
    
    requestAnimationFrame(gameLoop);
}

// ==================== UPDATE CONFIG LISTENER ====================
// Listen for config updates from editor
window.addEventListener('message', (event) => {
    if (event.data.type === 'UPDATE_CONFIG') {
        const config = event.data.config || {};
        
        // Update BRAND_CONFIG
        if (config.logoUrl !== undefined) BRAND_CONFIG.logoUrl = config.logoUrl;
        if (config.storyText !== undefined) BRAND_CONFIG.storyText = config.storyText;
        if (config.mapColor !== undefined) BRAND_CONFIG.mapColor = config.mapColor;
        
        // Reload logo nếu thay đổi
        if (config.logoUrl !== undefined) {
            reloadLogo();
        }
        
        // Re-render nếu map color thay đổi (cần re-init stars)
        if (config.mapColor !== undefined) {
            initStars(); // Re-init stars
            render(); // Trigger re-render
        }
        
        // Update UI
        updateUIWithConfig();
        
        // Config updated
    }
});

// ==================== INITIALIZE ON LOAD ====================

// ✅ PHƯƠNG ÁN 2: Pattern giống hệt knife-fix template (đã WORK trên mobile)
// Không dùng async function init(), mà dùng .then() chain trực tiếp
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('[Moon] Canvas not found!');
        return;
    }
    
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Setup DOM elements và event listeners
    initSetup();
    
    // Setup screens
    if (gameoverScreen) {
        gameoverScreen.style.display = 'none';
        gameoverScreen.classList.remove('active');
    }
    
    if (startScreen) {
        startScreen.classList.add('active');
        startScreen.style.display = 'flex';
    }
    
    // ✅ PATTERN GIỐNG KNIFE-FIX: .then() chain trực tiếp (không dùng async/await)
    initGameConfig().then(() => {
        loadAssets().then(() => {
            loadAudio();
            // ✅ CRITICAL: Start gameLoop ngay sau khi load xong (giống knife-fix)
            gameLoop(performance.now());
        });
    });
});

