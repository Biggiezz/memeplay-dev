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
    // Token ID counter (starts at 0)
    uint256 private _tokenIdCounter;
    
    // Maximum number of mints allowed
    uint256 public constant MAX_MINT = 2000;
    
    // Track if user has minted (1 user = 1 avatar)
    mapping(address => bool) public hasMinted;
    
    // Store config hash for each token
    mapping(uint256 => string) public tokenConfigHash;
    
    // Events
    event AvatarMinted(
        address indexed to,
        uint256 indexed tokenId,
        string configHash
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
     * 
     * Requirements:
     * - Contract must not be paused
     * - User must not have minted before (1 user = 1 avatar)
     * - Total supply must be less than MAX_MINT (2000)
     */
    function mintAvatar(address to, string memory configHash) 
        public 
        whenNotPaused 
    {
        require(!hasMinted[to], "User already minted");
        require(_tokenIdCounter < MAX_MINT, "Max mint reached");
        require(bytes(configHash).length > 0, "Config hash cannot be empty");
        
        // Mark user as minted
        hasMinted[to] = true;
        
        // Get current token ID and increment counter
        uint256 tokenId = _tokenIdCounter;
        _tokenIdCounter++;
        
        // Mint token
        _safeMint(to, tokenId);
        
        // Store config hash
        tokenConfigHash[tokenId] = configHash;
        
        // Emit event
        emit AvatarMinted(to, tokenId, configHash);
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
