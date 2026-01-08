// ============================================
// PET AVATAR - MemePlay Game Template
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

// ==================== IDLE ANIMATION CLASSES ====================

class BlinkRenderer {
  constructor() {
    this.baseImage = null; this.blinkImage = null; this.isBlinking = false;
    this.blinkStartTime = 0; this.nextBlinkTime = 0;
    this.closeDuration = 100; this.holdDuration = 500; this.openDuration = 100;
    this.blinkDuration = 700; this.minInterval = 2000; this.maxInterval = 5000;
  }
  async loadImages(basePath, blinkPath) {
    return new Promise((resolve) => {
      let loaded = 0, hasError = false;
      const check = () => { if (++loaded === 2 && !hasError) { this.scheduleNextBlink(); resolve(true); } };
      const error = (p, t) => { if (!hasError) { hasError = true; console.error(`❌ Failed to load ${t}:`, p); resolve(false); } };
      const loadImg = (path, type) => {
        const img = new Image();
        img.onload = check;
        img.onerror = () => error(path, type);
        img.src = path;
        return img;
      };
      this.baseImage = loadImg(basePath, 'base');
      this.blinkImage = loadImg(blinkPath, 'blink');
    });
  }
  scheduleNextBlink() { this.nextBlinkTime = performance.now() + this.minInterval + Math.random() * (this.maxInterval - this.minInterval); }
  update(t) {
    if (t < this.nextBlinkTime) return;
    if (this.isBlinking) {
      if (t - this.blinkStartTime >= this.blinkDuration) { this.isBlinking = false; this.scheduleNextBlink(); }
    } else { this.isBlinking = true; this.blinkStartTime = t; }
  }
  render(ctx, w, h, t) {
    this.update(t);
    let opacity = 0;
    if (this.isBlinking) {
      const elapsed = t - this.blinkStartTime;
      const closeEnd = this.closeDuration;
      const holdEnd = closeEnd + this.holdDuration;
      if (elapsed < closeEnd) {
        opacity = elapsed / closeEnd;
      } else if (elapsed < holdEnd) {
        opacity = 1;
      } else {
        opacity = 1 - (elapsed - holdEnd) / this.openDuration;
      }
    }
    return { baseImage: this.baseImage, blinkImage: this.blinkImage, blinkOpacity: Math.max(0, Math.min(1, opacity)) };
  }
  isReady() { return this.baseImage?.complete && this.blinkImage?.complete; }
}

class SmokeRenderer {
  constructor() {
    this.smokeImage = null; this.frameCount = 20; this.frameDuration = 200;
    this.currentFrame = 0; this.lastFrameTime = 0; this.opacities = []; this.isPlaying = false;
  }
  initOpacities() { this.opacities = []; for (let i = 0; i < this.frameCount; i++) this.opacities.push(i / (this.frameCount - 1)); }
  async loadImage(path) {
    return new Promise((resolve) => {
      this.smokeImage = new Image();
      this.smokeImage.onload = () => { this.initOpacities(); resolve(true); };
      this.smokeImage.onerror = () => { console.error('❌ Failed to load smoke:', path); resolve(false); };
      this.smokeImage.src = path;
    });
  }
  start() { if (this.smokeImage?.complete) { this.isPlaying = true; this.currentFrame = 0; this.lastFrameTime = performance.now(); } }
  stop() { this.isPlaying = false; }
  update(t) {
    if (!this.isPlaying) return;
    if (t - this.lastFrameTime >= this.frameDuration) { this.currentFrame = (this.currentFrame + 1) % this.frameCount; this.lastFrameTime = t; }
  }
  render(ctx, w, h, t) {
    this.update(t);
    if (!this.isPlaying || !this.smokeImage) return { smokeImage: null, smokeOpacity: 0 };
    return { smokeImage: this.smokeImage, smokeOpacity: Math.max(0, Math.min(1, this.opacities[this.currentFrame] || 0)) };
  }
  isReady() { return this.smokeImage?.complete; }
}

