// ===== CONFIG =====
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

// ✅ Import config và shared utilities
import { BRAND_CONFIG, loadBrandConfig, saveBrandConfig } from './config.js';
import { getSupabaseClient } from '../core/supabase-client.js';
import { loadLogoImage } from '../core/logo-loader.js';
import { getGameId } from '../core/game-id-utils.js';

// ✅ Template constants
const TEMPLATE_ID = 'rocket-bnb-template';

// ✅ Helper: Apply one shared logo for both in-game and game-over
function applySharedLogo(url) {
  if (!url) return;
  const normalizedUrl = url.trim();
  if (!normalizedUrl) return;
  BRAND_CONFIG.coinLogoUrl = normalizedUrl;
  BRAND_CONFIG.gameOverLogoUrl = normalizedUrl;
  loadLogoImage(normalizedUrl, (img) => {
    BRAND_CONFIG.coinLogo = img;
    BRAND_CONFIG.gameOverLogo = img;
  });
}

// ✅ Helper: Apply config (logo/story/smartContract) in one place
function applyBrandConfig({ logoUrl = '', tokenStory = 'welcome to memeplay', smartContract = '' }) {
  const normalizedLogo = logoUrl ? logoUrl.trim() : '';
  Object.assign(BRAND_CONFIG, {
    coinLogoUrl: normalizedLogo,
    gameOverLogoUrl: normalizedLogo,
    tokenStory: tokenStory || 'welcome to memeplay',
    smartContract: smartContract || ''
  });
  applySharedLogo(normalizedLogo);
}

// ✅ Load brand config from Supabase (fallback when localStorage doesn't have it)
async function loadBrandConfigFromSupabase(gameId) {
  if (!gameId) {
    console.warn('[Rocket BNB] Missing gameId, skip loading brand config from Supabase');
    return false;
  }
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      console.warn('[Rocket BNB] Supabase client unavailable');
      return false;
    }
    const { data, error } = await supabase.rpc('list_user_created_games', {
      p_template_id: TEMPLATE_ID
    });
    if (error) {
      console.error('[Rocket BNB] list_user_created_games error:', error.message || error);
      return false;
    }
    if (!Array.isArray(data)) {
      console.warn('[Rocket BNB] Unexpected response while loading brand config:', data);
      return false;
    }
    const foundGame = data.find(item => {
      const id = item?.game_id || item?.id;
      return id === gameId;
    });
    if (!foundGame) {
      console.warn(`[Rocket BNB] Game ${gameId} not found when loading brand config`);
      return false;
    }
    
    // ✅ Build config object với fallback fields (tương thích với schema cũ) và áp dụng
    applyBrandConfig({
      logoUrl: foundGame.game_over_logo_url || foundGame.coin_logo_url || foundGame.fragment_logo_url || '',
      tokenStory: foundGame.token_story || foundGame.story_one || 'welcome to memeplay',
      smartContract: foundGame.smart_contract || ''
    });
    
    // ✅ Save to localStorage for next time
    saveBrandConfig(gameId);
    return true;
  } catch (error) {
    console.error('[Rocket BNB] Unexpected error while loading brand config:', error);
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
    
    const sharedLogoUrl = config.gameOverLogoUrl || config.coinLogoUrl || '';
    // ✅ Update config ngay lập tức (không cần reload)
    applyBrandConfig({
      logoUrl: sharedLogoUrl,
      tokenStory: config.tokenStory,
      smartContract: config.smartContract
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
          coinLogo: null,
          coinLogoUrl: '',
          gameOverLogo: null,
          gameOverLogoUrl: '',
          tokenStory: 'welcome to memeplay',
          smartContract: ''
        });
      }
    }
  } else {
    // ✅ Editor mode: Load config từ localStorage (playtest)
    loadBrandConfig();
  }
  
  // ✅ Load shared logo nếu có
  const sharedLogoUrl = BRAND_CONFIG.gameOverLogoUrl || BRAND_CONFIG.coinLogoUrl || '';
  applySharedLogo(sharedLogoUrl);
  
  // ✅ Start game loop
  loop();
  
  // ✅ Send GAME_READY message
  if (window.parent && window.parent !== window) {
    window.parent.postMessage({
      type: 'ROCKET_BNB_GAME_READY',
      gameId: gameId || 'rocket-bnb'
    }, '*');
  }
}

