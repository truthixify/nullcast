// ============================================================
// Shell: Header, LeftNav, CommandPalette, page router
// ============================================================

const { useState: useShellState, useEffect: useShellEffect, useMemo } = React;

function Shell({ route, setRoute, onOpenPalette, children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-0)' }}>
      <LeftNav route={route} setRoute={setRoute} onOpenPalette={onOpenPalette} />
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        <TopBar onOpenPalette={onOpenPalette} />
        <div style={{ flex: 1, minHeight: 0 }}>{children}</div>
      </main>
    </div>
  );
}

function LeftNav({ route, setRoute, onOpenPalette }) {
  const items = [
    { id: '/',          label: 'Home',       icon: 'home' },
    { id: '/markets',   label: 'Markets',    icon: 'markets' },
    { id: '/portfolio', label: 'Portfolio',  icon: 'portfolio' },
    { id: '/vaults',    label: 'Vaults',     icon: 'vaults' },
    { id: '/score',     label: 'Score',      icon: 'score' },
    { id: '/liquidity', label: 'Liquidity',  icon: 'liquidity' },
  ];
  return (
    <aside
      style={{
        width: 220,
        borderRight: '1px solid var(--line)',
        background: 'var(--bg-0)',
        padding: '20px 14px',
        position: 'sticky',
        top: 0,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        gap: 24,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 8px' }}>
        <NullCastMark />
        <span className="serif" style={{ fontSize: 20, letterSpacing: '-0.01em', fontWeight: 500 }}>
          NullCast
        </span>
      </div>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {items.map((it) => {
          const active = (it.id === '/' ? route === '/' : route.startsWith(it.id));
          return (
            <button
              key={it.id}
              onClick={() => setRoute(it.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '9px 10px',
                borderRadius: 4,
                color: active ? 'var(--ink-1)' : 'var(--ink-2)',
                background: active ? 'var(--bg-2)' : 'transparent',
                borderLeft: active ? '2px solid var(--gold)' : '2px solid transparent',
                fontSize: 13,
                letterSpacing: '-0.005em',
                textAlign: 'left',
                transition: 'background-color 160ms ease, color 160ms ease',
              }}
              onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'var(--bg-1)'; }}
              onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              <Icon name={it.icon} size={15} />
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ flex: 1 }} />

      {/* Command palette hint */}
      <button
        onClick={onOpenPalette}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          borderRadius: 4,
          border: '1px solid var(--line)',
          color: 'var(--ink-3)',
          fontSize: 12,
          justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Icon name="search" size={12} /> Search
        </span>
        <span className="kbd">⌘K</span>
      </button>

      {/* Account chip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 10px',
          borderTop: '1px solid var(--line)',
          paddingTop: 16,
        }}
      >
        <div
          style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--gold-dim), var(--gold))',
            position: 'relative',
          }}
        >
          <div style={{
            position: 'absolute', inset: 2, borderRadius: '50%',
            background: 'var(--bg-0)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--f-mono)', fontSize: 9, color: 'var(--gold)',
          }}>7A</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-1)' }}>0x7a3f…4e19</span>
          <span className="mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>2,410.00 cUSDT</span>
        </div>
      </div>
    </aside>
  );
}

function NullCastMark() {
  // Abstract mark: concentric arcs, one gold
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="var(--ink-3)" strokeWidth="1"/>
      <circle cx="12" cy="12" r="5.5" stroke="var(--gold)" strokeWidth="1.2"/>
      <circle cx="12" cy="12" r="2" fill="var(--gold)"/>
    </svg>
  );
}

function TopBar({ onOpenPalette }) {
  return (
    <div
      style={{
        height: 52,
        borderBottom: '1px solid var(--line)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 28px',
        gap: 18,
        position: 'sticky',
        top: 0,
        background: 'rgba(12, 11, 10, 0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 10,
      }}
    >
      <button
        onClick={onOpenPalette}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 10px',
          border: '1px solid var(--line)', borderRadius: 4,
          color: 'var(--ink-3)', fontSize: 12,
          minWidth: 220, justifyContent: 'space-between',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="search" size={12} /> Search markets, addresses…
        </span>
        <span className="kbd">⌘K</span>
      </button>
      <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <PulseDot color="var(--yes)" />
        <span>block 22,184,{Math.floor(Math.random()*899)+100}</span>
      </span>
    </div>
  );
}

// --- CommandPalette -----------------------------------------
function CommandPalette({ open, onClose, onNavigate }) {
  const [q, setQ] = useShellState('');
  const inputRef = React.useRef(null);

  useShellEffect(() => {
    if (open) {
      setQ('');
      setTimeout(() => inputRef.current && inputRef.current.focus(), 50);
    }
  }, [open]);

  const items = useMemo(() => {
    const nav = [
      { kind: 'page', id: '/', label: 'Home', hint: 'Landing page' },
      { kind: 'page', id: '/markets', label: 'Markets', hint: 'Browse all active markets' },
      { kind: 'page', id: '/portfolio', label: 'Portfolio', hint: 'Your positions' },
      { kind: 'page', id: '/vaults', label: 'Vaults', hint: 'Follow top managers' },
      { kind: 'page', id: '/score', label: 'Score', hint: 'Your reputation' },
      { kind: 'page', id: '/liquidity', label: 'Liquidity', hint: 'LP positions' },
    ];
    const markets = window.MARKETS.map(m => ({
      kind: 'market', id: `/markets/${m.id}`, label: m.q, hint: `${m.yes}% YES · ${window.fmtUSD(m.pool)} pool`
    }));
    const all = [...nav, ...markets];
    if (!q.trim()) return all.slice(0, 10);
    const query = q.toLowerCase();
    return all.filter(x => x.label.toLowerCase().includes(query) || x.hint.toLowerCase().includes(query)).slice(0, 10);
  }, [q, open]);

  const [selected, setSelected] = useShellState(0);
  useShellEffect(() => { setSelected(0); }, [q, open]);

  useShellEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, items.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      else if (e.key === 'Enter') {
        const it = items[selected];
        if (it) { onNavigate(it.id); onClose(); }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, items, selected, onClose, onNavigate]);

  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(8, 7, 6, 0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex', justifyContent: 'center', alignItems: 'flex-start',
        paddingTop: '14vh',
        animation: 'fade-in 160ms ease-out',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          background: 'var(--bg-1)',
          border: '1px solid var(--line-2)',
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,168,67,0.05)',
          animation: 'scale-in 180ms cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <Icon name="search" size={14} color="var(--ink-3)" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search markets, pages, addresses…"
            style={{ flex: 1, fontSize: 14, color: 'var(--ink-1)' }}
          />
          <span className="kbd">esc</span>
        </div>
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {items.length === 0 && (
            <div style={{ padding: 24, color: 'var(--ink-3)', fontSize: 12, textAlign: 'center' }}>
              No results
            </div>
          )}
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={() => { onNavigate(it.id); onClose(); }}
              onMouseEnter={() => setSelected(i)}
              style={{
                width: '100%',
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 18px',
                background: selected === i ? 'var(--bg-2)' : 'transparent',
                borderLeft: selected === i ? '2px solid var(--gold)' : '2px solid transparent',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  fontSize: 9, color: 'var(--ink-3)',
                  letterSpacing: '0.14em', textTransform: 'uppercase',
                  width: 60,
                }}
              >
                {it.kind === 'market' ? 'Market' : 'Page'}
              </span>
              <span style={{ flex: 1, color: 'var(--ink-1)', fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {it.label}
              </span>
              <span className="mono" style={{ fontSize: 11, color: 'var(--ink-3)' }}>{it.hint}</span>
            </button>
          ))}
        </div>
        <div style={{ padding: '8px 18px', borderTop: '1px solid var(--line)', display: 'flex', gap: 14, fontSize: 10, color: 'var(--ink-3)' }}>
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span><span className="kbd">esc</span> close</span>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Shell, CommandPalette });
