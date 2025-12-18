/**
 * Small wrapper around localStorage with JSON helpers and safe fallbacks.
 */
function getStorage() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (_) {
    return null;
  }
}

export function getItem(key, fallback = null) {
  try {
    const store = getStorage();
    if (!store) return fallback;
    const value = store.getItem(key);
    return value === null ? fallback : value;
  } catch (_) {
    return fallback;
  }
}

export function setItem(key, value) {
  try {
    const store = getStorage();
    if (!store) return false;
    store.setItem(key, value);
    return true;
  } catch (_) {
    return false;
  }
}

export function removeItem(key) {
  try {
    const store = getStorage();
    if (!store) return false;
    store.removeItem(key);
    return true;
  } catch (_) {
    return false;
  }
}

export function getJSON(key, fallback = null) {
  const raw = getItem(key, null);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch (_) {
    return fallback;
  }
}

export function setJSON(key, value) {
  try {
    return setItem(key, JSON.stringify(value));
  } catch (_) {
    return false;
  }
}

/**
 * Cleanup old game keys for a specific template (dùng chung cho tất cả template)
 * @param {string} templateId - Template ID (e.g., 'pacman-template', 'pixel-shooter-template')
 * @param {number} keepLatest - Number of latest keys to keep (default: 1)
 * @returns {number} Number of keys cleaned up
 */
export function cleanupOldGameKeys(templateId, keepLatest = 1) {
  try {
    const storage = getStorage();
    if (!storage) return 0;
    
    // Map templateId to storage prefix
    const prefixMap = {
      'pacman-template': 'pacman_brand_config_playmode-pacman-',
      'pixel-shooter-template': 'pixel_shooter_brand_config_playmode-pixel-shooter-',
      'rocket-bnb-template': 'rocket_bnb_brand_config_playmode-rocket-bnb-',
      'fallen-crypto-template': 'fallen_crypto_brand_config_playmode-fallen-crypto-',
      'space-jump-template': 'space_jump_brand_config_playmode-space-jump-',
      'shooter-template': 'shooter_brand_config_playmode-shooter-'
    };
    
    const prefix = prefixMap[templateId];
    if (!prefix) {
      console.warn(`[StorageManager] Unknown templateId: ${templateId}`);
      return 0;
    }
    
    // Get all keys matching prefix
    const allKeys = Object.keys(storage);
    const matchingKeys = allKeys.filter(key => key.startsWith(prefix));
    
    if (matchingKeys.length <= keepLatest) {
      return 0; // Không cần cleanup
    }
    
    // ✅ FIX: Sort by key và lấy timestamp từ gameId (format: playmode-pacman-XXX)
    // GameId format: playmode-pacman-123a (3 digits + 1 letter)
    // Sort theo digits (123) để key mới hơn ở cuối
    matchingKeys.sort((a, b) => {
      // Extract digits from key: pacman_brand_config_playmode-pacman-123a -> 123
      const extractDigits = (key) => {
        const match = key.match(/(\d{3})[a-z]$/);
        return match ? parseInt(match[1], 10) : 0;
      };
      const digitsA = extractDigits(a);
      const digitsB = extractDigits(b);
      return digitsA - digitsB; // Sort tăng dần: key cũ trước, key mới sau
    });
    
    // Xóa key cũ, chỉ giữ key mới nhất (key cuối cùng sau khi sort)
    const keysToDelete = matchingKeys.slice(0, matchingKeys.length - keepLatest);
    let cleanedCount = 0;
    
    keysToDelete.forEach(key => {
      try {
        storage.removeItem(key);
        cleanedCount++;
      } catch (err) {
        console.warn(`[StorageManager] Failed to remove key ${key}:`, err);
      }
    });
    
    if (cleanedCount > 0) {
      console.log(`[StorageManager] Cleaned up ${cleanedCount} old game keys for ${templateId} (kept ${keepLatest} latest)`);
      console.log(`[StorageManager] Deleted keys:`, keysToDelete);
      console.log(`[StorageManager] Kept keys:`, matchingKeys.slice(-keepLatest));
    }
    
    return cleanedCount;
  } catch (error) {
    console.error('[StorageManager] Failed to cleanup old game keys:', error);
    return 0;
  }
}