// ===== CANVAS SETUP =====
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { 
  alpha: false,
  desynchronized: true,
  willReadFrequently: false
});
ctx.imageSmoothingEnabled = false;

// ✅ Detect if running in iframe
const isInIframe = window.self !== window.top;

  // No-op

// ✅ Desktop speed adjustment: Playmode (full page) chạy nhanh hơn playtest (iframe)
// Để đồng bộ tốc độ, làm chậm playmode xuống bằng playtest
// Chỉ áp dụng cho desktop, không áp dụng cho mobile
const DESKTOP_SPEED_MULTIPLIER = (!isMobile && !isInIframe) ? 0.75 : 1.0; // Playmode chạy nhanh hơn, nên làm chậm 75%

// ✅ Canvas always 720×1000px
canvas.width = 720;
canvas.height = 1000;

// Load rocket WebP
const img = new Image();
img.src = 'assets/rocket-pixel.webp';
let loaded = false;
img.onload = () => {
  loaded = true;
};

// Load 3 rock obstacles
const rocks = [];
const rockPaths = ['assets/rock1.webp', 'assets/rock2.webp', 'assets/rock3.webp'];
let rocksLoaded = 0;
rockPaths.forEach((path, i) => {
  rocks[i] = new Image();
  rocks[i].src = path;
  rocks[i].onload = () => {
    rocksLoaded++;
  };
});

// ==========================================
// AUDIO (Mobile-safe unlock)
// ==========================================
const ctx2 = new (window.AudioContext || window.webkitAudioContext)();
let audioUnlocked = false;

function unlockAudio() {
  try {
    if (ctx2.state === 'suspended') {
      ctx2.resume().then(() => {
        if (audioUnlocked) return;
        audioUnlocked = true;
        try {
          const o = ctx2.createOscillator();
          const g = ctx2.createGain();
          o.connect(g);
          g.connect(ctx2.destination);
          g.gain.setValueAtTime(0.0001, ctx2.currentTime);
          o.frequency.setValueAtTime(1, ctx2.currentTime);
          o.start(ctx2.currentTime);
          o.stop(ctx2.currentTime + 0.01);
        } catch (err) {
          console.log('Silent unlock error:', err);
        }
      }).catch(() => {});
    } else if (ctx2.state === 'running' && !audioUnlocked) {
      audioUnlocked = true;
      try {
        const o = ctx2.createOscillator();
        const g = ctx2.createGain();
        o.connect(g);
        g.connect(ctx2.destination);
        g.gain.setValueAtTime(0.0001, ctx2.currentTime);
        o.frequency.setValueAtTime(1, ctx2.currentTime);
        o.start(ctx2.currentTime);
        o.stop(ctx2.currentTime + 0.01);
      } catch (err) {}
    }
  } catch (e) {
    console.log('unlockAudio error:', e);
  }
}

function beep(freq, dur, type = 'square') {
  try {
    if (ctx2.state === 'suspended') {
      unlockAudio();
    }
  } catch (e) {}
  
  try {
    const o = ctx2.createOscillator();
    const g = ctx2.createGain();
    o.connect(g);
    g.connect(ctx2.destination);
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.3, ctx2.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx2.currentTime + dur);
    o.start();
    o.stop(ctx2.currentTime + dur);
  } catch (e) {
    console.log('beep error:', e);
  }
}

// Game vars
let started = false;
let gameOver = false;
let score = 0;
let frames = 0;

// ✅ MOBILE GAME SPEED BOOST
const MOBILE_GAME_SPEED = isMobile ? 1.3225 : 1.0;
const MOBILE_PIPE_BOOST = isMobile ? 1.5 * MOBILE_GAME_SPEED : 1.0;
const MOBILE_GRAVITY_BOOST = isMobile ? 1.4 * MOBILE_GAME_SPEED : 1.0;
const MOBILE_SPAWN_ADJUST = isMobile ? 0.6 : 1.0;

