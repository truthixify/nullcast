// ============================================================
// Market detail page
// ============================================================

function MarketDetailPage({ marketId, setRoute }) {
  const m = window.findMarket(marketId) || window.MARKETS[0];
  const [side, setSide] = React.useState('YES');
  const [amount, setAmount] = React.useState('100');
  const [placeState, setPlaceState] = React.useState('idle'); // idle | confirming | done
  const [liveYes, setLiveYes] = React.useState(m.yes);
  const [liveNo, setLiveNo] = React.useState(m.no);
  const [hasPosition, setHasPosition] = React.useState(true);
  const [positionReveal, setPositionReveal] = React.useState(false);
  const [feed, setFeed] = React.useState(() => seedFeed(m));
  const submitRef = React.useRef(null);

  // Simulate live odds nudging every few seconds
  React.useEffect(() => {
    const iv = setInterval(() => {
      setLiveYes(prev => {
        const delta = (Math.random() - 0.5) * 1.6;
        const next = Math.max(5, Math.min(95, prev + delta));
        setLiveNo(100 - next);
        return Math.round(next * 10) / 10;
      });
      // Occasionally inject a new bet into the feed
      if (Math.random() < 0.55) {
        setFeed(prev => [makeFeedEntry(m), ...prev].slice(0, 10));
      }
    }, 3200);
    return () => clearInterval(iv);
  }, [m.id]);

  const amt = parseFloat(amount) || 0;
  const oddsForSide = side === 'YES' ? liveYes : liveNo;
  const payout = amt > 0 ? (amt * (100 / oddsForSide)) : 0;
  const profit = payout - amt;

  function onPlaceBet(e) {
    if (amt <= 0) return;
    const btn = submitRef.current;
    if (btn) {
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      const color = side === 'YES' ? 'rgba(107,155,122,0.5)' : 'rgba(184,107,107,0.5)';
      spawnRipple(btn, x, y, color);
    }
    setPlaceState('confirming');
    setTimeout(() => {
      setPlaceState('done');
      // ripple the odds bar via a temporary shift
      setLiveYes(prev => {
        const nudge = side === 'YES' ? 2.2 : -2.2;
        const next = Math.max(5, Math.min(95, prev + nudge));
        setLiveNo(100 - next);
        return Math.round(next * 10) / 10;
      });
      setFeed(prev => [{ id: Date.now(), side, addr: '0x7a3f…4e19', block: 22184000 + Math.floor(Math.random()*900), mine: true }, ...prev].slice(0, 10));
      setHasPosition(true);
      setTimeout(() => setPlaceState('idle'), 1400);
    }, 780);
  }

  return (
    <div
      className="page-in"
      style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 48px 80px' }}
    >
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24 }}>
        <button
          onClick={() => setRoute('/markets')}
          className="mono"
          style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}
        >
          ← Markets
        </button>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', margin: '0 10px' }}>/</span>
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          {m.cat}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 48, alignItems: 'flex-start' }}>
        {/* Left column */}
        <div>
          <h1 className="serif" style={{ fontSize: 42, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'var(--ink-1)', textWrap: 'balance' }}>
            {m.q}
          </h1>

          {/* Big odds bar */}
          <div style={{ marginTop: 40 }}>
            <OddsBar yes={liveYes} no={liveNo} size="lg" showLabels={false} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14 }}>
              <div>
                <div className="mono" style={{ fontSize: 30, color: 'var(--yes)', fontWeight: 500, letterSpacing: '-0.02em' }}>
                  {liveYes.toFixed(1)}%
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 4 }}>
                  YES
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="mono" style={{ fontSize: 30, color: 'var(--no)', fontWeight: 500, letterSpacing: '-0.02em' }}>
                  {liveNo.toFixed(1)}%
                </div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 4 }}>
                  NO
                </div>
              </div>
            </div>
          </div>

          {/* Pool row */}
          <div
            className="mono"
            style={{
              marginTop: 32, paddingTop: 20, paddingBottom: 20,
              borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)',
              display: 'flex', gap: 32, fontSize: 13, color: 'var(--ink-2)', alignItems: 'center',
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PulseDot color="var(--gold)"/>
              <span style={{ color: 'var(--ink-1)' }}>{window.fmtUSD(m.pool)}</span>
              <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>pool</span>
            </span>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span>
              <span style={{ color: 'var(--ink-1)' }}>{window.fmtNum(m.bets)}</span>
              <span style={{ color: 'var(--ink-3)', fontSize: 11, marginLeft: 6 }}>bets</span>
            </span>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span>
              <span style={{ color: 'var(--ink-1)' }}>{m.expiry}</span>
              <span style={{ color: 'var(--ink-3)', fontSize: 11, marginLeft: 6 }}>expiry</span>
            </span>
          </div>

          {/* Your position (compact) */}
          {hasPosition && (
            <div
              style={{
                marginTop: 24,
                padding: '14px 18px',
                border: '1px solid var(--line)',
                borderRadius: 4,
                display: 'flex', alignItems: 'center', gap: 24,
              }}
            >
              <span
                className="mono"
                style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.16em', textTransform: 'uppercase' }}
              >
                Your position
              </span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--yes)', fontWeight: 500 }}>
                YES
              </span>
              <span className="mono" style={{ fontSize: 14, color: 'var(--ink-1)', minWidth: 120 }}>
                <CipherReveal value="250.00" reveal={positionReveal} width={8} />
                <span style={{ color: 'var(--ink-3)', marginLeft: 6, fontSize: 11 }}>cUSDT</span>
              </span>
              <div style={{ flex: 1 }}/>
              <button
                onClick={() => setPositionReveal(true)}
                disabled={positionReveal}
                style={{
                  fontSize: 12,
                  color: positionReveal ? 'var(--ink-3)' : 'var(--gold)',
                  padding: '6px 12px',
                  border: '1px solid ' + (positionReveal ? 'var(--line)' : 'var(--gold-dim)'),
                  borderRadius: 3,
                  display: 'flex', alignItems: 'center', gap: 6,
                  cursor: positionReveal ? 'default' : 'pointer',
                }}
              >
                <Icon name="eye" size={12} />
                {positionReveal ? 'Revealed' : 'Reveal'}
              </button>
            </div>
          )}

          {/* Metadata grid */}
          <div
            className="mono"
            style={{
              marginTop: 36,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 20,
              fontSize: 11,
              color: 'var(--ink-3)',
            }}
          >
            <MetaCell label="Oracle"    value={m.oracle} />
            <MetaCell label="Contract"  value={m.contract} />
            <MetaCell label="Fee"       value={m.fee} />
            <MetaCell label="Min bet"   value={m.min + ' cUSDT'} />
          </div>

          {/* Activity feed */}
          <div style={{ marginTop: 48 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
              <h2 className="serif" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>
                Recent activity
              </h2>
              <span
                className="mono"
                style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.14em', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <PulseDot color="var(--yes)" /> live
              </span>
            </div>
            <div
              style={{
                border: '1px solid var(--line)',
                borderRadius: 4,
                background: 'var(--bg-1)',
                overflow: 'hidden',
              }}
            >
              {feed.map((row, i) => (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '12px 140px 1fr 120px',
                    alignItems: 'center',
                    padding: '10px 18px',
                    gap: 16,
                    borderTop: i === 0 ? 'none' : '1px solid var(--line)',
                    background: row.mine ? 'var(--bg-2)' : 'transparent',
                    opacity: i === 0 ? 1 : (1 - i * 0.04),
                    transition: 'opacity 300ms',
                  }}
                >
                  <span
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: row.side === 'YES' ? 'var(--yes)' : 'var(--no)',
                      display: 'inline-block',
                    }}
                  />
                  <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                    {row.addr} {row.mine && <span style={{ color: 'var(--gold)', fontSize: 10, marginLeft: 4 }}>you</span>}
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', letterSpacing: '0.06em' }}>
                    encrypted
                  </span>
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right' }}>
                    block {row.block}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column — trading panel */}
        <aside style={{ position: 'sticky', top: 72 }}>
          <GlowCard style={{ padding: 24 }}>
            {/* YES/NO selector */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
              <SideButton active={side === 'YES'} side="YES" pct={liveYes} onClick={() => setSide('YES')} dim={side === 'NO'} />
              <SideButton active={side === 'NO'}  side="NO"  pct={liveNo}  onClick={() => setSide('NO')}  dim={side === 'YES'} />
            </div>

            {/* Amount input */}
            <div style={{ marginBottom: 6 }}>
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 8 }}>
                Amount
              </div>
              <div
                style={{
                  display: 'flex', alignItems: 'center',
                  border: '1px solid var(--line-2)', borderRadius: 4,
                  padding: '10px 14px',
                  background: 'var(--bg-0)',
                }}
              >
                <input
                  className="mono"
                  value={amount}
                  onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                  autoFocus
                  style={{ flex: 1, fontSize: 24, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}
                />
                <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>cUSDT</span>
              </div>
            </div>

            {/* Quick fill */}
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              {[25, 50, 100, 250, 500].map(v => (
                <button
                  key={v}
                  onClick={() => setAmount(String(v))}
                  className="mono"
                  style={{
                    flex: 1, padding: '7px 0', fontSize: 11,
                    border: '1px solid var(--line)', borderRadius: 3,
                    color: amount === String(v) ? 'var(--ink-1)' : 'var(--ink-2)',
                    background: amount === String(v) ? 'var(--bg-2)' : 'transparent',
                  }}
                >
                  {v}
                </button>
              ))}
            </div>

            {/* Payout preview */}
            <div
              style={{
                marginTop: 20, padding: '14px 16px',
                background: 'var(--bg-0)', border: '1px solid var(--line)', borderRadius: 4,
              }}
            >
              <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 6 }}>
                If correct
              </div>
              <div className="mono" style={{ fontSize: 16, color: 'var(--ink-1)' }}>
                {payout.toFixed(2)} <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>cUSDT</span>
                <span style={{ color: profit >= 0 ? 'var(--yes)' : 'var(--no)', marginLeft: 10, fontSize: 13 }}>
                  {profit >= 0 ? '+' : ''}{profit.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Submit */}
            <button
              ref={submitRef}
              onClick={onPlaceBet}
              disabled={placeState !== 'idle' || amt <= 0}
              className={`shimmer ${placeState === 'done' ? 'fire' : ''}`}
              style={{
                position: 'relative',
                width: '100%',
                marginTop: 16,
                padding: '14px 0',
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.02em',
                borderRadius: 4,
                color: side === 'YES' ? '#0C1510' : '#150C0C',
                background: side === 'YES' ? 'var(--yes)' : 'var(--no)',
                borderLeft: '3px solid ' + (side === 'YES' ? 'var(--yes-dim)' : 'var(--no-dim)'),
                opacity: amt <= 0 ? 0.45 : 1,
                cursor: amt <= 0 ? 'not-allowed' : 'pointer',
                overflow: 'hidden',
                transition: 'background 200ms',
              }}
            >
              {placeState === 'idle' && 'Place bet'}
              {placeState === 'confirming' && 'Confirming…'}
              {placeState === 'done' && 'Done'}
            </button>

            <div
              className="mono"
              style={{
                marginTop: 14, fontSize: 10,
                color: 'var(--ink-3)', textAlign: 'center',
                letterSpacing: '0.1em', textTransform: 'uppercase',
              }}
            >
              Fee {m.fee} · Min {m.min} cUSDT
            </div>
          </GlowCard>
        </aside>
      </div>
    </div>
  );
}

