import { PRODUCTION_BASE_URL } from './constants.js';

/**
 * Build public link URL for V2 templates.
 * ✅ UPDATED: Use /play.html?game=xxx format to match Homepage V3 share links
 * This ensures consistent routing across the platform (V3 homepage and V2 templates use same URL format)
 * Example: playmode-pacman-999a -> https://memeplay.dev/play.html?game=playmode-pacman-999a
 * 
 * Note: /play.html supports both V1 and V2 templates (play.js has TEMPLATE_REGISTRY)
 */
export function buildPublicLinkUrl(gameId, options = {}) {
  const { forceProduction = false } = options;

  if (!gameId || typeof gameId !== 'string' || !gameId.startsWith('playmode-')) {
    throw new Error('Invalid V2 gameId format');
  }

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin.replace(/\/$/, '')
      : '';

  const originLower = origin.toLowerCase();
  const isLocal =
    originLower.includes('localhost') ||
    originLower.includes('127.0.0.1') ||
    originLower.includes('192.168.') ||
    originLower.includes('0.0.0.0');

  const baseUrl = forceProduction ? PRODUCTION_BASE_URL : origin || PRODUCTION_BASE_URL;

  // ✅ Use /play.html format to match Homepage V3 share links
  // This ensures consistency: V3 homepage and V2 templates both use /play.html
  // /play.html supports both V1 and V2 templates (play.js has TEMPLATE_REGISTRY)
  return `${baseUrl}/play.html?game=${encodeURIComponent(gameId)}`;
}





