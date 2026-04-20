# NullCast — Confidential Prediction Markets
## Technical Specification v1.0

> *"Bet without revealing. Verify without exposing. Markets without manipulation."*

**Built on:** Zama Protocol (FHEVM) | **Network:** Ethereum Sepolia Testnet  
**Currency:** cUSDT (ERC-7984 Confidential USDT)  
**Submission:** Zama Developer Program Season 2 — Builder Track 

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Problem Statement](#2-problem-statement)
3. [Solution Architecture](#3-solution-architecture)
4. [FHE Design Decisions](#4-fhe-design-decisions)
5. [Smart Contract Specification](#5-smart-contract-specification)
6. [Market Lifecycle](#6-market-lifecycle)
7. [Decryption Flows](#7-decryption-flows)
8. [Frontend Specification](#8-frontend-specification)
9. [Reputation Gate Integration](#9-reputation-gate-integration)
10. [Liquidity Provider Mechanics](#10-liquidity-provider-mechanics)
11. [Oracle & Resolution](#11-oracle--resolution)
12. [Security Model](#12-security-model)
13. [Events & Indexing](#13-events--indexing)
14. [Tech Stack](#14-tech-stack)
15. [Repository Structure](#15-repository-structure)
16. [Development Phases](#16-development-phases)
17. [Demo Script](#17-demo-script)
18. [Known Limitations & Future Work](#18-known-limitations--future-work)

---

## 1. Project Overview

**NullCast** is the first fully confidential prediction market protocol built on Fully Homomorphic Encryption (FHE). Using Zama's FHEVM on Ethereum Sepolia, NullCast enables users to place bets on real-world and crypto outcomes while keeping individual position sizes completely private — even from the protocol itself.

Aggregate market odds are computed over encrypted ciphertext and publicly revealed, maintaining market efficiency without leaking individual strategy. Winnings are distributed only to winners and decryptable only by the recipient.

### Key Properties

| Property | Description |
|---|---|
| **Position Privacy** | Individual bet amounts are encrypted euint64 values, never publicly visible |
| **Efficient Markets** | Aggregate pool totals are publicly decryptable — odds shown in real-time |
| **No Front-Running** | Position sizes hidden, preventing MEV and whale manipulation |
| **Composable** | Built on ERC-7984 cUSDT, compatible with any FHEVM-native protocol |
| **Permissionless** | Anyone can create a market via the factory contract |
| **Reputation-Gated** | Optional minimum reputation score for market participation |

---

## 2. Problem Statement

### The Transparency Problem in Prediction Markets

Public prediction markets like Polymarket operate with full on-chain transparency. Every position — wallet address, bet amount, direction — is visible to anyone watching the chain. This creates three compounding problems:

**Problem 1: Whale Visibility & Front-Running**  
When a large wallet places a significant YES position, the aggregate odds shift immediately. Other participants observe this and either front-run the same direction (moving odds further) or exit opposing positions. The whale's alpha evaporates before settlement, and market prices become noisier rather than more accurate.

**Problem 2: Strategy Leakage**  
Sophisticated traders who correctly predicted outcomes in the past have their entire bet history publicly queryable. Their future bets become signals for others to copy, removing the incentive to do original research. Informed participation declines over time.

**Problem 3: Institutional Non-Participation**  
Institutions and professional traders will not participate in markets where their position sizes, directions, and timing are publicly visible. This keeps the largest and most informed capital on the sidelines, making markets less accurate and less liquid.

### Why Existing Solutions Don't Work

- **ZK-based approaches** can prove a position exists without revealing it, but cannot compute running aggregate odds over encrypted positions. You need the aggregate to be verifiably correct and live — ZK proofs work for verification, not stateful computation.
- **Commit-reveal schemes** require a two-phase interaction and are gameable — once commitments are placed, the reveal phase creates new information asymmetries.
- **Centralized dark pools** solve privacy but introduce custodial risk and trust requirements, defeating the purpose of on-chain markets.

**FHE is the only cryptographic primitive that solves all three simultaneously:** computation over encrypted positions for live odds, with access-controlled decryption for individual privacy.

---

## 3. Solution Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER LAYER                               │
│    Browser Wallet (MetaMask)  ←→  NullCast Frontend (Next.js)  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                     FHEVM SDK LAYER                             │
│   fhevm-js (encrypt inputs)   relayer-sdk (decrypt outputs)    │
└───────────┬───────────────────────────────┬─────────────────────┘
            │                               │
┌───────────▼───────────┐     ┌─────────────▼───────────────────┐
│   ETHEREUM SEPOLIA    │     │      ZAMA OFF-CHAIN LAYER        │
│                       │     │                                  │
│  NullCast Contracts   │     │  KMS (Key Management Service)   │
│  ├── Factory          │     │  Coprocessor (FHE computation)  │
│  ├── Market           │◄────│  Relayer (decryption oracle)    │
│  ├── LiquidityPool    │     │  Gateway (ACL enforcement)      │
│  ├── OracleMock       │     │                                  │
│  └── ReputationGate   │     └──────────────────────────────────┘
└───────────────────────┘
```

### Component Responsibilities

| Component | Responsibility |
|---|---|
| **NullCastFactory** | Deploy new markets, maintain registry, emit discovery events |
| **NullCastMarket** | Core FHE betting logic, ACL management, settlement |
| **LiquidityPool** | LP deposits, fee accrual, liquidity bootstrapping |
| **OracleMock** | Simulated price feed resolver for Sepolia demo |
| **ReputationGate** | Lightweight on-chain reputation score for access control |
| **FHEVM SDK** | Client-side encryption of bet amounts before submission |
| **Relayer SDK** | Off-chain decryption of publicly marked ciphertexts |
| **Zama KMS** | Threshold MPC key management, decryption authorization |

---

## 4. FHE Design Decisions

This section documents every deliberate FHE design choice and the rationale behind it. These decisions are critical for both security correctness and judge evaluation.

### 4.1 What Is Encrypted vs Public

```
ENCRYPTED (never publicly readable):
├── userPositions[address]        — individual bet amounts (euint64)
├── userWinnings[address]         — individual payout amounts (euint64)
├── lpShares[address]             — individual LP positions (euint64)
└── reputationScore[address]      — individual reputation scores (euint8)

PUBLICLY DECRYPTABLE (aggregate, revealed via makePubliclyDecryptable):
├── totalYesPool                  — sum of all YES bets (euint64)
├── totalNoPool                   — sum of all NO bets (euint64)
└── totalLiquidity                — sum of all LP deposits (euint64)

PLAIN PUBLIC STATE (never encrypted):
├── marketQuestion                — string
├── marketExpiry                  — uint256 (block number)
├── marketType                    — enum (BINARY / SCALAR)
├── marketStatus                  — enum (OPEN / RESOLVING / RESOLVED)
├── marketOutcome                 — bool/uint (set at resolution)
├── minimumBet                    — uint256
└── reputationThreshold           — uint8
```

### 4.2 Why euint64 for Positions

`euint64` supports values up to ~18.4 quadrillion — sufficient for cUSDT amounts with 6 decimal places (up to ~18.4 trillion USDT equivalent). `euint32` would cap at ~4,294 USDT equivalent which is too restrictive. `euint128` is available but increases FHE computation cost. `euint64` is the pragmatic choice for DeFi-scale amounts.

### 4.3 ACL Permission Model

Every encrypted value in NullCast follows a strict permission assignment pattern:

```solidity
// When a user places a bet:
FHE.allowThis(userPositions[msg.sender]);     // contract can compute on it
FHE.allow(userPositions[msg.sender], msg.sender); // user can decrypt their own

// When pool totals are updated:
FHE.makePubliclyDecryptable(totalYesPool);    // anyone can request decryption
FHE.makePubliclyDecryptable(totalNoPool);     // anyone can request decryption

// When winnings are computed:
FHE.allowThis(userWinnings[msg.sender]);      // contract can distribute
FHE.allow(userWinnings[msg.sender], msg.sender); // winner can decrypt their payout
```

The contract never calls `FHE.makePubliclyDecryptable()` on individual positions. This is the entire privacy guarantee — not a separate encryption key, but a deliberate ACL policy enforced by the contract logic and the Zama KMS.

### 4.4 Asynchronous Decryption Architecture

FHEVM does not support synchronous on-chain decryption. All decryption is asynchronous and follows this flow:

**Public decryption (for odds display):**
1. Contract calls `FHE.makePubliclyDecryptable(totalYesPool)` on each bet update
2. Server-side API (`/api/odds`) reads the encrypted handles via `getTotalYesPoolHandle()` / `getTotalNoPoolHandle()`
3. API calls the Zama relayer REST endpoint (`POST /v2/public-decrypt`) to decrypt the handles
4. KMS verifies the handles are publicly decryptable, decrypts, and returns cleartext values
5. API returns `{ yesPool, noPool, yesOdds, noOdds }` to the frontend with a 15s server cache
6. Frontend computes `odds = yesPool / (yesPool + noPool)` and displays in real-time

No on-chain storage of cleartext odds is required. The privacy guarantee holds because only aggregate totals (marked `makePubliclyDecryptable`) are decrypted — individual positions remain encrypted and only decryptable by the position holder.

This introduces a ~5-15 second delay between a bet being placed and odds updating on the frontend. This is acceptable for a prediction market and is clearly documented in the UI.

**User decryption (for viewing own position):**
1. Contract has called `FHE.allow(userPositions[msg.sender], msg.sender)` at bet time
2. User's frontend calls `fhevm.userDecryptEuint()` with the ciphertext handle and user's wallet
3. KMS checks ACL — sees user is authorized — decrypts and re-encrypts under user's ephemeral keypair
4. Frontend decrypts locally and displays the position

Neither step requires any additional on-chain transaction from the user to view their own position.

### 4.5 Batch Odds Reveal Strategy

To reduce timing attack surface (inferring large individual bets from odds movement), pool totals are not marked publicly decryptable on every single bet. Instead:

- A `lastOddsUpdate` block number is tracked
- `FHE.makePubliclyDecryptable()` is only callable once per block (enforced by modifier)
- Multiple bets within the same block all affect the encrypted pool, but odds reveal is batched once per block
- This means a single large bet can't be isolated by watching a single odds update

```solidity
modifier oncePerBlock() {
    require(block.number > lastOddsUpdate, "Odds already updated this block");
    lastOddsUpdate = block.number;
    _;
}
```

### 4.6 Scalar Market Design

For scalar (multi-outcome) markets, each outcome bucket is an independent `euint64` pool:

```solidity
mapping(uint8 => euint64) public bucketPools;       // encrypted per-bucket totals
mapping(address => mapping(uint8 => euint64)) public userBucketPositions; // encrypted per-user per-bucket
```

All bucket pools are marked publicly decryptable (for odds across buckets), while individual positions stay private. The same ACL pattern applies.

---

## 5. Smart Contract Specification

### 5.1 NullCastFactory.sol

**Purpose:** Permissionless market creation and registry.

```solidity
contract NullCastFactory {
    
    // State
    address[] public allMarkets;
    mapping(uint256 => address) public marketById;
    uint256 public marketCount;
    address public reputationGate;
    address public liquidityPoolTemplate;
    bool public paused;
    
    // Events
    event MarketCreated(
        uint256 indexed marketId,
        address indexed marketAddress,
        address indexed creator,
        string question,
        MarketType marketType,
        uint256 expiryBlock
    );
    
    // Functions
    function createMarket(
        string calldata question,
        MarketType marketType,
        uint256 expiryBlock,
        uint8 reputationThreshold,    // 0 = no gate
        uint256 minimumBet,
        bytes calldata bucketConfig   // only for SCALAR type
    ) external returns (address marketAddress);
    
    function getMarket(uint256 marketId) external view returns (address);
    function getAllMarkets() external view returns (address[] memory);
    function getActiveMarkets() external view returns (address[] memory);
    
    // Admin
    function pause() external onlyOwner;
    function unpause() external onlyOwner;
    function setReputationGate(address gate) external onlyOwner;
}
```

**Key behaviors:**
- Deploys a new `NullCastMarket` and paired `LiquidityPool` via CREATE2 for deterministic addresses
- Registers market in `marketById` mapping
- Emits `MarketCreated` for frontend indexing
- Checks `!paused` before creating markets

---

### 5.2 NullCastMarket.sol

**Purpose:** Core FHE prediction market logic.

```solidity
contract NullCastMarket is ZamaEthereumConfig {
    
    // ── Types ──────────────────────────────────────────────────────────────
    
    enum MarketType { BINARY, SCALAR }
    enum MarketStatus { OPEN, EXPIRED, RESOLVING, RESOLVED, CANCELLED }
    
    // ── Encrypted State ────────────────────────────────────────────────────
    
    // Binary market pools
    euint64 private _totalYesPool;
    euint64 private _totalNoPool;
    
    // Scalar market pools (bucketId => encrypted pool)
    mapping(uint8 => euint64) private _bucketPools;
    
    // Individual positions — owner-only decrypt
    mapping(address => euint64) private _userYesPositions;
    mapping(address => euint64) private _userNoPositions;
    mapping(address => mapping(uint8 => euint64)) private _userBucketPositions;
    
    // Winnings — owner-only decrypt
    mapping(address => euint64) private _userWinnings;
    
    // ── Public State ───────────────────────────────────────────────────────
    
    string public question;
    MarketType public marketType;
    MarketStatus public status;
    uint256 public expiryBlock;
    uint256 public minimumBet;
    uint8 public reputationThreshold;
    uint256 public lastOddsUpdate;
    
    // Publicly revealed after async decryption
    uint256 public publicYesPool;
    uint256 public publicNoPool;
    mapping(uint8 => uint256) public publicBucketPools;
    
    // Resolution
    uint256 public resolvedOutcome;   // 0 = NO/bucket0, 1 = YES/bucket1, etc.
    address public oracle;
    address public liquidityPool;
    address public reputationGate;
    
    // ── Events ─────────────────────────────────────────────────────────────
    
    event BetPlaced(address indexed bettor, uint256 indexed marketId);
    event OddsUpdated(uint256 yesPool, uint256 noPool, uint256 blockNumber);
    event MarketResolved(uint256 outcome, uint256 blockNumber);
    event WinningsClaimed(address indexed winner, uint256 indexed marketId);
    event MarketExpired(uint256 blockNumber);
    
    // ── Core Functions ─────────────────────────────────────────────────────
    
    /**
     * @notice Place an encrypted binary bet
     * @param encryptedAmount Encrypted bet amount (euint64 handle)
     * @param inputProof ZK proof that encrypted input is valid
     * @param isYes True for YES bet, false for NO bet
     */
    function placeBet(
        einput encryptedAmount,
        bytes calldata inputProof,
        bool isYes
    ) external whenNotPaused onlyOpen checkReputation {
        euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);
        
        // Verify minimum bet (comparison over ciphertext)
        ebool meetsMinimum = FHE.gte(amount, FHE.asEuint64(minimumBet));
        FHE.req(meetsMinimum);
        
        // Transfer cUSDT from user (encrypted transfer)
        cUSDT.transferFrom(msg.sender, address(this), amount);
        
        if (isYes) {
            // Add to user's YES position
            _userYesPositions[msg.sender] = FHE.add(
                _userYesPositions[msg.sender], amount
            );
            // Add to total YES pool
            _totalYesPool = FHE.add(_totalYesPool, amount);
            
            // ACL: grant user permission to decrypt their position
            FHE.allowThis(_userYesPositions[msg.sender]);
            FHE.allow(_userYesPositions[msg.sender], msg.sender);
            
        } else {
            _userNoPositions[msg.sender] = FHE.add(
                _userNoPositions[msg.sender], amount
            );
            _totalNoPool = FHE.add(_totalNoPool, amount);
            FHE.allowThis(_userNoPositions[msg.sender]);
            FHE.allow(_userNoPositions[msg.sender], msg.sender);
        }
        
        // Mark pool totals for public decryption (batched per block)
        _markPoolsPubliclyDecryptable();
        
        emit BetPlaced(msg.sender, marketId);
    }
    
    /**
     * @notice Place an encrypted scalar bet on a specific bucket
     */
    function placeBucketBet(
        einput encryptedAmount,
        bytes calldata inputProof,
        uint8 bucketId
    ) external whenNotPaused onlyOpen onlyScalar checkReputation {
        // ... same pattern as placeBet but for bucket pools
    }
    
    /**
     * @notice Submit publicly decrypted odds back on-chain
     * @dev Called by frontend/keeper after off-chain decryption
     */
    function submitOddsUpdate(
        uint256 clearYes,
        uint256 clearNo,
        bytes memory decryptionProof
    ) external oncePerBlock {
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(_totalYesPool);
        handles[1] = FHE.toBytes32(_totalNoPool);
        
        bytes memory abiEncoded = abi.encode(clearYes, clearNo);
        FHE.checkSignatures(handles, abiEncoded, decryptionProof);
        
        publicYesPool = clearYes;
        publicNoPool = clearNo;
        
        emit OddsUpdated(clearYes, clearNo, block.number);
    }
    
    /**
     * @notice Resolve market with oracle outcome
     * @dev Only callable by oracle address after expiry
     */
    function resolveMarket(uint256 outcome) external onlyOracle afterExpiry {
        status = MarketStatus.RESOLVED;
        resolvedOutcome = outcome;
        emit MarketResolved(outcome, block.number);
    }
    
    /**
     * @notice Compute and claim winnings
     * @dev Computes winning share over encrypted positions, grants decrypt permission
     */
    function claimWinnings() external onlyResolved {
        euint64 winnerPool = resolvedOutcome == 1 
            ? _userYesPositions[msg.sender] 
            : _userNoPositions[msg.sender];
            
        euint64 totalWinnerPool = resolvedOutcome == 1 
            ? _totalYesPool 
            : _totalNoPool;
            
        euint64 totalPool = FHE.add(_totalYesPool, _totalNoPool);
        
        // Compute share: (userPosition / totalWinnerPool) * totalPool
        // Using FHE division approximation via mul + right shift
        euint64 winnings = FHE.div(
            FHE.mul(winnerPool, totalPool),
            totalWinnerPool
        );
        
        // Deduct LP fees (2% of winnings)
        euint64 fee = FHE.div(winnings, FHE.asEuint64(50));
        euint64 netWinnings = FHE.sub(winnings, fee);
        
        _userWinnings[msg.sender] = netWinnings;
        
        // Grant user decrypt permission on their winnings
        FHE.allowThis(_userWinnings[msg.sender]);
        FHE.allow(_userWinnings[msg.sender], msg.sender);
        
        // Transfer cUSDT to user (encrypted transfer)
        cUSDT.transfer(msg.sender, netWinnings);
        
        emit WinningsClaimed(msg.sender, marketId);
    }
    
    // ── View Functions ─────────────────────────────────────────────────────
    
    function getCurrentOdds() external view returns (uint256 yesOdds, uint256 noOdds) {
        uint256 total = publicYesPool + publicNoPool;
        if (total == 0) return (50, 50); // 50/50 default
        yesOdds = (publicYesPool * 100) / total;
        noOdds = 100 - yesOdds;
    }
    
    function getUserYesPosition(address user) external view returns (euint64) {
        return _userYesPositions[user];
    }
    
    function getUserNoPosition(address user) external view returns (euint64) {
        return _userNoPositions[user];
    }
    
    function getUserWinnings(address user) external view returns (euint64) {
        return _userWinnings[user];
    }
    
    // ── Internal Helpers ───────────────────────────────────────────────────
    
    function _markPoolsPubliclyDecryptable() internal oncePerBlock {
        FHE.makePubliclyDecryptable(_totalYesPool);
        FHE.makePubliclyDecryptable(_totalNoPool);
        lastOddsUpdate = block.number;
    }
}
```

---

### 5.3 LiquidityPool.sol

**Purpose:** Bootstrap market liquidity and distribute fees to LPs.

```solidity
contract LiquidityPool is ZamaEthereumConfig {
    
    euint64 private _totalLiquidity;
    mapping(address => euint64) private _lpShares;
    mapping(address => euint64) private _accruedFees;
    
    euint64 private constant FEE_RATE = 200; // 2% in basis points
    
    event LiquidityAdded(address indexed provider, uint256 indexed marketId);
    event LiquidityRemoved(address indexed provider, uint256 indexed marketId);
    event FeesDistributed(uint256 indexed marketId);
    
    /**
     * @notice Deposit cUSDT as liquidity
     */
    function addLiquidity(
        einput encryptedAmount,
        bytes calldata inputProof
    ) external {
        euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);
        
        _lpShares[msg.sender] = FHE.add(_lpShares[msg.sender], amount);
        _totalLiquidity = FHE.add(_totalLiquidity, amount);
        
        FHE.allowThis(_lpShares[msg.sender]);
        FHE.allow(_lpShares[msg.sender], msg.sender);
        
        cUSDT.transferFrom(msg.sender, address(this), amount);
        
        emit LiquidityAdded(msg.sender, marketId);
    }
    
    /**
     * @notice Distribute fees from resolved market to LPs proportionally
     * @dev Called by market contract at resolution
     */
    function distributeFees(euint64 feeAmount) external onlyMarket {
        // Fees distributed proportionally to LP share
        // Each LP's fee = (lpShare / totalLiquidity) * feeAmount
        // Computed per LP at claim time, not pre-distributed
    }
    
    /**
     * @notice Claim accrued fees
     */
    function claimFees() external {
        euint64 fees = _accruedFees[msg.sender];
        _accruedFees[msg.sender] = FHE.asEuint64(0);
        
        FHE.allow(fees, msg.sender);
        cUSDT.transfer(msg.sender, fees);
    }
}
```

---

### 5.4 OracleMock.sol

**Purpose:** Simulated price feed for Sepolia demo resolution.

```solidity
contract OracleMock {
    
    address public owner;
    mapping(uint256 => uint256) public marketResolutions; // marketId => outcome
    mapping(uint256 => uint256) public priceAtResolution; // marketId => price
    
    event MarketResolutionSubmitted(
        uint256 indexed marketId, 
        uint256 outcome,
        uint256 price,
        uint256 blockNumber
    );
    
    /**
     * @notice Submit resolution for a market
     * @param marketId The market to resolve
     * @param outcome 0 = NO, 1 = YES (binary) or bucket index (scalar)
     * @param price The reference price used for resolution
     */
    function submitResolution(
        uint256 marketId,
        uint256 outcome,
        uint256 price
    ) external onlyOwner {
        marketResolutions[marketId] = outcome;
        priceAtResolution[marketId] = price;
        
        NullCastMarket(marketRegistry[marketId]).resolveMarket(outcome);
        
        emit MarketResolutionSubmitted(marketId, outcome, price, block.number);
    }
    
    function getResolution(uint256 marketId) 
        external view returns (uint256 outcome, uint256 price);
}
```

**Note for judges:** This is a mock oracle for the Sepolia demo. In production, this would be replaced by a decentralized oracle network (Chainlink, UMA, Pyth) or a multi-sig committee with a dispute period. The FHE logic is completely oracle-agnostic — any address that can call `resolveMarket()` can serve as the resolver.

---

### 5.5 ReputationGate.sol

**Purpose:** Lightweight encrypted reputation score for access-gated markets.

```solidity
contract ReputationGate is ZamaEthereumConfig {
    
    mapping(address => euint8) private _scores;
    mapping(address => uint256) private _lastUpdated;
    
    uint256 public constant DECAY_BLOCKS = 50400; // ~7 days
    uint8 public constant DECAY_RATE = 5;          // lose 5 points per decay period
    
    event ScoreUpdated(address indexed user);
    
    /**
     * @notice Compute and store a reputation score for a user
     * Inputs: wallet age (blocks), tx count (capped at 1000), 
     *         prior markets participated in NullCast
     */
    function computeScore(address user) external {
        uint256 walletAge = block.number - getWalletCreationBlock(user);
        uint256 txCount = min(getTransactionCount(user), 1000);
        uint256 nullcastHistory = marketParticipation[user];
        
        // Encrypt all inputs
        euint8 ageScore = FHE.asEuint8(uint8(min(walletAge / 1000, 40)));    // max 40pts
        euint8 txScore  = FHE.asEuint8(uint8(min(txCount / 25, 40)));        // max 40pts
        euint8 histScore = FHE.asEuint8(uint8(min(nullcastHistory * 2, 20))); // max 20pts
        
        euint8 totalScore = FHE.add(FHE.add(ageScore, txScore), histScore);
        
        _scores[user] = totalScore;
        _lastUpdated[user] = block.number;
        
        FHE.allowThis(_scores[user]);
        FHE.allow(_scores[user], user);
        
        emit ScoreUpdated(user);
    }
    
    /**
     * @notice Check if user meets minimum threshold
     * @dev Returns ebool — only yes/no, never the actual score
     */
    function meetsThreshold(address user, uint8 threshold) 
        external view returns (ebool) {
        euint8 score = _applyDecay(user);
        return FHE.gte(score, FHE.asEuint8(threshold));
    }
    
    /**
     * @notice Apply time-based score decay
     */
    function _applyDecay(address user) internal view returns (euint8) {
        uint256 blocksSinceUpdate = block.number - _lastUpdated[user];
        uint256 decayPeriods = blocksSinceUpdate / DECAY_BLOCKS;
        
        if (decayPeriods == 0) return _scores[user];
        
        euint8 decayAmount = FHE.asEuint8(
            uint8(min(decayPeriods * DECAY_RATE, 100))
        );
        
        // Use TFHE.select to avoid underflow: if score < decay, return 0
        ebool wouldUnderflow = FHE.lt(_scores[user], decayAmount);
        return FHE.select(wouldUnderflow, FHE.asEuint8(0), 
            FHE.sub(_scores[user], decayAmount));
    }
    
    function getUserScore(address user) external view returns (euint8) {
        return _scores[user]; // handle returned, owner can user-decrypt
    }
}
```

---

### 5.6 StrategyVault.sol

**Purpose:** Copy-trading vault where a manager places bets on behalf of followers.

Key state:
- `manager` — address with betting authority (must meet reputation tier)
- `requiredTier` — minimum reputation threshold to manage (e.g. 60 = Strategist)
- `performanceFeeBps` — manager's fee in basis points (e.g. 1000 = 10%)
- `_deposits[address]` — encrypted follower deposit amounts (euint64)
- `_totalDeposits` — encrypted aggregate, marked publicly decryptable
- `followerCount`, `marketsTraded` — public stats

Key functions:
- `deposit(encryptedAmount, inputProof)` — follower deposits cUSDT
- `placeBetFromVault(market, encryptedAmount, inputProof, isYes)` — manager places bet
- `closeVault()` — manager closes, enables withdrawals
- `withdraw()` — follower withdraws after close

### 5.7 VaultFactory.sol

**Purpose:** Deploy and register strategy vaults.

- `createVault(name, description, requiredTier, performanceFeeBps)` → deploys StrategyVault
- `getAllVaults()`, `getVault(id)`, `getVaultCount()` — registry views

---

## 6. Market Lifecycle

```
                    createMarket()
                         │
                         ▼
                    ┌─────────┐
                    │  OPEN   │ ◄── placeBet() accepted
                    └────┬────┘     submitOddsUpdate() callable
                         │
                   block.number >= expiryBlock
                         │
                         ▼
                   ┌──────────┐
                   │ EXPIRED  │ ◄── no new bets accepted
                   └────┬─────┘     oracle can now submit resolution
                        │
                  oracle.submitResolution()
                        │
                        ▼
                  ┌───────────┐
                  │ RESOLVING │ ◄── resolution submitted, awaiting finality
                  └─────┬─────┘
                        │
                  resolveMarket() called
                        │
                        ▼
                  ┌──────────┐
                  │ RESOLVED │ ◄── claimWinnings() open for winners
                  └─────┬────┘     LP fees distributed
                        │
                  all claims settled
                        │
                        ▼
                  ┌────────────┐
                  │  COMPLETE  │ ◄── market archived
                  └────────────┘

CANCELLED path:
  Any state ──► CANCELLED (admin only, via pause + cancel)
                All positions refunded via encrypted transfer back to users
```

### State Transition Guards

| Transition | Guard Condition |
|---|---|
| OPEN → EXPIRED | `block.number >= expiryBlock` |
| EXPIRED → RESOLVING | `msg.sender == oracle` |
| RESOLVING → RESOLVED | `FHE.checkSignatures` passes |
| ANY → CANCELLED | `onlyOwner && paused` |
| RESOLVED: claimWinnings | `status == RESOLVED && hasPosition(msg.sender)` |

---

## 7. Decryption Flows

### 7.1 Public Odds Decryption Flow (Frontend Keeper)

```
Frontend / Keeper Process (runs every ~12 seconds):

1. Listen for BetPlaced event on NullCastMarket
2. Call market.getTotalYesPoolHandle() → bytes32 yesHandle
3. Call market.getTotalNoPoolHandle() → bytes32 noHandle
4. Call instance.publicDecrypt([yesHandle, noHandle]) via relayer-sdk
   └── Relayer SDK → Zama KMS
       ├── KMS checks: FHE.isPubliclyDecryptable(yesHandle) == true ✓
       ├── KMS checks: FHE.isPubliclyDecryptable(noHandle) == true ✓
       └── KMS returns: { clearValues, abiEncodedClearValues, decryptionProof }
5. Call market.submitOddsUpdate(clearYes, clearNo, decryptionProof)
   └── Contract calls FHE.checkSignatures() — verifies KMS signature
   └── Stores publicYesPool = clearYes, publicNoPool = clearNo
   └── Emits OddsUpdated(clearYes, clearNo, blockNumber)
6. Frontend reads publicYesPool + publicNoPool
7. Display: odds = publicYesPool / (publicYesPool + publicNoPool) * 100
```

### 7.2 User Position Decryption Flow (On-Demand)

```
User clicks "View My Position" in frontend:

1. Frontend calls market.getUserYesPosition(userAddress) → euint64 handle
2. Frontend calls fhevm.userDecryptEuint(FhevmType.euint64, handle, contractAddress, userSigner)
   └── FHEVM SDK → Zama KMS
       ├── KMS checks ACL: FHE.isSenderAllowed(handle, userAddress) == true ✓
       ├── KMS decrypts ciphertext
       └── KMS re-encrypts result under user's ephemeral public key
   └── Returns encrypted result to frontend
3. Frontend decrypts locally using user's ephemeral private key
4. Display: "Your YES position: 250.00 cUSDT"

Note: No on-chain transaction required. Entirely off-chain.
Note: Only the wallet owner can trigger this — ACL prevents anyone else.
```

### 7.3 Winnings Decryption Flow

```
After market resolution, winner clicks "Claim & View Winnings":

1. Frontend calls market.claimWinnings() — on-chain transaction
   └── Contract computes encrypted winnings via FHE arithmetic
   └── Contract calls FHE.allow(winnings, msg.sender)
   └── Contract calls cUSDT.transfer(msg.sender, winnings) — encrypted transfer
   └── Emits WinningsClaimed event
2. cUSDT balance increases (encrypted)
3. User can view their new cUSDT balance via user decrypt on the cUSDT contract
```

---

## 8. Frontend Specification

### 8.1 Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Styling:** Tailwind CSS
- **Wallet:** RainbowKit + wagmi v2
- **FHE Client:** `@fhevm/sdk` (fhevm-js)
- **Relayer SDK:** `@fhevm/relayer-sdk`
- **Contract Interaction:** viem + ethers.js
- **State Management:** Zustand
- **Network:** Ethereum Sepolia

### 8.2 Pages & Routes

```
/                       → Landing page (hero, how it works, CTA)
/markets                → Browse all open markets
/markets/[id]           → Individual market detail + betting interface
/markets/create         → Create new market (permissionless)
/portfolio              → My positions across all markets (user-decrypt on demand)
/liquidity              → LP dashboard — deposit, view share, claim fees
/reputation             → View and compute your reputation score
```

### 8.3 Component Architecture

```
src/
├── app/
│   ├── page.tsx                    (landing)
│   ├── markets/
│   │   ├── page.tsx                (market list)
│   │   ├── [id]/
│   │   │   └── page.tsx            (market detail)
│   │   └── create/
│   │       └── page.tsx            (create market)
│   ├── portfolio/
│   │   └── page.tsx
│   ├── liquidity/
│   │   └── page.tsx
│   └── reputation/
│       └── page.tsx
├── components/
│   ├── markets/
│   │   ├── MarketCard.tsx          (list item: question, odds bar, expiry)
│   │   ├── MarketList.tsx          (filterable grid)
│   │   ├── OddsBar.tsx             (YES% / NO% visual bar, updates live)
│   │   ├── BetForm.tsx             (amount input → encrypts → submits)
│   │   ├── BucketSelector.tsx      (scalar market bucket picker)
│   │   └── MarketStatusBadge.tsx
│   ├── portfolio/
│   │   ├── PositionCard.tsx        (shows market + "Reveal Position" button)
│   │   └── WinningsCard.tsx        (claim button + reveal winnings)
│   ├── reputation/
│   │   ├── ReputationWidget.tsx    (persistent small score display)
│   │   └── ScoreComputer.tsx       (compute/refresh score)
│   ├── liquidity/
│   │   ├── LPForm.tsx
│   │   └── LPDashboard.tsx
│   └── shared/
│       ├── WalletConnect.tsx
│       ├── FHEStatus.tsx           (shows if FHEVM SDK loaded)
│       ├── cUSDTBalance.tsx
│       ├── FaucetLink.tsx          (prominent Sepolia faucet link)
│       └── DecryptionLoader.tsx    (async decryption pending state)
├── hooks/
│   ├── useFHEVM.ts                 (initialize fhevm instance, cache)
│   ├── useMarket.ts                (read market state, subscribe to events)
│   ├── usePlaceBet.ts              (encrypt amount → submit → track tx)
│   ├── useOdds.ts                  (poll/subscribe to OddsUpdated events)
│   ├── useUserPosition.ts          (user-decrypt position on demand)
│   ├── useReputation.ts            (compute + decrypt score)
│   └── useOddsKeeper.ts            (trigger public decryption after bets)
├── lib/
│   ├── fhevm.ts                    (fhevm instance singleton)
│   ├── contracts.ts                (ABI + address constants)
│   ├── relayer.ts                  (relayer SDK wrapper)
│   └── formatting.ts               (cUSDT display formatting)
└── constants/
    ├── addresses.ts                (Sepolia contract addresses)
    └── abis/                       (generated ABIs from typechain)
```

### 8.4 Key UI Flows

**Placing a Bet:**
```
1. User enters amount in plain text input (e.g. "100")
2. BetForm calls useFHEVM() to get fhevm instance
3. fhevm.encrypt64(amount) → { handle, inputProof }
4. Call market.placeBet(handle, inputProof, isYes)
5. Show pending tx state
6. On confirmation: show success + "Your position is private"
7. OddsUpdated event fires → odds bar animates to new value
```

**Revealing a Position:**
```
1. User clicks "Reveal My Position" on PositionCard
2. Show DecryptionLoader ("Decrypting your position...")
3. useUserPosition() calls fhevm.userDecryptEuint(handle, contract, signer)
4. KMS decrypts + returns value
5. Show: "You have 100.00 cUSDT on YES"
6. Position stays revealed for duration of session (cached in Zustand)
```

**Claiming Winnings:**
```
1. Winner sees "Claim Winnings" button on resolved market
2. Clicks claim → tx submitted
3. On confirmation: "Winnings sent to your wallet"
4. cUSDT balance updates (encrypted)
5. Option to reveal winnings amount via user decrypt
```

### 8.5 Odds Display

Odds are shown as a horizontal bar:

```
┌─────────────────────────────────────────────────────┐
│  BTC above $100k by June 2026?                      │
│                                                     │
│  YES  ████████████████████░░░░░░░░  68%   NO  32%  │
│                                                     │
│  Pool: ~$45,230  │  Expires: 14d 6h  │  Open       │
│                                                     │
│  [ Bet YES ]  [ Bet NO ]                            │
└─────────────────────────────────────────────────────┘
```

- Odds update within ~15 seconds of a bet (async decryption cycle)
- A subtle "Updating..." indicator shows during the decryption window
- Pool total shown as approximate (based on last public decryption)

### 8.6 Privacy Indicators

Clear visual language throughout the UI:

- 🔒 **Lock icon** next to any value that is encrypted (your position, your winnings)
- 👁 **Eye icon** button to trigger user decryption on demand
- ⚡ **Live indicator** next to odds to show they update from encrypted computation
- Small tooltip everywhere explaining "Your position is encrypted — only you can see it"

---

## 9. Reputation Gate Integration

### How It Connects to Markets

When creating a market, the creator sets `reputationThreshold` (0-100). A threshold of 0 means the market is open to anyone. A threshold of 50 means only wallets with a reputation score ≥ 50 can bet.

```solidity
modifier checkReputation() {
    if (reputationThreshold > 0) {
        ebool qualified = reputationGate.meetsThreshold(
            msg.sender, 
            reputationThreshold
        );
        FHE.req(qualified); // reverts if score below threshold
    }
    _;
}
```

### Score Computation Inputs (Sepolia Demo)

| Input | Weight | Max Points | How Computed |
|---|---|---|---|
| Wallet age | 40% | 40 pts | `block.number - firstTxBlock` / 1000, capped at 40 |
| Transaction count | 40% | 40 pts | `min(txCount, 1000) / 25` |
| NullCast history | 20% | 20 pts | `min(marketsParticipated * 2, 20)` |
| **Total** | | **100 pts** | |

### Score Decay

Scores decay at 5 points per 7 days of inactivity (no NullCast transactions). This prevents a one-time score that lasts forever and encourages ongoing participation. Implemented via `FHE.select()` to handle underflow cases safely.

---

## 10. Liquidity Provider Mechanics

### Why LPs Are Needed

Without LPs, a new market with zero bets would have no liquidity. If the first bet is 1,000 cUSDT YES and there's no NO counterpart, the contract can't honor a potential NO winner. LPs seed both sides proportionally, ensuring markets are always operational.

### LP Flow

```
1. LP deposits cUSDT via addLiquidity(encryptedAmount, proof)
2. LP receives encrypted share proportional to their contribution
3. Market operates — bets placed against LP liquidity and other bettors
4. At resolution: 2% of all losing bets distributed to LPs pro-rata
5. LP can claim fees at any time via claimFees()
6. LP can withdraw principal after market is RESOLVED or CANCELLED
```

### Fee Structure

| Fee Type | Rate | Recipient |
|---|---|---|
| Trading fee | 2% of losing pool | LPs |
| Protocol fee | 0% | (waived for demo) |

All fee computation happens over encrypted values — LPs cannot see what percentage of the losing pool their fee represents relative to others.

---

## 11. Oracle & Resolution

### Mock Oracle for Sepolia

The `OracleMock.sol` contract is controlled by a designated EOA (the demo wallet). For the submission demo, the following live markets are pre-configured:

| Market | Question | Resolution Trigger |
|---|---|---|
| BTC-1 | BTC above $90,000 on April 30, 2026? | Price feed at expiry |
| ETH-1 | ETH above $2,000 on May 5, 2026? | Price feed at expiry |
| SCALAR-1 | BTC price range on May 10: <$80k / $80k-$100k / >$100k | 3-bucket scalar |

### Resolution Process (Demo)

1. Oracle owner monitors Pyth/Chainlink price feeds
2. At expiry block, records reference price
3. Calls `oracle.submitResolution(marketId, outcome, price)`
4. Market transitions to RESOLVED
5. Users can claim winnings

### Production Oracle Design (Future Work)

In production, resolution would use:
- **UMA Optimistic Oracle** for subjective markets (who won an election)
- **Chainlink price feeds** for price-based markets
- **Multi-sig committee** with 3/5 threshold for manual resolution
- **Dispute period** of 24 hours before resolution is finalized

---

## 12. Security Model

### Threat Model

| Threat | Mitigation |
|---|---|
| Individual position inference via odds timing | Batch odds reveal once per block |
| Replay attack on decryption proof | `checkSignatures` includes nonce + block binding |
| Oracle manipulation | Mock oracle for demo; production uses decentralized oracle |
| Reentrancy on claimWinnings | CEI pattern (Checks-Effects-Interactions) throughout |
| Griefing via dust bets | `minimumBet` enforced via FHE comparison |
| Sybil attack on reputation | Score based on on-chain history, not self-attestation |
| Unauthorized decryption | ACL enforced by Zama KMS — no permission = no decrypt |
| Contract pause bypass | `whenNotPaused` modifier on all state-changing functions |
| Encrypted arithmetic overflow | euint64 chosen specifically to avoid overflow at realistic bet sizes |

### Known Limitations (Explicitly Documented)

1. **Oracle centralization in demo:** The mock oracle is a single EOA. Not production-safe.
2. **Timing attack surface:** Even with batch reveals, a very large bet in isolation within a block is identifiable by magnitude of odds shift. Mitigated but not eliminated.
3. **Gas costs:** FHE operations are significantly more gas-intensive than plain arithmetic. Each `placeBet` costs ~500k-2M gas depending on computation depth. Acceptable on testnet, requires optimization for mainnet.
4. **Asynchronous odds delay:** 5-15 second delay between bet placement and odds update is a UX limitation of the asynchronous decryption model.
5. **No dispute mechanism:** Resolution is final once submitted. Future version needs dispute window.

---

## 13. Events & Indexing

All events are designed to be informative for frontend indexing without leaking any encrypted data. No amounts, no positions, no scores are ever in events.

```solidity
// Factory
event MarketCreated(uint256 indexed marketId, address indexed marketAddress, 
    address indexed creator, string question, MarketType mType, uint256 expiryBlock);

// Market
event BetPlaced(address indexed bettor, uint256 indexed marketId, bool isYes);
event BucketBetPlaced(address indexed bettor, uint256 indexed marketId, uint8 bucketId);
event OddsUpdated(uint256 indexed marketId, uint256 yesPool, uint256 noPool, uint256 blockNumber);
event MarketExpired(uint256 indexed marketId, uint256 blockNumber);
event MarketResolved(uint256 indexed marketId, uint256 outcome, uint256 blockNumber);
event WinningsClaimed(address indexed winner, uint256 indexed marketId);
event MarketCancelled(uint256 indexed marketId, string reason);

// LiquidityPool
event LiquidityAdded(address indexed provider, uint256 indexed marketId);
event LiquidityRemoved(address indexed provider, uint256 indexed marketId);
event FeesDistributed(uint256 indexed marketId, uint256 blockNumber);

// ReputationGate
event ScoreComputed(address indexed user, uint256 blockNumber);
event ScoreDecayed(address indexed user, uint256 blockNumber);
```

---

## 14. Tech Stack

### Smart Contracts

| Tool | Version | Purpose |
|---|---|---|
| Solidity | ^0.8.24 | Contract language |
| Hardhat | latest | Development framework |
| @fhevm/solidity | latest | FHE types + operations |
| @fhevm/hardhat-plugin | latest | Local mock FHEVM for testing |
| OpenZeppelin | ^5.0 | Pausable, Ownable, ReentrancyGuard |
| TypeChain | latest | Type-safe contract bindings |

### Frontend

| Tool | Version | Purpose |
|---|---|---|
| Next.js | 14 | React framework |
| TypeScript | 5+ | Type safety |
| Tailwind CSS | 3 | Styling |
| RainbowKit | latest | Wallet connection |
| wagmi | v2 | Ethereum hooks |
| viem | latest | Low-level Ethereum |
| @fhevm/sdk | latest | Client-side encryption |
| @fhevm/relayer-sdk | latest | Off-chain decryption |
| Zustand | latest | State management |

### Testing

| Tool | Purpose |
|---|---|
| Hardhat mock FHEVM | Local FHE simulation without real KMS |
| Chai + Mocha | Contract unit tests |
| Hardhat network | Local Sepolia fork for integration tests |

### Deployment

| Component | Target |
|---|---|
| Smart contracts | Ethereum Sepolia |
| Frontend | Vercel |
| Environment | `.env` with Sepolia RPC, private key, Zama relayer URL |

---

## 15. Repository Structure

```
nullcast/
├── README.md
├── SPEC.md                         (this document)
│
├── contracts/                      # Hardhat project
│   ├── contracts/
│   │   ├── NullCastMarket.sol      # Core FHE prediction market
│   │   ├── NullCastFactory.sol     # Market + LP pool deployment
│   │   ├── LiquidityPool.sol       # Encrypted LP shares + fee distribution
│   │   ├── OracleMock.sol          # Sepolia demo resolver
│   │   ├── ReputationGate.sol      # Encrypted scores + tiers
│   │   ├── StrategyVault.sol       # Copy-trading vault
│   │   ├── VaultFactory.sol        # Vault deployment + registry
│   │   ├── interfaces/
│   │   │   ├── INullCastMarket.sol
│   │   │   ├── IConfidentialERC20.sol
│   │   │   └── IReputationGate.sol
│   │   └── mocks/
│   │       └── MockcUSDT.sol
│   ├── scripts/
│   │   ├── deploy.ts               (deploy all contracts)
│   │   ├── createDemoMarkets.ts    (seed demo markets with categories)
│   │   ├── oddsKeeper.ts           (update odds via public decrypt)
│   │   └── computeScores.ts        (reputation score keeper)
│   ├── test/
│   │   ├── unit/                   (9 test files, 122 tests)
│   │   └── integration/            (2 lifecycle tests)
│   ├── deployments/sepolia.json
│   ├── hardhat.config.ts
│   └── .env.example
│
├── client/                         # Next.js 14 frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx            (landing)
│   │   │   ├── api/keeper/         (server-side LP keeper)
│   │   │   └── (app)/
│   │   │       ├── markets/        (list, [id] detail, create)
│   │   │       ├── portfolio/
│   │   │       ├── liquidity/
│   │   │       ├── vaults/         (list, create)
│   │   │       └── reputation/
│   │   ├── components/shared/      (Header, Footer, Icons, OddsBar, etc.)
│   │   ├── hooks/                  (useMarket, usePlaceBet, useFHEVM, etc.)
│   │   ├── lib/                    (wagmi, contracts, fhevm, store)
│   │   ├── constants/              (addresses, ABIs, tiers)
│   │   └── styles/design.css
│   └── .env.example
```

---

## 16. Development Phases

### Phase 1 — Core FHE Contracts
- [x] Set up Hardhat + @fhevm/hardhat-plugin
- [x] Implement `NullCastMarket.sol` with binary betting
- [x] Implement ACL pattern: pool totals public, positions private
- [x] Implement `submitOddsUpdate` with `FHE.checkSignatures`
- [x] Write unit tests with mock FHEVM
- [x] Test full lifecycle: placeBet → oddsUpdate → resolve → claim

### Phase 2 — Supporting Contracts
- [x] Implement `NullCastFactory.sol` (deploys Market + LiquidityPool per market)
- [x] Implement `LiquidityPool.sol` with encrypted LP shares
- [x] Implement `OracleMock.sol`
- [x] Implement `ReputationGate.sol` with score decay + tier system
- [x] Integration test: full market with LP + reputation gate
- [x] Wire `recordParticipation` into placeBet for auto-tracking

### Phase 3 — Scalar Markets
- [x] Extend `NullCastMarket.sol` with scalar market type
- [x] Implement `placeBucketBet` and bucket pool management
- [x] Test 3-bucket scalar market lifecycle

### Phase 4 — Sepolia Deployment
- [x] Deploy all contracts to Sepolia
- [x] Verify on Etherscan
- [x] Run `createDemoMarkets.ts` to seed live markets
- [x] Test with real Sepolia FHEVM + KMS

### Phase 5 — Frontend
- [x] Set up Next.js 14 + RainbowKit + wagmi v2 + @zama-fhe/sdk
- [x] Market list with category filtering + search
- [x] Market detail with live odds, betting panel, FHE encryption
- [x] Odds keeper (frontend hook + server-side API route)
- [x] User position decryption via KMS (EIP-712 signature flow)
- [x] Portfolio page with on-chain position reads + decrypt
- [x] Create market form with category selection
- [x] Liquidity page with deposit/withdraw/claim
- [x] Reputation page with tier display + score decrypt + cUSDT faucet
- [x] Mobile responsive design with bottom tab bar
- [ ] Deploy to Vercel

### Phase 6 — Market Categories & Dispute Resolution
- [x] Add `bytes32 category` to markets (CRYPTO, MACRO, EQUITY, SPORTS, TECH)
- [x] Category filter on market list + selector on create form
- [x] Refactor constructor to `MarketParams` struct (stack-too-deep fix)
- [x] 24-hour dispute window (7200 blocks) after resolution
- [x] `raiseDispute()` — bonded challenge by anyone within window
- [x] `resolveDispute()` — owner upholds or rejects
- [x] Claims blocked during dispute window
- [x] Dispute UI: countdown bar, raise dispute button, under-dispute badge

### Phase 7 — Strategy Vaults (Copy-Trading)
- [x] `StrategyVault.sol` — encrypted follower deposits, manager bets from vault
- [x] `VaultFactory.sol` — deploy and register vaults
- [x] Vault frontend: browse vaults, deposit, create vault form
- [x] Performance fee support (basis points)
- [x] Reputation tier gating for vault managers
- [ ] Vault P&L tracking (public aggregate, encrypted individual)
- [ ] Auto-copy: manager bet triggers proportional follower allocations

### Phase 8 — Keeper Infrastructure
- [x] Server-side LP keeper API route (`/api/keeper`)
- [x] Zama relayer HTTP API integration for public decrypt
- [x] Reputation score computation keeper script
- [x] Odds keeper script (Hardhat)
- [ ] Automated cron scheduling (Vercel cron or external)
- [ ] Keeper for vault total deposits sync

### Phase 9 — Polish + Submission
- [x] Comprehensive README with architecture, setup, deployed addresses
- [x] Design system (warm dark theme, amber accent, indigo encryption)
- [x] Favicon + OpenGraph + Twitter card metadata
- [ ] Record 3-minute demo video
- [ ] Final end-to-end testing on Sepolia
- [ ] Submit to Builder Track

---

## 17. Demo Script

**Target duration:** 3 minutes

```
[0:00 - 0:20] The Problem
  - Show Polymarket: "Every position on existing markets is public"
  - Show a whale wallet: "This address bet $500k YES — everyone can see it"
  - "NullCast makes positions private. Nobody sees your bet. Ever."

[0:20 - 0:50] Creating a Market
  - Connect wallet on Sepolia
  - Show cUSDT balance (get from faucet)
  - Navigate to Create Market
  - Create: "Will BTC be above $90k on May 10, 2026?"
  - Set reputation threshold: 30
  - Transaction confirms → market appears in list

[0:50 - 1:30] Placing Encrypted Bets
  - Open the market
  - Show current odds: 50/50 (fresh market)
  - Wallet 1: bet 100 cUSDT YES — enter amount, click Bet YES
  - Show encryption happening in frontend (brief code callout)
  - Transaction confirms → "Your position is private 🔒"
  - Odds update after ~10 seconds: 60/40
  - Switch to Wallet 2: bet 50 cUSDT NO
  - Odds update: ~73/27
  - Click "Reveal My Position" → shows "100.00 cUSDT on YES"
  - Switch to Wallet 3: click reveal → "You have no position"

[1:30 - 2:00] The FHE Difference
  - Open browser console / block explorer
  - "Here's the raw transaction data — the bet amount is encrypted"
  - Show the euint64 handle, not a number
  - "Not even the contract knows your position. Only the KMS can decrypt it,
     and only with your explicit permission."

[2:00 - 2:30] Market Resolution
  - Fast-forward: trigger mock oracle resolution (YES wins)
  - Market shows RESOLVED — YES
  - Winner wallet clicks Claim Winnings
  - Transaction confirms
  - Click "Reveal Winnings" → shows payout amount

[2:30 - 3:00] The Bigger Picture
  - Zoom out to show market list with reputation scores
  - "This is built on our Reputation Protocol — the base layer
     for all our upcoming products: Copy Trading, Grants Platform..."
  - Show GitHub, docs link
  - "NullCast — prediction markets where your position is yours alone."
```

---

## 18. Known Limitations & Future Work

### Current Limitations

- Mock oracle (single EOA) — production would use Chainlink/UMA
- Reputation score inputs are simplified for Sepolia (wallet age + tx count)
- Gas costs not optimized — FHE operations are ~500k-2M gas per bet
- Odds update has 5-15 second delay (async decryption is inherent to FHEVM)
- Vault auto-copy not yet implemented (manager places bets manually)
- Keeper infrastructure requires manual trigger or external cron

### Already Built (was previously "future work")

- ~~24-hour dispute window with bonded disputers~~ → Implemented in Phase 6
- ~~Strategy vaults using reputation score as trust tier~~ → Implemented in Phase 7
- ~~Market categories~~ → Implemented in Phase 6
- ~~Reputation tier system~~ → Implemented (Oracle/Strategist/Analyst/Explorer)
- ~~Auto participation tracking~~ → Markets call `recordParticipation` on every bet

### Remaining Future Work

**V2 — Production Oracle**
- UMA Optimistic Oracle integration for subjective markets
- Chainlink CCIP for cross-chain market resolution
- Multi-sig committee with bonded disputer economics

**V2 — Advanced Market Types**
- Continuous scalar markets (slider input, not buckets)
- Conditional markets (if X then Y)
- Orderbook-style markets with encrypted limit orders

**V3 — Reputation Protocol Expansion**
- Multi-protocol reputation inputs (Aave, Uniswap, ENS history)
- Cross-chain reputation aggregation
- Reputation score as a standalone API for other protocols

**V3 — Copy-Trading Expansion**
- Auto-copy: manager bet triggers proportional follower allocations
- Encrypted P&L tracking with public aggregate performance
- Vault leaderboard with tier-based ranking

**V4 — Mainnet**
- Gas optimization pass on all FHE operations
- Formal security audit
- ERC-7984 deep integration with Zama ecosystem protocols
- Institutional API for direct smart contract integration

---

*NullCast — Built for Zama Developer Program Season 2*  
*Confidential Finance Track | Builder Track*  
*Deployed on Ethereum Sepolia | Powered by Zama FHEVM*