// ✅ Desktop speed adjustment: Áp dụng multiplier cho desktop playmode
const GAME_SPEED = isMobile ? MOBILE_GAME_SPEED : (1.0 * DESKTOP_SPEED_MULTIPLIER);
const PIPE_BOOST = isMobile ? MOBILE_PIPE_BOOST : (1.0 * DESKTOP_SPEED_MULTIPLIER);
const GRAVITY_BOOST = isMobile ? MOBILE_GRAVITY_BOOST : (1.0 * DESKTOP_SPEED_MULTIPLIER);

// Rocket
const rocket = {
  x: 150,
  y: canvas.height / 2,
  w: 180,
  h: 156,
  vy: 0,
  
  draw() {
    if (!loaded) return;
    
    const rot = Math.max(-30, Math.min(30, this.vy * 4.86)) * Math.PI / 180;
    const centerX = this.x + this.w/2;
    const centerY = this.y + this.h/2;
    
    if (Math.abs(rot) > 0.01) {
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rot);
      ctx.drawImage(img, -this.w/2, -this.h/2, this.w, this.h);
      ctx.restore();
    } else {
      ctx.drawImage(img, this.x, this.y, this.w, this.h);
    }
  },
  
  update() {
    if (!started || gameOver) return;
    this.vy += 0.312 * GRAVITY_BOOST;
    this.y += this.vy;
  },
  
  jump() {
    if (gameOver) return;
    
    // ✅ Send GAME_START on first jump
    if (!started) {
      started = true;
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'GAME_START',
          gameId: EMBEDDED_GAME_ID || 'rocket-bnb'
        }, '*');
        console.log('📤 Sent GAME_START to parent');
      }
    }
    
    const jumpForce = -5.76 * (isMobile ? 1.3225 : 1.0);
    this.vy = jumpForce;
    beep(400, 0.1);
  }
};

// ✨ Background gradient + stars (PRE-RENDERED)
const bgCanvas = document.createElement('canvas');
bgCanvas.width = 720;
bgCanvas.height = 1000;
const bgCtx = bgCanvas.getContext('2d');

const bgGradient = bgCtx.createLinearGradient(0, 0, 0, bgCanvas.height);
bgGradient.addColorStop(0, '#1A0A2E');
bgGradient.addColorStop(0.5, '#2D1B4E');
bgGradient.addColorStop(1, '#0F051D');
bgCtx.fillStyle = bgGradient;
bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

const starCount = 5;
bgCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
for (let i = 0; i < starCount; i++) {
  const x = Math.random() * bgCanvas.width;
  const y = Math.random() * bgCanvas.height;
  const size = 2;
  bgCtx.fillRect(x, y, size, size);
}

// Coins/Collectibles
const coins = [];
class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 80;
    this.collected = false;
  }
  
  draw() {
    if (this.collected) return;
    
    // ✅ Use custom logo if available, otherwise yellow circle
    if (BRAND_CONFIG.coinLogo) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size/2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(BRAND_CONFIG.coinLogo, this.x - this.size/2, this.y - this.size/2, this.size, this.size);
      ctx.restore();
    } else {
      // Placeholder: Yellow circle
      ctx.save();
      ctx.fillStyle = '#F3BA2F';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size/2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size/2 - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
  
  update() {
    if (!started || gameOver || this.collected) return;
    this.x -= 2.72 * PIPE_BOOST;
    
    const dist = Math.hypot(this.x - (rocket.x + rocket.w/2), this.y - (rocket.y + rocket.h/2));
    if (dist < (this.size + Math.min(rocket.w, rocket.h)) / 2) {
      this.collected = true;
      score += 5;
      document.getElementById('score').textContent = score;
      beep(800, 0.15, 'sine');
    }
  }
}

