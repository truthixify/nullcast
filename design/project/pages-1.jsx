/* Landing page + Markets list */

const Landing = ({ goto }) => {
  const [yes, setYes] = React.useState(68);
  React.useEffect(() => {
    const iv = setInterval(() => {
      setYes(y => Math.max(58, Math.min(76, y + (Math.random() - 0.5) * 1.4)));
    }, 1800);
    return () => clearInterval(iv);
  }, []);

  return (
    <main>
      {/* HERO */}
      <section style={{padding: "80px 0 56px"}}>
        <div className="container" style={{display:"grid", gridTemplateColumns:"minmax(0,1.25fr) minmax(0,1fr)", gap:56, alignItems:"center"}}>
          <div>
            <div className="row gap-2" style={{marginBottom:18}}>
              <FHEBadge>Fully homomorphic encryption</FHEBadge>
              <span className="pill neutral">v0.4 · Sepolia testnet</span>
            </div>
            <h1 className="display" style={{fontSize:72, margin:"0 0 18px", lineHeight:0.98}}>
              Bet without<br/>revealing.
            </h1>
            <p style={{fontSize:17, color:"var(--t-2)", maxWidth:520, lineHeight:1.5, margin:"0 0 32px"}}>
              Prediction markets where your position is encrypted on-chain. Nobody sees your side,
              your size, or your P&L. Only aggregate odds are public.
            </p>
            <div className="row gap-3">
              <button className="btn primary lg" onClick={() => goto("markets")}>
                Launch app <Icon.Chevron />
              </button>
              <button className="btn secondary lg">Read docs <Icon.External/></button>
            </div>
          </div>

          {/* live preview card */}
          <div className="card elevated" style={{padding:0, overflow:"hidden"}}>
            <div style={{padding:"14px 16px", borderBottom:"1px solid var(--border-1)", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div className="row gap-2">
                <span className="pill cat">CRYPTO</span>
                <span className="pill neutral mono">Jun 30</span>
                <Pill variant="open" live>LIVE</Pill>
              </div>
              <FHEBadge />
            </div>
            <div style={{padding:"20px 20px 16px"}}>
              <h3 className="display" style={{fontSize:22, margin:"0 0 18px", lineHeight:1.15}}>
                Will Bitcoin close above $120,000 by June 30?
              </h3>
              <OddsBar yes={yes} no={100 - yes} />
              <div className="odds-meta">
                <span>Pool <span style={{color:"var(--t-1)"}}>245.2k</span> cUSDT</span>
                <span className="live"><span className="d"/> odds updated 2s ago</span>
              </div>

              <div style={{marginTop:18, padding:"12px 14px", border:"1px solid var(--enc-bd)", background:"var(--enc-bg)", borderRadius:"var(--r-md)"}}>
                <div className="row gap-2" style={{fontSize:12, color:"var(--enc-hi)"}}>
                  <Icon.Lock size={11}/>
                  <span className="mono" style={{letterSpacing:"0.05em"}}>
                    YOUR POSITION · •••••••• cUSDT
                  </span>
                </div>
                <div style={{fontSize:11, color:"var(--t-3)", marginTop:4}}>
                  Encrypted end-to-end. Only you can decrypt.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <section style={{padding: "8px 0 56px"}}>
        <div className="container">
          <div className="card" style={{padding:0, display:"grid", gridTemplateColumns:"repeat(4, 1fr)"}}>
            {[
              { k: "Total volume", v: "$24.8M", sub: "last 30 days" },
              { k: "Open markets", v: "128", sub: "across 6 categories" },
              { k: "Private bets placed", v: "41,207", sub: "all encrypted" },
              { k: "Avg resolution", v: "2h 14m", sub: "after expiry" },
            ].map((s, i) => (
              <div key={s.k} style={{padding:"22px 24px", borderLeft: i ? "1px solid var(--border-1)" : "none"}}>
                <div className="eyebrow" style={{marginBottom:6}}>{s.k}</div>
                <div className="mono" style={{fontSize:24, fontWeight:500, color:"var(--t-1)"}}>{s.v}</div>
                <div style={{fontSize:11, color:"var(--t-3)", marginTop:3}}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{padding:"40px 0 80px"}}>
        <div className="container">
          <div style={{maxWidth:640, marginBottom:32}}>
            <div className="eyebrow" style={{marginBottom:10}}>How it works</div>
            <h2 className="display" style={{fontSize:36, margin:0, letterSpacing:"-0.03em"}}>
              Four steps. No intermediaries.
            </h2>
          </div>
          <div className="grid-4">
            {[
              { n:"01", t:"Sign", d:"Connect a wallet. Choose a market. Pick YES or NO." },
              { n:"02", t:"Encrypt", d:"Your bet amount is encrypted client-side with Zama's fhEVM." },
              { n:"03", t:"Aggregate", d:"The protocol tallies positions on encrypted values. Odds stay live." },
              { n:"04", t:"Settle", d:"Oracle resolves. Winners claim. Your side was never revealed." },
            ].map(step => (
              <div key={step.n} className="card" style={{padding:"22px"}}>
                <div className="mono" style={{fontSize:12, color:"var(--acc)", letterSpacing:"0.1em", marginBottom:18}}>
                  {step.n}
                </div>
                <div style={{fontFamily:"var(--f-display)", fontSize:20, letterSpacing:"-0.02em", marginBottom:8}}>
                  {step.t}
                </div>
                <div style={{color:"var(--t-3)", fontSize:13, lineHeight:1.5}}>{step.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

/* ================= Markets list ================= */
const MarketsList = ({ goto }) => {
  const [status, setStatus] = React.useState("Open");
  const [sort, setSort] = React.useState("Volume");
  const [q, setQ] = React.useState("");

  const filtered = MARKETS.filter(m => {
    if (status !== "All" && m.status !== status) return false;
    if (q && !m.question.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a,b) => {
    if (sort === "Volume") return b.vol - a.vol;
    if (sort === "Newest") return MARKETS.indexOf(a) - MARKETS.indexOf(b);
    if (sort === "Expiry") return a.expiry.localeCompare(b.expiry);
    return 0;
  });

  return (
    <main className="page">
      <div className="container">
        <div className="page-head row between" style={{alignItems:"flex-end"}}>
          <div>
            <h1>Markets</h1>
            <div className="sub row gap-3">
              <span><span className="mono" style={{color:"var(--t-1)"}}>128</span> live</span>
              <span style={{color:"var(--t-4)"}}>·</span>
              <span>Pool <span className="mono" style={{color:"var(--t-1)"}}>2.4M</span> cUSDT</span>
              <span style={{color:"var(--t-4)"}}>·</span>
              <FHEBadge>Encrypted via FHE</FHEBadge>
            </div>
          </div>
          <button className="btn primary" onClick={() => goto("create")}>
            <Icon.Plus/> Create market
          </button>
        </div>

        {/* Filter bar */}
        <div className="card" style={{padding:12, display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", marginBottom:20}}>
          <div className="input-row" style={{flex:"1 1 280px", maxWidth:380, height:36}}>
            <span style={{display:"flex",alignItems:"center",paddingLeft:12, color:"var(--t-3)"}}><Icon.Search/></span>
            <input className="input" placeholder="Search markets…" value={q} onChange={e=>setQ(e.target.value)}
                   style={{paddingLeft:10}}/>
            <span style={{display:"flex",alignItems:"center",padding:"0 8px"}}>
              <span className="kbd">⌘K</span>
            </span>
          </div>
          <div className="header-spacer"/>
          <div className="row gap-2">
            <span style={{fontSize:11, color:"var(--t-3)", fontFamily:"var(--f-mono)", letterSpacing:".08em", textTransform:"uppercase"}}>Status</span>
            <div className="seg">
              {["Open","Resolved","All"].map(s => (
                <button key={s} className={status===s?"active":""} onClick={()=>setStatus(s)}>{s}</button>
              ))}
            </div>
          </div>
          <div className="row gap-2">
            <span style={{fontSize:11, color:"var(--t-3)", fontFamily:"var(--f-mono)", letterSpacing:".08em", textTransform:"uppercase"}}>Sort</span>
            <div className="seg">
              {["Volume","Newest","Expiry"].map(s => (
                <button key={s} className={sort===s?"active":""} onClick={()=>setSort(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="card" style={{padding:"56px 24px", textAlign:"center"}}>
            <div style={{fontFamily:"var(--f-display)", fontSize:22, marginBottom:6}}>No markets match</div>
            <div style={{color:"var(--t-3)"}}>Try a different filter or clear your search.</div>
          </div>
        ) : (
          <div className="grid-3">
            {filtered.map(m => (
              <MarketCard key={m.id} m={m} onClick={() => goto("detail", m.id)} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

const MarketCard = ({ m, onClick }) => {
  const statusPill =
    m.status === "Resolved" ? <Pill variant="resolved">Resolved</Pill>
    : m.hot ? <Pill variant="hot" live>HOT</Pill>
    : <Pill variant="open" live>LIVE</Pill>;
  return (
    <div className="card inter" onClick={onClick} style={{cursor:"pointer", padding:0}}>
      <div style={{padding:"14px 16px 12px", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <div className="row gap-2">
          <span className="pill cat">{m.category}</span>
          <span className="mono" style={{fontSize:11, color:"var(--t-3)"}}>{m.expiry}</span>
        </div>
        {statusPill}
      </div>
      <div style={{padding:"6px 16px 18px"}}>
        <h3 className="display" style={{fontSize:18, margin:"0 0 22px", lineHeight:1.18, minHeight:42, color:"var(--t-1)"}}>
          {m.question}
        </h3>
        <OddsBar yes={m.yes} no={m.no} size="sm"/>
        <div className="odds-meta" style={{fontSize:11, marginTop:12}}>
          <span>Pool <span style={{color:"var(--t-2)"}}>{fmtK(m.pool)}</span></span>
          <span>Vol <span style={{color:"var(--t-2)"}}>{fmtK(m.vol)}</span></span>
          <span>{m.bets.toLocaleString()} bets</span>
        </div>
      </div>
    </div>
  );
};

function fmtK(n) {
  if (n >= 1000) return (n/1000).toFixed(1) + "k";
  return n.toFixed(0);
}

Object.assign(window, { Landing, MarketsList, MarketCard, fmtK });
