// ============================================================
// Landing page
// ============================================================

function LandingPage({ setRoute }) {
  const totalVolume = window.MARKETS.reduce((s, m) => s + m.pool, 0);
  const activeMarkets = window.MARKETS.filter(m => !m.resolved).length;
  const totalBets = window.MARKETS.reduce((s, m) => s + m.bets, 0);

  return (
    <div className="page-in" style={{ minHeight: 'calc(100vh - 52px)', display: 'flex', flexDirection: 'column' }}>
      {/* Hero */}
      <section
        style={{
          maxWidth: 1280,
          width: '100%',
          margin: '0 auto',
          padding: '120px 48px 80px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: 900 }}>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--gold)',
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              marginBottom: 28,
            }}
          >
            <span style={{ marginRight: 10 }}>—</span>
            Prediction markets, private by default
          </div>
          <h1
            className="serif"
            style={{
              fontSize: 'clamp(48px, 7vw, 92px)',
              lineHeight: 1.02,
              letterSpacing: '-0.025em',
              fontWeight: 500,
              color: 'var(--ink-1)',
              textWrap: 'balance',
            }}
          >
            The house can't see <br/>
            <em style={{ color: 'var(--gold)', fontStyle: 'italic', fontWeight: 400 }}>your cards.</em>
          </h1>
          <p
            style={{
              marginTop: 28,
              fontSize: 17,
              color: 'var(--ink-2)',
              maxWidth: 560,
              lineHeight: 1.55,
            }}
          >
            Prediction markets with encrypted positions. No one — not other traders,
            not market makers, not us — sees your side or size until you reveal it.
          </p>

          <div style={{ display: 'flex', gap: 10, marginTop: 44 }}>
            <button
              onClick={() => setRoute('/markets')}
              style={{
                padding: '13px 22px',
                background: 'var(--gold)',
                color: '#1A1511',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.01em',
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'background 200ms, transform 200ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E6B95A'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--gold)'; }}
            >
              Trade now <Icon name="arrow-right" size={13} color="#1A1511"/>
            </button>
            <button
              onClick={() => setRoute('/markets')}
              style={{
                padding: '13px 22px',
                border: '1px solid var(--line-2)',
                borderRadius: 4,
                color: 'var(--ink-1)',
                fontSize: 13,
              }}
            >
              View markets
            </button>
          </div>
        </div>

        {/* Stats bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 40,
            marginTop: 110,
            paddingTop: 40,
            borderTop: '1px solid var(--line)',
            maxWidth: 900,
          }}
        >
          <Stat label="Total volume"    value={window.fmtUSD(totalVolume)} large />
          <Stat label="Active markets"  value={activeMarkets} large />
          <Stat label="Bets placed"     value={window.fmtNum(totalBets)} large />
          <Stat label="Avg. payout"     value="1.87×" large tone="gold" />
        </div>
      </section>

      {/* Live ticker */}
      <div>
        <div style={{
          maxWidth: 1280, margin: '0 auto', padding: '0 48px 10px',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <PulseDot color="var(--yes)"/>
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--ink-3)',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
            }}
          >
            Live markets
          </span>
        </div>
        <LiveTicker markets={window.MARKETS} />
      </div>
    </div>
  );
}

Object.assign(window, { LandingPage });
