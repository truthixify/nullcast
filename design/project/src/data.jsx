// ============================================================
// Seeded fixtures for NullCast. All values deterministic.
// ============================================================

const MARKETS = [
  {
    id: "btc-120k-jun30",
    q: "Will Bitcoin close above $120,000 by June 30?",
    cat: "Crypto",
    yes: 68, no: 32,
    pool: 245200,
    bets: 1237,
    expiry: "Jun 30",
    oracle: "Pyth · BTC/USD",
    contract: "0x7a3f…c419",
    fee: "0.30%",
    min: "1.00",
    hot: true,
    trend: +3.2,
  },
  {
    id: "eth-etf-q3",
    q: "Will a spot ETH ETF see $1B in weekly inflows before Q3 end?",
    cat: "Crypto",
    yes: 41, no: 59,
    pool: 188400,
    bets: 804,
    expiry: "Sep 30",
    oracle: "Farside · ETF flows",
    contract: "0x91b2…e804",
    fee: "0.30%",
    min: "1.00",
    trend: -1.8,
  },
  {
    id: "fed-rate-may",
    q: "Will the Fed cut rates at the May FOMC meeting?",
    cat: "Macro",
    yes: 23, no: 77,
    pool: 412800,
    bets: 2104,
    expiry: "May 07",
    oracle: "CME FedWatch",
    contract: "0x4d08…a127",
    fee: "0.30%",
    min: "1.00",
    hot: true,
    trend: -5.4,
  },
  {
    id: "nvda-1t",
    q: "Will NVIDIA report a revenue beat of >10% next earnings?",
    cat: "Equities",
    yes: 54, no: 46,
    pool: 96400,
    bets: 418,
    expiry: "May 22",
    oracle: "SEC EDGAR",
    contract: "0x2b55…f3d1",
    fee: "0.30%",
    min: "1.00",
    trend: +0.9,
  },
  {
    id: "openai-agents",
    q: "Will OpenAI release a consumer agent product before August?",
    cat: "Tech",
    yes: 37, no: 63,
    pool: 72100,
    bets: 331,
    expiry: "Aug 01",
    oracle: "Official announcement",
    contract: "0x8e3c…7410",
    fee: "0.30%",
    min: "1.00",
    trend: +2.1,
  },
  {
    id: "election-incumbent",
    q: "Will the incumbent party win the UK general election?",
    cat: "Politics",
    yes: 29, no: 71,
    pool: 338900,
    bets: 1802,
    expiry: "Jul 04",
    oracle: "Official results",
    contract: "0x6f29…d94b",
    fee: "0.30%",
    min: "1.00",
    trend: -2.7,
  },
  {
    id: "ai-gpt5",
    q: "Will a model score above 95% on MMLU-Pro before July?",
    cat: "Tech",
    yes: 62, no: 38,
    pool: 54300,
    bets: 214,
    expiry: "Jul 01",
    oracle: "Papers With Code",
    contract: "0x13a7…2055",
    fee: "0.30%",
    min: "1.00",
    trend: +4.2,
  },
  {
    id: "sbf-appeal",
    q: "Will the next Ethereum hard fork ship on schedule?",
    cat: "Crypto",
    yes: 48, no: 52,
    pool: 41200,
    bets: 188,
    expiry: "Jun 15",
    oracle: "ethereum.org",
    contract: "0x9b42…7e8c",
    fee: "0.30%",
    min: "1.00",
    trend: -0.4,
  },
  {
    id: "movie-box",
    q: "Will the next Dune film cross $500M box office worldwide?",
    cat: "Culture",
    yes: 72, no: 28,
    pool: 28100,
    bets: 142,
    expiry: "Dec 20",
    oracle: "Box Office Mojo",
    contract: "0x5c81…ab32",
    fee: "0.30%",
    min: "1.00",
    trend: +1.3,
  },
  {
    id: "resolved-jobs",
    q: "Did US jobs report beat consensus in March?",
    cat: "Macro",
    yes: 100, no: 0,
    pool: 156000,
    bets: 842,
    expiry: "Resolved",
    oracle: "BLS",
    contract: "0x3e88…1c09",
    fee: "0.30%",
    min: "1.00",
    resolved: true,
    winner: "YES",
    trend: 0,
  },
];

const CATEGORIES = ["All", "Crypto", "Macro", "Equities", "Tech", "Politics", "Culture"];

const PORTFOLIO_POSITIONS = [
  { id: 1, marketId: "btc-120k-jun30", side: "YES", amount: 250.00, entry: 61, current: 68, pnl: +28.70 },
  { id: 2, marketId: "fed-rate-may", side: "NO", amount: 150.00, entry: 72, current: 77, pnl: +10.40 },
  { id: 3, marketId: "nvda-1t", side: "YES", amount: 100.00, entry: 58, current: 54, pnl: -6.90 },
  { id: 4, marketId: "openai-agents", side: "YES", amount: 75.00, entry: 32, current: 37, pnl: +11.70 },
];

const PORTFOLIO_SUMMARY = {
  positions: 4,
  atStake: 575.00,
  pnl: +43.90,
  claimable: 328.00,
};

const VAULTS = [
  { id: "alpha", name: "Alpha Strategy", manager: "0x7a3f…4e19", followers: 238, aum: 1200000, perf: +12.4, fee: 10, rep: 82 },
  { id: "prime", name: "Prime Macro", manager: "0x91b2…8c04", followers: 412, aum: 3400000, perf: +21.8, fee: 15, rep: 94 },
  { id: "contrarian", name: "Contrarian Book", manager: "0x4d08…a127", followers: 84, aum: 420000, perf: -3.1, fee: 8, rep: 61 },
];

const SCORE = {
  total: 742,
  tier: "Strategist",
  tierIndex: 2,
  tiers: ["Explorer", "Analyst", "Strategist", "Oracle"],
  components: [
    { label: "Win rate",        value: 67, unit: "%",  bar: 67 },
    { label: "Volume traded",   value: "$18.4k",      bar: 78 },
    { label: "Consistency",     value: 81, unit: "/100", bar: 81 },
    { label: "Vault following", value: 54, unit: "/100", bar: 54 },
  ],
};

const LIQUIDITY = [
  { marketId: "btc-120k-jun30",  share: 1850.00, tvl: 245200 },
  { marketId: "fed-rate-may",    share: 920.00,  tvl: 412800 },
  { marketId: "eth-etf-q3",      share: 0,       tvl: 188400 },
  { marketId: "election-incumbent", share: 340.00, tvl: 338900 },
];

// Live activity feed — seeded; ticks in UI
const seededAddresses = [
  "0x7a3f…c419","0x91b2…e804","0x4d08…a127","0x2b55…f3d1",
  "0x8e3c…7410","0x6f29…d94b","0x13a7…2055","0x9b42…7e8c",
  "0x5c81…ab32","0x3e88…1c09","0xa11e…0042","0xf01c…bb23",
];

function fmtUSD(n) {
  if (n >= 1e6) return `$${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n/1e3).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}
function fmtNum(n) { return n.toLocaleString('en-US'); }

function findMarket(id) { return MARKETS.find(m => m.id === id); }

Object.assign(window, {
  MARKETS, CATEGORIES, PORTFOLIO_POSITIONS, PORTFOLIO_SUMMARY,
  VAULTS, SCORE, LIQUIDITY, seededAddresses,
  fmtUSD, fmtNum, findMarket,
});
