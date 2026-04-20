// ============================================================
// Vaults page
// ============================================================

function VaultsPage() {
  return (
    <div className="page-in" style={{ maxWidth: 1280, margin: '0 auto', padding: '44px 48px 80px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 }}>
        <h1 className="serif" style={{ fontSize: 38, fontWeight: 500, letterSpacing: '-0.02em' }}>Vaults</h1>
        <button style={{
          fontSize: 12, padding: '8px 14px',
          border: '1px solid var(--line-2)', borderRadius: 3,
          color: 'var(--ink-1)', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Icon name="plus" size={12}/> Create vault
        </button>
      </div>
      <p style={{ color: 'var(--ink-3)', fontSize: 13, marginBottom: 36, maxWidth: 520 }}>
        Follow a manager's strategy. Your deposits mirror their positions — without you or them seeing each other's sizes.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 14 }}>
        {window.VAULTS.map(v => <VaultCard key={v.id} v={v} />)}
      </div>
    </div>
  );
}

function VaultCard({ v }) {
  const rep = v.rep;
  // reputation ring
  const C = 2 * Math.PI * 9;
  return (
    <GlowCard style={{ padding: 22 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
        <div>
          <div className="serif" style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-0.01em' }}>{v.name}</div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 4 }}>
            by {v.manager}
          </div>
        </div>
        {/* rep ring */}
        <div style={{ position: 'relative', width: 28, height: 28 }}>
          <svg width="28" height="28" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" fill="none" stroke="var(--line-2)" strokeWidth="1.5"/>
            <circle
              cx="12" cy="12" r="9" fill="none"
              stroke="var(--gold)" strokeWidth="1.5"
              strokeDasharray={`${C * rep / 100} ${C}`}
              transform="rotate(-90 12 12)"
              strokeLinecap="round"
            />
          </svg>
          <span className="mono" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--gold)' }}>{rep}</span>
        </div>
      </div>

      <div
        className="mono"
        style={{ display: 'flex', gap: 18, fontSize: 11, color: 'var(--ink-3)', marginBottom: 18 }}
      >
        <span><span style={{ color: 'var(--ink-1)' }}>{v.followers}</span> followers</span>
        <span style={{ color: 'var(--ink-4)' }}>·</span>
        <span><span style={{ color: 'var(--ink-1)' }}>{window.fmtUSD(v.aum)}</span> AUM</span>
        <span style={{ color: 'var(--ink-4)' }}>·</span>
        <span style={{ color: v.perf >= 0 ? 'var(--yes)' : 'var(--no)' }}>
          {v.perf > 0 ? '+' : ''}{v.perf}%
        </span>
      </div>

      {/* Fee bar */}
      <div style={{ marginBottom: 22 }}>
        <div style={{ height: 6, borderRadius: 2, background: 'var(--bg-3)', overflow: 'hidden', position: 'relative' }}>
          <div style={{ width: `${Math.min(v.fee * 4, 100)}%`, height: '100%', background: 'linear-gradient(90deg, var(--gold-dim), var(--gold))' }}/>
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 6, letterSpacing: '0.06em' }}>
          {v.fee}% performance fee
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{
          flex: 1, padding: '10px 0', fontSize: 12,
          background: 'var(--gold)', color: '#1A1511',
          borderRadius: 3, fontWeight: 500,
        }}>
          Deposit
        </button>
        <button style={{
          padding: '10px 16px', fontSize: 12,
          border: '1px solid var(--line-2)', borderRadius: 3,
          color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          Details <Icon name="arrow-right" size={11}/>
        </button>
      </div>
    </GlowCard>
  );
}

Object.assign(window, { VaultsPage });
