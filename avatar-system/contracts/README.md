# Avatar NFT Contracts

Smart contracts for MemePlay Avatar System.

## Setup

1. Install dependencies:
```bash
cd avatar-system/contracts
npm install
```

2. Copy `.env.example` to `.env` and fill in your values:
```bash
# On Windows (PowerShell)
Copy-Item .env.example .env

# On Linux/Mac
cp .env.example .env
```

3. Edit `.env` file and add your actual values:
- `PRIVATE_KEY`: Your wallet private key (for deployment) - **KEEP THIS SECRET!**
- `BASE_SEPOLIA_RPC_URL`: Base Sepolia RPC endpoint (default: https://sepolia.base.org)
- `BASESCAN_API_KEY`: BaseScan API key (for verification) - Optional, get from https://basescan.org/myapikey

**⚠️ IMPORTANT:** Never commit `.env` file to git! It contains sensitive information.

## Commands

- `npm run compile` - Compile contracts
- `npm run test` - Run tests
- `npm run deploy:base-sepolia` - Deploy to Base Sepolia
- `npm run verify` - Verify contract on BaseScan

## Network

- **Base Sepolia Testnet**: Chain ID 84532
- RPC: https://sepolia.base.org
- Explorer: https://sepolia.basescan.org

