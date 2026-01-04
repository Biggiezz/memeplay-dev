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
 */
function setupProfilePreviewClick() {
  const profilePreview = document.getElementById('profileAvatarPreview');
  if (!profilePreview) {
    console.warn('[Profile Menu] profileAvatarPreview element not found');
    return;
  }
  
  // Check if handler already attached
  if (profilePreview.__previewClickHandlerAttached) {
    console.log('[Profile Menu] Profile preview click handler already attached');
    return;
  }
  
  // Mark as attached
  profilePreview.__previewClickHandlerAttached = true;
  
  // Add cursor pointer style
  profilePreview.style.cursor = 'pointer';
  profilePreview.style.pointerEvents = 'auto';
  
  // Add click handler with capture phase (runs first, before bubble phase)
  profilePreview.addEventListener('click', function handlePreviewClick(e) {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    console.log('[Profile Menu] Profile preview clicked, navigating to /avatar-creator');
    
    // Navigate immediately
    window.location.href = '/avatar-creator';
    return false;
  }, true); // Capture phase - runs before bubble phase handlers
  
  console.log('[Profile Menu] Profile preview click handler setup complete');
}

