// Space Jump Template - Game Logic
import { BRAND_CONFIG, loadBrandConfig, saveBrandConfig, getGameId } from './config.js';
import { getSupabaseClient } from '../core/supabase-client.js';

const TEMPLATE_ID = 'space-jump-template';

// ============ CONFIG ============
const CONFIG = {
    CANVAS_WIDTH: 720,
    CANVAS_HEIGHT: 1000,
    BG_COLOR: '#0a0e27',
    PLAYER_WIDTH: 120,
    PLAYER_HEIGHT: 160,
    GRAVITY: 0.5,
    JUMP_FORCE: -33,
    MOVE_SPEED: 7.0,
    MOBILE_GRAVITY: 0.6,
    MOBILE_JUMP_FORCE: -39.6,
    MOBILE_DELTA_MULTIPLIER: 0.75,
    PLATFORM_MIN_WIDTH: 60,
    PLATFORM_MAX_WIDTH: 120,
    PLATFORM_HEIGHT: 15,
    PLATFORM_COLORS: ['#6366f1', '#10b981', '#ef4444'],
    MOVING_PLATFORM_COLOR: '#f59e0b',
    MOVING_PLATFORM_START_SCORE: 50,
    BASE_PLATFORM_SPACING: 160,
    MAX_PLATFORM_SPACING: 280,
    SPACING_INCREASE_PER_10_SCORE: 20,
    BLACK_HOLE_RADIUS: 51,
    BLACK_HOLE_START_SCORE: 30,
    BLACK_HOLE_CHANCE: 0.15,
    STAR_COUNT: 100,
    PARTICLE_COUNT: 15
};

// ============ DOM ELEMENTS ============
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const playAgainBtn = document.getElementById('play-again-btn');
const gameLogoEl = document.getElementById('game-logo');
const gameStoryEl = document.getElementById('game-story');

canvas.width = CONFIG.CANVAS_WIDTH;
canvas.height = CONFIG.CANVAS_HEIGHT;

// ============ DEVICE DETECTION ============
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || ('ontouchstart' in window);
const GRAVITY = isMobile ? CONFIG.MOBILE_GRAVITY : CONFIG.GRAVITY;
const JUMP_FORCE = isMobile ? CONFIG.MOBILE_JUMP_FORCE : CONFIG.JUMP_FORCE;
const DELTA_MULT = isMobile ? CONFIG.MOBILE_DELTA_MULTIPLIER : 1;

// ============ GAME STATE ============
let gameState = 'start';
let score = 0;
let cameraY = 0;
let lastFrameTime = 0;

let player = {
    x: CONFIG.CANVAS_WIDTH / 2 - CONFIG.PLAYER_WIDTH / 2,
    y: CONFIG.CANVAS_HEIGHT - 350,
    width: CONFIG.PLAYER_WIDTH,
    height: CONFIG.PLAYER_HEIGHT,
    velocityX: 0,
    velocityY: 0,
    scale: 1,
    facingRight: false
};

let platforms = [];
let blackHoles = [];
let particles = [];
let stars = [];
let meteors = [];
let platformDebris = [];
let meteorAlertTime = 0;
let meteorAlertTriggered = false;
let keys = { left: false, right: false };

// ============ PRE-RENDERED PLAYER CACHE ============
let playerCacheLeft = null;
let playerCacheRight = null;
let playerCacheScale = 1; // Track last rendered scale for kneeBend animation
let touchControls = { left: false, right: false };
let audioCtx = null;
let gameStartTime = Date.now();
let lastPlatformTime = Date.now();

// Head logo image (for custom brand)
let headLogoImg = null;

// ============ BRAND CONFIG ============
function applyBrandConfig(config) {
    if (config.gameOverLogoUrl && gameLogoEl) {
        gameLogoEl.src = config.gameOverLogoUrl;
    }
    if (config.storyText && gameStoryEl) {
        gameStoryEl.textContent = config.storyText;
    }
    if (config.headLogoUrl) {
        headLogoImg = new Image();
        headLogoImg.src = config.headLogoUrl;
    } else {
        headLogoImg = null;
    }
}

