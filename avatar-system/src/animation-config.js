// Animation Configuration
export const ANIMATION_CONFIG = {
  // Animation cho mỗi actor với config cụ thể
  // Format: move{actor}{clothes}{equipment}{hat}.png
  // Example: movea123.png = Boy + Clothes 1 + Equipment 2 + Hat 3
  getAnimationPath(actor, clothes, equipment, hat) {
    const actorMap = { boy: 'a', fish: 'b', supergirl: 'c' };
    const actorLetter = actorMap[actor] || 'a';
    const clothesValue = clothes || 0;
    const equipmentValue = equipment || 0;
    const hatValue = hat || 0;
    
    return `avatar-system/assets/animations/move${actorLetter}${clothesValue}${equipmentValue}${hatValue}.png`;
  },
  
  // Config cho move animations
  move: {
    frameCount: 4, // 4 frames cho mỗi animation
    frameWidth: 256,
    frameHeight: 256,
    frameDuration: 200, // ms per frame (0.2s)
    fps: 30, // Target FPS
    loop: true,
  }
};

