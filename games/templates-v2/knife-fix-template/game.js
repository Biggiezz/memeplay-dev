// ============================================
// KNIFE FIX - MemePlay Game Template
// ============================================

// ==================== IMPORT CONFIG ====================
import { 
    BRAND_CONFIG, 
    loadBrandConfig, 
    getEffectiveLogoUrl,
    getGameId,
    TEMPLATE_ID
} from './config.js';
import { getSupabaseClient } from '../core/supabase-client.js';

// ==================== DOM ELEMENTS ====================
let canvas, ctx;
let startScreen, gameoverScreen, restartBtn, finalScoreEl, storyTextEl, gameoverLogoEl;

// ==================== GAME CONSTANTS ====================
const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 1000;
const CAKE_X = 360;
const CAKE_RADIUS = 103.5;
const CAKE_Y = 200 + CAKE_RADIUS;
const KNIFE_START_Y = CANVAS_HEIGHT - 80;
const KNIFE_WIDTH = 100;
const KNIFE_HEIGHT = 238;
const KNIFE_SPEED = 10.8;
const ANGLE_THRESHOLD = 0.048; // Giảm 50% để tăng độ khó (từ 5.5° xuống 2.75°)
const INITIAL_KNIVES = 3;

// ==================== GAME STATE ====================
let gameState = 'start'; // start, playing, gameover
let score = 0;
let level = 1;
let knivesLeft = INITIAL_KNIVES;
let totalKnives = INITIAL_KNIVES;
let combo = 0;

// ==================== CAKE ====================
let cake = {
    x: CAKE_X,
    y: CAKE_Y,
    radius: CAKE_RADIUS,
    rotation: 0,
    rotationSpeed: 0.0375,
    direction: 1,
    shakeX: 0,
    shakeY: 0,
    shakeTimer: 0,
    changingDirection: false,
    directionTimer: 0,
    maxDirectionTime: 1000 + Math.random() * 3000,
    slowingDown: false
};

// ==================== KNIVES ====================
let knives = [];
let flyingKnife = null;
let waitingKnife = {
    x: CAKE_X,
    y: KNIFE_START_Y,
    angle: 0
};

// ==================== PARTICLES ====================
let particles = [];

// ==================== ASSETS ====================
let bgImage = null;
let knifeImage = null;
let cakeImage = null; // Cake gốc (hình bánh)
let logoImage = null; // Logo upload (đè lên cake)

// ==================== AUDIO ====================
let hitSound = null;
let failSound = null;
let sliceSound = null;

// ==================== CACHE ====================
let cachedCakeImageSize = null;

// ==================== LOAD ASSETS ====================
function loadAssets() {
    return new Promise((resolve) => {
        let loaded = 0;
        const total = 4; // bgImage, cakeImage, logoImage, knifeImage
        
        const checkLoaded = () => {
            loaded++;
            if (loaded === total) resolve();
        };
        
        // Background
        bgImage = new Image();
        bgImage.onload = checkLoaded;
        bgImage.onerror = checkLoaded;
        bgImage.src = './assets/bg.webp';
        
        // Cake image - hình bánh gốc (giữ nguyên)
        cakeImage = new Image();
        cakeImage.onload = () => {
            cachedCakeImageSize = null; // Clear cache
            checkLoaded();
        };
        cakeImage.onerror = (err) => {
            console.error('[Knife Fix] Cake image failed to load:', err);
            checkLoaded();
        };
        cakeImage.src = './assets/cake-logo.png';
        
        // Logo image - logo upload (đè lên cake)
        logoImage = new Image();
        const logoUrl = getEffectiveLogoUrl();
        const getLogoUrlWithCacheBuster = (url) => {
            if (url.startsWith('data:')) {
                return url; // Data URLs don't need cache buster
            }
            return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
        };
        logoImage.onload = () => {
            checkLoaded();
        };
        logoImage.onerror = (err) => {
            // Silent fail - will use default logo
            checkLoaded();
        };
        logoImage.src = getLogoUrlWithCacheBuster(logoUrl);
        
        // Knife
        knifeImage = new Image();
        knifeImage.onload = checkLoaded;
        knifeImage.onerror = checkLoaded;
        knifeImage.src = './assets/knife.png';
    });
}

