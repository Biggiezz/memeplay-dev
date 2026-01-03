// Avatar Profile Page Logic
// Load avatar from localStorage or contract and display profile info

import { AnimationRenderer } from '../avatar-system/src/animation-renderer.js';
import { ANIMATION_CONFIG } from '../avatar-system/src/animation-config.js';
import { MintService } from '../avatar-system/src/mint-service.js';
import { CONTRACT_ADDRESS } from '../avatar-system/src/contract-address.js';

// Avatar Config
const AVATAR_CONFIG = {
  actors: {
    boy: { skin: 1, letter: 'a' },
    fish: { skin: 2, letter: 'b' },
    supergirl: { skin: 3, letter: 'c' }
  }
};

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

// Show/hide loading
function showLoading() {
  if (loadingIndicator) loadingIndicator.classList.add('active');
}

function hideLoading() {
  if (loadingIndicator) loadingIndicator.classList.remove('active');
}

// Get avatar file path
function getAvatarFilePath(config) {
  const actorData = AVATAR_CONFIG.actors[config.actor];
  const skinLetter = actorData.letter;
  const clothes = config.clothes || 0;
  const equipment = config.equipment || 0;
  const hat = config.hat || 0;
  
  return `avatar-system/assets/avatars/${skinLetter}${clothes}${equipment}${hat}.png`;
}

// Render avatar (pre-rendered image or animation)
async function renderAvatar(config) {
  if (!avatarPreview) return;
  
  showLoading();
  
  const canvas = avatarPreview;
  const filePath = getAvatarFilePath(config);
  
  // Get animation path
  const animationPath = ANIMATION_CONFIG.getAnimationPath(
    config.actor,
    config.clothes,
    config.equipment,
    config.hat
  );
  
  // Step 1: Start animation immediately (as loading indicator)
  let animationStarted = false;
  let animationStartTime = null; // Track when animation started
  try {
    // Stop old animation if playing
    if (animationRenderer && animationRenderer.isPlaying) {
      animationRenderer.stop();
    }
    
    // Create new animation renderer
    animationRenderer = new AnimationRenderer(canvas);
    const initialized = await animationRenderer.init(animationPath);
    
    if (initialized) {
      // Start animation
      if (!animationRenderer.isPlaying) {
        animationRenderer.start();
        animationStartTime = performance.now(); // Record start time
      }
      animationStarted = true;
      console.log(`🎬 Animation started: ${animationPath}`);
    } else {
      console.log(`⚠️ Animation not found: ${animationPath}`);
    }
  } catch (error) {
    console.log(`⚠️ Animation load error: ${error.message}`);
  }
  
  // Step 2: Check cache first
  if (imageCache.has(filePath)) {
    const cachedImg = imageCache.get(filePath);
    hideLoading();
    
    // Stop animation if playing
    if (animationRenderer && animationRenderer.isPlaying) {
      animationRenderer.stop();
      console.log('✅ Pre-rendered image from cache, animation stopped');
    }
    
    // Draw cached image
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cachedImg, 0, 0, canvas.width, canvas.height);
    return;
  }
  
  // Step 3: Load new image (parallel with animation)
  const img = new Image();
  
  img.onerror = () => {
    // Pre-rendered image not found, keep animation running
    console.log(`⚠️ Pre-rendered image not found: ${filePath}, keeping animation...`);
    hideLoading();
    
    // Animation continues running (already started above)
  };
  
  img.onload = () => {
    // Cache the image
    imageCache.set(filePath, img);
    hideLoading();
    
    // Stop animation if playing (pre-rendered image loaded successfully)
    // BUT: Ensure animation runs at least 1 full cycle (0.8s for 4 frames)
    if (animationRenderer && animationRenderer.isPlaying) {
      const minAnimationDuration = 800; // 0.8s = 4 frames × 200ms
      const animationElapsed = animationStartTime ? performance.now() - animationStartTime : 0;
      const remainingTime = Math.max(0, minAnimationDuration - animationElapsed);
      
      if (remainingTime > 0) {
        // Wait for animation to complete at least 1 cycle
        console.log(`⏳ Pre-rendered image loaded, waiting ${remainingTime.toFixed(0)}ms for animation cycle to complete...`);
        setTimeout(() => {
          if (animationRenderer && animationRenderer.isPlaying) {
            animationRenderer.stop();
            console.log('✅ Animation cycle completed, stopped');
          }
          
          // Draw static image after animation stops
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }, remainingTime);
      } else {
        // Animation already ran for at least 1 cycle, stop immediately
        animationRenderer.stop();
        console.log('✅ Pre-rendered image loaded, animation stopped');
        
        // Draw static image
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }
    } else {
      // No animation playing, just draw the image
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    }
  };
  
  img.src = filePath;
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

// Initialize wallet display
function initWalletDisplay() {
  const walletStatus = document.getElementById('walletStatus');
  const walletAddress = document.getElementById('walletAddress');
  const walletCopyBtn = document.getElementById('walletCopyBtn');
  const walletConnectBtn = document.getElementById('walletConnectBtn');

  // Function to update wallet display
  async function updateWalletDisplay() {
    try {
      const address = await mintService.getAddress();
      const isConnected = await mintService.isConnected();

      if (isConnected && address) {
        // Show connected state
        if (walletStatus) walletStatus.style.display = 'inline-flex';
        if (walletConnectBtn) walletConnectBtn.style.display = 'none';
        if (walletStatus) walletStatus.classList.add('connected');
        if (walletAddress) walletAddress.textContent = `${address.slice(0, 6)}...${address.slice(-4)}`;
      } else {
        // Show connect button
        if (walletStatus) walletStatus.style.display = 'none';
        if (walletConnectBtn) walletConnectBtn.style.display = 'inline-block';
        if (walletStatus) walletStatus.classList.remove('connected');
      }
    } catch (error) {
      console.error('Update wallet display error:', error);
      if (walletStatus) walletStatus.style.display = 'none';
      if (walletConnectBtn) walletConnectBtn.style.display = 'inline-block';
    }
  }

  // Copy address button
  walletCopyBtn?.addEventListener('click', async () => {
    try {
      const address = await mintService.getAddress();
      if (address) {
        await navigator.clipboard.writeText(address);
        walletCopyBtn.textContent = '✓';
        setTimeout(() => {
          walletCopyBtn.textContent = '📋';
        }, 1500);
      }
    } catch (error) {
      console.error('Copy address error:', error);
    }
  });

  // Connect wallet button
  walletConnectBtn?.addEventListener('click', async () => {
    try {
      walletConnectBtn.disabled = true;
      walletConnectBtn.textContent = 'Connecting...';
      await mintService.connectWallet();
      await updateWalletDisplay();
      await loadAvatar(); // Reload avatar after connecting
      walletConnectBtn.textContent = 'Connect Wallet';
    } catch (error) {
      console.error('Connect wallet error:', error);
      walletConnectBtn.textContent = 'Connect Wallet';
      alert(mintService.getErrorMessage(error));
    } finally {
      walletConnectBtn.disabled = false;
    }
  });

  // Listen for account changes
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', async () => {
      await updateWalletDisplay();
      await loadAvatar(); // Reload avatar on account change
    });
  }

  // Initial update
  updateWalletDisplay();

  // Update periodically (every 5 seconds)
  setInterval(updateWalletDisplay, 5000);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('✅ Avatar Profile: DOMContentLoaded');
    
    // Initialize wallet display
    initWalletDisplay();
    
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
