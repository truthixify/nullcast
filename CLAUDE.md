# NullCast — CLAUDE.md
## Project Instructions for Claude Code

> These instructions are authoritative. They OVERRIDE any default Claude Code behavior.
> Read this file completely before taking any action in this project.

---

## Project Context

NullCast is a confidential prediction market protocol built on Zama's FHEVM (Fully Homomorphic Encryption Virtual Machine) deployed on Ethereum Sepolia. Users place encrypted bets using euint64 types. Individual positions are private, aggregate odds are publicly decryptable. Currency is cUSDT (ERC-7984).

See `SPEC.md` for the full technical specification. See `NULLCAST_SPEC.md` for the complete product spec.

**Stack:**
- Solidity ^0.8.24 + Hardhat + @fhevm/solidity + @fhevm/hardhat-plugin
- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- RainbowKit + wagmi v2 + viem
- @fhevm/sdk + @fhevm/relayer-sdk
- Zustand for state management
- Network: Ethereum Sepolia testnet

---

## CRITICAL: Git Rules

### NO Co-Author Lines — EVER

NEVER add any of the following to commit messages:
- `Co-Authored-By: Claude`
- `Co-Authored-By: Claude Sonnet`
- `🤖 Generated with Claude Code`
- Any AI attribution line of any kind

Commit messages must be clean. No trailers. No footers referencing AI tools.

**Correct commit format:**
```
feat(market): add encrypted bet placement with ACL permission assignment

- Implement placeBet() with euint64 position tracking
- Add FHE.allowThis + FHE.allow for owner-only decryption
- Update totalYesPool and totalNoPool via TFHE.add
- Enforce minimum bet via FHE.gte comparison
```

**Wrong — never do this:**
```
feat(market): add bet placement

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

### Commit Frequency

- Commit after EVERY logical unit of work — do not batch unrelated changes
- One concern per commit — a contract function, a test suite, a component, a config change
- Never commit broken code — all tests must pass before committing
- Use conventional commit prefixes:
  - `feat(scope):` — new feature or function
  - `fix(scope):` — bug fix
  - `test(scope):` — adding or fixing tests
  - `refactor(scope):` — code change that neither fixes a bug nor adds a feature
  - `chore(scope):` — build process, dependency updates, config changes
  - `docs(scope):` — documentation only
  - `style(scope):` — formatting, no logic change

**Scopes to use:** `market`, `factory`, `liquidity`, `oracle`, `reputation`, `frontend`, `hooks`, `deploy`, `test`, `config`

### Push Rules

- Push at the end of every completed phase (Phase 1 through Phase 6 as defined in SPEC.md)
- Push after any deployment to Sepolia
- Always push to the correct branch — never force-push to `main`
- Branch naming: `feat/phase-1-contracts`, `feat/phase-2-supporting-contracts`, etc.

### NEVER Commit These Files

```
.env
.env.local
.env.sepolia
.env.production
.env.*
deployments/private/
*.key
*.pem
mnemonic.txt
private-key.txt
```

These must be in `.gitignore`. If any of these files are ever accidentally staged, STOP immediately, unstage them, and tell the user before doing anything else.

---

## CRITICAL: Security Rules

### Private Keys & Secrets

NEVER:
- Hardcode private keys anywhere in source code
- Hardcode RPC URLs with API keys in source code
- Log private keys, mnemonics, or sensitive env vars to console
- Include secrets in test files, even test secrets
- Commit `.env` files under any circumstances

ALWAYS:
- Use `process.env.VARIABLE_NAME` for all secrets
- Reference `.env.example` (without real values) as the template
- Validate required env vars exist at startup and fail loudly if missing

```typescript
// CORRECT
const privateKey = process.env.DEPLOYER_PRIVATE_KEY;
if (!privateKey) throw new Error("DEPLOYER_PRIVATE_KEY not set in .env");

