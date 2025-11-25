const TEMPLATE_ID = 'blocks-8x8';

function getBlocksGameId() {
  const url = new URL(window.location.href);
  const paramGameId = url.searchParams.get('game');
  if (paramGameId) return paramGameId;
  return null;
}

function generateBlocksGameId() {
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `blocks-${randomSuffix}`;
}

let BRAND_CONFIG = {
  fragmentLogo: null,
  fragmentLogoUrl: '',
  story: '',
  mapColor: '#0a0a0a'
};

function getStorageKey(gameId) {
  return gameId ? `blocks_brand_config_${gameId}` : 'blocks_brand_config';
}

function loadBrandConfig(gameIdOverride = null) {
  const gameId = gameIdOverride || getBlocksGameId();
  const storageKey = getStorageKey(gameId);
  const saved = localStorage.getItem(storageKey);
  if (!saved) {
    console.log('[BlocksConfig] No saved config for key:', storageKey);
    return false;
  }

  try {
    const parsed = JSON.parse(saved);
    BRAND_CONFIG = {
      ...BRAND_CONFIG,
      fragmentLogoUrl: parsed.fragmentLogoUrl || '',
      story: typeof parsed.story === 'string' ? parsed.story : '',
      mapColor: parsed.mapColor || '#0a0a0a'
    };

    if (BRAND_CONFIG.fragmentLogoUrl) {
      const img = new Image();
      img.onload = () => {
        BRAND_CONFIG.fragmentLogo = img;
      };
      img.src = BRAND_CONFIG.fragmentLogoUrl;
    }
    return true;
  } catch (error) {
    console.error('[BlocksConfig] Failed to parse config:', error);
    return false;
  }
}

function saveBrandConfig(gameId = null) {
  const id = gameId || getBlocksGameId() || 'blocks_brand_config';
  const storageKey = getStorageKey(id);
  const payload = {
    fragmentLogoUrl: BRAND_CONFIG.fragmentLogoUrl,
    story: BRAND_CONFIG.story || '',
    mapColor: BRAND_CONFIG.mapColor || '#0a0a0a'
  };
  localStorage.setItem(storageKey, JSON.stringify(payload));
  return id;
}

loadBrandConfig();



