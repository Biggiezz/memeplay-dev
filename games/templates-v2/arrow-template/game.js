// Arrow Template - Game Logic

// ==================== IMPORT CONFIG ====================
import { 
    BRAND_CONFIG, 
    loadBrandConfig, 
    getEffectiveLogoUrl,
    getGameId,
    TEMPLATE_ID
} from './config.js';
import { getSupabaseClient } from '../core/supabase-client.js';

// ==================== GAME CONFIG ====================
const CONFIG = {
    CANVAS_WIDTH: 720,
    CANVAS_HEIGHT: 1000,
    INITIAL_STAMINA: 10, // seconds
    MAX_STAMINA: 11,
    BIRD_SIZE: 80,
    ARROW_SPEED: 25,
    BOW_X: 360,
    BOW_Y: 900,
    MAX_PULL: 150,
    
    // Bird types
    BIRDS: {
        BLACK: { type: 'black', points: 1, stamina: 3, spawnRate: 0.70 },
        WHITE: { type: 'white', points: 5, stamina: 3, spawnRate: 0.20 },
        RED: { type: 'red', points: -5, stamina: 0, spawnRate: 0.10 }
    },
    
    SPAWN_INTERVAL: 750, // ms between spawns
    MIN_BIRD_SPEED: 2,
    MAX_BIRD_SPEED: 5,
    MAX_ARROWS: 10,
    MAX_BIRDS: 10
};

// BRAND_CONFIG imported from config.js

// ==================== MOBILE DETECTION ====================
const IS_MOBILE = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const MOBILE_SPEED_MULTIPLIER = IS_MOBILE ? 1.7 : 1; // x1.7 speed on mobile

// ==================== GAME STATE ====================
let gameState = {
    isRunning: false,
    score: 0,
    combo: 0,
    stamina: CONFIG.INITIAL_STAMINA,
    birds: [],
    arrows: [],
    clouds: [],
    isPulling: false,
    pullStart: { x: 0, y: 0 },
    pullCurrent: { x: 0, y: 0 },
    lastSpawnTime: 0,
    lastFrameTime: 0
};

// ==================== OBJECT POOLS ====================
const arrowPool = [];
const birdPool = [];

function getArrow(x, y, vx, vy) {
    if (arrowPool.length > 0) {
        return arrowPool.pop().reset(x, y, vx, vy);
    }
    return new Arrow(x, y, vx, vy);
}

function releaseArrow(arrow) {
    arrowPool.push(arrow);
}

function getBird() {
    if (birdPool.length > 0) {
        return birdPool.pop().reset();
    }
    return new Bird();
}

function releaseBird(bird) {
    birdPool.push(bird);
}

// ==================== DOM ELEMENTS ====================
let canvas, ctx, gameContainer, startScreen, gameoverScreen;
let restartBtn, scoreDisplay, staminaFill, timerDisplay, comboDisplay;
let brandText, logoImg;

// ==================== ASSETS ====================
let binanceLogo = null;

// ==================== SOUND SYSTEM ====================
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playPullSound() {
    if (!audioCtx) return;
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(800, audioCtx.currentTime);
    filter.Q.setValueAtTime(5, audioCtx.currentTime);
    
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc1.frequency.linearRampToValueAtTime(350, audioCtx.currentTime + 0.15);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(180, audioCtx.currentTime);
    osc2.frequency.linearRampToValueAtTime(300, audioCtx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.24, audioCtx.currentTime); // Volume x3
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.15);
    
    osc1.start();
    osc2.start();
    osc1.stop(audioCtx.currentTime + 0.15);
    osc2.stop(audioCtx.currentTime + 0.15);
}

function playHitGoodSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    osc.frequency.setValueAtTime(1100, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function playHitBadSound() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'square';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.linearRampToValueAtTime(50, audioCtx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

// ==================== INIT CLOUDS ====================
function initClouds() {
    gameState.clouds = [];
    for (let i = 0; i < 5; i++) {
        gameState.clouds.push({
            x: Math.random() * CONFIG.CANVAS_WIDTH,
            y: 100 + Math.random() * 300,
            width: 80 + Math.random() * 60,
            speed: 0.3 + Math.random() * 0.3
        });
    }
}

// ==================== BIRD CLASS ====================
class Bird {
    constructor() {
        this.reset();
    }
    
    reset() {
        const rand = Math.random();
        let birdConfig;
        
        if (rand < CONFIG.BIRDS.BLACK.spawnRate) {
            birdConfig = CONFIG.BIRDS.BLACK;
        } else if (rand < CONFIG.BIRDS.BLACK.spawnRate + CONFIG.BIRDS.WHITE.spawnRate) {
            birdConfig = CONFIG.BIRDS.WHITE;
        } else {
            birdConfig = CONFIG.BIRDS.RED;
        }
        
        this.type = birdConfig.type;
        this.points = birdConfig.points;
        this.stamina = birdConfig.stamina;
        
        this.direction = Math.random() < 0.5 ? 1 : -1;
        this.x = this.direction === 1 ? -CONFIG.BIRD_SIZE : CONFIG.CANVAS_WIDTH;
        // Bird Y range: 120 to 400 (lowest flight path is 550px from ground)
        this.y = 120 + Math.random() * 280;
        this.speed = CONFIG.MIN_BIRD_SPEED + Math.random() * (CONFIG.MAX_BIRD_SPEED - CONFIG.MIN_BIRD_SPEED);
        
        // White bird flies 30% faster
        if (this.type === 'white') {
            this.speed *= 1.3;
        }
        
        this.width = CONFIG.BIRD_SIZE;
        this.height = CONFIG.BIRD_SIZE - 20;
        this.wingFrame = 0;
        this.wingSpeed = 0.075; // Reduced 50% for slower flapping
        this.alive = true;
        return this;
    }

    update(deltaTime) {
        this.x += this.speed * this.direction * MOBILE_SPEED_MULTIPLIER;
        this.wingFrame += this.wingSpeed;
        
        if ((this.direction === 1 && this.x > CONFIG.CANVAS_WIDTH + this.width) ||
            (this.direction === -1 && this.x < -this.width)) {
            this.alive = false;
        }
    }

    draw(ctx) {
        ctx.save();
        
        if (this.direction === -1) {
            ctx.translate(this.x + this.width / 2, this.y);
            ctx.scale(-1, 1);
            ctx.translate(-this.width / 2, 0);
        } else {
            ctx.translate(this.x, this.y);
        }
        
        let bodyColor, wingColor, eyeColor;
        if (this.type === 'black') {
            bodyColor = '#2d2d2d';
            wingColor = '#1a1a1a';
            eyeColor = '#fff';
        } else if (this.type === 'white') {
            bodyColor = '#f5f5f5';
            wingColor = '#e0e0e0';
            eyeColor = '#000';
        } else {
            bodyColor = '#ff4444';
            wingColor = '#cc0000';
            eyeColor = '#fff';
        }
        
        // Body
        ctx.fillStyle = bodyColor;
        ctx.fillRect(20, 20, 40, 30);
        
        // Head
        ctx.fillRect(50, 15, 25, 25);
        
        // Beak
        ctx.fillStyle = '#FFA500';
        ctx.fillRect(75, 22, 12, 8);
        
        // Eye
        ctx.fillStyle = eyeColor;
        ctx.fillRect(60, 20, 6, 6);
        
        // Wing animation
        const wingY = Math.sin(this.wingFrame * Math.PI) * 8;
        ctx.fillStyle = wingColor;
        ctx.fillRect(25, 15 + wingY, 25, 15);
        
        // Tail
        ctx.fillStyle = wingColor;
        ctx.fillRect(5, 25, 15, 10);
        
        // Logo on white bird's back (never mirrored)
        if (this.type === 'white' && binanceLogo && binanceLogo.complete) {
            if (this.direction === -1) {
                // Un-flip the logo when bird is mirrored
                ctx.save();
                ctx.scale(-1, 1);
                ctx.drawImage(binanceLogo, -65, -20, 50, 50);
                ctx.restore();
            } else {
                ctx.drawImage(binanceLogo, 15, -20, 50, 50);
            }
        }
        
        // Bomb indicator for red bird
        if (this.type === 'red') {
            ctx.fillStyle = '#FFD700';
            ctx.font = 'bold 16px Arial';
            ctx.fillText('💣', 30, 45);
        }
        
        ctx.restore();
    }

    checkCollision(arrow) {
        return arrow.x > this.x && 
               arrow.x < this.x + this.width &&
               arrow.y > this.y && 
               arrow.y < this.y + this.height;
    }
}

// ==================== ARROW CLASS ====================
class Arrow {
    constructor(x, y, vx, vy) {
        this.reset(x, y, vx, vy);
    }
    
    reset(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.rotation = Math.atan2(vy, vx);
        this.alive = true;
        this.trail = [];
        return this;
    }

    update(deltaTime) {
        this.trail.push({ x: this.x, y: this.y });
        if (this.trail.length > 10) this.trail.shift();
        
        this.x += this.vx * MOBILE_SPEED_MULTIPLIER;
        this.y += this.vy * MOBILE_SPEED_MULTIPLIER;
        this.vy += 0.1 * MOBILE_SPEED_MULTIPLIER;
        this.rotation = Math.atan2(this.vy, this.vx);
        
        if (this.y < -50 || this.y > CONFIG.CANVAS_HEIGHT + 50 ||
            this.x < -50 || this.x > CONFIG.CANVAS_WIDTH + 50) {
            this.alive = false;
            if (gameState.combo > 0) {
                gameState.combo = 0;
                hideCombo();
            }
        }
    }

    draw(ctx) {
        // Trail
        ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < this.trail.length; i++) {
            if (i === 0) {
                ctx.moveTo(this.trail[i].x, this.trail[i].y);
            } else {
                ctx.lineTo(this.trail[i].x, this.trail[i].y);
            }
        }
        ctx.stroke();
        
        // Arrow (+30% size)
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-39, -4, 78, 8);
        
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(46, 0);
        ctx.lineTo(33, -10);
        ctx.lineTo(33, 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(-39, -8, 13, 4);
        ctx.fillRect(-39, 4, 13, 4);
        
        ctx.restore();
    }
}

// ==================== DRAW FUNCTIONS ====================
function drawBackground() {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    gameState.clouds.forEach(cloud => {
        const w = cloud.width;
        ctx.fillRect(cloud.x, cloud.y, w * 0.6, 20);
        ctx.fillRect(cloud.x + w * 0.1, cloud.y - 15, w * 0.4, 20);
        ctx.fillRect(cloud.x + w * 0.3, cloud.y - 25, w * 0.3, 20);
        ctx.fillRect(cloud.x - w * 0.1, cloud.y + 10, w * 0.5, 15);
    });
    
    // Ground
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(0, CONFIG.CANVAS_HEIGHT - 50, CONFIG.CANVAS_WIDTH, 50);
    
    // Grass
    ctx.fillStyle = '#228B22';
    ctx.fillRect(0, CONFIG.CANVAS_HEIGHT - 60, CONFIG.CANVAS_WIDTH, 15);
}

function drawBow() {
    const bowX = CONFIG.BOW_X;
    const bowY = CONFIG.BOW_Y;
    
    ctx.save();
    
    let pullX = 0, pullY = -1, pullDist = 0;
    if (gameState.isPulling) {
        pullX = gameState.pullStart.x - gameState.pullCurrent.x;
        pullY = gameState.pullStart.y - gameState.pullCurrent.y;
        pullDist = Math.min(Math.sqrt(pullX * pullX + pullY * pullY), CONFIG.MAX_PULL);
        
        const len = Math.sqrt(pullX * pullX + pullY * pullY);
        if (len > 0) {
            pullX = (pullX / len) * pullDist;
            pullY = (pullY / len) * pullDist;
        }
    }
    
    // Bow body (+30% size)
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(bowX, bowY, 78, Math.PI * 1.2, Math.PI * 1.8);
    ctx.stroke();
    
    // Bow string
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 4;
    ctx.beginPath();
    
    const leftX = bowX + Math.cos(Math.PI * 1.2) * 78;
    const leftY = bowY + Math.sin(Math.PI * 1.2) * 78;
    const rightX = bowX + Math.cos(Math.PI * 1.8) * 78;
    const rightY = bowY + Math.sin(Math.PI * 1.8) * 78;
    
    if (gameState.isPulling && pullDist > 10) {
        const stringPullX = bowX - pullX * 0.25;
        const stringPullY = bowY - pullY * 0.25;
        
        ctx.moveTo(leftX, leftY);
        ctx.lineTo(stringPullX, stringPullY);
        ctx.lineTo(rightX, rightY);
    } else {
        ctx.moveTo(leftX, leftY);
        ctx.quadraticCurveTo(bowX, bowY + 20, rightX, rightY);
    }
    ctx.stroke();
    
    // Arrow on string when pulling (+30% size)
    if (gameState.isPulling && pullDist > 10) {
        ctx.save();
        ctx.translate(bowX - pullX * 0.25, bowY - pullY * 0.25);
        ctx.rotate(Math.atan2(pullY, pullX));
        
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(0, -4, 91, 8);
        
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(98, 0);
        ctx.lineTo(85, -10);
        ctx.lineTo(85, 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(0, -8, 13, 4);
        ctx.fillRect(0, 4, 13, 4);
        
        ctx.restore();
        
        // Aim line
        ctx.strokeStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(bowX, bowY);
        const aimLen = 200;
        const aimX = bowX + (pullX / pullDist) * aimLen;
        const aimY = bowY + (pullY / pullDist) * aimLen;
        ctx.lineTo(aimX, aimY);
        ctx.stroke();
        ctx.setLineDash([]);
    } else {
        // Default arrow pointing up (+30% size)
        ctx.save();
        ctx.translate(bowX, bowY - 39);
        ctx.rotate(-Math.PI / 2);
        
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-39, -4, 91, 8);
        
        ctx.fillStyle = '#555';
        ctx.beginPath();
        ctx.moveTo(59, 0);
        ctx.lineTo(46, -10);
        ctx.lineTo(46, 10);
        ctx.closePath();
        ctx.fill();
        
        ctx.fillStyle = '#ff6b6b';
        ctx.fillRect(-39, -8, 13, 4);
        ctx.fillRect(-39, 4, 13, 4);
        
        ctx.restore();
    }
    
    ctx.restore();
}

// ==================== UPDATE FUNCTIONS ====================
function updateClouds(deltaTime) {
    gameState.clouds.forEach(cloud => {
        cloud.x += cloud.speed;
        if (cloud.x > CONFIG.CANVAS_WIDTH + 100) {
            cloud.x = -150;
            cloud.y = 100 + Math.random() * 300;
        }
    });
}

function spawnBird(timestamp) {
    if (gameState.birds.length < CONFIG.MAX_BIRDS && 
        timestamp - gameState.lastSpawnTime > CONFIG.SPAWN_INTERVAL) {
        gameState.birds.push(getBird());
        gameState.lastSpawnTime = timestamp;
    }
}

function checkCollisions() {
    gameState.arrows.forEach(arrow => {
        if (!arrow.alive) return;
        
        gameState.birds.forEach(bird => {
            if (!bird.alive) return;
            
            if (bird.checkCollision(arrow)) {
                bird.alive = false;
                arrow.alive = false;
                
                if (bird.type === 'red') {
                    // Red bird = instant game over!
                    playHitBadSound();
                    gameOver();
                    return;
                } else {
                    gameState.combo++;
                    const points = bird.points * gameState.combo;
                    gameState.score += points;
                    gameState.stamina = Math.min(CONFIG.MAX_STAMINA, gameState.stamina + bird.stamina);
                    
                    showPointPopup(bird.x, bird.y, points);
                    playHitGoodSound();
                    
                    if (gameState.combo >= 2) {
                        showCombo(gameState.combo);
                    }
                }
                
                updateHUD();
            }
        });
    });
}

// ==================== UI FUNCTIONS ====================
function updateHUD() {
    scoreDisplay.textContent = gameState.score;
    
    const staminaPercent = (gameState.stamina / CONFIG.MAX_STAMINA) * 100;
    staminaFill.style.width = staminaPercent + '%';
    
    timerDisplay.textContent = gameState.stamina.toFixed(1) + 's';
    
    if (gameState.stamina <= 3) {
        staminaFill.classList.add('warning');
        timerDisplay.classList.add('warning');
    } else {
        staminaFill.classList.remove('warning');
        timerDisplay.classList.remove('warning');
    }
}

function showCombo(combo) {
    comboDisplay.textContent = `COMBO x${combo}!`;
    comboDisplay.classList.add('show');
    
    setTimeout(() => {
        comboDisplay.classList.remove('show');
    }, 800);
}

function hideCombo() {
    comboDisplay.classList.remove('show');
}

function showPointPopup(x, y, points) {
    const popup = document.createElement('div');
    popup.className = `point-popup ${points > 0 ? 'positive' : 'negative'}`;
    popup.textContent = points > 0 ? `+${points}` : points;
    popup.style.right = '50px';
    popup.style.bottom = '200px';
    popup.style.left = 'auto';
    popup.style.top = 'auto';
    gameContainer.appendChild(popup);
    
    setTimeout(() => popup.remove(), 1000);
}

// ==================== INPUT HANDLERS ====================
function getPointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = CONFIG.CANVAS_WIDTH / rect.width;
    const scaleY = CONFIG.CANVAS_HEIGHT / rect.height;
    
    let clientX, clientY;
    if (e.touches) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * scaleY
    };
}

