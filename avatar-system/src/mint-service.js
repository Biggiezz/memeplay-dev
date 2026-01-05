// MintService - Handle contract interaction for minting avatars
import { CONTRACT_ADDRESS, CONTRACT_ABI, CONTRACT_CHAIN_ID } from './contract-address.js';

export class MintService {
  constructor() {
    this.contractAddress = CONTRACT_ADDRESS;
    this.contractABI = CONTRACT_ABI;
    this.chainId = CONTRACT_CHAIN_ID;
    this.provider = null;
    this.signer = null;
    this.contract = null;
  }

  /**
   * Detect if running in Base App
   */
  isBaseApp() {
    return window.ethereum?.isBase || window.parent !== window;
  }

  /**
   * Connect wallet (Base Wallet or MetaMask)
   * Uses memeplayWallet API if available, falls back to direct ethereum
   */
  async connectWallet() {
    try {
      // Try using memeplayWallet API first (if available)
      if (globalThis.memeplayWallet && globalThis.memeplayWallet.connect) {
        try {
          await globalThis.memeplayWallet.connect();
          // After connecting via memeplayWallet, get address
          const address = await this.getAddress();
          if (!address) {
            throw new Error('WALLET_REJECTED');
          }
          
          // Check network
          await this.checkNetwork();
          
          // Load ethers.js if not already loaded
          await this.loadEthers();
          
          // Setup provider and signer
          this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
          this.signer = this.provider.getSigner();
          this.contract = new window.ethers.Contract(
            this.contractAddress,
            this.contractABI,
            this.signer
          );
          
          return address;
        } catch (error) {
          // If memeplayWallet.connect fails, fall through to direct ethereum
        }
      }

      // Fallback to direct ethereum connection
      if (!window.ethereum) {
        // Check if mobile - redirect to wallet app
        const ua = navigator.userAgent || '';
        const isMobile = /iphone|ipad|ipod|android/i.test(ua);
        
        if (isMobile) {
          const rawUrl = window.location.href.split('#')[0];
          const cleaned = rawUrl.replace(/^https?:\/\//i, '');
          
          // MetaMask deep link
          const metamaskDeepLink = `https://metamask.app.link/dapp/${cleaned}`;
          
          // Coinbase Wallet deep link (WalletConnect format)
          const coinbaseDeepLink = `https://go.cb-w.com/dapp?url=${encodeURIComponent(window.location.href)}`;
          
          // Simple approach: Try MetaMask first (most common)
          // User can manually switch to Coinbase Wallet if needed
          const proceed = confirm('Please open MetaMask app to connect your wallet.\n\nClick OK to open MetaMask.');
          
          if (proceed) {
            window.location.href = metamaskDeepLink;
          }
          
          // Throw error to prevent further execution (user will be redirected)
          throw new Error('WALLET_NOT_FOUND');
        } else {
          // Desktop - show install message
          throw new Error('WALLET_NOT_FOUND');
        }
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('WALLET_REJECTED');
      }

      const address = accounts[0];

      // Check network
      await this.checkNetwork();

      // Load ethers.js if not already loaded
      await this.loadEthers();

      // Setup provider and signer
      this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      this.contract = new window.ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.signer
      );

      return address;
    } catch (error) {
      console.error('Connect wallet error:', error);
      throw this.handleError(error);
    }
  }

