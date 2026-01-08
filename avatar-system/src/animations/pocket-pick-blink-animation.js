import { BlinkRenderer } from '../blink-renderer.js';
import { PocketPickRenderer } from '../pocket-pick-renderer.js';

export class PocketPickBlinkAnimation {
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

  start() {
    this.pocketPickRenderer.start();
  }

  stop() {
    this.pocketPickRenderer.stop();
  }

  render(ctx, w, h, t) {
    const p = this.pocketPickRenderer.render(ctx, w, h, t);
    const isShowingBase = p.frameIndex === -1;
    const shouldShowBlink = this.blinkFrames.includes(p.frameIndex);
    let blinkOpacity = 0, blinkImage = null;
    if (shouldShowBlink) {
      blinkImage = this.blinkRenderer.blinkImage;
      blinkOpacity = 1;
    } else {
      const b = this.blinkRenderer.render(ctx, w, h, t);
      blinkImage = b.blinkImage;
      blinkOpacity = b.blinkOpacity;
    }
    return {
      baseImage: isShowingBase ? this.blinkRenderer.baseImage : null,
      blinkImage: blinkImage,
      blinkOpacity: blinkOpacity,
      pocketFrame: p.frame,
      isShowingBase: isShowingBase
    };
  }

  isReady() {
    return this.blinkRenderer.isReady() && this.pocketPickRenderer.isReady();
  }
}

