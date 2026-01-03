// Avatar Metadata API
// Returns ERC721 metadata JSON for NFT tokens
// Endpoint: /avatar-system/api/avatar-metadata.js?tokenId=0

// Import contract address and config
import { CONTRACT_ADDRESS } from '../src/contract-address.js';

// Avatar config mapping
const AVATAR_CONFIG = {
  actors: {
    boy: { name: 'Boy', letter: 'a' },
    fish: { name: 'Fish', letter: 'b' },
    supergirl: { name: 'Super Girl', letter: 'c' }
  },
  clothes: ['None', 'Outfit 1', 'Outfit 2', 'Outfit 3', 'Outfit 4'],
  equipment: ['None', 'Weapon 1', 'Weapon 2', 'Weapon 3', 'Weapon 4', 'Weapon 5'],
  hat: ['None', 'Hat 1', 'Hat 2', 'Hat 3', 'Hat 4']
};

// Get avatar file path from config
function getAvatarFilePath(config) {
  const actorData = AVATAR_CONFIG.actors[config.actor];
  const skinLetter = actorData.letter;
  const clothes = config.clothes || 0;
  const equipment = config.equipment || 0;
  const hat = config.hat || 0;
  
  return `avatar-system/assets/avatars/${skinLetter}${clothes}${equipment}${hat}.png`;
}

// Parse config from hash (reverse hash function)
// Note: This is a simplified approach - in production, should store config in contract or database
function parseConfigFromHash(hash) {
  // For now, return default config
  // In production, should query contract or database for actual config
  return {
    actor: 'boy',
    skin: 1,
    clothes: 0,
    equipment: 0,
    hat: 0
  };
}

// Generate metadata JSON
function generateMetadata(tokenId, configHash, config = null) {
  // If config not provided, try to parse from hash or use default
  if (!config) {
    config = parseConfigFromHash(configHash);
  }

  const actorData = AVATAR_CONFIG.actors[config.actor];
  const imageUrl = getAvatarFilePath(config);
  const fullImageUrl = `${window.location.origin}/${imageUrl}`;

  // Generate name
  const name = `MemePlay Avatar #${tokenId}`;

  // Generate description
  const description = `A unique MemePlay avatar with ${actorData.name} actor, ${AVATAR_CONFIG.clothes[config.clothes]}, ${AVATAR_CONFIG.equipment[config.equipment]}, and ${AVATAR_CONFIG.hat[config.hat]}.`;

  // Generate attributes
  const attributes = [
    {
      trait_type: 'Actor',
      value: actorData.name
    },
    {
      trait_type: 'Clothes',
      value: AVATAR_CONFIG.clothes[config.clothes]
    },
    {
      trait_type: 'Equipment',
      value: AVATAR_CONFIG.equipment[config.equipment]
    },
    {
      trait_type: 'Hat',
      value: AVATAR_CONFIG.hat[config.hat]
    },
    {
      trait_type: 'Config Hash',
      value: configHash
    }
  ];

  return {
    name: name,
    description: description,
    image: fullImageUrl,
    external_url: `https://memeplay.dev/avatar-creator`,
    attributes: attributes
  };
}

// Handle API request
export async function getMetadata(tokenId, configHash = null) {
  try {
    // If configHash not provided, try to get from contract
    if (!configHash && window.ethereum) {
      try {
        await loadEthers();
        const provider = new window.ethers.providers.Web3Provider(window.ethereum);
        const contract = new window.ethers.Contract(
          CONTRACT_ADDRESS,
          // Minimal ABI for getConfigHash
          [{
            "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
            "name": "getConfigHash",
            "outputs": [{"internalType": "string", "name": "", "type": "string"}],
            "stateMutability": "view",
            "type": "function"
          }],
          provider
        );
        configHash = await contract.getConfigHash(tokenId);
      } catch (error) {
        console.warn('Could not fetch configHash from contract:', error);
      }
    }

    // Generate metadata
    const metadata = generateMetadata(tokenId, configHash || '0x00000000');
    return metadata;
  } catch (error) {
    console.error('Get metadata error:', error);
    // Return default metadata
    return generateMetadata(tokenId, '0x00000000');
  }
}

// Load ethers.js if needed
async function loadEthers() {
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

// Export for use in HTML endpoint
if (typeof window !== 'undefined') {
  window.getAvatarMetadata = getMetadata;
}

