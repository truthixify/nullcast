# NullCast — Design Brief v2

## The problem with the current UI

It looks like a developer built it. Lock icons everywhere, "FHE" badges on every surface, explanatory text about encryption on every page. Users don't need to be reminded that their data is encrypted every 3 seconds — they need to place bets, check their positions, and make money. The encryption should be invisible infrastructure, not the visual identity.

The new design should feel like opening a Bloomberg terminal for the first time — dense, powerful, slightly intimidating in the best way. Not a crypto landing page. Not a hackathon demo. A real product.

---

## Design philosophy

**"The best encryption is the kind you forget is there."**

- Never show a lock icon unless the user is actively decrypting something
- Never write "FHE" or "encrypted" in the UI unless it's in a technical detail panel
- Never explain how the protocol works inline — that's what docs are for
- The privacy is communicated through what's ABSENT (no position sizes visible to others) not through what's PRESENT (lock icons, badges, explainer text)

**Game-like interaction design:**

Every action should feel like a move in a strategy game:
- Placing a bet should feel like placing a chess piece — deliberate, weighty, satisfying
- Watching odds shift should feel like watching a live scoreboard
- Decrypting your position should feel like revealing a hidden card
- Claiming winnings should feel like collecting loot

The UI should reward engagement through motion, feedback, and state transitions — not through explanatory copy.

---

## Visual direction

### Palette

Dark, rich, cinematic. Think movie UI from Blade Runner or the command interfaces in Dune.

- **Background:** Deep charcoal with extremely subtle warm undertone. Not pure black, not blue-black. Something like `#0C0B0A` → `#141311` → `#1A1815` for the three surface levels
- **Primary surface:** Cards should feel like they're etched into the background, not floating above it. Achieve depth through border luminosity, not shadows or elevation
- **Accent:** A single warm gold/amber that reads as "value" and "premium." Used sparingly — only on primary CTAs, active states, and the most important numbers. Something like `#D4A843` — warm, not neon, not orange
- **Win/Loss:** Muted sage green for YES/profit, muted terracotta for NO/loss. These should feel natural, not alarming. Think stock ticker colors, not traffic lights
  - YES: `#6B9B7A` — calm, confident green
  - NO: `#B86B6B` — subdued, not aggressive red
- **Text:** 4 levels of warm cream/ivory. Primary text should feel like ink on aged paper, not white light on a screen
  - Primary: `#E8E0D4`
  - Secondary: `#A89E90`
  - Tertiary: `#6B6560`
  - Disabled: `#3D3A36`
- **Privacy indicator:** When you DO need to show something is encrypted (e.g., the decrypt flow), use a subtle cool blue-violet `#7B7FBF` — never as a badge, only as a transient state color during the reveal animation

### Typography

- **Display:** Something with real character. Not geometric, not grotesque. A serif or semi-serif display face that says "this is serious money." Playfair Display, Cormorant, or Source Serif. Used only for market questions and page titles
- **Body:** Clean, high-readability sans. Inter, Geist, or Untitled Sans. Every label, button, nav item
- **Data:** Monospace for ALL numbers. Every price, percentage, amount, address, block number. JetBrains Mono or Berkeley Mono. Tabular figures always. This is the workhorse font — it carries the authority

### Motion

Every interaction should have micro-feedback:
- **Bet placed:** The odds bar should ripple from the point of impact, like dropping a stone in water. A brief, satisfying pulse
- **Odds updating:** Smooth, eased transitions. Never jump. The bar should FLOW to its new position over ~600ms
- **Decrypt reveal:** The encrypted dots should scramble/shuffle rapidly for 0.5s (like a slot machine), then resolve into the actual number. Not a fade — a reveal
- **Card hover:** Subtle border glow that follows the cursor position (like a light source). Not a uniform border-color change
- **Success states:** A brief golden shimmer across the element, then it settles. Like catching light on a gold coin
- **Navigation:** Page transitions should have a subtle slide/fade, not hard cuts

### Layout

- **Max width: 1280px.** Generous margins. Content breathes
- **Card system:** Cards have 1px borders with very low opacity (`rgba(255,240,220,0.04)`). On hover, the border brightens to `0.12`. No border-radius larger than 8px. Sharp, not bubbly
- **Data density:** This is a trading interface. Show MORE data, not less. Stats, numbers, percentages everywhere. Every empty pixel is a missed opportunity to show useful information
- **The golden ratio:** Important numbers (odds, pool totals, your position) should be displayed LARGE. 28-44px in mono. These are the hero elements on every page

---

## Pages

### Landing (/)

No marketing fluff. No "How it works" sections. No feature grids. Just:

**Hero:** A massive display-font headline, something like "The house can't see your cards." One line. Below it, a single sentence: "Prediction markets with encrypted positions." Two buttons: "Trade now" and "View markets." That's it.

**Below the fold:** A live market ticker — a horizontal scrolling strip showing 5-6 active markets with their current odds, updating in real-time. This proves the product is live without explaining anything. Think stock ticker at the bottom of CNBC.

**Stats bar:** Four numbers in large mono font. Total volume, active markets, total bets, average payout. No labels above them — the numbers speak for themselves, with tiny mono captions below.

No footer. No features section. No diagrams. The landing page should take 3 seconds to understand and 5 seconds to leave (because they clicked "Trade now").

### Markets (/markets)

**No filter bar as a separate card.** Filters are inline in the page header area:
- Status tabs (Active / Resolved / All) as underlined text, not buttons
- Category pills inline, horizontally scrollable
- Sort dropdown (not segmented control — save space)
- Search is a ⌘K triggered modal, not an always-visible input

