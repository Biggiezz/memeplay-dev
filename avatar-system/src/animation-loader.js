// Animation Loader - Load and parse sprite sheet
export class AnimationLoader {
  constructor() {
    this.cache = new Map();
  }

  async loadSpriteSheet(config) {
    const cacheKey = config.spriteSheet;
    
    // Check cache
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(cacheKey, img);
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load sprite sheet: ${config.spriteSheet}`));
      };
      img.src = config.spriteSheet;
    });
  }

  parseFrames(spriteSheet, config) {
    const frames = [];
    const { frameCount, frameWidth, frameHeight } = config;

    for (let i = 0; i < frameCount; i++) {
      const canvas = document.createElement('canvas');
      canvas.width = frameWidth;
      canvas.height = frameHeight;
      const ctx = canvas.getContext('2d');
      
      // Draw frame from sprite sheet (horizontal layout)
      ctx.drawImage(
        spriteSheet,
        i * frameWidth, 0, frameWidth, frameHeight, // Source
        0, 0, frameWidth, frameHeight // Destination
      );
      
      frames.push(canvas);
    }

    return frames;
  }
}







