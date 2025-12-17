/**
 * Playtest Manager: Centralized logic for managing playtest iframes and config
 * 
 * Chức năng:
 * - Tạo và quản lý playtest iframe
 * - Lưu playtest config vào localStorage
 * - Gửi postMessage để update config ngay lập tức
 * - Cleanup old playtest keys
 * - Xử lý ready/error signals từ game
 */

import { 
  getPlaytestKey, 
  getPlaytestGameId, 
  getTemplateUrl,
  getMessageType,
  getTemplateConfig
} from './template-registry.js';

/**
 * Cleanup old playtest keys for a template
 * @param {string} templateId - Template ID (e.g., 'pacman')
 * @returns {number} Number of keys cleaned up
 */
export function cleanupOldPlaytestKeys(templateId) {
  try {
    const keys = Object.keys(localStorage);
    let cleanedCount = 0;
    const playtestKey = getPlaytestKey(templateId);
    if (!playtestKey) {
      console.warn(`[PlaytestManager] No playtest key found for template: ${templateId}`);
      return 0;
    }
    
    const prefix = playtestKey + '-'; // Format: pacman_brand_config_playtest-xxx
    
    keys.forEach(key => {
      // Xóa tất cả key playtest cũ (format: {playtestKey}-xxx)
      if (key.startsWith(prefix) && key !== playtestKey) {
        localStorage.removeItem(key);
        cleanedCount++;
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`[PlaytestManager] Cleaned up ${cleanedCount} old playtest keys for ${templateId}`);
    }
    
    return cleanedCount;
  } catch (error) {
    console.warn('[PlaytestManager] Failed to cleanup old keys:', error);
    return 0;
  }
}

/**
 * Save playtest config to localStorage
 * @param {string} templateId - Template ID
 * @param {Object} config - Config object (fragmentLogoUrl, title, mapColor, mapIndex, stories)
 * @param {Object} options - Options (fragmentLogoUrl to pass directly)
 * @returns {boolean} Success
 */
export function savePlaytestConfig(templateId, config, options = {}) {
  try {
    const playtestKey = getPlaytestKey(templateId);
    if (!playtestKey) {
      console.error(`[PlaytestManager] No playtest key found for template: ${templateId}`);
      return false;
    }
    
    // Use provided fragmentLogoUrl or from config
    let finalConfig = {
      ...config,
      fragmentLogoUrl: options.fragmentLogoUrl || config.fragmentLogoUrl || ''
    };
    
    // ✅ Space Jump: Also save headLogoUrl and gameOverLogoUrl
    if (templateId === 'space-jump-template') {
      const logoUrl = options.fragmentLogoUrl || config.headLogoUrl || config.fragmentLogoUrl || '';
      finalConfig = {
        ...config,
        headLogoUrl: logoUrl,
        gameOverLogoUrl: logoUrl,
        storyText: config.storyText || 'memeplay'
      };
    }
    
    localStorage.setItem(playtestKey, JSON.stringify(finalConfig));
    console.log('[PlaytestManager] Saved playtest config:', { 
      templateId, 
      storageKey: playtestKey, 
      config: finalConfig,
      usedProvidedLogo: !!options.fragmentLogoUrl 
    });
    return true;
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      // Try cleanup and retry
      console.warn('[PlaytestManager] QuotaExceededError, cleaning up old keys and retrying...');
      cleanupOldPlaytestKeys(templateId);
      try {
        const playtestKey = getPlaytestKey(templateId);
        localStorage.setItem(playtestKey, JSON.stringify(config));
        console.log('[PlaytestManager] Saved playtest config after cleanup');
        return true;
      } catch (retryError) {
        console.error('[PlaytestManager] Failed to save playtest config after cleanup:', retryError);
        return false;
      }
    } else {
      console.error('[PlaytestManager] Failed to save playtest config:', error);
      return false;
    }
  }
}

/**
 * Create playtest iframe and setup message listeners
 * @param {string} templateId - Template ID
 * @param {string} gameId - Game ID (optional, will use playtest gameId if not provided)
 * @param {HTMLElement} container - Container element to append iframe
 * @param {Function} onReady - Callback when game is ready
 * @param {Function} onError - Callback when game has error
 * @returns {HTMLIFrameElement} Created iframe
 */
