/**
 * Shared utilities for game ID generation and parsing
 * Reduces code duplication across templates
 */

/**
 * Get game ID from URL query parameter
 * @returns {string|null} Game ID or null if not found
 */
export function getGameId() {
  try {
    const url = new URL(window.location.href);
    const gameIdFromQuery = url.searchParams.get('game');
    if (gameIdFromQuery) return gameIdFromQuery;
    return null;
  } catch (error) {
    console.warn('[game-id-utils] Failed to parse URL:', error);
    return null;
  }
}

/**
 * Generate unique game ID with format: playmode-{prefix}-{3digits}{1letter}
 * @param {string} prefix - Template prefix (e.g., 'rocket-bnb', 'pixel-shooter')
 * @returns {string} Generated game ID
 */
export function generateGameId(prefix) {
  if (!prefix || typeof prefix !== 'string') {
    throw new Error('generateGameId requires a prefix string');
  }
  
  const digits = String(Date.now() % 1000).padStart(3, '0');
  const letter = (Math.random().toString(36).match(/[a-z]/) || ['a'])[0];
  return `playmode-${prefix}-${digits}${letter}`;
}

/**
 * Generate playtest game ID
 * @param {string} prefix - Template prefix
 * @returns {string} Playtest game ID (e.g., 'playtest-rocket-bnb')
 */
export function generatePlaytestGameId(prefix) {
  if (!prefix || typeof prefix !== 'string') {
    throw new Error('generatePlaytestGameId requires a prefix string');
  }
  
  return `playtest-${prefix}`;
}

/**
 * Check if game ID is a playtest ID
 * @param {string} gameId - Game ID to check
 * @returns {boolean} True if playtest ID
 */
export function isPlaytestGameId(gameId) {
  return gameId && typeof gameId === 'string' && gameId.startsWith('playtest-');
}


