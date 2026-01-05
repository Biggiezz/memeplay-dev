/**
 * Template Registry: Centralized configuration for all game templates
 * 
 * Mỗi template entry chứa:
 * - adapter: Class để import (không import ở đây, chỉ export path)
 * - playtestKey: localStorage key cho playtest config
 * - playtestGameId: gameId cố định cho playtest
 * - templateUrl: Đường dẫn đến index.html của template
 * - messageTypes: Message types mà template này sử dụng
 * - uiFields: Các UI fields cần hiển thị (map, color, story, logo...)
 */

// Import adapter paths (lazy load khi cần)
const ADAPTER_PATHS = {
  'pacman': () => import('../pacman-template/editor/editor-adapter.js').then(m => m.PacmanEditorAdapter)
};

/**
 * Template Registry Configuration
 */
export const TEMPLATE_REGISTRY = {
  'pacman': {
    // Adapter class (lazy load)
    adapterPath: '../pacman-template/editor/editor-adapter.js',
    adapterName: 'PacmanEditorAdapter',
    
    // Storage keys
    playtestKey: 'pacman_brand_config_playtest',
    playtestGameId: 'playtest-pacman',
    storagePrefix: 'pacman_brand_config_',
    
    // Template URL
    templateUrl: '/games/templates-v2/pacman-template/index.html',
    
    // Message types (hiện tại dùng PACMAN_*, sau sẽ migrate sang generic)
    messageTypes: {
      READY: 'PACMAN_GAME_READY',
      ERROR: 'PACMAN_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG' // Generic, dùng chung
    },
    
    // UI Fields configuration
    uiFields: {
      map: {
        enabled: true,
        selectorId: 'mapSelect',
        options: [
          { value: '1', label: 'Map 1' },
          { value: '2', label: 'Map 2' },
          { value: '3', label: 'Map 3' }
        ]
      },
      mapColor: {
        enabled: true,
        containerId: 'mapColors',
        colors: [
          { value: '#6B46C1', label: 'Purple' },
          { value: '#000000', label: 'Black' },
          { value: '#8B4513', label: 'Brown' }
        ]
      },
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      logo: {
        enabled: true,
        inputId: 'logoInput',
        previewId: 'logoPreview'
      }
    },
    
    // Template metadata
    displayName: 'Pacman',
    description: 'Classic Pacman game with custom maps and colors'
  },
  
  // ✅ Pixel Shooter Template
  'pixel-shooter': {
    adapterPath: '../pixel-shooter-template/editor/editor-adapter.js',
    adapterName: 'PixelShooterEditorAdapter',
    playtestKey: 'pixel_shooter_brand_config_playtest',
    playtestGameId: 'playtest-pixel-shooter',
    storagePrefix: 'pixel_shooter_brand_config_',
    templateUrl: '/games/templates-v2/pixel-shooter-template/index.html',
    messageTypes: {
      READY: 'PIXEL_SHOOTER_GAME_READY',
      ERROR: 'PIXEL_SHOOTER_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: {
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      logo: {
        enabled: true,
        inputId: 'logoInput',
        previewId: 'logoPreview'
      },
      mapColor: {
        enabled: true,
        containerId: 'mapColors',
        colors: [
          { value: '#1a1a2e', label: 'Dark Blue' },
          { value: '#2d1b3d', label: 'Dark Purple' },
          { value: '#1a2e1a', label: 'Dark Green' }
        ]
      }
      // KHÔNG có map field (khác Pacman)
    },
    displayName: 'Pixel Shooter',
    description: 'Space shooter game',
    enabled: true
  },
  
  // ✅ Rocket BNB Template
  'rocket-bnb-template': {
    adapterPath: '../rocket-bnb-template/editor/editor-adapter.js',
    adapterName: 'RocketBnbEditorAdapter',
    playtestKey: 'rocket_bnb_brand_config_playtest',
    playtestGameId: 'playtest-rocket-bnb',
    storagePrefix: 'rocket_bnb_brand_config_',
    templateUrl: '/games/templates-v2/rocket-bnb-template/index.html',
    messageTypes: {
      READY: 'ROCKET_BNB_GAME_READY',
      ERROR: 'ROCKET_BNB_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: {
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      coinLogo: {
        enabled: true,
        inputId: 'coinLogoInput',
        previewId: 'coinLogoPreview'
      },
      gameOverLogo: {
        enabled: true,
        inputId: 'gameOverLogoInput',
        previewId: 'gameOverLogoPreview'
      }
      // KHÔNG có map field và mapColor field
    },
    displayName: 'Rocket BNB',
    description: 'Rocket flying game with obstacles',
    enabled: true
  },
  
  // ✅ Space Jump Template
  'space-jump-template': {
    adapterPath: '../space-jump-template/editor/editor-adapter.js',
    adapterName: 'SpaceJumpEditorAdapter',
    playtestKey: 'space_jump_brand_config_playtest',
    playtestGameId: 'playtest-space-jump',
    storagePrefix: 'space_jump_brand_config_',
    templateUrl: '/games/templates-v2/space-jump-template/index.html',
    messageTypes: {
      READY: 'SPACE_JUMP_GAME_READY',
      ERROR: 'SPACE_JUMP_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: {
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      headLogo: {
        enabled: true,
        inputId: 'headLogoInput',
        previewId: 'headLogoPreview',
        label: 'Head Logo (Square)'
      },
      gameOverLogo: {
        enabled: true,
        inputId: 'gameOverLogoInput',
        previewId: 'gameOverLogoPreview',
        label: 'Game Over Logo'
      }
    },
    displayName: 'Space Jump',
    description: 'Endless jumping game with platforms and obstacles',
    enabled: true
  },
  
  // ✅ Fallen Crypto Template
  'fallen-crypto-template': {
    adapterPath: '../fallen-crypto-template/editor/editor-adapter.js',
    adapterName: 'FallenCryptoEditorAdapter',
    playtestKey: 'fallen_crypto_brand_config_playtest',
    playtestGameId: 'playtest-fallen-crypto',
    storagePrefix: 'fallen_crypto_brand_config_',
    templateUrl: '/games/templates-v2/fallen-crypto-template/index.html',
    messageTypes: {
      READY: 'FALLEN_CRYPTO_GAME_READY',
      ERROR: 'FALLEN_CRYPTO_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: {
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      logo: {
        enabled: true,
        inputId: 'logoInput',
        previewId: 'logoPreview'
      },
      mapColor: {
        enabled: true,
        containerId: 'mapColors',
        colors: [
          { value: '#6B46C1', label: 'Purple' },
          { value: '#8B4513', label: 'Brown' },
          { value: '#FF8C00', label: 'Orange' }
        ]
      }
      // KHÔNG có map field
    },
    displayName: 'Fallen Crypto',
    description: 'Brick breaker game with customizable bricks, logo, and story',
    enabled: true
  },
  
  // ✅ Shooter Template (Bubble Shooter)
  'shooter-template': {
    adapterPath: '../shooter-template/editor/editor-adapter.js',
    adapterName: 'ShooterEditorAdapter',
    playtestKey: 'shooter_brand_config_playtest',
    playtestGameId: 'playtest-shooter',
    storagePrefix: 'shooter_brand_config_',
    templateUrl: '/games/templates-v2/shooter-template/index.html',
    messageTypes: {
      READY: 'SHOOTER_GAME_READY',
      ERROR: 'SHOOTER_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: {
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      logo: {
        enabled: true,
        inputId: 'logoInput',
        previewId: 'logoPreview'
      },
      mapColor: {
        enabled: true,
        containerId: 'mapColors',
        colors: [
          { value: '#1a1a2e', label: 'Dark Blue' },
          { value: '#2d1b3d', label: 'Dark Purple' },
          { value: '#1a2e1a', label: 'Dark Green' }
        ]
      }
    },
    displayName: 'Shooter',
    description: 'Bubble shooter game with level progression',
    enabled: true
  },
  
  // ✅ Arrow Template (Archery Game)
  'arrow-template': {
    adapterPath: '../arrow-template/editor/editor-adapter.js',
    adapterName: 'ArrowEditorAdapter',
    playtestKey: 'arrow_brand_config_playtest-arrow',
    playtestGameId: 'playtest-arrow',
    storagePrefix: 'arrow_brand_config_',
    templateUrl: '/games/templates-v2/arrow-template/index.html',
    messageTypes: {
      READY: 'ARROW_GAME_READY',
      ERROR: 'ARROW_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: {
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      logo: {
        enabled: true,
        inputId: 'logoInput',
        previewId: 'logoPreview'
      },
      mapColor: {
        enabled: true,
        containerId: 'mapColors',
        colors: [
          { value: '#87CEEB', label: 'Sky Blue' },
          { value: '#90EE90', label: 'Light Green' },
          { value: '#DDA0DD', label: 'Light Purple' }
        ]
      }
    },
    displayName: 'Arrow',
    description: 'Archery game - shoot birds to score points',
    enabled: true
  },
  
  // ✅ Draw Runner Template
  'draw-runner-template': {
    adapterPath: '../draw-runner-template/editor/editor-adapter.js',
    adapterName: 'DrawRunnerEditorAdapter',
    playtestKey: 'draw_runner_brand_config_playtest-draw-runner',
    playtestGameId: 'playtest-draw-runner',
    storagePrefix: 'draw_runner_brand_config_',
    templateUrl: '/games/templates-v2/draw-runner-template/index.html',
    messageTypes: {
      READY: 'DRAW_RUNNER_GAME_READY',
      ERROR: 'DRAW_RUNNER_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: {
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      logo: {
        enabled: true,
        inputId: 'logoInput',
        previewId: 'logoPreview'
      }
      // KHÔNG có mapColor field (màu đất cố định)
    },
    displayName: 'Draw Runner',
    description: 'Draw Runner game template',
    enabled: true
  },
  
  // ✅ Knife Fix Template
  'knife-fix-template': {
    adapterPath: '../knife-fix-template/editor/editor-adapter.js',
    adapterName: 'KnifeFixEditorAdapter',
    playtestKey: 'knife_fix_brand_config_playtest-knife-fix',
    playtestGameId: 'playtest-knife-fix',
    storagePrefix: 'knife_fix_brand_config_',
    templateUrl: '/games/templates-v2/knife-fix-template/index.html',
    messageTypes: {
      READY: 'KNIFE_FIX_GAME_READY',
      ERROR: 'KNIFE_FIX_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: {
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      logo: {
        enabled: true,
        inputId: 'logoInput',
        previewId: 'logoPreview'
      }
    },
    displayName: 'Knife Fix',
    description: 'Knife throwing game - throw knives at rotating cake',
    enabled: true
  },
  
  // ✅ Moon Template
  'moon-template': {
    adapterPath: '../moon-template/editor/editor-adapter.js',
    adapterName: 'MoonEditorAdapter',
    
    // Storage keys
    playtestKey: 'moon_brand_config_playtest',
    playtestGameId: 'playtest-moon',
    storagePrefix: 'moon_brand_config_',
    
    // Template URL
    templateUrl: '/games/templates-v2/moon-template/index.html',
    
    // Message types
    messageTypes: {
      READY: 'MOON_GAME_READY',
      ERROR: 'MOON_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    
    // UI Fields configuration
    uiFields: {
      mapColor: {
        enabled: true,
        containerId: 'mapColors',
        colors: [
          { value: '#1a0a2e', label: 'Cosmic Purple' },
          { value: '#0a0a1a', label: 'Deep Space' },
          { value: '#0a1a2e', label: 'Nebula Blue' }
        ]
      },
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      logo: {
        enabled: true,
        inputId: 'logoInput',
        previewId: 'logoPreview'
      }
    },
    
    // Template metadata
    displayName: 'Moon Rocket',
    description: 'Launch rocket from Earth to hit the Moon',
    enabled: true
  },
  
  // ✅ Wall-Bird Template
  'wall-bird-template': {
    adapterPath: '../wall-bird-template/editor/editor-adapter.js',
    adapterName: 'WallBirdEditorAdapter',
    playtestKey: 'wall_bird_brand_config_playtest',
    playtestGameId: 'playtest-wall-bird',
    storagePrefix: 'wall_bird_brand_config_',
    templateUrl: '/games/templates-v2/wall-bird-template/index.html',
    messageTypes: {
      READY: 'WALL_BIRD_GAME_READY',
      ERROR: 'WALL_BIRD_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: {
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      logo: {
        enabled: true,
        inputId: 'logoInput',
        previewId: 'logoPreview'
      },
      mapColor: {
        enabled: true,
        containerId: 'mapColors',
        colors: [
          { value: '#90EE90', label: 'Light Green' },
          { value: '#87ceeb', label: 'Sky Blue' },
          { value: '#FFB6C1', label: 'Light Pink' }
        ]
      }
    },
    displayName: 'Wall Bounce Bird',
    description: 'Bird bouncing between walls - avoid spikes and collect points',
    enabled: true
  },
  
  // ✅ Pet Avatar Template (Always First)
  'pet-avatar-template': {
    adapterPath: '../pet-avatar-template/editor/editor-adapter.js',
    adapterName: 'PetAvatarEditorAdapter',
    playtestKey: 'pet_avatar_brand_config_playtest',
    playtestGameId: 'playtest-pet-avatar',
    storagePrefix: 'pet_avatar_brand_config_',
    templateUrl: '/games/templates-v2/pet-avatar-template/index.html',
    messageTypes: {
      READY: 'PET_AVATAR_GAME_READY',
      ERROR: 'PET_AVATAR_GAME_ERROR',
      UPDATE_CONFIG: 'UPDATE_CONFIG'
    },
    uiFields: {
      story: {
        enabled: true,
        inputId: 'storyInput',
        maxLength: 50
      },
      logo: {
        enabled: true,
        inputId: 'logoInput',
        previewId: 'logoPreview'
      }
    },
    displayName: 'Pet Avatar',
    description: 'Virtual pet avatar game - interact with your pet',
    enabled: true,
    priority: true // ✅ Flag để sort game này lên đầu
  }
};

/**
 * Get template config by ID
 * @param {string} templateId - Template ID (e.g., 'pacman', 'pixel-shooter', 'rocket-bnb-template')
 * @returns {Object|null} Template config or null if not found
 */
export function getTemplateConfig(templateId) {
  const config = TEMPLATE_REGISTRY[templateId];
  if (!config) {
    console.warn(`[TemplateRegistry] Template not found: ${templateId}`);
    return null;
  }
  return config;
}

/**
 * Get all enabled templates
 * @returns {Array} Array of template configs that are enabled
 */
export function getEnabledTemplates() {
  return Object.entries(TEMPLATE_REGISTRY)
    .filter(([id, config]) => config.enabled !== false)
    .map(([id, config]) => ({ id, ...config }));
}

/**
 * Load adapter class for a template (lazy load)
 * @param {string} templateId - Template ID
 * @returns {Promise<Class>} Adapter class
 */
export async function loadAdapter(templateId) {
  const config = getTemplateConfig(templateId);
  if (!config) {
    throw new Error(`Template not found: ${templateId}`);
  }
  
  if (!config.adapterPath) {
    throw new Error(`Adapter not available for template: ${templateId}`);
  }
  
  try {
    const module = await import(config.adapterPath);
    const AdapterClass = module[config.adapterName];
    if (!AdapterClass) {
      throw new Error(`Adapter class ${config.adapterName} not found in ${config.adapterPath}`);
    }
    return AdapterClass;
  } catch (error) {
    console.error(`[TemplateRegistry] Failed to load adapter for ${templateId}:`, error);
    throw error;
  }
}

/**
 * Get playtest storage key for a template
 * @param {string} templateId - Template ID
 * @returns {string} Storage key
 */
export function getPlaytestKey(templateId) {
  const config = getTemplateConfig(templateId);
  return config?.playtestKey || null;
}

/**
 * Get playtest gameId for a template
 * @param {string} templateId - Template ID
 * @returns {string} GameId
 */
export function getPlaytestGameId(templateId) {
  const config = getTemplateConfig(templateId);
  return config?.playtestGameId || null;
}

/**
 * Get template URL for a template
 * @param {string} templateId - Template ID
 * @param {string} gameId - Optional gameId to append as query param
 * @returns {string} Template URL
 */
export function getTemplateUrl(templateId, gameId = null) {
  const config = getTemplateConfig(templateId);
  if (!config) return null;
  
  const baseUrl = config.templateUrl;
  if (gameId) {
    return `${baseUrl}?game=${gameId}`;
  }
  return baseUrl;
}

/**
 * Get message type for a template
 * @param {string} templateId - Template ID
 * @param {string} messageName - Message name (e.g., 'READY', 'ERROR')
 * @returns {string|null} Message type string
 */
export function getMessageType(templateId, messageName) {
  const config = getTemplateConfig(templateId);
  return config?.messageTypes?.[messageName] || null;
}


