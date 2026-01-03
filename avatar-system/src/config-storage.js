// Config Storage - Map configHash to config
// Stores config when minting, retrieves when generating metadata

const STORAGE_KEY = 'mp_avatar_configs';

/**
 * Store config for a configHash
 */
export function storeConfig(configHash, config) {
  try {
    const configs = getStoredConfigs();
    configs[configHash] = config;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
    return true;
  } catch (error) {
    console.error('Store config error:', error);
    return false;
  }
}

/**
 * Get config for a configHash
 */
export function getConfig(configHash) {
  try {
    const configs = getStoredConfigs();
    return configs[configHash] || null;
  } catch (error) {
    console.error('Get config error:', error);
    return null;
  }
}

/**
 * Get all stored configs
 */
function getStoredConfigs() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Get stored configs error:', error);
    return {};
  }
}

/**
 * Store config for tokenId (for easy lookup)
 */
export function storeConfigForToken(tokenId, configHash, config) {
  try {
    const tokenConfigs = getTokenConfigs();
    tokenConfigs[tokenId] = { configHash, config };
    localStorage.setItem('mp_avatar_token_configs', JSON.stringify(tokenConfigs));
    
    // Also store by configHash
    storeConfig(configHash, config);
    
    return true;
  } catch (error) {
    console.error('Store token config error:', error);
    return false;
  }
}

/**
 * Get config for tokenId
 */
export function getConfigForToken(tokenId) {
  try {
    const tokenConfigs = getTokenConfigs();
    const tokenConfig = tokenConfigs[tokenId];
    return tokenConfig ? tokenConfig.config : null;
  } catch (error) {
    console.error('Get token config error:', error);
    return null;
  }
}

/**
 * Get all token configs
 */
function getTokenConfigs() {
  try {
    const stored = localStorage.getItem('mp_avatar_token_configs');
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Get token configs error:', error);
    return {};
  }
}

