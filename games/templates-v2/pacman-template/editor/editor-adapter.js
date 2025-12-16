import { BaseAdapter } from '../../core/base-adapter.js';
import { TEMPLATE_IDS } from '../../core/constants.js';
import { cleanupOldGameKeys } from '../../core/storage-manager.js';
import { syncGameToSupabase } from '../../core/supabase-sync.js';

const PACMAN_STORAGE_PREFIX = 'pacman_brand_config_';
const TEMPLATE_ID = 'pacman-template';

// Adapter for Pacman template - handles save/load with localStorage
export class PacmanEditorAdapter extends BaseAdapter {
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
    // Use caller-provided gameId when available to keep clipboard and storage in sync
    const gameId = forcedGameId || (isDirty ? this.generateGameId() : this.lastSavedGameId || this.generateGameId());
    
    // ✅ Validate editorElements exist (critical for mobile)
    if (!this.editorElements) {
      throw new Error('Editor elements not initialized');
    }
    
    // Get editor values with fallbacks
    const storyInput = this.editorElements.storyInput || document.getElementById('storyInput');
    const mapSelect = this.editorElements.mapSelect || document.getElementById('mapSelect');
    const logoPreview = this.editorElements.logoPreview || document.getElementById('logoPreview');
    const mapColors = this.editorElements.mapColors || document.getElementById('mapColors');
    
    // Extract values with safe fallbacks
    const story = (storyInput?.value || '').trim();
    const mapIndex = mapSelect?.value ? parseInt(mapSelect.value, 10) - 1 : 0;
    const fragmentLogoUrl = logoPreview?.src || '';
    
    // Get selected map color with fallback
    let mapColor = '#1a1a2e'; // default
    if (mapColors) {
      const activeColorBtn = mapColors.querySelector('.chip-btn.active');
      if (activeColorBtn) {
        mapColor = activeColorBtn.dataset.color || mapColor;
      }
    }
    
    // ✅ Bước 3: Cleanup old game keys trước khi save (chỉ giữ key mới nhất)
    cleanupOldGameKeys(TEMPLATE_ID, 1);
    
    // Save to localStorage (same format as V1)
    const config = {
      fragmentLogoUrl: fragmentLogoUrl,
      title: story || 'Untitled Game',
      smartContract: '',
      mapColor: mapColor,
      mapIndex: mapIndex,
      stories: [story] // ✅ Must be array for play-v2.js compatibility
    };
    
    try {
      const storageKey = `${PACMAN_STORAGE_PREFIX}${gameId}`;
      localStorage.setItem(storageKey, JSON.stringify(config));
      console.log('[PacmanEditorAdapter] Saved game config:', { gameId, storageKey, config });
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        // ✅ Nếu vẫn fail, cleanup lại và thử lại
        console.warn('[PacmanEditorAdapter] QuotaExceededError, cleaning up more keys and retrying...');
        cleanupOldGameKeys(TEMPLATE_ID, 0); // Xóa tất cả key cũ
        try {
          localStorage.setItem(storageKey, JSON.stringify(config));
          console.log('[PacmanEditorAdapter] Saved game config after cleanup');
        } catch (retryError) {
          console.error('[PacmanEditorAdapter] Failed to save config after cleanup:', retryError);
        }
      } else {
        console.error('[PacmanEditorAdapter] Failed to save config:', error);
      }
    }
    
    // ✅ Sync to Supabase (shared helper)
    try {
      const stories = Array.isArray(config.stories) ? config.stories : [];
      const success = await syncGameToSupabase({
        gameId,
        templateId: TEMPLATE_ID,
        title: config.title || 'Pacman Game',
        fragmentLogoUrl: config.fragmentLogoUrl || null,
        stories,
        creatorId: this.getCreatorId(),
        templatePath: '/games/templates-v2/pacman-template/index.html',
        mapColor: config.mapColor || '#1a1a2e',
        mapIndex: config.mapIndex !== undefined ? config.mapIndex : 0
      });
      if (!success) {
        console.warn('[PacmanEditorAdapter] Supabase sync failed, but game saved to localStorage');
      }
    } catch (error) {
      console.error('[PacmanEditorAdapter] Failed to sync to Supabase:', error);
      // Don't fail the save if Supabase sync fails
    }
    
    this.lastSavedGameId = gameId;
    this.dirty = false;
    return { gameId };
  }

  isDirty() {
    if (this.dirty || !this.lastSavedGameId) return true;
    
    // Check if editor values changed
    const storyInput = this.editorElements.storyInput;
    const mapSelect = this.editorElements.mapSelect;
    const logoPreview = this.editorElements.logoPreview;
    const mapColors = this.editorElements.mapColors;
    
    if (!storyInput || !mapSelect || !logoPreview || !mapColors) return true;
    
    // Load last saved config to compare
    const storageKey = `${PACMAN_STORAGE_PREFIX}${this.lastSavedGameId}`;
    const savedRaw = localStorage.getItem(storageKey);
    if (!savedRaw) return true;
    
    try {
      const saved = JSON.parse(savedRaw);
      const currentStory = storyInput.value?.trim() || '';
      const currentMapIndex = mapSelect.value ? parseInt(mapSelect.value, 10) - 1 : 0;
      const currentLogoUrl = logoPreview.src || '';
      
      const activeColorBtn = mapColors.querySelector('.chip-btn.active');
      const currentMapColor = activeColorBtn?.dataset.color || '#1a1a2e';
      
      // Compare values (saved.stories is array, need to extract first element)
      const savedStory = Array.isArray(saved.stories) ? saved.stories[0] : (saved.stories || '');
      if (savedStory !== currentStory) return true;
      if (saved.mapIndex !== currentMapIndex) return true;
      if (saved.fragmentLogoUrl !== currentLogoUrl) return true;
      if (saved.mapColor !== currentMapColor) return true;
      
      return false; // No changes
    } catch (error) {
      return true; // Error parsing, consider dirty
    }
  }

  markDirty() {
    this.dirty = true;
  }

  generateGameId() {
    const digits = String(Date.now() % 1000).padStart(3, '0'); // always 3 digits
    const letter = (Math.random().toString(36).match(/[a-z]/) || ['a'])[0]; // single letter
    return `playmode-pacman-${digits}${letter}`;
  }

  // Creator ID helper reused in sync
  getCreatorId() {
    const creatorKey = 'pacman_creator_id';
    let creatorId = localStorage.getItem(creatorKey);
    if (!creatorId) {
      creatorId = 'creator_' + Math.random().toString(36).slice(2, 10);
      localStorage.setItem(creatorKey, creatorId);
    }
    return creatorId;
  }
}

