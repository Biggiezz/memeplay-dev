// Profile Menu Avatar Preview - Shared module
// Used by index.html and telegram-mini-app.html

import { getAvatarFilePath } from './avatar-utils.js';

/**
 * Initialize profile menu avatar preview
 * Checks if user has minted avatar and displays it, or shows plus icon
 */
export async function initProfileMenuAvatar() {
  const profilePreview = document.getElementById('profileAvatarPreview');
  if (!profilePreview) return;
  
  try {
    // Check if user has minted
    const minted = localStorage.getItem('mp_avatar_minted');
    const configStr = localStorage.getItem('mp_avatar_config');
    const storedAddress = localStorage.getItem('mp_avatar_address');
    
    // Check if wallet address matches (prevent showing wrong avatar)
    let currentAddress = null;
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          currentAddress = accounts[0].toLowerCase();
        }
      } catch (e) {
        console.warn('[Profile Menu] Could not get wallet address:', e);
      }
    }
    
    const addressMatches = !storedAddress || !currentAddress || storedAddress.toLowerCase() === currentAddress;
    
    if (minted === 'true' && configStr && addressMatches) {
      // User has minted - show avatar
      try {
        const config = JSON.parse(configStr);
        const avatarPath = getAvatarFilePath(config);
        
        const img = document.createElement('img');
        img.src = avatarPath;
        img.alt = 'Avatar';
        img.onerror = () => {
          // Fallback to plus icon if image not found
          showPlusIcon(profilePreview);
        };
        profilePreview.innerHTML = '';
        profilePreview.appendChild(img);
      } catch (e) {
        console.error('[Profile Menu] Error loading avatar:', e);
        showPlusIcon(profilePreview);
      }
    } else {
      // User hasn't minted - show plus icon
      showPlusIcon(profilePreview);
    }
  } catch (e) {
    console.error('[Profile Menu] Error:', e);
    showPlusIcon(profilePreview);
  }
}

/**
 * Show plus icon in profile preview container
 */
export function showPlusIcon(container) {
  container.innerHTML = `
    <svg class="plus-icon" viewBox="0 0 24 24">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
  `;
}

/**
 * Setup profile menu avatar with auto-update on wallet changes
 */
export function setupProfileMenuAvatar() {
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initProfileMenuAvatar();
      setupProfilePreviewClick();
    });
  } else {
    initProfileMenuAvatar();
    setupProfilePreviewClick();
  }
  
  // Update when wallet changes
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', () => {
      setTimeout(initProfileMenuAvatar, 500);
    });
  }
}

/**
 * Setup click handler for profile preview to navigate to avatar creator
 * Note: onclick attribute is already set in HTML for immediate execution
 * This function only ensures cursor style is set
 */
function setupProfilePreviewClick() {
  const profilePreview = document.getElementById('profileAvatarPreview');
  if (!profilePreview) {
    console.warn('[Profile Menu] profileAvatarPreview element not found');
    return;
  }
  
  // Add cursor pointer style (onclick is already in HTML)
  profilePreview.style.cursor = 'pointer';
  profilePreview.style.pointerEvents = 'auto';
  
  // Also ensure child elements (img, svg) can trigger navigation
  // The onclick on parent should handle this, but add explicit handler for children
  profilePreview.addEventListener('click', function handlePreviewClick(e) {
    // Only handle if click is on child element (img or svg)
    if (e.target !== profilePreview && (e.target.tagName === 'IMG' || e.target.tagName === 'SVG' || e.target.closest('svg'))) {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      console.log('[Profile Menu] Profile preview child clicked, navigating to /avatar-creator');
      window.location.href = '/avatar-creator';
      return false;
    }
  }, true); // Capture phase
  
  console.log('[Profile Menu] Profile preview click handler setup complete');
}