class BellyScratchRenderer {
  constructor() {
    this.frames = []; this.frameCount = 8; this.frameDuration = 300;
    this.currentFrame = 0; this.lastFrameTime = 0; this.isPlaying = false;
  }
  async loadFrames(framePaths) {
    return new Promise((resolve) => {
      let loaded = 0, hasError = false;
      const check = () => { if (++loaded === this.frameCount && !hasError) { this.isPlaying = true; this.currentFrame = 0; this.lastFrameTime = performance.now(); resolve(true); } };
      const error = (path) => { if (!hasError) { hasError = true; console.error('❌ Failed to load frame:', path); resolve(false); } };
      this.frames = framePaths.map(path => {
        const img = new Image();
        img.onload = check;
        img.onerror = () => error(path);
        img.src = path;
        return img;
      });
    });
  }
  start() { if (this.frames.length === this.frameCount && this.frames.every(f => f.complete)) { this.isPlaying = true; this.currentFrame = 0; this.lastFrameTime = performance.now(); } }
  stop() { this.isPlaying = false; }
  update(t) { if (!this.isPlaying || this.frames.length === 0) return; if (t - this.lastFrameTime >= this.frameDuration) { this.currentFrame = (this.currentFrame + 1) % this.frameCount; this.lastFrameTime = t; } }
  render(ctx, w, h, t) { this.update(t); if (!this.isPlaying || this.frames.length === 0) return null; return this.frames[this.currentFrame] || null; }
  isReady() { return this.frames.length === this.frameCount && this.frames.every(f => f?.complete); }
}

class SmokeAnimationRenderer {
  constructor() {
    this.nosmokeFrame = null; this.smokeFrames = []; this.frameDuration = 300;
    this.sequence = [0, 1, 2, 1, 2, 2, 1, 2, 0];
    this.smokingDuration = this.sequence.length * this.frameDuration;
    this.currentFrame = null; this.currentSequenceIndex = 0; this.isPlaying = false;
    this.frameStartTime = 0; this.smokingStartTime = 0; this.isShowingSmoke = false;
  }
  async loadFrames(framePaths) {
    return new Promise((resolve) => {
      let loaded = 0, hasError = false, total = framePaths.length;
      const check = () => { if (++loaded === total && !hasError) resolve(true); };
      const error = (path) => { if (!hasError) { hasError = true; console.error('❌ Failed to load frame:', path); resolve(false); } };
      const loadImg = (path) => {
        const img = new Image();
        img.onload = check;
        img.onerror = () => error(path);
        img.src = path;
        return img;
      };
      this.nosmokeFrame = loadImg(framePaths[0]);
      this.smokeFrames = framePaths.slice(1).map(loadImg);
    });
  }
  start() {
    if (this.nosmokeFrame?.complete && this.smokeFrames.every(f => f.complete)) {
      this.isPlaying = true; this.isShowingSmoke = false; this.currentFrame = null;
      this.currentSequenceIndex = 0; this.frameStartTime = performance.now(); this.smokingStartTime = 0;
    }
  }
  stop() { this.isPlaying = false; }
  update(t) {
    if (!this.isPlaying) return;
    if (this.isShowingSmoke) {
      if (t - this.smokingStartTime >= this.smokingDuration) {
        this.isShowingSmoke = false; this.currentFrame = null; this.currentSequenceIndex = 0; this.frameStartTime = t;
      } else if (t - this.frameStartTime >= this.frameDuration) {
        this.currentSequenceIndex = (this.currentSequenceIndex + 1) % this.sequence.length;
        this.currentFrame = this.sequence[this.currentSequenceIndex];
        this.frameStartTime = t;
      }
    } else if (t - this.frameStartTime >= this.frameDuration) {
      this.isShowingSmoke = true; this.smokingStartTime = t;
      this.currentSequenceIndex = 0; this.currentFrame = this.sequence[0];
      this.frameStartTime = t;
    }
  }
  render(ctx, w, h, t) {
    this.update(t); if (!this.isPlaying) return { image: null, opacity: 0, isShowingSmoke: false };
    let currentImg = null;
    if (this.isShowingSmoke && this.currentFrame !== null) { currentImg = this.smokeFrames[this.currentFrame]; }
    else { currentImg = this.nosmokeFrame; }
    if (!currentImg) return { image: null, opacity: 0, isShowingSmoke: false };
    return { image: currentImg, opacity: 1, isShowingSmoke: this.isShowingSmoke };
  }
  isReady() { return this.nosmokeFrame?.complete && this.smokeFrames.length > 0 && this.smokeFrames.every(f => f?.complete); }
}

