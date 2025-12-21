// ============================================
// WALL BOUNCE BIRD - MemePlay Game Template
// ============================================

// ==================== IMPORT CONFIG ====================
import { 
    BRAND_CONFIG, 
    loadBrandConfig, 
    getGameId,
    TEMPLATE_ID
} from './config.js';
import { getSupabaseClient } from '../core/supabase-client.js';

// ==================== DOM ELEMENTS ====================
let canvas, ctx;
let scoreLabel, startScreen, gameoverScreen, finalScoreText, promoText, startBtn, retryBtn;
let gameoverPillLogo;

// ==================== GAME CONSTANTS ====================
const CONFIG = {
  WIDTH: 720,
  HEIGHT: 1000,
  GRAVITY: 0.6,
  JUMP_FORCE: -10,
  HORIZONTAL_SPEED: 6,
  WALL_OFFSET: 0,
  BIRD_SIZE: 115,
  BIRD_HITBOX_SIZE: 55,
  SPIKE_SIZE: 40,
  TOP_SPIKE_HEIGHT: 30,
  PILL_SIZE: 56,
  PILL_POINTS: 5,
  PARTICLES: { desktop: 8, mobile: 2 },
  PILL_AREA: { minX: 150, maxX: 570, minY: 200, maxY: 600 },
  DEBUG_PERFORMANCE: false
};

// ==================== GAME STATE ====================
const state = {
  running: false,
  started: false,
  gameOver: false,
  score: 0,
  bird: null,
  spikesLeft: [],
  spikesRight: [],
  topSpikes: [],
  bottomSpikes: [],
  cachedTopBottomCanvas: null,
  pill: null,
  particles: [],
  scoreTexts: [],
  spikesLeftCount: 2,
  spikesRightCount: 2,
  customLogo: null,
  customLogoImage: null,
  backgroundColor: '#87ceeb',
  perfStats: {
    collisionTime: 0,
    frameCount: 0,
    totalCollisionTime: 0,
    particlesTime: 0,
    scoreTextsTime: 0,
    totalParticlesTime: 0,
    totalScoreTextsTime: 0
  }
};

const isMobile = /Mobi|Android/i.test(navigator.userAgent);

// ==================== BIRD IMAGE ====================
const birdImage = new Image();
let birdImageLoaded = false;
let birdImageRatio = 1;
let birdImageLeft = null;
let birdImageRight = null;

// Helper function to create cached flipped images
function createCachedFlippedImages(image) {
  if (!image.width || !image.height) return;
  
  const cacheCanvas = document.createElement('canvas');
  cacheCanvas.width = image.width;
  cacheCanvas.height = image.height;
  const cacheCtx = cacheCanvas.getContext('2d');
  
  // Create right-facing image (normal)
  cacheCtx.clearRect(0, 0, cacheCanvas.width, cacheCanvas.height);
  cacheCtx.drawImage(image, 0, 0);
  birdImageRight = new Image();
  birdImageRight.onload = () => {};
  birdImageRight.onerror = () => { birdImageRight = null; };
  birdImageRight.src = cacheCanvas.toDataURL('image/png');
  
  // Create left-facing image (flipped horizontally)
  cacheCtx.clearRect(0, 0, cacheCanvas.width, cacheCanvas.height);
  cacheCtx.setTransform(-1, 0, 0, 1, image.width, 0);
  cacheCtx.drawImage(image, 0, 0);
  cacheCtx.setTransform(1, 0, 0, 1, 0, 0);
  birdImageLeft = new Image();
  birdImageLeft.onload = () => {};
  birdImageLeft.onerror = () => { birdImageLeft = null; };
  birdImageLeft.src = cacheCanvas.toDataURL('image/png');
}

// ==================== GAME CLASSES ====================
class Bird {
  constructor() {
    this.x = CONFIG.WIDTH / 2;
    this.y = CONFIG.HEIGHT / 2;
    this.vx = 0;
    this.vy = 0;
    this.size = CONFIG.BIRD_SIZE;
    this.hitboxSize = CONFIG.BIRD_HITBOX_SIZE;
    this.hitboxOffsetX = 0;
    this.hitboxOffsetY = 4;
    this.active = false;
    this.direction = 1;
  }
  update(dt) {
    if (!this.active) return;
    if (state.running === false) return;
    this.vy += CONFIG.GRAVITY * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    const half = this.size / 2;
    if (this.y - half < 0) {
      this.y = half;
    }
    if (this.y + half > CONFIG.HEIGHT) {
      this.y = CONFIG.HEIGHT - half;
    }

    const hitboxHalf = this.hitboxSize / 2;
    const birdCenterX = this.x + this.hitboxOffsetX;
    if (birdCenterX - hitboxHalf <= CONFIG.WALL_OFFSET) {
      this.x = CONFIG.WALL_OFFSET + hitboxHalf - this.hitboxOffsetX;
      wallBounce(1);
    } else if (birdCenterX + hitboxHalf >= CONFIG.WIDTH - CONFIG.WALL_OFFSET) {
      this.x = CONFIG.WIDTH - CONFIG.WALL_OFFSET - hitboxHalf - this.hitboxOffsetX;
      wallBounce(-1);
    }
  }
  draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    
    const half = this.size / 2;
    const leftReady = birdImageLeft && birdImageLeft.complete && birdImageLeft.naturalWidth > 0;
    const rightReady = birdImageRight && birdImageRight.complete && birdImageRight.naturalWidth > 0;
    