// ==================== LOAD AUDIO ====================
function loadAudio() {
    hitSound = new Audio('./assets/hit.wav');
    failSound = new Audio('./assets/fail.wav');
    sliceSound = new Audio('./assets/slice.wav');
    
    hitSound.volume = 0.5;
    failSound.volume = 0.5;
    sliceSound.volume = 0.3;
}

// ==================== RELOAD LOGO ====================
function reloadLogo() {
    const logoUrl = getEffectiveLogoUrl();
    
    // Helper to add cache buster (only for non-data URLs)
    const getLogoUrlWithCacheBuster = (url) => {
        if (url.startsWith('data:')) {
            return url; // Data URLs don't need cache buster
        }
        return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
    };
    
    // Reload logo image (logo đè lên cake)
    if (logoImage) {
        logoImage.onerror = null; // Clear previous error handler
        logoImage.src = getLogoUrlWithCacheBuster(logoUrl);
    } else {
        // If logoImage doesn't exist yet, create it
        logoImage = new Image();
        logoImage.onerror = null; // Silent fail
        logoImage.src = getLogoUrlWithCacheBuster(logoUrl);
    }
    
    // Reload game over logo
    if (gameoverLogoEl) {
        gameoverLogoEl.onerror = null; // Clear previous error handler
        gameoverLogoEl.src = getLogoUrlWithCacheBuster(logoUrl);
    }
}

// ==================== INITIALIZE GAME ====================
function initGame() {
    gameState = 'playing';
    score = 0;
    level = 1;
    knivesLeft = INITIAL_KNIVES;
    totalKnives = INITIAL_KNIVES;
    combo = 0;
    knives = [];
    flyingKnife = null;
    particles = [];
    cake.rotation = 0;
    cake.rotationSpeed = 0.0375;
    cake.direction = 1;
    cake.directionTimer = 0;
    cake.slowingDown = false;
    cake.changingDirection = false;
    
    waitingKnife.x = CAKE_X;
    waitingKnife.y = KNIFE_START_Y;
    waitingKnife.angle = 0;
    
    if (startScreen) {
        startScreen.classList.remove('active');
        startScreen.style.display = 'none';
    }
    if (gameoverScreen) {
        gameoverScreen.classList.remove('active');
        gameoverScreen.style.display = 'none';
    }
    
    // Send GAME_START message
    const gameId = getGameId() || TEMPLATE_ID;
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
            type: 'GAME_START', 
            gameId: gameId
        }, '*');
    }
}

// ==================== UPDATE CAKE ====================
function updateCake(deltaTime) {
    const minSpeed = 0.01;
    if (cake.rotationSpeed < minSpeed) {
        cake.rotationSpeed = minSpeed;
    }
    
    cake.directionTimer += deltaTime;
    
    if (cake.directionTimer >= cake.maxDirectionTime && !cake.slowingDown && !cake.changingDirection) {
        cake.slowingDown = true;
        cake.directionTimer = cake.maxDirectionTime;
    }
    
    if (cake.slowingDown) {
        const slowDownTime = 500;
        const elapsed = cake.directionTimer - cake.maxDirectionTime;
        
        if (elapsed < slowDownTime) {
            const targetSpeed = minSpeed;
            cake.rotationSpeed = cake.rotationSpeed * 0.95 + targetSpeed * 0.05;
            
            if (cake.rotationSpeed < minSpeed) {
                cake.rotationSpeed = minSpeed;
            }
        } else {
            cake.slowingDown = false;
            cake.changingDirection = true;
            cake.direction *= -1;
            cake.directionTimer = 0;
            cake.maxDirectionTime = 1000 + Math.random() * 3000;
            
            const newSpeed = (0.5 + Math.random() * 3) * 0.025;
            cake.rotationSpeed = newSpeed;
            cake.changingDirection = false;
        }
    }
    
    if (!cake.slowingDown && Math.random() < 0.01) {
        const newSpeed = (0.5 + Math.random() * 3) * 0.025;
        cake.rotationSpeed = cake.rotationSpeed * 0.8 + newSpeed * 0.2;
        
        if (cake.rotationSpeed < minSpeed) {
            cake.rotationSpeed = minSpeed;
        }
    }
    
    cake.rotation += cake.rotationSpeed * cake.direction * (deltaTime / 16);
    
    if (cake.shakeTimer > 0) {
        cake.shakeTimer -= deltaTime;
        cake.shakeX = (Math.random() - 0.5) * 4;
        cake.shakeY = (Math.random() - 0.5) * 4;
    } else {
        cake.shakeX = 0;
        cake.shakeY = 0;
    }
}