function MetaCell({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ color: 'var(--ink-2)' }}>{value}</div>
    </div>
  );
}

function SideButton({ active, side, pct, onClick, dim }) {
  const isYes = side === 'YES';
  const color = isYes ? 'var(--yes)' : 'var(--no)';
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        padding: '16px 0',
        border: '1px solid ' + (active ? color : 'var(--line-2)'),
        borderLeft: active ? `3px solid ${color}` : '1px solid var(--line-2)',
        borderRadius: 4,
        background: active ? (isYes ? 'rgba(107,155,122,0.08)' : 'rgba(184,107,107,0.08)') : 'var(--bg-0)',
        opacity: dim ? 0.4 : 1,
        transition: 'all 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        transform: active ? 'scale(1.0)' : 'scale(0.98)',
        textAlign: 'center',
      }}
    >
      <div className="mono" style={{ fontSize: 11, color: color, letterSpacing: '0.18em', fontWeight: 500 }}>
        {side}
      </div>
      <div className="mono" style={{ fontSize: 20, color: 'var(--ink-1)', marginTop: 6, letterSpacing: '-0.01em' }}>
        {pct.toFixed(1)}%
      </div>
    </button>
  );
}

function seedFeed(m) {
  const arr = [];
  for (let i = 0; i < 8; i++) arr.push(makeFeedEntry(m, 22184000 - i * 3));
  return arr;
}
function makeFeedEntry(m, block) {
  const addrs = window.seededAddresses;
  return {
    id: Math.random().toString(36).slice(2),
    side: Math.random() < (m.yes / 100) ? 'YES' : 'NO',
    addr: addrs[Math.floor(Math.random() * addrs.length)],
    block: block || (22184000 + Math.floor(Math.random() * 900)),
  };
}

Object.assign(window, { MarketDetailPage });
