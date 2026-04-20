# NullCast — Design Brief for Claude Design

## What this is

NullCast is a **confidential prediction market** on Ethereum. Users bet on outcomes (crypto prices, events) with **fully encrypted positions** — nobody can see how much you bet or which side. Only aggregate odds are public.

This is a **serious financial product**, not a toy. The design should feel like a Bloomberg terminal crossed with a premium DeFi protocol. Think: **Polymarket's clarity meets Stripe's restraint meets a trading desk's density**.

---

## Brand identity

**Personality:** Precise. Confident. Quietly powerful. The encryption is the feature — it should feel like a vault, not a toy with lock emojis everywhere.

**Tone:** Technical but never intimidating. The UI should make complex FHE concepts feel obvious through good design, not through walls of explanatory text.

**Name treatment:** "nullcast" — always lowercase. The "null" references the zero-knowledge nature (your position is null to everyone else). Mark should be abstract/geometric, not a literal lock or shield.

---

## Color direction

Dark theme only. Not "dark mode as an afterthought" — designed dark-first.

- **Background:** Very dark, almost black, with subtle warmth (not blue-black, not pure #000)
- **Surfaces:** Layered with barely-visible borders, not drop shadows. Cards should feel like they're cut from the same material, not floating
- **Accent:** One strong accent color. Electric blue, amber, or cyan — pick one and commit. No gradients on interactive elements
- **YES/NO:** Green for YES, red for NO — desaturated, not neon. These should sit calmly in the palette, not scream
- **Privacy/encryption:** A distinct cool tone (lavender/indigo) used exclusively for encryption-related UI. When users see this color, they immediately know "this value is encrypted"
- **Text:** Warm off-white primary, not pure white. 3-4 levels of text hierarchy through opacity/lightness

---

## Typography

Three fonts, strict roles:

1. **Display/headlines:** A geometric sans with personality. Syne, General Sans, Satoshi, or similar. Used for page titles, hero text, market questions. Tight letter-spacing (-0.03 to -0.04em)
2. **Body/UI:** Clean readable sans. DM Sans, Inter, or similar. Used for labels, descriptions, buttons, nav
3. **Data/mono:** Monospace for all numbers, addresses, percentages, amounts. JetBrains Mono, IBM Plex Mono, or similar. Tabular figures always. This font carries authority — it says "this is real data"

---

## Layout principles

- **Max width ~1240px**, generous side padding. Content never stretches edge-to-edge
- **Information density matters.** This is a trading interface — users want to see data, not whitespace. But density ≠ clutter. Use tight spacing with clear grouping
- **Grid-based.** Market cards in a 3-column grid. Detail page is 2-column (content + sticky betting panel). Portfolio is a table
- **Sticky elements:** Header always visible. Betting panel sticks to viewport on scroll. These are critical interaction surfaces
- **Mobile:** Not a priority for the hackathon, but the layout should degrade gracefully. Stack columns, collapse grids

---

## Pages to design

### 1. Landing page (`/`)

**Purpose:** Sell the concept in 10 seconds. "Prediction markets where your bet is private."

**Structure:**
- **Hero:** Large headline. Something like "Bet without revealing." — short, bold, memorable. Subhead explains FHE in one sentence. Two CTAs: "Launch app" (primary) and "Read docs" (secondary)
- **Live preview card:** Show a real-looking market card in the hero with animated odds that tick up/down subtly. This proves the product is real and live. Show the encrypted position indicator (dots/lock) to demonstrate privacy
- **Stats bar:** 4 key metrics in a row below the hero — total volume, open markets, private bets placed, avg resolution time. Even if these are demo numbers, the layout should feel like a live dashboard
- **How it works section:** 3-4 steps in a clean grid or horizontal flow. Sign → Encrypt → Aggregate → Settle. Each step gets a short label and one sentence. No icons — use numbered steps or abstract shapes
- **Footer:** Minimal. Logo, version, links to docs/github/discord, "Built on Zama fhEVM" badge

**What NOT to do:**
- No giant illustrations or 3D renders
- No "Web3 landing page" clichés (floating tokens, blockchain graphics, globe with nodes)
- No multi-section scroll-heavy marketing page. One hero, one features section, done

---

### 2. Markets list (`/markets`)

**Purpose:** Scannable list of all prediction markets. Users should be able to find and evaluate a market in under 3 seconds.

**Structure:**
- **Page header:** "Markets" title, subtitle with live market count + total pool + "encrypted via FHE" indicator. "Create Market" button top-right
- **Filter bar:** In a card/toolbar below the header
  - Search input (with keyboard shortcut hint)
  - Status filter: Open / Resolved / All (segmented control)
  - Sort: Volume / Newest / Expiry (segmented control)
- **Market grid:** 3-column responsive grid of market cards

**Market card anatomy:**
```
┌──────────────────────────────────────┐
│  CRYPTO · Jun 30 · LIVE             │  ← category, expiry, hot indicator
│                                      │
│  Will Bitcoin close above            │  ← question (2 lines max)
│  $120,000 by June 30?               │
│                                      │
│  ████████████████░░░░░░  68%  32%   │  ← odds bar (YES green, NO red)
│                                      │
│  Pool 245.2k · Vol 18.4k · 1.2k bets│  ← stats row in mono font
└──────────────────────────────────────┘
```

- Cards should have subtle hover state (border brightens, slight lift)
- Clicking a card navigates to the detail page
- Loading state: skeleton cards with pulsing placeholder blocks

---

### 3. Market detail (`/markets/[id]`)

**Purpose:** Full market view + betting interface. This is the most important page.

**Layout:** Two-column. Left (wider) = market info. Right (380px, sticky) = betting panel.

**Left column:**
- **Pill row:** Category, "Hot" badge (if active), FHE encryption badge, expiry, market ID
- **Question:** Large display font, 1-3 lines
- **Odds card:** The odds bar, larger version. Show YES% and NO% with pool total and "last updated Xs ago" with a live dot. Include a "Refresh odds" button that triggers KMS decryption
- **Market details card:** Grid of metadata — Oracle address, contract address, market type (Binary/Scalar), minimum bet, fee (2%), reputation requirement, expiry block, YES/NO pool amounts
- **Activity table:** Recent bets. Columns: Side (YES/NO pill), Bettor (truncated address in mono), Amount (lock icon + "encrypted" — bet amounts are NEVER visible here), Block. Include an "Amounts encrypted" badge in the header

**Right column (sticky betting panel):**
- **Header:** "Place bet" + FHE badge
- **Side selector:** Two large buttons — YES (green tint when active) and NO (red tint when active). Each shows current %, multiplier (e.g. ×1.47)
- **Amount input:** Number input with "cUSDT" unit suffix. Quick-fill buttons below (25, 50, 100, 250)
- **Payout breakdown:** In a muted box:
  - Stake: X cUSDT
  - Odds: ×Y.YY
  - ---
  - Payout if correct: X.XX cUSDT
  - Profit: +X.XX cUSDT (in green/red)
- **Submit button:** Full-width, colored by side. "Encrypt & Bet YES · 100". Shows lock icon. Goes through states: idle → "Encrypting via FHE..." → "Confirm in wallet..." → "Confirming on-chain..." → Success
- **Privacy notice:** Small box below button with lock icon: "Your bet is encrypted before it hits the chain. Nobody can see your position, not even the protocol. Only aggregate odds are public."
- **Position section (if user has bet):**
  - "Your on-chain position" header with lock icon
  - If decrypted: show YES/NO pill + amount in cUSDT with a subtle reveal glow animation
  - If not decrypted: show "encrypted on-chain" notice + "Decrypt my position" button that triggers EIP-712 signature → KMS decryption
  - Show bet history below (each individual bet as a small row)
- **If market is RESOLVED:** Show outcome, claim button, and claimed status instead of betting panel

---

### 4. Create market (`/markets/create`)

**Purpose:** Form to deploy a new prediction market.

**Structure:** Single-column form, narrow (720px max). Not a multi-step wizard — one scrollable form.
- **Question input:** Large, display-font input. "Will ETH close above $5,000 by July 1, 2026?"
- **Market type:** Binary (default) or Scalar (with bucket count input)
- **Expiry:** Date picker
- **Minimum bet:** Number input in cUSDT (default: 1)
- **Submit:** "Create Market" button with transaction states
- **Requirements note:** "Requires wallet connection. Market will be deployed to Sepolia."

---

### 5. Portfolio (`/portfolio`)

**Purpose:** View all your positions across markets.

**Structure:**
- **Header:** "Portfolio" title, privacy subtitle ("Your positions are encrypted. Only you can decrypt them."), "Decrypt all" button
- **Stats row:** 4 cards — Active positions (count), Total at stake (encrypted/locked), Unrealized P&L (encrypted), Claimable winnings
- **Tabs:** Active / Settled / LP Positions
- **Active tab:** Table with columns:
  - Market (question text + expiry)
  - Side (YES/NO pill)
  - Position (encrypted dots + "Decrypt" button, or decrypted amount)
  - Entry odds %
  - Current odds % (with delta arrow ▲/▼)
  - P&L (encrypted or decrypted)
  - Action (claim if resolved, chevron to detail)
- **Settled tab:** Completed markets — shows market, side, stake, payout, WON/LOST result, date
- **LP tab:** Empty state for now with illustration and CTA

**Key UX:** Clicking "Decrypt" on a position triggers the EIP-712 → KMS flow and reveals the amount with a glow animation. Once decrypted, it stays visible (cached in localStorage).

---

### 6. Reputation (`/reputation`)

**Purpose:** View your encrypted reputation score and get test tokens.

**Structure:**
- **Test token faucet:** Prominent card at top. "Mint 10,000 cUSDT" button. This is essential for the demo — users need test tokens. Show balance after minting
- **Score section:** Two columns
  - Left: Score visualization (circular ring/gauge showing score out of 100). Score value is encrypted — show "encrypted (euint8)" with decrypt option. Show "eligible for X markets" based on estimated score
  - Right: Score breakdown — progress bars for each component (wallet age, transaction history, NullCast participation, accuracy). Note which are publicly readable vs encrypted
- **Info box:** Explain how score is computed — on-chain signals only, no KYC, recomputed per epoch

---

## Component library

### Odds bar
The most important recurring component. A horizontal bar showing YES/NO split.
- Left: YES percentage in green mono text
- Center: Track bar — green fill from left, red fill from right, thin rounded track
- Right: NO percentage in red mono text
- Below: Meta line — pool total, last update time with live-pulse dot
- Pulsing animation when odds are updating

### Encrypted value display
For any value that's FHE-encrypted:
- **Hidden state:** Monospace dots (•••••••) + lock icon + "Decrypt" button
- **Decrypting state:** "Decrypting..." text with a subtle shimmer animation
- **Revealed state:** Value slides in with a brief purple/indigo glow, then settles to normal text color
- This component is used for: position amounts, reputation scores, winnings, LP shares

### Pills/badges
Small inline indicators:
- Status: Open (green), Expired (amber), Resolved (neutral), Cancelled (red)
- Side: YES (green), NO (red)
- Privacy: "FHE" badge with lock icon (uses the encryption accent color)
- Category: Neutral border pill

### Cards
- Default: Dark surface, subtle border, rounded corners (12-14px)
- Elevated: Slightly lighter background, used for important content (odds, betting panel)
- Interactive: Hover lifts border brightness, slight translateY

### Buttons
- Primary: Light/white background, dark text — for main CTAs
- Secondary: Dark background, light border — for less important actions
- YES: Green-tinted — for betting YES
- NO: Red-tinted — for betting NO
- Ghost: Transparent, text only — for navigation, dismiss

---

## Privacy UX guidelines

**The single most important design constraint:** Users must ALWAYS know what's encrypted and what's public.

1. **Encrypted values** use the privacy accent color (lavender/indigo) and show a lock icon. This is a consistent visual language — when you see that color + lock, you know only you can see this
2. **Public values** (odds, pool totals) use normal text colors. No lock, no special treatment
3. **The encryption notice** in the betting panel should feel reassuring, not alarming. Short, confident copy
4. **Decryption flow** should feel premium — a signature request, a brief wait, then the value reveals with a satisfying animation. This is a feature moment, not a loading state
5. **Never show fake encrypted values.** If something is encrypted and not yet decrypted, show dots or "encrypted" — never placeholder numbers

---

## What to avoid

- Lock emojis (🔒) — use proper SVG icons
- Gratuitous gradients and glows
- "Crypto bro" aesthetics — no neon, no pixel art, no memes
- Overly complex animations that distract from data
- Explanatory tooltips on everything — the design should be self-evident
- Card shadows — use borders for depth in dark themes
- More than one accent color in interactive elements
- Rounded/bubbly design — this should feel sharp and precise
- Empty states without guidance — always tell the user what to do next

---

## Reference products (for design calibration)

- **Polymarket** — market card layout, odds bar concept, information density
- **Stripe Dashboard** — typography hierarchy, card patterns, form design
- **Linear** — dark theme execution, keyboard-first feel, information density
- **Uniswap v4** — token input patterns, transaction state flows
- **Bloomberg Terminal** — data density, monospace number treatment, no-nonsense layout

Take the best of these and make it cohesive. The result should feel like a product that serious traders would use, that also happens to have world-class encryption under the hood.

---

## Deliverables

Design all 6 pages listed above as interactive HTML/CSS/JS prototypes. Include:
- All states: loading, empty, error, connected wallet, disconnected wallet
- Hover/active states on interactive elements
- The encrypted value reveal animation
- Live-updating odds on the market detail page
- Responsive behavior (desktop primary, tablet acceptable, mobile stretch goal)

Use CSS custom properties for the full token system (colors, spacing, typography, radii). Every value should be tokenized — no magic numbers.