function onPointerDown(e) {
    if (!gameState.isRunning) return;
    e.preventDefault();
    
    const pos = getPointerPos(e);
    gameState.isPulling = true;
    gameState.pullStart = { x: pos.x, y: pos.y };
    gameState.pullCurrent = { x: pos.x, y: pos.y };
    playPullSound();
}

function onPointerMove(e) {
    if (!gameState.isPulling) return;
    e.preventDefault();
    
    gameState.pullCurrent = getPointerPos(e);
}

function onPointerUp(e) {
    if (!gameState.isPulling) return;
    e.preventDefault();
    
    const pullX = gameState.pullStart.x - gameState.pullCurrent.x;
    const pullY = gameState.pullStart.y - gameState.pullCurrent.y;
    const pullDist = Math.sqrt(pullX * pullX + pullY * pullY);
    
    if (pullDist > 20) {
        const speed = Math.min(pullDist / CONFIG.MAX_PULL, 1) * CONFIG.ARROW_SPEED;
        const vx = (pullX / pullDist) * speed;
        const vy = (pullY / pullDist) * speed;
        
        if (gameState.arrows.length < CONFIG.MAX_ARROWS) {
            gameState.arrows.push(getArrow(CONFIG.BOW_X, CONFIG.BOW_Y, vx, vy));
        }
    }
    
    gameState.isPulling = false;
}

