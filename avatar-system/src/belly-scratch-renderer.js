export class BellyScratchRenderer {
  constructor() {
    this.frames = [];
    this.frameCount = 8;
    this.frameDuration = 300;
    this.currentFrame = 0;
    this.lastFrameTime = 0;
    this.isPlaying = false;
  }

  async loadFrames(framePaths) {
    return new Promise((resolve) => {
      let loaded = 0;
      let hasError = false;
      
      const check = () => {
        if (++loaded === this.frameCount && !hasError) {
          this.isPlaying = true;
          this.currentFrame = 0;
          this.lastFrameTime = performance.now();
          resolve(true);
        }
      };
      
      const error = (path) => {
        if (!hasError) {
          hasError = true;
          console.error('❌ Failed to load belly scratch frame:', path);
          resolve(false);
        }
      };

      this.frames = [];
      framePaths.forEach((path, index) => {
        const img = new Image();
        img.onload = check;
        img.onerror = () => error(path);
        img.src = path;
        this.frames[index] = img;
      });
    });
  }

  start() {
    if (this.frames.length === this.frameCount && this.frames.every(f => f.complete)) {
      this.isPlaying = true;
      this.currentFrame = 0;
      this.lastFrameTime = performance.now();
    }
  }

  stop() {
    this.isPlaying = false;
  }

  update(t) {
    if (!this.isPlaying || this.frames.length === 0) return;
    if (t - this.lastFrameTime >= this.frameDuration) {
      this.currentFrame = (this.currentFrame + 1) % this.frameCount;
      this.lastFrameTime = t;
    }
  }

  render(ctx, w, h, t) {
    this.update(t);
    if (!this.isPlaying || this.frames.length === 0) return null;
    return this.frames[this.currentFrame] || null;
  }

  isReady() {
    return this.frames.length === this.frameCount && this.frames.every(f => f?.complete);
  }
}

