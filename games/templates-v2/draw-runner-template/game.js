// ============================================
// DRAW RUNNER - MemePlay Game Template
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

// ==================== GROUND RENDERING CACHE ====================
// Detect iframe (playtest) vs standalone (playmode)
const isInIframe = window.self !== window.top;

let groundCacheCanvas = null;
let groundCacheCtx = null;
let groundCacheCameraX = -Infinity;
const GROUND_CACHE_UPDATE_THRESHOLD = 50; // Update cache khi camera di chuyển > 50px

// ==================== GAME CONSTANTS ====================
const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 1000;
const GRAVITY = 0.6;
const FRICTION = 0.98;
const PLAYER_SPEED_BASE = 3; // Base speed (sẽ được override bởi MOBILE_BASE_SPEED nếu mobile)
const MAX_MANA = 720;
const MANA_REGEN_RATE = 144; // per second
const MANA_REGEN_DELAY = 1000; // ms

// Hitbox constants
const HITBOX_SPIKE_SCALE = 0.125; // 12.5% hitbox của spike
const TREE_TRUNK_WIDTH_RATIO = 0.3;
const TREE_TRUNK_HEIGHT_RATIO = 0.5;
const TREE_HITBOX_SCALE = 0.68; // Thu nhỏ 15% rồi giảm thêm 20% (0.85 * 0.8 = 0.68)
const TREE_FOLIAGE_BOTTOM_RATIO = 0.6;
const TREE_FOLIAGE_CENTER_Y_RATIO = 0.3;

// Water generation constants
const WATER_BASE_CHANCE = 0.5; // 50% base chance
const WATER_CHANCE_INCREMENT = 0.05; // Tăng 5% mỗi 5s
const WATER_MAX_CHANCE = 0.95; // Giới hạn tối đa 95%

// Collision optimization constants
const COLLISION_CHECK_RANGE = 200; // Chỉ check objects trong 200px từ nhân vật
const CLEANUP_BUFFER = 500; // Cleanup objects cách camera 500px

// Detect mobile - cải thiện detection với touch events
const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isMobileTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
const isMobileViewport = window.innerWidth <= 768;
const isMobile = isMobileUA || (isMobileTouch && isMobileViewport);

// Tăng tốc độ mobile: base speed + multiplier
const MOBILE_BASE_SPEED = isMobile ? 4.2 : 3; // Tăng base speed từ 3 lên 4.2 trên mobile (40%)
const speedMultiplier = isMobile ? 2.275 : 1; // Multiplier đã tăng 40% từ 1.625 lên 2.275

// ==================== GAME STATE ====================
let gameState = 'start'; // start, playing, gameover
let score = 0;
let coins = 0;
let camera = { x: 0 };
let lastDrawTime = 0;
let mana = MAX_MANA;
let lastManaUseTime = 0;

// Audio Context
let audioCtx = null;
let lastFootstepFrame = -1; // Track frame để phát âm thanh cùng tần số với animation

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playFootstep() {
    // Phát âm thanh giảm 50%: chỉ phát khi frame là 0 hoặc 2 (2 lần trong 1 chu kỳ 4 frames)
    if (!audioCtx) return;
    
    // Chỉ phát khi frame là 0 hoặc 2, và frame đã thay đổi
    if (player.frame !== 0 && player.frame !== 2) return;
    if (player.frame === lastFootstepFrame) return;
    lastFootstepFrame = player.frame;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(100, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(60, audioCtx.currentTime + 0.05);
    // Giảm volume 25%: từ 0.1 xuống 0.075 (0.1 * 0.75 = 0.075)
    gain.gain.setValueAtTime(0.075, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0075, audioCtx.currentTime + 0.05);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
}

function playCoinSound() {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.15);
}

function playGameOverSound() {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.5);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

// ==================== PLAYER SPRITES ====================
const playerSprites = [];
let spritesLoaded = false;

function loadPlayerSprites() {
    const spriteFiles = [
        './assets/player_walk_1.png',
        './assets/player_walk_2.png',
        './assets/player_walk_3.png',
        './assets/player_walk_4.png'
    ];
    
    let loadedCount = 0;
    spriteFiles.forEach((src, index) => {
        const img = new Image();
        img.onload = () => {
            loadedCount++;
            if (loadedCount === spriteFiles.length) {
                spritesLoaded = true;
            }
        };
        img.src = src;
        playerSprites[index] = img;
    });
}

// ==================== PLAYER ====================
const player = {
    x: 50, // Vị trí bắt đầu
    y: 400,
    width: 80,
    height: 130,
    vx: 0,
    vy: 0,
    onGround: false,
    onPath: false,
    frame: 0,
    frameTimer: 0,
    // Hitbox riêng - từ đầu đến đế giày, sát thân người
    hitboxWidth: 42,
    hitboxHeight: 99,  // Giảm 10% từ 110 xuống 99
    hitboxOffsetX: 19,  // Offset từ bên trái (center hitbox)
    hitboxOffsetY: 20   // Offset từ trên
};

function getPlayerHitbox() {
    return {
        x: player.x + player.hitboxOffsetX,
        y: player.y + player.hitboxOffsetY,
        width: player.hitboxWidth,
        height: player.hitboxHeight,
        centerX: player.x + player.hitboxOffsetX + player.hitboxWidth / 2,
        bottom: player.y + player.hitboxOffsetY + player.hitboxHeight
    };
}

// ==================== GAME OBJECTS ====================
let paths = [];
let currentPath = null;
let isDrawing = false;
let obstacles = [];
let collectibles = [];
let stars = []; // Background stars
let groundSegments = []; // Các mảnh đất riêng biệt
const GROUND_Y = 550;
const GROUND_HEIGHT = CANVAS_HEIGHT - GROUND_Y;
const WATER_Y = GROUND_Y + 350; // Mặt biển thấp hơn nền đất 350px

// BNB Logo loaded state
let bnbLogo = new Image();

// ==================== GENERATION FUNCTIONS ====================
function generateStars() {
    stars = [];
    for (let i = 0; i < 150; i++) {
        stars.push({
            x: Math.random() * CANVAS_WIDTH * 10,
            y: Math.random() * 400,
            size: Math.random() * 2 + 0.5,
            twinkle: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.02 + 0.01
        });
    }
}

