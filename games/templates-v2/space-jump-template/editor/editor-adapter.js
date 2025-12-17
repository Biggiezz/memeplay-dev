import { BaseAdapter } from '../../core/base-adapter.js';
import { getSupabaseClient } from '../../core/supabase-client.js';
import { buildPublicLinkUrl } from '../../core/url-builder.js';
import { PRODUCTION_BASE_URL } from '../../core/constants.js';
import { cleanupOldGameKeys } from '../../core/storage-manager.js';
import { generateGameId as generateGameIdUtil } from '../../core/game-id-utils.js';

const SPACE_JUMP_STORAGE_PREFIX = 'space_jump_brand_config_';
const TEMPLATE_ID = 'space-jump-template';

// Adapter for Space Jump template - handles save/load with localStorage
export class SpaceJumpEditorAdapter extends BaseAdapter {
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
    
    if (!this.editorElements) {
      throw new Error('Editor elements not initialized');
    }
    
    // Get editor values - Editor uses single logoPreview for both head and gameOver
    const logoPreview = this.editorElements.logoPreview || document.getElementById('logoPreview');
    const storyInput = this.editorElements.storyInput || document.getElementById('storyInput');
    
    const logoUrl = logoPreview?.src || '';
    const headLogoUrl = logoUrl;
    const gameOverLogoUrl = logoUrl;
    const storyText = (storyInput?.value || '').trim() || 'memeplay';
    
    // Cleanup old game keys before save
    cleanupOldGameKeys(TEMPLATE_ID, 1);
    
    // Save to localStorage
    const config = {
      headLogoUrl: headLogoUrl,
      gameOverLogoUrl: gameOverLogoUrl,
      storyText: storyText
    };
    
    try {
      const storageKey = `${SPACE_JUMP_STORAGE_PREFIX}${gameId}`;
      localStorage.setItem(storageKey, JSON.stringify(config));
      console.log('[SpaceJumpEditorAdapter] Saved game config:', { gameId, storageKey, config });
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.warn('[SpaceJumpEditorAdapter] QuotaExceededError, cleaning up more keys and retrying...');
        cleanupOldGameKeys(TEMPLATE_ID, 0);
        try {
          const storageKey = `${SPACE_JUMP_STORAGE_PREFIX}${gameId}`;
          localStorage.setItem(storageKey, JSON.stringify(config));
          console.log('[SpaceJumpEditorAdapter] Saved game config after cleanup');
        } catch (retryError) {
          console.error('[SpaceJumpEditorAdapter] Failed to save config after cleanup:', retryError);
        }
      } else {
        console.error('[SpaceJumpEditorAdapter] Failed to save config:', error);
      }
    }
    
    // Sync to Supabase
    try {
      const syncResult = await this.syncToSupabase(gameId, config);
      if (!syncResult) {
        console.warn('[SpaceJumpEditorAdapter] ⚠️ Supabase sync failed, but game saved to localStorage');
      }
    } catch (error) {
      console.error('[SpaceJumpEditorAdapter] Failed to sync to Supabase:', error);
    }
    
    this.lastSavedGameId = gameId;
    this.dirty = false;
    return { gameId };
  }

  isDirty() {
    if (this.dirty || !this.lastSavedGameId) return true;
    
    // Editor uses single logoPreview for both head and gameOver
    const logoPreview = this.editorElements.logoPreview;
    const storyInput = this.editorElements.storyInput;
    
    if (!logoPreview || !storyInput) return true;
    
    const storageKey = `${SPACE_JUMP_STORAGE_PREFIX}${this.lastSavedGameId}`;
    const savedRaw = localStorage.getItem(storageKey);
    if (!savedRaw) return true;
    
    try {
      const saved = JSON.parse(savedRaw);
      const currentLogo = logoPreview.src || '';
      // Compare with either headLogoUrl or gameOverLogoUrl (they're the same)
      if (saved.headLogoUrl !== currentLogo && saved.gameOverLogoUrl !== currentLogo) return true;
      if (saved.storyText !== (storyInput.value?.trim() || 'memeplay')) return true;
      return false;
    } catch (error) {
      return true;
    }
  }

  markDirty() {
    this.dirty = true;
  }

  generateGameId() {
    return generateGameIdUtil('space-jump');
  }

  async syncToSupabase(gameId, config) {
    try {
      const supabase = await getSupabaseClient();
      if (!supabase) {
        console.warn('[SpaceJumpEditorAdapter] Supabase client unavailable, skip sync');
        return false;
      }

      const origin = window.location.origin.toLowerCase();
      const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('0.0.0.0');
      const baseUrl = isLocal ? PRODUCTION_BASE_URL : window.location.origin.replace(/\/$/, '');
      const templateUrl = `${baseUrl}/games/templates-v2/space-jump-template/index.html?game=${gameId}`;
      const publicUrl = buildPublicLinkUrl(gameId, { forceProduction: true });
      
      const creatorKey = 'space_jump_creator_id';
      let creatorId = localStorage.getItem(creatorKey);
      if (!creatorId) {
        creatorId = 'creator_' + Math.random().toString(36).slice(2, 10);
        localStorage.setItem(creatorKey, creatorId);
      }

      const payload = {
        p_game_id: gameId,
        p_template_id: TEMPLATE_ID,
        p_title: config.storyText || 'Space Jump Game',
        p_map_color: '#0a0e27',
        p_map_index: 0,
        p_fragment_logo_url: config.gameOverLogoUrl || config.headLogoUrl || null,
        p_story_one: config.storyText || '',
        p_story_two: '',
        p_story_three: '',
        p_public_url: publicUrl,
        p_template_url: templateUrl,
        p_creator_id: creatorId,
        p_context: 'template-v2-editor'
      };

      const { data, error } = await supabase.rpc('upsert_user_created_game', payload);
      if (error) {
        console.error('[SpaceJumpEditorAdapter] Supabase sync error:', error.message || error);
        return false;
      }

      console.log(`[SpaceJumpEditorAdapter] ✅ Synced game ${gameId} to Supabase`);
      return true;
    } catch (err) {
      console.error('[SpaceJumpEditorAdapter] Unexpected sync error:', err);
      return false;
    }
  }
}

