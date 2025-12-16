// ====================================
// GAME LOGIC - Fallen Crypto Template V2
// ====================================

// ✅ Import config và shared utilities
import { BRAND_CONFIG, loadBrandConfig, saveBrandConfig, getGameId } from './config.js';
import { getSupabaseClient } from '../core/supabase-client.js';
import { loadLogoImage } from '../core/logo-loader.js';

// ✅ Template constants
const TEMPLATE_ID = 'fallen-crypto-template';

// ✅ Mobile detection
const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
const speedMultiplier = isMobile ? 2.73 : 2.25; // Desktop: +125% | Mobile: +173%

console.log('📱 Device:', isMobile ? 'Mobile' : 'Desktop', '| Speed:', speedMultiplier + 'x');

// ✅ Pre-rendered ball canvas (optimization for mobile performance)
let ballCanvas = null;
let ballCanvasFallback = null; // For default binance logo

// ✅ Pre-render ball vào offscreen canvas (optimization for mobile)
function preRenderBall(img) {
  if (!img) return;
  
  const canvas = document.createElement('canvas');
  canvas.width = CONFIG.BALL_SIZE;
  canvas.height = CONFIG.BALL_SIZE;
  const ctx = canvas.getContext('2d');
  
  // Vẽ white circle background
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(CONFIG.BALL_SIZE / 2, CONFIG.BALL_SIZE / 2, CONFIG.BALL_SIZE / 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Vẽ logo (pre-decode và scale một lần)
  ctx.drawImage(img, 0, 0, CONFIG.BALL_SIZE, CONFIG.BALL_SIZE);
  
  return canvas;
}

// ✅ Helper: Apply logo for BOTH game over screen AND ball sprite
function applySharedLogo(url) {
  if (!url) return;
  const normalizedUrl = url.trim();
  if (!normalizedUrl) return;
  BRAND_CONFIG.logoUrl = normalizedUrl;
  // Preload logo image for BOTH game over screen AND ball sprite
  loadLogoImage(normalizedUrl, 
    (img) => {
      BRAND_CONFIG.logo = img;
      BRAND_CONFIG.ballLogo = img; // ✅ Also store for ball sprite
      BRAND_CONFIG.logoLoaded = true; // ✅ Track loading state
      
      // ✅ Pre-render ball canvas (optimization for mobile)
      ballCanvas = preRenderBall(img);
      
      console.log('[Fallen Crypto] ✅ Logo loaded and pre-rendered for BOTH game over and ball:', normalizedUrl);
    },
    () => {
      console.warn('[Fallen Crypto] Failed to load logo:', normalizedUrl);
      BRAND_CONFIG.logo = null;
      BRAND_CONFIG.ballLogo = null;
      BRAND_CONFIG.logoLoaded = false;
      ballCanvas = null;
    }
  );
}

// ✅ Helper: Apply config (logo/story/brickColor) in one place
function applyBrandConfig({ logoUrl = '', story = 'welcome to memeplay', brickColor = '#4a90a4' }) {
  const normalizedLogo = logoUrl ? logoUrl.trim() : '';
  Object.assign(BRAND_CONFIG, {
    logoUrl: normalizedLogo,
    story: story || 'welcome to memeplay',
    brickColor: brickColor || '#4a90a4'
  });
  applySharedLogo(normalizedLogo);
}

// ✅ Load brand config from Supabase (fallback when localStorage doesn't have it)
async function loadBrandConfigFromSupabase(gameId) {
  if (!gameId) {
    console.warn('[Fallen Crypto] Missing gameId, skip loading brand config from Supabase');
    return false;
  }
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      console.warn('[Fallen Crypto] Supabase client unavailable');
      return false;
    }
    const { data, error } = await supabase.rpc('list_user_created_games', {
      p_template_id: TEMPLATE_ID
    });
    if (error) {
      console.error('[Fallen Crypto] list_user_created_games error:', error.message || error);
      return false;
    }
    if (!Array.isArray(data)) {
      console.warn('[Fallen Crypto] Unexpected response while loading brand config:', data);
      return false;
    }
    const foundGame = data.find(item => {
      const id = item?.game_id || item?.id;
      return id === gameId;
    });
    if (!foundGame) {
      console.warn(`[Fallen Crypto] Game ${gameId} not found when loading brand config`);
      return false;
    }
    
    // ✅ Build config object với đúng fields từ Supabase (giống Pacman/Pixel Shooter pattern)
    applyBrandConfig({
      logoUrl: foundGame.fragment_logo_url || '',
      story: foundGame.story_one || 'welcome to memeplay',
      brickColor: foundGame.map_color || '#4a90a4'
    });
    
    // ✅ Save to localStorage for next time
    saveBrandConfig(gameId);
    return true;
  } catch (error) {
    console.error('[Fallen Crypto] Unexpected error while loading brand config:', error);
    return false;
  }
}

