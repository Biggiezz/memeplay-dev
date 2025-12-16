import { BaseAdapter } from '../../core/base-adapter.js';
import { getSupabaseClient } from '../../core/supabase-client.js';
import { buildPublicLinkUrl } from '../../core/url-builder.js';
import { TEMPLATE_IDS, PRODUCTION_BASE_URL } from '../../core/constants.js';
import { cleanupOldGameKeys } from '../../core/storage-manager.js';
import { generateGameId as generateGameIdUtil } from '../../core/game-id-utils.js';

const FALLEN_CRYPTO_STORAGE_PREFIX = 'fallen_crypto_brand_config_';
const TEMPLATE_ID = 'fallen-crypto-template';

// Adapter for Fallen Crypto template - handles save/load with localStorage
export class FallenCryptoEditorAdapter extends BaseAdapter {
  constructor(options = {}) {
    super(options);
    this.lastSavedGameId = null;
    this.dirty = true;
    this.editorElements = options.editorElements || {};
  }

  async load() {
    return { ok: true };
  }

  async save(forcedGameId = null) {
    const isDirty = this.isDirty();
    const gameId = forcedGameId || (isDirty ? this.generateGameId() : this.lastSavedGameId || this.generateGameId());
    
    // ✅ Validate editorElements exist (critical for mobile)
    if (!this.editorElements) {
      throw new Error('Editor elements not initialized');
    }
    
    // Get editor values with fallbacks
    const logoPreview = this.editorElements.logoPreview || document.getElementById('logoPreview');
    const storyInput = this.editorElements.storyInput || document.getElementById('storyInput');
    // ✅ Use mapColors (editor uses this ID for color picker)
    const mapColors = this.editorElements.mapColors || document.getElementById('mapColors');
    
    // Extract values with safe fallbacks
    const logoUrl = logoPreview?.src || '';
    const story = (storyInput?.value || '').trim() || 'welcome to memeplay';
    
    // Get selected brick color with fallback (3 màu: blue, light yellow, brown)
    let brickColor = '#4a90a4'; // default teal
    if (mapColors) {
      const activeColorBtn = mapColors.querySelector('.chip-btn.active');
      if (activeColorBtn) {
        brickColor = activeColorBtn.dataset.color || brickColor;
      }
    }
    
    // ✅ Cleanup old game keys trước khi save
    cleanupOldGameKeys(TEMPLATE_ID, 1);
    
    // Save to localStorage
    const config = {
      logoUrl: logoUrl,
      story: story,
      brickColor: brickColor
    };
    
    try {
      const storageKey = `${FALLEN_CRYPTO_STORAGE_PREFIX}${gameId}`;
      localStorage.setItem(storageKey, JSON.stringify(config));
      console.log('[FallenCryptoEditorAdapter] Saved game config:', { gameId, storageKey, config });
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('[FallenCryptoEditorAdapter] QuotaExceededError, cleaning up more keys and retrying...');
        cleanupOldGameKeys(TEMPLATE_ID, 0);
        try {
          localStorage.setItem(storageKey, JSON.stringify(config));
          console.log('[FallenCryptoEditorAdapter] Saved game config after cleanup');
        } catch (retryError) {
          console.error('[FallenCryptoEditorAdapter] Failed to save config after cleanup:', retryError);
        }
      } else {
        console.error('[FallenCryptoEditorAdapter] Failed to save config:', error);
      }
    }
    
    // ✅ Sync to Supabase
    try {
      const syncResult = await this.syncToSupabase(gameId, config);
      if (!syncResult) {
        console.warn('[FallenCryptoEditorAdapter] ⚠️ Supabase sync failed, but game saved to localStorage');
      }
    } catch (error) {
      console.error('[FallenCryptoEditorAdapter] Failed to sync to Supabase:', error);
      console.warn('[FallenCryptoEditorAdapter] ⚠️ Game saved to localStorage, but Supabase sync failed');
    }
    
