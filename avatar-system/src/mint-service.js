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
   */
  async connectWallet() {
    try {
      // Check if wallet is available
      if (!window.ethereum) {
        throw new Error('WALLET_NOT_FOUND');
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
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load ethers.js'));
      document.head.appendChild(script);
    });
  }

  /**
   * Check if user has already minted
   */
  async hasMinted(address = null) {
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

      const hasMinted = await this.contract.hasMinted(userAddress);
      return hasMinted;
    } catch (error) {
      console.error('Check hasMinted error:', error);
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
          console.warn('Could not get tokenId from contract:', error);
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
      console.error('Mint error:', error);
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
   * Get error message in Vietnamese/English
   */
  getErrorMessage(error) {
    const errorMap = {
      'WALLET_NOT_FOUND': 'Ví không tìm thấy. Vui lòng cài đặt MetaMask hoặc Base Wallet.',
      'WALLET_REJECTED': 'Bạn đã từ chối kết nối ví.',
      'WALLET_NOT_CONNECTED': 'Ví chưa được kết nối. Vui lòng kết nối ví trước.',
      'INSUFFICIENT_GAS': 'Gas fee không đủ. Vui lòng nạp thêm ETH vào ví.',
      'ALREADY_MINTED': 'You already have an avatar.',
      'NETWORK_ERROR': 'Network error. Vui lòng kiểm tra kết nối mạng và thử lại.',
      'MINT_FAILED': 'Mint failed. Please try again.'
    };

    return errorMap[error.message] || errorMap['MINT_FAILED'];
  }
}

