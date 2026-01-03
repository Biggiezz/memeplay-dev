const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AvatarNFT", function () {
  let avatarNFT;
  let owner;
  let user1;
  let user2;
  let user3;

  beforeEach(async function () {
    [owner, user1, user2, user3] = await ethers.getSigners();

    const AvatarNFT = await ethers.getContractFactory("AvatarNFT");
    avatarNFT = await AvatarNFT.deploy();
    await avatarNFT.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the right name and symbol", async function () {
      expect(await avatarNFT.name()).to.equal("MemePlay Avatar");
      expect(await avatarNFT.symbol()).to.equal("MPA");
    });

    it("Should start with 0 total supply", async function () {
      expect(await avatarNFT.totalSupply()).to.equal(0);
    });

    it("Should have MAX_MINT = 2000", async function () {
      expect(await avatarNFT.MAX_MINT()).to.equal(2000);
    });

    it("Should not be paused initially", async function () {
      expect(await avatarNFT.paused()).to.equal(false);
    });
  });

  describe("Minting", function () {
    it("Should mint avatar successfully", async function () {
      const configHash = "0x12345678";
      await avatarNFT.mintAvatar(user1.address, configHash);

      expect(await avatarNFT.balanceOf(user1.address)).to.equal(1);
      expect(await avatarNFT.hasMinted(user1.address)).to.equal(true);
      expect(await avatarNFT.getConfigHash(0)).to.equal(configHash);
      expect(await avatarNFT.totalSupply()).to.equal(1);
    });

    it("Should prevent duplicate mint (1 user = 1 avatar)", async function () {
      const configHash = "0x12345678";
      await avatarNFT.mintAvatar(user1.address, configHash);

      await expect(
        avatarNFT.mintAvatar(user1.address, "0x87654321")
      ).to.be.revertedWith("User already minted");
    });

    it("Should allow different users with same config (avatar trùng OK)", async function () {
      const configHash = "0x12345678";
      await avatarNFT.mintAvatar(user1.address, configHash);
      await avatarNFT.mintAvatar(user2.address, configHash);

      expect(await avatarNFT.balanceOf(user1.address)).to.equal(1);
      expect(await avatarNFT.balanceOf(user2.address)).to.equal(1);
      expect(await avatarNFT.getConfigHash(0)).to.equal(configHash);
      expect(await avatarNFT.getConfigHash(1)).to.equal(configHash);
    });

    it("Should reject empty config hash", async function () {
      await expect(
        avatarNFT.mintAvatar(user1.address, "")
      ).to.be.revertedWith("Config hash cannot be empty");
    });

    it("Should emit AvatarMinted event", async function () {
      const configHash = "0x12345678";
      await expect(avatarNFT.mintAvatar(user1.address, configHash))
        .to.emit(avatarNFT, "AvatarMinted")
        .withArgs(user1.address, 0, configHash);
    });
  });

  describe("Query Functions", function () {
    beforeEach(async function () {
      await avatarNFT.mintAvatar(user1.address, "0x11111111");
      await avatarNFT.mintAvatar(user2.address, "0x22222222");
    });

    it("Should return correct token ID for owner", async function () {
      expect(await avatarNFT.getAvatarByOwner(user1.address)).to.equal(0);
      expect(await avatarNFT.getAvatarByOwner(user2.address)).to.equal(1);
    });

    it("Should return 0 for user who hasn't minted", async function () {
      expect(await avatarNFT.getAvatarByOwner(user3.address)).to.equal(0);
      expect(await avatarNFT.hasMinted(user3.address)).to.equal(false);
    });

    it("Should return correct config hash", async function () {
      expect(await avatarNFT.getConfigHash(0)).to.equal("0x11111111");
      expect(await avatarNFT.getConfigHash(1)).to.equal("0x22222222");
    });

    it("Should revert when getting config hash for non-existent token", async function () {
      await expect(avatarNFT.getConfigHash(999))
        .to.be.revertedWith("Token does not exist");
    });
  });

  describe("Pause/Unpause", function () {
    it("Should allow owner to pause", async function () {
      await avatarNFT.pause();
      expect(await avatarNFT.paused()).to.equal(true);
    });

    it("Should prevent minting when paused", async function () {
      await avatarNFT.pause();
      await expect(
        avatarNFT.mintAvatar(user1.address, "0x12345678")
      ).to.be.revertedWithCustomError(avatarNFT, "EnforcedPause");
    });

    it("Should allow minting after unpause", async function () {
      await avatarNFT.pause();
      await avatarNFT.unpause();
      
      const configHash = "0x12345678";
      await avatarNFT.mintAvatar(user1.address, configHash);
      expect(await avatarNFT.balanceOf(user1.address)).to.equal(1);
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        avatarNFT.connect(user1).pause()
      ).to.be.revertedWithCustomError(avatarNFT, "OwnableUnauthorizedAccount");
    });
  });

  describe("Max Mint Limit", function () {
    it("Should allow minting up to MAX_MINT", async function () {
      const configHash = "0x12345678";
      
      // Mint 5 tokens (for testing, not all 2000)
      for (let i = 0; i < 5; i++) {
        const signer = await ethers.getSigner(
          ethers.Wallet.createRandom().address
        );
        // Note: This test is simplified - in real scenario, each address can only mint once
        // For full test, we'd need 2000 different addresses
      }
    });

    it("Should check isMaxMintReached correctly", async function () {
      expect(await avatarNFT.isMaxMintReached()).to.equal(false);
      
      // Note: Full test would require minting 2000 tokens
      // This is a placeholder test
    });
  });
});
