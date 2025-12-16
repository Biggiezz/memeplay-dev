// ====================================
// IMAGE OPTIMIZER (Shared for all templates)
// ====================================

/**
 * Check if browser supports WebP format
 * @returns {boolean} True if WebP is supported
 */
export function checkWebPSupport() {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
}

/**
 * Resize image while maintaining aspect ratio
 * @param {Image} img - Source image
 * @param {number} maxWidth - Maximum width
 * @param {number} maxHeight - Maximum height
 * @returns {Image} Resized image
 */
function resizeImage(img, maxWidth, maxHeight) {
  let width = img.width;
  let height = img.height;
  
  // Calculate new dimensions (maintain aspect ratio)
  if (width > maxWidth || height > maxHeight) {
    if (width > height) {
      height = Math.round((height / width) * maxWidth);
      width = maxWidth;
    } else {
      width = Math.round((width / height) * maxHeight);
      height = maxHeight;
    }
  }
  
  // Create canvas for resizing
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Use high-quality image smoothing for better downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw resized image
  ctx.drawImage(img, 0, 0, width, height);
  
  // Convert back to Image object
  const resizedImg = new Image();
  resizedImg.src = canvas.toDataURL('image/png');
  return resizedImg;
}

/**
 * Optimize image: resize and compress
 * @param {Image} img - Source image
 * @param {Object} options - Optimization options
 * @param {number} options.maxSize - Maximum width/height (default: 128)
 * @param {number} options.targetSizeKB - Target file size in KB (default: 30)
 * @param {number} options.quality - Compression quality 0-1 (default: 0.6)
 * @param {Function} callback - Callback with optimized data URL
 */
export function optimizeImage(img, options = {}, callback) {
  const MAX_SIZE = options.maxSize || 128;
  const TARGET_SIZE_KB = options.targetSizeKB || 30;
  const QUALITY = options.quality || 0.6;
  
  // Resize if needed
  let width = img.width;
  let height = img.height;
  
  if (width > MAX_SIZE || height > MAX_SIZE) {
    if (width > height) {
      height = Math.round((height / width) * MAX_SIZE);
      width = MAX_SIZE;
    } else {
      width = Math.round((width / height) * MAX_SIZE);
      height = MAX_SIZE;
    }
  }
  
  // Create canvas for resizing
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Use high-quality image smoothing for better downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  
  // Draw resized image
  ctx.drawImage(img, 0, 0, width, height);
  
  // Check WebP support
  const supportsWebP = checkWebPSupport();
  
  // Compress image
  const compressImage = (format, quality, onComplete) => {
    if (canvas.toBlob) {
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const sizeKB = blob.size / 1024;
            const originalSizeKB = (img.width * img.height * 4) / 1024; // Approximate original size
            const compressionRatio = ((blob.size / (img.width * img.height * 4)) * 100).toFixed(1);
            console.log(`[ImageOptimizer] ✅ Image optimized: ${sizeKB.toFixed(2)}KB (${format}, quality: ${quality}) - ${compressionRatio}% of original`);
            onComplete(e.target.result);
          };
          reader.onerror = () => {
            // Fallback to data URL
            const dataUrl = canvas.toDataURL(format, quality);
            onComplete(dataUrl);
          };
          reader.readAsDataURL(blob);
        } else {
          // Fallback to data URL
          const dataUrl = canvas.toDataURL(format, quality);
          onComplete(dataUrl);
        }
      }, format, quality);
    } else {
      // Fallback for older browsers
      const dataUrl = canvas.toDataURL(format, quality);
      onComplete(dataUrl);
    }
  };
  
  // Try WebP first with compression
  if (supportsWebP && canvas.toBlob) {
    compressImage('image/webp', QUALITY, (result) => {
      callback(result);
    });
  } else {
    // Fallback for browsers without WebP support
    const isPhoto = img.width > 0 && img.height > 0 && 
                    (img.width / img.height > 1.2 || img.height / img.width > 1.2);
    const format = isPhoto ? 'image/jpeg' : 'image/png';
    compressImage(format, QUALITY, (result) => {
      callback(result);
    });
  }
}

/**
 * Process logo image: remove background and optimize
 * @param {Image} img - Source image
 * @param {Function} callback - Callback with processed data URL
 */
export function processLogoImage(img, callback) {
  // Remove background using edge detection and corner color sampling
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // If already has transparency, skip background removal
  let hasTransparency = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) { hasTransparency = true; break; }
  }
  if (hasTransparency) {
    // Already has transparency, optimize directly
    optimizeImage(img, {}, callback);
    return;
  }

  // Sample corner colors to detect background
  const corners = [
    { x: 0, y: 0 },
    { x: canvas.width - 1, y: 0 },
    { x: 0, y: canvas.height - 1 },
    { x: canvas.width - 1, y: canvas.height - 1 }
  ];
  const cornerColors = corners.map(c => {
    const idx = (c.y * canvas.width + c.x) * 4;
    return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
  });
  const avgBg = {
    r: Math.round(cornerColors.reduce((s, c) => s + c.r, 0) / cornerColors.length),
    g: Math.round(cornerColors.reduce((s, c) => s + c.g, 0) / cornerColors.length),
    b: Math.round(cornerColors.reduce((s, c) => s + c.b, 0) / cornerColors.length)
  };

  // Remove background pixels (similar color to corners)
  const threshold = Math.max(25, Math.min(40, canvas.width / 20));
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const distance = Math.sqrt(
      Math.pow(r - avgBg.r, 2) +
      Math.pow(g - avgBg.g, 2) +
      Math.pow(b - avgBg.b, 2)
    );
    if (distance < threshold) data[i + 3] = 0; // Make transparent
  }

  // Smooth edges
  const edgeThreshold = 25;
  for (let y = 1; y < canvas.height - 1; y++) {
    for (let x = 1; x < canvas.width - 1; x++) {
      const idx = (y * canvas.width + x) * 4;
      if (data[idx + 3] > 0) continue;
      const neighbors = [
        ((y - 1) * canvas.width + x) * 4,
        ((y + 1) * canvas.width + x) * 4,
        (y * canvas.width + (x - 1)) * 4,
        (y * canvas.width + (x + 1)) * 4
      ];
      const neighborAlphas = neighbors.map(nIdx => data[nIdx + 3]);
      const avgAlpha = neighborAlphas.reduce((s, a) => s + a, 0) / neighborAlphas.length;
      if (avgAlpha > edgeThreshold) {
        data[idx + 3] = Math.min(255, avgAlpha * 0.5);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  
  // Create processed image and optimize it
  const processedImg = new Image();
  processedImg.onload = () => {
    optimizeImage(processedImg, {}, callback);
  };
  processedImg.src = canvas.toDataURL('image/png');
}


