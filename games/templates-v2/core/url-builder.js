import { PRODUCTION_BASE_URL } from './constants.js';

/**
 * Build public link URL for V2 templates.
 * ✅ FIXED: Use long URL format (/play-v2.html?game=xxx) instead of short URL (/playmode-xxx)
 * This avoids Cloudflare redirect issues and works reliably on both local and production.
 * Example: playmode-pacman-999a -> https://memeplay.dev/play-v2.html?game=playmode-pacman-999a
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

  // ✅ Use long URL format to avoid Cloudflare redirect issues
  // Long URL: /play-v2.html?game=playmode-xxx (works reliably)
  // Short URL: /playmode-xxx (gets redirected by Cloudflare → /play-v2, loses game ID)
  return `${baseUrl}/play-v2.html?game=${encodeURIComponent(gameId)}`;
}





