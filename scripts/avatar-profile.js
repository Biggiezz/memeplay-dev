// Avatar Profile Page Logic
// Load avatar from localStorage or contract and display profile info

import { renderAvatarWithAnimation } from '../avatar-system/src/avatar-renderer.js';
import { showLoading, hideLoading } from '../avatar-system/src/loading-utils.js';
import { initWalletDisplay } from '../avatar-system/src/wallet-display.js';
import { MintService } from '../avatar-system/src/mint-service.js';
import { CONTRACT_ADDRESS } from '../avatar-system/src/contract-address.js';

// Animation renderer
let animationRenderer = null;

// Image cache
const imageCache = new Map();

// Mint service
const mintService = new MintService();

// DOM elements
const loadingIndicator = document.getElementById('loadingIndicator');
const profileContent = document.getElementById('profileContent');
const noAvatarSection = document.getElementById('noAvatarSection');
const avatarPreview = document.getElementById('avatarPreview');
const tokenIdDisplay = document.getElementById('tokenIdDisplay');
const configHashDisplay = document.getElementById('configHashDisplay');
const transactionDisplay = document.getElementById('transactionDisplay');
const mintedAtDisplay = document.getElementById('mintedAtDisplay');


// Render avatar (pre-rendered image or animation) - using shared module
async function renderAvatar(config) {
  if (!avatarPreview) return;
  
  // Use shared render function
  animationRenderer = await renderAvatarWithAnimation({
    canvas: avatarPreview,
    config: config,
    imageCache: imageCache,
    animationRenderer: animationRenderer,
    onHashUpdate: null, // Profile page doesn't need hash display
    imageLoadTimeout: 0 // No timeout for profile page
  });
}

// Display profile info
function displayProfileInfo(tokenId, configHash, transactionHash, mintedAt) {
  if (tokenIdDisplay) {
    tokenIdDisplay.textContent = tokenId || 'N/A';
  }
  
  if (configHashDisplay) {
    configHashDisplay.textContent = configHash || 'N/A';
  }
  
  if (transactionDisplay) {
    if (transactionHash) {
      transactionDisplay.innerHTML = `<a href="https://sepolia.basescan.org/tx/${transactionHash}" target="_blank">View on BaseScan</a>`;
    } else {
      transactionDisplay.textContent = 'N/A';
    }
  }
  
  if (mintedAtDisplay) {
    if (mintedAt) {
      const date = new Date(mintedAt);
      mintedAtDisplay.textContent = date.toLocaleString();
    } else {
      mintedAtDisplay.textContent = 'N/A';
    }
  }
}

// Load avatar config from contract
async function loadConfigFromContract(tokenId) {
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
    console.error('Load config from contract error:', error);
    return null;
  }
}

