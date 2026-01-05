// Avatar Creator Script
// Import shared modules
import { AVATAR_CONFIG, getAvatarFilePath, generateHash } from '../avatar-system/src/avatar-utils.js';
import { showLoading, hideLoading } from '../avatar-system/src/loading-utils.js';
import { renderAvatarWithAnimation } from '../avatar-system/src/avatar-renderer.js';
import { initWalletDisplay } from '../avatar-system/src/wallet-display.js';
import { MintService } from '../avatar-system/src/mint-service.js';
import { CONTRACT_ADDRESS } from '../avatar-system/src/contract-address.js';
import { trackMint } from '../avatar-system/src/tracking.js';

// Current config
let currentConfig = {
  actor: 'boy',
  skin: 1,
  clothes: 0,
  equipment: 0,
  hat: 0
};

// Animation renderer
let animationRenderer = null;

// Image cache
const imageCache = new Map();

// Mint service
const mintService = new MintService();

// Loading indicator (for passing to shared functions)
const loadingIndicator = document.getElementById('loadingIndicator');

// Update preview with animation
async function updatePreview() {
  const canvas = document.getElementById('avatarPreview');
  const hashDisplay = document.getElementById('hashDisplay');
  
  // Use shared render function
  animationRenderer = await renderAvatarWithAnimation({
    canvas: canvas,
    config: currentConfig,
    imageCache: imageCache,
    animationRenderer: animationRenderer,
    onHashUpdate: (config) => {
      // Update hash display (unique to creator page)
      const hash = generateHash(config);
      if (hashDisplay) hashDisplay.textContent = hash;
    },
    imageLoadTimeout: 10000 // 10 seconds timeout (unique to creator page)
  });
}

// Initialize selectors
function initSelectors() {
  // Actor buttons
  document.querySelectorAll('[data-actor]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-actor]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const actor = btn.dataset.actor;
      currentConfig.actor = actor;
      currentConfig.skin = AVATAR_CONFIG.actors[actor].skin;
      updatePreview();
    });
  });

  // Clothes buttons
  document.querySelectorAll('[data-clothes]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-clothes]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentConfig.clothes = parseInt(btn.dataset.clothes);
      updatePreview();
    });
  });

  // Equipment buttons
  document.querySelectorAll('[data-equipment]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-equipment]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentConfig.equipment = parseInt(btn.dataset.equipment);
      updatePreview();
    });
  });

  // Hat buttons
  document.querySelectorAll('[data-hat]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-hat]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentConfig.hat = parseInt(btn.dataset.hat);
      updatePreview();
    });
  });
}

// Mint Avatar handler
function initMintButton() {
  const mintBtn = document.getElementById('mintBtn');
  const mintMessage = document.getElementById('mintMessage');
  
  mintBtn.addEventListener('click', async () => {
    console.log('Mint Avatar clicked!', currentConfig);
    
    // Reset message
    mintMessage.className = 'mint-message';
    mintMessage.textContent = '';
    mintBtn.disabled = true;
    
    try {
      // Step 1: Preparing
      mintBtn.textContent = 'Preparing...';
      mintMessage.textContent = 'Preparing...';
      mintMessage.className = 'mint-message';
      
      // Generate config hash
      const configHash = generateHash(currentConfig);
      console.log('Config hash:', configHash);
      
      // Step 2: Check wallet connection
      mintBtn.textContent = 'Waiting for wallet...';
      mintMessage.textContent = 'Waiting for wallet...';
      
      const isConnected = await mintService.isConnected();
      if (!isConnected) {
        await mintService.connectWallet();
      }
      
      // Step 3: Check if already minted
      const address = await mintService.getAddress();
      const alreadyMinted = await mintService.hasMinted(address);
      if (alreadyMinted) {
        throw new Error('ALREADY_MINTED');
      }
      
      // Step 4: Minting
      mintBtn.textContent = 'Minting...';
      mintMessage.textContent = 'Minting...';
      
      const result = await mintService.mintAvatar(configHash, currentConfig);
      
      // Step 5: Confirming
      mintBtn.textContent = 'Confirming...';
      mintMessage.textContent = 'Confirming transaction...';
      
      // Wait a bit for confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Success
      mintBtn.textContent = 'Mint Avatar';
      mintMessage.className = 'mint-message success';
      
      // Get contract address
      const contractAddress = CONTRACT_ADDRESS;
      const tokenId = result.tokenId || '0';
      
      mintMessage.innerHTML = `
        ✅ Mint successful!<br>
        <div style="margin-top: 10px; font-size: 0.9em;">
          <strong>Token ID:</strong> ${tokenId}<br>
          <a href="https://sepolia.basescan.org/tx/${result.transactionHash}" 
             target="_blank" 
             style="color: #4ade80; text-decoration: underline; margin-top: 5px; display: inline-block;">
            View Transaction
          </a><br>
          <div style="margin-top: 10px; padding: 8px; background: rgba(255,182,66,0.1); border-radius: 4px; font-size: 0.85em;">
            <strong>💡 Import NFT to MetaMask:</strong><br>
            1. Open MetaMask → "NFTs" tab<br>
            2. Click "Import NFT"<br>
            3. Contract: <code style="font-size: 0.9em;">${contractAddress}</code><br>
            4. Token ID: <code style="font-size: 0.9em;">${tokenId}</code>
          </div>
        </div>
      `;
      
      console.log('Mint successful!', result);
      
      // Save to localStorage (with wallet address for cache validation)
      const mintAddress = result.address || address; // Use result.address (preferred) or fallback to address from Step 3
      localStorage.setItem('mp_avatar_minted', 'true');
      localStorage.setItem('mp_avatar_config', JSON.stringify(currentConfig));
      localStorage.setItem('mp_avatar_hash', configHash);
      localStorage.setItem('mp_avatar_tx', result.transactionHash);
      localStorage.setItem('mp_avatar_tokenId', tokenId);
      localStorage.setItem('mp_avatar_address', mintAddress.toLowerCase());
      
      // Track mint to Supabase (non-blocking)
      trackMint({
        tokenId: tokenId,
        userAddress: mintAddress,
        configHash: configHash,
        config: currentConfig,
        transactionHash: result.transactionHash
      }).catch(error => {
        console.warn('[Tracking] Failed to track mint (non-critical):', error);
      });
      
      // Auto-hide message after 10 seconds
      setTimeout(() => {
        mintMessage.className = 'mint-message';
        mintMessage.textContent = '';
      }, 10000);
      
    } catch (error) {
      // Error handling
      mintBtn.textContent = 'Mint Avatar';
      mintBtn.disabled = false;
      mintMessage.className = 'mint-message error';
      
      const errorMsg = mintService.getErrorMessage(error);
      mintMessage.textContent = errorMsg;
      
      console.error('Mint error:', error);
      
      // Auto-hide message after 5 seconds
      setTimeout(() => {
        mintMessage.className = 'mint-message';
        mintMessage.textContent = '';
      }, 5000);
    } finally {
      // Ensure button is enabled (in case of unexpected errors)
      mintBtn.disabled = false;
      if (mintBtn.textContent !== 'Mint Avatar' && !mintBtn.textContent.includes('...')) {
        mintBtn.textContent = 'Mint Avatar';
      }
    }
  });
}