class BellyScratchBlinkAnimation {
  constructor() {
    this.blinkRenderer = new BlinkRenderer();
    this.bellyScratchRenderer = new BellyScratchRenderer();
  }
  async loadImages(basePath, blinkPath, bellyScratchPaths) {
    const [blink, belly] = await Promise.all([
      this.blinkRenderer.loadImages(basePath, blinkPath),
      bellyScratchPaths ? this.bellyScratchRenderer.loadFrames(bellyScratchPaths) : Promise.resolve(true)
    ]);
    return blink && belly;
  }
  start() { this.bellyScratchRenderer.start(); }
  stop() { this.bellyScratchRenderer.stop(); }
  render(ctx, w, h, t) {
    const b = this.blinkRenderer.render(ctx, w, h, t);
    const bellyFrame = this.bellyScratchRenderer.render(ctx, w, h, t);
    return { baseImage: b.baseImage, blinkImage: b.blinkImage, blinkOpacity: b.blinkOpacity, bellyFrame: bellyFrame };
  }
  isReady() { return this.blinkRenderer.isReady() && this.bellyScratchRenderer.isReady(); }
}

class SmokeBlinkAnimation {
  constructor() {
    this.blinkRenderer = new BlinkRenderer();
    this.smokeAnimationRenderer = new SmokeAnimationRenderer();
  }
  async loadImages(basePath, blinkPath, smokePaths) {
    const [blink, smoke] = await Promise.all([
      this.blinkRenderer.loadImages(basePath, blinkPath),
      smokePaths ? this.smokeAnimationRenderer.loadFrames(smokePaths) : Promise.resolve(true)
    ]);
    return blink && smoke;
  }
  start() { this.smokeAnimationRenderer.start(); }
  forceStartSmoking() {
    if (this.smokeAnimationRenderer) {
      this.smokeAnimationRenderer.isShowingSmoke = true;
      this.smokeAnimationRenderer.smokingStartTime = performance.now();
      this.smokeAnimationRenderer.frameStartTime = performance.now();
      this.smokeAnimationRenderer.currentSequenceIndex = 0;
      this.smokeAnimationRenderer.currentFrame = this.smokeAnimationRenderer.sequence[0];
    }
  }
  stop() { this.smokeAnimationRenderer.stop(); }
  render(ctx, w, h, t) {
    const b = this.blinkRenderer.render(ctx, w, h, t);
    const s = this.smokeAnimationRenderer.render(ctx, w, h, t);
    return { baseImage: b.baseImage, blinkImage: b.blinkImage, blinkOpacity: b.blinkOpacity, smokeImage: s.image, smokeOpacity: s.opacity, isShowingSmoke: s.isShowingSmoke };
  }
  isReady() { return this.blinkRenderer.isReady() && this.smokeAnimationRenderer.isReady(); }
}

