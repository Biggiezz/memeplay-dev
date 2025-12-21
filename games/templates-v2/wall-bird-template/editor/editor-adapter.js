import { BaseAdapter } from '../../core/base-adapter.js';
import { cleanupOldGameKeys } from '../../core/storage-manager.js';
import { generateGameId as generateGameIdUtil } from '../../core/game-id-utils.js';
import { syncGameToSupabase } from '../../core/supabase-sync.js';

const WALL_BIRD_STORAGE_PREFIX = 'wall_bird_brand_config_';
const TEMPLATE_ID = 'wall-bird-template';

/**
 * Editor Adapter for Wall-Bird Template
 * Handles save/load with localStorage and Supabase sync
 */
export class WallBirdEditorAdapter extends BaseAdapter {
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
        const storyText = (storyInput?.value || '').trim() || 'memeplay';
        
        // Get selected background color (1 trong 3 màu: xanh lá nhạt, xanh blue, hồng nhạt)
        let backgroundColor = '#87ceeb'; // default Sky Blue
        if (mapColors) {
            const activeColorBtn = mapColors.querySelector('.chip-btn.active');
            if (activeColorBtn) {
                backgroundColor = activeColorBtn.dataset.color || backgroundColor;
            }
        }
        
        // Cleanup old game keys before save (truyền templateId, không phải storagePrefix)
        await cleanupOldGameKeys(TEMPLATE_ID, 1);
        
        // Build config object
        const config = {
            fragmentLogoUrl: logoUrl,
            story: storyText,
            backgroundColor: backgroundColor
        };
        
        // Save to localStorage với format đúng
        const storageKey = `${WALL_BIRD_STORAGE_PREFIX}${gameId}`;
        localStorage.setItem(storageKey, JSON.stringify(config));
        
        // ✅ Sync to Supabase (shared helper)
        try {
            const stories = config.story ? [config.story] : [];
            const success = await syncGameToSupabase({
                gameId,
                templateId: TEMPLATE_ID,
                title: config.story || 'Wall Bounce Bird Game',
                fragmentLogoUrl: config.fragmentLogoUrl || null,
                stories,
                creatorId: this.getCreatorId(),
                templatePath: '/games/templates-v2/wall-bird-template/index.html',
                mapColor: config.backgroundColor || '#87ceeb',
                mapIndex: 0
            });
            if (!success) {
                console.warn('[WallBirdEditorAdapter] Supabase sync failed, but game saved to localStorage');
            }
        } catch (error) {
            console.error('[WallBirdEditorAdapter] Failed to sync to Supabase:', error);
            // Don't fail the save if Supabase sync fails
        }
        
        this.lastSavedGameId = gameId;
        this.dirty = false;
        return { gameId };
    }

    isDirty() {
        return this.dirty;
    }

    markDirty() {
        this.dirty = true;
    }

    generateGameId() {
        return generateGameIdUtil('wall-bird');
    }

    getCreatorId() {
        const creatorKey = 'wall_bird_creator_id';
        let creatorId = localStorage.getItem(creatorKey);
        if (!creatorId) {
            creatorId = 'creator_' + Math.random().toString(36).slice(2, 10);
            localStorage.setItem(creatorKey, creatorId);
        }
        return creatorId;
    }
}