// ✅ Load brand config from Supabase (fallback when localStorage doesn't have it)
async function loadBrandConfigFromSupabase(gameId) {
    if (!gameId) {
        console.warn('[SpaceJump] Missing gameId, skip loading from Supabase');
        return false;
    }
    try {
        const supabase = await getSupabaseClient();
        if (!supabase) {
            console.warn('[SpaceJump] Supabase client unavailable');
            return false;
        }
        const { data, error } = await supabase.rpc('list_user_created_games', {
            p_template_id: TEMPLATE_ID
        });
        if (error) {
            console.error('[SpaceJump] list_user_created_games error:', error.message || error);
            return false;
        }
        if (!Array.isArray(data)) {
            console.warn('[SpaceJump] Unexpected response:', data);
            return false;
        }
        const foundGame = data.find(item => {
            const id = item?.game_id || item?.id;
            return id === gameId;
        });
        if (!foundGame) {
            console.warn(`[SpaceJump] Game ${gameId} not found in Supabase`);
            return false;
        }
        
        // ✅ Apply config from Supabase (match fields from editor-adapter sync)
        const config = {
            headLogoUrl: foundGame.fragment_logo_url || '',
            gameOverLogoUrl: foundGame.fragment_logo_url || '',
            storyText: foundGame.story_one || foundGame.token_story || 'memeplay'
        };
        console.log('[SpaceJump] ✅ Loaded config from Supabase:', config);
        Object.assign(BRAND_CONFIG, config);
        applyBrandConfig(config);
        
        // Save to localStorage for next time
        saveBrandConfig(config);
        return true;
    } catch (error) {
        console.error('[SpaceJump] Error loading from Supabase:', error);
        return false;
    }
}

// ✅ Get game ID from URL
const EMBEDDED_GAME_ID = getGameId();
const isPublicView = !!EMBEDDED_GAME_ID;

// ✅ Initialize brand config
async function initBrandConfig() {
    const gameId = EMBEDDED_GAME_ID;
    
    if (gameId) {
        // Public view: try localStorage first, then Supabase
        const hasLocal = loadBrandConfig(gameId);
        if (!hasLocal) {
            const hasSupabase = await loadBrandConfigFromSupabase(gameId);
            if (!hasSupabase) {
                console.log('[SpaceJump] Using default config');
            }
        } else {
            applyBrandConfig(BRAND_CONFIG);
        }
    } else {
        // Editor mode: load from playtest key
        loadBrandConfig();
        try {
            const playtestConfig = localStorage.getItem('space_jump_brand_config_playtest');
            if (playtestConfig) {
                const parsed = JSON.parse(playtestConfig);
                console.log('[SpaceJump] Loaded playtest config:', parsed);
                Object.assign(BRAND_CONFIG, parsed);
            }
        } catch (e) {
            console.warn('[SpaceJump] Failed to load playtest config:', e);
        }
        applyBrandConfig(BRAND_CONFIG);
    }
}

// Start loading config
initBrandConfig();

// Listen for UPDATE_CONFIG from editor
window.addEventListener('message', (e) => {
    if (e.data?.type === 'UPDATE_CONFIG') {
        console.log('[SpaceJump] Received UPDATE_CONFIG:', e.data.config);
        applyBrandConfig(e.data.config);
        saveBrandConfig(e.data.config);
    }
});

// ============ GAME FUNCTIONS ============
function initStars() {
    stars = [];
    for (let i = 0; i < CONFIG.STAR_COUNT; i++) {
        stars.push({
            x: Math.random() * CONFIG.CANVAS_WIDTH,
            y: Math.random() * CONFIG.CANVAS_HEIGHT * 3,
            size: 1 + Math.random() * 2,
            opacity: 0.5 + Math.random() * 0.5
        });
    }
}

function initPlatforms() {
    platforms = [];
    platforms.push({
        x: CONFIG.CANVAS_WIDTH / 2 - 60,
        y: CONFIG.CANVAS_HEIGHT - 200,
        width: 120,
        height: CONFIG.PLATFORM_HEIGHT,
        color: CONFIG.PLATFORM_COLORS[0],
        velocityX: 0,
        passed: false
    });

    let y = CONFIG.CANVAS_HEIGHT - 350;
    while (y > -CONFIG.CANVAS_HEIGHT) {
        y -= CONFIG.BASE_PLATFORM_SPACING + Math.random() * 40;
        addPlatform(y);
    }
}