// ✅ Listen UPDATE_CONFIG message từ editor
window.addEventListener('message', (event) => {
  // Security check
  if (event.origin !== window.location.origin && 
      !event.origin.includes('127.0.0.1') && 
      !event.origin.includes('localhost')) {
    return;
  }
  
  if (event.data && event.data.type === 'UPDATE_CONFIG') {
    const config = event.data.config;
    if (!config) return;
    
    const sharedLogoUrl = config.logoUrl || '';
    // ✅ Update config ngay lập tức (không cần reload)
    applyBrandConfig({
      logoUrl: sharedLogoUrl,
      story: config.story,
      brickColor: config.brickColor
    });
  }
});

// ✅ Get game ID from URL (using shared utility)
const EMBEDDED_GAME_ID = getGameId();
const isPublicView = !!EMBEDDED_GAME_ID;

// ✅ Initialize game function - đảm bảo config load xong trước khi start game
async function initializeGame() {
  const gameId = EMBEDDED_GAME_ID || getGameId();
  const isPublicGame = gameId !== null && gameId !== '';
  
  if (isPublicGame) {
    // ✅ Load brand config with correct gameId BEFORE game starts
    const hasLocalBrandConfig = loadBrandConfig(gameId);
    if (!hasLocalBrandConfig) {
      // Try Supabase, but if still no config, use defaults
      const hasSupabaseConfig = await loadBrandConfigFromSupabase(gameId);
      if (!hasSupabaseConfig) {
        // Use default config (BRAND_CONFIG already has defaults from config.js)
        Object.assign(BRAND_CONFIG, {
          logo: null,
          ballLogo: null,
          logoUrl: '',
          logoLoaded: false,
          story: 'welcome to memeplay',
          brickColor: '#4a90a4'
        });
      }
    }
  } else {
    // ✅ Editor mode: Load config từ localStorage (playtest)
    loadBrandConfig();
  }
  
  // ✅ Load shared logo nếu có
  const sharedLogoUrl = BRAND_CONFIG.logoUrl || '';
  applySharedLogo(sharedLogoUrl);
  
  // ✅ Start game loop
  requestAnimationFrame(gameLoop);
  
  // ✅ Send GAME_READY message
  if (window.parent && window.parent !== window) {
    const readyMessage = {
      type: 'FALLEN_CRYPTO_GAME_READY',
      gameId: gameId || 'fallen-crypto'
    };
    window.parent.postMessage(readyMessage, '*');
    console.log('[Fallen Crypto] 📤 Sent GAME_READY:', readyMessage);
  }
}

// ==========================================
// GAME CONFIGURATION
// ==========================================
const CONFIG = {
  WIDTH: 720,
  HEIGHT: 1000,
  PADDLE_WIDTH: 120,
  PADDLE_HEIGHT: 20,
  PADDLE_Y: 920,
  get PADDLE_SPEED() { return 10.4 * (isMobile ? 1.15 : 1.0); },
  BALL_SIZE: 32,
  get BALL_SPEED_BASE() { return 4 * speedMultiplier; },
  BRICK_PADDING: 3,
  LEVEL_TIME: 30000,
  MAX_LEVEL: 20,
  MAX_BALLS: 15,
  POWERUP_SIZE: 24,
  POWERUP_FALL_SPEED: 3,
  LEVEL1_BRICKS: 30,
  BRICKS_PER_LEVEL: 6
};

