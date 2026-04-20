// ============================================================
// Score page
// ============================================================

function ScorePage() {
  const s = window.SCORE;
  const [animatedScore, setAnimatedScore] = React.useState(0);

  React.useEffect(() => {
    const start = performance.now();
    const D = 1200;
    let raf;
    function tick(now) {
      const t = Math.min(1, (now - start) / D);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedScore(Math.round(s.total * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const C = 2 * Math.PI * 80;
  const progress = s.total / 1000;

  return (
    <div className="page-in" style={{ maxWidth: 980, margin: '0 auto', padding: '44px 48px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 36 }}>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, letterSpacing: '-0.02em' }}>Score</h1>
        <button style={{
          fontSize: 11, padding: '7px 12px',
          border: '1px solid var(--line-2)', borderRadius: 3,
          color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="plus" size={11}/> Mint test cUSDT
        </button>
      </div>

      {/* Hero score ring */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
        <div style={{ position: 'relative', width: 220, height: 220 }}>
          <svg width="220" height="220" viewBox="0 0 200 200">
            <circle cx="100" cy="100" r="80" fill="none" stroke="var(--line-2)" strokeWidth="1.5"/>
            <circle
              cx="100" cy="100" r="80" fill="none"
              stroke="var(--gold)" strokeWidth="2"
              strokeDasharray={`${C * progress} ${C}`}
              transform="rotate(-90 100 100)"
              strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 1200ms cubic-bezier(0.22, 1, 0.36, 1)', filter: 'drop-shadow(0 0 8px rgba(212,168,67,0.4))' }}
            />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div className="mono" style={{ fontSize: 64, color: 'var(--gold)', fontWeight: 500, letterSpacing: '-0.03em', lineHeight: 1 }}>
              {animatedScore}
            </div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: 8 }}>
              {s.tier}
            </div>
          </div>
        </div>
      </div>

      {/* Tier scale */}
      <div style={{ marginBottom: 56 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, marginBottom: 10 }}>
          {s.tiers.map((t, i) => (
            <div
              key={t}
              style={{
                height: 4, borderRadius: 1,
                background: i <= s.tierIndex ? 'var(--gold)' : 'var(--bg-3)',
                opacity: i === s.tierIndex ? 1 : i < s.tierIndex ? 0.7 : 1,
              }}
            />
          ))}
        </div>
        <div className="mono" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, fontSize: 10, color: 'var(--ink-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {s.tiers.map((t, i) => (
            <span key={t} style={{ color: i === s.tierIndex ? 'var(--gold)' : 'var(--ink-3)' }}>
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Components */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {s.components.map(c => (
          <div key={c.label}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <span style={{ fontSize: 13, color: 'var(--ink-1)' }}>{c.label}</span>
              <span className="mono" style={{ fontSize: 13, color: 'var(--ink-1)' }}>
                {c.value}{c.unit || ''}
              </span>
            </div>
            <div style={{ height: 4, borderRadius: 1, background: 'var(--bg-3)', overflow: 'hidden' }}>
              <div
                className="odds-fill"
                style={{ width: `${c.bar}%`, height: '100%', background: 'linear-gradient(90deg, var(--gold-dim), var(--gold))' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { ScorePage });