class PocketPickRenderer {
  constructor() {
    this.frames = [];
    this.baseFrame = null;
    this.sequence = [0, 1, 2, 3, 4, 3, 4, 5, 6, 7, 8, 9, 10, 3, 2, 11];
    this.frameCount = this.sequence.length;
    this.frameDuration = 300;
    this.baseDisplayDuration = 500;
    this.currentFrame = -1;
    this.lastFrameTime = 0;
    this.isPlaying = false;
  }
  async loadFrames(framePaths) {
    return new Promise((resolve) => {
      let loaded = 0, hasError = false, total = framePaths.length;
      const check = () => { if (++loaded === total && !hasError) resolve(true); };
      const error = (path) => { if (!hasError) { hasError = true; console.error('❌ Failed to load frame:', path); resolve(false); } };
      const loadImg = (path) => {
        const img = new Image();
        img.onload = check;
        img.onerror = () => error(path);
        img.src = path;
        return img;
      };
      this.baseFrame = loadImg(framePaths[0]);
      this.frames = framePaths.slice(1).map(loadImg);
    });
  }
  start() {
    if (this.baseFrame?.complete && this.frames.length >= 11 && this.frames.every(f => f?.complete)) {
      this.isPlaying = true;
      this.currentFrame = -1;
      this.lastFrameTime = performance.now();
    }
  }
  stop() { this.isPlaying = false; }
  update(t) {
    if (!this.isPlaying) return;
    const elapsed = t - this.lastFrameTime;
    if (this.currentFrame === -1) {
      if (elapsed >= this.baseDisplayDuration) {
        this.currentFrame = 0;
        this.lastFrameTime = t;
      }
    } else {
      if (elapsed >= this.frameDuration) {
        this.currentFrame = (this.currentFrame + 1) % this.frameCount;
        this.lastFrameTime = t;
      }
    }
  }
  render(ctx, w, h, t) {
    this.update(t);
    if (!this.isPlaying) return { frame: null, frameIndex: -1 };
    if (this.currentFrame === -1) {
      return { frame: this.baseFrame, frameIndex: -1 };
    }
    const imageNumber = this.sequence[this.currentFrame];
    let frameToUse = null;
    if (imageNumber === 0) {
      frameToUse = this.baseFrame;
    } else {
      frameToUse = this.frames[imageNumber - 1];
    }
    return { frame: frameToUse, frameIndex: this.currentFrame };
  }
  isReady() { return this.baseFrame?.complete && this.frames.length >= 11 && this.frames.every(f => f?.complete); }
}

class PocketPickBlinkAnimation {
  constructor() {
    this.blinkRenderer = new BlinkRenderer();
    this.pocketPickRenderer = new PocketPickRenderer();
    this.blinkFrames = [0, 3, 7, 11];
  }
  async loadImages(basePath, blinkPath, pocketPickPaths) {
    const [blink, pocket] = await Promise.all([
      this.blinkRenderer.loadImages(basePath, blinkPath),
      pocketPickPaths ? this.pocketPickRenderer.loadFrames(pocketPickPaths) : Promise.resolve(true)
    ]);
    return blink && pocket;
  }
  start() { this.pocketPickRenderer.start(); }
  stop() { this.pocketPickRenderer.stop(); }
  render(ctx, w, h, t) {
    const p = this.pocketPickRenderer.render(ctx, w, h, t);
    const isShowingBase = p.frameIndex === -1;
    const shouldShowBlink = this.blinkFrames.includes(p.frameIndex);
    const b = this.blinkRenderer.render(ctx, w, h, t);
    return {
      baseImage: isShowingBase ? this.blinkRenderer.baseImage : null,
      blinkImage: shouldShowBlink ? this.blinkRenderer.blinkImage : b.blinkImage,
      blinkOpacity: shouldShowBlink ? 1 : b.blinkOpacity,
      pocketFrame: p.frame,
      isShowingBase
    };
  }
  isReady() { return this.blinkRenderer.isReady() && this.pocketPickRenderer.isReady(); }
}

