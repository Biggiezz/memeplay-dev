// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title AvatarNFT
 * @dev ERC-721 contract for MemePlay Avatar NFTs
 * - FREE mint (user pays gas only)
 * - 1 user = 1 avatar (duplicate check)
 * - Max 2000 mints
 */
contract AvatarNFT is ERC721, Ownable, Pausable {
    uint256 private _tokenIdCounter;
    uint256 public constant MAX_MINT = 2000;
    
    // Track if user has minted
    mapping(address => bool) public hasMinted;
    
    // Store config hash for each token
    mapping(uint256 => string) public tokenConfigHash;
    
    // Events
    event AvatarMinted(address indexed to, uint256 indexed tokenId, string configHash);
    
    constructor() ERC721("MemePlay Avatar", "MPA") Ownable(msg.sender) {
        _tokenIdCounter = 0;
    }
    
    /**
     * @dev Mint avatar for user
     * @param to Address to mint to
     * @param configHash Config hash string (e.g., "0x12345678")
     */
    function mintAvatar(address to, string memory configHash) public whenNotPaused {
        require(!hasMinted[to], "User already minted");
        require(_tokenIdCounter < MAX_MINT, "Max mint reached");
        
        hasMinted[to] = true;
        uint256 tokenId = _tokenIdCounter++;
        
        _safeMint(to, tokenId);
        tokenConfigHash[tokenId] = configHash;
        
        emit AvatarMinted(to, tokenId, configHash);
    }
    
    /**
     * @dev Get avatar token ID for owner
     * @param owner Address to check
     * @return tokenId Token ID (0 if not minted)
     */
    function getAvatarByOwner(address owner) public view returns (uint256) {
        uint256 balance = balanceOf(owner);
        if (balance == 0) return 0;
        
        // Return first token ID (since 1 user = 1 avatar)
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
     */
    function getConfigHash(uint256 tokenId) public view returns (string memory) {
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
     * @dev Pause contract (admin only)
     */
    function pause() public onlyOwner {
        _pause();
    }
    
    /**
     * @dev Unpause contract (admin only)
     */
    function unpause() public onlyOwner {
        _unpause();
    }
}