// Failed crypto projects
const CRYPTO_LOGOS = [
  { name: 'FTX', rows: 8, cols: 16 },
  { name: 'LUNA', rows: 8, cols: 16 },
  { name: 'BITCONNECT', rows: 8, cols: 20 },
  { name: 'MT.GOX', rows: 8, cols: 16 },
  { name: 'CELSIUS', rows: 8, cols: 18 },
  { name: 'VOYAGER', rows: 8, cols: 18 },
  { name: 'THREE ARROWS', rows: 9, cols: 20 },
  { name: 'BLOCKFI', rows: 8, cols: 18 },
  { name: 'TERRA', rows: 8, cols: 14 },
  { name: 'SAFEMOON', rows: 8, cols: 18 },
  { name: 'SQUID GAME', rows: 9, cols: 20 },
  { name: 'ONECOIN', rows: 8, cols: 18 },
  { name: 'QUADRIGA', rows: 9, cols: 20 },
  { name: 'THODEX', rows: 8, cols: 16 },
  { name: 'AFRICRYPT', rows: 9, cols: 20 },
  { name: 'TITANIUM', rows: 9, cols: 20 },
  { name: 'CENTRA', rows: 8, cols: 16 },
  { name: 'PLUSTOKEN', rows: 9, cols: 20 },
  { name: 'BITCLUB', rows: 8, cols: 18 },
  { name: 'PONZICOIN', rows: 9, cols: 20 }
];

// ==========================================
// CANVAS SETUP
// ==========================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { 
  alpha: false, 
  desynchronized: true 
});
ctx.imageSmoothingEnabled = false;

canvas.width = CONFIG.WIDTH;
canvas.height = CONFIG.HEIGHT;

// ==========================================
// AUDIO SETUP (8-bit sounds, mobile-safe)
// ==========================================
let audioContext = null;
let audioUnlocked = false;

function initAudio() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  
  try {
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        if (audioUnlocked) return;
        audioUnlocked = true;
        try {
          const osc = audioContext.createOscillator();
          const gain = audioContext.createGain();
          osc.connect(gain);
          gain.connect(audioContext.destination);
          gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
          osc.frequency.setValueAtTime(1, audioContext.currentTime);
          osc.start(audioContext.currentTime);
          osc.stop(audioContext.currentTime + 0.01);
        } catch (e) {
          console.log('Silent unlock error:', e);
        }
      }).catch(() => {});
    } else if (audioContext.state === 'running' && !audioUnlocked) {
      audioUnlocked = true;
      try {
        const osc = audioContext.createOscillator();
        const gain = audioContext.createGain();
        osc.connect(gain);
        gain.connect(audioContext.destination);
        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        osc.frequency.setValueAtTime(1, audioContext.currentTime);
        osc.start(audioContext.currentTime);
        osc.stop(audioContext.currentTime + 0.01);
      } catch (e) {}
    }
  } catch (err) {
    console.log('initAudio error:', err);
  }
}

function playBrickHit() {
  playPaddleBounce();
}

function playBrickBreak() {
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(200, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.15);
}

function playPaddleBounce() {
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(300, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.1);
  gain.gain.setValueAtTime(0.2, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.1);
}