// WRONG — never do this
const privateKey = "0xabc123...";
```

### Smart Contract Security

- Always use CEI pattern (Checks → Effects → Interactions) in all state-changing functions
- Always add reentrancy guards (`nonReentrant`) on any function that transfers tokens
- Always validate encrypted inputs with `FHE.req()` before using them in state changes
- Never call external contracts before updating internal state
- Always emit events after state changes, not before
- Add `whenNotPaused` modifier on all user-facing state-changing functions

---

## Coding Standards

### Solidity

- Solidity version: `^0.8.24` — always explicit, never floating
- License identifier on every file: `// SPDX-License-Identifier: MIT`
- NatSpec on every public/external function:
  ```solidity
  /**
   * @notice Brief description of what the function does
   * @dev Technical details relevant to developers
   * @param paramName Description of the parameter
   * @return Description of return value
   */
  ```
- Custom errors over `require` strings (more gas efficient):
  ```solidity
  // CORRECT
  error MarketNotOpen(uint256 marketId, MarketStatus status);
  if (status != MarketStatus.OPEN) revert MarketNotOpen(marketId, status);

  // WRONG
  require(status == MarketStatus.OPEN, "Market not open");
  ```
- State variable visibility always explicit (`public`, `private`, `internal`)
- Private state variables prefixed with underscore: `_totalYesPool`, `_userPositions`
- Constants in SCREAMING_SNAKE_CASE: `uint256 public constant MIN_BET = 1e6`
- Events before state changes are checked — emit AFTER state is updated
- No magic numbers — name all constants
- Mappings named descriptively: `mapping(address => euint64) private _userYesPositions`
- Group contract layout in order: errors → events → state → constructor → modifiers → external → public → internal → private

### TypeScript / Frontend

- Strict TypeScript: `"strict": true` in tsconfig — no `any` types unless explicitly justified with a comment
- Named exports only — no default exports except for Next.js pages
- File naming: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- No `console.log` in committed code — use a proper logger or remove before committing
- Async/await everywhere — no raw Promise chains
- Always handle loading, error, and empty states in components
- All contract interaction hooks must handle: loading state, error state, transaction pending, transaction confirmed
- Never expose raw private keys or sensitive data in client-side code

```typescript
// CORRECT: explicit types, named export, error handling
export async function placeBet(
  marketId: bigint,
  amount: bigint,
  isYes: boolean
): Promise<TransactionReceipt> {
  if (!amount || amount <= 0n) {
    throw new Error("Bet amount must be positive");
  }
  // ...
}

// WRONG
export default async function placeBet(marketId, amount, isYes) {
  // ...
}
```

### FHE-Specific Patterns

- Always call `FHE.allowThis()` AND `FHE.allow(value, recipient)` together when creating encrypted values for users — never one without the other
- Never call `FHE.makePubliclyDecryptable()` on individual user positions — only on aggregate pool totals
- Use `FHE.select()` instead of if/else on encrypted values — never branch on encrypted booleans
- Comment every FHE operation explaining WHY it needs to be encrypted:
  ```solidity
  // Encrypted: individual bet amounts must never be publicly visible
  // to prevent whale tracking and front-running
  euint64 amount = FHE.asEuint64(encryptedAmount, inputProof);
  ```
- Always validate `FHE.isInitialized(value)` before operating on stored encrypted values

---

## Testing Requirements

### Coverage Standard

EVERY contract function must have tests. No exceptions. Minimum coverage targets:
- Unit tests: 100% of functions, including revert paths
- Integration tests: full lifecycle per market type (binary, scalar)
- Edge cases: zero amounts, expired markets, double-claim attempts, unauthorized callers

### Test File Structure

Mirror the contracts directory:
```
test/
├── unit/
│   ├── NullCastMarket.test.ts     — one test file per contract
│   ├── LiquidityPool.test.ts
│   ├── OracleMock.test.ts
│   ├── ReputationGate.test.ts
│   └── NullCastFactory.test.ts
└── integration/
    ├── binaryMarketLifecycle.test.ts
    ├── scalarMarketLifecycle.test.ts
    └── reputationGatedMarket.test.ts
```