// ==================== GAME LOOP ====================
function gameLoop(timestamp) {
    if (!gameState.isRunning) return;
    
    const deltaTime = timestamp - gameState.lastFrameTime;
    gameState.lastFrameTime = timestamp;
    
    gameState.stamina -= deltaTime / 1000;
    
    if (gameState.stamina <= 0) {
        gameOver();
        return;
    }
    
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    updateClouds(deltaTime);
    spawnBird(timestamp);
    
    gameState.birds = gameState.birds.filter(bird => {
        bird.update(deltaTime);
        if (!bird.alive) {
            releaseBird(bird);
            return false;
        }
        return true;
    });
    
    gameState.arrows = gameState.arrows.filter(arrow => {
        arrow.update(deltaTime);
        if (!arrow.alive) {
            releaseArrow(arrow);
            return false;
        }
        return true;
    });
    
    checkCollisions();
    
    drawBackground();
    gameState.birds.forEach(bird => bird.draw(ctx));
    gameState.arrows.forEach(arrow => arrow.draw(ctx));
    drawBow();
    
    updateHUD();
    
    requestAnimationFrame(gameLoop);
}

// ==================== GAME CONTROL ====================
function startGame(e) {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    initAudio();
    
    // Use gameId from URL if available, otherwise use template ID
    const gameId = getGameId() || TEMPLATE_ID;
    // Send GAME_START to parent for playtime tracking
    window.parent.postMessage({ type: 'GAME_START', gameId: gameId }, '*');
    
    gameState = {
        isRunning: true,
        score: 0,
        combo: 0,
        stamina: CONFIG.INITIAL_STAMINA,
        birds: [],
        arrows: [],
        clouds: gameState.clouds || [],
        isPulling: false,
        pullStart: { x: 0, y: 0 },
        pullCurrent: { x: 0, y: 0 },
        lastSpawnTime: 0,
        lastFrameTime: performance.now()
    };
    
    if (gameState.clouds.length === 0) {
        initClouds();
    }
    
    startScreen.style.display = 'none';
    gameoverScreen.style.display = 'none';
    
    updateHUD();
    
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameState.isRunning = false;
    
    playHitBadSound();
    
    gameoverScreen.style.display = 'flex';
    document.querySelector('#final-score span').textContent = gameState.score;
    
    // Use gameId from URL if available, otherwise use template ID
    const gameId = getGameId() || TEMPLATE_ID;
    
    // Send GAME_OVER to parent for playtime tracking and rewards
    window.parent.postMessage({ type: 'GAME_OVER', gameId: gameId }, '*');
    
    // Send GAME_SCORE to parent for leaderboard
    window.parent.postMessage({ 
        type: 'GAME_SCORE', 
        gameId: gameId, 
        score: gameState.score,
        level: 1 // Arrow game doesn't have levels
    }, '*');
}