// ==================== THROW KNIFE ====================
function throwKnife() {
    if (flyingKnife || knivesLeft <= 0 || totalKnives <= 0 || gameState !== 'playing') return;
    
    flyingKnife = {
        x: waitingKnife.x,
        y: waitingKnife.y,
        angle: 0,
        stuck: false
    };
    
    knivesLeft--;
    totalKnives--;
}

// ==================== UPDATE FLYING KNIFE ====================
function updateFlyingKnife(deltaTime) {
    if (!flyingKnife) return;
    
    if (flyingKnife.stuck) return;
    
    const prevY = flyingKnife.y;
    const moveDistance = KNIFE_SPEED * (deltaTime / 16);
    
    flyingKnife.y -= moveDistance;
    
    if (flyingKnife.y < -KNIFE_HEIGHT - 50) {
        flyingKnife = null;
        if (knivesLeft === 0 || totalKnives === 0) {
            setTimeout(() => {
                levelUp();
            }, 500);
        }
        return;
    }
    
    const cakeX = cake.x + cake.shakeX;
    const cakeY = cake.y + cake.shakeY;
    
    const checkPoints = Math.max(3, Math.ceil(moveDistance / 2));
    let hitDistance = null;
    let hitAngle = null;
    
    for (let i = 0; i <= checkPoints; i++) {
        const checkY = prevY - (moveDistance * i / checkPoints);
        const dx = flyingKnife.x - cakeX;
        const dy = checkY - cakeY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        const edgeDistance = CAKE_RADIUS - 5;
        if (distance <= CAKE_RADIUS && distance >= edgeDistance) {
            hitDistance = distance;
            hitAngle = Math.atan2(dy, dx);
            flyingKnife.y = checkY;
            break;
        }
    }
    
    if (hitDistance !== null) {
        const normalizedAngle = ((hitAngle - cake.rotation) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        
        // Kiểm tra collision với các dao đã cắm TRƯỚC KHI cắm dao mới
        let collision = false;
        for (let i = 0; i < knives.length; i++) {
            const angleDiff = Math.abs(normalizedAngle - knives[i].angle);
            const minDiff = Math.min(angleDiff, Math.PI * 2 - angleDiff);
            
            if (minDiff < ANGLE_THRESHOLD) {
                collision = true;
                break;
            }
        }
        
        if (collision) {
            // Dao chạm dao → BỊ NẢY RA NGOÀI, KHÔNG CẮM VÀO BÁNH
            flyingKnife.bouncing = true;
            flyingKnife.vx = (Math.random() - 0.5) * 5;
            flyingKnife.vy = 2;
            flyingKnife.rotationSpeed = (Math.random() - 0.5) * 0.3;
            
            // Điều chỉnh vị trí để dao bị đẩy ra ngoài một chút
            const bounceAngle = hitAngle + Math.PI; // Đẩy ngược lại
            flyingKnife.x = cakeX + Math.cos(bounceAngle) * (CAKE_RADIUS + 10);
            flyingKnife.y = cakeY + Math.sin(bounceAngle) * (CAKE_RADIUS + 10);
            
            if (failSound) {
                failSound.currentTime = 0;
                failSound.play().catch(() => {});
            }
            
            if (navigator.vibrate) {
                navigator.vibrate(200);
            }
            
            combo = 0;
            
            // Game over sau 1 giây khi dao chạm dao
            setTimeout(() => {
                if (gameState === 'playing') {
                    gameOver();
                }
            }, 1000);
            
            // QUAN TRỌNG: Return ngay để KHÔNG cắm dao vào bánh
            return;
        } else {
            knives.push({
                angle: normalizedAngle,
                distance: CAKE_RADIUS,
                rotation: 0
            });
            
            const comboMultiplier = Math.min(Math.floor(combo / 5) + 1, 5);
            score += comboMultiplier;
            combo++;
            
            if (combo % 5 === 0 && sliceSound) {
                sliceSound.currentTime = 0;
                sliceSound.play().catch(() => {});
            }
            
            createParticles(cake.x + cake.shakeX, cake.y + cake.shakeY);
            
            cake.shakeTimer = 200;
            
            if (hitSound) {
                hitSound.currentTime = 0;
                hitSound.play().catch(() => {});
            }
            
            flyingKnife = null;
            
            if (knivesLeft === 0 || totalKnives === 0) {
                setTimeout(() => {
                    levelUp();
                }, 500);
            } else {
                waitingKnife.x = CAKE_X;
                waitingKnife.y = KNIFE_START_Y;
            }
            
            return;
        }
    }
    
    if (flyingKnife && flyingKnife.bouncing) {
        flyingKnife.x += flyingKnife.vx * (deltaTime / 16);
        flyingKnife.y += flyingKnife.vy * (deltaTime / 16);
        flyingKnife.angle += flyingKnife.rotationSpeed * (deltaTime / 16);
        flyingKnife.vy += 0.3 * (deltaTime / 16);
        
        if (flyingKnife.y > CANVAS_HEIGHT + 100) {
            flyingKnife = null;
        }
    }
}

// ==================== PARTICLES ====================
function createParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 30,
            maxLife: 30,
            color: Math.random() > 0.5 ? '#ffd700' : '#ff8c00'
        });
    }
}

