import { BaseAdapter } from '../../core/base-adapter.js';
import { getSupabaseClient } from '../../core/supabase-client.js';
import { buildPublicLinkUrl } from '../../core/url-builder.js';
import { PRODUCTION_BASE_URL } from '../../core/constants.js';
import { cleanupOldGameKeys } from '../../core/storage-manager.js';
import { generateGameId as generateGameIdUtil } from '../../core/game-id-utils.js';

const ARROW_STORAGE_PREFIX = 'arrow_brand_config_';
const TEMPLATE_ID = 'arrow-template';

/**
 * Editor Adapter for Arrow Template
 * Handles save/load with localStorage and Supabase sync
 */
export class ArrowEditorAdapter extends BaseAdapter {
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
        let mapColor = '#87CEEB'; // default Sky Blue
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
            const storageKey = `${ARROW_STORAGE_PREFIX}${gameId}`;
            localStorage.setItem(storageKey, JSON.stringify(config));
        } catch (error) {
            if (error.name === 'QuotaExceededError') {
                cleanupOldGameKeys(TEMPLATE_ID, 0);
                try {
                    const storageKey = `${ARROW_STORAGE_PREFIX}${gameId}`;
                    localStorage.setItem(storageKey, JSON.stringify(config));
                } catch (retryError) {
                    // Silent fail
                }
            }
        }
        
        // Sync to Supabase
        try {
            await this.syncToSupabase(gameId, config);
        } catch (error) {
            // Silent fail - game still saved to localStorage
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
        
        const storageKey = `${ARROW_STORAGE_PREFIX}${this.lastSavedGameId}`;
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
                const currentMapColor = activeColorBtn?.dataset.color || '#87CEEB';
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
        return generateGameIdUtil('arrow');
    }

    async syncToSupabase(gameId, config) {
        try {
            const supabase = await getSupabaseClient();
            if (!supabase) return false;

            const origin = window.location.origin.toLowerCase();
            const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('0.0.0.0');
            const baseUrl = isLocal ? PRODUCTION_BASE_URL : window.location.origin.replace(/\/$/, '');
            const templateUrl = `${baseUrl}/games/templates-v2/arrow-template/index.html?game=${gameId}`;
            const publicUrl = buildPublicLinkUrl(gameId, { forceProduction: true });
            
            const creatorKey = 'arrow_creator_id';
            let creatorId = localStorage.getItem(creatorKey);
            if (!creatorId) {
                creatorId = 'creator_' + Math.random().toString(36).slice(2, 10);
                localStorage.setItem(creatorKey, creatorId);
            }

            const payload = {
                p_game_id: gameId,
                p_template_id: TEMPLATE_ID,
                p_title: config.storyText || 'Arrow Game',
                p_map_color: config.mapColor || '#87CEEB',
                p_map_index: 0,
                p_fragment_logo_url: config.logoUrl || null,
                p_story_one: config.storyText || '',
                p_story_two: '',
                p_story_three: '',
                p_public_url: publicUrl,
                p_template_url: templateUrl,
                p_creator_id: creatorId,
                p_context: 'template-v2-editor'
            };

            const { error } = await supabase.rpc('upsert_user_created_game', payload);
            return !error;
        } catch (err) {
            return false;
        }
    }
}