function playPowerupX2() {
  if (!audioContext) return;
  const osc = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc.connect(gain);
  gain.connect(audioContext.destination);
  osc.type = 'sine';
  osc.frequency.setValueAtTime(600, audioContext.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1200, audioContext.currentTime + 0.2);
  gain.gain.setValueAtTime(0.15, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
  osc.start(audioContext.currentTime);
  osc.stop(audioContext.currentTime + 0.2);
}

function playPowerupX3() {
  if (!audioContext) return;
  const osc1 = audioContext.createOscillator();
  const osc2 = audioContext.createOscillator();
  const gain = audioContext.createGain();
  osc1.connect(gain);
  osc2.connect(gain);
  gain.connect(audioContext.destination);
  osc1.type = 'sine';
  osc2.type = 'sine';
  osc1.frequency.setValueAtTime(800, audioContext.currentTime);
  osc2.frequency.setValueAtTime(1000, audioContext.currentTime);
  osc1.frequency.exponentialRampToValueAtTime(1600, audioContext.currentTime + 0.3);
  osc2.frequency.exponentialRampToValueAtTime(2000, audioContext.currentTime + 0.3);
  gain.gain.setValueAtTime(0.2, audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
  osc1.start(audioContext.currentTime);
  osc2.start(audioContext.currentTime);
  osc1.stop(audioContext.currentTime + 0.3);
  osc2.stop(audioContext.currentTime + 0.3);
}

// ==========================================
// LOAD DEFAULT BINANCE LOGO WHITE (fallback for ball sprite)
// ==========================================
// ✅ Load default logo as fallback, but use BRAND_CONFIG.ballLogo if available
const binanceLogoImg = new Image();
binanceLogoImg.src = 'assets/binance-logo-white.webp';
let binanceLogoLoaded = false;
binanceLogoImg.onload = () => {
  binanceLogoLoaded = true;
  
  // ✅ Pre-render default ball canvas (optimization for mobile)
  if (!ballCanvas) {
    ballCanvasFallback = preRenderBall(binanceLogoImg);
  }
  
  console.log('✅ Default Binance logo (white) loaded and pre-rendered for ball (fallback)');
};
binanceLogoImg.onerror = () => {
  console.warn('⚠️ Default Binance logo failed to load, using fallback color');
};

// ==========================================
// GAME STATE
// ==========================================
let gameState = {
  isRunning: false,
  level: 1,
  score: 0,
  bricksDestroyed: 0,
  levelStartTime: 0,
  timeRemaining: 30,
  currentLogo: 'FTX'
};

// ==========================================
// PADDLE
// ==========================================
const paddle = {
  x: CONFIG.WIDTH / 2 - CONFIG.PADDLE_WIDTH / 2,
  y: CONFIG.PADDLE_Y,
  width: CONFIG.PADDLE_WIDTH,
  height: CONFIG.PADDLE_HEIGHT,
  vx: 0,
  color: '#00ff00'
};

// ==========================================
// BALLS
// ==========================================
const balls = [];

class Ball {
  constructor(x, y, randomDirection = false) {
    this.x = x;
    this.y = y;
    this.size = CONFIG.BALL_SIZE;
    this.radius = this.size / 2;
    
    if (randomDirection) {
      const angle = (Math.random() * 90 + 45) * Math.PI / 180;
      this.vx = Math.cos(angle) * CONFIG.BALL_SPEED_BASE;
      this.vy = -Math.abs(Math.sin(angle) * CONFIG.BALL_SPEED_BASE);
    } else {
      this.vx = (Math.random() - 0.5) * 2;
      this.vy = -CONFIG.BALL_SPEED_BASE;
    }
    
    this.active = true;
  }

  update(deltaTime) {
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;

    if (this.x - this.radius <= 0) {
      this.vx = Math.abs(this.vx);
      this.x = this.radius;
    }
    if (this.x + this.radius >= CONFIG.WIDTH) {
      this.vx = -Math.abs(this.vx);
      this.x = CONFIG.WIDTH - this.radius;
    }

    if (this.y - this.radius <= 0) {
      this.vy = Math.abs(this.vy);
      this.y = this.radius;
    }

    const ballBottom = this.y + this.radius;
    const ballTop = this.y - this.radius;
    const ballLeft = this.x - this.radius;
    const ballRight = this.x + this.radius;
    
    if (ballBottom >= paddle.y &&
        ballTop <= paddle.y + paddle.height &&
        ballRight >= paddle.x &&
        ballLeft <= paddle.x + paddle.width) {
      playPaddleBounce();
      this.vy = -Math.abs(this.vy);
      this.y = paddle.y - this.radius;
      
      const paddleCenter = paddle.x + paddle.width / 2;
      const hitOffset = (this.x - paddleCenter) / (paddle.width / 2);
      this.vx += hitOffset * 2;
    }

    if (this.y - this.radius > CONFIG.HEIGHT) {
      this.active = false;
    }
  }

  draw() {
    // ✅ Priority: Use pre-rendered ballCanvas > ballCanvasFallback > fallback color
    // Optimization: Pre-rendered canvas giảm drawImage() calls và scaling operations
    if (ballCanvas) {
      // ✅ Round coordinates về integer để tránh anti-aliasing (quan trọng cho mobile)
      // Sub-pixel coordinates → browser phải anti-alias → tốn kém trên mobile GPU yếu
      const drawX = Math.round(this.x - this.radius);
      const drawY = Math.round(this.y - this.radius);
      ctx.drawImage(ballCanvas, drawX, drawY);
    } else if (ballCanvasFallback) {
      // ✅ Round coordinates về integer để tránh anti-aliasing
      const drawX = Math.round(this.x - this.radius);
      const drawY = Math.round(this.y - this.radius);
      ctx.drawImage(ballCanvasFallback, drawX, drawY);
    } else {
      // Fallback: Draw circular ball (purple) if no logo available
      // ✅ Round coordinates cho arc() cũng giúp performance
      const drawX = Math.round(this.x);
      const drawY = Math.round(this.y);
      ctx.fillStyle = '#ff00ff';
      ctx.beginPath();
      ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

// ==========================================
// POWERUPS
// ==========================================
const powerups = [];

class Powerup {
  constructor(x, y, type) {
    this.x = x;
    this.y = y;
    this.type = type;
    this.size = CONFIG.POWERUP_SIZE;
    this.vy = CONFIG.POWERUP_FALL_SPEED;
    this.collected = false;
    this.rotation = 0;
  }

  update(deltaTime) {
    this.y += this.vy * deltaTime;
    this.rotation += 0.1 * deltaTime;

    if (this.y + this.size / 2 >= paddle.y &&
        this.y - this.size / 2 <= paddle.y + paddle.height &&
        this.x + this.size / 2 >= paddle.x &&
        this.x - this.size / 2 <= paddle.x + paddle.width) {
      
      if (this.type === 'x3') {
        playPowerupX3();
      } else {
        playPowerupX2();
      }
      
      this.collected = true;
      
      const multiplier = this.type === 'x3' ? 3 : 2;
      const currentBalls = balls.filter(b => b.active);
      const ballsToAdd = Math.min(
        currentBalls.length * (multiplier - 1),
        CONFIG.MAX_BALLS - balls.length
      );
      
      for (let i = 0; i < ballsToAdd; i++) {
        const sourceBall = currentBalls[i % currentBalls.length];
        const newBall = new Ball(sourceBall.x, sourceBall.y, true);
        newBall.vx = sourceBall.vx + (Math.random() - 0.5) * 2;
        newBall.vy = sourceBall.vy + (Math.random() - 0.5);
        balls.push(newBall);
      }
    }

    if (this.y > CONFIG.HEIGHT) {
      this.collected = true;
    }
  }

  draw() {
    if (this.collected) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    ctx.fillStyle = this.type === 'x3' ? '#ff0000' : '#00ff00';
    ctx.beginPath();
    ctx.moveTo(0, -this.size / 2);
    ctx.lineTo(this.size / 2, 0);
    ctx.lineTo(0, this.size / 2);
    ctx.lineTo(-this.size / 2, 0);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.type.toUpperCase(), 0, 0);

    ctx.restore();
  }
}

// ==========================================
// BRICKS
// ==========================================
const bricks = [];

class Brick {
  constructor(x, y, width, height, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.alive = true;
  }

  draw() {
    if (!this.alive) return;
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }
}

// ==========================================
// LEVEL GENERATION
// ==========================================
// ✅ Cache cho alive bricks (optimization: chỉ render và check collision với bricks còn alive)
let aliveBricksCache = [];

function updateAliveBricksCache() {
  // ✅ Filter chỉ bricks còn alive (giảm ~50-70% operations)
  aliveBricksCache = bricks.filter(b => b.alive);
}

function generateLevel(level) {
  bricks.length = 0;
  
  const totalBricks = CONFIG.LEVEL1_BRICKS + (level - 1) * CONFIG.BRICKS_PER_LEVEL;
  
  let rows = Math.floor(Math.sqrt(totalBricks));
  let cols = Math.ceil(totalBricks / rows);
  
  while (rows * cols < totalBricks) {
    cols++;
  }
  
  const availableWidth = CONFIG.WIDTH - 40;
  const availableHeight = 400;
  
  let brickWidth = Math.floor((availableWidth - (cols + 1) * CONFIG.BRICK_PADDING) / cols);
  let brickHeight = Math.floor((availableHeight - (rows + 1) * CONFIG.BRICK_PADDING) / rows);
  
  brickWidth = Math.floor(brickWidth * 0.75);
  brickHeight = Math.floor(brickHeight * 0.75);
  
  const totalWidth = cols * brickWidth + (cols + 1) * CONFIG.BRICK_PADDING;
  const startX = (CONFIG.WIDTH - totalWidth) / 2;
  const startY = 90;

  let brickCount = 0;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      if (brickCount >= totalBricks) break;
      
      const x = startX + CONFIG.BRICK_PADDING + col * (brickWidth + CONFIG.BRICK_PADDING);
      const y = startY + CONFIG.BRICK_PADDING + row * (brickHeight + CONFIG.BRICK_PADDING);
      
      // ✅ Use BRAND_CONFIG.brickColor instead of hardcoded color
      const color = BRAND_CONFIG.brickColor || '#4a90a4';
      
      bricks.push(new Brick(x, y, brickWidth, brickHeight, color));
      brickCount++;
    }
    if (brickCount >= totalBricks) break;
  }
  
  bricks.sort((a, b) => a.y - b.y);
  
  // ✅ Update cache sau khi generate level mới
  updateAliveBricksCache();
  
  const logoIndex = (level - 1) % CRYPTO_LOGOS.length;
  gameState.currentLogo = CRYPTO_LOGOS[logoIndex].name;
}

// ==========================================
// CONTROLS
// ==========================================
let leftPressed = false;
let rightPressed = false;

const touchLeft = document.getElementById('touchLeft');
const touchRight = document.getElementById('touchRight');

touchLeft.addEventListener('touchstart', (e) => {
  e.preventDefault();
  leftPressed = true;
}, { passive: false });
touchLeft.addEventListener('touchend', (e) => {
  e.preventDefault();
  leftPressed = false;
}, { passive: false });
touchLeft.addEventListener('mousedown', () => leftPressed = true);
touchLeft.addEventListener('mouseup', () => leftPressed = false);

touchRight.addEventListener('touchstart', (e) => {
  e.preventDefault();
  rightPressed = true;
}, { passive: false });
touchRight.addEventListener('touchend', (e) => {
  e.preventDefault();
  rightPressed = false;
}, { passive: false });
touchRight.addEventListener('mousedown', () => rightPressed = true);
touchRight.addEventListener('mouseup', () => rightPressed = false);

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') leftPressed = true;
  if (e.key === 'ArrowRight' || e.key === 'd') rightPressed = true;
});
document.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'a') leftPressed = false;
  if (e.key === 'ArrowRight' || e.key === 'd') rightPressed = false;
});

