// ============================================================
// Portfolio page — stats + table + reveal-all
// ============================================================

function PortfolioPage({ setRoute }) {
  const [revealAll, setRevealAll] = React.useState(false);
  const s = window.PORTFOLIO_SUMMARY;

  return (
    <div className="page-in" style={{ maxWidth: 1280, margin: '0 auto', padding: '44px 48px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 36 }}>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, letterSpacing: '-0.02em' }}>
          Portfolio
        </h1>
        <button
          onClick={() => setRevealAll(true)}
          disabled={revealAll}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            fontSize: 12, padding: '8px 14px',
            border: '1px solid ' + (revealAll ? 'var(--line)' : 'var(--gold-dim)'),
            borderRadius: 3,
            color: revealAll ? 'var(--ink-3)' : 'var(--gold)',
          }}
        >
          <Icon name="eye" size={12} />
          {revealAll ? 'All revealed' : 'Reveal all'}
        </button>
      </div>

      {/* Stats row */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 48, paddingBottom: 32, borderBottom: '1px solid var(--line)',
        }}
      >
        <Stat label="Positions" value={s.positions} large />
        <div>
          <div className="mono" style={{ fontSize: 34, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
            <CipherReveal value={s.atStake.toFixed(2)} reveal={revealAll} width={8}/>
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            At stake
          </div>
        </div>
        <div>
          <div className="mono" style={{
            fontSize: 34, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1,
            color: revealAll ? (s.pnl >= 0 ? 'var(--yes)' : 'var(--no)') : 'var(--ink-1)'
          }}>
            {revealAll ? (s.pnl >= 0 ? '+' : '') : ''}<CipherReveal value={s.pnl.toFixed(2)} reveal={revealAll} width={8}/>
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            P&amp;L
          </div>
        </div>
        <div>
          <div className="mono" style={{ fontSize: 34, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.1, color: 'var(--gold)' }}>
            {s.claimable.toFixed(2)}
          </div>
          <div style={{ marginTop: 6, fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Claimable
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ marginTop: 36 }}>
        <div
          className="mono"
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 60px 120px 140px 120px',
            padding: '10px 18px',
            fontSize: 9,
            color: 'var(--ink-4)',
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            borderBottom: '1px solid var(--line)',
          }}
        >
          <span>Market</span>
          <span>Side</span>
          <span>Amount</span>
          <span>Odds</span>
          <span style={{ textAlign: 'right' }}>P&amp;L</span>
        </div>
        {window.PORTFOLIO_POSITIONS.map(p => {
          const m = window.findMarket(p.marketId);
          const delta = p.current - p.entry;
          return (
            <button
              key={p.id}
              onClick={() => setRoute(`/markets/${p.marketId}`)}
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '2fr 60px 120px 140px 120px',
                alignItems: 'center',
                padding: '16px 18px',
                borderBottom: '1px solid var(--line)',
                textAlign: 'left',
                background: 'transparent',
                transition: 'background 160ms',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span className="serif" style={{ fontSize: 15, color: 'var(--ink-1)', letterSpacing: '-0.005em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 16 }}>
                {m?.q}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.side === 'YES' ? 'var(--yes)' : 'var(--no)' }}/>
                <span className="mono" style={{ fontSize: 11, color: p.side === 'YES' ? 'var(--yes)' : 'var(--no)' }}>
                  {p.side}
                </span>
              </span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--ink-1)' }}>
                <CipherReveal value={p.amount.toFixed(2)} reveal={revealAll} width={7}/>
              </span>
              <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--ink-3)' }}>{p.entry}%</span>
                <Icon name="arrow-right" size={10} color="var(--ink-4)"/>
                <span style={{ color: 'var(--ink-1)' }}>{p.current}%</span>
                <span style={{ color: delta > 0 ? 'var(--yes)' : delta < 0 ? 'var(--no)' : 'var(--ink-3)', fontSize: 10 }}>
                  {delta > 0 ? '▲' : delta < 0 ? '▼' : ''}{Math.abs(delta)}
                </span>
              </span>
              <span className="mono" style={{ fontSize: 13, textAlign: 'right', color: revealAll ? (p.pnl >= 0 ? 'var(--yes)' : 'var(--no)') : 'var(--ink-1)' }}>
                {revealAll ? (p.pnl >= 0 ? '+' : '') : ''}<CipherReveal value={Math.abs(p.pnl).toFixed(2)} reveal={revealAll} width={6}/>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { PortfolioPage });