class IdleAnimationRenderer {
  constructor(canvas) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d');
    this.smokeRenderer = new SmokeRenderer();
    this.animations = {}; this.currentAnimationType = null; this.isPlaying = false; this.animationId = null; this.randomMode = true;
    this.animationStartTime = 0; this.animationDuration = 10000; this.smokeCycleCount = 0; this.lastSmokeState = false;
  }
  async loadAnimations(animationsConfig) {
    const results = await Promise.all(Object.entries(animationsConfig).map(async ([type, config]) => {
      const anim = await this.createAnimation(type, config);
      if (anim) { this.animations[type] = anim; return true; } return false;
    }));
    return results.every(r => r);
  }
  async createAnimation(animationType, config) {
    let animation = null;
    switch (animationType) {
      case 'belly-scratch-blink':
        animation = new BellyScratchBlinkAnimation();
        await animation.loadImages(config.basePath, config.blinkPath, config.bellyScratchPaths);
            break;
      case 'smoke-blink':
        animation = new SmokeBlinkAnimation();
        await animation.loadImages(config.basePath, config.blinkPath, config.smokePaths);
            break;
      case 'pocket-pick-blink':
        animation = new PocketPickBlinkAnimation();
        await animation.loadImages(config.basePath, config.blinkPath, config.pocketPickPaths);
            break;
      default:
        console.error('Unknown animation type:', animationType);
        return null;
    }
    return animation;
  }
  async loadSmoke(smokePath) {
    return await this.smokeRenderer.loadImage(smokePath);
  }
  selectRandomAnimation(excludeType = null) {
    const available = Object.keys(this.animations);
    if (available.length === 0) return null;
    const types = excludeType ? available.filter(t => t !== excludeType) : available;
    if (types.length === 0) return available[0];
    return types[Math.floor(Math.random() * types.length)];
  }
  start() {
    if (this.isPlaying) return;
    if (!this.currentAnimationType || this.randomMode) {
      this.currentAnimationType = this.selectRandomAnimation();
    }
    const currentAnim = this.animations[this.currentAnimationType];
    if (!currentAnim) {
      console.error('❌ Animation not found:', this.currentAnimationType);
        return;
    }
    if (!currentAnim.isReady()) {
      console.error('❌ Animation not ready:', this.currentAnimationType);
      return;
    }
    if (!this.smokeRenderer.isReady()) {
      console.error('❌ Smoke renderer not ready');
      return;
    }
    this.isPlaying = true; this.animationStartTime = performance.now(); this.smokeCycleCount = 0; this.lastSmokeState = false;
    this.smokeRenderer.start(); currentAnim.start(); this.animate();
  }
  stop() {
    this.isPlaying = false; this.smokeRenderer.stop();
    Object.values(this.animations).forEach(anim => anim.stop());
    if (this.animationId) { cancelAnimationFrame(this.animationId); this.animationId = null; }
  }
  animate() {
    if (!this.isPlaying) return;
    this.render(performance.now(), () => {
      drawBackground();
    });
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  render(t, drawBackgroundCallback = null) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (drawBackgroundCallback) drawBackgroundCallback();
    
    const anim = this.animations[this.currentAnimationType];
    const result = anim?.render(this.ctx, this.canvas.width, this.canvas.height, t);
    const smoke = this.smokeRenderer.render(this.ctx, this.canvas.width, this.canvas.height, t);
    const w = this.canvas.width, h = this.canvas.height;
    
    if (this.currentAnimationType === 'smoke-blink' && result?.isShowingSmoke !== this.lastSmokeState) {
      if (!this.lastSmokeState && result.isShowingSmoke) this.lastSmokeState = true;
      else if (this.lastSmokeState && !result.isShowingSmoke) {
        this.lastSmokeState = false;
        if (++this.smokeCycleCount >= 1) this.switchToRandomAnimation();
      }
    }
    
    if ((this.currentAnimationType === 'belly-scratch-blink' || this.currentAnimationType === 'pocket-pick-blink') && 
        t - this.animationStartTime >= this.animationDuration) {
      this.switchToRandomAnimation();
    }
    
    if (result?.baseImage && !(this.currentAnimationType === 'pocket-pick-blink' && !result.isShowingBase)) {
      this.ctx.drawImage(result.baseImage, 0, 0, w, h);
    }
    if (result?.bellyFrame) this.ctx.drawImage(result.bellyFrame, 0, 0, w, h);
    if (result?.pocketFrame) this.ctx.drawImage(result.pocketFrame, 0, 0, w, h);
    if (result?.smokeImage && result.isShowingSmoke) this.ctx.drawImage(result.smokeImage, 0, 0, w, h);
    if (result?.blinkImage && result.blinkOpacity > 0) {
      this.ctx.save();
      this.ctx.globalAlpha = result.blinkOpacity;
      this.ctx.drawImage(result.blinkImage, 0, 0, w, h);
      this.ctx.restore();
    }
    if (smoke.smokeImage && smoke.smokeOpacity > 0 && this.currentAnimationType !== 'pocket-pick-blink') {
      this.ctx.save();
      this.ctx.globalAlpha = smoke.smokeOpacity;
      this.ctx.drawImage(smoke.smokeImage, 0, 0, w, h);
      this.ctx.restore();
    }
  }
  switchToRandomAnimation() {
    const oldType = this.currentAnimationType;
    const newType = this.selectRandomAnimation(oldType);
    if (!newType) return;
    this.animations[oldType]?.stop();
    this.currentAnimationType = newType;
    this.animationStartTime = performance.now();
    this.smokeCycleCount = 0;
    this.animations[newType]?.start();
    if (newType === 'smoke-blink') {
      this.animations[newType].forceStartSmoking?.();
      this.lastSmokeState = true;
    } else {
      this.lastSmokeState = false;
    }
  }
  isReady() {
    const allAnimationsReady = Object.values(this.animations).every(anim => anim?.isReady() ?? false);
    return this.smokeRenderer.isReady() && allAnimationsReady;
  }
}

