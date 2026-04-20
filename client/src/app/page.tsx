"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FHEBadge, LockIcon } from "@/components/shared/Icons";
import { OddsBar } from "@/components/shared/OddsBar";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";

/* ── LiveMarketCard ────────────────────────────────────────── */
function LiveMarketCard() {
  const [yesOdds, setYesOdds] = useState(66);

  useEffect(() => {
    const interval = setInterval(() => {
      setYesOdds((prev) => {
        const delta = Math.floor(Math.random() * 7) - 3;
        const next = prev + delta;
        if (next < 58) return 58;
        if (next > 76) return 76;
        return next;
      });
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  const noOdds = 100 - yesOdds;

  return (
    <div className="card elevated" style={{ padding: 24, maxWidth: 400, width: "100%" }}>
      {/* header pills */}
      <div className="row between" style={{ marginBottom: 16 }}>
        <div className="row gap-2">
          <span className="pill open"><span className="dot-live" />Live</span>
          <FHEBadge />
        </div>
        <span className="mono" style={{ fontSize: 11, color: "var(--t-3)" }}>Demo market</span>
      </div>

      {/* question */}
      <p className="display" style={{ fontSize: 16, marginBottom: 16, color: "var(--t-1)" }}>
        Will ETH surpass $5,000 by Q3 2026?
      </p>

      {/* odds */}
      <OddsBar yes={yesOdds} no={noOdds} size="lg" />

      {/* odds meta */}
      <div className="odds-meta" style={{ marginTop: 10 }}>
        <span className="live"><span className="d" />Live odds</span>
        <span>142.8K cUSDT pool</span>
      </div>

      {/* bet buttons */}
      <div className="row gap-2" style={{ marginTop: 16 }}>
        <button className="btn yes" style={{ flex: 1 }} type="button">Yes {yesOdds}%</button>
        <button className="btn no" style={{ flex: 1 }} type="button">No {noOdds}%</button>
      </div>

      {/* encrypted position */}
      <div className="enc-val" style={{
        marginTop: 16,
        padding: "10px 14px",
        background: "var(--enc-bg)",
        borderRadius: "var(--r-md)",
        width: "100%",
        fontSize: 13,
        color: "var(--enc-hi)",
      }}>
        <LockIcon size={12} />
        <span className="dots">Your position: &#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;</span>
      </div>
    </div>
  );
}

/* ── LandingPage ───────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <main style={{ flex: 1 }}>
      {/* ── Hero ──────────────────────────────────────────── */}
      <section style={{ paddingTop: 40 }}>
        <div className="container">
          <div style={{
            display: "grid",
            gridTemplateColumns: "1.25fr 1fr",
            gap: 48,
            alignItems: "center",
          }}>
            {/* Left column */}
            <div className="stack gap-6">
              <div className="row gap-2">
                <FHEBadge />
                <span className="pill">v0.1.0</span>
              </div>

              <h1 className="display" style={{ fontSize: 72, color: "var(--t-1)" }}>
                Bet without revealing.
              </h1>

              <p style={{ fontSize: 16, color: "var(--t-2)", maxWidth: 480, lineHeight: 1.6 }}>
                NullCast is the first prediction market where your position stays
                encrypted. Place bets, see live aggregate odds, settle
                trustlessly&mdash;all powered by fully homomorphic encryption on Zama fhEVM.
              </p>

              <div className="row gap-4">
                <Link href="/markets" className="btn primary lg">Launch app</Link>
                <a
                  href="https://docs.nullcast.xyz"
                  className="btn secondary lg"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read docs
                </a>
              </div>
            </div>

            {/* Right column */}
            <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center" }}>
              <LiveMarketCard />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────── */}
      <section style={{ paddingTop: 64, paddingBottom: 64 }}>
        <div className="container">
          <div className="card" style={{ padding: "24px 32px" }}>
            <div className="grid-4">
              {[
                { label: "Total volume", value: "$24.8M" },
                { label: "Open markets", value: "128" },
                { label: "Private bets", value: "41,207" },
                { label: "Avg resolution", value: "2h 14m" },
              ].map((stat, i) => (
                <div
                  key={stat.label}
                  style={{
                    borderLeft: i > 0 ? "1px solid var(--border-1)" : "none",
                    paddingLeft: i > 0 ? 24 : 0,
                  }}
                >
                  <div className="num" style={{ fontSize: 28, fontWeight: 600, color: "var(--t-1)", letterSpacing: "-0.03em" }}>
                    {stat.value}
                  </div>
                  <div className="eyebrow" style={{ marginTop: 4 }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section style={{ paddingBottom: 96 }}>
        <div className="container">
          <div className="eyebrow" style={{ marginBottom: 12 }}>How it works</div>
          <div className="grid-4">
            {[
              { n: "01", title: "Sign", desc: "Connect your wallet and approve a one-time FHE keypair for this session." },
              { n: "02", title: "Encrypt", desc: "Your bet amount and direction are encrypted client-side before hitting the chain." },
              { n: "03", title: "Aggregate", desc: "The contract sums encrypted bets homomorphically. Aggregate pool totals are publicly decryptable." },
              { n: "04", title: "Settle", desc: "Oracle resolves the outcome. Winnings are computed over ciphertext and paid out trustlessly." },
            ].map((step) => (
              <div className="card" style={{ padding: 20 }} key={step.n}>
                <div className="mono" style={{ fontSize: 12, color: "var(--acc)", marginBottom: 12 }}>{step.n}</div>
                <div className="display" style={{ fontSize: 18, color: "var(--t-1)", marginBottom: 8 }}>{step.title}</div>
                <p style={{ fontSize: 13, color: "var(--t-2)", lineHeight: 1.5, margin: 0 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      </main>
      <Footer />
    </div>
  );
}
