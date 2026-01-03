// Animation Renderer - Render move animations
import { ANIMATION_CONFIG } from './animation-config.js';
import { AnimationLoader } from './animation-loader.js';

export class AnimationRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.loader = new AnimationLoader();
    this.config = ANIMATION_CONFIG.move; // Always use move config (4 frames, 0.2s/frame)
    this.frames = [];
    this.currentFrame = 0;
    this.lastFrameTime = 0;
    this.isPlaying = false;
    this.animationId = null;
  }

  async init(spriteSheetPath) {
    if (!spriteSheetPath) {
      console.error('❌ Animation path is required');
      return false;
    }

    try {
      // Create config with provided sprite sheet path
      const configToUse = { ...ANIMATION_CONFIG.move, spriteSheet: spriteSheetPath };
      
      // Load sprite sheet
      const spriteSheet = await this.loader.loadSpriteSheet(configToUse);
      
      // Parse frames
      this.frames = this.loader.parseFrames(spriteSheet, configToUse);
      
      // Update config for timing
      this.config = configToUse;
      
      console.log(`✅ Animation loaded: ${this.frames.length} frames, ${configToUse.frameDuration}ms/frame`);
      return true;
    } catch (error) {
      console.error('❌ Failed to load animation:', error);
      return false;
    }
  }

  start() {
    if (this.frames.length === 0) {
      console.warn('⚠️ Animation not initialized');
      return;
    }

    if (this.isPlaying) {
      return; // Already playing
    }

    this.isPlaying = true;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  stop() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  animate() {
    if (!this.isPlaying) return;

    const now = performance.now();
    const elapsed = now - this.lastFrameTime;

    // Update frame based on elapsed time
    if (elapsed >= this.config.frameDuration) {
      // Advance to next frame
      const oldFrame = this.currentFrame;
      this.currentFrame = (this.currentFrame + 1) % this.frames.length;
      
      // Debug: Log frame change timing (only first few frames to avoid spam)
      if (this.currentFrame < 2 || this.currentFrame === 0) {
        console.log(`🎬 Frame ${oldFrame} → ${this.currentFrame}, elapsed: ${elapsed.toFixed(1)}ms (target: ${this.config.frameDuration}ms)`);
      }
      
      // Update lastFrameTime to current time
      // This ensures each frame displays for exactly frameDuration
      this.lastFrameTime = now;
    }

    // Render current frame
    this.render();

    // Continue animation loop
    this.animationId = requestAnimationFrame(() => this.animate());
  }

  render() {
    if (this.frames.length === 0) return;

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw current frame
    const frame = this.frames[this.currentFrame];
    if (frame) {
      this.ctx.drawImage(frame, 0, 0, this.canvas.width, this.canvas.height);
    }
  }

  // Get current frame index
  getCurrentFrameIndex() {
    return this.currentFrame;
  }
}

