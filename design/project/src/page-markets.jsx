// ============================================================
// Markets list page
// ============================================================

function MarketsPage({ setRoute }) {
  const [status, setStatus] = React.useState('Active'); // Active | Resolved | All
  const [category, setCategory] = React.useState('All');
  const [sort, setSort] = React.useState('Pool size');

  const filtered = window.MARKETS.filter(m => {
    if (status === 'Active' && m.resolved) return false;
    if (status === 'Resolved' && !m.resolved) return false;
    if (category !== 'All' && m.cat !== category) return false;
    return true;
  }).sort((a, b) => {
    if (sort === 'Pool size') return b.pool - a.pool;
    if (sort === 'Bets')      return b.bets - a.bets;
    if (sort === 'Ending soon') return 0;
    return 0;
  });

  return (
    <div
      className="page-in"
      style={{ maxWidth: 1280, margin: '0 auto', padding: '44px 48px 80px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, letterSpacing: '-0.02em' }}>
          Markets
        </h1>
        <div className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          {filtered.length} showing
        </div>
      </div>

      {/* Status tabs — underlined text */}
      <div style={{ display: 'flex', gap: 26, borderBottom: '1px solid var(--line)', marginBottom: 20 }}>
        {['Active', 'Resolved', 'All'].map(s => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            style={{
              padding: '10px 0',
              fontSize: 13,
              color: status === s ? 'var(--ink-1)' : 'var(--ink-3)',
              borderBottom: status === s ? '1px solid var(--gold)' : '1px solid transparent',
              marginBottom: -1,
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Category pills + sort */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 36 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1 }}>
          {window.CATEGORIES.map(c => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              style={{
                padding: '6px 12px',
                fontSize: 12,
                borderRadius: 100,
                border: '1px solid ' + (category === c ? 'var(--line-hot)' : 'var(--line)'),
                color: category === c ? 'var(--ink-1)' : 'var(--ink-2)',
                background: category === c ? 'var(--bg-2)' : 'transparent',
                whiteSpace: 'nowrap',
                transition: 'all 160ms ease',
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div style={{ position: 'relative' }}>
          <select
            value={sort}
            onChange={e => setSort(e.target.value)}
            style={{
              appearance: 'none',
              fontFamily: 'var(--f-body)',
              padding: '6px 26px 6px 10px',
              fontSize: 12,
              border: '1px solid var(--line)',
              borderRadius: 3,
              color: 'var(--ink-2)',
              background: 'var(--bg-1)',
              cursor: 'pointer',
            }}
          >
            <option>Pool size</option>
            <option>Bets</option>
            <option>Ending soon</option>
          </select>
          <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-3)', fontSize: 9, pointerEvents: 'none' }}>▼</span>
        </div>
      </div>

      {/* Market cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(m => (
          <MarketCard key={m.id} m={m} onClick={() => setRoute(`/markets/${m.id}`)} />
        ))}
      </div>
    </div>
  );
}

function MarketCard({ m, onClick }) {
  const resolved = m.resolved;
  return (
    <GlowCard
      as="button"
      onClick={onClick}
      className="shimmer"
      style={{
        padding: '22px 26px',
        textAlign: 'left',
        display: 'block',
        cursor: 'pointer',
        width: '100%',
        fontFamily: 'inherit',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, marginBottom: 18 }}>
        <h3 className="serif" style={{ fontSize: 18, fontWeight: 500, letterSpacing: '-0.01em', lineHeight: 1.3, color: resolved ? 'var(--ink-2)' : 'var(--ink-1)', flex: 1 }}>
          {m.q}
        </h3>
        {m.hot && !resolved && (
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--gold)',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              opacity: 0.9,
            }}
          >
            ● hot
          </span>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <OddsBar yes={m.yes} no={m.no} size="md" muted={resolved} />
      </div>

      <div
        className="mono"
        style={{
          display: 'flex', gap: 18,
          fontSize: 11, color: 'var(--ink-3)',
          alignItems: 'center',
        }}
      >
        <span>{window.fmtUSD(m.pool)} pool</span>
        <span style={{ color: 'var(--ink-4)' }}>·</span>
        <span>{window.fmtNum(m.bets)} bets</span>
        <span style={{ color: 'var(--ink-4)' }}>·</span>
        <span>{m.expiry}</span>
        {!resolved && m.trend !== 0 && (
          <>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span style={{ color: m.trend > 0 ? 'var(--yes)' : 'var(--no)' }}>
              {m.trend > 0 ? '▲' : '▼'} {Math.abs(m.trend).toFixed(1)}%
            </span>
          </>
        )}
        {resolved && (
          <>
            <span style={{ color: 'var(--ink-4)' }}>·</span>
            <span style={{ color: 'var(--yes)' }}>Resolved {m.winner}</span>
          </>
        )}
      </div>
    </GlowCard>
  );
}

Object.assign(window, { MarketsPage });