function updateParticles(deltaTime) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * (deltaTime / 16);
        p.y += p.vy * (deltaTime / 16);
        p.life -= deltaTime / 16;
        
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

// ==================== LEVEL UP ====================
function levelUp() {
    level++;
    knivesLeft = INITIAL_KNIVES + Math.floor(score / 3);
    totalKnives = knivesLeft;
    knives = [];
    flyingKnife = null;
    particles = [];
    combo = 0;
    
    cake.rotation = 0;
    cake.rotationSpeed = (0.5 + Math.random() * 3) * 0.025;
    cake.direction = Math.random() > 0.5 ? 1 : -1;
    cake.directionTimer = 0;
    cake.slowingDown = false;
    cake.changingDirection = false;
    
    cachedCakeImageSize = null;
    
    waitingKnife.x = CAKE_X;
    waitingKnife.y = KNIFE_START_Y;
}

// ==================== GAME OVER ====================
function gameOver() {
    gameState = 'gameover';
    
    if (finalScoreEl) {
        finalScoreEl.textContent = score;
    }
    
    // Update story text from config
    if (storyTextEl) {
        storyTextEl.textContent = BRAND_CONFIG.storyText || 'MEMEPLAY';
    }
    
    // Update game over logo from config
    if (gameoverLogoEl) {
        const logoUrl = getEffectiveLogoUrl();
        const getLogoUrlWithCacheBuster = (url) => {
            if (url.startsWith('data:')) {
                return url; // Data URLs don't need cache buster
            }
            return url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();
        };
        gameoverLogoEl.onerror = null; // Clear previous error handler
        gameoverLogoEl.src = getLogoUrlWithCacheBuster(logoUrl);
    }
    
    if (gameoverScreen) {
        gameoverScreen.style.display = 'flex';
        gameoverScreen.classList.add('active');
    }
    
    // Send GAME_OVER and GAME_SCORE messages
    const gameId = getGameId() || TEMPLATE_ID;
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
            type: 'GAME_OVER',
            gameId: gameId,
            score: score
        }, '*');
        
        window.parent.postMessage({ 
            type: 'GAME_SCORE',
            gameId: gameId,
            score: score
        }, '*');
    }
}

// ==================== RESTART GAME ====================
function restartGame() {
    gameState = 'start';
    
    if (gameoverScreen) {
        gameoverScreen.classList.remove('active');
        gameoverScreen.style.display = 'none';
    }
    
    if (startScreen) {
        startScreen.classList.remove('hidden');
        startScreen.classList.add('active');
        startScreen.style.display = 'flex';
    }
}

