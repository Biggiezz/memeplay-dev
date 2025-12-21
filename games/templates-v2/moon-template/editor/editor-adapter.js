import { BaseAdapter } from '../../core/base-adapter.js';
import { cleanupOldGameKeys } from '../../core/storage-manager.js';
import { generateGameId as generateGameIdUtil } from '../../core/game-id-utils.js';
import { syncGameToSupabase } from '../../core/supabase-sync.js';

const MOON_STORAGE_PREFIX = 'moon_brand_config_';
const TEMPLATE_ID = 'moon-template';

/**
 * Editor Adapter for Moon Template
 * Handles save/load with localStorage and Supabase sync
 */
export class MoonEditorAdapter extends BaseAdapter {
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
        
        // Get editor values
        const logoPreview = this.editorElements.logoPreview || document.getElementById('logoPreview');
        const storyInput = this.editorElements.storyInput || document.getElementById('storyInput');
        const mapColors = this.editorElements.mapColors || document.getElementById('mapColors');
        
        const logoUrl = logoPreview?.src || '';
        const storyText = (storyInput?.value || '').trim() || 'MEMEPLAY';
        
        // Get selected map color
        let mapColor = '#1a0a2e'; // default Cosmic Purple
        if (mapColors) {
            const activeColorBtn = mapColors.querySelector('.chip-btn.active');
            if (activeColorBtn) {
                mapColor = activeColorBtn.dataset.color || mapColor;
            }
        }
        
        // Cleanup old game keys before save
        cleanupOldGameKeys(TEMPLATE_ID, 1);
        
        // Save to localStorage
        const config = {
            logoUrl: logoUrl,
            storyText: storyText,
            mapColor: mapColor
        };
        
        try {
            const storageKey = `${MOON_STORAGE_PREFIX}${gameId}`;
            localStorage.setItem(storageKey, JSON.stringify(config));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                cleanupOldGameKeys(TEMPLATE_ID, 0);
                try {
                    const storageKey = `${MOON_STORAGE_PREFIX}${gameId}`;
                    localStorage.setItem(storageKey, JSON.stringify(config));
                } catch (retryError) {
                    // Silent fail
                }
            }
        }
        
        // ✅ Sync to Supabase (shared helper)
        try {
            const stories = config.storyText ? [config.storyText] : [];
            const success = await syncGameToSupabase({
                gameId,
                templateId: TEMPLATE_ID,
                title: config.storyText || 'Moon Rocket Game',
                fragmentLogoUrl: config.logoUrl || null,
                stories,
                creatorId: this.getCreatorId(),
                templatePath: '/games/templates-v2/moon-template/index.html',
                mapColor: config.mapColor || '#1a0a2e',
                mapIndex: 0
            });
            if (!success) {
                console.warn('[MoonEditorAdapter] Supabase sync failed, but game saved to localStorage');
            }
        } catch (error) {
            console.error('[MoonEditorAdapter] Failed to sync to Supabase:', error);
            // Don't fail the save if Supabase sync fails
        }
        
        this.lastSavedGameId = gameId;
        this.dirty = false;
        return { gameId };
    }

    isDirty() {
        if (this.dirty || !this.lastSavedGameId) return true;
        
        const logoPreview = this.editorElements.logoPreview;
        const storyInput = this.editorElements.storyInput;
        const mapColors = this.editorElements.mapColors || document.getElementById('mapColors');
        
        if (!logoPreview || !storyInput) return true;
        
        const storageKey = `${MOON_STORAGE_PREFIX}${this.lastSavedGameId}`;
        const savedRaw = localStorage.getItem(storageKey);
        if (!savedRaw) return true;
        
        try {
            const saved = JSON.parse(savedRaw);
            const currentLogo = logoPreview.src || '';
            if (saved.logoUrl !== currentLogo) return true;
            if (saved.storyText !== (storyInput.value?.trim() || 'MEMEPLAY')) return true;
            
            // Check mapColor
            if (mapColors) {
                const activeColorBtn = mapColors.querySelector('.chip-btn.active');
                const currentMapColor = activeColorBtn?.dataset.color || '#1a0a2e';
                if (saved.mapColor !== currentMapColor) return true;
            }
            
            return false;
        } catch (error) {
            return true;
        }
    }

    markDirty() {
        this.dirty = true;
    }

    generateGameId() {
        return generateGameIdUtil('moon');
    }

    getCreatorId() {
        const creatorKey = 'moon_creator_id';
        let creatorId = localStorage.getItem(creatorKey);
        if (!creatorId) {
            creatorId = 'creator_' + Math.random().toString(36).slice(2, 10);
            localStorage.setItem(creatorKey, creatorId);
        }
        return creatorId;
    }
}
