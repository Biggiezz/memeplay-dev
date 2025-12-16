import { PRODUCTION_BASE_URL } from './constants.js';

/**
 * Build public link URL for V2 templates.
 * Example: playmode-pacman-999a -> https://127.0.0.1:5500/playmode-pacman-999a
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

  return `${baseUrl}/${gameId}`;
}