// ==================== DOM ELEMENTS ====================
let canvas, ctx;

// ==================== GAME CONSTANTS ====================
const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 1000;

// Background image
let bgImage = null;

// Idle Animation Renderer (replaces old animation logic)
let idleAnimationRenderer = null;

// Drink Animation (manual trigger)
let drinkAnimationRenderer = null;
let isDrinking = false;

// ==================== LOAD ASSETS ====================
async function loadAssets() {
    bgImage = new Image();
    bgImage.src = './assets/background.jpg';
    await new Promise(resolve => { bgImage.onload = resolve; bgImage.onerror = resolve; });
    
    const baseUrl = window.location.origin;
    const bellyBase = `${baseUrl}/avatar-system/assets/animations/belly-scratch-blink`;
    const smokeBase = `${baseUrl}/avatar-system/assets/animations/smoke-blink`;
    const pocketBase = `${baseUrl}/avatar-system/assets/animations/pocket-pick-blink`;
    
    const bellyScratchPaths = ['hand-overlay', 'belly-1', 'belly-2', 'belly-3', 'belly-2', 'belly-3', 'belly-1', 'hand-overlay'].map(f => `${bellyBase}/${f}.png`);
    const smokePaths = ['nosmokehavehand', 'smoke1', 'smoke2', 'smoke3'].map(f => `${smokeBase}/${f}.png`);
    const pocketPickPaths = Array.from({length: 12}, (_, i) => `${pocketBase}/${i + 1}.png`);
    
    idleAnimationRenderer = new IdleAnimationRenderer(canvas);
    const [animationsLoaded, smokeLoaded] = await Promise.all([
        idleAnimationRenderer.loadAnimations({
            'belly-scratch-blink': { basePath: `${bellyBase}/base-new.png`, blinkPath: `${bellyBase}/close%20eye.png`, bellyScratchPaths },
            'smoke-blink': { basePath: smokePaths[0], blinkPath: `${smokeBase}/close%20eye.png`, smokePaths },
            'pocket-pick-blink': { basePath: pocketPickPaths[0], blinkPath: `${pocketBase}/close%20eye.png`, pocketPickPaths }
        }),
        idleAnimationRenderer.loadSmoke(`${bellyBase}/smoke.png`)
    ]);
    
    if (!animationsLoaded || !smokeLoaded) return false;
    
    await loadDrinkFrames();
    return true;
}

