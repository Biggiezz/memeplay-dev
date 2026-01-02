// Avatar Creator Script
// Import animation renderer and config
import { AnimationRenderer } from '../avatar-system/src/animation-renderer.js';
import { ANIMATION_CONFIG } from '../avatar-system/src/animation-config.js';

// Avatar Config
const AVATAR_CONFIG = {
  actors: {
    boy: { skin: 1, letter: 'a' },
    fish: { skin: 2, letter: 'b' },
    supergirl: { skin: 3, letter: 'c' }
  }
};

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

// Loading indicator
const loadingIndicator = document.getElementById('loadingIndicator');

// Show/hide loading
function showLoading() {
  if (loadingIndicator) loadingIndicator.classList.add('active');
}

function hideLoading() {
  if (loadingIndicator) loadingIndicator.classList.remove('active');
}

// Generate hash from config
function generateHash(config) {
  const configString = `${config.actor}-${config.skin}-${config.clothes}-${config.equipment}-${config.hat}`;
  // Simple hash function (for demo, will use proper hash in production)
  let hash = 0;
  for (let i = 0; i < configString.length; i++) {
    const char = configString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  // Convert to hex and take first 8 chars
  const hexHash = Math.abs(hash).toString(16).padStart(8, '0').substring(0, 8);
  return `0x${hexHash}`;
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

// Update preview with animation
async function updatePreview() {
  const canvas = document.getElementById('avatarPreview');
  const hashDisplay = document.getElementById('hashDisplay');
  
  // Show loading
  showLoading();
  
  // Try to load pre-rendered avatar first
  const filePath = getAvatarFilePath(currentConfig);
  
  // Check cache first
  if (imageCache.has(filePath)) {
    const cachedImg = imageCache.get(filePath);
    hideLoading();
    
    // Stop animation if playing
    if (animationRenderer && animationRenderer.isPlaying) {
      animationRenderer.stop();
    }
    
    // Draw cached image
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(cachedImg, 0, 0, canvas.width, canvas.height);
    
    // Update hash display
    const hash = generateHash(currentConfig);
    hashDisplay.textContent = hash;
    return;
  }
  
  // Load new image
  const img = new Image();
  
  // Set timeout for loading (10 seconds)
  let timeout = null;
  
  img.onerror = async () => {
    if (timeout) clearTimeout(timeout);
    // If pre-rendered image not found, try animation
    console.log(`⚠️ Pre-rendered image not found: ${filePath}, trying animation...`);
    
    // Get animation path based on current config
    const animationPath = ANIMATION_CONFIG.getAnimationPath(
      currentConfig.actor,
      currentConfig.clothes,
      currentConfig.equipment,
      currentConfig.hat
    );
    
    console.log(`🎬 Loading animation: ${animationPath}`);
    
    // Stop old animation if playing
    if (animationRenderer && animationRenderer.isPlaying) {
      animationRenderer.stop();
    }
    
    // Create new animation renderer with move config
    animationRenderer = new AnimationRenderer(canvas);
    const initialized = await animationRenderer.init(animationPath);
    
    hideLoading();
    
    if (!initialized) {
      // No fallback - show error
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#333';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffb642';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Asset not found', canvas.width / 2, canvas.height / 2 - 10);
      ctx.fillStyle = '#666';
      ctx.font = '11px Arial';
      ctx.fillText(animationPath.split('/').pop(), canvas.width / 2, canvas.height / 2 + 10);
      return;
    }
    
    // Start animation
    if (!animationRenderer.isPlaying) {
      animationRenderer.start();
    }
    
    // Update hash display
    const hash = generateHash(currentConfig);
    hashDisplay.textContent = hash;
  };
  
  img.onload = () => {
    if (timeout) clearTimeout(timeout);
    
    // Cache the image
    imageCache.set(filePath, img);
    hideLoading();
    
    // Stop animation if playing
    if (animationRenderer && animationRenderer.isPlaying) {
      animationRenderer.stop();
    }
    
    // Draw static image
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Update hash display
    const hash = generateHash(currentConfig);
    hashDisplay.textContent = hash;
  };
  
  // Set timeout for loading (10 seconds)
  timeout = setTimeout(() => {
    if (!img.complete) {
      hideLoading();
      console.error('⏱️ Image load timeout:', filePath);
    }
  }, 10000);
  
  img.src = filePath;
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
    mintBtn.textContent = 'Minting...';
    
    try {
      // TODO: Implement actual mint logic with wallet connection
      // Simulate mint process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate gas check (random for demo)
      const hasEnoughGas = Math.random() > 0.3; // 70% success rate for demo
      
      if (!hasEnoughGas) {
        throw new Error('INSUFFICIENT_GAS');
      }
      
      // Success
      mintMessage.className = 'mint-message success';
      mintMessage.textContent = 'Mint successful';
      console.log('Mint successful!', currentConfig);
      
    } catch (error) {
      // Error handling
      mintMessage.className = 'mint-message error';
      
      if (error.message === 'INSUFFICIENT_GAS') {
        mintMessage.textContent = 'Insufficient gas';
      } else {
        mintMessage.textContent = 'Mint failed. Please try again.';
      }
      
      console.error('Mint error:', error);
    } finally {
      mintBtn.disabled = false;
      mintBtn.textContent = 'Mint Avatar';
      
      // Auto-hide message after 5 seconds
      setTimeout(() => {
        mintMessage.className = 'mint-message';
        mintMessage.textContent = '';
      }, 5000);
    }
  });
}

// Initialize on load with error handling
document.addEventListener('DOMContentLoaded', async () => {
  try {
    console.log('✅ Avatar Creator: DOMContentLoaded');
    initSelectors();
    initMintButton();
    
    // Small delay to ensure DOM is fully ready (especially on mobile)
    await new Promise(resolve => setTimeout(resolve, 100));
    
    await updatePreview();
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