    this.lastSavedGameId = gameId;
    this.dirty = false;
    return { gameId };
  }

  isDirty() {
    if (this.dirty || !this.lastSavedGameId) return true;
    
    const logoPreview = this.editorElements.logoPreview;
    const storyInput = this.editorElements.storyInput;
    // ✅ Use mapColors (editor uses this ID for color picker)
    const mapColors = this.editorElements.mapColors;
    
    if (!logoPreview || !storyInput || !mapColors) return true;
    
    const storageKey = `${FALLEN_CRYPTO_STORAGE_PREFIX}${this.lastSavedGameId}`;
    const savedRaw = localStorage.getItem(storageKey);
    if (!savedRaw) return true;
    
    try {
      const saved = JSON.parse(savedRaw);
      const currentLogoUrl = logoPreview.src || '';
      const currentStory = storyInput.value?.trim() || 'welcome to memeplay';
      
      // Get current brick color
      const activeColorBtn = mapColors.querySelector('.chip-btn.active');
      const currentBrickColor = activeColorBtn?.dataset.color || '#4a90a4';
      
      // Compare with saved config
      if (saved.logoUrl !== currentLogoUrl) return true;
      if (saved.story !== currentStory) return true;
      if (saved.brickColor !== currentBrickColor) return true;
      
      return false;
    } catch (error) {
      return true;
    }
  }

  markDirty() {
    this.dirty = true;
  }

  generateGameId() {
    // ✅ Use shared utility
    return generateGameIdUtil('fallen-crypto');
  }

  async syncToSupabase(gameId, config) {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        console.warn('[FallenCryptoEditorAdapter] Supabase client unavailable, skip sync');
        return false;
      }

      const origin = window.location.origin.toLowerCase();
      const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('0.0.0.0');
      const baseUrl = isLocal ? PRODUCTION_BASE_URL : window.location.origin.replace(/\/$/, '');
      const templateUrl = `${baseUrl}/games/templates-v2/fallen-crypto-template/index.html?game=${gameId}`;
      const publicUrl = buildPublicLinkUrl(gameId, { forceProduction: true });
      
      const creatorKey = 'fallen_crypto_creator_id';
      let creatorId = localStorage.getItem(creatorKey);
      if (!creatorId) {
        creatorId = 'creator_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(creatorKey, creatorId);
      }

      // ✅ Payload với fields: fragmentLogoUrl (logoUrl), storyOne (story), mapColor (brickColor)
      const payload = buildLegacyPayload({
        gameId,
        templateId: TEMPLATE_ID,
        title: config.story || 'Fallen Crypto Game',
        fragmentLogoUrl: config.logoUrl || null,
        storyOne: config.story || '',
        mapColor: config.brickColor || '#4a90a4', // ✅ Map brickColor to mapColor for Supabase
        publicUrl,
        templateUrl,
        creatorId
      });

      const { data, error } = await supabase.rpc('upsert_user_created_game', payload);
      if (error) {
        console.error('[FallenCryptoEditorAdapter] Supabase sync error:', error.message || error);
        console.error('[FallenCryptoEditorAdapter] Payload:', JSON.stringify(payload, null, 2));
        console.error('[FallenCryptoEditorAdapter] Error details:', error);
        return false;
      }

      console.log(`[FallenCryptoEditorAdapter] ✅ Synced game ${gameId} to Supabase`);
      if (data) {
        console.log(`[FallenCryptoEditorAdapter] Supabase response:`, data);
      }

      return true;
    } catch (err) {
      console.error('[FallenCryptoEditorAdapter] Unexpected sync error:', err);
      return false;
    }
  }
}

// -------------------------------------
// Helpers
// -------------------------------------
function buildLegacyPayload({
  gameId,
  templateId,
  title,
  fragmentLogoUrl,
  storyOne,
  mapColor,
  publicUrl,
  templateUrl,
  creatorId
}) {
  return {
    p_game_id: gameId,
    p_template_id: templateId,
    p_title: title,
    p_map_color: mapColor || '#4a90a4', // ✅ Use brickColor as mapColor
    p_map_index: 0, // Fallen Crypto không có map selection
    p_fragment_logo_url: fragmentLogoUrl,
    p_story_one: storyOne,
    p_story_two: '',
    p_story_three: '',
    p_public_url: publicUrl,
    p_template_url: templateUrl,
    p_creator_id: creatorId,
    p_context: 'template-v2-editor'
  };
}