    if (birdImageLoaded && leftReady && rightReady) {
      const drawHeight = this.size;
      const drawWidth = this.size * birdImageRatio;
      const imageToDraw = this.direction === 1 ? birdImageLeft : birdImageRight;
      if (imageToDraw.complete && imageToDraw.naturalWidth > 0) {
        ctx.drawImage(imageToDraw, this.x - drawWidth / 2, this.y - drawHeight / 2, drawWidth, drawHeight);
      }
    } else if (birdImageLoaded && birdImage.complete && birdImage.naturalWidth > 0) {
      ctx.setTransform(-this.direction, 0, 0, 1, this.x, this.y);
      const drawHeight = this.size;
      const drawWidth = this.size * birdImageRatio;
      ctx.drawImage(birdImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.fillStyle = '#d93232';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(-half, -half, this.size, this.size, 18);
      } else {
        const radius = 18;
        ctx.moveTo(-half + radius, -half);
        ctx.lineTo(half - radius, -half);
        ctx.quadraticCurveTo(half, -half, half, -half + radius);
        ctx.lineTo(half, half - radius);
        ctx.quadraticCurveTo(half, half, half - radius, half);
        ctx.lineTo(-half + radius, half);
        ctx.quadraticCurveTo(-half, half, -half, half - radius);
        ctx.lineTo(-half, -half + radius);
        ctx.quadraticCurveTo(-half, -half, -half + radius, -half);
        ctx.closePath();
      }
      ctx.fill();
      ctx.fillStyle = '#f5a623';
      ctx.beginPath();
      ctx.moveTo(half - 10, -10);
      ctx.lineTo(half + 15, -2);
      ctx.lineTo(half - 10, 6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ffd447';
      ctx.beginPath();
      ctx.moveTo(-half + 8, -half + 6);
      ctx.lineTo(-half + 20, -half - 8);
      ctx.lineTo(-half + 32, -half + 10);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(half - 18, -10, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.arc(half - 15, -10, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
}

class Spike {
  constructor(y, side) {
    this.y = y;
    this.side = side;
  }
  draw() {
    ctx.fillStyle = '#737373';
    ctx.beginPath();
    if (this.side === 'left') {
      ctx.moveTo(CONFIG.WALL_OFFSET + CONFIG.SPIKE_SIZE, this.y);
      ctx.lineTo(CONFIG.WALL_OFFSET, this.y - CONFIG.SPIKE_SIZE / 2);
      ctx.lineTo(CONFIG.WALL_OFFSET, this.y + CONFIG.SPIKE_SIZE / 2);
    } else {
      ctx.moveTo(CONFIG.WIDTH - CONFIG.WALL_OFFSET - CONFIG.SPIKE_SIZE, this.y);
      ctx.lineTo(CONFIG.WIDTH - CONFIG.WALL_OFFSET, this.y - CONFIG.SPIKE_SIZE / 2);
      ctx.lineTo(CONFIG.WIDTH - CONFIG.WALL_OFFSET, this.y + CONFIG.SPIKE_SIZE / 2);
    }
    ctx.closePath();
    ctx.fill();
  }
  hit(bird) {
    const birdCenterX = bird.x + bird.hitboxOffsetX;
    const birdCenterY = bird.y + bird.hitboxOffsetY;
    const spikeX = this.side === 'left'
      ? CONFIG.WALL_OFFSET + CONFIG.SPIKE_SIZE / 2
      : CONFIG.WIDTH - CONFIG.WALL_OFFSET - CONFIG.SPIKE_SIZE / 2;
    const spikeY = this.y;
    const dx = birdCenterX - spikeX;
    const dy = birdCenterY - spikeY;
    const maxDist = bird.hitboxSize / 2 + CONFIG.SPIKE_SIZE;
    const maxDistSquared = maxDist * maxDist;
    const distSquared = dx * dx + dy * dy;
    if (distSquared > maxDistSquared) {
      return false;
    }
    const tri = this.side === 'left'
      ? [
          { x: CONFIG.WALL_OFFSET + CONFIG.SPIKE_SIZE, y: this.y },
          { x: CONFIG.WALL_OFFSET, y: this.y - CONFIG.SPIKE_SIZE / 2 },
          { x: CONFIG.WALL_OFFSET, y: this.y + CONFIG.SPIKE_SIZE / 2 }
        ]
      : [
          { x: CONFIG.WIDTH - CONFIG.WALL_OFFSET - CONFIG.SPIKE_SIZE, y: this.y },
          { x: CONFIG.WIDTH - CONFIG.WALL_OFFSET, y: this.y - CONFIG.SPIKE_SIZE / 2 },
          { x: CONFIG.WIDTH - CONFIG.WALL_OFFSET, y: this.y + CONFIG.SPIKE_SIZE / 2 }
        ];
    return intersectsCircleTriangle(bird, tri);
  }
}

class Pill {
  constructor() {
    this.active = false;
    this.x = 0;
    this.y = 0;
    this.size = CONFIG.PILL_SIZE;
  }
  spawn() {
    this.active = true;
    this.x = rand(CONFIG.PILL_AREA.minX, CONFIG.PILL_AREA.maxX);
    this.y = rand(CONFIG.PILL_AREA.minY, CONFIG.PILL_AREA.maxY);
  }
  draw() {
    if (!this.active) return;
    ctx.save();
    ctx.translate(this.x, this.y);
    if (state.customLogoImage && state.customLogoImage.complete) {
      ctx.drawImage(
        state.customLogoImage,
        -this.size / 2,
        -this.size / 2,
        this.size,
        this.size
      );
    } else {
      const grd = ctx.createRadialGradient(0, 0, 6, 0, 0, this.size / 2);
      grd.addColorStop(0, '#4da6ff');
      grd.addColorStop(0.5, '#0077be');
      grd.addColorStop(1, '#005a8b');
      ctx.fillStyle = grd;
      ctx.beginPath();
      ctx.arc(0, 0, this.size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  hit(bird) {
    if (!this.active) return false;
    const birdCenterX = bird.x + bird.hitboxOffsetX;
    const birdCenterY = bird.y + bird.hitboxOffsetY;
    const dx = birdCenterX - this.x;
    const dy = birdCenterY - this.y;
    const dist = Math.hypot(dx, dy);
    return dist < (bird.hitboxSize / 2 + this.size / 2);
  }
}

class Particle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(1.6, 6.4);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.life = 0.48;
    this.maxLife = 0.48;
  }
  update(dt) {
    this.life -= dt / 60;
    this.x += this.vx;
    this.y += this.vy + 0.15;
  }
}

class ScoreText {
  constructor(x, y, text) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.life = 0.4;
  }
  update(dt) {
    this.life -= dt / 60;
    this.y -= 1.3;
  }
  draw() {
    if (this.life <= 0) return;
    ctx.globalAlpha = Math.max(this.life / 0.4, 0);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 28px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x, this.y);
    ctx.globalAlpha = 1;
  }
}

// ==================== UTILITY FUNCTIONS ====================
function intersectsCircleTriangle(bird, [v1, v2, v3]) {
  const center = { 
    x: bird.x + bird.hitboxOffsetX, 
    y: bird.y + bird.hitboxOffsetY 
  };
  const r = bird.hitboxSize / 2;
  if (pointInTriangle(center, v1, v2, v3)) return true;
  const dist1 = Math.hypot(center.x - v1.x, center.y - v1.y);
  const dist2 = Math.hypot(center.x - v2.x, center.y - v2.y);
  const dist3 = Math.hypot(center.x - v3.x, center.y - v3.y);
  if (dist1 < r || dist2 < r || dist3 < r) return true;
  return (
    distancePointToSegment(center, v1, v2) <= r ||
    distancePointToSegment(center, v2, v3) <= r ||
    distancePointToSegment(center, v3, v1) <= r
  );
}

function distancePointToSegment(p, v, w) {
  const l2 = ((w.x - v.x) ** 2) + ((w.y - v.y) ** 2);
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
  return Math.hypot(p.x - proj.x, p.y - proj.y);
}

function pointInTriangle(pt, v1, v2, v3) {
  const d1 = sign(pt, v1, v2);
  const d2 = sign(pt, v2, v3);
  const d3 = sign(pt, v3, v1);
  const hasNeg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  const hasPos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(hasNeg && hasPos);
}

function sign(p1, p2, p3) {
  return (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
}

function rand(min, max) { 
  return Math.random() * (max - min) + min; 
}

// ==================== GAME FUNCTIONS ====================
function resetGame() {
  state.score = 0;
  state.gameOver = false;
  state.spikesLeft = [];
  state.spikesRight = [];
  state.topSpikes = createRowSpikes(true);
  state.bottomSpikes = createRowSpikes(false);
  cacheTopBottomSpikes();
  state.particles = [];
  state.scoreTexts = [];
  state.pill = new Pill();
  state.spikesLeftCount = 2;
  state.spikesRightCount = 2;
  state.bird = new Bird();
  state.perfStats = {
    collisionTime: 0,
    frameCount: 0,
    totalCollisionTime: 0,
    particlesTime: 0,
    scoreTextsTime: 0,
    totalParticlesTime: 0,
    totalScoreTextsTime: 0
  };
  if (scoreLabel) scoreLabel.textContent = 'Score: 0';
  spawnWallSpikes(false);
}

function createRowSpikes(top) {
  const spikes = [];
  const size = CONFIG.SPIKE_SIZE;
  for (let x = CONFIG.WALL_OFFSET; x < CONFIG.WIDTH - CONFIG.WALL_OFFSET; x += size) {
    spikes.push({ x, orientation: top ? 'down' : 'up' });
  }
  return spikes;
}

function cacheTopBottomSpikes() {
  const cacheCanvas = document.createElement('canvas');
  cacheCanvas.width = CONFIG.WIDTH;
  cacheCanvas.height = CONFIG.HEIGHT;
  const cacheCtx = cacheCanvas.getContext('2d');
  cacheCtx.fillStyle = '#4d4d4d';
  for (let i = 0; i < state.topSpikes.length; i++) {
    const spike = state.topSpikes[i];
    cacheCtx.beginPath();
    cacheCtx.moveTo(spike.x, 0);
    cacheCtx.lineTo(spike.x + CONFIG.SPIKE_SIZE / 2, CONFIG.TOP_SPIKE_HEIGHT);
    cacheCtx.lineTo(spike.x + CONFIG.SPIKE_SIZE, 0);
    cacheCtx.closePath();
    cacheCtx.fill();
  }
  for (let i = 0; i < state.bottomSpikes.length; i++) {
    const spike = state.bottomSpikes[i];
    cacheCtx.beginPath();
    cacheCtx.moveTo(spike.x, CONFIG.HEIGHT);
    cacheCtx.lineTo(spike.x + CONFIG.SPIKE_SIZE / 2, CONFIG.HEIGHT - CONFIG.TOP_SPIKE_HEIGHT);
    cacheCtx.lineTo(spike.x + CONFIG.SPIKE_SIZE, CONFIG.HEIGHT);
    cacheCtx.closePath();
    cacheCtx.fill();
  }
  state.cachedTopBottomCanvas = cacheCanvas;
}

function spawnWallSpikes(shouldIncrease = true) {
  if (shouldIncrease) {
    const totalSpikes = state.spikesLeftCount + state.spikesRightCount;
    if (totalSpikes < 14) {
      const randomSide = Math.random() < 0.5 ? 'left' : 'right';
      if (randomSide === 'left' && state.spikesLeftCount < 7) {
        state.spikesLeftCount++;
      } else if (randomSide === 'right' && state.spikesRightCount < 7) {
        state.spikesRightCount++;
      } else if (state.spikesLeftCount < 7) {
        state.spikesLeftCount++;
      } else if (state.spikesRightCount < 7) {
        state.spikesRightCount++;
      }
    }
  }
  state.spikesLeft = generateSideSpikes('left', state.spikesLeftCount);
  state.spikesRight = generateSideSpikes('right', state.spikesRightCount);
}

function generateSideSpikes(side, count) {
  const spikes = [];
  const used = [];
  for (let i = 0; i < count; i++) {
    let y;
    let attempts = 0;
    do {
      y = rand(160, CONFIG.HEIGHT - 160);
      attempts++;
    } while (used.some(val => Math.abs(val - y) < CONFIG.SPIKE_SIZE * 1.2) && attempts < 8);
    used.push(y);
    spikes.push(new Spike(y, side));
  }
  return spikes;
}

function wallBounce(nextDir) {
  const bird = state.bird;
  bird.direction = nextDir;
  bird.vx = CONFIG.HORIZONTAL_SPEED * nextDir;
  bird.vy = -Math.abs(CONFIG.HORIZONTAL_SPEED);
  state.score += 1;
  if (scoreLabel) scoreLabel.textContent = `Score: ${state.score}`;
  spawnParticles(bird.x, bird.y);
  spawnPill();
  setTimeout(spawnWallSpikes, 200);
}

function spawnParticles(x, y) {
  const count = isMobile ? CONFIG.PARTICLES.mobile : CONFIG.PARTICLES.desktop;
  for (let i = 0; i < count; i++) {
    state.particles.push(new Particle(x, y));
  }
}

function spawnPill() {
  if (!state.pill) state.pill = new Pill();
  state.pill.spawn();
}

function handleJump() {
  if (!state.bird) return;
  if (!state.bird.active) {
    state.bird.active = true;
    state.bird.vx = CONFIG.HORIZONTAL_SPEED;
    state.bird.direction = 1;
    spawnWallSpikes();
    spawnPill();
  }
  state.bird.vy = CONFIG.JUMP_FORCE;
}

function triggerGameOver() {
  if (!state.running) return;
  state.running = false;
  state.started = false;
  state.gameOver = true;
  if (state.bird) {
    state.bird.active = false;
    state.bird.vx = 0;
    state.bird.vy = 0;
  }
  
  const gameId = getGameId();
  window.parent?.postMessage({ type: 'GAME_OVER', gameId }, '*');
  window.parent?.postMessage({ 
    type: 'GAME_SCORE', 
    gameId, 
    score: state.score,
    level: 1
  }, '*');
  
  if (finalScoreText) finalScoreText.textContent = `Score: ${state.score}`;
  
  // Logo nhỏ ở trên đã được xóa theo yêu cầu
  
  if (gameoverPillLogo) {
    const logoSize = 95;
    gameoverPillLogo.width = logoSize;
    gameoverPillLogo.height = logoSize;
    const pillCtx = gameoverPillLogo.getContext('2d', { alpha: true });
    pillCtx.clearRect(0, 0, logoSize, logoSize);
    
    if (state.customLogoImage && state.customLogoImage.complete) {
      pillCtx.drawImage(state.customLogoImage, 0, 0, logoSize, logoSize);
      gameoverPillLogo.style.display = 'block';
    } else {
      const center = logoSize / 2;
      pillCtx.save();
      pillCtx.translate(center, center);
      const grd = pillCtx.createRadialGradient(0, 0, 6 * 1.7, 0, 0, center);
      grd.addColorStop(0, '#4da6ff');
      grd.addColorStop(0.5, '#0077be');
      grd.addColorStop(1, '#005a8b');
      pillCtx.fillStyle = grd;
      pillCtx.beginPath();
      pillCtx.arc(0, 0, center, 0, Math.PI * 2);
      pillCtx.fill();
      pillCtx.restore();
      gameoverPillLogo.style.display = 'block';
    }
  }
  
  if (promoText) promoText.textContent = BRAND_CONFIG.storyText || 'memeplay';
  
  if (gameoverScreen) {
    gameoverScreen.style.display = 'flex';
    gameoverScreen.classList.add('active');
  }
}

function checkCollisions() {
  const bird = state.bird;
  if (!bird || !bird.active) return;
  
  const startTime = performance.now();
  const birdCenterX = bird.x + bird.hitboxOffsetX;
  const birdCenterY = bird.y + bird.hitboxOffsetY;
  const birdHitboxRadius = bird.hitboxSize / 2;
  
  for (const spike of state.spikesLeft) {
    const dy = Math.abs(birdCenterY - spike.y);
    if (dy < birdHitboxRadius + CONFIG.SPIKE_SIZE) {
      const spikeX = CONFIG.WALL_OFFSET + CONFIG.SPIKE_SIZE / 2;
      const dx = Math.abs(birdCenterX - spikeX);
      if (dx < birdHitboxRadius + CONFIG.SPIKE_SIZE) {
        if (spike.hit(bird)) {
          bird.active = false;
          bird.vx = 0;
          bird.vy = 0;
          triggerGameOver();
          return;
        }
      }
    }
  }
  
  for (const spike of state.spikesRight) {
    const dy = Math.abs(birdCenterY - spike.y);
    if (dy < birdHitboxRadius + CONFIG.SPIKE_SIZE) {
      const spikeX = CONFIG.WIDTH - CONFIG.WALL_OFFSET - CONFIG.SPIKE_SIZE / 2;
      const dx = Math.abs(birdCenterX - spikeX);
      if (dx < birdHitboxRadius + CONFIG.SPIKE_SIZE) {
        if (spike.hit(bird)) {
          bird.active = false;
          bird.vx = 0;
          bird.vy = 0;
          triggerGameOver();
          return;
        }
      }
    }
  }
  
  if (birdCenterY - birdHitboxRadius <= 34) {
    bird.active = false;
    bird.vx = 0;
    bird.vy = 0;
    triggerGameOver();
    return;
  }
  
  if (birdCenterY + birdHitboxRadius > CONFIG.HEIGHT - CONFIG.TOP_SPIKE_HEIGHT) {
    bird.active = false;
    bird.vx = 0;
    bird.vy = 0;
    triggerGameOver();
    return;
  }
  
  if (state.pill && state.pill.hit(bird)) {
    state.score += CONFIG.PILL_POINTS;
    if (scoreLabel) scoreLabel.textContent = `Score: ${state.score}`;
    state.scoreTexts.push(new ScoreText(state.pill.x, state.pill.y, '+5'));
    state.pill.active = false;
  }
  
  const endTime = performance.now();
  state.perfStats.totalCollisionTime += (endTime - startTime);
}

// ==================== GAME LOOP ====================
let lastTime = 0;
function gameLoop(timestamp) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min((timestamp - lastTime) || 16.7, 32) / (1000 / 60);
  lastTime = timestamp;

  ctx.fillStyle = state.backgroundColor || '#87ceeb';
  ctx.fillRect(0, 0, CONFIG.WIDTH, CONFIG.HEIGHT);

  drawWallsAndRows();
  for (let i = 0; i < state.spikesLeft.length; i++) {
    state.spikesLeft[i].draw();
  }
  for (let i = 0; i < state.spikesRight.length; i++) {
    state.spikesRight[i].draw();
  }

  if (state.running) {
    checkCollisions();
    if (state.running && state.bird.active) {
      state.bird.update(dt);
    }
  } else if (!state.started && !state.gameOver) {
    floatIdleBird(timestamp);
  }

  if (state.pill) state.pill.draw();
  if (state.bird) state.bird.draw();

  const particlesStartTime = performance.now();
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    } else {
      p.update(dt);
    }
  }
  
  if (state.particles.length > 0) {
    ctx.save();
    ctx.fillStyle = '#fff';
    let currentAlpha = -1;
    for (let i = 0; i < state.particles.length; i++) {
      const p = state.particles[i];
      if (p.life > 0) {
        const alpha = Math.min(Math.max(p.life / p.maxLife, 0) * 1.6, 1);
        if (Math.abs(alpha - currentAlpha) > 0.01) {
          ctx.globalAlpha = alpha;
          currentAlpha = alpha;
        }
        ctx.fillRect(p.x, p.y, 5, 5);
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }
  state.perfStats.particlesTime = performance.now() - particlesStartTime;
  state.perfStats.totalParticlesTime += state.perfStats.particlesTime;

  const scoreTextsStartTime = performance.now();
  for (let i = state.scoreTexts.length - 1; i >= 0; i--) {
    const t = state.scoreTexts[i];
    if (t.life <= 0) {
      state.scoreTexts.splice(i, 1);
    } else {
      t.update(dt);
      t.draw();
    }
  }
  state.perfStats.scoreTextsTime = performance.now() - scoreTextsStartTime;
  state.perfStats.totalScoreTextsTime += state.perfStats.scoreTextsTime;

  if (state.running && CONFIG.DEBUG_PERFORMANCE) {
    state.perfStats.frameCount++;
    if (state.perfStats.frameCount % 60 === 0) {
      const avgCollisionTime = state.perfStats.totalCollisionTime / 60;
      const avgParticlesTime = state.perfStats.totalParticlesTime / 60;
      const avgScoreTextsTime = state.perfStats.totalScoreTextsTime / 60;
      const totalSpikes = state.spikesLeft.length + state.spikesRight.length;
      console.log(`[Performance] Collision: ${avgCollisionTime.toFixed(3)}ms (${totalSpikes} spikes) | Particles: ${avgParticlesTime.toFixed(3)}ms (${state.particles.length}) | ScoreTexts: ${avgScoreTextsTime.toFixed(3)}ms (${state.scoreTexts.length})`);
      state.perfStats.totalCollisionTime = 0;
      state.perfStats.totalParticlesTime = 0;
      state.perfStats.totalScoreTextsTime = 0;
      state.perfStats.frameCount = 0;
    }
  } else if (state.running && CONFIG.DEBUG_PERFORMANCE) {
    // Chỉ reset stats nếu đang debug performance
    state.perfStats.frameCount++;
    if (state.perfStats.frameCount % 60 === 0) {
      state.perfStats.totalCollisionTime = 0;
      state.perfStats.totalParticlesTime = 0;
      state.perfStats.totalScoreTextsTime = 0;
      state.perfStats.frameCount = 0;
    }
  }
}

function floatIdleBird(time) {
  if (!state.bird) return;
  state.bird.y = CONFIG.HEIGHT / 2 + Math.sin(time / 350) * 10;
}

function drawWallsAndRows() {
  if (state.cachedTopBottomCanvas) {
    ctx.drawImage(state.cachedTopBottomCanvas, 0, 0);
  } else {
    ctx.fillStyle = '#4d4d4d';
    for (let i = 0; i < state.topSpikes.length; i++) {
      const spike = state.topSpikes[i];
      ctx.beginPath();
      ctx.moveTo(spike.x, 0);
      ctx.lineTo(spike.x + CONFIG.SPIKE_SIZE / 2, CONFIG.TOP_SPIKE_HEIGHT);
      ctx.lineTo(spike.x + CONFIG.SPIKE_SIZE, 0);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = 0; i < state.bottomSpikes.length; i++) {
      const spike = state.bottomSpikes[i];
      ctx.beginPath();
      ctx.moveTo(spike.x, CONFIG.HEIGHT);
      ctx.lineTo(spike.x + CONFIG.SPIKE_SIZE / 2, CONFIG.HEIGHT - CONFIG.TOP_SPIKE_HEIGHT);
      ctx.lineTo(spike.x + CONFIG.SPIKE_SIZE, CONFIG.HEIGHT);
      ctx.closePath();
      ctx.fill();
    }
  }
}

function beginGame() {
  if (state.running) return;
  
  // ✅ Kiểm tra: Nếu đang từ start screen (chưa started) và đã có spikes → giữ nguyên
  // Nếu đang từ game over (đã started và gameOver) → reset lại
  const isFromStartScreen = !state.started && !state.gameOver;
  
  // ✅ Kiểm tra chi tiết hơn: spikes phải có length > 0 VÀ có spikesLeftCount/RightCount
  const hasLeftSpikes = state.spikesLeft && Array.isArray(state.spikesLeft) && state.spikesLeft.length > 0;
  const hasRightSpikes = state.spikesRight && Array.isArray(state.spikesRight) && state.spikesRight.length > 0;
  const hasTopSpikes = state.topSpikes && Array.isArray(state.topSpikes) && state.topSpikes.length > 0;
  const hasBottomSpikes = state.bottomSpikes && Array.isArray(state.bottomSpikes) && state.bottomSpikes.length > 0;
  const hasExistingSpikes = hasLeftSpikes && hasRightSpikes && hasTopSpikes && hasBottomSpikes;
  
  if (isFromStartScreen && hasExistingSpikes) {
    // ✅ Từ start screen và đã có spikes → giữ nguyên TẤT CẢ spikes (KHÔNG gọi resetGame)
    state.score = 0;
    state.gameOver = false;
    state.particles = [];
    state.scoreTexts = [];
    state.pill = new Pill();
    state.bird = new Bird();
    state.perfStats = {
      collisionTime: 0,
      frameCount: 0,
      totalCollisionTime: 0,
      particlesTime: 0,
      scoreTextsTime: 0,
      totalParticlesTime: 0,
      totalScoreTextsTime: 0
    };
    if (scoreLabel) scoreLabel.textContent = 'Score: 0';
    // ✅ KHÔNG reset spikes, topSpikes, bottomSpikes, cached canvas
  } else {
    // ✅ Từ game over hoặc chưa có spikes → reset lại tất cả
    resetGame();
  }
  
  state.running = true;
  state.started = true;
  state.gameOver = false;
  if (startScreen) {
    startScreen.style.display = 'none';
    startScreen.classList.remove('active');
  }
  if (gameoverScreen) {
    gameoverScreen.style.display = 'none';
    gameoverScreen.classList.remove('active');
  }
  const gameId = getGameId();
  window.parent?.postMessage({ type: 'GAME_START', gameId }, '*');
  if (state.bird) {
    handleJump();
  }
}

// ==================== LOAD ASSETS ====================
function loadAssets() {
  return new Promise((resolve) => {
    let loaded = 0;
    const total = 1; // birdImage
    
    const originalBirdImage = new Image();
    originalBirdImage.src = './assets/bird.webp';
    originalBirdImage.onload = () => {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = originalBirdImage.width;
      tempCanvas.height = originalBirdImage.height;
      const tempCtx = tempCanvas.getContext('2d');
      tempCtx.drawImage(originalBirdImage, 0, 0);
      
      let imageData;
      try {
        imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
      } catch (e) {
        console.warn('Cannot process image (tainted canvas), using original');
        birdImage.src = originalBirdImage.src;
        birdImage.onload = () => {
          birdImageLoaded = true;
          if (birdImage.width && birdImage.height) {
            birdImageRatio = birdImage.width / birdImage.height;
            createCachedFlippedImages(birdImage);
          }
          loaded++;
          if (loaded === total) resolve();
        };
        return;
      }
      
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a === 0) continue;
        const isWhite = r > 240 && g > 240 && b > 240 && 
                       Math.abs(r - g) < 10 && Math.abs(g - b) < 10 && Math.abs(r - b) < 10;
        if (isWhite) {
          data[i + 3] = 0;
        }
      }
      
      tempCtx.putImageData(imageData, 0, 0);
      birdImage.onload = () => {
        birdImageLoaded = true;
        if (birdImage.width && birdImage.height) {
          birdImageRatio = birdImage.width / birdImage.height;
          createCachedFlippedImages(birdImage);
        }
        loaded++;
        if (loaded === total) resolve();
      };
      birdImage.src = tempCanvas.toDataURL('image/png');
    };
    originalBirdImage.onerror = () => {
      console.warn('Failed to load bird image');
      loaded++;
      if (loaded === total) resolve();
    };
  });
}

// ==================== INIT GAME CONFIG ====================
function initGameConfig() {
  return new Promise(async (resolve) => {
    const gameId = getGameId();
    
    if (!gameId) {
      const playtestKey = 'wall_bird_brand_config_playtest';
      const playtestConfig = localStorage.getItem(playtestKey);
      if (playtestConfig) {
        try {
          const parsed = JSON.parse(playtestConfig);
          if (parsed.fragmentLogoUrl || parsed.logoUrl) {
            BRAND_CONFIG.logoUrl = parsed.fragmentLogoUrl || parsed.logoUrl || '';
          }
          if (parsed.story || parsed.storyText || parsed.story_one) {
            BRAND_CONFIG.storyText = parsed.story || parsed.storyText || parsed.story_one || 'memeplay';
          }
          if (parsed.backgroundColor || parsed.mapColor) {
            BRAND_CONFIG.backgroundColor = parsed.backgroundColor || parsed.mapColor || '#87ceeb';
          }
        } catch (e) {
          console.warn('[Wall-Bird] Failed to parse playtest config:', e);
        }
      }
    } else {
      const hasLocalConfig = loadBrandConfig(gameId);
      
      // ✅ Load từ Supabase nếu không có trong localStorage
      if (!hasLocalConfig && gameId) {
        await loadBrandConfigFromSupabase(gameId);
      }
    }
    
    // Apply config to state
    state.backgroundColor = BRAND_CONFIG.backgroundColor || '#87ceeb';
    
    // Load logo image nếu có
    loadLogoImage(BRAND_CONFIG.logoUrl);
    
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
      BRAND_CONFIG.storyText = data.story_one || data.story_text || data.storyText || 'memeplay';
    }
    if (data.map_color || data.mapColor) {
      BRAND_CONFIG.backgroundColor = data.map_color || data.mapColor || '#87ceeb';
    }
    
    return true;
  } catch (err) {
    console.warn('[Wall-Bird] Failed to load from Supabase:', err);
    return false;
  }
}

// Helper function để load logo image (tránh code trùng lặp)
function loadLogoImage(logoUrl) {
  if (logoUrl) {
    state.customLogo = logoUrl;
    const logoImg = new Image();
    logoImg.onload = () => {
      state.customLogoImage = logoImg;
    };
    logoImg.onerror = () => {
      state.customLogoImage = null;
    };
    logoImg.src = logoUrl;
  } else {
    state.customLogo = null;
    state.customLogoImage = null;
  }
}

function updateUIWithConfig() {
  if (promoText) {
    promoText.textContent = BRAND_CONFIG.storyText || 'memeplay';
  }
}

// ==================== UPDATE CONFIG LISTENER ====================
window.addEventListener('message', (event) => {
  if (event.data.type === 'UPDATE_CONFIG') {
    const config = event.data.config || {};
    
    if (config.logoUrl !== undefined) {
      BRAND_CONFIG.logoUrl = config.logoUrl;
      loadLogoImage(config.logoUrl);
    }
    
    if (config.storyText !== undefined) {
      BRAND_CONFIG.storyText = config.storyText;
    }
    
    if (config.backgroundColor !== undefined) {
      BRAND_CONFIG.backgroundColor = config.backgroundColor;
      state.backgroundColor = config.backgroundColor;
    }
    
    updateUIWithConfig();
  }
});

// ==================== INITIALIZE ON LOAD ====================
document.addEventListener('DOMContentLoaded', () => {
  canvas = document.getElementById('game-canvas');
  if (!canvas) {
    console.error('[Wall-Bird] Canvas not found!');
    return;
  }
  
  ctx = canvas.getContext('2d', { desynchronized: true });
  canvas.width = CONFIG.WIDTH;
  canvas.height = CONFIG.HEIGHT;
  
  // Setup DOM elements
  scoreLabel = document.getElementById('score-label');
  startScreen = document.getElementById('start-screen');
  gameoverScreen = document.getElementById('gameover-screen');
  finalScoreText = document.getElementById('final-score-text');
  promoText = document.getElementById('promo-text');
  startBtn = document.getElementById('start-btn');
  retryBtn = document.getElementById('retry-btn');
  gameoverPillLogo = document.getElementById('gameover-pill-logo');
  
  // Setup screens
  if (gameoverScreen) {
    gameoverScreen.style.display = 'none';
    gameoverScreen.classList.remove('active');
  }
  
  if (startScreen) {
    startScreen.classList.add('active');
    startScreen.style.display = 'flex';
  }
  
  // Event listeners
  if (startBtn) {
    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      beginGame();
    });
  }
  