// ==================== CALCULATE CAKE IMAGE SIZE ====================
function calculateCakeImageSize(diameter) {
    if (!cakeImage || !cakeImage.complete || cakeImage.naturalWidth === 0) {
        return null;
    }
    
    if (cachedCakeImageSize && cachedCakeImageSize.diameter === diameter) {
        return cachedCakeImageSize;
    }
    
    const imageAspect = cakeImage.naturalWidth / cakeImage.naturalHeight;
    let drawWidth = diameter;
    let drawHeight = diameter;
    
    if (imageAspect > 1) {
        drawWidth = diameter;
        drawHeight = diameter / imageAspect;
    } else {
        drawHeight = diameter;
        drawWidth = diameter * imageAspect;
    }
    
    const maxDimension = Math.max(drawWidth, drawHeight);
    const scale = diameter / maxDimension;
    drawWidth *= scale;
    drawHeight *= scale;
    
    drawWidth *= 2.1;
    drawHeight *= 2.1;
    
    cachedCakeImageSize = { diameter, drawWidth, drawHeight };
    return cachedCakeImageSize;
}

// ==================== DRAW FUNCTIONS ====================
function drawBackground() {
    if (bgImage && bgImage.complete) {
        ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        ctx.fillStyle = BRAND_CONFIG.mapColor || '#87ceeb';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}

function drawCake() {
    ctx.save();
    ctx.translate(cake.x + cake.shakeX, cake.y + cake.shakeY);
    ctx.rotate(cake.rotation);
    
    const radius = CAKE_RADIUS;
    const diameter = radius * 2;
    
    // Vẽ cake gốc trước (hình bánh)
    const imageSize = calculateCakeImageSize(diameter);
    
    if (imageSize && cakeImage && cakeImage.complete) {
        try {
            ctx.drawImage(
                cakeImage,
                -imageSize.drawWidth / 2, -imageSize.drawHeight / 2, 
                imageSize.drawWidth, imageSize.drawHeight
            );
        } catch (e) {
            console.error('[Knife Fix] Error drawing cake image:', e);
            // Fallback: vẽ bánh bằng màu nâu
            const cakeColor = '#8B4513';
            ctx.fillStyle = cakeColor;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // Fallback: vẽ bánh bằng màu nâu nếu không có ảnh
        const cakeColor = '#8B4513';
        ctx.fillStyle = cakeColor;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Vẽ logo đè lên cake ở tâm (nếu có logo upload)
    if (logoImage && logoImage.complete && BRAND_CONFIG.logoUrl && BRAND_CONFIG.logoUrl.trim() !== '') {
        try {
            // Logo size: 120% của cake radius (x2 từ 60%)
            const logoSize = radius * 1.2;
            const logoAspect = logoImage.naturalWidth / logoImage.naturalHeight;
            let logoWidth = logoSize;
            let logoHeight = logoSize;
            
            // Maintain aspect ratio
            if (logoAspect > 1) {
                logoWidth = logoSize;
                logoHeight = logoSize / logoAspect;
            } else {
                logoHeight = logoSize;
                logoWidth = logoSize * logoAspect;
            }
            
            // Đảm bảo logo được vẽ đúng tâm (0, 0) sau khi đã translate và rotate
            // Vẽ logo với tọa độ chính xác ở tâm
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(
                logoImage,
                0, 0, logoImage.naturalWidth, logoImage.naturalHeight, // Source
                -logoWidth / 2, -logoHeight / 2, // Destination position (tâm)
                logoWidth, logoHeight // Destination size
            );
        } catch (e) {
            // Silent fail - logo may not be loaded yet
        }
    }
    
    ctx.restore();
}

function drawStuckKnives() {
    if (!knifeImage || !knifeImage.complete) return;
    
    const bladeLength = 175;
    const handleLength = KNIFE_HEIGHT - bladeLength;
    
    for (let i = 0; i < knives.length; i++) {
        const knife = knives[i];
        const angle = knife.angle + cake.rotation;
        
        const anchorX = cake.x + cake.shakeX + Math.cos(angle) * CAKE_RADIUS;
        const anchorY = cake.y + cake.shakeY + Math.sin(angle) * CAKE_RADIUS;
        
        ctx.save();
        
        ctx.translate(anchorX, anchorY);
        ctx.rotate(angle - Math.PI / 2);
        
        const offsetY = -bladeLength + 50;
        ctx.drawImage(
            knifeImage,
            0, 0, knifeImage.width, knifeImage.height,
            -KNIFE_WIDTH / 2, offsetY, KNIFE_WIDTH, KNIFE_HEIGHT
        );
        
        ctx.restore();
    }
}

function drawCakeTop() {
    ctx.save();
    ctx.translate(cake.x + cake.shakeX, cake.y + cake.shakeY);
    ctx.rotate(cake.rotation);
    
    const radius = CAKE_RADIUS * 0.98;
    const diameter = CAKE_RADIUS * 2;
    
    // Vẽ cake gốc trước (hình bánh)
    const imageSize = calculateCakeImageSize(diameter);
    
    if (imageSize && cakeImage && cakeImage.complete) {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
            cakeImage,
            -imageSize.drawWidth / 2, -imageSize.drawHeight / 2, 
            imageSize.drawWidth, imageSize.drawHeight
        );
    } else {
        // Fallback: vẽ bánh bằng màu nâu
        const cakeColor = '#8B4513';
        ctx.fillStyle = cakeColor;
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Vẽ logo đè lên cake ở tâm (nếu có logo upload)
    if (logoImage && logoImage.complete && BRAND_CONFIG.logoUrl && BRAND_CONFIG.logoUrl.trim() !== '') {
        try {
            // Logo size: 120% của cake radius (x2 từ 60%)
            const logoSize = radius * 1.2;
            const logoAspect = logoImage.naturalWidth / logoImage.naturalHeight;
            let logoWidth = logoSize;
            let logoHeight = logoSize;
            
            // Maintain aspect ratio
            if (logoAspect > 1) {
                logoWidth = logoSize;
                logoHeight = logoSize / logoAspect;
            } else {
                logoHeight = logoSize;
                logoWidth = logoSize * logoAspect;
            }
            
            // Đảm bảo logo được vẽ đúng tâm (0, 0) sau khi đã translate và rotate
            // Vẽ logo với tọa độ chính xác ở tâm
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(
                logoImage,
                0, 0, logoImage.naturalWidth, logoImage.naturalHeight, // Source
                -logoWidth / 2, -logoHeight / 2, // Destination position (tâm)
                logoWidth, logoHeight // Destination size
            );
        } catch (e) {
            // Silent fail - logo may not be loaded yet
        }
    }
    
    ctx.restore();
}

function drawFlyingKnife() {
    if (!flyingKnife || !knifeImage || !knifeImage.complete) return;
    
    ctx.save();
    ctx.translate(flyingKnife.x, flyingKnife.y);
    ctx.rotate(flyingKnife.angle);
    
    if (flyingKnife.bouncing) {
        ctx.rotate(flyingKnife.rotation || 0);
    }
    
    ctx.drawImage(knifeImage, -KNIFE_WIDTH / 2, -KNIFE_HEIGHT / 2, KNIFE_WIDTH, KNIFE_HEIGHT);
    ctx.restore();
}

function drawWaitingKnife() {
    if (flyingKnife || knivesLeft <= 0 || totalKnives <= 0 || !knifeImage || !knifeImage.complete) return;
    
    ctx.save();
    ctx.translate(waitingKnife.x, waitingKnife.y);
    ctx.drawImage(knifeImage, -KNIFE_WIDTH / 2, -KNIFE_HEIGHT / 2, KNIFE_WIDTH, KNIFE_HEIGHT);
    ctx.restore();
}

function drawParticles() {
    for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const alpha = p.life / p.maxLife;
        
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

function drawUI() {
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
    gradient.addColorStop(0, '#20b2aa');
    gradient.addColorStop(1, '#48d1cc');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, 80);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('👑 ' + score, 20, 50);
    
    ctx.textAlign = 'right';
    ctx.fillText('⭐ ' + level, CANVAS_WIDTH - 20, 50);
    
    ctx.fillStyle = 'white';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('🔪 ' + knivesLeft, 20, CANVAS_HEIGHT - 30);
}

// ==================== GAME LOOP ====================
function gameLoop() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    if (gameState === 'playing') {
        const deltaTime = 16;
        updateCake(deltaTime);
        updateFlyingKnife(deltaTime);
        updateParticles(deltaTime);
        
        for (let i = 0; i < knives.length; i++) {
            knives[i].rotation = cake.rotation;
        }
    }
    
    drawBackground();
    drawCake();
    drawStuckKnives();
    drawCakeTop();
    drawFlyingKnife();
    drawWaitingKnife();
    drawParticles();
    drawUI();
    
    requestAnimationFrame(gameLoop);
}

// ==================== INPUT HANDLER ====================
function handleInput(e) {
    if (e) e.preventDefault();
    
    if (gameState === 'start') {
        initGame();
    } else if (gameState === 'playing' && !flyingKnife && knivesLeft > 0) {
        throwKnife();
    }
}

// ==================== CONFIG LOADING ====================
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
        
        if (data.fragment_logo_url) BRAND_CONFIG.logoUrl = data.fragment_logo_url;
        if (data.story_one) BRAND_CONFIG.storyText = data.story_one;
        if (data.map_color) BRAND_CONFIG.mapColor = data.map_color;
        
        reloadLogo();
        return true;
    } catch (err) {
        // Silent fail
        return false;
    }
}