function generateGroundSegments(startX, endX) {
    let currentX = startX;
    const NO_WATER_ZONE = 1800; // 5s đầu không có biển
    const WATER_INTERVAL = 1800; // Mỗi 5s (1800px) tăng 5% tần suất
    
    while (currentX < endX) {
        // Mảnh đất: 200-400px
        const groundWidth = 200 + Math.random() * 200;
        
        // Pre-generate cỏ để tối ưu rendering
        const grassPoints = [];
        for (let x = 0; x < groundWidth; x += 8) {
            const offsetX = (currentX + x) % 16;
            const grassHeight = 8 + Math.random() * 5;
            grassPoints.push({
                x: x,
                offsetX: offsetX > 8 ? 3 : -3,
                height: grassHeight
            });
        }
        
        groundSegments.push({
            x: currentX,
            width: groundWidth,
            y: GROUND_Y,
            height: GROUND_HEIGHT,
            grassPoints: grassPoints // Pre-generated cỏ
        });
        currentX += groundWidth;
        
        // Biển: tần suất tăng 5% sau mỗi 5s (1800px)
        if (currentX >= NO_WATER_ZONE) {
            const waterChance = WATER_BASE_CHANCE + Math.floor((currentX - NO_WATER_ZONE) / WATER_INTERVAL) * WATER_CHANCE_INCREMENT;
            const finalChance = Math.min(waterChance, WATER_MAX_CHANCE);
            
            if (Math.random() < finalChance) {
                const waterWidth = 200 + Math.random() * 200;
                currentX += waterWidth;
            }
        }
    }
}

function isInsideGround(x, obstacleWidth = 0) {
    const MARGIN = 50; // Khoảng cách an toàn từ mép đất (50px mỗi bên)
    
    for (let segment of groundSegments) {
        if (x >= segment.x + MARGIN && 
            x + obstacleWidth <= segment.x + segment.width - MARGIN) {
            return true;
        }
    }
    return false;
}

function generateObstacles(startX, endX) {
    const groundTypes = ['spike', 'tree']; // Chỉ spawn trên đất
    const flyingTypes = ['bird']; // Có thể bay
    
    for (let x = startX; x < endX; x += 200 + Math.random() * 300) {
        let type;
        let isFlying = false;
        
        // 88% ground obstacles, 12% flying
        if (Math.random() < 0.88) {
            type = groundTypes[Math.floor(Math.random() * groundTypes.length)];
        } else {
            type = flyingTypes[0];
            isFlying = true;
        }
        
        // Xác định width của obstacle để kiểm tra
        let obstacleWidth = 0;
        switch (type) {
            case 'spike': obstacleWidth = 30; break;
            case 'tree': obstacleWidth = 60; break;
        }
        
        // Chỉ spawn ground obstacles BÊN TRONG mảnh đất (không ở mép)
        if (!isFlying && !isInsideGround(x, obstacleWidth)) {
            continue; // Bỏ qua nếu không bên trong đất hoặc ở mép
        }
        
        let obstacle = { type, x };
        
        switch (type) {
            case 'spike':
                obstacle.y = GROUND_Y - 30;
                obstacle.width = 30;
                obstacle.height = 30;
                break;
            case 'tree':
                obstacle.y = GROUND_Y - 100;
                obstacle.width = 60;
                obstacle.height = 100;
                break;
            case 'bird':
                obstacle.y = 150 + Math.random() * 200;
                obstacle.width = 50;
                obstacle.height = 30;
                obstacle.vx = -3 - Math.random() * 2;
                obstacle.wingFrame = 0;
                break;
        }
        
        obstacles.push(obstacle);
    }
}

function generateCollectibles(startX, endX) {
    // Giảm 50% tần suất xuất hiện logo Binance - khoảng cách 600-1000px
    for (let x = startX; x < endX; x += 600 + Math.random() * 400) {
        collectibles.push({
            type: 'coin',
            x,
            y: 200 + Math.random() * 300,
            size: 20,
            collected: false,
            sparkle: Math.random() * Math.PI * 2
        });
    }
}

// ==================== INITIALIZE GAME ====================
function initGame() {
    player.x = 50; // Vị trí bắt đầu
    player.y = 400;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.onPath = false;
    player.frame = 0;
    
    camera.x = player.x - 150; // Camera theo nhân vật
    score = 0;
    coins = 0;
    mana = MAX_MANA;
    lastManaUseTime = 0;
    
    paths = [];
    currentPath = null;
    isDrawing = false;
    
    obstacles = [];
    collectibles = [];
    groundSegments = [];
    
    generateStars();
    generateGroundSegments(0, 3000); // Tạo các mảnh đất
    generateObstacles(1800, 3000);  // 5s đầu không có vật cản (1800px = ~5s)
    generateCollectibles(1800, 3000); // Collectibles cũng cách ~5 giây
}

// ==================== DRAWING HANDLERS ====================
function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    if (e.touches) {
        return {
            x: (e.touches[0].clientX - rect.left) * scaleX,
            y: (e.touches[0].clientY - rect.top) * scaleY
        };
    }
    return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
    };
}

function startDrawing(e) {
    e.preventDefault();
    
    if (gameState === 'start') {
        initAudio();
        gameState = 'playing';
        initGame();
        // Post message for tracking - với gameId để đếm plays
        const gameId = getGameId() || TEMPLATE_ID;
        window.parent.postMessage({ type: 'GAME_START', gameId: gameId }, '*');
        return;
    }
    
    if (gameState === 'gameover') {
        const pos = getCanvasPos(e);
        // Check if clicked on play again button
        const btnX = CANVAS_WIDTH / 2;
        const btnY = 700;
        if (pos.x > btnX - 100 && pos.x < btnX + 100 && pos.y > btnY - 25 && pos.y < btnY + 25) {
            gameState = 'playing';
            initGame();
            const gameId = getGameId() || TEMPLATE_ID;
            window.parent.postMessage({ type: 'GAME_START', gameId: gameId }, '*');
        }
        return;
    }
    
    if (gameState !== 'playing' || mana <= 0) return;
    
    const pos = getCanvasPos(e);
    isDrawing = true;
    currentPath = {
        points: [{ x: pos.x + camera.x, y: pos.y }],
        opacity: 1
    };
    lastDrawTime = Date.now();
}

function draw(e) {
    e.preventDefault();
    if (!isDrawing || gameState !== 'playing' || mana <= 0) return;
    
    const pos = getCanvasPos(e);
    const worldX = pos.x + camera.x;
    const worldY = pos.y;
    
    const lastPoint = currentPath.points[currentPath.points.length - 1];
    const dist = Math.sqrt((worldX - lastPoint.x) ** 2 + (worldY - lastPoint.y) ** 2);
    
    if (dist > 5) {
        // Consume mana based on distance
        const manaCost = dist * 0.5;
        if (mana >= manaCost) {
            mana -= manaCost;
            lastManaUseTime = Date.now();
            currentPath.points.push({ x: worldX, y: worldY });
        } else {
            mana = 0;
        }
    }
}

