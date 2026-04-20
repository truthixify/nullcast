/* Market detail + Create market */

const MarketDetail = ({ id, goto, pushToast }) => {
  const m = MARKETS.find(x => x.id === id) || MARKETS[0];
  const [side, setSide] = React.useState("YES");
  const [amt, setAmt] = React.useState(100);
  const [yes, setYes] = React.useState(m.yes);
  const [lastUpd, setLastUpd] = React.useState(2);
  const [txState, setTxState] = React.useState("idle"); // idle, encrypting, wallet, confirming, success
  const [posState, setPosState] = React.useState("hidden"); // hidden, decrypting, revealed
  const [hasBet, setHasBet] = React.useState(false);

  React.useEffect(() => {
    const iv = setInterval(() => {
      setYes(y => Math.max(55, Math.min(76, y + (Math.random()-0.5) * 0.8)));
      setLastUpd(u => u+1 > 12 ? 1 : u+1);
    }, 2200);
    return () => clearInterval(iv);
  }, []);

  const multYes = (100 / yes);
  const multNo = (100 / (100 - yes));
  const mult = side === "YES" ? multYes : multNo;
  const payout = amt * mult;
  const profit = payout - amt;

  const submit = async () => {
    setTxState("encrypting");
    await wait(900);
    setTxState("wallet");
    await wait(1200);
    setTxState("confirming");
    await wait(1400);
    setTxState("success");
    setHasBet(true);
    pushToast && pushToast("Bet placed · encrypted on-chain", <Icon.Check/>);
    await wait(1500);
    setTxState("idle");
  };

  const decrypt = async () => {
    setPosState("decrypting");
    await wait(1400);
    setPosState("revealed");
  };

  const submitLabel = () => {
    if (txState === "encrypting") return "Encrypting via FHE…";
    if (txState === "wallet") return "Confirm in wallet…";
    if (txState === "confirming") return "Confirming on-chain…";
    if (txState === "success") return "Bet placed ✓";
    return `Encrypt & Bet ${side} · ${amt}`;
  };

  return (
    <main className="page">
      <div className="container">
        <div style={{paddingTop:16, paddingBottom:20}}>
          <button className="btn ghost sm" onClick={()=>goto("markets")} style={{color:"var(--t-3)"}}>
            ← All markets
          </button>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"minmax(0,1fr) 380px", gap:28, alignItems:"start"}}>
          {/* LEFT */}
          <div className="stack gap-4">
            {/* pills */}
            <div className="row gap-2 wrap">
              <span className="pill cat">{m.category}</span>
              {m.hot && <Pill variant="hot" live>HOT</Pill>}
              <FHEBadge>FHE encrypted</FHEBadge>
              <span className="pill neutral mono">Expires {m.expiry}</span>
              <span className="pill neutral mono" style={{color:"var(--t-4)"}}>ID {m.id}</span>
            </div>

            {/* question */}
            <h1 className="display" style={{fontSize:42, margin:"6px 0 4px", lineHeight:1.08, letterSpacing:"-0.035em"}}>
              {m.question}
            </h1>

            {/* odds card */}
            <div className="card elevated" style={{padding:"20px 22px"}}>
              <div className="row between" style={{marginBottom:14}}>
                <div className="eyebrow">Aggregate odds</div>
                <button className="btn sm ghost" onClick={()=>{ setYes(y=>y+0.01); pushToast && pushToast("Odds refreshed via KMS", <Icon.Refresh/>); }}>
                  <Icon.Refresh/> Refresh odds
                </button>
              </div>
              <OddsBar yes={yes} no={100-yes} size="lg"/>
              <div className="odds-meta">
                <span>Pool <span className="mono" style={{color:"var(--t-1)"}}>{m.pool.toLocaleString()}</span> cUSDT</span>
                <span className="live"><span className="d"/> updated {lastUpd}s ago</span>
              </div>
            </div>

            {/* details */}
            <div className="card">
              <div className="card-head"><h3>Market details</h3><span className="mono" style={{fontSize:11, color:"var(--t-4)"}}>Sepolia</span></div>
              <div className="card-body">
                <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap:"18px 24px"}}>
                  <Detail k="Market type" v={m.type}/>
                  <Detail k="Fee" v={`${m.fee}%`}/>
                  <Detail k="Minimum bet" v={`${m.minBet} cUSDT`}/>
                  <Detail k="Oracle" v={m.oracle} mono copy/>
                  <Detail k="Contract" v={m.contract} mono copy/>
                  <Detail k="Expiry block" v={m.expiryBlock} mono/>
                  <Detail k="YES pool" v={`${m.yesPool.toLocaleString()} cUSDT`} mono/>
                  <Detail k="NO pool" v={`${m.noPool.toLocaleString()} cUSDT`} mono/>
                  <Detail k="Rep. required" v={m.repReq > 0 ? `≥ ${m.repReq}` : "None"}/>
                </div>
              </div>
            </div>

            {/* activity */}
            <div className="card">
              <div className="card-head">
                <h3>Recent activity</h3>
                <span className="pill enc"><Icon.Lock size={10}/> Amounts encrypted</span>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th style={{width:80}}>Side</th>
                    <th>Bettor</th>
                    <th>Amount</th>
                    <th style={{width:140}}>Block</th>
                    <th style={{width:80, textAlign:"right"}}>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {RECENT_BETS.map((b,i) => (
                    <tr key={i}>
                      <td><Pill variant={b.side==="YES"?"yes":"no"}>{b.side}</Pill></td>
                      <td className="mono" style={{color:"var(--t-2)"}}>{b.addr}</td>
                      <td>
                        <span className="enc-val" style={{fontSize:13}}>
                          <Icon.Lock size={11}/>
                          <span className="dots mono" style={{color:"var(--enc-hi)"}}>encrypted</span>
                        </span>
                      </td>
                      <td className="mono" style={{color:"var(--t-3)"}}>{b.block}</td>
                      <td className="mono" style={{color:"var(--t-3)", textAlign:"right"}}>{b.t}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT — sticky betting panel */}
          <div style={{position:"sticky", top:80}}>
            <div className="card elevated">
              <div className="card-head">
                <h3 style={{color:"var(--t-1)", fontWeight:500}}>Place bet</h3>
                <FHEBadge/>
              </div>
              <div className="card-body stack gap-4">
                {/* side selector */}
                <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
                  <SideBtn active={side==="YES"} variant="yes" label="YES" pct={yes.toFixed(0)} mult={multYes}
                           onClick={()=>setSide("YES")}/>
                  <SideBtn active={side==="NO"} variant="no" label="NO" pct={(100-yes).toFixed(0)} mult={multNo}
                           onClick={()=>setSide("NO")}/>
                </div>

                {/* amount */}
                <div className="field">
                  <label>Amount</label>
                  <div className="input-row">
                    <input className="input input-mono" type="number" value={amt} min={1}
                           onChange={e => setAmt(Number(e.target.value)||0)} />
                    <span className="unit">cUSDT</span>
                  </div>
                  <div className="row gap-2" style={{marginTop:4}}>
                    {[25,50,100,250].map(v => (
                      <button key={v} className="btn secondary sm mono" style={{flex:1}}
                              onClick={()=>setAmt(v)}>{v}</button>
                    ))}
                  </div>
                </div>

                {/* payout box */}
                <div style={{background:"var(--bg-1)", border:"1px solid var(--border-1)", borderRadius:"var(--r-md)", padding:"12px 14px"}}>
                  <Row k="Stake" v={`${amt.toFixed(2)} cUSDT`}/>
                  <Row k="Odds" v={`× ${mult.toFixed(2)}`}/>
                  <hr className="divider" style={{margin:"8px 0"}}/>
                  <Row k="Payout if correct" v={`${payout.toFixed(2)} cUSDT`} strong/>
                  <Row k="Profit" v={<span style={{color: profit >= 0 ? "var(--yes-hi)":"var(--no-hi)"}}>
                    {profit >= 0 ? "+" : ""}{profit.toFixed(2)} cUSDT
                  </span>}/>
                </div>

                {/* submit */}
                <button
                  className={`btn lg block ${side==="YES"?"yes":"no"}`}
                  disabled={txState !== "idle" || amt <= 0}
                  onClick={submit}
                  style={{fontWeight:500, height:48, fontSize:14}}>
                  {txState === "idle" && <Icon.Lock size={12}/>}
                  {(txState === "encrypting" || txState === "wallet" || txState === "confirming")
                    && <span className="shimmer mono" style={{fontSize:12}}>⟳</span>}
                  {txState === "success" && <Icon.Check/>}
                  {submitLabel()}
                </button>

                {/* privacy notice */}
                <div style={{border:"1px solid var(--enc-bd)", background:"var(--enc-bg)", borderRadius:"var(--r-md)", padding:"10px 12px"}}>
                  <div className="row gap-2" style={{color:"var(--enc-hi)", fontSize:12, fontWeight:500, marginBottom:4}}>
                    <Icon.Lock size={11}/> Your bet is encrypted
                  </div>
                  <div style={{fontSize:11.5, color:"var(--t-3)", lineHeight:1.45}}>
                    Amount and side are encrypted client-side before the tx. Nobody can see your position, not even the protocol. Only aggregate odds are public.
                  </div>
                </div>
              </div>
            </div>

            {/* Position section */}
            {hasBet && (
              <div className="card" style={{marginTop:16}}>
                <div className="card-head">
                  <h3><span className="row gap-2"><Icon.Lock size={11}/> Your on-chain position</span></h3>
                  {posState === "revealed" && <span className="pill enc">Decrypted</span>}
                </div>
                <div className="card-body stack gap-3">
                  <div className="row gap-3" style={{alignItems:"center"}}>
                    <Pill variant={side==="YES"?"yes":"no"}>{side}</Pill>
                    {posState === "hidden" && (
                      <div style={{flex:1}}>
                        <div style={{fontSize:12, color:"var(--t-3)", marginBottom:4}}>Encrypted on-chain</div>
                        <button className="btn secondary sm" onClick={decrypt}>
                          <Icon.LockOpen size={11}/> Decrypt my position
                        </button>
                      </div>
                    )}
                    {posState === "decrypting" && (
                      <EncryptedValue state="decrypting"/>
                    )}
                    {posState === "revealed" && (
                      <div className="mono" style={{fontSize:18}}>
                        <span className="reveal">{amt.toFixed(2)}</span>
                        <span style={{color:"var(--t-3)", fontSize:13, marginLeft:6}}>cUSDT</span>
                      </div>
                    )}
                  </div>
                  <hr className="divider"/>
                  <div className="stack gap-2" style={{fontSize:12}}>
                    <div className="eyebrow">Bet history</div>
                    <div className="row between">
                      <span className="mono" style={{color:"var(--t-3)"}}>just now</span>
                      <span><Pill variant={side==="YES"?"yes":"no"}>{side}</Pill></span>
                      <span className="mono">{posState === "revealed" ? amt.toFixed(0) : "•••"} cUSDT</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

const SideBtn = ({ active, variant, label, pct, mult, onClick }) => (
  <button onClick={onClick} className="card inter"
    style={{
      padding:"14px 12px", textAlign:"left", cursor:"pointer",
      background: active ? `var(--${variant}-bg)` : "var(--bg-1)",
      borderColor: active ? `var(--${variant}-bd)` : "var(--border-1)",
    }}>
    <div style={{fontFamily:"var(--f-display)", fontSize:22, letterSpacing:"-0.02em",
                 color: active ? `var(--${variant}-hi)` : "var(--t-2)"}}>{label}</div>
    <div className="mono" style={{fontSize:11, color:"var(--t-3)", marginTop:6}}>
      {pct}% · × {mult.toFixed(2)}
    </div>
  </button>
);

const Detail = ({ k, v, mono, copy }) => (
  <div>
    <div className="eyebrow" style={{marginBottom:4}}>{k}</div>
    <div className={mono ? "mono" : ""} style={{fontSize:13, color:"var(--t-1)", display:"flex", alignItems:"center", gap:6}}>
      <span>{v}</span>
      {copy && <button className="btn ghost sm" style={{height:18, padding:"0 4px", color:"var(--t-4)"}}><Icon.Copy/></button>}
    </div>
  </div>
);

const Row = ({ k, v, strong }) => (
  <div className="row between" style={{padding:"4px 0", fontSize:13}}>
    <span style={{color:"var(--t-3)"}}>{k}</span>
    <span className="mono" style={{color: strong ? "var(--t-1)" : "var(--t-2)", fontWeight: strong ? 500 : 400}}>{v}</span>
  </div>
);

const wait = (ms) => new Promise(r => setTimeout(r, ms));

/* ================= Create market ================= */
const CreateMarket = ({ goto, pushToast }) => {
  const [q, setQ] = React.useState("");
  const [type, setType] = React.useState("Binary");
  const [buckets, setBuckets] = React.useState(3);
  const [expiry, setExpiry] = React.useState("2026-07-01");
  const [minBet, setMinBet] = React.useState(1);
  const [state, setState] = React.useState("idle");

  const submit = async () => {
    setState("signing");
    await wait(900);
    setState("confirming");
    await wait(1400);
    setState("success");
    pushToast && pushToast("Market deployed to Sepolia", <Icon.Check/>);
    await wait(1200);
    goto("markets");
  };

  const lbl = {
    idle: "Create market",
    signing: "Confirm in wallet…",
    confirming: "Deploying to Sepolia…",
    success: "Deployed ✓",
  }[state];

  return (
    <main className="page">
      <div className="container" style={{maxWidth: 720}}>
        <div style={{paddingTop:16, paddingBottom:20}}>
          <button className="btn ghost sm" onClick={()=>goto("markets")} style={{color:"var(--t-3)"}}>
            ← All markets
          </button>
        </div>

        <div className="page-head">
          <h1 style={{fontSize:36}}>Create market</h1>
          <div className="sub">Deploy a new prediction market to Sepolia. Resolves via oracle.</div>
        </div>

        <div className="card elevated">
          <div className="card-body stack gap-6" style={{padding:24}}>
            <div className="field">
              <label>Question</label>
              <input className="input lg" placeholder="Will ETH close above $5,000 by July 1, 2026?"
                     value={q} onChange={e=>setQ(e.target.value)} />
              <div className="hint">Be specific. A good question has a single, unambiguous outcome.</div>
            </div>

            <div className="field">
              <label>Market type</label>
              <div className="row gap-3">
                <TypeTile active={type==="Binary"} t="Binary" d="YES / NO outcome" onClick={()=>setType("Binary")}/>
                <TypeTile active={type==="Scalar"} t="Scalar" d="Range split into buckets" onClick={()=>setType("Scalar")}/>
              </div>
              {type === "Scalar" && (
                <div style={{marginTop:10, display:"flex", alignItems:"center", gap:10}}>
                  <span style={{fontSize:12, color:"var(--t-3)"}}>Buckets</span>
                  <div className="input-row" style={{width:120}}>
                    <input className="input input-mono" type="number" value={buckets} min={2} max={10}
                           onChange={e=>setBuckets(Number(e.target.value)||2)}/>
                  </div>
                </div>
              )}
            </div>

            <div className="grid-2">
              <div className="field">
                <label>Expiry</label>
                <input className="input input-mono" type="date" value={expiry} onChange={e=>setExpiry(e.target.value)}/>
              </div>
              <div className="field">
                <label>Minimum bet</label>
                <div className="input-row">
                  <input className="input input-mono" type="number" value={minBet} min={0.1} step={0.1}
                         onChange={e=>setMinBet(Number(e.target.value)||0)} />
                  <span className="unit">cUSDT</span>
                </div>
              </div>
            </div>

            <div style={{border:"1px solid var(--border-1)", background:"var(--bg-0)", borderRadius:"var(--r-md)", padding:"12px 14px"}}>
              <div className="eyebrow" style={{marginBottom:6}}>Before you deploy</div>
              <div style={{fontSize:12.5, color:"var(--t-3)", lineHeight:1.55}}>
                Requires wallet connection. Market will be deployed to Sepolia. A 2% fee applies to winning payouts. Deployment gas: ~0.008 ETH.
              </div>
            </div>

            <div className="row between">
              <button className="btn ghost" onClick={()=>goto("markets")}>Cancel</button>
              <button className="btn primary lg" onClick={submit} disabled={state!=="idle" || !q.trim()}>
                {state === "idle" && <Icon.Plus/>}
                {(state === "signing" || state === "confirming") && <span className="shimmer mono">⟳</span>}
                {state === "success" && <Icon.Check/>}
                {lbl}
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const TypeTile = ({ active, t, d, onClick }) => (
  <button onClick={onClick} className="card inter"
    style={{
      padding:"14px 16px", textAlign:"left", flex:1, cursor:"pointer",
      background: active ? "var(--acc-bg)" : "var(--bg-1)",
      borderColor: active ? "var(--acc-bd)" : "var(--border-1)",
    }}>
    <div style={{fontFamily:"var(--f-display)", fontSize:16, color: active ? "var(--acc)" : "var(--t-1)"}}>
      {t}
    </div>
    <div style={{fontSize:12, color:"var(--t-3)", marginTop:2}}>{d}</div>
  </button>
);

Object.assign(window, { MarketDetail, CreateMarket });