// Add hash display click handler for debugging
function initHashDisplayDebug() {
  const hashDisplay = document.getElementById('hashDisplay');
  if (hashDisplay) {
    hashDisplay.style.cursor = 'pointer';
    hashDisplay.title = 'Click to see config details in console';
    hashDisplay.addEventListener('click', () => {
      const configString = `${currentConfig.actor}-${currentConfig.skin}-${currentConfig.clothes}-${currentConfig.equipment}-${currentConfig.hat}`;
      const hash = generateHash(currentConfig);
      console.log('📋 Hash Debug Info:');
      console.log('  Config:', currentConfig);
      console.log('  Config String:', configString);
      console.log('  Hash:', hash);
      console.log('  File Path:', getAvatarFilePath(currentConfig));
      alert(`Config: ${configString}\nHash: ${hash}\n\nCheck console (F12) for more details.`);
    });
  }
}

// Initialize wallet display (using shared module)
function initWalletDisplayLocal() {
  initWalletDisplay({
    mintService: mintService,
    onAccountChange: async () => {
      // Reload mint status when account changes (unique to creator page)
      await checkExistingMint();
    }
  });
}

// Check if user already has minted and show tokenId
async function checkExistingMint() {
  try {
    const isConnected = await mintService.isConnected();
    if (!isConnected) {
      return;
    }

    const address = await mintService.getAddress();
    const hasMinted = await mintService.hasMinted(address);
    
    if (hasMinted) {
      const tokenId = await mintService.getMyTokenId();
      const mintMessage = document.getElementById('mintMessage');
      const mintBtn = document.getElementById('mintBtn');
      
      if (mintMessage && mintBtn) {
        mintBtn.disabled = true;
        mintBtn.textContent = 'Already Minted';
        mintMessage.className = 'mint-message success';
        mintMessage.innerHTML = `
          ✅ You already have an avatar!<br>
          <div style="margin-top: 10px; font-size: 0.9em;">
            <strong>Token ID:</strong> ${tokenId || 'N/A'}<br>
            <div style="margin-top: 10px; padding: 8px; background: rgba(255,182,66,0.1); border-radius: 4px; font-size: 0.85em;">
              <strong>💡 Import NFT to MetaMask:</strong><br>
              1. Open MetaMask → "NFTs" tab<br>
              2. Click "Import NFT"<br>
              3. Contract: <code style="font-size: 0.9em;">${CONTRACT_ADDRESS}</code><br>
              4. Token ID: <code style="font-size: 0.9em;">${tokenId || '0'}</code>
            </div>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Check existing mint error:', error);
  }
}

// Initialize on load with error handling
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('✅ Avatar Creator: DOMContentLoaded');
    initSelectors();
    initMintButton();
    initHashDisplayDebug(); // Add hash debug handler
    initWalletDisplayLocal(); // Initialize wallet display
    
    // Small delay to ensure DOM is fully ready (especially on mobile)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await updatePreview();
    
    // Check if user already minted
    await checkExistingMint();
    
    console.log('✅ Avatar Creator: Initialization complete');
  } catch (error) {
    console.error('❌ Avatar Creator: Initialization error:', error);
    // Show error to user
    const canvas = document.getElementById('avatarPreview');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffb642';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Failed to load', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#666';
      ctx.font = '11px Arial';
      ctx.fillText(error.message, canvas.width / 2, canvas.height / 2 + 10);
    }
  }
});

