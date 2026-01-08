import { SmokeRenderer } from './smoke-renderer.js';
import { BellyScratchBlinkAnimation } from './animations/belly-scratch-blink-animation.js';
import { SmokeBlinkAnimation } from './animations/smoke-blink-animation.js';
import { PocketPickBlinkAnimation } from './animations/pocket-pick-blink-animation.js';

export class IdleAnimationRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.smokeRenderer = new SmokeRenderer();
    this.animations = {};
    this.currentAnimationType = null;
    this.isPlaying = false;
    this.animationId = null;
    this.randomMode = true; // ✅ Always random (from test)
    this.animationStartTime = 0;
    this.animationDuration = 10000;
    this.smokeCycleCount = 0;
    this.lastSmokeState = false;
  }

  async loadAnimations(animationsConfig) {
    const results = await Promise.all(
      Object.entries(animationsConfig).map(async ([type, config]) => {
        const anim = await this.createAnimation(type, config);
        if (anim) { this.animations[type] = anim; return true; }
        return false;
      })
    );
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

  // ✅ Updated: Add excludeType parameter to avoid repeating same animation (from test)
  selectRandomAnimation(excludeType = null) {
    const availableTypes = Object.keys(this.animations);
    if (availableTypes.length === 0) return null;
    if (availableTypes.length === 1) return availableTypes[0];
    
    // ✅ Filter out excludeType if provided
    const typesToChooseFrom = excludeType 
      ? availableTypes.filter(t => t !== excludeType)
      : availableTypes;
    
    if (typesToChooseFrom.length === 0) return availableTypes[0];
    if (typesToChooseFrom.length === 1) return typesToChooseFrom[0];
    if (typesToChooseFrom.length === 2) return Math.random() < 0.5 ? typesToChooseFrom[0] : typesToChooseFrom[1];
    
    // ✅ 3 types: random distribution (from test)
    const rand = Math.random();
    if (rand < 1/3) return typesToChooseFrom[0];
    if (rand < 2/3) return typesToChooseFrom[1];
    return typesToChooseFrom[2];
  }

  start() {
    if (this.isPlaying) return;
    // ✅ Always use random mode (from test)
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
    this.isPlaying = true;
    this.animationStartTime = performance.now();
    this.smokeCycleCount = 0;
    this.lastSmokeState = false;
    this.smokeRenderer.start();
    currentAnim.start();
    this.animate();
  }

  stop() {
    this.isPlaying = false;
    this.smokeRenderer.stop();
    Object.values(this.animations).forEach(anim => anim.stop());
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  animate() {
    if (!this.isPlaying) return;
    this.render(performance.now());
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  render(t, drawBackgroundCallback = null) {
    // Clear canvas first
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw background if callback provided
    if (drawBackgroundCallback) {
      drawBackgroundCallback(this.ctx, this.canvas.width, this.canvas.height);
    }
    
    const currentAnim = this.animations[this.currentAnimationType];
    const animResult = currentAnim ? currentAnim.render(this.ctx, this.canvas.width, this.canvas.height, t) : null;
    
    if (this.currentAnimationType === 'smoke-blink' && animResult) {
      const isShowingSmoke = animResult.isShowingSmoke || false;
      if (isShowingSmoke && !this.lastSmokeState) {
        this.lastSmokeState = true;
      } else if (!isShowingSmoke && this.lastSmokeState) {
        this.lastSmokeState = false;
        if (++this.smokeCycleCount >= 1) {
          this.switchToRandomAnimation();
          return;
        }
      }
    }
    
    if ((this.currentAnimationType === 'belly-scratch-blink' || this.currentAnimationType === 'pocket-pick-blink') 
        && t - this.animationStartTime >= this.animationDuration) {
      this.switchToRandomAnimation();
      return;
    }
    
    const s = this.smokeRenderer.render(this.ctx, this.canvas.width, this.canvas.height, t);
    
    if (animResult?.baseImage && !(this.currentAnimationType === 'pocket-pick-blink' && !animResult.isShowingBase)) {
      this.ctx.drawImage(animResult.baseImage, 0, 0, this.canvas.width, this.canvas.height);
    }
    if (animResult?.bellyFrame) this.ctx.drawImage(animResult.bellyFrame, 0, 0, this.canvas.width, this.canvas.height);
    if (animResult?.pocketFrame) this.ctx.drawImage(animResult.pocketFrame, 0, 0, this.canvas.width, this.canvas.height);
    if (animResult?.smokeImage && animResult.isShowingSmoke) {
      this.ctx.drawImage(animResult.smokeImage, 0, 0, this.canvas.width, this.canvas.height);
    }
    if (animResult?.blinkImage && animResult.blinkOpacity > 0) {
      this.ctx.save();
      this.ctx.globalAlpha = animResult.blinkOpacity;
      this.ctx.drawImage(animResult.blinkImage, 0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }
    if (s.smokeImage && s.smokeOpacity > 0 && this.currentAnimationType !== 'pocket-pick-blink') {
      this.ctx.save();
      this.ctx.globalAlpha = s.smokeOpacity;
      this.ctx.drawImage(s.smokeImage, 0, 0, this.canvas.width, this.canvas.height);
      this.ctx.restore();
    }
  }
  
  // ✅ Updated: Use excludeType to avoid repeating same animation (from test)
  switchToRandomAnimation() {
    const oldType = this.currentAnimationType;
    const newType = this.selectRandomAnimation(oldType); // ✅ Exclude current animation
    if (!newType) return;
    if (this.animations[oldType]) {
      this.animations[oldType].stop();
    }
    this.currentAnimationType = newType;
    this.animationStartTime = performance.now();
    this.smokeCycleCount = 0;
    if (this.animations[newType]) {
      this.animations[newType].start();
      // ✅ Force start smoking for smoke-blink animation (from test)
      if (newType === 'smoke-blink' && this.animations[newType].forceStartSmoking) {
        this.animations[newType].forceStartSmoking();
        this.lastSmokeState = true;
      } else {
        this.lastSmokeState = false;
      }
    }
  }

  isReady() {
    const allAnimationsReady = Object.values(this.animations).every(anim => anim?.isReady() ?? false);
    return this.smokeRenderer.isReady() && allAnimationsReady;
  }
}