// Obstacles (3 rocks stacked vertically)
const pipes = [];
class Pipe {
  constructor() {
    this.x = canvas.width;
    this.w = 144;
    this.gap = 230 + Math.random() * 90;
    this.top = Math.random() * (canvas.height - this.gap - 100) + 50;
    this.passed = false;
    this.rockSize = 144;
    this.rocksPerColumn = 3;
    this.rockSpacing = 0;
    this.topRocks = [
      Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 3)
    ];
    this.bottomRocks = [
      Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 3),
      Math.floor(Math.random() * 3)
    ];
  }
  
  draw() {
    if (rocksLoaded < 3) return;
    
    const rockW = this.rockSize;
    const rockH = this.rockSize;
    const overlap = 3;
    const rockShrinkY = 10;
    const effectiveRockH = rockH - overlap;
    
    // TOP ROCKS
    const topGapEdge = this.top - rockShrinkY;
    const topRocksCount = Math.ceil(topGapEdge / effectiveRockH);
    
    for (let i = 0; i < topRocksCount; i++) {
      const rockType = this.topRocks[i % 3];
      const yPos = topGapEdge - (i + 1) * effectiveRockH;
      if (yPos + rockH > 0) {
        ctx.drawImage(rocks[rockType], this.x, yPos, rockW, rockH);
      }
    }
    
    this.actualTopRockBottom = topGapEdge;
    
    // BOTTOM ROCKS
    const bottomGapEdge = this.top + this.gap + rockShrinkY;
    const bottomRocksCount = Math.ceil((canvas.height - bottomGapEdge) / effectiveRockH);
    
    for (let i = 0; i < bottomRocksCount; i++) {
      const rockType = this.bottomRocks[i % 3];
      const yPos = bottomGapEdge + i * effectiveRockH;
      if (yPos < canvas.height) {
        ctx.drawImage(rocks[rockType], this.x, yPos, rockW, rockH);
      }
    }
    
    this.actualBottomRockTop = bottomGapEdge;
  }
  
  update() {
    if (!started || gameOver) return;
    this.x -= 2.72 * PIPE_BOOST;
    
    const hitboxW = 125;
    const hitboxH = 73;
    const offsetUp = 9;
    const rocketShrinkX = (rocket.w - hitboxW) / 2;
    const rocketShrinkY = (rocket.h - hitboxH) / 2 - offsetUp;
    const rocketLeft = rocket.x + rocketShrinkX;
    const rocketRight = rocket.x + rocket.w - rocketShrinkX;
    const rocketTop = rocket.y + rocketShrinkY;
    const rocketBottom = rocket.y + rocketShrinkY + hitboxH;
    
    const rockShrinkX = 20;
    const rockShrinkY = 10;
    const rockLeft = this.x + rockShrinkX;
    const rockRight = this.x + this.w - rockShrinkX;
    const topRockBottom = this.actualTopRockBottom - rockShrinkY;
    const bottomRockTop = this.actualBottomRockTop;
    
    if (rocketTop < rockShrinkY || rocketBottom > canvas.height - rockShrinkY) {
      console.log('💥 HIT CANVAS!');
      beep(200, 0.2, 'sawtooth');
      end();
    }
    
    const horizontalOverlap = rocketRight > rockLeft && rocketLeft < rockRight;
    const hitTopRock = rocketTop < topRockBottom;
    const hitBottomRock = rocketBottom > bottomRockTop;
    
    if (horizontalOverlap && (hitTopRock || hitBottomRock)) {
      console.log('💥 HITBOX COLLISION!');
      beep(200, 0.2, 'sawtooth');
      end();
    }
    
    if (!this.passed && this.x + this.w < rocket.x) {
      this.passed = true;
      score++;
      document.getElementById('score').textContent = score;
      beep(800, 0.1, 'sine');
    }
  }
}

function spawn() {
  if (!started || gameOver) return;
  const rate = Math.floor(158 * MOBILE_SPAWN_ADJUST);
  if (frames % rate === 0) {
    const newPipe = new Pipe();
    pipes.push(newPipe);
    
    if (Math.random() < 0.5 && pipes.length > 0) {
      const prevPipe = pipes[pipes.length - 2];
      if (prevPipe) {
        const coinX = prevPipe.x + (newPipe.x - prevPipe.x) / 2;
        const coinY = 100 + Math.random() * 800;
        coins.push(new Coin(coinX, coinY));
      }
    }
  }
}

