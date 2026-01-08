export class PocketPickRenderer {
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
      let loaded = 0;
      let hasError = false;
      const totalFrames = framePaths.length;
      const check = () => { if (++loaded === totalFrames && !hasError) resolve(true); };
      const error = (p) => { if (!hasError) { hasError = true; console.error('❌ Failed to load pocket pick frame:', p); resolve(false); } };
      this.baseFrame = new Image();
      this.baseFrame.onload = check;
      this.baseFrame.onerror = () => error(framePaths[0]);
      this.baseFrame.src = framePaths[0];
      this.frames = [];
      for (let i = 1; i < framePaths.length; i++) {
        const img = new Image();
        img.onload = check;
        img.onerror = () => error(framePaths[i]);
        img.src = framePaths[i];
        this.frames[i - 1] = img;
      }
    });
  }

  start() {
    if (this.baseFrame?.complete && this.frames.length >= 11 && this.frames.every(f => f?.complete)) {
      this.isPlaying = true;
      this.currentFrame = -1;
      this.lastFrameTime = performance.now();
    }
  }

  stop() {
    this.isPlaying = false;
  }

  update(t) {
    if (!this.isPlaying) return;
    const elapsed = t - this.lastFrameTime;
    if (this.currentFrame === -1) {
      if (elapsed >= this.baseDisplayDuration) {
        this.currentFrame = 0;
        this.lastFrameTime = t;
      }
    } else if (elapsed >= this.frameDuration) {
      this.currentFrame = (this.currentFrame + 1) % this.frameCount;
      this.lastFrameTime = t;
    }
  }

  render(ctx, w, h, t) {
    this.update(t);
    if (!this.isPlaying) return { frame: null, frameIndex: -1 };
    if (this.currentFrame === -1) return { frame: this.baseFrame, frameIndex: -1 };
    const imageNumber = this.sequence[this.currentFrame];
    const frameToUse = imageNumber === 0 ? this.baseFrame : this.frames[imageNumber - 1];
    return { frame: frameToUse, frameIndex: this.currentFrame };
  }

  isReady() {
    return this.baseFrame?.complete && this.frames.length >= 11 && this.frames.every(f => f?.complete);
  }
}

