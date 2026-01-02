const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AvatarNFT", function () {
  let avatarNFT;
  let owner;
  let user1;
  let user2;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();

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
  });

  describe("Minting", function () {
    it("Should mint avatar successfully", async function () {
      const configHash = "0x12345678";
      await avatarNFT.mintAvatar(user1.address, configHash);

      expect(await avatarNFT.balanceOf(user1.address)).to.equal(1);
      expect(await avatarNFT.hasMinted(user1.address)).to.equal(true);
      expect(await avatarNFT.getConfigHash(0)).to.equal(configHash);
    });

    it("Should prevent duplicate mint", async function () {
      const configHash = "0x12345678";
      await avatarNFT.mintAvatar(user1.address, configHash);

      await expect(
        avatarNFT.mintAvatar(user1.address, "0x87654321")
      ).to.be.revertedWith("User already minted");
    });

    it("Should allow different users with same config", async function () {
      const configHash = "0x12345678";
      await avatarNFT.mintAvatar(user1.address, configHash);
      await avatarNFT.mintAvatar(user2.address, configHash);

      expect(await avatarNFT.balanceOf(user1.address)).to.equal(1);
      expect(await avatarNFT.balanceOf(user2.address)).to.equal(1);
    });
  });
});

