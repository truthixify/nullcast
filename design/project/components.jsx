/* Shared icons, pills, odds bar, encrypted value, header, footer */

const Icon = {
  Lock: (p) => (
    <svg viewBox="0 0 16 16" width={p.size || 12} height={p.size || 12} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <rect x="3" y="7" width="10" height="7" rx="1.5"/>
      <path d="M5 7V5a3 3 0 016 0v2"/>
    </svg>
  ),
  LockOpen: (p) => (
    <svg viewBox="0 0 16 16" width={p.size || 12} height={p.size || 12} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <rect x="3" y="7" width="10" height="7" rx="1.5"/>
      <path d="M5 7V5a3 3 0 015.3-1.9"/>
    </svg>
  ),
  Search: (p) => (
    <svg viewBox="0 0 16 16" width={p.size || 14} height={p.size || 14} fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <circle cx="7" cy="7" r="4.5"/>
      <path d="M10.5 10.5L14 14"/>
    </svg>
  ),
  ArrowUp: (p) => (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M6 10V2M3 5l3-3 3 3"/>
    </svg>
  ),
  ArrowDown: (p) => (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M6 2v8M3 7l3 3 3-3"/>
    </svg>
  ),
  Chevron: (p) => (
    <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M4 2l4 4-4 4"/>
    </svg>
  ),
  Plus: (p) => (
    <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M6 2v8M2 6h8"/>
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.7" {...p}>
      <path d="M3 7.5l3 3 5-6"/>
    </svg>
  ),
  Copy: (p) => (
    <svg viewBox="0 0 14 14" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.3" {...p}>
      <rect x="3" y="3" width="8" height="8" rx="1"/>
      <path d="M5 3V1.5A.5.5 0 015.5 1H11a1 1 0 011 1v5.5a.5.5 0 01-.5.5H10"/>
    </svg>
  ),
  External: (p) => (
    <svg viewBox="0 0 14 14" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.4" {...p}>
      <path d="M6 3H3v8h8V8"/>
      <path d="M8 2h4v4M12 2l-5 5"/>
    </svg>
  ),
  Refresh: (p) => (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" {...p}>
      <path d="M13 3v3h-3"/>
      <path d="M3 8a5 5 0 019.2-2.8L13 6M3 13v-3h3"/>
      <path d="M13 8a5 5 0 01-9.2 2.8L3 10"/>
    </svg>
  ),
};

// The brand mark: a geometric nullset — a tight square with a slash
const BrandMark = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
    <rect x="2.5" y="2.5" width="17" height="17" rx="4" stroke="currentColor" strokeWidth="1.3" opacity="0.55"/>
    <path d="M5 17L17 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
    <circle cx="11" cy="11" r="2.3" fill="currentColor" opacity="0.9"/>
  </svg>
);

/* =========================== Pill =========================== */
const Pill = ({ children, variant = "", className = "", live }) => (
  <span className={`pill ${variant} ${className}`}>
    {live && <span className="dot-live" />}
    {children}
  </span>
);

const FHEBadge = ({ children = "FHE" }) => (
  <span className="pill enc">
    <Icon.Lock size={10} />
    {children}
  </span>
);

/* =========================== OddsBar =========================== */
const OddsBar = ({ yes, no, size = "" }) => {
  const y = Math.max(0, Math.min(100, yes));
  return (
    <div className={`odds ${size}`}>
      <span className="yes-pct">{y.toFixed(0)}%</span>
      <div className="track" style={{ "--yes-w": y + "%" }}>
        <div className="yes-fill" />
        <div className="divider" />
      </div>
      <span className="no-pct">{(100 - y).toFixed(0)}%</span>
    </div>
  );
};

/* =========================== EncryptedValue =========================== */
// states: 'hidden' | 'decrypting' | 'revealed'
const EncryptedValue = ({ state, value, onDecrypt, compact, unit = "cUSDT" }) => {
  if (state === "revealed") {
    return (
      <span className="enc-val">
        <span className="reveal num">{value}</span>
        {unit && !compact && <span style={{color:"var(--t-3)", fontFamily:"var(--f-mono)"}}>{unit}</span>}
      </span>
    );
  }
  if (state === "decrypting") {
    return (
      <span className="enc-val">
        <Icon.Lock size={11} />
        <span className="shimmer mono">decrypting…</span>
      </span>
    );
  }
  return (
    <span className="enc-val">
      <Icon.Lock size={11} />
      <span className="dots mono">•••••••</span>
      {onDecrypt && (
        <button className="btn sm ghost" style={{height:22,padding:"0 8px",fontSize:11}} onClick={onDecrypt}>
          Decrypt
        </button>
      )}
    </span>
  );
};