### Test Writing Rules

- Use `@fhevm/hardhat-plugin` mock environment for all local tests — never hit real Sepolia in unit tests
- Descriptive test names that read like sentences:
  ```typescript
  // CORRECT
  it("should revert with MarketNotOpen when placing bet on expired market", async () => {

  // WRONG
  it("test bet fail", async () => {
  ```
- Test structure: Arrange → Act → Assert, with blank lines between sections
- Every `revert` must be tested with `expect(...).to.be.revertedWithCustomError()`
- Test both happy path AND all revert conditions for every function
- FHE mock tests must verify ACL state after operations:
  ```typescript
  // After placeBet, verify ACL permissions were set correctly
  expect(await fhevm.isAllowed(position, userAddress)).to.be.true;
  expect(await fhevm.isAllowed(position, otherAddress)).to.be.false;
  ```
- Never use `setTimeout` in tests — use `mine()` or `advanceToBlock()` for time-based logic

### Run Tests Before Committing

ALWAYS run the test suite before committing. If any test fails, fix it before committing.

```bash
# Run all tests
npx hardhat test

# Run specific file
npx hardhat test test/unit/NullCastMarket.test.ts

# Run with gas report
REPORT_GAS=true npx hardhat test

# Type check frontend
cd frontend && npx tsc --noEmit
```

---

## Development Workflow

### Before Starting Any Task

1. Read the relevant section of `SPEC.md` to understand what you're building
2. Check existing code for patterns to follow — don't invent new patterns when existing ones work
3. Identify which tests will need to be written or updated
4. If the task touches more than 3 files, ask before starting — confirm the approach

### Implementation Order Per Phase

Follow the phases in `SPEC.md` exactly:
- **Phase 1:** `NullCastMarket.sol` core + unit tests
- **Phase 2:** `NullCastFactory`, `LiquidityPool`, `OracleMock`, `ReputationGate` + tests
- **Phase 3:** Scalar market extension + tests
- **Phase 4:** Sepolia deployment + verification
- **Phase 5:** Frontend (Next.js)
- **Phase 6:** Polish + demo prep

Do NOT start a new phase until all tests in the current phase pass.

### After Completing Each Phase

1. Run full test suite — all must pass
2. Run TypeScript type check on frontend (Phase 5+)
3. Commit all changes with descriptive conventional commit messages
4. Push to the phase branch
5. Tell the user: "Phase X complete. All N tests passing. Pushed to [branch]."

### Asking Before Acting

STOP and ask the user if:
- A task would modify more than 5 files
- You're uncertain about an architectural decision not covered in SPEC.md
- A test is failing and the fix isn't obvious
- You're about to delete or significantly restructure existing code
- Anything requires adding a new dependency

---

## File & Directory Rules

### Never Modify Without Being Asked

- `SPEC.md` — the spec is authoritative, never change it unilaterally
- `CLAUDE.md` — this file
- `.gitignore` — only add to it, never remove entries
- `hardhat.config.ts` — ask before modifying network config
- Any deployment script that has already been run against Sepolia

### .gitignore Must Always Include

```
.env
.env.*
!.env.example
node_modules/
artifacts/
cache/
coverage/
typechain-types/
deployments/sepolia-private/
*.key
*.pem
mnemonic.txt
.DS_Store
frontend/.next/
frontend/out/
```

### Environment Variables

Use this exact structure for `.env.example` (committed) vs `.env` (never committed):

```bash
# .env.example — commit this
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID
DEPLOYER_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_KEY
ZAMA_RELAYER_URL=https://relayer.zama.ai
NEXT_PUBLIC_CHAIN_ID=11155111
NEXT_PUBLIC_FACTORY_ADDRESS=0x0000000000000000000000000000000000000000
```

---

## Hardhat Configuration Rules

