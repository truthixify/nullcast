/* Portfolio + Reputation */

const Portfolio = ({ goto, pushToast }) => {
  const [tab, setTab] = React.useState("active");
  const [decrypted, setDecrypted] = React.useState({}); // idx -> true
  const [stats, setStats] = React.useState({ stake: "hidden", pnl: "hidden" });

  const decryptPos = async (i) => {
    setDecrypted(d => ({ ...d, [i]: "decrypting" }));
    await wait(1100);
    setDecrypted(d => ({ ...d, [i]: "revealed" }));
  };
  const decryptAll = async () => {
    setStats({ stake: "decrypting", pnl: "decrypting" });
    const next = {};
    PORTFOLIO_ACTIVE.forEach((_,i) => next[i] = "decrypting");
    setDecrypted(next);
    await wait(1300);
    const rev = {};
    PORTFOLIO_ACTIVE.forEach((_,i) => rev[i] = "revealed");
    setDecrypted(rev);
    setStats({ stake: "revealed", pnl: "revealed" });
    pushToast && pushToast("Decrypted via KMS signature", <Icon.LockOpen size={11}/>);
  };

  const decryptStat = async (k) => {
    setStats(s => ({...s, [k]: "decrypting"}));
    await wait(1100);
    setStats(s => ({...s, [k]: "revealed"}));
  };

  return (
    <main className="page">
      <div className="container">
        <div className="page-head row between" style={{alignItems:"flex-end"}}>
          <div>
            <h1>Portfolio</h1>
            <div className="sub">
              Your positions are encrypted. Only you can decrypt them.
            </div>
          </div>
          <button className="btn secondary" onClick={decryptAll}>
            <Icon.LockOpen size={11}/> Decrypt all
          </button>
        </div>

        <div className="grid-4" style={{marginBottom:20}}>
          <Stat label="Active positions" value="4" sub="across 4 markets"/>
          <Stat label="Total at stake" value="925.00" sub="cUSDT"
                encrypted state={stats.stake} onDecrypt={()=>decryptStat("stake")}/>
          <Stat label="Unrealized P&L" value="+142.80" sub="cUSDT"
                encrypted state={stats.pnl} onDecrypt={()=>decryptStat("pnl")}/>
          <Stat label="Claimable" value="328.00" sub="1 market settled"/>
        </div>

        <div className="card" style={{padding:0, marginBottom:20}}>
          <div style={{padding:12, borderBottom:"1px solid var(--border-1)", display:"flex", gap:8}}>
            {[{k:"active",l:"Active", n:4},{k:"settled",l:"Settled", n:3},{k:"lp",l:"LP Positions", n:0}].map(t => (
              <button key={t.k}
                className="btn sm"
                onClick={()=>setTab(t.k)}
                style={{
                  background: tab===t.k ? "var(--bg-3)" : "transparent",
                  color: tab===t.k ? "var(--t-1)" : "var(--t-3)",
                  border: tab===t.k ? "1px solid var(--border-2)" : "1px solid transparent",
                }}>
                {t.l} <span className="mono" style={{color:"var(--t-4)", marginLeft:6}}>{t.n}</span>
              </button>
            ))}
          </div>

          {tab === "active" && (
            <table className="table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th style={{width:80}}>Side</th>
                  <th style={{width:200}}>Position</th>
                  <th style={{width:100}}>Entry</th>
                  <th style={{width:120}}>Current</th>
                  <th style={{width:160}}>P&L</th>
                  <th style={{width:60}}></th>
                </tr>
              </thead>
              <tbody>
                {PORTFOLIO_ACTIVE.map((p, i) => {
                  const delta = p.current - p.entry;
                  const isYes = p.side === "YES";
                  const pnlSign = (isYes ? delta : -delta) >= 0;
                  const state = decrypted[i] || "hidden";
                  return (
                    <tr key={i} onClick={()=>goto("detail", p.mkt.id)} style={{cursor:"pointer"}}>
                      <td>
                        <div style={{color:"var(--t-1)", fontSize:13.5, marginBottom:2, maxWidth:360, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap"}}>
                          {p.mkt.question}
                        </div>
                        <div style={{color:"var(--t-4)", fontSize:11, fontFamily:"var(--f-mono)"}}>
                          Expires {p.mkt.expiry}
                        </div>
                      </td>
                      <td><Pill variant={isYes?"yes":"no"}>{p.side}</Pill></td>
                      <td onClick={e=>e.stopPropagation()}>
                        <EncryptedValue state={state} value={p.amount.toFixed(2)}
                                        onDecrypt={()=>decryptPos(i)} compact/>
                      </td>
                      <td className="mono" style={{color:"var(--t-2)"}}>{p.entry}%</td>
                      <td className="mono" style={{color:"var(--t-1)"}}>
                        {p.current}%
                        <span style={{color: delta >= 0 ? "var(--yes-hi)" : "var(--no-hi)", marginLeft:6, fontSize:11}}>
                          {delta >= 0 ? <Icon.ArrowUp/> : <Icon.ArrowDown/>}
                          {Math.abs(delta)}
                        </span>
                      </td>
                      <td onClick={e=>e.stopPropagation()}>
                        {state === "revealed" ? (
                          <span className="mono reveal" style={{color: pnlSign ? "var(--yes-hi)":"var(--no-hi)"}}>
                            {pnlSign ? "+" : "-"}{Math.abs((delta/p.entry) * p.amount).toFixed(2)}
                          </span>
                        ) : (
                          <EncryptedValue state={state} value="—" onDecrypt={()=>decryptPos(i)} compact/>
                        )}
                      </td>
                      <td style={{color:"var(--t-4)"}}><Icon.Chevron/></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}

          {tab === "settled" && (
            <table className="table">
              <thead>
                <tr>
                  <th>Market</th>
                  <th style={{width:80}}>Side</th>
                  <th style={{width:120}}>Stake</th>
                  <th style={{width:120}}>Payout</th>
                  <th style={{width:100}}>Result</th>
                  <th style={{width:100}}>Date</th>
                </tr>
              </thead>
              <tbody>
                {PORTFOLIO_SETTLED.map((s, i) => (
                  <tr key={i}>
                    <td style={{color:"var(--t-1)", fontSize:13.5}}>{s.mkt.question}</td>
                    <td><Pill variant={s.side==="YES"?"yes":"no"}>{s.side}</Pill></td>
                    <td className="mono">{s.stake.toFixed(2)}</td>
                    <td className="mono" style={{color: s.payout > 0 ? "var(--yes-hi)" : "var(--t-3)"}}>
                      {s.payout.toFixed(2)}
                    </td>
                    <td>
                      <Pill variant={s.result==="WON"?"yes":"no"}>{s.result}</Pill>
                    </td>
                    <td className="mono" style={{color:"var(--t-3)"}}>{s.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tab === "lp" && (
            <div style={{padding:"56px 24px", textAlign:"center"}}>
              <div style={{width:56,height:56,border:"1px dashed var(--border-3)", borderRadius:"50%", margin:"0 auto 20px", display:"flex",alignItems:"center",justifyContent:"center", color:"var(--t-4)"}}>
                <Icon.Lock size={20}/>
              </div>
              <div style={{fontFamily:"var(--f-display)", fontSize:22, marginBottom:6}}>
                No liquidity positions yet
              </div>
              <div style={{color:"var(--t-3)", maxWidth:380, margin:"0 auto 20px"}}>
                Provide liquidity to earn a share of market fees. Your LP position amount is encrypted, like any bet.
              </div>
              <button className="btn primary">Browse markets to LP</button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

/* ================= Reputation ================= */
const Reputation = ({ pushToast }) => {
  const [bal, setBal] = React.useState(0);
  const [minting, setMinting] = React.useState(false);
  const [scoreState, setScoreState] = React.useState("hidden");
  const [score] = React.useState(72);

  const mint = async () => {
    setMinting(true);
    await wait(1200);
    setBal(b => b + 10000);
    setMinting(false);
    pushToast && pushToast("Minted 10,000 cUSDT", <Icon.Check/>);
  };

  const decryptScore = async () => {
    setScoreState("decrypting");
    await wait(1300);
    setScoreState("revealed");
  };

  const components = [
    { k: "Wallet age", v: 18, max: 25, pub: true },
    { k: "Transaction history", v: 22, max: 25, pub: true },
    { k: "NullCast participation", v: 12, max: 25, pub: false },
    { k: "Accuracy", v: 20, max: 25, pub: false },
  ];

  return (
    <main className="page">
      <div className="container" style={{maxWidth: 1040}}>
        <div className="page-head">
          <h1>Reputation</h1>
          <div className="sub">Your score gates high-stakes markets. Computed from on-chain signals only — no KYC.</div>
        </div>

        {/* Faucet */}
        <div className="card elevated" style={{padding:"22px 24px", marginBottom:24}}>
          <div className="row between" style={{alignItems:"center"}}>
            <div>
              <div className="eyebrow" style={{marginBottom:6}}>Test token faucet</div>
              <div style={{fontFamily:"var(--f-display)", fontSize:24, letterSpacing:"-0.02em"}}>
                Get test cUSDT
              </div>
              <div style={{color:"var(--t-3)", fontSize:13, marginTop:4}}>
                You'll need these to bet. Sepolia only.
              </div>
            </div>
            <div style={{textAlign:"right"}}>
              <div className="eyebrow" style={{marginBottom:4}}>Balance</div>
              <div className="mono" style={{fontSize:26, color: bal > 0 ? "var(--t-1)" : "var(--t-4)"}}>
                {bal.toLocaleString()} <span style={{fontSize:13, color:"var(--t-3)"}}>cUSDT</span>
              </div>
            </div>
          </div>
          <button className="btn primary lg" onClick={mint} disabled={minting} style={{marginTop:16}}>
            {minting ? <span className="shimmer mono">⟳ Minting…</span> : <>Mint 10,000 cUSDT</>}
          </button>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"minmax(0, 380px) minmax(0, 1fr)", gap:24}}>
          {/* Score gauge */}
          <div className="card elevated" style={{padding:24}}>
            <div className="eyebrow" style={{marginBottom:16}}>Your score</div>
            <div style={{position:"relative", width:220, height:220, margin:"0 auto"}}>
              <ScoreRing pct={scoreState==="revealed" ? score : 0} state={scoreState}/>
              <div style={{position:"absolute", inset:0, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center"}}>
                {scoreState === "revealed" ? (
                  <>
                    <div className="mono reveal" style={{fontSize:48, color:"var(--t-1)", letterSpacing:"-0.02em", lineHeight:1}}>
                      {score}
                    </div>
                    <div style={{fontSize:11, color:"var(--t-3)", marginTop:4}}>/ 100</div>
                  </>
                ) : scoreState === "decrypting" ? (
                  <div className="shimmer mono" style={{fontSize:18}}>decrypting…</div>
                ) : (
                  <>
                    <div className="mono" style={{fontSize:32, color:"var(--enc-hi)", letterSpacing:"0.15em"}}>•••</div>
                    <div style={{fontSize:11, color:"var(--t-3)", marginTop:6}}>euint8 · encrypted</div>
                  </>
                )}
              </div>
            </div>
            <div style={{textAlign:"center", marginTop:16}}>
              {scoreState !== "revealed" && (
                <button className="btn secondary" onClick={decryptScore} disabled={scoreState==="decrypting"}>
                  <Icon.LockOpen size={11}/> Decrypt score
                </button>
              )}
              <div style={{fontSize:12, color:"var(--t-3)", marginTop:14}}>
                Eligible for <span className="mono" style={{color:"var(--t-1)"}}>{scoreState==="revealed" ? 94 : "—"}</span> of 128 markets
              </div>
            </div>
          </div>

          {/* Score breakdown */}
          <div className="card">
            <div className="card-head">
              <h3>Score breakdown</h3>
              <span style={{fontSize:11, color:"var(--t-4)", fontFamily:"var(--f-mono)"}}>updated epoch 412</span>
            </div>
            <div className="card-body stack gap-4">
              {components.map(c => (
                <div key={c.k}>
                  <div className="row between" style={{marginBottom:6}}>
                    <div className="row gap-2">
                      <span style={{fontSize:13, color:"var(--t-1)"}}>{c.k}</span>
                      {c.pub
                        ? <span className="pill neutral" style={{fontSize:9}}>PUBLIC</span>
                        : <span className="pill enc" style={{fontSize:9}}><Icon.Lock size={9}/>ENC</span>}
                    </div>
                    <span className="mono" style={{fontSize:12, color:"var(--t-2)"}}>
                      {c.v}<span style={{color:"var(--t-4)"}}> / {c.max}</span>
                    </span>
                  </div>
                  <div style={{height:6, background:"var(--bg-3)", borderRadius:999, overflow:"hidden", border:"1px solid var(--border-1)"}}>
                    <div style={{
                      height:"100%", width: (c.v/c.max*100)+"%",
                      background: c.pub
                        ? "linear-gradient(90deg, color-mix(in srgb, var(--acc) 60%, transparent), var(--acc))"
                        : "linear-gradient(90deg, color-mix(in srgb, var(--enc) 60%, transparent), var(--enc))",
                      transition:"width .6s ease",
                    }}/>
                  </div>
                </div>
              ))}

              <hr className="divider" style={{margin:"6px 0"}}/>

              <div style={{fontSize:12, color:"var(--t-3)", lineHeight:1.55}}>
                <div className="eyebrow" style={{marginBottom:6, color:"var(--t-3)"}}>How it works</div>
                Score is computed from on-chain signals only — no KYC, no off-chain data. Recomputed per epoch (~12h). Encrypted components are known only to you; public components are visible to anyone.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

const ScoreRing = ({ pct, state }) => {
  const r = 96, c = 2 * Math.PI * r;
  const dash = c * (pct/100);
  return (
    <svg viewBox="0 0 220 220" width="220" height="220">
      <circle cx="110" cy="110" r={r} fill="none" stroke="var(--bg-3)" strokeWidth="6"/>
      <circle cx="110" cy="110" r={r} fill="none"
              stroke={state === "revealed" ? "var(--acc)" : "var(--enc)"}
              strokeWidth="6"
              strokeDasharray={`${dash} ${c}`}
              strokeDashoffset={c/4}
              transform="rotate(-90 110 110)"
              strokeLinecap="round"
              style={{transition:"stroke-dasharray .9s ease"}}/>
      {state !== "revealed" && (
        <circle cx="110" cy="110" r={r} fill="none"
                stroke="var(--enc)" strokeWidth="6" opacity="0.3"
                strokeDasharray="3 8" transform="rotate(-90 110 110)"/>
      )}
    </svg>
  );
};

Object.assign(window, { Portfolio, Reputation, ScoreRing });