function addPlatform(y) {
    const width = CONFIG.PLATFORM_MIN_WIDTH + Math.random() * (CONFIG.PLATFORM_MAX_WIDTH - CONFIG.PLATFORM_MIN_WIDTH);
    const x = Math.random() * (CONFIG.CANVAS_WIDTH - width);
    const isMoving = score >= CONFIG.MOVING_PLATFORM_START_SCORE && Math.random() < 0.3;
    
    platforms.push({
        x: x, y: y, width: width, height: CONFIG.PLATFORM_HEIGHT,
        color: isMoving ? CONFIG.MOVING_PLATFORM_COLOR : CONFIG.PLATFORM_COLORS[Math.floor(Math.random() * CONFIG.PLATFORM_COLORS.length)],
        velocityX: isMoving ? (Math.random() > 0.5 ? 2 : -2) : 0,
        passed: false
    });

    if (score >= CONFIG.BLACK_HOLE_START_SCORE && Math.random() < CONFIG.BLACK_HOLE_CHANCE) {
        const lastBH = blackHoles[blackHoles.length - 1];
        if (!lastBH || Math.abs((y - 80) - lastBH.y) >= 700) {
            blackHoles.push({
                x: Math.random() * (CONFIG.CANVAS_WIDTH - 60) + 30,
                y: y - 80,
                radius: CONFIG.BLACK_HOLE_RADIUS
            });
        }
    }
}

function spawnParticles(x, y) {
    for (let i = 0; i < CONFIG.PARTICLE_COUNT; i++) {
        particles.push({
            x: x, y: y,
            velocityX: (Math.random() - 0.5) * 15,
            velocityY: -3 - Math.random() * 10,
            life: 1,
            size: 2 + Math.random() * 3
        });
    }
}

// ============ AUDIO ============
const failSound = new Audio('assets/fail.wav');
failSound.volume = 0.5;

function getAudioContext() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function playGameOverSound() {
    failSound.currentTime = 0;
    failSound.play();
}

function playAlertSound() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(400, now + i * 0.5);
        osc.frequency.linearRampToValueAtTime(600, now + i * 0.5 + 0.25);
        osc.frequency.linearRampToValueAtTime(400, now + i * 0.5 + 0.5);
        gain.gain.setValueAtTime(0.2, now + i * 0.5);
        gain.gain.setValueAtTime(0.2, now + i * 0.5 + 0.4);
        gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.5 + 0.5);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.5);
        osc.stop(now + i * 0.5 + 0.5);
    }
}

function playBounceSound() {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.value = 523.25;
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.15);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.value = 659.25;
    gain2.gain.setValueAtTime(0.15, now + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.05);
    osc2.stop(now + 0.25);
}

// ============ GAME CONTROL ============
function resetGame() {
    score = 0;
    cameraY = 0;
    gameStartTime = Date.now();
    lastPlatformTime = Date.now();
    player = {
        x: CONFIG.CANVAS_WIDTH / 2 - CONFIG.PLAYER_WIDTH / 2,
        y: CONFIG.CANVAS_HEIGHT - 350,
        width: CONFIG.PLAYER_WIDTH,
        height: CONFIG.PLAYER_HEIGHT,
        velocityX: 0, velocityY: 0, scale: 1, facingRight: false
    };
    platforms = [];
    blackHoles = [];
    particles = [];
    meteors = [];
    platformDebris = [];
    meteorAlertTime = 0;
    meteorAlertTriggered = false;
    initStars();
    initPlatforms();
}

