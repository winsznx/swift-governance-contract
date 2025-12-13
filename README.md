# Governance - Swift v2

DAO governance and voting for Swift v2 decentralized platform on Base Network.

## Features

- **Proposal System** - Create, vote, and execute governance proposals
- **Delegation** - Delegate voting power to representatives
- **Pausable** - Emergency pause capability for admin
- **Security** - ReentrancyGuard, input validation, gas optimized

## Security ✅

- ReentrancyGuard protection
- Pausable for emergencies
- Input validation (title/description limits)
- Gas optimized with unchecked blocks
- Admin override for proposal cancellation

## Installation

```bash
npm install
```

## Configuration

```bash
cp .env.example .env
# Edit .env with your credentials:
# - PRIVATE_KEY: Your deployer wallet private key
# - GOVERNANCE_TOKEN_ADDRESS: ERC20 token used for voting
# - BASESCAN_API_KEY: For contract verification
```

## Testing

```bash
npm run compile    # Compile contracts
npm run test       # Run test suite
```

## Deployment

```bash
npm run deploy:testnet  # Deploy to Base Sepolia
npm run deploy          # Deploy to Base Mainnet
npm run verify          # Verify on BaseScan
```

## Contract Overview

| Function | Description |
|----------|-------------|
| `createProposal` | Create a new governance proposal |
| `vote` | Cast a vote (for/against/abstain) |
| `executeProposal` | Execute a passed proposal |
| `cancelProposal` | Cancel a proposal (proposer or admin) |
| `delegate` | Delegate voting power |
| `pause/unpause` | Emergency controls (admin) |

## License

MIT
