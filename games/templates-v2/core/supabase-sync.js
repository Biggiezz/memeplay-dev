import { getSupabaseClient } from './supabase-client.js';
import { PRODUCTION_BASE_URL } from './constants.js';
import { buildPublicLinkUrl } from './url-builder.js';

/**
 * Build legacy payload (compatible with current RPC: upsert_user_created_game)
 * @param {object} params
 * @param {string} params.gameId
 * @param {string} params.templateId
 * @param {string} params.title
 * @param {string} params.fragmentLogoUrl
 * @param {string} params.storyOne
 * @param {string} [params.storyTwo]
 * @param {string} [params.storyThree]
 * @param {string} params.templateUrl
 * @param {string} params.creatorId
 * @param {string} [params.mapColor]
 * @param {number} [params.mapIndex]
 * @returns payload object
 */
export function buildLegacyPayload({
  gameId,
  templateId,
  title,
  fragmentLogoUrl,
  storyOne,
  storyTwo = '',
  storyThree = '',
  templateUrl,
  creatorId,
  mapColor = '#1A0A2E',
  mapIndex = 0,
  publicUrl
}) {
  return {
    p_game_id: gameId,
    p_template_id: templateId,
    p_title: title,
    p_map_color: mapColor,
    p_map_index: mapIndex,
    p_fragment_logo_url: fragmentLogoUrl || null,
    p_story_one: storyOne || '',
    p_story_two: storyTwo || '',
    p_story_three: storyThree || '',
    p_public_url: publicUrl,
    p_template_url: templateUrl,
    p_creator_id: creatorId,
    p_context: 'template-v2-editor'
  };
}

/**
 * Sync game to Supabase using legacy RPC payload
 * @param {object} params
 * @param {string} params.gameId
 * @param {string} params.templateId
 * @param {string} params.title
 * @param {string} params.fragmentLogoUrl
 * @param {string[]} params.stories
 * @param {string} params.creatorId
 * @param {string} params.templatePath (e.g., '/games/templates-v2/pacman-template/index.html')
 * @param {string} [params.mapColor]
 * @param {number} [params.mapIndex]
 * @returns {Promise<boolean>} success
 */
export async function syncGameToSupabase({
  gameId,
  templateId,
  title,
  fragmentLogoUrl,
  stories = [],
  creatorId,
  templatePath,
  mapColor = '#1A0A2E',
  mapIndex = 0
}) {
  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      console.warn('[SupabaseSync] Supabase client unavailable, skip sync');
      return false;
    }

    const origin = window.location.origin.toLowerCase();
    const isLocal = origin.includes('localhost') || origin.includes('127.0.0.1') || origin.includes('192.168.') || origin.includes('0.0.0.0');
    const baseUrl = isLocal ? PRODUCTION_BASE_URL : window.location.origin.replace(/\/$/, '');
    const templateUrl = `${baseUrl}${templatePath}?game=${gameId}`;
    const publicUrl = buildPublicLinkUrl(gameId, { forceProduction: true });

    const payload = buildLegacyPayload({
      gameId,
      templateId,
      title,
      fragmentLogoUrl,
      storyOne: stories[0] || '',
      storyTwo: stories[1] || '',
      storyThree: stories[2] || '',
      templateUrl,
      creatorId,
      mapColor,
      mapIndex,
      publicUrl
    });

    const { error } = await supabase.rpc('upsert_user_created_game', payload);
    if (error) {
      console.error('[SupabaseSync] Supabase sync error:', error.message || error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[SupabaseSync] Unexpected sync error:', err);
    return false;
  }
}