// ==========================================
// GAME LOOP
// ==========================================
let lastTime = performance.now(); // ✅ Fix: Khởi tạo = current time để tránh deltaTime lớn lần đầu
let needsRender = true; // Track khi cần render (start screen, game over)

function gameLoop(currentTime) {
  requestAnimationFrame(gameLoop);
  
  // ✅ Fix: Đảm bảo currentTime hợp lệ và tính deltaTime đúng
  if (!lastTime || lastTime === 0) {
    lastTime = currentTime;
  }
  
  // ✅ Tính deltaTime (milliseconds)
  let deltaTime = currentTime - lastTime;
  
  // ✅ Handle first frame (deltaTime = 0 hoặc rất lớn) - giống Pacman pattern
  if (deltaTime === 0 || deltaTime > 100) {
    deltaTime = 16.67; // ✅ Default ~60fps (16.67ms)
  }
  
  // ✅ Normalize về 1.0 (60fps) và cap (mobile: 1.2, desktop: 2)
  // Giảm cap trên mobile để tránh ball nhảy khi frame skip
  deltaTime = Math.min(deltaTime / 16.67, isMobile ? 1.2 : 2);
  
  lastTime = currentTime;
  
  // ✅ Optimization: Chỉ render khi game running hoặc cần render (start screen, game over)
  if (gameState.isRunning) {
    render();
    update(deltaTime, currentTime);
  } else if (needsRender) {
    // Chỉ render khi cần (start screen, game over)
    render();
    needsRender = false;
  }
}