**Market cards:**
```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  Will Bitcoin close above $120,000 by June 30?       │  ← display serif, 18px
│                                                      │
│  ███████████████████░░░░░░░░  68%          32%       │  ← odds bar, full width
│                                                      │
│  $245.2k pool    ·    1,237 bets    ·    Jun 30      │  ← mono, 12px, muted
│                                                      │
└──────────────────────────────────────────────────────┘
```

No category pills on cards. No status badges. No "LIVE" indicators. The card IS the data. If it's resolved, the odds bar is fully filled and grayed out — that's the indicator. If it's hot, the pool number is large — that's the indicator. Let the data communicate, not badges.

### Market Detail (/markets/[id])

**Two columns on desktop. Single column on mobile.**

**Left: The market**
- Question in large display serif (36-42px)
- The odds bar — BIG. Full width, 12px tall, with percentage labels
- Below the bar: pool total, bet count, expiry — all in mono, one line
- A subtle live-pulse dot next to the pool total (the only animation that's always running)
- Market metadata in a compact grid below: oracle, contract, fee, min bet — all mono, all small (11px). This is reference data, not hero data

**Right: The trading panel**
- YES / NO as two large buttons, side by side. When you select one, it expands slightly and the other dims. The selected one gets a subtle colored left border (green or red), not a full background fill
- Amount input: large mono input, auto-focused. Quick-fill chips below (25, 50, 100, 250, 500)
- Payout preview: shows immediately as you type. "If correct: 147.06 cUSDT (+47.06)" — all in one line, mono, the profit portion in green
- The submit button: full width, says just "Place bet" (not "Encrypt & Bet YES · 100 cUSDT"). The encryption is invisible. The button color matches the selected side (muted green or muted red)
- Transaction states: the button text changes: "Place bet" → "Confirming..." → "Done" with a brief golden flash. No separate status cards, no explanatory text about what's happening

**Position section (if you have one):**
Only appears if you have a position. A compact row:
```
Your position    YES    ••••••••    [Reveal]
```
When you click Reveal, the dots scramble like a slot machine and resolve into "250.00 cUSDT" with a brief golden glow. No "Decrypting via KMS..." text. No lock icons. Just: dots → scramble → number.

**Activity feed:**
A live list of recent bets. Each row: side (colored dot, not a pill), truncated address, "encrypted" in muted text (NOT a lock icon), block number. Minimal, dense, real-time.

### Portfolio (/portfolio)

**Stats across the top:** 4 large numbers
- Positions: 4
- At stake: ••••••••  [Reveal all]
- P&L: ••••••••
- Claimable: 328.00

When you click "Reveal all", ALL the dots across the page scramble and resolve simultaneously. Satisfying.

**Table below:** Compact, dense, full-width. No card wrapper. Just the table.
- Market question (truncated, 1 line)
- Side (colored dot)
- Amount (dots or revealed number)
- Entry odds → Current odds (with delta arrow)
- P&L (dots or revealed, colored)

Clicking a row navigates to the market.

### Vaults (/vaults)

**Vault cards:**
```
┌──────────────────────────────────────────────────────┐
│  Alpha Strategy                         by 0x7a…4e19 │
│                                                      │
│  238 followers    $1.2M AUM    +12.4% all-time       │
│                                                      │
│  ████████████████████████████████  10% fee            │
│                                                      │
│  [Deposit]                              [Details →]  │
└──────────────────────────────────────────────────────┘
```

No tier badges. No "Required tier" labels. The manager's reputation is shown as a subtle progress ring next to their address — if you need to know the exact score, click into the vault detail.

### Reputation (/reputation → rename to /score)

**One big number in the center of the page.** Your score. Large. Gold. Animated ring around it.

Below: the four components as horizontal bars. Clean, minimal. No "PUBLIC" or "ENC" pills. Just the bars with labels and values.

Below that: the tier you're in, shown as a horizontal scale with your position marked. Like a progress bar with 4 segments (Explorer → Analyst → Strategist → Oracle).

The faucet (mint test cUSDT) should be in the header or a floating action, not a card on this page. It's a utility, not content.

### Liquidity (/liquidity)

Per-market LP cards showing:
- Market question
- Your LP share (dots or revealed)
- Pool TVL
- [Deposit] [Withdraw] buttons side by side

No explanatory text about how LPs work. No "How it works" cards. Users who come to the LP page know what LPs are.

---

## What to remove from the current design

1. Every lock icon that isn't part of an active decrypt flow
2. Every "FHE" badge
3. Every "Encrypted via FHE" subtitle
4. Every "Your bet is encrypted client-side before submission" notice
5. Every "Built on Zama fhEVM" badge in the footer
6. The "FHE · Sepolia" pill in the header
7. All "How it works" sections
8. All step-by-step diagrams
9. The tweaks panel
10. Category pills on market cards (category is a filter, not card content)
11. The word "encrypted" from any user-facing text except the decrypt button itself

## What to add

1. Micro-animations on every interaction
2. A command palette (⌘K) for search and navigation
3. Larger, bolder numbers everywhere
4. A live market ticker on the landing page
5. Cursor-following card border glow on hover
6. Slot-machine decrypt animation
7. Golden shimmer on success states
8. Sound effects (optional, toggleable): subtle click on bet, chime on win

---

## Reference mood

- **Polymarket** — data density, market card layout
- **Bloomberg Terminal** — the feeling of "I'm looking at real money"
- **Chess.com** — the feeling of making a move (deliberate, consequential)
- **Diablo IV inventory screen** — dark, rich, gold accents, the feeling of "valuable things are here"
- **Stripe Radar** — dark dashboard done right, data-forward

The end result should make someone say "this looks expensive" not "this looks like a hackathon project."
