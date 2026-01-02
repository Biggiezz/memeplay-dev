const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying AvatarNFT contract...");

  // Get the contract factory
  const AvatarNFT = await hre.ethers.getContractFactory("AvatarNFT");
  
  // Deploy the contract
  const avatarNFT = await AvatarNFT.deploy();
  
  await avatarNFT.waitForDeployment();
  const address = await avatarNFT.getAddress();

  console.log("✅ AvatarNFT deployed to:", address);
  console.log("📝 Contract address:", address);
  console.log("\n🔍 Verify contract:");
  console.log(`npx hardhat verify --network baseSepolia ${address}`);

  // Save address to file (for frontend use)
  const fs = require("fs");
  const contractInfo = {
    address: address,
    network: "baseSepolia",
    chainId: 84532,
    deployedAt: new Date().toISOString(),
  };
  
  fs.writeFileSync(
    "../src/contract-address.js",
    `// Auto-generated contract address
export const CONTRACT_ADDRESS = "${address}";
export const CONTRACT_NETWORK = "baseSepolia";
export const CONTRACT_CHAIN_ID = 84532;
`
  );
  
  console.log("\n✅ Contract address saved to: avatar-system/src/contract-address.js");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