function update(deltaTime, currentTime) {
  paddle.vx = 0;
  if (leftPressed) paddle.vx = -CONFIG.PADDLE_SPEED;
  if (rightPressed) paddle.vx = CONFIG.PADDLE_SPEED;
  
  paddle.x += paddle.vx * deltaTime;
  paddle.x = Math.max(0, Math.min(CONFIG.WIDTH - paddle.width, paddle.x));

  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    if (ball.active) {
      ball.update(deltaTime);

      const hitBricks = [];
      const ballY = ball.y;
      const checkRange = 100;
      const ballLeft = ball.x - ball.radius;
      const ballRight = ball.x + ball.radius;
      const ballTop = ball.y - ball.radius;
      const ballBottom = ball.y + ball.radius;
      
      // ✅ Optimization: Chỉ check collision với bricks còn alive (giảm ~50-70% checks)
      for (let brick of aliveBricksCache) {
        if (hitBricks.length >= 2) break;  // ✅ Đã có checkRange nên không cần continue
        
        if (brick.y < ballY - checkRange) continue;
        if (brick.y > ballY + checkRange) break;
        
        if (ballRight >= brick.x &&
            ballLeft <= brick.x + brick.width &&
            ballBottom >= brick.y &&
            ballTop <= brick.y + brick.height) {
          hitBricks.push(brick);
        }
      }
      
      if (hitBricks.length > 0) {
        playBrickHit();
        
        let bounceX = false;
        let bounceY = false;
        
        for (let j = 0; j < hitBricks.length; j++) {
          const brick = hitBricks[j];
          
          const overlapLeft = ballRight - brick.x;
          const overlapRight = (brick.x + brick.width) - ballLeft;
          const overlapTop = ballBottom - brick.y;
          const overlapBottom = (brick.y + brick.height) - ballTop;
          
          const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);
          
          if (minOverlap === overlapLeft || minOverlap === overlapRight) {
            bounceX = true;
          } else {
            bounceY = true;
          }
          
          brick.alive = false;
          playBrickBreak();
          gameState.score += 10;
          gameState.bricksDestroyed++;
          
          // ✅ Update cache khi brick bị destroy (remove khỏi cache)
          updateAliveBricksCache();
          
          const rand = Math.random();
          if (rand < 0.05) {
            powerups.push(new Powerup(brick.x + brick.width / 2, brick.y + brick.height / 2, 'x3'));
          } else if (rand < 0.20) {
            powerups.push(new Powerup(brick.x + brick.width / 2, brick.y + brick.height / 2, 'x2'));
          }
        }
        
        if (bounceX) ball.vx = -ball.vx;
        if (bounceY) ball.vy = -ball.vy;
      }
    }
  }

  for (let i = 0; i < powerups.length; i++) {
    const powerup = powerups[i];
    if (!powerup.collected) {
      powerup.update(deltaTime);
    }
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    if (powerups[i].collected) {
      powerups.splice(i, 1);
    }
  }

  for (let i = balls.length - 1; i >= 0; i--) {
    if (!balls[i].active) {
      balls.splice(i, 1);
    }
  }

  if (balls.length === 0) {
    endGame();
    return;
  }

  // ✅ Optimization: Dùng cache thay vì filter lại (đã được update khi brick destroy)
  if (aliveBricksCache.length === 0) {
    nextLevel();
    return;
  }

  const elapsed = currentTime - gameState.levelStartTime;
  gameState.timeRemaining = Math.max(0, CONFIG.LEVEL_TIME - elapsed) / 1000;

  if (gameState.timeRemaining <= 0) {
    endGame();
  }
}

