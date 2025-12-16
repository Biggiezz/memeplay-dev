/**
 * Shared utility for loading logo images
 * Reduces code duplication across templates
 */

/**
 * Load a logo image from URL
 * @param {string} url - Logo URL (data URL or HTTP URL)
 * @param {Function} onLoad - Callback when image loads successfully (receives Image object)
 * @param {Function} onError - Callback when image fails to load
 * @returns {HTMLImageElement|null} Image object or null if URL is empty
 */
export function loadLogoImage(url, onLoad, onError) {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return null;
  }
  
  const img = new Image();
  
  if (onLoad) {
    img.onload = () => onLoad(img);
  }
  
  if (onError) {
    img.onerror = () => onError();
  }
  
  img.src = url;
  return img;
}

/**
 * Load multiple logo images (for templates with multiple logo types)
 * @param {Object} logoUrls - Object with logo URL properties (e.g., { coinLogoUrl: '...', gameOverLogoUrl: '...' })
 * @param {Object} callbacks - Object with callbacks for each logo (e.g., { coinLogo: (img) => {...}, gameOverLogo: (img) => {...} })
 * @param {Object} targetConfig - BRAND_CONFIG object to update (optional, if not provided, callbacks must handle storage)
 * @returns {Object} Object with loaded images (e.g., { coinLogo: img, gameOverLogo: img })
 */
export function loadMultipleLogos(logoUrls, callbacks = {}, targetConfig = null) {
  const loaded = {};
  
  for (const [key, url] of Object.entries(logoUrls)) {
    if (!url) continue;
    
    // Map URL key to callback key (e.g., coinLogoUrl -> coinLogo)
    const callbackKey = key.replace('Url', '').replace('Logo', 'Logo');
    const onLoad = callbacks[callbackKey] || callbacks[key];
    const onError = callbacks[`${callbackKey}Error`] || callbacks[`${key}Error`];
    
    const img = loadLogoImage(url, 
      (loadedImg) => {
        if (targetConfig && callbackKey) {
          targetConfig[callbackKey] = loadedImg;
        }
        if (onLoad) onLoad(loadedImg);
      },
      onError
    );
    
    if (img) {
      loaded[callbackKey] = img;
    }
  }
  
  return loaded;
}


