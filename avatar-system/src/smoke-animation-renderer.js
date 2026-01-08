export class SmokeAnimationRenderer {
  constructor() {
    this.nosmokeFrame = null;
    this.smokeFrames = [];
    this.frameDuration = 300;
    this.sequence = [0, 1, 2, 1, 2, 2, 1, 2, 0]; // smoke1, smoke2, smoke3, smoke2, smoke3, smoke3, smoke2, smoke3, smoke1
    this.smokingDuration = this.sequence.length * this.frameDuration; // 9 * 300 = 2700ms
    this.currentFrame = null;
    this.currentSequenceIndex = 0;
    this.isPlaying = false;
    this.frameStartTime = 0;
    this.smokingStartTime = 0;
    this.isShowingSmoke = false;
  }

  async loadFrames(framePaths) {
    return new Promise((resolve) => {
      let loaded = 0, hasError = false;
      const check = () => { if (++loaded === framePaths.length && !hasError) resolve(true); };
      const error = (p) => { if (!hasError) { hasError = true; console.error('❌ Failed to load smoke frame:', p); resolve(false); } };
      this.nosmokeFrame = new Image();
      this.nosmokeFrame.onload = check;
      this.nosmokeFrame.onerror = () => error(framePaths[0]);
      this.nosmokeFrame.src = framePaths[0];
      this.smokeFrames = [];
      for (let i = 1; i < framePaths.length; i++) {
        const img = new Image();
        img.onload = check;
        img.onerror = () => error(framePaths[i]);
        img.src = framePaths[i];
        this.smokeFrames.push(img);
      }
    });
  }

  start() {
    if (this.nosmokeFrame?.complete && this.smokeFrames.every(f => f.complete)) {
      this.isPlaying = true;
      this.isShowingSmoke = false;
      this.currentFrame = null;
      this.currentSequenceIndex = 0;
      this.frameStartTime = performance.now();
      this.smokingStartTime = 0;
    }
  }

  stop() {
    this.isPlaying = false;
  }

  update(t) {
    if (!this.isPlaying) return;
    if (this.isShowingSmoke) {
      if (t - this.smokingStartTime >= this.smokingDuration) {
        this.isShowingSmoke = false;
        this.currentFrame = null;
        this.currentSequenceIndex = 0;
        this.frameStartTime = t;
      } else if (t - this.frameStartTime >= this.frameDuration) {
        this.currentSequenceIndex = (this.currentSequenceIndex + 1) % this.sequence.length;
        this.currentFrame = this.sequence[this.currentSequenceIndex];
        this.frameStartTime = t;
      }
    } else if (t - this.frameStartTime >= this.frameDuration) {
      this.isShowingSmoke = true;
      this.smokingStartTime = t;
      this.currentSequenceIndex = 0;
      this.currentFrame = this.sequence[0];
      this.frameStartTime = t;
    }
  }

  render(ctx, w, h, t) {
    this.update(t);
    if (!this.isPlaying) return { image: null, opacity: 0, isShowingSmoke: false };
    const currentImg = this.isShowingSmoke && this.currentFrame !== null 
      ? this.smokeFrames[this.currentFrame] 
      : this.nosmokeFrame;
    if (!currentImg) return { image: null, opacity: 0, isShowingSmoke: false };
    return { image: currentImg, opacity: 1, isShowingSmoke: this.isShowingSmoke };
  }

  isReady() {
    return this.nosmokeFrame?.complete && this.smokeFrames.length > 0 && this.smokeFrames.every(f => f?.complete);
  }
}