async function initGameConfig() {
    let gameId = getGameId();
    
    if (!gameId) {
        // Load from playtest key
        const playtestKey = 'knife_fix_brand_config_playtest-knife-fix';
        const playtestConfig = localStorage.getItem(playtestKey);
        if (playtestConfig) {
            try {
                const parsed = JSON.parse(playtestConfig);
                Object.assign(BRAND_CONFIG, parsed);
                reloadLogo();
                
                // Update story text if element exists
                if (storyTextEl) {
                    storyTextEl.textContent = BRAND_CONFIG.storyText || 'MEMEPLAY';
                }
            } catch (e) {
                // Silent fail
            }
        }
    } else {
        const hasLocalConfig = loadBrandConfig(gameId);
        
        if (!hasLocalConfig && gameId) {
            await loadBrandConfigFromSupabase(gameId);
        } else if (hasLocalConfig) {
            // Update story text if element exists
            if (storyTextEl) {
                storyTextEl.textContent = BRAND_CONFIG.storyText || 'MEMEPLAY';
            }
        }
    }
    
    // Always reload logo after config is loaded
    reloadLogo();
    
    // Update story text if element exists
    if (storyTextEl) {
        storyTextEl.textContent = BRAND_CONFIG.storyText || 'MEMEPLAY';
    }
    
    window.parent.postMessage({ 
        type: 'KNIFE_FIX_GAME_READY' 
    }, '*');
}

