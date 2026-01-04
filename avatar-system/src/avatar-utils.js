// Avatar Utilities - Shared config and helper functions
// Used by avatar-creator.js and avatar-profile.js

// Avatar Config
export const AVATAR_CONFIG = {
  actors: {
    boy: { skin: 1, letter: 'a' },
    fish: { skin: 2, letter: 'b' },
    supergirl: { skin: 3, letter: 'c' }
  }
};

/**
 * Generate hash from config
 * @param {Object} config - Avatar config {actor, skin, clothes, equipment, hat}
 * @returns {string} Hash string (e.g., "0x12345678")
 */
export function generateHash(config) {
  const configString = `${config.actor}-${config.skin}-${config.clothes}-${config.equipment}-${config.hat}`;
  // Simple hash function (for demo, will use proper hash in production)
  let hash = 0;
  for (let i = 0; i < configString.length; i++) {
    const char = configString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and take first 8 chars
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8);
  const hashValue = `0x${hexHash}`;
  
  // Debug: Log config string and hash to console (for verification)
  if (console && console.debug) {
    console.debug(`[Hash] Config: "${configString}" → Hash: ${hashValue}`);
  }
  
  return hashValue;
}

/**
 * Get avatar file path from config
 * @param {Object} config - Avatar config {actor, skin, clothes, equipment, hat}
 * @returns {string} File path (e.g., "avatar-system/assets/avatars/a000.png")
 */
export function getAvatarFilePath(config) {
  const actorData = AVATAR_CONFIG.actors[config.actor];
  const skinLetter = actorData.letter;
  const clothes = config.clothes || 0;
  const equipment = config.equipment || 0;
  const hat = config.hat || 0;
  
  return `avatar-system/assets/avatars/${skinLetter}${clothes}${equipment}${hat}.png`;
}

