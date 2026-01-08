import { BlinkRenderer } from '../blink-renderer.js';
import { BellyScratchRenderer } from '../belly-scratch-renderer.js';

export class BellyScratchBlinkAnimation {
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
    return {
      baseImage: b.baseImage,
      blinkImage: b.blinkImage,
      blinkOpacity: b.blinkOpacity,
      bellyFrame: this.bellyScratchRenderer.render(ctx, w, h, t)
    };
  }

  isReady() {
    return this.blinkRenderer.isReady() && this.bellyScratchRenderer.isReady();
  }
}