function update(deltaTime) {
    if (gameState !== 'playing') return;
    const dt = deltaTime * DELTA_MULT;
    const gameTime = (Date.now() - gameStartTime) / 1000;

    if (keys.left || touchControls.left) {
        player.velocityX = -CONFIG.MOVE_SPEED;
        player.facingRight = false;
    } else if (keys.right || touchControls.right) {
        player.velocityX = CONFIG.MOVE_SPEED;
        player.facingRight = true;
    } else {
        player.velocityX *= 0.9;
    }

    player.velocityY += GRAVITY * dt;
    player.x += player.velocityX * dt;
    player.y += player.velocityY * dt;

    if (player.x + player.width < 0) player.x = CONFIG.CANVAS_WIDTH;
    else if (player.x > CONFIG.CANVAS_WIDTH) player.x = -player.width;

    if (player.velocityY > 0) player.scale += (0.95 - player.scale) * 0.1;
    else player.scale += (1.05 - player.scale) * 0.1;

    if (player.y < CONFIG.CANVAS_HEIGHT / 2) cameraY = player.y - CONFIG.CANVAS_HEIGHT / 2;

    platforms.forEach(p => {
        if (gameTime > 5 && p.color === '#ef4444' && p.velocityX === 0) {
            p.velocityX = Math.random() > 0.5 ? 3 : -3;
        }
        if (p.velocityX !== 0) {
            p.x += p.velocityX * dt;
            if (p.x <= 0 || p.x + p.width >= CONFIG.CANVAS_WIDTH) p.velocityX *= -1;
        }
    });

    if (player.velocityY > 0) {
        platforms.forEach(p => {
            const hitboxLeft = player.x + player.width / 2 - 27;
            const hitboxRight = player.x + player.width / 2 + 27;
            if (hitboxRight > p.x &&
                hitboxLeft < p.x + p.width &&
                player.y + player.height > p.y &&
                player.y + player.height < p.y + p.height + 10) {
                
                player.velocityY = JUMP_FORCE;
                player.scale = 1.2;
                lastPlatformTime = Date.now();
                spawnParticles(player.x + player.width / 2, p.y);
                playBounceSound();
                
                if (gameTime > 10 && p.color === '#10b981' && !p.shattered) {
                    p.shattered = true;
                    const debrisCount = 8;
                    for (let i = 0; i < debrisCount; i++) {
                        platformDebris.push({
                            x: p.x + (p.width / debrisCount) * i + p.width / debrisCount / 2,
                            y: p.y,
                            width: p.width / debrisCount,
                            height: p.height,
                            color: p.color,
                            velocityX: (Math.random() - 0.5) * 10,
                            velocityY: -3 - Math.random() * 5,
                            rotation: 0,
                            rotationSpeed: (Math.random() - 0.5) * 0.5,
                            life: 1
                        });
                    }
                }
            }
        });
    }

    blackHoles.forEach(bh => {
        const dx = (player.x + player.width / 2) - bh.x;
        const dy = (player.y + player.height / 2) - bh.y;
        if (Math.sqrt(dx * dx + dy * dy) < bh.radius) gameOver();
    });

    const topY = cameraY - CONFIG.CANVAS_HEIGHT;
    const highestPlatform = Math.min(...platforms.map(p => p.y));
    if (highestPlatform > topY) {
        const spacing = Math.min(CONFIG.BASE_PLATFORM_SPACING + Math.floor(score / 10) * CONFIG.SPACING_INCREASE_PER_10_SCORE, CONFIG.MAX_PLATFORM_SPACING);
        addPlatform(highestPlatform - spacing - Math.random() * 40);
    }

    platforms = platforms.filter(p => {
        if (p.shattered) return false;
        return p.y - cameraY < CONFIG.CANVAS_HEIGHT + 100;
    });
    
    platformDebris.forEach(d => {
        d.x += d.velocityX * dt;
        d.y += d.velocityY * dt;
        d.velocityY += 0.3 * dt;
        d.rotation += d.rotationSpeed * dt;
        d.life -= 0.1 * dt;
    });
    platformDebris = platformDebris.filter(d => d.life > 0);
    blackHoles = blackHoles.filter(bh => bh.y - cameraY < CONFIG.CANVAS_HEIGHT + 100);
    
    if (gameTime > 18 && !meteorAlertTriggered) {
        meteorAlertTriggered = true;
        meteorAlertTime = Date.now();
        playAlertSound();
    }
    
    if (gameTime > 20 && Math.random() < 0.01) {
        const lastMeteor = meteors[meteors.length - 1];
        if (!lastMeteor || Math.abs((cameraY - 50) - lastMeteor.y) >= 500) {
            meteors.push({
                x: Math.random() * CONFIG.CANVAS_WIDTH,
                y: cameraY - 50,
                velocityX: (Math.random() - 0.5) * 1.5,
                velocityY: 4 + Math.random() * 2,
                radius: 15 + Math.random() * 10
            });
        }
    }
    
    meteors.forEach(m => {
        m.x += m.velocityX * dt;
        m.y += m.velocityY * dt;
        
        const dx = (player.x + player.width / 2) - m.x;
        const dy = (player.y + player.height / 2) - m.y;
        if (Math.sqrt(dx * dx + dy * dy) < m.radius * 0.7 + 19) gameOver();
    });
    
    meteors = meteors.filter(m => m.y - cameraY < CONFIG.CANVAS_HEIGHT + 100);

    particles.forEach(p => {
        p.x += p.velocityX * dt;
        p.y += p.velocityY * dt;
        p.velocityY += 0.05 * dt;
        p.life -= 0.05 * dt;
    });
    particles = particles.filter(p => p.life > 0);

    platforms.forEach(p => {
        if (!p.passed && player.y + player.height < p.y) {
            score++;
            p.passed = true;
        }
    });

    // Only check 3s timeout after player has jumped at least once
    if (score > 0 && Date.now() - lastPlatformTime > 3000) gameOver();
}

