// Avatar Renderer - Shared animation and image loading logic
// Used by avatar-creator.js and avatar-profile.js

import { AnimationRenderer } from './animation-renderer.js';
import { ANIMATION_CONFIG } from './animation-config.js';
import { getAvatarFilePath } from './avatar-utils.js';
import { showLoading, hideLoading } from './loading-utils.js';

/**
 * Render avatar with animation (shared logic)
 * @param {Object} options - Render options
 * @param {HTMLCanvasElement} options.canvas - Canvas element to render on
 * @param {Object} options.config - Avatar config {actor, skin, clothes, equipment, hat}
 * @param {Map} options.imageCache - Image cache Map (shared between calls)
 * @param {Object} options.animationRenderer - AnimationRenderer instance (will be created if not provided)
 * @param {Function} options.onHashUpdate - Optional callback when hash is updated (for creator page)
 * @param {number} options.imageLoadTimeout - Optional timeout for image loading (default: 10000ms, 0 = no timeout)
 * @returns {Promise<void>}
 */
export async function renderAvatarWithAnimation(options) {
  const {
    canvas,
    config,
    imageCache,
    animationRenderer: existingRenderer = null,
    onHashUpdate = null,
    imageLoadTimeout = 10000
  } = options;

  if (!canvas) {
    console.error('❌ Canvas element is required');
    return;
  }

  // Show loading
  showLoading();

  // Get animation path
  const animationPath = ANIMATION_CONFIG.getAnimationPath(
    config.actor,
    config.clothes,
    config.equipment,
    config.hat
  );

  // Step 1: Start animation immediately (as loading indicator)
  let animationRenderer = existingRenderer;
  let animationStartTime = null;

  try {
    // Stop old animation if playing
    if (animationRenderer && animationRenderer.isPlaying) {
      animationRenderer.stop();
    }

    // Create new animation renderer
    animationRenderer = new AnimationRenderer(canvas);
    const initialized = await animationRenderer.init(animationPath);

    if (initialized) {
      // Start animation
      if (!animationRenderer.isPlaying) {
        animationRenderer.start();
        animationStartTime = performance.now(); // Record start time
      }
      console.log(`🎬 Animation started: ${animationPath}`);
    } else {
      console.log(`⚠️ Animation not found: ${animationPath}`);
    }
  } catch (error) {
    console.log(`⚠️ Animation load error: ${error.message}`);
  }

  // Step 2: Get file path
  const filePath = getAvatarFilePath(config);

  // Step 3: Check cache first
  if (imageCache.has(filePath)) {
    const cachedImg = imageCache.get(filePath);
    hideLoading();

    // Stop animation if playing
    if (animationRenderer && animationRenderer.isPlaying) {
      animationRenderer.stop();
      console.log('✅ Pre-rendered image from cache, animation stopped');
    }

    // Draw cached image
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cachedImg, 0, 0, canvas.width, canvas.height);

    // Update hash if callback provided
    if (onHashUpdate) {
      onHashUpdate(config);
    }

    return;
  }

  // Step 4: Load new image (parallel with animation)
  const img = new Image();
  let timeout = null;

  img.src = filePath;

  img.onerror = () => {
    if (timeout) clearTimeout(timeout);
    // Pre-rendered image not found, keep animation running
    console.log(`⚠️ Pre-rendered image not found: ${filePath}, keeping animation...`);
    hideLoading();

    // Animation continues running (already started above)
    // Update hash if callback provided
    if (onHashUpdate) {
      onHashUpdate(config);
    }
  };

  img.onload = () => {
    if (timeout) clearTimeout(timeout);

    // Cache the image
    imageCache.set(filePath, img);
    hideLoading();

    // Stop animation if playing (pre-rendered image loaded successfully)
    // BUT: Ensure animation runs at least 1 full cycle (0.8s for 4 frames)
    if (animationRenderer && animationRenderer.isPlaying) {
      const minAnimationDuration = 800; // 0.8s = 4 frames × 200ms
      const animationElapsed = animationStartTime ? performance.now() - animationStartTime : 0;
      const remainingTime = Math.max(0, minAnimationDuration - animationElapsed);

      if (remainingTime > 0) {
        // Wait for animation to complete at least 1 cycle
        console.log(`⏳ Pre-rendered image loaded, waiting ${remainingTime.toFixed(0)}ms for animation cycle to complete...`);
        setTimeout(() => {
          if (animationRenderer && animationRenderer.isPlaying) {
            animationRenderer.stop();
            console.log('✅ Animation cycle completed, stopped');
          }

          // Draw static image after animation stops
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }, remainingTime);
      } else {
        // Animation already ran for at least 1 cycle, stop immediately
        animationRenderer.stop();
        console.log('✅ Pre-rendered image loaded, animation stopped');

        // Draw static image
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    } else {
      // No animation playing, just draw the image
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  };

  // Set timeout for loading (if specified)
  if (imageLoadTimeout > 0) {
    timeout = setTimeout(() => {
      if (!img.complete) {
        hideLoading();
        console.error('⏱️ Image load timeout:', filePath);
        // Animation continues if image timeout
      }
    }, imageLoadTimeout);
  }

  img.src = filePath;

  // Return animation renderer so caller can manage it
  return animationRenderer;
}