// ==================== APPLY BRAND CONFIG ====================
function applyBrandConfig() {
    // Apply map color to game container background
    const mapColor = BRAND_CONFIG.mapColor || '#87CEEB';
    gameContainer.style.background = `linear-gradient(180deg, ${mapColor} 0%, ${adjustColor(mapColor, 10)} 30%, ${adjustColor(mapColor, 20)} 60%, ${adjustColor(mapColor, 40)} 100%)`;
    
    // Apply story text
    if (brandText) {
        brandText.textContent = BRAND_CONFIG.storyText || 'MEMEPLAY';
    }
    
    // Apply logo to game over screen
    const effectiveLogo = getEffectiveLogoUrl();
    if (logoImg) {
        logoImg.src = effectiveLogo;
    }
    
    // Update bird logo (binanceLogo image object)
    if (binanceLogo) {
        binanceLogo.src = effectiveLogo;
    }
}

// Helper function to adjust color brightness
function adjustColor(hex, percent) {
    const num = parseInt(hex.replace('#', ''), 16);
    const r = Math.min(255, ((num >> 16) & 0xff) + percent);
    const g = Math.min(255, ((num >> 8) & 0xff) + percent);
    const b = Math.min(255, (num & 0xff) + percent);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// ==================== SUPABASE FALLBACK ====================
async function loadBrandConfigFromSupabase(gameId) {
    if (!gameId) {
        console.warn('[Arrow] No gameId for Supabase config load');
        return false;
    }
    try {
        const supabase = await getSupabaseClient();
        if (!supabase) {
            console.warn('[Arrow] Supabase client unavailable');
            return false;
        }
        
        const { data, error } = await supabase.rpc('list_user_created_games', {
            p_template_id: 'arrow-template'
        });
        
        if (error) {
            console.error('[Arrow] list_user_created_games error:', error.message || error);
            return false;
        }
        
        if (!Array.isArray(data)) {
            console.warn('[Arrow] Unexpected Supabase response:', data);
            return false;
        }
        
        // Find game by ID
        const foundGame = data.find(item => {
            const id = item?.game_id || item?.id;
            return id === gameId;
        });
        
        if (!foundGame) {
            console.warn(`[Arrow] Game ${gameId} not found in Supabase`);
            return false;
        }
        
        // Apply config from Supabase
        const config = {
            logoUrl: foundGame.fragment_logo_url || '',
            storyText: foundGame.story_one || 'MEMEPLAY',
            mapColor: foundGame.map_color || '#87CEEB'
        };
        
        Object.assign(BRAND_CONFIG, config);
        console.log('[Arrow] Loaded config from Supabase:', config);
        return true;
    } catch (err) {
        console.error('[Arrow] loadBrandConfigFromSupabase error:', err);
        return false;
    }
}

// ==================== INITIALIZATION ====================
async function initGame() {
    const gameId = getGameId();
    
    // Try localStorage first, then fallback to Supabase
    const hasLocalConfig = loadBrandConfig(gameId);
    if (!hasLocalConfig && gameId) {
        console.log('[Arrow] No local config, trying Supabase...');
        await loadBrandConfigFromSupabase(gameId);
    }
    
    // Get DOM elements
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');
    gameContainer = document.getElementById('game-container');
    startScreen = document.getElementById('start-screen');
    gameoverScreen = document.getElementById('gameover-screen');
    restartBtn = document.getElementById('restart-btn');
    scoreDisplay = document.getElementById('score');
    staminaFill = document.getElementById('stamina-fill');
    timerDisplay = document.getElementById('timer-display');
    comboDisplay = document.getElementById('combo-display');
    brandText = document.querySelector('.brand');
    logoImg = document.querySelector('.binance-logo-gameover img');
    
    // Set canvas size
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;
    
    // Load logo using getEffectiveLogoUrl()
    binanceLogo = new Image();
    binanceLogo.src = getEffectiveLogoUrl();
    
    // Apply brand config to UI
    applyBrandConfig();
    
    // Add event listeners
    canvas.addEventListener('mousedown', onPointerDown);
    canvas.addEventListener('mousemove', onPointerMove);
    canvas.addEventListener('mouseup', onPointerUp);
    canvas.addEventListener('mouseleave', onPointerUp);
    
    canvas.addEventListener('touchstart', onPointerDown, { passive: false });
    canvas.addEventListener('touchmove', onPointerMove, { passive: false });
    canvas.addEventListener('touchend', onPointerUp, { passive: false });
    
    startScreen.addEventListener('click', startGame);
    startScreen.addEventListener('touchstart', startGame);
    restartBtn.addEventListener('click', startGame);
    
    // Initialize clouds
    initClouds();
    
    // Listen for UPDATE_CONFIG message from editor
    window.addEventListener('message', handleConfigMessage);
    
    // Send ready signal to parent (editor)
    sendReadySignal();
}

// ==================== MESSAGE HANDLING ====================
function handleConfigMessage(event) {
    if (event.data && event.data.type === 'UPDATE_CONFIG') {
        const config = event.data.config;
        if (config) {
            // Update BRAND_CONFIG
            if (config.logoUrl !== undefined) {
                BRAND_CONFIG.logoUrl = config.logoUrl;
            }
            if (config.storyText !== undefined) {
                BRAND_CONFIG.storyText = config.storyText;
            }
            if (config.mapColor !== undefined) {
                BRAND_CONFIG.mapColor = config.mapColor;
            }
            
            // Reload logo image
            binanceLogo = new Image();
            binanceLogo.src = getEffectiveLogoUrl();
            
            // Apply updated config
            applyBrandConfig();
            
            console.log('[Arrow] Applied config update:', config);
        }
    }
}

function sendReadySignal() {
    const gameId = getGameId() || TEMPLATE_ID;
    window.parent.postMessage({
        type: 'ARROW_GAME_READY',
        gameId: gameId
    }, '*');
    console.log('[Arrow] Sent ready signal');
}

// Start when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}

// Expose for editor
window.applyBrandConfig = applyBrandConfig;
window.sendReadySignal = sendReadySignal;

