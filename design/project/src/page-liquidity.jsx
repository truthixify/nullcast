// ============================================================
// Liquidity page
// ============================================================

function LiquidityPage({ setRoute }) {
  const [reveal, setReveal] = React.useState(false);
  return (
    <div className="page-in" style={{ maxWidth: 1280, margin: '0 auto', padding: '44px 48px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 36 }}>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, letterSpacing: '-0.02em' }}>Liquidity</h1>
        <button
          onClick={() => setReveal(true)}
          disabled={reveal}
          style={{
            fontSize: 12, padding: '8px 14px',
            border: '1px solid ' + (reveal ? 'var(--line)' : 'var(--gold-dim)'),
            borderRadius: 3,
            color: reveal ? 'var(--ink-3)' : 'var(--gold)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Icon name="eye" size={12}/>
          {reveal ? 'Revealed' : 'Reveal shares'}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 12 }}>
        {window.LIQUIDITY.map(lp => {
          const m = window.findMarket(lp.marketId);
          const sharePct = lp.share / lp.tvl * 100;
          return (
            <GlowCard key={lp.marketId} style={{ padding: 22 }}>
              <button onClick={() => setRoute(`/markets/${lp.marketId}`)} style={{ textAlign: 'left', width: '100%', padding: 0 }}>
                <div className="serif" style={{ fontSize: 17, fontWeight: 500, letterSpacing: '-0.005em', lineHeight: 1.3, marginBottom: 18, color: 'var(--ink-1)' }}>
                  {m?.q}
                </div>
              </button>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Your share
                  </div>
                  <div className="mono" style={{ fontSize: 20, color: lp.share > 0 ? 'var(--ink-1)' : 'var(--ink-3)', letterSpacing: '-0.01em' }}>
                    {lp.share > 0 ? (
                      <>
                        <CipherReveal value={lp.share.toFixed(2)} reveal={reveal} width={7}/>
                        <span style={{ color: 'var(--ink-3)', fontSize: 11, marginLeft: 6 }}>cUSDT</span>
                      </>
                    ) : (
                      <span style={{ fontSize: 14 }}>—</span>
                    )}
                  </div>
                  {lp.share > 0 && reveal && (
                    <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 4 }}>
                      {sharePct.toFixed(3)}% of pool
                    </div>
                  )}
                </div>
                <div>
                  <div style={{ fontSize: 9, color: 'var(--ink-4)', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 6 }}>
                    Pool TVL
                  </div>
                  <div className="mono" style={{ fontSize: 20, color: 'var(--ink-1)', letterSpacing: '-0.01em' }}>
                    {window.fmtUSD(lp.tvl)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{
                  flex: 1, padding: '9px 0', fontSize: 12,
                  background: 'var(--gold)', color: '#1A1511',
                  borderRadius: 3, fontWeight: 500,
                }}>
                  Deposit
                </button>
                <button
                  disabled={lp.share === 0}
                  style={{
                    flex: 1, padding: '9px 0', fontSize: 12,
                    border: '1px solid var(--line-2)', borderRadius: 3,
                    color: lp.share === 0 ? 'var(--ink-4)' : 'var(--ink-2)',
                    opacity: lp.share === 0 ? 0.5 : 1,
                  }}>
                  Withdraw
                </button>
              </div>
            </GlowCard>
          );
        })}
      </div>
    </div>
  );
}

Object.assign(window, { LiquidityPage });
