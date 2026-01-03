// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AvatarNFT
 * @dev ERC-721 contract for MemePlay Avatar NFTs
 * 
 * Features:
 * - FREE mint (user pays gas only, no contract fee)
 * - 1 user = 1 avatar (duplicate check by address)
 * - Allow multiple users with same avatar config (avatar trùng OK)
 * - Max 2000 mints
 * - Pause/unpause functionality (admin only)
 * 
 * @author MemePlay Team
 */
contract AvatarNFT is ERC721, Ownable, Pausable {
    // Avatar configuration structure
    struct AvatarConfig {
        uint8 actor;      // 0=boy, 1=fish, 2=supergirl
        uint8 skin;       // Skin variant
        uint8 clothes;    // Clothes index (0-4)
        uint8 equipment;  // Equipment index (0-5)
        uint8 hat;        // Hat index (0-4)
    }
    
    // Token ID counter (starts at 0)
    uint256 private _tokenIdCounter;
    
    // Maximum number of mints allowed
    uint256 public constant MAX_MINT = 2000;
    
    // Track if user has minted (1 user = 1 avatar)
    mapping(address => bool) public hasMinted;
    
    // Store config hash for each token
    mapping(uint256 => string) public tokenConfigHash;
    
    // Store full config for each token
    mapping(uint256 => AvatarConfig) public tokenConfig;
    
    // Events
    event AvatarMinted(
        address indexed to,
        uint256 indexed tokenId,
        string configHash,
        AvatarConfig config
    );
    
    /**
     * @dev Constructor
     * Sets token name to "MemePlay Avatar" and symbol to "MPA"
     */
    constructor() ERC721("MemePlay Avatar", "MPA") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }
    
    /**
     * @dev Mint avatar for user
     * @param to Address to mint to
     * @param configHash Config hash string (e.g., "0x12345678")
     * @param config Avatar configuration struct
     * 
     * Requirements:
     * - Contract must not be paused
     * - User must not have minted before (1 user = 1 avatar)
     * - Total supply must be less than MAX_MINT (2000)
     */
    function mintAvatar(
        address to, 
        string memory configHash,
        AvatarConfig memory config
    ) 
        public 
        whenNotPaused 
    {
        require(!hasMinted[to], "User already minted");
        require(_tokenIdCounter < MAX_MINT, "Max mint reached");
        require(bytes(configHash).length > 0, "Config hash cannot be empty");
        require(config.actor <= 2, "Invalid actor"); // 0-2 only
        require(config.clothes <= 4, "Invalid clothes"); // 0-4 only
        require(config.equipment <= 5, "Invalid equipment"); // 0-5 only
        require(config.hat <= 4, "Invalid hat"); // 0-4 only
        
        // Mark user as minted
        hasMinted[to] = true;
        
        // Get current token ID and increment counter
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // Mint token
        _safeMint(to, tokenId);
        
        // Store config hash
        tokenConfigHash[tokenId] = configHash;
        
        // Store full config
        tokenConfig[tokenId] = config;
        
        // Emit event
        emit AvatarMinted(to, tokenId, configHash, config);
    }
    
    /**
     * @dev Get avatar token ID for owner
     * @param owner Address to check
     * @return tokenId Token ID (0 if not minted, but need to check hasMinted for accuracy)
     * 
     * Note: Returns 0 if owner has no avatar. Use hasMinted() for accurate check.
     */
    function getAvatarByOwner(address owner) 
        public 
        view 
        returns (uint256) 
    {
        if (!hasMinted[owner]) {
            return 0;
        }
        
        // Since 1 user = 1 avatar, we can iterate to find the token
        // This is gas-efficient for small collections (< 2000 tokens)
        for (uint256 i = 0; i < _tokenIdCounter; i++) {
            if (_ownerOf(i) == owner) {
                return i;
            }
        }
        
        return 0;
    }
    
    /**
     * @dev Get config hash for token
     * @param tokenId Token ID
     * @return configHash Config hash string
     * 
     * Requirements:
     * - Token must exist
     */
    function getConfigHash(uint256 tokenId) 
        public 
        view 
        returns (string memory) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenConfigHash[tokenId];
    }
    
    /**
     * @dev Get full config for token
     * @param tokenId Token ID
     * @return config AvatarConfig struct
     * 
     * Requirements:
     * - Token must exist
     */
    function getConfig(uint256 tokenId) 
        public 
        view 
        returns (AvatarConfig memory) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        return tokenConfig[tokenId];
    }
    
    // Base URI for metadata (can be updated by owner)
    string private _baseTokenURI = "https://memeplay.dev/avatar-system/api/avatar-metadata.html?tokenId=";
    
    /**
     * @dev Get token URI for metadata (ERC721 standard)
     * @param tokenId Token ID
     * @return tokenURI Metadata URI string
     * 
     * Requirements:
     * - Token must exist
     */
    function tokenURI(uint256 tokenId) 
        public 
        view 
        override 
        returns (string memory) 
    {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
        
        // Return metadata API endpoint URL
        string memory tokenIdStr = _toString(tokenId);
        return string(abi.encodePacked(_baseTokenURI, tokenIdStr));
    }
    
    /**
     * @dev Set base token URI (admin only)
     * @param newBaseURI New base URI for metadata
     */
    function setBaseURI(string memory newBaseURI) public onlyOwner {
        _baseTokenURI = newBaseURI;
    }
    
    /**
     * @dev Get base token URI
     * @return Base URI string
     */
    function baseURI() public view returns (string memory) {
        return _baseTokenURI;
    }
    
    /**
     * @dev Convert uint256 to string
     */
    function _toString(uint256 value) internal pure returns (string memory) {
        if (value == 0) {
            return "0";
        }
        uint256 temp = value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(value % 10)));
            value /= 10;
        }
        return string(buffer);
    }
    
    /**
     * @dev Get total supply
     * @return Total number of minted tokens
     */
    function totalSupply() public view returns (uint256) {
        return _tokenIdCounter;
    }
    
    /**
     * @dev Check if max mint reached
     * @return true if max mint reached, false otherwise
     */
    function isMaxMintReached() public view returns (bool) {
        return _tokenIdCounter >= MAX_MINT;
    }
    
    /**
     * @dev Pause contract (admin only)
     * Prevents all minting operations
     */
    function pause() public onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract (admin only)
     * Allows minting operations to resume
     */
    function unpause() public onlyOwner {
        _unpause();
    }
}
