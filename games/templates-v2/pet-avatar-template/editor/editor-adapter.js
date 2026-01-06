import { BaseAdapter } from '../../core/base-adapter.js';
import { cleanupOldGameKeys } from '../../core/storage-manager.js';
import { generateGameId as generateGameIdUtil } from '../../core/game-id-utils.js';
import { syncGameToSupabase } from '../../core/supabase-sync.js';

const PET_AVATAR_STORAGE_PREFIX = 'pet_avatar_brand_config_';
const TEMPLATE_ID = 'pet-avatar-template';

/**
 * Editor Adapter for Pet Avatar Template
 * Handles save/load with localStorage and Supabase sync
 */
export class PetAvatarEditorAdapter extends BaseAdapter {
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
        
        const logoUrl = logoPreview?.src || '';
        const storyText = (storyInput?.value || '').trim() || 'MEMEPLAY';
        
        // Cleanup old game keys before save
        cleanupOldGameKeys(TEMPLATE_ID, 1);
        
        // Save to localStorage
        const config = {
            logoUrl: logoUrl,
            storyText: storyText
        };
        
        try {
            const storageKey = `${PET_AVATAR_STORAGE_PREFIX}${gameId}`;
            localStorage.setItem(storageKey, JSON.stringify(config));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                cleanupOldGameKeys(TEMPLATE_ID, 0);
                try {
                    const storageKey = `${PET_AVATAR_STORAGE_PREFIX}${gameId}`;
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
                title: config.storyText || 'Pet Avatar Game',
                fragmentLogoUrl: config.logoUrl || null,
                stories,
                creatorId: this.getCreatorId(),
                templatePath: '/games/templates-v2/pet-avatar-template/index.html',
                mapColor: null,
                mapIndex: 0
            });
            if (!success) {
                console.warn('[PetAvatarEditorAdapter] Supabase sync failed, but game saved to localStorage');
            }
        } catch (error) {
            console.error('[PetAvatarEditorAdapter] Failed to sync to Supabase:', error);
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
        
        if (!logoPreview || !storyInput) return true;
        
        const storageKey = `${PET_AVATAR_STORAGE_PREFIX}${this.lastSavedGameId}`;
        const savedRaw = localStorage.getItem(storageKey);
        if (!savedRaw) return true;
        
        try {
            const saved = JSON.parse(savedRaw);
            const currentLogo = logoPreview.src || '';
            if (saved.logoUrl !== currentLogo) return true;
            if (saved.storyText !== (storyInput.value?.trim() || 'MEMEPLAY')) return true;
            
            return false;
        } catch (error) {
            return true;
        }
    }

    markDirty() {
        this.dirty = true;
    }

    generateGameId() {
        return generateGameIdUtil('pet-avatar');
    }

    getCreatorId() {
        const creatorKey = 'pet_avatar_creator_id';
        let creatorId = localStorage.getItem(creatorKey);
        if (!creatorId) {
            creatorId = 'creator_' + Math.random().toString(36).slice(2, 10);
            localStorage.setItem(creatorKey, creatorId);
        }
        return creatorId;
    }
}



