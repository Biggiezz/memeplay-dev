export class BlinkRenderer {
  constructor() {
    this.baseImage = null;
    this.blinkImage = null;
    this.isBlinking = false;
    this.blinkStartTime = 0;
    this.nextBlinkTime = 0;
    this.closeDuration = 100;
    this.holdDuration = 500;
    this.openDuration = 100;
    this.blinkDuration = 700;
    this.minInterval = 2000;
    this.maxInterval = 5000;
  }

  async loadImages(basePath, blinkPath) {
    return new Promise((resolve) => {
      let loaded = 0, hasError = false;
      const check = () => { if (++loaded === 2 && !hasError) { this.scheduleNextBlink(); resolve(true); } };
      const error = (p) => { if (!hasError) { hasError = true; console.error('❌ Failed to load image:', p); resolve(false); } };
      this.baseImage = new Image(); this.baseImage.onload = check; this.baseImage.onerror = () => error(basePath); this.baseImage.src = basePath;
      this.blinkImage = new Image(); this.blinkImage.onload = check; this.blinkImage.onerror = () => error(blinkPath); this.blinkImage.src = blinkPath;
    });
  }

  scheduleNextBlink() {
    this.nextBlinkTime = performance.now() + this.minInterval + Math.random() * (this.maxInterval - this.minInterval);
  }

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

  isReady() {
    return this.baseImage?.complete && this.blinkImage?.complete;
  }
}