// ==================== DRINK ANIMATION ====================
async function loadDrinkFrames() {
    const basePaths = ['./assets/avatar/drink/drunk', `${window.location.origin}/games/templates-v2/pet-avatar-template/assets/avatar/drink/drunk`];
    const drinkFrames = [];
    const failedFrames = [];
    
    for (let i = 1; i <= 10; i++) {
        let loaded = false;
        for (const base of basePaths) {
            const img = new Image();
            const path = `${base}${i}.png`;
            loaded = await new Promise((resolve) => {
                const timeout = setTimeout(() => resolve(false), 5000);
                img.onload = () => { clearTimeout(timeout); drinkFrames[i - 1] = img; resolve(true); };
                img.onerror = () => { clearTimeout(timeout); resolve(false); };
                img.src = path;
            });
            if (loaded) break;
        }
        if (!loaded) failedFrames.push(i);
    }
    
    if (drinkFrames.some(f => f)) {
        const placeholder = drinkFrames.find(f => f) || null;
        for (let i = 0; i < 10; i++) drinkFrames[i] = drinkFrames[i] || placeholder;
        
        drinkAnimationRenderer = {
            frames: drinkFrames,
            sequence: [1, 2, 3, 4, 5, 6, 5, 4, 5, 6, 5, 4, 7, 8, 9, 10],
            frameDuration: 300,
            currentFrameIndex: 0,
            startTime: 0,
            isPlaying: false,
            animationId: null
        };
        const loaded = drinkFrames.filter(f => f && f !== placeholder).length;
        console.log(`[Pet Avatar] ✓ Drink animation: ${loaded}/10 frames`);
        if (failedFrames.length) console.warn(`[Pet Avatar] ⚠ Missing: ${failedFrames.join(', ')}`);
        return true;
    }
    
    console.error('[Pet Avatar] ❌ No drink frames loaded');
    return false;
}

function startDrinkAnimation() {
    if (!drinkAnimationRenderer || isDrinking) return;
    if (idleAnimationRenderer?.isPlaying) idleAnimationRenderer.stop();
    isDrinking = true;
    Object.assign(drinkAnimationRenderer, { isPlaying: true, currentFrameIndex: 0, startTime: performance.now() });
    drinkAnimationRenderer.animationId = requestAnimationFrame(drinkAnimationLoop);
}

function stopDrinkAnimation() {
    if (!drinkAnimationRenderer || !isDrinking) return;
    isDrinking = false;
    drinkAnimationRenderer.isPlaying = false;
    if (drinkAnimationRenderer.animationId) {
        cancelAnimationFrame(drinkAnimationRenderer.animationId);
        drinkAnimationRenderer.animationId = null;
    }
    if (idleAnimationRenderer?.isReady()) idleAnimationRenderer.start();
}

function drinkAnimationLoop(currentTime) {
    if (!drinkAnimationRenderer?.isPlaying) return;
    const r = drinkAnimationRenderer;
    const elapsed = currentTime - r.startTime;
    const totalDuration = r.sequence.length * r.frameDuration;
    
    if (elapsed >= totalDuration) {
        stopDrinkAnimation();
        return;
    }
    
    const newFrame = Math.floor(elapsed / r.frameDuration);
    if (newFrame !== r.currentFrameIndex && newFrame < r.sequence.length) {
        r.currentFrameIndex = newFrame;
    }
    
    renderDrinkFrame();
    if (r.isPlaying) r.animationId = requestAnimationFrame(drinkAnimationLoop);
}

