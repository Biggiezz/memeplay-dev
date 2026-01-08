import { BlinkRenderer } from '../blink-renderer.js';
import { SmokeAnimationRenderer } from '../smoke-animation-renderer.js';

export class SmokeBlinkAnimation {
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
    return {
      baseImage: b.baseImage,
      blinkImage: b.blinkImage,
      blinkOpacity: b.blinkOpacity,
      smokeImage: s.image,
      smokeOpacity: s.opacity,
      isShowingSmoke: s.isShowingSmoke
    };
  }

  isReady() {
    return this.blinkRenderer.isReady() && this.smokeAnimationRenderer.isReady();
  }
}