  if (retryBtn) {
    retryBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (gameoverScreen) {
        gameoverScreen.style.display = 'none';
        gameoverScreen.classList.remove('active');
      }
      beginGame();
    });
  }
  
  ['pointerdown', 'touchstart'].forEach(evt => {
    canvas.addEventListener(evt, (e) => {
      e.preventDefault();
      if (!state.running && !state.started) {
        beginGame();
        return;
      }
      if (!state.running && state.started && gameoverScreen && !gameoverScreen.classList.contains('active')) {
        beginGame();
        return;
      }
      if (state.running && state.bird) {
        handleJump();
      }
    }, { passive: false });
  });
  
  if (startScreen) {
    startScreen.addEventListener('click', (e) => {
      if (e.target === startScreen || e.target === startBtn) {
        beginGame();
      }
    });
  }
  
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!state.running && !state.started) {
        beginGame();
        return;
      }
      if (state.running && state.bird) {
        handleJump();
      }
    }
  });
  
  // Initialize game
  initGameConfig().then(() => {
    loadAssets().then(() => {
      // ✅ Tạo chim ngay từ đầu để hiển thị trên start screen
      if (!state.bird) {
        state.bird = new Bird();
        // Set vị trí idle (giữa màn hình)
        state.bird.x = CONFIG.WIDTH / 2;
        state.bird.y = CONFIG.HEIGHT / 2;
        state.bird.active = false;
      }
      // ✅ Tạo các elements cần thiết cho start screen (đầy đủ như khi game bắt đầu)
      if (!state.topSpikes) {
        state.topSpikes = createRowSpikes(true);
        state.bottomSpikes = createRowSpikes(false);
        cacheTopBottomSpikes();
      }
      // ✅ Tạo spikes left và right (giống như resetGame) - LUÔN tạo để đảm bảo có spikes
      // Kiểm tra cả length và spikesLeftCount để đảm bảo spikes đã được tạo
      const needsSpikes = !state.spikesLeft || state.spikesLeft.length === 0 || 
                          !state.spikesRight || state.spikesRight.length === 0 ||
                          state.spikesLeftCount === undefined || state.spikesRightCount === undefined;
      
      if (needsSpikes) {
        state.spikesLeft = [];
        state.spikesRight = [];
        state.spikesLeftCount = 2;
        state.spikesRightCount = 2;
        spawnWallSpikes(false); // Tạo spikes ban đầu
      }
      if (!state.pill) {
        state.pill = new Pill();
      }
      gameLoop(performance.now());
    });
  });
  
  // Send ready message
  window.parent?.postMessage({ type: 'WALL_BIRD_GAME_READY' }, '*');
});