function renderDrinkFrame() {
    if (!drinkAnimationRenderer || !isDrinking || !canvas || !ctx) return;
    const frame = drinkAnimationRenderer.frames[drinkAnimationRenderer.sequence[drinkAnimationRenderer.currentFrameIndex] - 1];
    if (!frame) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawBackground();
    ctx.drawImage(frame, 0, 0, canvas.width, canvas.height);
}

// ==================== RENDERING ====================
function drawBackground() {
    if (bgImage && bgImage.complete && bgImage.naturalWidth > 0) {
        ctx.drawImage(bgImage, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
}

// ==================== INITIALIZATION ====================
async function init() {
    canvas = document.getElementById('game-canvas');
    if (!canvas) return;
    
    ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
    
    await initGameConfig();
    if (!(await loadAssets())) return;
    
    if (idleAnimationRenderer?.isReady()) {
        const originalRender = idleAnimationRenderer.render.bind(idleAnimationRenderer);
        idleAnimationRenderer.render = (t) => isDrinking ? null : originalRender(t, drawBackground);
        idleAnimationRenderer.start();
    } else {
        drawBackground();
    }
    
    setupHelpButton();
    setupActionButtons();
    if (window.parent !== window) window.parent.postMessage({ type: 'PET_AVATAR_GAME_READY' }, '*');
}

// ==================== HELP BUTTON & MODAL ====================
function setupHelpButton() {
    const helpButton = document.getElementById('help-button');
    const modal = document.getElementById('rules-modal');
    const closeButton = document.querySelector('.close-button');
    if (!helpButton || !modal) return;
    
    const close = () => modal.classList.remove('show');
    helpButton.addEventListener('click', (e) => { e.stopPropagation(); modal.classList.add('show'); });
    closeButton?.addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && modal.classList.contains('show')) close(); });
}

// ==================== ACTION BUTTONS ====================
function setupActionButtons() {
    document.querySelectorAll('.action-button').forEach(button => {
        const handler = (e) => {
            e.stopPropagation();
            e.preventDefault();
            const action = button.getAttribute('data-action');
            if (action) handleAction(action, button);
        };
        button.addEventListener('click', handler);
        button.addEventListener('touchstart', handler);
    });
}

function handleAction(action, btn) {
    btn.style.transform = 'scale(0.9)';
    setTimeout(() => btn.style.transform = '', 150);
    if (action === 'drink') startDrinkAnimation();
}

// ==================== CONFIG LOADING ====================
async function initGameConfig() {
    try {
        const gameId = getGameId();
        if (!gameId) {
            const playtest = localStorage.getItem('pet_avatar_brand_config_playtest');
            if (playtest) Object.assign(BRAND_CONFIG, JSON.parse(playtest));
        } else {
            if (!loadBrandConfig(gameId)) await loadBrandConfigFromSupabase(gameId);
        }
    } catch (e) {
        console.warn('[Pet Avatar] Config error:', e);
    }
}

async function loadBrandConfigFromSupabase(gameId) {
    try {
        const supabase = await getSupabaseClient();
        if (!supabase) return false;
        const { data, error } = await supabase.rpc('list_user_created_games', { p_template_id: 'pet-avatar-template' });
        if (error) return false;
        
        const games = Array.isArray(data) ? data : (typeof data === 'string' ? JSON.parse(data) : []);
        const game = games.find(item => {
            const id = item?.game_id || item?.id;
            return id === gameId || id === 'pet-avatar';
        });
        
        if (game) {
            if (game.fragment_logo_url || game.logo_url) BRAND_CONFIG.logoUrl = game.fragment_logo_url || game.logo_url || '';
            if (game.story_one || game.story_text || game.storyText) BRAND_CONFIG.storyText = game.story_one || game.story_text || game.storyText || 'MEMEPLAY';
            return true;
        }
        return false;
    } catch (err) {
        return false;
    }
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

