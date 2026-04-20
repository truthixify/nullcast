# NullCast — Confidential Prediction Markets

> Bet without revealing. Verify without exposing. Markets without manipulation.

NullCast is the first fully confidential prediction market protocol built on **Fully Homomorphic Encryption (FHE)**. Using [Zama's FHEVM](https://docs.zama.ai/fhevm) on Ethereum Sepolia, NullCast enables users to place bets on real-world and crypto outcomes while keeping individual position sizes **completely private** — even from the protocol itself.

**Built for:** Zama Developer Program Season 2 — Builder Track + OpenBuild APAC Track

---

## How It Works

```
User enters bet amount (plaintext)
        │
        ▼
FHEVM SDK encrypts amount client-side
        │
        ▼
Encrypted bet submitted on-chain (euint64)
        │
        ▼
FHE arithmetic updates encrypted pool totals
        │
        ▼
Aggregate odds publicly decryptable ──► UI shows live odds
Individual positions stay private ──► Only owner can decrypt
```

### Key Properties

| Property | Description |
|---|---|
| **Position Privacy** | Individual bet amounts are encrypted `euint64` values, never publicly visible |
| **Live Odds** | Aggregate pool totals are publicly decryptable — odds update in real-time |
| **No Front-Running** | Position sizes hidden, preventing MEV and whale manipulation |
| **Composable** | Built on ERC-7984 cUSDT, compatible with any FHEVM-native protocol |
| **Permissionless** | Anyone can create a market via the factory contract |
| **Reputation-Gated** | Optional encrypted reputation score for market participation |

---

## Architecture

```
nullcast/
├── contracts/              # Hardhat project — Solidity + FHEVM
│   ├── contracts/
│   │   ├── NullCastMarket.sol      # Core FHE prediction market
│   │   ├── NullCastFactory.sol     # Permissionless market creation
│   │   ├── LiquidityPool.sol       # LP deposits + fee distribution
│   │   ├── OracleMock.sol          # Sepolia demo resolution
│   │   ├── ReputationGate.sol      # Encrypted reputation scores
│   │   ├── interfaces/
│   │   └── mocks/
│   ├── test/                       # 79 tests (unit + integration)
│   ├── scripts/                    # Deploy + seed scripts
│   └── deployments/sepolia.json    # Deployed addresses
│
├── client/                 # Next.js 14 frontend
│   └── src/
│       ├── app/                    # App Router pages
│       ├── components/             # UI components
│       ├── hooks/                  # wagmi contract hooks
│       ├── lib/                    # Config, contracts, store
│       ├── constants/              # ABIs + addresses
│       └── styles/                 # Design system CSS
│
└── SPEC.md                 # Full technical specification
```

---

## Deployed Contracts (Sepolia)

| Contract | Address | Etherscan |
|---|---|---|
| MockcUSDT | `0x9797Dd36EeE3690F75DFe643B41A8cDAf4A45Ba5` | [View](https://sepolia.etherscan.io/address/0x9797Dd36EeE3690F75DFe643B41A8cDAf4A45Ba5#code) |
| OracleMock | `0x74Bb4A44cceab6a9fA5eDB3455b888007CcF4e20` | [View](https://sepolia.etherscan.io/address/0x74Bb4A44cceab6a9fA5eDB3455b888007CcF4e20#code) |
| ReputationGate | `0xD0749876b631f29a7B8f02BBcd11eccBd895a370` | [View](https://sepolia.etherscan.io/address/0xD0749876b631f29a7B8f02BBcd11eccBd895a370#code) |
| NullCastFactory | `0x303DFB1AfE61EE450afcb45663875092d8A231A5` | [View](https://sepolia.etherscan.io/address/0x303DFB1AfE61EE450afcb45663875092d8A231A5#code) |

### Demo Markets

| Market | Address | Type |
|---|---|---|
| BTC above $90k on Apr 30? | `0xD50aA290A6Ba5623A1583705aaA3c7E892297505` | Binary |
| ETH above $2k on May 5? | `0x30D95077456a6c00b89295a2cee081a3C5C30aF9` | Binary |
| BTC price range May 10 | `0x1fd7597916872Db43275BFA90Efd118c82C5473d` | Scalar (3 buckets) |

---

## Quick Start

### Prerequisites

- Node.js >= 20
- npm >= 7
- Sepolia ETH (for contract interaction)

### Contracts

```bash
cd contracts
npm install
cp .env.example .env    # Fill in your Sepolia RPC, private key, Etherscan key

# Run tests (79 passing)
npx hardhat test

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia

# Seed demo markets
npx hardhat run scripts/createDemoMarkets.ts --network sepolia
```

### Frontend

```bash
cd client
npm install

# Create .env.local with:
# NEXT_PUBLIC_WALLET_CONNECT_ID=your_walletconnect_project_id
# NEXT_PUBLIC_SEPOLIA_RPC_URL=your_sepolia_rpc_url

npm run dev    # http://localhost:3000
```

---

## Smart Contract Design

### FHE Privacy Model

```
ENCRYPTED (never publicly readable):
├── userPositions[address]     — individual bet amounts (euint64)
├── userWinnings[address]      — individual payout amounts (euint64)
├── lpShares[address]          — individual LP positions (euint64)
└── reputationScore[address]   — individual reputation (euint8)

PUBLICLY DECRYPTABLE (aggregate, revealed via makePubliclyDecryptable):
├── totalYesPool               — sum of all YES bets (euint64)
├── totalNoPool                — sum of all NO bets (euint64)
└── totalLiquidity             — sum of all LP deposits (euint64)
```

### ACL Permission Pattern

Every encrypted value follows strict access control:

```solidity
// User places a bet:
FHE.allowThis(userPositions[msg.sender]);     // contract can compute
FHE.allow(userPositions[msg.sender], msg.sender); // user can decrypt

// Pool totals — anyone can request decryption:
FHE.makePubliclyDecryptable(totalYesPool);
```

### Market Types

- **Binary** — YES/NO outcome, two pools
- **Scalar** — Multiple buckets (e.g., price ranges), N pools

### Market Lifecycle

```
createMarket() → OPEN → placeBet() → EXPIRED → resolveMarket() → RESOLVED → claimWinnings()
```

### Reputation & Tiers

Reputation scores are encrypted on-chain (`euint8`, 0-100), computed by a protocol keeper from on-chain signals:

| Input | Weight | Source |
|---|---|---|
| Wallet age | 40pts max | Block history |
| Transaction count | 40pts max | On-chain activity |
| NullCast participation | 20pts max | Auto-tracked per bet |

Scores decay at 5 points per 7-day epoch of inactivity.

**Tier system** — derived from threshold checks (`meetsThreshold`), not the raw score:

| Tier | Threshold | Access |
|---|---|---|
| Oracle | ≥ 80 | Top-tier markets, max position sizes |
| Strategist | ≥ 60 | High-stakes markets |
| Analyst | ≥ 40 | Standard markets |
| Explorer | ≥ 20 | Basic markets |

Anyone can verify a user's tier via `meetsThreshold(user, threshold)` → returns encrypted boolean. The actual score is never revealed publicly — only the user can decrypt it.

Participation is tracked automatically: `NullCastMarket.placeBet()` calls `ReputationGate.recordParticipation()` on every bet.

**Keeper script:** `npx hardhat run scripts/computeScores.ts --network sepolia` computes scores for active users per epoch.

---

## Test Coverage

```
79 tests passing across 7 test files:

  NullCastMarket:  27 tests — placeBet, odds, resolve, claim, admin
  NullCastFactory: 15 tests — creation, validation, admin
  LiquidityPool:    8 tests — deposits, withdrawal, LP tracking
  OracleMock:       7 tests — registration, resolution
  ReputationGate:  13 tests — scoring, decay, threshold
  Integration:      2 tests — full YES/NO lifecycle with factory + oracle
  Scalar:           4 tests — bucket betting, validation
```

---

## Tech Stack

### Smart Contracts
| Tool | Purpose |
|---|---|
| Solidity ^0.8.24 | Contract language |
| Hardhat 2.x | Development framework |
| @fhevm/solidity 0.11 | FHE types + operations |
| @fhevm/hardhat-plugin | Local mock FHEVM for testing |
| OpenZeppelin 5.x | Pausable, Ownable, ReentrancyGuard |

### Frontend
| Tool | Purpose |
|---|---|
| Next.js 14 | React framework (App Router) |
| TypeScript | Type safety |
| Tailwind CSS | Utility styling |
| RainbowKit | Wallet connection |
| wagmi v2 + viem | Ethereum interaction |
| @zama-fhe/sdk | Client-side FHE encryption + user decryption |
| Zustand | State management (persisted to localStorage) |

---

## Known Limitations

- **Mock oracle** — single EOA resolution for demo (production: Chainlink/UMA)
- **Gas costs** — FHE operations are expensive (~500k-2M gas per bet)
- **Async odds** — 5-15 second delay between bet and odds update
- **No dispute mechanism** — resolution is final once submitted

See `SPEC.md` for the full technical specification including future work and production oracle design.

---

## License

MIT

---

*NullCast — Confidential Finance Track | Builder Track + OpenBuild APAC*
*Deployed on Ethereum Sepolia | Powered by Zama FHEVM*
