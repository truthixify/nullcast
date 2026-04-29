// NullCast — single source of truth for mock data
export type Direction = "YES" | "NO";
export type Category = "Crypto" | "Macro" | "AI" | "Politics" | "Space" | "Sports";
export type Status = "Active" | "Resolved";

export interface Market {
  id: string;
  question: string;
  description: string;
  category: Category;
  yesOdds: number;
  pool: number;
  bets: number;
  expiry: string;
  expiresIn: string;
  status: Status;
  resolution?: Direction;
  oracle: string;
  contract: string;
  fee: string;
  minBet: string;
  history: { t: string; yes: number }[];
}

const hist = (start: number, vol = 12) =>
  Array.from({ length: 24 }, (_, i) => ({
    t: `${i}h`,
    yes: Math.max(5, Math.min(95, Math.round(start + Math.sin(i / 3) * vol + (Math.random() - 0.5) * 6))),
  }));

export const MARKETS: Market[] = [
  {
    id: "btc-120k",
    question: "Will Bitcoin close above $120,000 by June 30?",
    description: "Resolves YES if BTC/USD on Coinbase closes ≥ $120,000 on June 30, 2026 23:59 UTC.",
    category: "Crypto", yesOdds: 68, pool: 245_200, bets: 1237,
    expiry: "Jun 30, 2026", expiresIn: "32d", status: "Active",
    oracle: "Chainlink BTC/USD", contract: "0x4a91…bc8d", fee: "0.30%", minBet: "1.00",
    history: hist(55, 14),
  },
  {
    id: "fomc-cut",
    question: "Will the Fed cut rates at the June FOMC meeting?",
    description: "Resolves YES if FOMC announces a target rate decrease at the June 18, 2026 meeting.",
    category: "Macro", yesOdds: 38, pool: 1_412_900, bets: 3402,
    expiry: "Jun 18, 2026", expiresIn: "18d", status: "Active",
    oracle: "Federal Reserve press release", contract: "0xb203…aa19", fee: "0.30%", minBet: "1.00",
    history: hist(45, 10),
  },
  {
    id: "gpt6",
    question: "Will OpenAI release GPT-6 before September?",
    description: "Resolves YES on official public release of a model labeled GPT-6 by Sept 1, 2026.",
    category: "AI", yesOdds: 22, pool: 309_400, bets: 892,
    expiry: "Sep 1, 2026", expiresIn: "120d", status: "Active",
    oracle: "OpenAI announcement", contract: "0x77be…44f1", fee: "0.30%", minBet: "1.00",
    history: hist(28, 8),
  },
  {
    id: "starship-moon",
    question: "Will SpaceX land Starship on the Moon in 2026?",
    description: "Resolves YES on confirmed soft landing on the lunar surface in calendar year 2026.",
    category: "Space", yesOdds: 11, pool: 521_800, bets: 2104,
    expiry: "Dec 31, 2026", expiresIn: "240d", status: "Active",
    oracle: "NASA/SpaceX joint confirmation", contract: "0x12d4…aa90", fee: "0.30%", minBet: "1.00",
    history: hist(15, 5),
  },
  {
    id: "btc-dom",
    question: "Will BTC dominance exceed 60% before July?",
    description: "Resolves YES if BTC market cap dominance closes ≥ 60.00% on any day before July 1.",
    category: "Crypto", yesOdds: 47, pool: 682_400, bets: 1804,
    expiry: "Jul 1, 2026", expiresIn: "60d", status: "Active",
    oracle: "CoinGecko aggregate", contract: "0x901a…ee23", fee: "0.30%", minBet: "1.00",
    history: hist(42, 11),
  },
  {
    id: "election-spx",
    question: "Will US elections trigger a >5% S&P move on day 1?",
    description: "Resolves YES if S&P 500 absolute return is > 5% on the first trading day after election day.",
    category: "Politics", yesOdds: 73, pool: 2_104_500, bets: 5612,
    expiry: "Nov 4, 2026", expiresIn: "90d", status: "Active",
    oracle: "S&P Global", contract: "0x33ff…1284", fee: "0.30%", minBet: "1.00",
    history: hist(60, 9),
  },
  {
    id: "eth-merge-2",
    question: "Will Ethereum complete its next major upgrade in Q3?",
    description: "Resolves YES on mainnet activation of the next Ethereum upgrade by Sept 30, 2026.",
    category: "Crypto", yesOdds: 100, pool: 188_400, bets: 612,
    expiry: "Mar 1, 2026", expiresIn: "—", status: "Resolved", resolution: "YES",
    oracle: "Ethereum Foundation", contract: "0xee01…7733", fee: "0.30%", minBet: "1.00",
    history: hist(72, 18),
  },
];

export const VAULTS = [
  { id: "alpha", name: "Alpha Strategy", manager: "0x7a3c…4e19", followers: 238, aum: 1_240_000, returnPct: 12.4, fee: 10, repPct: 78 },
  { id: "macro", name: "Macro Hedge", manager: "0xb18e…22aa", followers: 184, aum: 890_000, returnPct: 8.7, fee: 12, repPct: 64 },
  { id: "contrarian", name: "Contrarian Edge", manager: "0xff90…0c41", followers: 96, aum: 412_000, returnPct: 21.3, fee: 15, repPct: 91 },
  { id: "quant", name: "Quant Index", manager: "0x4421…8800", followers: 451, aum: 2_710_000, returnPct: 6.2, fee: 8, repPct: 88 },
];

export interface Position {
  marketId: string;
  side: Direction;
  size: number;
  entryOdds: number;
  pnl: number;
}
export const POSITIONS: Position[] = [
  { marketId: "btc-120k",      side: "YES", size: 250.0,  entryOdds: 58, pnl: 43.10 },
  { marketId: "fomc-cut",      side: "NO",  size: 180.0,  entryOdds: 55, pnl: 18.40 },
  { marketId: "btc-dom",       side: "YES", size: 100.0,  entryOdds: 41, pnl: 14.63 },
  { marketId: "election-spx",  side: "YES", size: 500.0,  entryOdds: 65, pnl: 61.54 },
];

export const ACTIVITY = [
  { time: "12s", side: "YES" as Direction, who: "0x4a…91f", seq: "▢▢▢▢ ●●●●" },
  { time: "1m",  side: "NO"  as Direction, who: "0xc8…03e", seq: "▢▢▢● ●●●●" },
  { time: "2m",  side: "YES" as Direction, who: "0x77…be1", seq: "▢▢●● ●●●●" },
  { time: "5m",  side: "YES" as Direction, who: "0x12…d40", seq: "▢●●● ●●●●" },
  { time: "8m",  side: "NO"  as Direction, who: "0xff…02a", seq: "●●●● ●●●●" },
  { time: "12m", side: "YES" as Direction, who: "0x90…e23", seq: "●●●● ●●●○" },
  { time: "18m", side: "YES" as Direction, who: "0x33…f12", seq: "●●●● ●●○○" },
];

export const REPUTATION = {
  score: 412,
  tier: "Strategist", // Explorer · Analyst · Strategist · Oracle
  tierIndex: 2,
  components: [
    { label: "Volume", value: 168, max: 250 },
    { label: "Accuracy", value: 92, max: 150 },
    { label: "Tenure", value: 78, max: 100 },
    { label: "Vouches", value: 74, max: 100 },
  ],
};

export const formatUSD = (n: number) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` :
  n >= 1_000     ? `$${(n / 1_000).toFixed(1)}k`     :
                   `$${n.toFixed(2)}`;