function loop() {
  try {
    ctx.drawImage(bgCanvas, 0, 0);
    
    if (!loaded) {
      ctx.fillStyle = 'white';
      ctx.font = '20px monospace';
      ctx.fillText('Loading rocket...', 50, 50);
    }
    if (rocksLoaded < 3) {
      ctx.fillStyle = 'white';
      ctx.font = '20px monospace';
      ctx.fillText(`Loading rocks... ${rocksLoaded}/3`, 50, 80);
    }
    
    rocket.update();
    rocket.draw();
    
    spawn();
    
    for (let i = pipes.length - 1; i >= 0; i--) {
      pipes[i].update();
      pipes[i].draw();
      if (pipes[i].x + pipes[i].w < 0) pipes.splice(i, 1);
    }
    
    for (let i = coins.length - 1; i >= 0; i--) {
      coins[i].update();
      coins[i].draw();
      if (coins[i].x < -50 || coins[i].collected) coins.splice(i, 1);
    }
    
    frames++;
    requestAnimationFrame(loop);
  } catch (err) {
    console.error('💥 GAME LOOP ERROR:', err);
    ctx.fillStyle = 'red';
    ctx.font = '16px monospace';
    ctx.fillText('ERROR: ' + err.message, 50, 100);
  }
}

function end() {
  if (gameOver) return;
  gameOver = true;
  document.getElementById('finalScore').textContent = score;
  
  // ✅ Send score and GAME_OVER to parent (required for toast rewards and play counting)
  if (window.parent && window.parent !== window) {
    const gameId = EMBEDDED_GAME_ID || 'rocket-bnb';
    
    // Send GAME_SCORE
    window.parent.postMessage({
      type: 'GAME_SCORE',
      score: score,
      gameId: gameId
    }, '*');
    console.log('📤 Sent GAME_SCORE to parent:', score);
    
    // ✅ Send GAME_OVER (required for toast rewards and play counting)
    window.parent.postMessage({
      type: 'GAME_OVER',
      gameId: gameId
    }, '*');
    console.log('📤 Sent GAME_OVER to parent:', gameId);
  }
  
  // ✅ Update UI - Use custom logo if available
  const logoEl = document.getElementById('tokenLogo');
  const tokenStory = BRAND_CONFIG.tokenStory || 'welcome to memeplay';
  
  if (BRAND_CONFIG.gameOverLogo) {
    logoEl.src = BRAND_CONFIG.gameOverLogoUrl;
    // ✅ Logo styling - không có khung tròn, size lớn hơn
    logoEl.style.width = '160px';
    logoEl.style.height = '160px';
    logoEl.style.border = 'none';
    logoEl.style.borderRadius = '0';
    logoEl.style.background = 'transparent';
    logoEl.style.objectFit = 'contain';
  } else {
    // Placeholder: Yellow circle (fallback khi không có logo)
    logoEl.src = '';
    logoEl.style.width = '160px';
    logoEl.style.height = '160px';
    logoEl.style.border = '2px solid #F3BA2F';
    logoEl.style.borderRadius = '50%';
    logoEl.style.background = 'linear-gradient(135deg, #F3BA2F, #FFD700)';
    logoEl.style.objectFit = 'none';
  }
  
  document.getElementById('tokenStory').textContent = tokenStory;
  document.getElementById('gameOver').classList.add('show');
  
  beep(800, 0.5);
}

function restart() {
  gameOver = false;
  started = false;
  score = 0;
  frames = 0;
  pipes.length = 0;
  coins.length = 0;
  rocket.y = canvas.height / 2;
  rocket.vy = 0;
  document.getElementById('score').textContent = '0';
  document.getElementById('gameOver').classList.remove('show');
  
  // ✅ Reset game state để có thể chơi lại
  // Game sẽ tự động start khi user click/jump lần đầu
}

// ✅ Expose restart function to window scope (required for onclick in HTML)
window.restart = restart;

canvas.addEventListener('click', () => {
  unlockAudio();
  rocket.jump();
});
canvas.addEventListener('touchstart', (e) => { 
  e.preventDefault(); 
  unlockAudio();
  rocket.jump(); 
});
document.addEventListener('keydown', (e) => { 
  if (e.code === 'Space') { 
    e.preventDefault(); 
    unlockAudio();
    rocket.jump(); 
  }
});

// ✅ Send GAME_READY message when game is ready
if (window.parent && window.parent !== window) {
  window.parent.postMessage({
    type: 'ROCKET_BNB_GAME_READY',
    gameId: EMBEDDED_GAME_ID || 'rocket-bnb'
  }, '*');
  console.log('📤 Sent ROCKET_BNB_GAME_READY to parent');
}

// ✅ Initialize game when DOM is ready (or immediately if already loaded)
if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initializeGame);
} else {
  // DOM already loaded, run immediately
  initializeGame();
}

