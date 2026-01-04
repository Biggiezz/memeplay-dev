// Wallet Display - Shared wallet UI logic
// Used by avatar-creator.js and avatar-profile.js

/**
 * Initialize wallet display UI
 * @param {Object} options - Wallet display options
 * @param {MintService} options.mintService - MintService instance
 * @param {Function} options.onAccountChange - Optional callback when account changes (for reloading data)
 * @returns {void}
 */
export function initWalletDisplay(options) {
  const { mintService, onAccountChange = null } = options;

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
      
      // Call onAccountChange callback if provided
      if (onAccountChange) {
        await onAccountChange();
      }
      
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
      
      // Call onAccountChange callback if provided
      if (onAccountChange) {
        await onAccountChange();
      }
    });
  }

  // Initial update
  updateWalletDisplay();

  // Auto-connect for Base App (if not already connected)
  async function tryAutoConnect() {
    try {
      // Check if running in Base App
      const isBaseApp = window.ethereum?.isBase || window.parent !== window;
      
      if (isBaseApp) {
        // Check if already connected
        const isConnected = await mintService.isConnected();
        
        if (!isConnected) {
          // Try to auto-connect using memeplayWallet API
          if (globalThis.memeplayWallet && globalThis.memeplayWallet.connect) {
            try {
              await globalThis.memeplayWallet.connect();
              await updateWalletDisplay();
              
              // Call onAccountChange callback if provided
              if (onAccountChange) {
                await onAccountChange();
              }
              
              console.log('[WalletDisplay] Base App auto-connect successful');
            } catch (error) {
              // Auto-connect failed, but that's OK - user can manually connect
              console.log('[WalletDisplay] Base App auto-connect failed (user may need to connect manually):', error);
            }
          }
        }
      }
    } catch (error) {
      console.warn('[WalletDisplay] Auto-connect check error:', error);
    }
  }

  // Try auto-connect after a short delay (to ensure memeplayWallet API is ready)
  setTimeout(tryAutoConnect, 500);

  // Update periodically (every 5 seconds) to catch external wallet changes
  setInterval(updateWalletDisplay, 5000);
}