- Always use named networks: `sepolia` and `hardhat` (local)
- Gas reporter enabled by default when `REPORT_GAS=true`
- Typechain output to `typechain-types/`
- Compiler optimizer: `enabled: true, runs: 200`
- Always verify contracts after deployment:
  ```bash
  npx hardhat verify --network sepolia DEPLOYED_ADDRESS constructor_args
  ```

---

## Deployment Checklist

Before running any deployment script to Sepolia:

- [ ] All unit tests passing locally
- [ ] All integration tests passing locally  
- [ ] `.env` is populated with real Sepolia values (never committed)
- [ ] Sufficient Sepolia ETH in deployer wallet
- [ ] Contract addresses from previous deployments saved in `deployments/sepolia.json`
- [ ] Contracts not already deployed at expected addresses

After deployment:
- [ ] Save all deployed addresses to `deployments/sepolia.json`
- [ ] Verify all contracts on Etherscan
- [ ] Run `createDemoMarkets.ts` to seed live demo markets
- [ ] Test live contracts manually before announcing

---

## What NOT To Do

- Do NOT add `console.log` statements to Solidity contracts (use events)
- Do NOT use `tx.origin` anywhere — always `msg.sender`
- Do NOT use floating pragma (`^` is fine, `>=0.8.0` is not)
- Do NOT use `transfer()` or `send()` for ETH — use `call{value: amount}("")`
- Do NOT write TODO comments without a GitHub issue number: `// TODO #42: add dispute window`
- Do NOT import unused variables or contracts
- Do NOT write tests that depend on each other's state — every test must be independent
- Do NOT use `any` type in TypeScript without a comment explaining why
- Do NOT run `git push --force` on any branch
- Do NOT install new npm packages without telling the user first
- Do NOT skip writing tests because "it's obvious it works"
- Do NOT commit with the message "fix" or "update" or "wip" — be specific

---

## Quick Reference: FHE Patterns

```solidity
// ── Encrypted input from user ──────────────────────────────────
euint64 amount = FHE.asEuint64(encryptedInput, inputProof);

// ── Arithmetic over ciphertext ─────────────────────────────────
euint64 newTotal = FHE.add(existingTotal, amount);
euint64 remaining = FHE.sub(balance, amount);
ebool isEnough = FHE.gte(balance, amount);

// ── Conditional selection (NEVER branch on ebool) ──────────────
euint64 result = FHE.select(condition, valueIfTrue, valueIfFalse);

// ── Grant owner-only decrypt permission ────────────────────────
FHE.allowThis(newValue);              // contract can compute on it
FHE.allow(newValue, msg.sender);      // user can decrypt their own

// ── Make aggregate publicly decryptable ────────────────────────
FHE.makePubliclyDecryptable(totalPool);  // anyone can request decrypt
// Note: NEVER call this on individual user positions

// ── Verify decryption proof on-chain ───────────────────────────
FHE.checkSignatures(handles, abiEncodedCleartexts, decryptionProof);

// ── Check if value is initialized ──────────────────────────────
if (!FHE.isInitialized(value)) revert ValueNotInitialized();
```

---

## Quick Reference: Commit Message Examples

```bash
# Starting a new contract
feat(market): scaffold NullCastMarket with FHE imports and state variables

# Adding a function
feat(market): implement placeBet with encrypted position tracking and ACL setup

# Adding tests
test(market): add unit tests for placeBet including revert and ACL verification

# Fixing a bug
fix(market): correct FHE.allowThis missing from winnings computation

# Deployment
chore(deploy): deploy NullCastMarket to Sepolia, address 0x1234...

# Frontend component
feat(frontend): implement BetForm with client-side fhevm encryption

# Phase complete
chore: complete Phase 1 — all 47 NullCastMarket unit tests passing
```

---

*NullCast — Confidential Prediction Markets on Zama FHEVM*  
*Sepolia Testnet | Zama Developer Program Season 2*