// ==================== CONFIG UPDATE LISTENER ====================
window.addEventListener('message', (event) => {
    if (event.data.type === 'UPDATE_CONFIG') {
        const oldLogoUrl = BRAND_CONFIG.logoUrl;
        const oldStoryText = BRAND_CONFIG.storyText;
        
        // Map config từ editor format sang game format
        const config = event.data.config || {};
        if (config.logoUrl !== undefined) BRAND_CONFIG.logoUrl = config.logoUrl;
        if (config.storyText !== undefined) BRAND_CONFIG.storyText = config.storyText;
        if (config.mapColor !== undefined) BRAND_CONFIG.mapColor = config.mapColor;
        
        // Luôn reload logo khi nhận UPDATE_CONFIG (để đảm bảo logo được load đúng)
        reloadLogo();
        
        // Update story text immediately (even if game over screen is not visible)
        if (storyTextEl) {
            storyTextEl.textContent = BRAND_CONFIG.storyText || 'MEMEPLAY';
        }
    }
});

// ==================== DOM READY ====================
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('[Knife Fix] Canvas not found!');
        return;
    }
    
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    startScreen = document.getElementById('start-screen');
    gameoverScreen = document.getElementById('gameover-screen');
    restartBtn = document.getElementById('restart-btn');
    finalScoreEl = document.getElementById('final-score');
    storyTextEl = document.getElementById('story-text');
    gameoverLogoEl = document.getElementById('gameover-logo');
    
    if (restartBtn) {
        restartBtn.addEventListener('click', restartGame);
    }
    
    if (startScreen) {
        startScreen.addEventListener('click', handleInput);
    }
    
    canvas.addEventListener('click', handleInput);
    canvas.addEventListener('touchstart', handleInput, { passive: false });
    
    if (gameoverScreen) {
        gameoverScreen.style.display = 'none';
        gameoverScreen.classList.remove('active');
    }
    
    if (startScreen) {
        startScreen.classList.add('active');
        startScreen.style.display = 'flex';
    }
    
    initGameConfig().then(() => {
        loadAssets().then(() => {
            loadAudio();
            gameLoop();
        });
    });
});
