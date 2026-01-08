export class SmokeRenderer {
  constructor() {
    this.smokeImage = null;
    this.frameCount = 20;
    this.frameDuration = 200;
    this.currentFrame = 0;
    this.lastFrameTime = 0;
    this.opacities = [];
    this.isPlaying = false;
  }

  initOpacities() {
    this.opacities = [];
    for (let i = 0; i < this.frameCount; i++) this.opacities.push(i / (this.frameCount - 1));
  }

  async loadImage(path) {
    return new Promise((resolve) => {
      this.smokeImage = new Image();
      this.smokeImage.onload = () => { this.initOpacities(); resolve(true); };
      this.smokeImage.onerror = () => { console.error('❌ Failed to load smoke:', path); resolve(false); };
      this.smokeImage.src = path;
    });
  }

  start() {
    if (this.smokeImage?.complete) { this.isPlaying = true; this.currentFrame = 0; this.lastFrameTime = performance.now(); }
  }

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
