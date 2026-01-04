// Profile Menu Avatar Preview - Shared module
// Used by index.html and telegram-mini-app.html

import { getAvatarFilePath, checkHasMintedFromLocalStorage } from './avatar-utils.js';
import { MintService } from './mint-service.js';

/**
 * Initialize profile menu avatar preview
 * Checks if user has minted avatar and displays it, or shows plus icon
 * Checks localStorage first, then contract if needed
 */
export async function initProfileMenuAvatar() {
  const profilePreview = document.getElementById('profileAvatarPreview');
  if (!profilePreview) return;
  
  try {
    // Step 1: Check localStorage first (fastest)
    const configStr = localStorage.getItem('mp_avatar_config');
    const minted = localStorage.getItem('mp_avatar_minted');
    const storedAddress = localStorage.getItem('mp_avatar_address');
    
    // Check if wallet address matches
    let currentAddress = null;
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts && accounts.length > 0) {
          currentAddress = accounts[0].toLowerCase();
        }
      } catch (e) {
        // Ignore error
      }
    }
    
    const addressMatches = !storedAddress || !currentAddress || storedAddress.toLowerCase() === currentAddress;
    
    // If localStorage has valid data, use it immediately
    if (minted === 'true' && configStr && addressMatches) {
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
        console.log('[Profile Menu] Avatar loaded from localStorage');
        return; // Success - exit early
      } catch (e) {
        console.error('[Profile Menu] Error parsing config from localStorage:', e);
        // Fall through to check contract
      }
    }
    
    // Step 2: If localStorage doesn't have valid data, check contract (if wallet connected)
    if (currentAddress) {
      try {
        const mintService = new MintService();
        const isConnected = await mintService.isConnected();
        
        if (isConnected) {
          const hasMinted = await mintService.hasMinted(currentAddress);
          
          if (hasMinted) {
            // User has minted - get config from contract
            const tokenId = await mintService.getMyTokenId();
            if (tokenId !== null) {
              const config = await loadConfigFromContract(mintService, tokenId);
              
              if (config) {
                // Save to localStorage for next time
                localStorage.setItem('mp_avatar_minted', 'true');
                localStorage.setItem('mp_avatar_config', JSON.stringify(config));
                localStorage.setItem('mp_avatar_address', currentAddress);
                localStorage.setItem('mp_avatar_tokenId', tokenId.toString());
                
                // Display avatar
                const avatarPath = getAvatarFilePath(config);
                const img = document.createElement('img');
                img.src = avatarPath;
                img.alt = 'Avatar';
                img.onerror = () => {
                  showPlusIcon(profilePreview);
                };
                profilePreview.innerHTML = '';
                profilePreview.appendChild(img);
                console.log('[Profile Menu] Avatar loaded from contract');
                return; // Success - exit early
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Profile Menu] Error checking contract:', e);
        // Fall through to show plus icon
      }
    }
    
    // Step 3: No avatar found - show plus icon
    showPlusIcon(profilePreview);
  } catch (e) {
    console.error('[Profile Menu] Error:', e);
    showPlusIcon(profilePreview);
  }
}

/**
 * Load avatar config from contract
 * @param {MintService} mintService - MintService instance
 * @param {number} tokenId - Token ID
 * @returns {Promise<Object|null>} Config object or null
 */
async function loadConfigFromContract(mintService, tokenId) {
  try {
    if (!mintService.contract) {
      await mintService.loadEthers();
      if (!window.ethereum) {
        return null;
      }
      mintService.provider = new window.ethers.providers.Web3Provider(window.ethereum);
      mintService.contract = new window.ethers.Contract(
        mintService.contractAddress,
        mintService.contractABI,
        mintService.provider
      );
    }
    
    // Call getConfig(uint256 tokenId)
    const config = await mintService.contract.getConfig(tokenId);
    
    // Map actor number to string: 0=boy, 1=fish, 2=supergirl
    const actorMap = { 0: 'boy', 1: 'fish', 2: 'supergirl' };
    
    return {
      actor: actorMap[config.actor] || 'boy',
      skin: config.skin || 1,
      clothes: config.clothes || 0,
      equipment: config.equipment || 0,
      hat: config.hat || 0
    };
  } catch (error) {
    console.error('[Profile Menu] Load config from contract error:', error);
    return null;
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
  
  // Also update when memeplayWallet connects (for Base App auto-connect)
  // Check periodically if wallet just connected
  let lastAddress = null;
  setInterval(async () => {
    try {
      let currentAddress = null;
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            currentAddress = accounts[0].toLowerCase();
          }
        } catch (e) {
          // Ignore
        }
      }
      
      // If address changed (from null to address, or different address), update avatar
      if (currentAddress !== lastAddress) {
        lastAddress = currentAddress;
        if (currentAddress) {
          // Wallet just connected - update avatar
          setTimeout(initProfileMenuAvatar, 300);
        } else {
          // Wallet disconnected - show plus icon
          const profilePreview = document.getElementById('profileAvatarPreview');
          if (profilePreview) {
            showPlusIcon(profilePreview);
          }
        }
      }
    } catch (e) {
      // Ignore errors
    }
  }, 2000); // Check every 2 seconds
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

/**
 * Handle profile menu item navigation based on mint status
 * Navigates to profile page if user has minted, otherwise to creator
 */
export async function handleProfileMenuNavigation() {
  const hasMinted = await checkHasMintedFromLocalStorage();
  
  if (hasMinted) {
    // User has minted - go to profile page
    window.location.href = '/avatar-profile.html';
  } else {
    // User hasn't minted - go directly to creator (skip intermediate page)
    window.location.href = '/avatar-creator';
  }
}

