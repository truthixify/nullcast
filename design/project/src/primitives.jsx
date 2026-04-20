// ============================================================
// Primitives: GlowCard, OddsBar, CipherReveal, RippleTrigger,
// PulseDot, LiveTicker
// ============================================================

const { useState, useEffect, useRef, useCallback } = React;

// --- GlowCard -------------------------------------------------
// A card wrapper that tracks cursor and exposes --mx/--my CSS
// vars so the ::before gradient glow follows the pointer.
function GlowCard({ children, className = '', as: Tag = 'div', onClick, style, ...rest }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - r.left}px`);
    el.style.setProperty('--my', `${e.clientY - r.top}px`);
  };
  return (
    <Tag
      ref={ref}
      className={`glow-card ${className}`}
      onMouseMove={onMove}
      onClick={onClick}
      style={style}
      {...rest}
    >
      {children}
    </Tag>
  );
}

// --- OddsBar --------------------------------------------------
// Full-width two-tone bar, eased transitions on width.
// size: 'sm' | 'md' | 'lg'
function OddsBar({ yes, no, size = 'md', showLabels = true, muted = false }) {
  const heights = { sm: 6, md: 10, lg: 14 };
  const h = heights[size];
  const yesColor = muted ? 'var(--ink-4)' : 'var(--yes)';
  const noColor = muted ? 'var(--ink-4)' : 'var(--no)';
  return (
    <div>
      <div
        style={{
          position: 'relative',
          height: h,
          borderRadius: 2,
          background: 'var(--bg-3)',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        <div
          className="odds-fill"
          style={{
            width: `${yes}%`,
            background: `linear-gradient(90deg, ${yesColor} 0%, ${muted ? 'var(--ink-4)' : 'rgba(107,155,122,0.78)'} 100%)`,
          }}
        />
        <div
          className="odds-fill"
          style={{
            width: `${no}%`,
            background: `linear-gradient(90deg, ${muted ? 'var(--ink-4)' : 'rgba(184,107,107,0.78)'} 0%, ${noColor} 100%)`,
          }}
        />
      </div>
      {showLabels && (
        <div
          className="mono"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 6,
            fontSize: 11,
            color: 'var(--ink-2)',
          }}
        >
          <span style={{ color: muted ? 'var(--ink-3)' : 'var(--yes)' }}>
            YES {yes}%
          </span>
          <span style={{ color: muted ? 'var(--ink-3)' : 'var(--no)' }}>
            {no}% NO
          </span>
        </div>
      )}
    </div>
  );
}

// --- CipherReveal --------------------------------------------
// Renders obfuscated dots; when `reveal` becomes true, runs a
// slot-machine scramble for ~500ms then locks on the real value.
// `value` is a string (already formatted).
function CipherReveal({ value, reveal, width = 9, onDone, className = '' }) {
  const [phase, setPhase] = useState('hidden'); // 'hidden' | 'scramble' | 'done'
  const [text, setText] = useState('•'.repeat(width));
  const rafRef = useRef(null);

  useEffect(() => {
    if (!reveal) {
      setPhase('hidden');
      setText('•'.repeat(width));
      return;
    }
    if (phase === 'done') return;
    setPhase('scramble');
    const start = performance.now();
    const DURATION = 520;
    const CHARS = '0123456789.';
    const target = value;
    const targetLen = target.length;

    function tick(now) {
      const t = Math.min(1, (now - start) / DURATION);
      if (t >= 1) {
        setText(target);
        setPhase('done');
        onDone && onDone();
        return;
      }
      // progressively lock characters left-to-right
      const lockCount = Math.floor(t * targetLen);
      let out = '';
      for (let i = 0; i < targetLen; i++) {
        if (i < lockCount) out += target[i];
        else if (target[i] === '.' || target[i] === ',') out += target[i];
        else out += CHARS[Math.floor(Math.random() * CHARS.length)];
      }
      setText(out);
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [reveal]);

  const cls =
    phase === 'done' ? 'cipher-cell revealed bloom-gold' :
    phase === 'scramble' ? 'cipher-cell revealing' :
    'cipher-cell';
  return <span className={`${cls} ${className}`}>{text}</span>;
}

// --- RippleTrigger -------------------------------------------
// Imperative: call triggerRipple(element, color) to add a ripple
function spawnRipple(el, x, y, color = 'rgba(212,168,67,0.45)') {
  const layer = el.querySelector('.ripple-layer') || (() => {
    const l = document.createElement('div');
    l.className = 'ripple-layer';
    el.appendChild(l);
    return l;
  })();
  const dot = document.createElement('span');
  dot.className = 'ripple-dot';
  dot.style.left = (x - 12) + 'px';
  dot.style.top = (y - 12) + 'px';
  dot.style.background = color;
  layer.appendChild(dot);
  setTimeout(() => dot.remove(), 1000);
}

// --- PulseDot -----------------------------------------------
function PulseDot({ color = 'var(--gold)' }) {
  return <span className="pulse-dot" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />;
}

// --- LiveTicker ---------------------------------------------
function LiveTicker({ markets }) {
  const items = markets.filter(m => !m.resolved).slice(0, 6);
  const double = [...items, ...items];
  return (
    <div
      style={{
        borderTop: '1px solid var(--line)',
        borderBottom: '1px solid var(--line)',
        overflow: 'hidden',
        padding: '14px 0',
        background: 'var(--bg-1)',
        position: 'relative',
      }}
    >
      <div className="ticker-track">
        {double.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '0 28px',
              borderRight: '1px solid var(--line)',
              whiteSpace: 'nowrap',
              minWidth: 340,
            }}
          >
            <span className="serif" style={{ fontSize: 15, color: 'var(--ink-1)', fontStyle: 'italic' }}>
              {m.q}
            </span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--yes)' }}>
              {m.yes}%
            </span>
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: m.trend > 0 ? 'var(--yes)' : m.trend < 0 ? 'var(--no)' : 'var(--ink-3)',
              }}
            >
              {m.trend > 0 ? '▲' : m.trend < 0 ? '▼' : '·'} {Math.abs(m.trend).toFixed(1)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Stat (for stats rows) ----------------------------------
function Stat({ label, value, mono = true, large = false, tone = 'default' }) {
  const color =
    tone === 'yes' ? 'var(--yes)' :
    tone === 'no' ? 'var(--no)' :
    tone === 'gold' ? 'var(--gold)' :
    'var(--ink-1)';
  return (
    <div>
      <div
        className={mono ? 'mono' : ''}
        style={{
          fontSize: large ? 34 : 22,
          color,
          fontWeight: 500,
          lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 6,
          fontSize: 10,
          color: 'var(--ink-3)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </div>
    </div>
  );
}

// --- Icon (minimal inline SVG) ------------------------------
function Icon({ name, size = 16, color = 'currentColor' }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: color, strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home': return <svg {...common}><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9Z"/></svg>;
    case 'markets': return <svg {...common}><path d="M3 18V8m6 10V4m6 14v-7m6 7v-10"/></svg>;
    case 'portfolio': return <svg {...common}><path d="M3 7h18v12H3z"/><path d="M3 7V5a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2"/></svg>;
    case 'vaults': return <svg {...common}><rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="12" cy="12" r="3.5"/><path d="M12 8.5v-1M12 16.5v-1M8.5 12h-1M16.5 12h-1"/></svg>;
    case 'score': return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case 'liquidity': return <svg {...common}><path d="M12 3c4 5 6 8.5 6 11.5A6 6 0 0 1 6 14.5C6 11.5 8 8 12 3Z"/></svg>;
    case 'search': return <svg {...common}><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>;
    case 'arrow-right': return <svg {...common}><path d="M5 12h14M13 5l7 7-7 7"/></svg>;
    case 'arrow-up': return <svg {...common}><path d="M12 19V5M5 12l7-7 7 7"/></svg>;
    case 'arrow-down': return <svg {...common}><path d="M12 5v14M5 12l7 7 7-7"/></svg>;
    case 'check': return <svg {...common}><path d="M5 12l5 5L20 7"/></svg>;
    case 'x': return <svg {...common}><path d="M6 6l12 12M18 6 6 18"/></svg>;
    case 'eye': return <svg {...common}><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>;
    case 'plus': return <svg {...common}><path d="M12 5v14M5 12h14"/></svg>;
    default: return null;
  }
}

Object.assign(window, {
  GlowCard, OddsBar, CipherReveal, spawnRipple, PulseDot, LiveTicker, Stat, Icon,
});