export function createPlaytestIframe(templateId, gameId = null, container, onReady = null, onError = null) {
  // Clear container
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
  
  // Get gameId from registry if not provided
  const finalGameId = gameId || getPlaytestGameId(templateId);
  if (!finalGameId) {
    console.error(`[PlaytestManager] No playtest gameId found for template: ${templateId}`);
    return null;
  }
  
  // Get template URL from registry
  const templateUrl = getTemplateUrl(templateId, finalGameId);
  if (!templateUrl) {
    console.error(`[PlaytestManager] No template URL found for template: ${templateId}`);
    return null;
  }
  
  // Create iframe
  const iframe = document.createElement('iframe');
  iframe.src = templateUrl;
  iframe.width = '100%';
  iframe.height = '100%';
  iframe.frameBorder = '0';
  iframe.style.display = 'block';
  iframe.title = `${templateId} Play Test`;
  
  // Show loading text
  const loading = document.createElement('div');
  loading.className = 'loading-text';
  loading.textContent = 'Loading game preview...';
  container.appendChild(loading);
  container.appendChild(iframe);
  
  // Get message types from registry
  const READY_TYPE = getMessageType(templateId, 'READY');
  const ERROR_TYPE = getMessageType(templateId, 'ERROR');
  
  if (!READY_TYPE || !ERROR_TYPE) {
    console.warn(`[PlaytestManager] Message types not found for template: ${templateId}`);
  }
  
  // Wait for game.js to send ready signal before removing loading
  let gameReady = false;
  let iframeLoaded = false;
  
  const removeLoadingIfReady = () => {
    if (gameReady && iframeLoaded && loading.parentNode) {
      loading.remove();
      console.log('[PlaytestManager] Loading removed - game ready');
    }
  };
  
  // Listen for ready/error signals from game.js
  const messageHandler = (event) => {
    // Security: Only accept messages from same origin
    if (event.origin !== window.location.origin && 
        !event.origin.includes('127.0.0.1') && 
        !event.origin.includes('localhost')) {
      return;
    }
    
    if (event.data && event.data.type === READY_TYPE) {
      gameReady = true;
      console.log('[PlaytestManager] Received ready signal from game:', event.data.gameId);
      removeLoadingIfReady();
      // Remove listener after receiving signal
      window.removeEventListener('message', messageHandler);
      if (onReady) onReady(event.data);
    } else if (event.data && event.data.type === ERROR_TYPE) {
      // Handle error from game
      console.error('[PlaytestManager] Game error:', event.data.error);
      loading.textContent = 'Failed to load game: ' + event.data.error;
      loading.style.color = '#ef4444';
      window.removeEventListener('message', messageHandler);
      if (onError) onError(event.data);
    }
  };
  
  window.addEventListener('message', messageHandler);
  
  // Fallback: Remove loading after iframe loads (but game might not be ready yet)
  iframe.addEventListener('load', () => {
    iframeLoaded = true;
    console.log('[PlaytestManager] Iframe loaded, waiting for game ready signal...');
    // Wait max 5 seconds for ready signal
    setTimeout(() => {
      if (!gameReady && loading.parentNode) {
        console.warn('[PlaytestManager] Game ready signal timeout, removing loading anyway');
        loading.remove();
        window.removeEventListener('message', messageHandler);
      }
    }, 5000);
    removeLoadingIfReady();
  });
  
  // Error handling
  iframe.addEventListener('error', () => {
    loading.textContent = 'Failed to load game preview';
    loading.style.color = '#ef4444';
    window.removeEventListener('message', messageHandler);
    if (onError) onError({ error: 'Iframe load error' });
  });
  
  return iframe;
}

/**
 * Send config update to iframe via postMessage
 * @param {HTMLIFrameElement} iframe - Target iframe
 * @param {string} templateId - Template ID
 * @param {Object} config - Config object
 * @returns {boolean} Success
 */
export function sendConfigToIframe(iframe, templateId, config) {
  if (!iframe || !iframe.contentWindow) {
    console.warn('[PlaytestManager] Invalid iframe for postMessage');
    return false;
  }
  
  try {
    const playtestGameId = getPlaytestGameId(templateId);
    iframe.contentWindow.postMessage({
      type: 'UPDATE_CONFIG',
      config: config,
      gameId: playtestGameId
    }, '*');
    
    // ✅ Log format khác nhau cho từng template
    if (templateId === 'rocket-bnb-template') {
      console.log('[PlaytestManager] ✅ Sent UPDATE_CONFIG to iframe (instant update):', {
        templateId,
        title: config.title,
        hasCoinLogo: !!config.coinLogoUrl,
        hasGameOverLogo: !!config.gameOverLogoUrl,
        tokenStory: config.tokenStory
      });
    } else if (templateId === 'space-jump-template') {
      console.log('[PlaytestManager] ✅ Sent UPDATE_CONFIG to iframe (instant update):', {
        templateId,
        hasHeadLogo: !!config.headLogoUrl,
        hasGameOverLogo: !!config.gameOverLogoUrl,
        storyText: config.storyText
      });
    } else {
      console.log('[PlaytestManager] ✅ Sent UPDATE_CONFIG to iframe (instant update):', {
        templateId,
        mapIndex: config.mapIndex,
        mapColor: config.mapColor,
        title: config.title,
        hasLogo: !!config.fragmentLogoUrl
      });
    }
    return true;
  } catch (err) {
    console.warn('[PlaytestManager] Failed to send postMessage:', err);
    return false;
  }
}

/**
 * Update playtest iframe with new config (instant update via postMessage or reload)
 * @param {string} templateId - Template ID
 * @param {HTMLIFrameElement} currentIframe - Current iframe (if exists)
 * @param {HTMLElement} container - Container element
 * @param {Object} config - Config object
 * @param {Function} onReady - Callback when game is ready
 * @param {Function} onError - Callback when game has error
 * @returns {HTMLIFrameElement} Iframe (existing or new)
 */
export function updatePlaytestIframe(templateId, currentIframe, container, config, onReady = null, onError = null) {
  // Save config first
  savePlaytestConfig(templateId, config);
  
  // If iframe exists and ready, send postMessage (instant update)
  if (currentIframe && currentIframe.contentWindow) {
    const success = sendConfigToIframe(currentIframe, templateId, config);
    if (success) {
      return currentIframe; // Return existing iframe
    }
    // If postMessage fails, fallback to reload
    console.warn('[PlaytestManager] PostMessage failed, reloading iframe...');
  }
  
  // Create new iframe (or reload)
  const gameId = getPlaytestGameId(templateId);
  return createPlaytestIframe(templateId, gameId, container, onReady, onError);
}