  /**
   * Check if wallet is connected
   */
  async isConnected() {
    try {
      // Try using memeplayWallet API first (if available)
      if (globalThis.memeplayWallet && globalThis.memeplayWallet.isConnected) {
        return globalThis.memeplayWallet.isConnected();
      }

      // Fallback to direct ethereum check
      if (!window.ethereum) {
        return false;
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      return accounts && accounts.length > 0;
    } catch (error) {
      console.error('Check connection error:', error);
      return false;
    }
  }

  /**
   * Get current wallet address
   */
  async getAddress() {
    try {
      // Try using memeplayWallet API first
      if (globalThis.memeplayWallet && globalThis.memeplayWallet.getAddress) {
        const addr = globalThis.memeplayWallet.getAddress();
        if (addr) return addr;
      }

      // Fallback to direct ethereum check
      if (!window.ethereum) {
        return null;
      }

      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      return accounts && accounts.length > 0 ? accounts[0] : null;
    } catch (error) {
      console.error('Get address error:', error);
      return null;
    }
  }

  /**
   * Check if network is correct (Base Sepolia)
   */
  async checkNetwork() {
    if (!window.ethereum) {
      throw new Error('WALLET_NOT_FOUND');
    }

    const chainId = await window.ethereum.request({ method: 'eth_chainId' });
    const expectedChainId = `0x${this.chainId.toString(16)}`;

    if (chainId !== expectedChainId) {
      // Try to switch network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: expectedChainId }]
        });
      } catch (switchError) {
        // If switch fails, try to add network
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: expectedChainId,
              chainName: 'Base Sepolia',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18
              },
              rpcUrls: ['https://sepolia.base.org'],
              blockExplorerUrls: ['https://sepolia.basescan.org']
            }]
          });
        } else {
          throw new Error('NETWORK_ERROR');
        }
      }
    }
  }

  /**
   * Load ethers.js library if not already loaded
   */
  async loadEthers() {
    if (window.ethers) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js';
      
      // Add timeout (30 seconds for mobile)
      const timeout = setTimeout(() => {
        reject(new Error('Timeout loading ethers.js'));
      }, 30000);
      
      script.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      
      script.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load ethers.js'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * Check if user has already minted
   * Retries up to 3 times with exponential backoff for mobile network reliability
   * Returns null if check fails after retries (caller should handle as "unknown" status)
   */
  async hasMinted(address = null, retryCount = 0) {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second
    
    try {
      if (!this.contract) {
        // Initialize contract for read-only
        await this.loadEthers();
        if (!window.ethereum) {
          throw new Error('WALLET_NOT_FOUND');
        }
        this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
        this.contract = new window.ethers.Contract(
          this.contractAddress,
          this.contractABI,
          this.provider
        );
      }

      const userAddress = address || await this.getAddress();
      if (!userAddress) {
        throw new Error('WALLET_NOT_CONNECTED');
      }

      // Call contract with timeout (30 seconds for mobile)
      const hasMintedPromise = this.contract.hasMinted(userAddress);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC call timeout')), 30000)
      );
      
      const hasMinted = await Promise.race([hasMintedPromise, timeoutPromise]);
      return hasMinted;
    } catch (error) {
      // Don't retry on these specific errors (they are final)
      const nonRetryableErrors = [
        'WALLET_NOT_FOUND',
        'WALLET_NOT_CONNECTED',
        'ALREADY_MINTED',
        'User already minted'
      ];
      
      const isNonRetryable = nonRetryableErrors.some(err => 
        error.message?.includes(err) || error.code === err
      );
      
      // Retry on ALL other errors (network, timeout, RPC errors, etc.)
      if (retryCount < maxRetries && !isNonRetryable) {
        const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff: 1s, 2s, 4s
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.hasMinted(address, retryCount + 1);
      }
      
      // After max retries or non-retryable error, throw
      throw this.handleError(error);
    }
  }

  /**
   * Mint avatar
   * @param {string} configHash - Config hash string
   * @param {Object} config - Avatar config object {actor, skin, clothes, equipment, hat}
   */
  async mintAvatar(configHash, config) {
    try {
      // Ensure wallet is connected and contract has signer
      const isConnected = await this.isConnected();
      if (!isConnected) {
        await this.connectWallet();
      }

      // Re-initialize contract with signer (important for write operations)
      await this.loadEthers();
      if (!window.ethereum) {
        throw new Error('WALLET_NOT_FOUND');
      }

      // Setup provider and signer for write operations
      this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
      this.signer = this.provider.getSigner();
      
      // Re-create contract with signer (not provider)
      this.contract = new window.ethers.Contract(
        this.contractAddress,
        this.contractABI,
        this.signer
      );

      // Verify signer is available
      const signerAddress = await this.signer.getAddress();
      if (!signerAddress) {
        throw new Error('WALLET_NOT_CONNECTED');
      }

      // Check if already minted
      const address = signerAddress;
      const alreadyMinted = await this.hasMinted(address);
      if (alreadyMinted) {
        throw new Error('ALREADY_MINTED');
      }

      // Validate and encode config
      if (!config) {
        throw new Error('Config is required');
      }

      // Map actor string to number: boy=0, fish=1, supergirl=2
      const actorMap = { boy: 0, fish: 1, supergirl: 2 };
      const actorNum = actorMap[config.actor] !== undefined ? actorMap[config.actor] : 0;

      // Create config struct
      const configStruct = {
        actor: actorNum,
        skin: config.skin || 1,
        clothes: config.clothes || 0,
        equipment: config.equipment || 0,
        hat: config.hat || 0
      };

      // Call mint function with config
      const tx = await this.contract.mintAvatar(address, configHash, configStruct);
      
      // Wait for transaction
      const receipt = await tx.wait();

      // Extract tokenId from events
      let tokenId = null;
      
      // Try to parse events (ethers v5 format)
      if (receipt.events && receipt.events.length > 0) {
        const mintEvent = receipt.events.find(e => 
          e.event === 'AvatarMinted' || 
          (e.topics && e.topics.length > 0)
        );
        if (mintEvent) {
          // Try different event formats
          if (mintEvent.args && mintEvent.args.tokenId) {
            tokenId = mintEvent.args.tokenId.toString();
          } else if (mintEvent.args && mintEvent.args.length >= 2) {
            tokenId = mintEvent.args[1].toString(); // tokenId is second argument
          }
        }
      }

      // If tokenId not found in events, query from contract
      if (tokenId === null || tokenId === '0') {
        try {
          tokenId = await this.contract.getAvatarByOwner(address);
          tokenId = tokenId.toString();
        } catch (error) {
          tokenId = '0'; // Fallback
        }
      }

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        tokenId: tokenId,
        address: address
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Handle errors and return user-friendly messages
   */
  handleError(error) {
    // User rejected transaction
    if (error.code === 4001 || error.message?.includes('user rejected')) {
      return new Error('WALLET_REJECTED');
    }

    // Insufficient funds
    if (error.code === 'INSUFFICIENT_FUNDS' || 
        error.message?.includes('insufficient funds') ||
        error.message?.includes('insufficient balance')) {
      return new Error('INSUFFICIENT_GAS');
    }

    // Already minted
    if (error.message?.includes('User already minted') || 
        error.message?.includes('ALREADY_MINTED')) {
      return new Error('ALREADY_MINTED');
    }

    // Network error
    if (error.code === 'NETWORK_ERROR' || 
        error.message?.includes('network') ||
        error.message?.includes('chain')) {
      return new Error('NETWORK_ERROR');
    }

    // Wallet not found
    if (error.message?.includes('WALLET_NOT_FOUND')) {
      return new Error('WALLET_NOT_FOUND');
    }

    // Generic error
    return new Error('MINT_FAILED');
  }

  /**
   * Get tokenId for current user
   */
  async getMyTokenId() {
    try {
      const address = await this.getAddress();
      if (!address) {
        return null;
      }

      if (!this.contract) {
        await this.loadEthers();
        if (!window.ethereum) {
          return null;
        }
        this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
        this.contract = new window.ethers.Contract(
          this.contractAddress,
          this.contractABI,
          this.provider
        );
      }

      const tokenId = await this.contract.getAvatarByOwner(address);
      return tokenId.toString();
    } catch (error) {
      console.error('Get tokenId error:', error);
      return null;
    }
  }

  /**
   * Verify ownership of token
   */
  async verifyOwnership(tokenId, address = null) {
    try {
      if (!this.contract) {
        await this.loadEthers();
        if (!window.ethereum) {
          return false;
        }
        this.provider = new window.ethers.providers.Web3Provider(window.ethereum);
        this.contract = new window.ethers.Contract(
          this.contractAddress,
          this.contractABI,
          this.provider
        );
      }

      const userAddress = address || await this.getAddress();
      if (!userAddress) {
        return false;
      }

      const owner = await this.contract.ownerOf(tokenId);
      return owner.toLowerCase() === userAddress.toLowerCase();
    } catch (error) {
      console.error('Verify ownership error:', error);
      return false;
    }
  }

  /**
   * Get error message in English
   */
  getErrorMessage(error) {
    const errorMap = {
      'WALLET_NOT_FOUND': 'Wallet not found. Please install MetaMask or Base Wallet.',
      'WALLET_REJECTED': 'Wallet connection rejected.',
      'WALLET_NOT_CONNECTED': 'Wallet not connected. Please connect your wallet first.',
      'INSUFFICIENT_GAS': 'Insufficient gas fee. Please add more ETH to your wallet.',
      'ALREADY_MINTED': 'You already have an avatar.',
      'NETWORK_ERROR': 'Network error. Please check your connection and try again.',
      'MINT_FAILED': 'Mint failed. Please try again.'
    };

    return errorMap[error.message] || errorMap['MINT_FAILED'];
  }
}