function render() {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  // ✅ Optimization: Chỉ vẽ bricks còn alive (giảm ~50-70% draw operations)
  for (let i = 0; i < aliveBricksCache.length; i++) {
    aliveBricksCache[i].draw();
  }

  for (let i = 0; i < powerups.length; i++) {
    powerups[i].draw();
  }

  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    if (ball.active) ball.draw();
  }

  ctx.fillStyle = paddle.color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);

  ctx.fillStyle = 'white';
  ctx.font = 'bold 24px Courier New';
  
  ctx.textAlign = 'right';
  ctx.fillText(`LV ${gameState.level}`, CONFIG.WIDTH - 30, 35);
  ctx.fillText(`time ${Math.ceil(gameState.timeRemaining)}s`, CONFIG.WIDTH - 30, 65);
  
  ctx.textAlign = 'left';
  ctx.fillText(`score`, 15, 35);
  ctx.fillText(`${gameState.score}`, 15, 65);
}

// ==========================================
// GAME FLOW
// ==========================================
function startGame() {
  initAudio();
  
  const gameId = EMBEDDED_GAME_ID || getGameId() || 'fallen-crypto';
  const startMessage = { 
    type: 'GAME_START', 
    gameId: gameId
  };
  window.parent.postMessage(startMessage, '*');
  console.log('[Fallen Crypto] 📤 Sent GAME_START:', startMessage);

  gameState = {
    isRunning: true,
    level: 1,
    score: 0,
    bricksDestroyed: 0,
    levelStartTime: performance.now(),
    timeRemaining: 30
  };

  paddle.x = CONFIG.WIDTH / 2 - CONFIG.PADDLE_WIDTH / 2;
  balls.length = 0;
  powerups.length = 0;
  
  generateLevel(1);
  spawnBall(true);
  needsRender = true; // ✅ Mark cần render khi start game

  document.getElementById('startScreen').classList.remove('show');
  // ✅ KHÔNG reset lastTime ở đây để tránh deltaTime lớn khi start game
}