// Load avatar from localStorage or contract
async function loadAvatar() {
  try {
    showLoading();
    
    // Get current wallet address first
    const currentAddress = await mintService.getAddress();
    const isConnected = await mintService.isConnected();
    
    if (!isConnected || !currentAddress) {
      // Not connected, show no avatar
      if (profileContent) profileContent.style.display = 'none';
      if (noAvatarSection) noAvatarSection.style.display = 'block';
      hideLoading();
      return;
    }
    
    // Step 1: Check localStorage first (fastest) - but verify wallet address matches
    const storedAddress = localStorage.getItem('mp_avatar_address');
    const minted = localStorage.getItem('mp_avatar_minted');
    const configStr = localStorage.getItem('mp_avatar_config');
    const tokenId = localStorage.getItem('mp_avatar_tokenId');
    const configHash = localStorage.getItem('mp_avatar_hash');
    const transactionHash = localStorage.getItem('mp_avatar_tx');
    // Note: mintedAt is not stored in localStorage, would need to query from Supabase or contract
    const mintedAt = null;
    
    // If wallet address changed, clear localStorage cache
    if (storedAddress && storedAddress.toLowerCase() !== currentAddress.toLowerCase()) {
      console.log('⚠️ Wallet address changed, clearing localStorage cache');
      localStorage.removeItem('mp_avatar_minted');
      localStorage.removeItem('mp_avatar_config');
      localStorage.removeItem('mp_avatar_tokenId');
      localStorage.removeItem('mp_avatar_hash');
      localStorage.removeItem('mp_avatar_tx');
      localStorage.removeItem('mp_avatar_address');
      localStorage.removeItem('mp_avatar_mintedAt');
    }
    
    // Check if cached data is for current wallet
    if (minted === 'true' && configStr && tokenId && storedAddress && storedAddress.toLowerCase() === currentAddress.toLowerCase()) {
      // Found in localStorage and wallet matches
      console.log('✅ Avatar found in localStorage for current wallet');
      const config = JSON.parse(configStr);
      
      // Render avatar
      await renderAvatar(config);
      
      // Display profile info
      displayProfileInfo(tokenId, configHash, transactionHash, mintedAt);
      
      // Show profile content
      if (profileContent) profileContent.style.display = 'flex';
      if (noAvatarSection) noAvatarSection.style.display = 'none';
      
      hideLoading();
      return;
    }
    
    // Step 2: Check contract (recovery flow)
    console.log('⚠️ Avatar not found in localStorage, checking contract...');
    
    const hasMinted = await mintService.hasMinted(currentAddress);
    
    if (!hasMinted) {
      // No avatar minted
      if (profileContent) profileContent.style.display = 'none';
      if (noAvatarSection) noAvatarSection.style.display = 'block';
      hideLoading();
      return;
    }
    
    // Get tokenId from contract
    const contractTokenId = await mintService.getMyTokenId();
    if (!contractTokenId) {
      // No tokenId found
      if (profileContent) profileContent.style.display = 'none';
      if (noAvatarSection) noAvatarSection.style.display = 'block';
      hideLoading();
      return;
    }
    
    // Load config from contract
    const config = await loadConfigFromContract(contractTokenId);
    if (!config) {
      console.error('Failed to load config from contract');
      if (profileContent) profileContent.style.display = 'none';
      if (noAvatarSection) noAvatarSection.style.display = 'block';
      hideLoading();
      return;
    }
    
    // Render avatar
    await renderAvatar(config);
    
    // Display profile info (limited info from contract)
    displayProfileInfo(contractTokenId, null, null, null);
    
    // Show profile content
    if (profileContent) profileContent.style.display = 'flex';
    if (noAvatarSection) noAvatarSection.style.display = 'none';
    
    // Save to localStorage for next time (with wallet address)
    localStorage.setItem('mp_avatar_minted', 'true');
    localStorage.setItem('mp_avatar_config', JSON.stringify(config));
    localStorage.setItem('mp_avatar_tokenId', contractTokenId);
    localStorage.setItem('mp_avatar_address', currentAddress.toLowerCase());
    
    hideLoading();
    
  } catch (error) {
    console.error('Load avatar error:', error);
    hideLoading();
    
    // Show no avatar on error
    if (profileContent) profileContent.style.display = 'none';
    if (noAvatarSection) noAvatarSection.style.display = 'block';
  }
}

// Initialize wallet display (using shared module)
function initWalletDisplayLocal() {
  initWalletDisplay({
    mintService: mintService,
    onAccountChange: async () => {
      // Reload avatar when account changes (unique to profile page)
      await loadAvatar();
    }
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('✅ Avatar Profile: DOMContentLoaded');
    
    // Initialize wallet display
    initWalletDisplayLocal();
    
    // Small delay to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Load avatar
    await loadAvatar();
    
    console.log('✅ Avatar Profile: Initialization complete');
  } catch (error) {
    console.error('❌ Avatar Profile: Initialization error:', error);
    hideLoading();
    
    // Show error state
    if (profileContent) profileContent.style.display = 'none';
    if (noAvatarSection) noAvatarSection.style.display = 'block';
  }
});