/* =========================== Header =========================== */
const Header = ({ route, goto }) => {
  const navItems = [
    { id: "markets", label: "Markets" },
    { id: "portfolio", label: "Portfolio" },
    { id: "reputation", label: "Reputation" },
  ];
  return (
    <header className="site-header">
      <div className="container row">
        <a className="brand" onClick={() => goto("landing")} style={{cursor:"pointer"}}>
          <span className="mark" style={{color:"var(--acc)"}}><BrandMark /></span>
          <span>nullcast</span>
          <span className="pill neutral" style={{marginLeft:8,fontSize:9,letterSpacing:".1em"}}>BETA</span>
        </a>
        <nav className="nav">
          {navItems.map(n => (
            <a key={n.id}
               className={route?.page === n.id || route?.page?.startsWith(n.id) ? "active" : ""}
               onClick={() => goto(n.id)}
               style={{cursor:"pointer"}}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="header-spacer" />
        <div className="header-meta">
          <span className="pill enc"><Icon.Lock size={10}/> FHE · Sepolia</span>
        </div>
        <button className="btn secondary" style={{height:32}}>
          <span className="mono" style={{fontSize:12}}>0x7a…4e19</span>
        </button>
      </div>
    </header>
  );
};

/* =========================== Footer =========================== */
const Footer = () => (
  <footer className="site-footer">
    <div className="container row between">
      <div className="row" style={{color:"var(--t-3)"}}>
        <span className="brand" style={{fontSize:13,color:"var(--t-3)"}}>
          <span style={{color:"var(--t-3)"}}><BrandMark size={14}/></span>
          nullcast
        </span>
        <span className="mono" style={{color:"var(--t-4)"}}>v0.4.2</span>
      </div>
      <div className="row">
        <a className="link">GitHub</a>
        <span className="pill enc"><Icon.Lock size={10}/> Built on Zama fhEVM</span>
      </div>
    </div>
  </footer>
);

/* =========================== Toast =========================== */
const Toasts = ({ toasts }) => (
  <div className="toast-wrap">
    {toasts.map(t => (
      <div key={t.id} className="toast">
        {t.icon}
        <span>{t.msg}</span>
      </div>
    ))}
  </div>
);

/* =========================== Stat card =========================== */
const Stat = ({ label, value, sub, encrypted, onDecrypt, state }) => (
  <div className="card" style={{padding:"16px 18px"}}>
    <div className="eyebrow" style={{marginBottom:8}}>{label}</div>
    {encrypted ? (
      <div style={{fontSize:22,fontFamily:"var(--f-mono)",fontWeight:500}}>
        <EncryptedValue state={state} value={value} onDecrypt={onDecrypt} />
      </div>
    ) : (
      <div style={{fontSize:22,fontFamily:"var(--f-mono)",fontWeight:500,letterSpacing:"-0.01em",color:"var(--t-1)"}}>
        {value}
      </div>
    )}
    {sub && <div style={{color:"var(--t-3)",fontSize:12,marginTop:4}}>{sub}</div>}
  </div>
);

/* =========================== Tweaks panel =========================== */
const TweaksPanel = ({ accent, setAccent, visible }) => {
  if (!visible) return null;
  return (
    <div className="tweaks">
      <div className="hd">
        <span>Tweaks</span>
        <span style={{color:"var(--t-4)"}}>nullcast</span>
      </div>
      <div className="body">
        <div className="opt">
          <span>Accent</span>
          <div className="tweak-swatches">
            {["amber","blue","cyan"].map(c => (
              <button key={c}
                className={`tweak-sw ${c} ${accent===c?"active":""}`}
                title={c}
                onClick={() => setAccent(c)} />
            ))}
          </div>
        </div>
        <div className="opt" style={{color:"var(--t-4)",fontSize:11}}>
          <span>Current: {accent}</span>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, {
  Icon, BrandMark, Pill, FHEBadge, OddsBar, EncryptedValue,
  Header, Footer, Toasts, Stat, TweaksPanel,
});