function stopDrawing(e) {
    if (e) e.preventDefault();
    if (currentPath && currentPath.points.length > 1) {
        paths.push(currentPath);
    }
    isDrawing = false;
    currentPath = null;
}

// ==================== COLLISION DETECTION ====================
function checkPathCollision(hitbox) {
    const playerCenterX = hitbox.centerX;
    const playerBottom = hitbox.bottom;
    
    // Tính toán range collision dựa trên tốc độ rơi (vy) và tốc độ ngang (vx)
    // Fix: Trong iframe, cần check range lớn hơn vì FPS có thể thấp hơn
    const fallDistance = Math.abs(player.vy);
    const horizontalDistance = Math.abs(player.vx);
    const baseRange = isInIframe ? 80 : 50; // Tăng base range trong iframe
    const collisionRange = Math.max(baseRange, fallDistance + 30);
    
    // Tăng check range trong iframe để bắt kịp khi player di chuyển nhanh
    const checkRange = isInIframe ? COLLISION_CHECK_RANGE * 1.5 : COLLISION_CHECK_RANGE;
    const minX = playerCenterX - checkRange;
    const maxX = playerCenterX + checkRange;
    
    // Loop ngược để check paths mới nhất trước
    for (let pathIdx = paths.length - 1; pathIdx >= 0; pathIdx--) {
        const path = paths[pathIdx];
        
        // Skip paths quá xa
        if (path.points.length === 0) continue;
        const pathMinX = Math.min(...path.points.map(p => p.x));
        const pathMaxX = Math.max(...path.points.map(p => p.x));
        if (pathMaxX < minX || pathMinX > maxX) continue;
        
        // Fix: Check nhiều segments hơn trong iframe (tăng từ 20 lên 40)
        const segmentsToCheck = isInIframe ? 40 : 20;
        const startIdx = Math.max(0, path.points.length - segmentsToCheck);
        for (let i = startIdx; i < path.points.length - 1; i++) {
            const p1 = path.points[i];
            const p2 = path.points[i + 1];
            
            // Quick reject: skip segments quá xa (tăng tolerance trong iframe)
            const tolerance = isInIframe ? 50 : 30; // Tăng từ 30 lên 50 trong iframe
            const segMinX = Math.min(p1.x, p2.x);
            const segMaxX = Math.max(p1.x, p2.x);
            if (playerCenterX < segMinX - tolerance || playerCenterX > segMaxX + tolerance) continue;
            
            // Check if player is above this segment (tăng range trong iframe)
            const checkRangeX = isInIframe ? 40 : 20; // Tăng từ 20 lên 40 trong iframe
            if (playerCenterX >= segMinX - checkRangeX && playerCenterX <= segMaxX + checkRangeX) {
                const dx = p2.x - p1.x;
                if (Math.abs(dx) < 0.1) continue; // Skip vertical segments
                
                // Fix: Check cả vị trí hiện tại và vị trí sẽ đến (dựa trên vx)
                const checkPositions = isInIframe 
                    ? [playerCenterX, playerCenterX + player.vx * 0.5, playerCenterX + player.vx] // Check 3 positions trong iframe
                    : [playerCenterX]; // Chỉ check 1 position trong standalone
                
                for (const checkX of checkPositions) {
                    const t = (checkX - p1.x) / dx;
                    if (t < -0.2 || t > 1.2) continue; // Tăng tolerance từ 0-1 lên -0.2-1.2
                    
                    const lineY = p1.y + t * (p2.y - p1.y);
                    
                    // Continuous collision detection
                    const minY = Math.min(playerBottom, playerBottom - player.vy);
                    const maxY = Math.max(playerBottom, playerBottom - player.vy);
                    
                    if (player.vy >= 0 && 
                        minY <= lineY + collisionRange && 
                        maxY >= lineY - 20) {
                        
                        player.y = lineY - player.height;
                        player.vy = 0;
                        player.onPath = true;
                        
                        // Fade path when walked on
                        path.opacity = Math.max(0, path.opacity - 0.002);
                        
                        // Calculate slope for movement
                        const angle = Math.atan2(p2.y - p1.y, dx);
                        const slopeMultiplier = Math.cos(angle) > 0.7 ? 1 : 0.7;
                        const playerSpeed = isMobile ? MOBILE_BASE_SPEED : PLAYER_SPEED_BASE;
                        player.vx = playerSpeed * speedMultiplier * slopeMultiplier;
                        
                        playFootstep();
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

function checkGroundCollision(hitbox) {
    const px = hitbox.x;
    const py = hitbox.y;
    const pw = hitbox.width;
    const ph = hitbox.height;
    
    const fallDistance = Math.abs(player.vy);
    const collisionRange = Math.max(50, fallDistance + 30);
    
    const minX = px - COLLISION_CHECK_RANGE;
    const maxX = px + pw + COLLISION_CHECK_RANGE;
    
    for (let segment of groundSegments) {
        if (segment.x + segment.width < minX || segment.x > maxX) continue;
        if (px + pw > segment.x && px < segment.x + segment.width) {
            const currentBottom = py + ph;
            const nextBottom = py + ph - player.vy;
            const minBottom = Math.min(currentBottom, nextBottom);
            const maxBottom = Math.max(currentBottom, nextBottom);
            
            if (player.vy >= 0 && 
                minBottom <= segment.y + 5 && 
                maxBottom >= segment.y - collisionRange) {
                
                player.y = segment.y - player.hitboxOffsetY - player.hitboxHeight;
                player.vy = 0;
                player.onGround = true;
                const playerSpeed = isMobile ? MOBILE_BASE_SPEED : PLAYER_SPEED_BASE;
                player.vx = playerSpeed * speedMultiplier;
                playFootstep();
                return true;
            }
        }
    }
    return false;
}

function checkWaterCollision(hitbox) {
    const px = hitbox.centerX;
    const py = hitbox.bottom;
    
    const minX = px - COLLISION_CHECK_RANGE;
    const maxX = px + COLLISION_CHECK_RANGE;
    
    let onGround = false;
    for (let segment of groundSegments) {
        if (segment.x + segment.width < minX || segment.x > maxX) continue;
        
        if (px >= segment.x && px <= segment.x + segment.width) {
            if (py <= segment.y + 5) {
                onGround = true;
                break;
            }
        }
    }
    
    if (!onGround && py >= WATER_Y) {
        return true;
    }
    return false;
}

function pointInTriangle(px, py, x1, y1, x2, y2, x3, y3) {
    const d1 = (px - x2) * (y1 - y2) - (x1 - x2) * (py - y2);
    const d2 = (px - x3) * (y2 - y3) - (x2 - x3) * (py - y3);
    const d3 = (px - x1) * (y3 - y1) - (x3 - x1) * (py - y1);
    return (d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0);
}

function rectTriangleCollision(rx, ry, rw, rh, tx1, ty1, tx2, ty2, tx3, ty3) {
    const corners = [
        [rx, ry], [rx + rw, ry],
        [rx, ry + rh], [rx + rw, ry + rh]
    ];
    for (let [cx, cy] of corners) {
        if (pointInTriangle(cx, cy, tx1, ty1, tx2, ty2, tx3, ty3)) {
            return true;
        }
    }
    const triMinX = Math.min(tx1, tx2, tx3);
    const triMaxX = Math.max(tx1, tx2, tx3);
    const triMinY = Math.min(ty1, ty2, ty3);
    const triMaxY = Math.max(ty1, ty2, ty3);
    return !(rx + rw < triMinX || rx > triMaxX || ry + rh < triMinY || ry > triMaxY);
}

function checkObstacleCollision(hitbox) {
    const px = hitbox.x;
    const py = hitbox.y;
    const pw = hitbox.width;
    const ph = hitbox.height;
    
    const minX = camera.x - 100;
    const maxX = camera.x + CANVAS_WIDTH + 100;
    
    for (let obs of obstacles) {
        if (obs.x > maxX || obs.x + obs.width < minX) continue;
        
        if (obs.type === 'spike') {
            const spikeHitboxWidth = obs.width * HITBOX_SPIKE_SCALE;
            const spikeHitboxHeight = obs.height * HITBOX_SPIKE_SCALE;
            const spikeHitboxX = obs.x + (obs.width - spikeHitboxWidth) / 2;
            const spikeHitboxY = obs.y + (obs.height - spikeHitboxHeight) / 2;
            
            if (px < spikeHitboxX + spikeHitboxWidth &&
                px + pw > spikeHitboxX &&
                py < spikeHitboxY + spikeHitboxHeight &&
                py + ph > spikeHitboxY) {
                return true;
            }
        } else if (obs.type === 'tree') {
            const trunkW = obs.width * TREE_TRUNK_WIDTH_RATIO * TREE_HITBOX_SCALE;
            const trunkH = obs.height * TREE_TRUNK_HEIGHT_RATIO * TREE_HITBOX_SCALE;
            const trunkX = obs.x + obs.width * 0.35 + (obs.width * TREE_TRUNK_WIDTH_RATIO - trunkW) / 2;
            const trunkY = obs.y + obs.height * TREE_TRUNK_HEIGHT_RATIO + (obs.height * TREE_TRUNK_HEIGHT_RATIO - trunkH) / 2;
            
            // Check collision với thân cây
            if (px < trunkX + trunkW &&
                px + pw > trunkX &&
                py < trunkY + trunkH &&
                py + ph > trunkY) {
                return true;
            }
            
            // Tán lá (tam giác)
            const centerX = obs.x + obs.width / 2;
            const centerY = obs.y + obs.height * TREE_FOLIAGE_CENTER_Y_RATIO;
            const triX1 = centerX + (obs.x - centerX) * TREE_HITBOX_SCALE;
            const triY1 = centerY + (obs.y + obs.height * TREE_FOLIAGE_BOTTOM_RATIO - centerY) * TREE_HITBOX_SCALE;
            const triX2 = centerX + (obs.x + obs.width / 2 - centerX) * TREE_HITBOX_SCALE;
            const triY2 = centerY + (obs.y - centerY) * TREE_HITBOX_SCALE;
            const triX3 = centerX + (obs.x + obs.width - centerX) * TREE_HITBOX_SCALE;
            const triY3 = centerY + (obs.y + obs.height * TREE_FOLIAGE_BOTTOM_RATIO - centerY) * TREE_HITBOX_SCALE;
            
            if (rectTriangleCollision(px, py, pw, ph, triX1, triY1, triX2, triY2, triX3, triY3)) {
                return true;
            }
        } else {
            if (px < obs.x + obs.width &&
                px + pw > obs.x &&
                py < obs.y + obs.height &&
                py + ph > obs.y) {
                return true;
            }
        }
    }
    return false;
}

function checkCollectibles() {
    const hitbox = getPlayerHitbox();
    const px = hitbox.centerX;
    const py = hitbox.y + hitbox.height / 2;
    
    for (let col of collectibles) {
        if (col.collected) continue;
        
        const dist = Math.sqrt((px - col.x) ** 2 + (py - col.y) ** 2);
        if (dist < col.size + 30) {
            col.collected = true;
            playCoinSound();
            
            if (col.type === 'coin') {
                coins += 1;
                mana = MAX_MANA; // Hồi full mana khi ăn coin
            }
        }
    }
}

// ==================== UPDATE ====================
function update() {
    if (gameState !== 'playing') return;
    
    // Cache hitbox để dùng cho tất cả collision checks
    const hitbox = getPlayerHitbox();
    
    // Regenerate mana
    if (Date.now() - lastManaUseTime > MANA_REGEN_DELAY) {
        mana = Math.min(MAX_MANA, mana + MANA_REGEN_RATE / 60);
    }
    
    // Apply gravity
    player.vy += GRAVITY;
    player.vy *= FRICTION;
    
    player.onGround = false;
    player.onPath = false;
    
    // Check collisions với cached hitbox
    if (!checkPathCollision(hitbox)) {
        if (!checkGroundCollision(hitbox)) {
            // In air - apply horizontal movement
            const playerSpeed = isMobile ? MOBILE_BASE_SPEED : PLAYER_SPEED_BASE;
            player.vx = playerSpeed * speedMultiplier * 0.8;
        }
    }
    
    // Update position
    player.x += player.vx;
    player.y += player.vy;
    
    // Clamp Y - chỉ giới hạn trên, cho phép rơi xuống biển
    player.y = Math.max(0, player.y);
    
    // Update camera
    camera.x = player.x - 150;
    
    // Update score
    score = Math.floor(player.x / 10);
    
    // Update player animation - giảm 50% tốc độ
    player.frameTimer++;
    if (player.frameTimer > 16) {
        player.frame = (player.frame + 1) % 4;
        player.frameTimer = 0;
    }
    
    // Update birds
    for (let obs of obstacles) {
        if (obs.type === 'bird') {
            obs.x += obs.vx * speedMultiplier;
            // Giảm tốc độ đập cánh 60%: từ 0.2 xuống 0.08
            obs.wingFrame = (obs.wingFrame + 0.08) % 2;
        }
    }
    
    // Check collectibles
    checkCollectibles();
    
    // Memory cleanup: Remove old objects khi ra khỏi camera view
    const cleanupX = camera.x - CLEANUP_BUFFER;
    paths = paths.filter(p => p.opacity > 0.1 && p.points[0].x > cleanupX);
    obstacles = obstacles.filter(o => o.x > cleanupX);
    collectibles = collectibles.filter(c => !c.collected || c.x > cleanupX);
    groundSegments = groundSegments.filter(g => g.x + g.width > cleanupX);
    
    // Generate more content
    const maxObsX = Math.max(...obstacles.map(o => o.x), 0);
    if (maxObsX < camera.x + CANVAS_WIDTH + 1000) {
        generateObstacles(maxObsX + 200, maxObsX + 2000);
    }
    
    const maxColX = Math.max(...collectibles.filter(c => !c.collected).map(c => c.x), 0);
    if (maxColX < camera.x + CANVAS_WIDTH + 1000) {
        generateCollectibles(maxColX + 100, maxColX + 2000);
    }
    
    // Generate more ground segments
    const maxGroundX = Math.max(...groundSegments.map(g => g.x + g.width), 0);
    if (maxGroundX < camera.x + CANVAS_WIDTH + 1000) {
        generateGroundSegments(maxGroundX, maxGroundX + 2000);
    }
    
    // Check game over conditions với cached hitbox
    if (hitbox.bottom > CANVAS_HEIGHT ||
        player.x < camera.x - 100 ||
        checkObstacleCollision(hitbox) ||
        checkWaterCollision(hitbox)) {
        gameOver();
    }
}

function gameOver() {
    gameState = 'gameover';
    playGameOverSound();
    
    // Use gameId from URL if available, otherwise use template ID
    const gameId = getGameId() || TEMPLATE_ID;
    
    // Send GAME_OVER to parent for playtime tracking and rewards
    window.parent.postMessage({ 
        type: 'GAME_OVER',
        gameId: gameId
    }, '*');
    
    // Send GAME_SCORE to parent for leaderboard and rewards
    window.parent.postMessage({ 
        type: 'GAME_SCORE', 
        gameId: gameId, 
        score: score,
        level: 1 // Draw Runner doesn't have levels
    }, '*');
}

// ==================== RENDER ====================
function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(0.5, '#1a1a2e');
    gradient.addColorStop(1, '#16213e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Stars - tối ưu: chỉ vẽ stars trong camera view
    const minStarX = camera.x * 0.3 - 10;
    const maxStarX = camera.x * 0.3 + CANVAS_WIDTH + 10;
    
    for (let star of stars) {
        const screenX = star.x - camera.x * 0.3;
        if (screenX < -10 || screenX > CANVAS_WIDTH + 10) continue;
        if (star.x < minStarX || star.x > maxStarX) continue;
        
        star.twinkle += star.speed;
        const alpha = 0.3 + 0.7 * Math.abs(Math.sin(star.twinkle));
        
        ctx.beginPath();
        ctx.arc(screenX, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
    }
}

// Initialize ground cache canvas
function initGroundCache() {
    if (!groundCacheCanvas) {
        groundCacheCanvas = document.createElement('canvas');
        groundCacheCanvas.width = CANVAS_WIDTH * 3; // Cache 3x canvas width
        groundCacheCanvas.height = CANVAS_HEIGHT;
        groundCacheCtx = groundCacheCanvas.getContext('2d');
    }
}

// Render ground to cache canvas
function renderGroundToCache(cameraX) {
    if (!groundCacheCtx) initGroundCache();
    
    const cacheCtx = groundCacheCtx;
    const cacheOffset = CANVAS_WIDTH; // Offset để cache ở giữa
    
    // Clear cache
    cacheCtx.clearRect(0, 0, groundCacheCanvas.width, groundCacheCanvas.height);
    
    // Vẽ biển nền (từ WATER_Y xuống đáy)
    const waterGradient = cacheCtx.createLinearGradient(0, WATER_Y, 0, CANVAS_HEIGHT);
    waterGradient.addColorStop(0, '#1e3a8a');
    waterGradient.addColorStop(1, '#0f172a');
    cacheCtx.fillStyle = waterGradient;
    cacheCtx.fillRect(0, WATER_Y, groundCacheCanvas.width, CANVAS_HEIGHT - WATER_Y);
    
    // Vẽ sóng biển - GIẢM từ 5 xuống 2 waves (tối ưu 1)
    cacheCtx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    cacheCtx.lineWidth = 2;
    const waveTime = Date.now() / 1000;
    for (let i = 0; i < 2; i++) { // Giảm từ 5 xuống 2
        cacheCtx.beginPath();
        const waveY = WATER_Y + 10 + i * 40; // Tăng khoảng cách giữa waves
        cacheCtx.moveTo(0, waveY);
        for (let x = 0; x < groundCacheCanvas.width; x += 10) {
            const waveX = x + cameraX * 0.3;
            const y = waveY + Math.sin(waveX / 50 + waveTime) * 5;
            cacheCtx.lineTo(x, y);
        }
        cacheCtx.stroke();
    }
    
    // Vẽ các mảnh đất trong cache range
    const cacheStartX = cameraX - CANVAS_WIDTH;
    const cacheEndX = cameraX + CANVAS_WIDTH * 2;
    
    // Batch grass rendering - vẽ tất cả grass trong 1 path (tối ưu 2)
    cacheCtx.strokeStyle = '#3d7a37';
    cacheCtx.lineWidth = 2;
    cacheCtx.beginPath(); // Bắt đầu 1 path cho tất cả grass
    
    // Fixed ground color (không dùng mapColor nữa)
    const dirtColor = '#5c4033';
    const textureColor = '#4a3328';
    
    for (let segment of groundSegments) {
        const segmentX = segment.x;
        if (segmentX + segment.width < cacheStartX || segmentX > cacheEndX) continue;
        
        const cacheX = segmentX - cameraX + cacheOffset;
        
        // Dirt - màu cố định
        cacheCtx.fillStyle = dirtColor;
        cacheCtx.fillRect(cacheX, segment.y, segment.width, segment.height);
        
        // Dirt texture - GIẢM từ 20 xuống 10 (tối ưu 3)
        cacheCtx.fillStyle = textureColor;
        for (let i = 0; i < 10; i++) { // Giảm từ 20 xuống 10
            const x = cacheX + (i * 37 % segment.width);
            const y = segment.y + 5 + (i * 13 % 100);
            cacheCtx.fillRect(x, y, 4, 2);
        }
        
        // Batch grass - thêm vào path chung
        if (segment.grassPoints) {
            for (let grass of segment.grassPoints) {
                const grassX = cacheX + grass.x;
                cacheCtx.moveTo(grassX, segment.y);
                cacheCtx.lineTo(grassX + grass.offsetX, segment.y - grass.height);
            }
        }
    }
    
    // Stroke tất cả grass cùng lúc (chỉ 1 lần)
    cacheCtx.stroke();
    
    // Update cache state
    groundCacheCameraX = cameraX;
}

function drawGround() {
    // Option 2: Disable cache trong playtest (iframe), dùng cache trong playmode (standalone)
    if (isInIframe) {
        // Playtest: Vẽ trực tiếp (không cache) - tối ưu nhưng không dùng cache
        drawGroundDirect();
        return;
    }
    
    // Playmode: Dùng cache (đã optimize)
    const cameraX = camera.x;
    
    // Check if cache needs update
    const needsUpdate = !groundCacheCanvas || 
                       Math.abs(cameraX - groundCacheCameraX) > GROUND_CACHE_UPDATE_THRESHOLD;
    
    if (needsUpdate) {
        renderGroundToCache(cameraX);
    }
    
    // Draw cached ground
    if (groundCacheCanvas) {
        const cacheOffset = CANVAS_WIDTH;
        const sourceX = cameraX - groundCacheCameraX + cacheOffset;
        const sourceY = 0;
        const sourceWidth = CANVAS_WIDTH;
        const sourceHeight = CANVAS_HEIGHT;
        
        // Draw from cache
        ctx.drawImage(
            groundCacheCanvas,
            sourceX, sourceY, sourceWidth, sourceHeight,
            0, 0, CANVAS_WIDTH, CANVAS_HEIGHT
        );
    } else {
        // Fallback nếu cache chưa init
        initGroundCache();
        renderGroundToCache(cameraX);
        drawGround(); // Recursive call để vẽ lại
    }
}

// Vẽ ground trực tiếp (không cache) - dùng trong playtest
function drawGroundDirect() {
    // Vẽ biển nền (từ WATER_Y xuống đáy)
    const waterGradient = ctx.createLinearGradient(0, WATER_Y, 0, CANVAS_HEIGHT);
    waterGradient.addColorStop(0, '#1e3a8a');
    waterGradient.addColorStop(1, '#0f172a');
    ctx.fillStyle = waterGradient;
    ctx.fillRect(0, WATER_Y, CANVAS_WIDTH, CANVAS_HEIGHT - WATER_Y);
    
    // Vẽ sóng biển - GIẢM từ 5 xuống 2 waves (tối ưu)
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 2;
    const waveTime = Date.now() / 1000;
    for (let i = 0; i < 2; i++) { // Giảm từ 5 xuống 2
        ctx.beginPath();
        const waveY = WATER_Y + 10 + i * 40; // Tăng khoảng cách giữa waves
        ctx.moveTo(0, waveY);
        for (let x = 0; x < CANVAS_WIDTH; x += 10) {
            const waveX = x + camera.x * 0.3;
            const y = waveY + Math.sin(waveX / 50 + waveTime) * 5;
            ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    
    // Batch grass rendering - vẽ tất cả grass trong 1 path (tối ưu)
    ctx.strokeStyle = '#3d7a37';
    ctx.lineWidth = 2;
    ctx.beginPath(); // Bắt đầu 1 path cho tất cả grass
    
    // Fixed ground color
    const dirtColor = '#5c4033';
    const textureColor = '#4a3328';
    
    // Vẽ các mảnh đất
    for (let segment of groundSegments) {
        const screenX = segment.x - camera.x;
        if (screenX + segment.width < 0 || screenX > CANVAS_WIDTH) continue;
        
        // Dirt - màu cố định
        ctx.fillStyle = dirtColor;
        ctx.fillRect(screenX, segment.y, segment.width, segment.height);
        
        // Dirt texture - GIẢM từ 20 xuống 10 (tối ưu)
        ctx.fillStyle = textureColor;
        for (let i = 0; i < 10; i++) { // Giảm từ 20 xuống 10
            const x = screenX + (i * 37 % segment.width);
            const y = segment.y + 5 + (i * 13 % 100);
            ctx.fillRect(x, y, 4, 2);
        }
        
        // Batch grass - thêm vào path chung
        if (segment.grassPoints) {
            for (let grass of segment.grassPoints) {
                const grassX = screenX + grass.x;
                ctx.moveTo(grassX, segment.y);
                ctx.lineTo(grassX + grass.offsetX, segment.y - grass.height);
            }
        }
    }
    
    // Stroke tất cả grass cùng lúc (chỉ 1 lần)
    ctx.stroke();
}

function drawPaths() {
    for (let path of paths) {
        if (path.points.length < 2) continue;
        
        ctx.beginPath();
        ctx.moveTo(path.points[0].x - camera.x, path.points[0].y);
        
        for (let i = 1; i < path.points.length; i++) {
            ctx.lineTo(path.points[i].x - camera.x, path.points[i].y);
        }
        
        const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
        gradient.addColorStop(0, `rgba(0, 255, 100, ${path.opacity})`);
        gradient.addColorStop(1, `rgba(0, 150, 255, ${path.opacity})`);
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // Glow effect
        ctx.strokeStyle = `rgba(0, 200, 255, ${path.opacity * 0.3})`;
        ctx.lineWidth = 16;
        ctx.stroke();
    }
    
    // Current drawing path
    if (currentPath && currentPath.points.length > 1) {
        ctx.beginPath();
        ctx.moveTo(currentPath.points[0].x - camera.x, currentPath.points[0].y);
        
        for (let i = 1; i < currentPath.points.length; i++) {
            ctx.lineTo(currentPath.points[i].x - camera.x, currentPath.points[i].y);
        }
        
        ctx.strokeStyle = 'rgba(0, 255, 150, 0.8)';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
    }
}

function drawPlayer() {
    const screenX = player.x - camera.x;
    const screenY = player.y;
    
    // Sử dụng sprite animation nếu đã load xong
    if (spritesLoaded && playerSprites[player.frame]) {
        const sprite = playerSprites[player.frame];
        ctx.drawImage(sprite, screenX, screenY, player.width, player.height);
    } else {
        // Fallback: vẽ hình chữ nhật đơn giản nếu chưa load xong
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(screenX, screenY, player.width, player.height);
    }
}

function drawObstacles() {
    for (let obs of obstacles) {
        const screenX = obs.x - camera.x;
        if (screenX < -100 || screenX > CANVAS_WIDTH + 100) continue;
        
        switch (obs.type) {
            case 'spike':
                ctx.fillStyle = '#c0c0c0';
                ctx.beginPath();
                ctx.moveTo(screenX, obs.y + obs.height);
                ctx.lineTo(screenX + obs.width / 2, obs.y);
                ctx.lineTo(screenX + obs.width, obs.y + obs.height);
                ctx.closePath();
                ctx.fill();
                
                // Spike shine
                ctx.fillStyle = '#e0e0e0';
                ctx.beginPath();
                ctx.moveTo(screenX + obs.width * 0.3, obs.y + obs.height);
                ctx.lineTo(screenX + obs.width / 2, obs.y + obs.height * 0.3);
                ctx.lineTo(screenX + obs.width * 0.5, obs.y + obs.height);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'tree':
                // Trunk
                ctx.fillStyle = '#5c4033';
                ctx.fillRect(screenX + obs.width * 0.35, obs.y + obs.height * 0.5, obs.width * 0.3, obs.height * 0.5);
                
                // Foliage
                ctx.fillStyle = '#228b22';
                ctx.beginPath();
                ctx.moveTo(screenX, obs.y + obs.height * 0.6);
                ctx.lineTo(screenX + obs.width / 2, obs.y);
                ctx.lineTo(screenX + obs.width, obs.y + obs.height * 0.6);
                ctx.closePath();
                ctx.fill();
                
                ctx.fillStyle = '#2ea82e';
                ctx.beginPath();
                ctx.moveTo(screenX + obs.width * 0.1, obs.y + obs.height * 0.4);
                ctx.lineTo(screenX + obs.width / 2, obs.y + obs.height * 0.1);
                ctx.lineTo(screenX + obs.width * 0.9, obs.y + obs.height * 0.4);
                ctx.closePath();
                ctx.fill();
                break;
                
            case 'bird':
                // Bird body - màu xanh dương dễ nhìn
                ctx.fillStyle = '#4169E1';
                ctx.beginPath();
                ctx.ellipse(screenX + obs.width / 2, obs.y + obs.height / 2, 
                           obs.width / 2, obs.height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Wings
                const wingY = obs.wingFrame < 1 ? -8 : 8;
                ctx.fillStyle = '#6495ED';
                ctx.beginPath();
                ctx.moveTo(screenX + obs.width * 0.3, obs.y + obs.height / 2);
                ctx.lineTo(screenX - 10, obs.y + obs.height / 2 + wingY);
                ctx.lineTo(screenX + obs.width * 0.3, obs.y + obs.height / 2 + 5);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(screenX + obs.width * 0.7, obs.y + obs.height / 2);
                ctx.lineTo(screenX + obs.width + 10, obs.y + obs.height / 2 + wingY);
                ctx.lineTo(screenX + obs.width * 0.7, obs.y + obs.height / 2 + 5);
                ctx.closePath();
                ctx.fill();
                
                // Eye
                ctx.fillStyle = '#FFD700';
                ctx.beginPath();
                ctx.arc(screenX + obs.width * 0.7, obs.y + obs.height * 0.4, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // Beak
                ctx.fillStyle = '#FF6600';
                ctx.beginPath();
                ctx.moveTo(screenX + obs.width, obs.y + obs.height / 2);
                ctx.lineTo(screenX + obs.width + 10, obs.y + obs.height / 2);
                ctx.lineTo(screenX + obs.width, obs.y + obs.height / 2 + 5);
                ctx.closePath();
                ctx.fill();
                break;
        }
    }
}

function drawCollectibles() {
    const minX = camera.x - 50;
    const maxX = camera.x + CANVAS_WIDTH + 50;
    
    for (let col of collectibles) {
        if (col.collected) continue;
        if (col.x < minX || col.x > maxX) continue;
        
        const screenX = col.x - camera.x;
        if (screenX < -50 || screenX > CANVAS_WIDTH + 50) continue;
        
        col.sparkle += 0.1;
        
        // Thay coin bằng logo Binance
        if (bnbLogo.complete) {
            const logoSize = col.size * 2;
            const rotation = col.sparkle * 0.5;
            
            ctx.save();
            ctx.translate(screenX, col.y);
            ctx.rotate(rotation);
            ctx.globalAlpha = 0.8 + 0.2 * Math.sin(col.sparkle);
            ctx.drawImage(bnbLogo, -logoSize / 2, -logoSize / 2, logoSize, logoSize);
            ctx.restore();
        } else {
            // Fallback nếu logo chưa load
            ctx.fillStyle = '#ffd700';
            ctx.beginPath();
            ctx.arc(screenX, col.y, col.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function drawUI() {
    // Score
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${score}`, 20, 40);
    
    // Mana orbs (chỉ 5 viên ngọc, không có thanh ngang)
    for (let i = 0; i < 5; i++) {
        const orbX = 40 + i * 40;
        const orbFilled = mana >= (i + 1) * (MAX_MANA / 5);
        
        ctx.beginPath();
        ctx.arc(orbX, 80, 12, 0, Math.PI * 2);
        ctx.fillStyle = orbFilled ? '#00ccff' : 'rgba(0, 100, 150, 0.5)';
        ctx.fill();
        
        if (orbFilled) {
            // Glow
            ctx.beginPath();
            ctx.arc(orbX, 80, 15, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
            ctx.fill();
        }
    }
}

function drawStartScreen() {
    // Lưu camera.x hiện tại để restore sau
    const savedCameraX = camera.x;
    camera.x = 0; // Reset camera để vẽ từ đầu
    
    // Vẽ background game (sao, đất, cỏ) giống như khi đang chơi
    drawBackground();
    drawGround();
    
    // Vẽ nhân vật đứng trên đất (giữa màn hình)
    const startPlayerX = CANVAS_WIDTH / 2 - player.width / 2;
    const startPlayerY = GROUND_Y - player.height;
    
    // Sử dụng sprite animation nếu đã load xong
    if (spritesLoaded && playerSprites[0]) {
        const sprite = playerSprites[0]; // Frame đầu tiên
        ctx.drawImage(sprite, startPlayerX, startPlayerY, player.width, player.height);
    } else {
        // Fallback: vẽ hình chữ nhật đơn giản nếu chưa load xong
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(startPlayerX, startPlayerY, player.width, player.height);
    }
    
    // Restore camera
    camera.x = savedCameraX;
    
    // Overlay mờ để text dễ đọc
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Title
    ctx.fillStyle = '#00ffff';
    ctx.font = 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('DRAW RUNNER', CANVAS_WIDTH / 2, 300);
    
    // Start text - nhấp nháy nhẹ
    const blinkAlpha = 0.5 + 0.5 * Math.sin(Date.now() / 500);
    ctx.fillStyle = `rgba(255, 215, 0, ${blinkAlpha})`;
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('TAP TO START', CANVAS_WIDTH / 2, 540);
    
    // MemePlay branding
    ctx.fillStyle = '#888';
    ctx.font = '18px Arial';
    ctx.fillText('A MemePlay Game', CANVAS_WIDTH / 2, 650);
}

function drawGameOverScreen() {
    // Overlay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Game Over text - giảm 50% kích thước
    ctx.fillStyle = '#ff4444';
    ctx.font = 'bold 36px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, 200);
    
    // BNB Logo - tăng 50% kích thước
    if (bnbLogo.complete) {
        const logoSize = 180;
        ctx.drawImage(bnbLogo, CANVAS_WIDTH / 2 - logoSize / 2, 280, logoSize, logoSize);
    }
    
    // Story text từ config - thu nhỏ 30% và đặt dưới logo Binance
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 25px Arial';
    ctx.fillText(BRAND_CONFIG.storyText || 'MEMEPLAY', CANVAS_WIDTH / 2, 550);
    
    // Play Again button
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(CANVAS_WIDTH / 2 - 100, 675, 200, 50);
    ctx.fillStyle = '#000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PLAY AGAIN', CANVAS_WIDTH / 2, 700);
    
    // Score - cách ô play again 50px
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`Final Score: ${score}`, CANVAS_WIDTH / 2, 650);
}

function render() {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    drawBackground();
    drawGround();
    drawPaths();
    drawObstacles();
    drawCollectibles();
    
    if (gameState === 'playing') {
        drawPlayer();
        drawUI();
    }
    
    if (gameState === 'start') {
        drawStartScreen();
    }
    
    if (gameState === 'gameover') {
        drawPlayer();
        drawGameOverScreen();
    }
}

// ==================== GAME LOOP ====================
function gameLoop() {
    update();
    render();
    requestAnimationFrame(gameLoop);
}

// ==================== CONFIG LOADING ====================
// Helper: Reload logo
function reloadLogo() {
    const newLogoUrl = getEffectiveLogoUrl();
    if (!newLogoUrl || newLogoUrl === window.location.href) {
        console.warn('[Draw Runner] Invalid logo URL:', newLogoUrl);
        return;
    }
    
    // Luôn tạo Image mới để force reload (đảm bảo logo được load đúng)
    const newLogo = new Image();
    newLogo.onload = () => {
        bnbLogo = newLogo;
        console.log('[Draw Runner] Logo reloaded successfully:', newLogoUrl);
    };
    newLogo.onerror = () => {
        console.warn('[Draw Runner] Failed to load logo:', newLogoUrl);
        // Fallback: giữ logo cũ nếu load fail
    };
    newLogo.src = newLogoUrl;
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
        
        // Map Supabase data to BRAND_CONFIG
        if (data.fragment_logo_url) BRAND_CONFIG.logoUrl = data.fragment_logo_url;
        if (data.story_one) BRAND_CONFIG.storyText = data.story_one;
        
        console.log('[Draw Runner] Loaded config from Supabase:', BRAND_CONFIG);
        return true;
    } catch (err) {
        console.warn('[Draw Runner] Failed to load from Supabase:', err);
        return false;
    }
}

// ==================== INITIALIZATION ====================
async function initGameConfig() {
    let gameId = getGameId();
    
    // Fix Bug 1: Load config từ playtest nếu không có gameId trong URL
    if (!gameId) {
        // Thử load từ playtest key
        const playtestKey = 'draw_runner_brand_config_playtest-draw-runner';
        const playtestConfig = localStorage.getItem(playtestKey);
        if (playtestConfig) {
            try {
                const parsed = JSON.parse(playtestConfig);
                Object.assign(BRAND_CONFIG, parsed);
                console.log('[Draw Runner] Loaded playtest config:', BRAND_CONFIG);
                // Reload logo ngay sau khi load playtest config
                reloadLogo();
            } catch (e) {
                console.warn('[Draw Runner] Failed to parse playtest config:', e);
            }
        }
    } else {
        const hasLocalConfig = loadBrandConfig(gameId);
        
        if (!hasLocalConfig && gameId) {
            console.log('[Draw Runner] No local config, trying Supabase...');
            await loadBrandConfigFromSupabase(gameId);
        }
    }
    
    // Load logo (nếu chưa load từ playtest)
    if (!bnbLogo.src || bnbLogo.src === window.location.href) {
        bnbLogo.src = getEffectiveLogoUrl();
    }
    
    // Init ground cache
    initGroundCache();
    
    // Send ready signal
    window.parent.postMessage({ 
        type: 'DRAW_RUNNER_GAME_READY' 
    }, '*');
}

// Listen for config updates from editor
window.addEventListener('message', (event) => {
    if (event.data.type === 'UPDATE_CONFIG') {
        const oldLogoUrl = BRAND_CONFIG.logoUrl;
        const oldStoryText = BRAND_CONFIG.storyText;
        
        // Map config từ editor format sang game format
        const config = event.data.config || {};
        if (config.logoUrl !== undefined) BRAND_CONFIG.logoUrl = config.logoUrl;
        if (config.storyText !== undefined) BRAND_CONFIG.storyText = config.storyText;
        
        // Luôn reload logo khi nhận UPDATE_CONFIG (để đảm bảo logo được load đúng)
        reloadLogo();
        
        console.log('[Draw Runner] Config updated:', BRAND_CONFIG);
        console.log('[Draw Runner] Logo URL:', BRAND_CONFIG.logoUrl);
        console.log('[Draw Runner] Story Text:', BRAND_CONFIG.storyText);
    }
});

// ==================== DOM READY ====================
document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('game-canvas');
    if (!canvas) {
        console.error('[Draw Runner] Canvas not found!');
        return;
    }
    
    ctx = canvas.getContext('2d');
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    // Load player sprites
    loadPlayerSprites();
    
    // Generate stars
    generateStars();
    
    // Initialize config
    initGameConfig();
    
    // Start game loop
    gameLoop();
    
    // Event listeners for drawing
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    
    canvas.addEventListener('touchstart', startDrawing, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stopDrawing, { passive: false });
    
    // Handle resize
    function handleResize() {
        const container = document.getElementById('game-container');
        if (!container) return;
        
        const windowRatio = window.innerWidth / window.innerHeight;
        const gameRatio = CANVAS_WIDTH / CANVAS_HEIGHT;
        
        if (windowRatio > gameRatio) {
            container.style.height = '100vh';
            container.style.width = `${100 * gameRatio / windowRatio}vw`;
        } else {
            container.style.width = '100vw';
            container.style.height = `${100 / gameRatio * windowRatio}vh`;
        }
        
        canvas.style.width = '100%';
        canvas.style.height = '100%';
    }
    
    window.addEventListener('resize', handleResize);
    handleResize();
});