function gameOver() {
    if (gameState === 'gameover') return;
    playGameOverSound();
    gameState = 'gameover';
    finalScoreEl.textContent = score;
    
    // ✅ Send GAME_SCORE and GAME_OVER to parent (for tracking plays, leaderboard, rewards)
    if (window.parent && window.parent !== window) {
        const gameId = EMBEDDED_GAME_ID || 'space-jump';
        
        window.parent.postMessage({
            type: 'GAME_SCORE',
            score: score,
            gameId: gameId
        }, '*');
        console.log('📤 Sent GAME_SCORE to parent:', score);
        
        window.parent.postMessage({
            type: 'GAME_OVER',
            gameId: gameId
        }, '*');
        console.log('📤 Sent GAME_OVER to parent');
    }
    
    setTimeout(() => {
        gameOverScreen.classList.remove('hidden');
    }, 300);
}

function draw() {
    ctx.fillStyle = CONFIG.BG_COLOR;
    ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    
    if (meteorAlertTime > 0 && Date.now() - meteorAlertTime < 2000) {
        const alertProgress = (Date.now() - meteorAlertTime) / 2000;
        const flashIntensity = Math.sin(alertProgress * Math.PI * 8) * 0.5 + 0.5;
        ctx.fillStyle = `rgba(255, 0, 0, ${flashIntensity * 0.3})`;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
    }

    ctx.fillStyle = '#fff';
    stars.forEach(star => {
        const screenY = star.y - cameraY * 0.5;
        const wrappedY = ((screenY % (CONFIG.CANVAS_HEIGHT * 3)) + CONFIG.CANVAS_HEIGHT * 3) % (CONFIG.CANVAS_HEIGHT * 3) - CONFIG.CANVAS_HEIGHT;
        ctx.globalAlpha = star.opacity;
        ctx.beginPath();
        ctx.arc(star.x, wrappedY, star.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    platforms.forEach(p => {
        const screenY = p.y - cameraY;
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect(p.x, screenY, p.width, p.height, 5);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(p.x + 5, screenY + 2, p.width - 10, 3);
    });
    
    platformDebris.forEach(d => {
        const screenY = d.y - cameraY;
        ctx.save();
        ctx.translate(d.x, screenY);
        ctx.rotate(d.rotation);
        ctx.globalAlpha = d.life;
        ctx.fillStyle = d.color;
        ctx.fillRect(-d.width / 2, -d.height / 2, d.width, d.height);
        ctx.restore();
    });
    ctx.globalAlpha = 1;

    blackHoles.forEach(bh => {
        const screenY = bh.y - cameraY;
        const gradient = ctx.createRadialGradient(bh.x, screenY, 0, bh.x, screenY, bh.radius);
        gradient.addColorStop(0, '#1a0a2e');
        gradient.addColorStop(0.5, '#4a1a6e');
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(bh.x, screenY, bh.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#8b5cf6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bh.x, screenY, bh.radius * 0.5, 0, Math.PI * 2);
        ctx.stroke();
    });
    
    meteors.forEach(m => {
        const screenY = m.y - cameraY;
        
        ctx.fillStyle = 'rgba(255, 100, 50, 0.3)';
        ctx.beginPath();
        ctx.moveTo(m.x, screenY);
        ctx.lineTo(m.x - m.radius * 0.5, screenY - m.radius * 2);
        ctx.lineTo(m.x + m.radius * 0.5, screenY - m.radius * 2);
        ctx.closePath();
        ctx.fill();
        
        const meteorGradient = ctx.createRadialGradient(m.x, screenY, 0, m.x, screenY, m.radius);
        meteorGradient.addColorStop(0, '#ffcc00');
        meteorGradient.addColorStop(0.5, '#ff6600');
        meteorGradient.addColorStop(1, '#cc3300');
        ctx.fillStyle = meteorGradient;
        ctx.beginPath();
        ctx.arc(m.x, screenY, m.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff6600';
        ctx.beginPath();
        ctx.arc(m.x, screenY, m.radius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    });

    particles.forEach(p => {
        const screenY = p.y - cameraY;
        ctx.globalAlpha = p.life;
        ctx.fillStyle = '#6366f1';
        ctx.beginPath();
        ctx.arc(p.x, screenY, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    // Draw player
    drawPlayer();


    ctx.fillStyle = '#fff';
    ctx.font = 'bold 32px Arial';
    ctx.fillText(`Score: ${score}`, 20, 50);
    ctx.font = '20px Arial';
}

// Pre-render player to offscreen canvas
function renderPlayerToCache(targetCtx, kneeBend) {
    const torsoCompress = kneeBend * 5;
    const kneeY = 45 - kneeBend * 15;
    const footY = 70 - kneeBend * 10;
    const headY = -50 + torsoCompress * 1.2;
    
    targetCtx.strokeStyle = '#8B0000';
    targetCtx.lineWidth = 4;
    targetCtx.lineCap = 'round';
    
    // Torso
    targetCtx.beginPath();
    targetCtx.moveTo(0, -20 + torsoCompress);
    targetCtx.lineTo(0, 25 - torsoCompress);
    targetCtx.stroke();
    
    // Legs
    targetCtx.beginPath();
    targetCtx.moveTo(0, 25);
    targetCtx.lineTo(-15, kneeY);
    targetCtx.lineTo(-20, footY);
    targetCtx.stroke();
    targetCtx.beginPath();
    targetCtx.moveTo(0, 25);
    targetCtx.lineTo(15, kneeY);
    targetCtx.lineTo(20, footY);
    targetCtx.stroke();
    
    // Arms
    targetCtx.beginPath();
    targetCtx.moveTo(0, -10 + torsoCompress);
    targetCtx.lineTo(-25, 5 + torsoCompress * 0.5);
    targetCtx.lineTo(-45, 0 + torsoCompress * 0.3);
    targetCtx.stroke();
    targetCtx.beginPath();
    targetCtx.moveTo(0, -10 + torsoCompress);
    targetCtx.lineTo(20, 15 + torsoCompress * 0.5);
    targetCtx.lineTo(35, 25 + torsoCompress * 0.3);
    targetCtx.stroke();
    
    // Gloves
    targetCtx.fillStyle = '#fff';
    targetCtx.strokeStyle = '#333';
    targetCtx.lineWidth = 2;
    targetCtx.save();
    targetCtx.translate(-45, 0 + torsoCompress * 0.3);
    targetCtx.beginPath();
    targetCtx.arc(0, 0, 10, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.stroke();
    targetCtx.restore();
    targetCtx.save();
    targetCtx.translate(35, 25 + torsoCompress * 0.3);
    targetCtx.beginPath();
    targetCtx.arc(0, 0, 10, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.stroke();
    targetCtx.restore();
    
    // Boots
    targetCtx.fillStyle = '#f5f5f5';
    targetCtx.strokeStyle = '#333';
    targetCtx.lineWidth = 2;
    targetCtx.beginPath();
    targetCtx.ellipse(-22, footY + 5, 12, 6, -0.2, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.stroke();
    targetCtx.beginPath();
    targetCtx.ellipse(22, footY + 5, 12, 6, 0.2, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.stroke();
    
    // Boot details
    targetCtx.strokeStyle = '#333';
    targetCtx.lineWidth = 1;
    targetCtx.beginPath();
    targetCtx.moveTo(-28, footY + 3);
    targetCtx.lineTo(-18, footY + 3);
    targetCtx.moveTo(-27, footY + 6);
    targetCtx.lineTo(-19, footY + 6);
    targetCtx.moveTo(16, footY + 3);
    targetCtx.lineTo(26, footY + 3);
    targetCtx.moveTo(17, footY + 6);
    targetCtx.lineTo(25, footY + 6);
    targetCtx.stroke();
    
    // Head
    if (headLogoImg && headLogoImg.complete && headLogoImg.naturalWidth > 0) {
        targetCtx.strokeStyle = '#5C4B8A';
        targetCtx.lineWidth = 4;
        targetCtx.beginPath();
        targetCtx.arc(0, headY, 32, 0, Math.PI * 2);
        targetCtx.stroke();
        targetCtx.save();
        targetCtx.beginPath();
        targetCtx.arc(0, headY, 30, 0, Math.PI * 2);
        targetCtx.clip();
        targetCtx.drawImage(headLogoImg, -30, headY - 30, 60, 60);
        targetCtx.restore();
    } else {
        targetCtx.strokeStyle = '#5C4B8A';
        targetCtx.lineWidth = 4;
        targetCtx.beginPath();
        targetCtx.arc(0, headY, 32, 0, Math.PI * 2);
        targetCtx.stroke();
        targetCtx.fillStyle = '#F3BA2F';
        targetCtx.beginPath();
        targetCtx.arc(0, headY, 30, 0, Math.PI * 2);
        targetCtx.fill();
        
        targetCtx.fillStyle = '#1E2026';
        const logoSize = 12;
        targetCtx.beginPath();
        targetCtx.moveTo(0, headY - logoSize);
        targetCtx.lineTo(logoSize, headY);
        targetCtx.lineTo(0, headY + logoSize);
        targetCtx.lineTo(-logoSize, headY);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.beginPath();
        targetCtx.moveTo(0, headY - logoSize - 8);
        targetCtx.lineTo(5, headY - logoSize - 3);
        targetCtx.lineTo(0, headY - logoSize + 2);
        targetCtx.lineTo(-5, headY - logoSize - 3);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.beginPath();
        targetCtx.moveTo(0, headY + logoSize + 8);
        targetCtx.lineTo(5, headY + logoSize + 3);
        targetCtx.lineTo(0, headY + logoSize - 2);
        targetCtx.lineTo(-5, headY + logoSize + 3);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.beginPath();
        targetCtx.moveTo(-logoSize - 8, headY);
        targetCtx.lineTo(-logoSize - 3, headY - 5);
        targetCtx.lineTo(-logoSize + 2, headY);
        targetCtx.lineTo(-logoSize - 3, headY + 5);
        targetCtx.closePath();
        targetCtx.fill();
        targetCtx.beginPath();
        targetCtx.moveTo(logoSize + 8, headY);
        targetCtx.lineTo(logoSize + 3, headY - 5);
        targetCtx.lineTo(logoSize - 2, headY);
        targetCtx.lineTo(logoSize + 3, headY + 5);
        targetCtx.closePath();
        targetCtx.fill();
    }
}

function updatePlayerCache() {
    const kneeBend = Math.max(0, (1.2 - player.scale) * 5);
    
    // Only re-render if scale changed significantly
    if (Math.abs(kneeBend - playerCacheScale) < 0.01 && playerCacheLeft && playerCacheRight) {
        return;
    }
    playerCacheScale = kneeBend;
    
    const cacheWidth = 160;
    const cacheHeight = 190; // Tăng chiều cao để không cắt giày
    const centerX = cacheWidth / 2;
    const centerY = cacheHeight / 2 + 10; // Điều chỉnh để giày không bị cắt
    
    // Create/update left-facing cache
    if (!playerCacheLeft) {
        playerCacheLeft = document.createElement('canvas');
        playerCacheLeft.width = cacheWidth;
        playerCacheLeft.height = cacheHeight;
    }
    const ctxLeft = playerCacheLeft.getContext('2d');
    ctxLeft.clearRect(0, 0, cacheWidth, cacheHeight);
    ctxLeft.save();
    ctxLeft.translate(centerX, centerY);
    renderPlayerToCache(ctxLeft, kneeBend);
    ctxLeft.restore();
    
    // Create/update right-facing cache (flipped)
    if (!playerCacheRight) {
        playerCacheRight = document.createElement('canvas');
        playerCacheRight.width = cacheWidth;
        playerCacheRight.height = cacheHeight;
    }
    const ctxRight = playerCacheRight.getContext('2d');
    ctxRight.clearRect(0, 0, cacheWidth, cacheHeight);
    ctxRight.save();
    ctxRight.translate(centerX, centerY);
    ctxRight.scale(-1, 1);
    renderPlayerToCache(ctxRight, kneeBend);
    ctxRight.restore();
}

function drawPlayer() {
    updatePlayerCache();
    
    const playerScreenY = player.y - cameraY;
    const cache = player.facingRight ? playerCacheRight : playerCacheLeft;
    
    if (cache) {
        // Draw from cache - much faster than re-drawing every frame
        ctx.drawImage(
            cache,
            player.x + player.width / 2 - cache.width / 2,
            playerScreenY + player.height / 2 - cache.height / 2 - 20
        );
    }
}

function gameLoop(currentTime) {
    const deltaTime = lastFrameTime ? (currentTime - lastFrameTime) / (1000 / 60) : 1;
    lastFrameTime = currentTime;
    update(deltaTime);
    draw();
    requestAnimationFrame(gameLoop);
}

// ============ EVENT LISTENERS ============
let gameStartSent = false;

function sendGameStart() {
    if (gameStartSent) return;
    gameStartSent = true;
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({
            type: 'GAME_START',
            gameId: EMBEDDED_GAME_ID || 'space-jump'
        }, '*');
        console.log('📤 Sent GAME_START to parent');
    }
}

document.addEventListener('keydown', (e) => {
    if (gameState === 'start') { 
        gameState = 'playing'; 
        startScreen.classList.add('hidden'); 
        sendGameStart();
    }
    if (e.key === 'ArrowLeft') keys.left = true;
    if (e.key === 'ArrowRight') keys.right = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowLeft') keys.left = false;
    if (e.key === 'ArrowRight') keys.right = false;
});

// Cache canvas rect (update on resize)
let cachedRect = null;
let cachedScaleX = 1;

function updateCachedRect() {
    cachedRect = canvas.getBoundingClientRect();
    cachedScaleX = CONFIG.CANVAS_WIDTH / cachedRect.width;
}
updateCachedRect();
window.addEventListener('resize', updateCachedRect);

// Touch detection - chia nửa màn hình
function handleTouchStart(e) {
    e.preventDefault(); // Chặn double-tap zoom
    if (gameState === 'start') { 
        gameState = 'playing'; 
        startScreen.classList.add('hidden'); 
        sendGameStart();
        return; 
    }
    
    // Chỉ lấy touch đầu tiên, chia nửa màn hình
    const touch = e.touches[0];
    const x = (touch.clientX - cachedRect.left) * cachedScaleX;
    
    // Reset cả 2 trước
    touchControls.left = false;
    touchControls.right = false;
    
    // Nửa trái = di chuyển trái, nửa phải = di chuyển phải
    if (x < CONFIG.CANVAS_WIDTH / 2) {
        touchControls.left = true;
    } else {
        touchControls.right = true;
    }
}

function handleTouchEnd(e) {
    e.preventDefault();
    touchControls.left = false;
    touchControls.right = false;
}

canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });

startScreen.addEventListener('click', () => { gameState = 'playing'; startScreen.classList.add('hidden'); sendGameStart(); });
playAgainBtn.addEventListener('click', () => { gameOverScreen.classList.add('hidden'); resetGame(); gameState = 'playing'; gameStartSent = false; sendGameStart(); });

// ============ INIT ============
initStars();
initPlatforms();
requestAnimationFrame(gameLoop);

// Notify parent (editor) that game is ready
window.parent.postMessage({ type: 'SPACE_JUMP_GAME_READY' }, '*');

