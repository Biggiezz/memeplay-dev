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
cp .env.example .env
```

3. Add your private key and API keys to `.env`:
- `PRIVATE_KEY`: Your wallet private key (for deployment)
- `BASE_SEPOLIA_RPC_URL`: Base Sepolia RPC endpoint
- `BASESCAN_API_KEY`: BaseScan API key (for verification)

## Commands

- `npm run compile` - Compile contracts
- `npm run test` - Run tests
- `npm run deploy:base-sepolia` - Deploy to Base Sepolia
- `npm run verify` - Verify contract on BaseScan

## Network

- **Base Sepolia Testnet**: Chain ID 84532
- RPC: https://sepolia.base.org
- Explorer: https://sepolia.basescan.org

