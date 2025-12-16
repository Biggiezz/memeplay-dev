import { BaseAdapter } from '../../core/base-adapter.js';
import { getSupabaseClient } from '../../core/supabase-client.js';
import { buildPublicLinkUrl } from '../../core/url-builder.js';
import { TEMPLATE_IDS, PRODUCTION_BASE_URL } from '../../core/constants.js';
import { cleanupOldGameKeys } from '../../core/storage-manager.js';
import { generateGameId as generateGameIdUtil } from '../../core/game-id-utils.js';

const ROCKET_BNB_STORAGE_PREFIX = 'rocket_bnb_brand_config_';
const TEMPLATE_ID = 'rocket-bnb-template';

// Adapter for Rocket BNB template - handles save/load with localStorage
export class RocketBnbEditorAdapter extends BaseAdapter {
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
    // ✅ FIX: Lấy từ logoPreview (element thực sự tồn tại trong DOM)
    // Vì Rocket BNB dùng 1 logo cho cả coin và game over, nên lấy từ logoPreview
    const logoPreview = this.editorElements.logoPreview || document.getElementById('logoPreview');
    const storyInput = this.editorElements.storyInput || document.getElementById('storyInput');
    
    // Extract values with safe fallbacks
    // ✅ Dùng logoPreview.src cho cả coinLogoUrl và gameOverLogoUrl
    const logoUrl = logoPreview?.src || '';
    const coinLogoUrl = logoUrl;
    const gameOverLogoUrl = logoUrl;
    const tokenStory = (storyInput?.value || '').trim() || 'welcome to memeplay';
    
    // ✅ Cleanup old game keys trước khi save
    cleanupOldGameKeys(TEMPLATE_ID, 1);
    
    // Save to localStorage
    const config = {
      coinLogoUrl: coinLogoUrl,
      gameOverLogoUrl: gameOverLogoUrl,
      tokenStory: tokenStory,
      smartContract: ''
    };
    
    try {
      const storageKey = `${ROCKET_BNB_STORAGE_PREFIX}${gameId}`;
      localStorage.setItem(storageKey, JSON.stringify(config));
      console.log('[RocketBnbEditorAdapter] Saved game config:', { gameId, storageKey, config });
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('[RocketBnbEditorAdapter] QuotaExceededError, cleaning up more keys and retrying...');
        cleanupOldGameKeys(TEMPLATE_ID, 0);
        try {
          localStorage.setItem(storageKey, JSON.stringify(config));
          console.log('[RocketBnbEditorAdapter] Saved game config after cleanup');
        } catch (retryError) {
          console.error('[RocketBnbEditorAdapter] Failed to save config after cleanup:', retryError);
        }
      } else {
        console.error('[RocketBnbEditorAdapter] Failed to save config:', error);
      }
    }
    
    // ✅ Sync to Supabase
    try {
      const syncResult = await this.syncToSupabase(gameId, config);
      if (!syncResult) {
        console.warn('[RocketBnbEditorAdapter] ⚠️ Supabase sync failed, but game saved to localStorage');
      }
    } catch (error) {
      console.error('[RocketBnbEditorAdapter] Failed to sync to Supabase:', error);
      console.warn('[RocketBnbEditorAdapter] ⚠️ Game saved to localStorage, but Supabase sync failed');
    }
    
    this.lastSavedGameId = gameId;
    this.dirty = false;
    return { gameId };
  }

  isDirty() {
    if (this.dirty || !this.lastSavedGameId) return true;
    
    // ✅ FIX: Lấy từ logoPreview (element thực sự tồn tại)
    const logoPreview = this.editorElements.logoPreview;
    const storyInput = this.editorElements.storyInput;
    
    if (!logoPreview || !storyInput) return true;
    
    const storageKey = `${ROCKET_BNB_STORAGE_PREFIX}${this.lastSavedGameId}`;
    const savedRaw = localStorage.getItem(storageKey);
    if (!savedRaw) return true;
    
    try {
      const saved = JSON.parse(savedRaw);
      const currentLogoUrl = logoPreview.src || '';
      const currentTokenStory = storyInput.value?.trim() || 'welcome to memeplay';
      
      // ✅ So sánh với cả coinLogoUrl và gameOverLogoUrl (cùng giá trị từ logoPreview)
      if (saved.coinLogoUrl !== currentLogoUrl) return true;
      if (saved.gameOverLogoUrl !== currentLogoUrl) return true;
      if (saved.tokenStory !== currentTokenStory) return true;
      
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
    return generateGameIdUtil('rocket-bnb');
  }

  async syncToSupabase(gameId, config) {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        console.warn('[RocketBnbEditorAdapter] Supabase client unavailable, skip sync');
        return false;
      }

      const origin = window.location.origin.toLowerCase();
      const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('0.0.0.0');
      const baseUrl = isLocal ? PRODUCTION_BASE_URL : window.location.origin.replace(/\/$/, '');
      const templateUrl = `${baseUrl}/games/templates-v2/rocket-bnb-template/index.html?game=${gameId}`;
      const publicUrl = buildPublicLinkUrl(gameId, { forceProduction: true });
      
      const creatorKey = 'rocket_bnb_creator_id';
      let creatorId = localStorage.getItem(creatorKey);
      if (!creatorId) {
        creatorId = 'creator_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(creatorKey, creatorId);
      }

      // ✅ Payload chỉ dùng fields cũ (tương thích RPC hiện tại, giống Pacman/Pixel)
      const payload = buildLegacyPayload({
        gameId,
        templateId: TEMPLATE_ID,
        title: config.tokenStory || 'Rocket BNB Game',
        fragmentLogoUrl: config.gameOverLogoUrl || config.coinLogoUrl || null,
        storyOne: config.tokenStory || '',
        publicUrl,
        templateUrl,
        creatorId
      });

      const { data, error } = await supabase.rpc('upsert_user_created_game', payload);
      if (error) {
        console.error('[RocketBnbEditorAdapter] Supabase sync error:', error.message || error);
        console.error('[RocketBnbEditorAdapter] Payload:', JSON.stringify(payload, null, 2));
        console.error('[RocketBnbEditorAdapter] Error details:', error);
        return false;
      }

      console.log(`[RocketBnbEditorAdapter] ✅ Synced game ${gameId} to Supabase`);
      if (data) {
        console.log(`[RocketBnbEditorAdapter] Supabase response:`, data);
      }

      return true;
    } catch (err) {
      console.error('[RocketBnbEditorAdapter] Unexpected sync error:', err);
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
  publicUrl,
  templateUrl,
  creatorId
}) {
  return {
    p_game_id: gameId,
    p_template_id: templateId,
    p_title: title,
    p_map_color: '#1A0A2E',
    p_map_index: 0,
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