function nextLevel() {
  if (gameState.level >= CONFIG.MAX_LEVEL) {
    endGame(true);
    return;
  }

  gameState.level++;
  gameState.levelStartTime = performance.now();
  gameState.timeRemaining = 30;
  
  gameState.isRunning = false;
  document.getElementById('levelTitle').textContent = `LEVEL ${gameState.level}`;
  document.getElementById('levelScreen').classList.add('show');
}

function startLevel() {
  document.getElementById('levelScreen').classList.remove('show');
  generateLevel(gameState.level);
  balls.length = 0;
  powerups.length = 0;
  spawnBall(true);
  gameState.isRunning = true;
  gameState.levelStartTime = performance.now();
}

function spawnBall(isFirstBall = false) {
  if (balls.length >= CONFIG.MAX_BALLS) return;
  
  const ball = new Ball(
    paddle.x + paddle.width / 2,
    paddle.y - 20,
    isFirstBall
  );
  balls.push(ball);
}

function endGame(won = false) {
  gameState.isRunning = false;
  needsRender = true; // ✅ Mark cần render khi game over

  const gameId = EMBEDDED_GAME_ID || getGameId() || 'fallen-crypto';
  const scoreMessage = { 
    type: 'GAME_SCORE', 
    gameId: gameId,
    score: gameState.score 
  };
  window.parent.postMessage(scoreMessage, '*');
  console.log('[Fallen Crypto] 📤 Sent GAME_SCORE:', scoreMessage);

  document.getElementById('finalScore').textContent = gameState.score;
  
  // ✅ Use BRAND_CONFIG.story instead of BNB_STORIES array
  const story = BRAND_CONFIG.story || 'welcome to memeplay';
  document.getElementById('bnbStory').textContent = story;
  
  // ✅ Show logo if available (use logoUrl, not logo image object)
  const bnbLogoEl = document.getElementById('bnbLogo');
  if (bnbLogoEl) {
    if (BRAND_CONFIG.logoUrl && BRAND_CONFIG.logoUrl.trim()) {
      // Reset handlers
      bnbLogoEl.onerror = () => {
        console.warn('[Fallen Crypto] Failed to load logo:', BRAND_CONFIG.logoUrl);
        bnbLogoEl.style.display = 'none';
      };
      bnbLogoEl.onload = () => {
        console.log('[Fallen Crypto] ✅ Logo loaded successfully:', BRAND_CONFIG.logoUrl);
      };
      bnbLogoEl.src = BRAND_CONFIG.logoUrl;
      bnbLogoEl.style.display = 'block';
    } else {
      bnbLogoEl.style.display = 'none';
      console.log('[Fallen Crypto] No logo URL set, hiding logo');
    }
  }
  
  if (won) {
    document.querySelector('.game-over-screen .screen-title').textContent = 'YOU WON!';
  } else {
    document.querySelector('.game-over-screen .screen-title').textContent = 'GAME OVER';
  }
  
  document.getElementById('gameOverScreen').classList.add('show');
  
  // ✅ Send GAME_OVER message
  const gameOverMessage = {
    type: 'GAME_OVER',
    gameId: gameId,
    score: gameState.score
  };
  window.parent.postMessage(gameOverMessage, '*');
  console.log('[Fallen Crypto] 📤 Sent GAME_OVER:', gameOverMessage);
}

function restartGame() {
  document.getElementById('gameOverScreen').classList.remove('show');
  startGame();
}

// ==========================================
// INITIALIZE GAME (pre-render for preview)
// ==========================================
generateLevel(1);
render();

// ==========================================
// EVENT LISTENERS
// ==========================================
const startScreen = document.getElementById('startScreen');
startScreen.addEventListener('click', startGame);
startScreen.addEventListener('touchstart', (e) => { e.preventDefault(); startGame(); }, { passive: false });
document.getElementById('levelStartBtn').addEventListener('click', startLevel);
document.getElementById('restartBtn').addEventListener('click', restartGame);

// ==========================================
// EXPOSE FUNCTIONS FOR TESTING (window)
// ==========================================
// Expose functions to window for debugging (development only)
window.applySharedLogo = applySharedLogo;
window.generateLevel = generateLevel;
window.applyBrandConfig = applyBrandConfig;
window.BRAND_CONFIG = BRAND_CONFIG; // Already exposed from config.js, but ensure it's accessible

// ==========================================
// START INITIALIZATION
// ==========================================
initializeGame();
