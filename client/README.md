# NullCast Client

Next.js 14 frontend for NullCast — confidential prediction markets on Zama FHEVM.

## Architecture

```
src/
├── app/
│   ├── (app)/          # Main app pages (markets, portfolio, vaults, etc.)
│   └── api/
│       ├── odds/       # Decrypts aggregate pool totals via Zama relayer
│       └── keeper/     # Syncs LP pool + vault totals on-chain (owner tx)
├── hooks/
│   ├── useMarket.ts    # Market data + live odds from /api/odds
│   ├── useOdds.ts      # Polls /api/odds for decrypted aggregate odds
│   ├── useUserDecrypt.ts # User-scoped position decryption (EIP-712 signed)
│   ├── usePlaceBet.ts  # FHE-encrypted bet placement
│   └── ...
├── components/
���   └── shared/         # OddsBar, GlowCard, CipherReveal, etc.
├── lib/
│   ├── store.ts        # Zustand store (positions, decrypted values)
│   ├── contracts.ts    # Contract configs + ABIs
│   └── fhevm.ts        # FHEVM SDK initialization
└── constants/
    └── addresses.ts    # Deployed contract addresses (Sepolia)
```

## Key Flows

### Odds Display (public aggregates)
1. Contract keeps encrypted `totalYesPool` / `totalNoPool` (updated on every bet via `FHE.add`)
2. `/api/odds` reads the ciphertext handles from on-chain
3. Calls Zama relayer `POST /v2/public-decrypt` to decrypt (pools are `makePubliclyDecryptable`)
4. Returns cleartext odds to frontend — no on-chain write needed
5. `useOdds` hook polls every 30s; immediate refresh after bet confirmation

### Position Reveal (private per-user)
1. User clicks "Reveal" — triggers EIP-712 signature request
2. `useUserDecrypt` generates ephemeral keypair, signs authorization
3. Relayer SDK calls KMS — verifies ACL, decrypts under user's ephemeral key
4. Plaintext shown only in user's browser session

### Keeper (LP + Vault sync)
- `/api/keeper` decrypts LP pool totals and writes cleartext on-chain via owner key
- Required because `publicTotalLiquidity` is read by other contracts
- Vault total deposits/shares similarly synced for UI display

## Running

```bash
npm run dev     # http://localhost:3000
npm run build   # Production build
```

## Environment

```bash
# .env.local
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://...
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=...
DEPLOYER_PRIVATE_KEY=0x...  # For keeper API (server-side only)
```
