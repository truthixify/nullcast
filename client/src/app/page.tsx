"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LogoFull, LockIcon, IconArrowRight, IconChart, IconShield } from "@/components/shared/Icons";
import { OddsBar } from "@/components/shared/OddsBar";

/* ── LandingTopBar ─────────────────────────────────────────── */
function LandingTopBar() {
  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: "64px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(10, 10, 11, 0.6)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        borderBottom: "1px solid var(--color-border-subtle)",
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          width: "100%",
        }}
      >
        <LogoFull size={24} />

        <nav style={{ display: "flex", alignItems: "center", gap: "24px" }}>
          <Link
            href="/markets"
            className="nc-nav"
            style={{ textDecoration: "none" }}
          >
            Markets
          </Link>
          <a
            href="https://docs.nullcast.xyz"
            className="nc-nav"
            target="_blank"
            rel="noopener noreferrer"
          >
            Docs
          </a>
          <a href="#features" className="nc-nav">
            About
          </a>
          <Link href="/markets" className="btn btn-primary btn-sm">
            Launch App
          </Link>
        </nav>
      </div>
    </header>
  );
}

/* ── LiveMarketCard ────────────────────────────────────────── */
function LiveMarketCard() {
  const [yesOdds, setYesOdds] = useState(66);

  useEffect(() => {
    const interval = setInterval(() => {
      setYesOdds((prev) => {
        const delta = Math.floor(Math.random() * 7) - 3;
        const next = prev + delta;
        if (next < 55) return 55;
        if (next > 78) return 78;
        return next;
      });
    }, 3200);
    return () => clearInterval(interval);
  }, []);

  const noOdds = 100 - yesOdds;

  return (
    <div
      className="card"
      style={{
        background: "var(--color-bg-elevated)",
        border: "1px solid var(--color-border-default)",
        borderRadius: "var(--radius-lg)",
        padding: "28px",
        maxWidth: "420px",
        width: "100%",
      }}
    >
      {/* Card header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <span className="pill pill-accent">
          <span className="live-dot" />
          Live
        </span>
        <span
          className="mono"
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-text-tertiary)",
          }}
        >
          Demo market
        </span>
      </div>

      {/* Question */}
      <h3
        style={{
          fontSize: "var(--text-md)",
          fontWeight: 600,
          lineHeight: "var(--leading-snug)",
          marginBottom: "20px",
          letterSpacing: "-0.02em",
        }}
      >
        Will ETH surpass $5,000 by Q3 2026?
      </h3>

      {/* Odds bar */}
      <div style={{ marginBottom: "20px" }}>
        <OddsBar
          yes={yesOdds}
          no={noOdds}
          large
          pulsing
          pool={142800}
          lastUpdate="3s ago"
          showMeta
        />
      </div>

      {/* Bet buttons */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        <button
          className="btn btn-yes"
          style={{ flex: 1 }}
          type="button"
        >
          Yes {yesOdds}%
        </button>
        <button
          className="btn btn-no"
          style={{ flex: 1 }}
          type="button"
        >
          No {noOdds}%
        </button>
      </div>

      {/* Encrypted position */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "12px 14px",
          background: "var(--color-privacy-muted)",
          borderRadius: "var(--radius-sm)",
          fontSize: "var(--text-sm)",
          color: "var(--color-privacy-text)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <LockIcon size={14} stroke="var(--color-privacy-text)" />
        <span style={{ letterSpacing: "0.12em" }}>
          Your position: &#8226;&#8226;&#8226;&#8226;&#8226;&#8226;&#8226;
        </span>
      </div>
    </div>
  );
}

/* ── StatBox ───────────────────────────────────────────────── */
function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "4px",
      }}
    >
      <span
        className="display"
        style={{
          fontSize: "var(--text-xl)",
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: "var(--color-text-primary)",
        }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-text-tertiary)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
    </div>
  );
}

/* ── FeatureCard ───────────────────────────────────────────── */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      className="card"
      style={{
        padding: "28px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "var(--radius-md)",
          background: "var(--color-accent-muted)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: "var(--text-md)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </h3>
      <p
        style={{
          fontSize: "var(--text-sm)",
          color: "var(--color-text-secondary)",
          lineHeight: "var(--leading-normal)",
        }}
      >
        {description}
      </p>
    </div>
  );
}

/* ── FlowStep ─────────────────────────────────────────────── */
function FlowStep({
  step,
  label,
  sublabel,
  isLast = false,
}: {
  step: string;
  label: string;
  sublabel: string;
  isLast?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "10px",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--color-border-default)",
            background: "var(--color-bg-surface)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-xs)",
            color: "var(--color-accent-bright)",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            fontWeight: 500,
          }}
        >
          {step}
        </div>
        <span
          className="display"
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "var(--color-text-primary)",
          }}
        >
          {label}
        </span>
        <span
          className="mono"
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-text-tertiary)",
          }}
        >
          {sublabel}
        </span>
      </div>
      {!isLast && (
        <div
          style={{
            width: "64px",
            height: "1px",
            background: "var(--color-border-default)",
            margin: "0 8px",
            marginBottom: "44px",
          }}
        />
      )}
    </div>
  );
}

/* ── LandingPage ───────────────────────────────────────────── */
export default function LandingPage() {
  return (
    <div className="landing">
      <LandingTopBar />

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="landing__hero">
        <div className="landing__bg landing__bg--terminal" />
        <div className="landing__grid" />

        <div className="landing__hero-inner container">
          {/* Left */}
          <div className="landing__hero-left">
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "28px",
              }}
            >
              <span className="pill pill-accent">
                <span className="live-dot" />
                Live on Zama fhEVM &middot; Sepolia
              </span>
            </div>

            <h1 className="landing__headline">
              Bet without
              <br />
              <em>revealing.</em>
            </h1>

            <p
              className="landing__sub"
              style={{ marginBottom: "36px" }}
            >
              NullCast is the first prediction market where your position stays
              encrypted. Place bets, see live aggregate odds, settle
              trustlessly&mdash;all powered by fully homomorphic encryption.
            </p>

            <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
              <Link href="/markets" className="btn btn-primary btn-lg">
                Launch app
                <IconArrowRight size={14} />
              </Link>
              <a
                href="https://docs.nullcast.xyz"
                className="btn btn-secondary btn-lg"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read docs
              </a>
            </div>

            {/* Stats row */}
            <div
              style={{
                display: "flex",
                gap: "40px",
                marginTop: "56px",
                paddingTop: "32px",
                borderTop: "1px solid var(--color-border-subtle)",
              }}
            >
              <StatBox label="Total volume" value="$8.2M" />
              <StatBox label="Open markets" value="142" />
              <StatBox label="Private bets" value="24.1k" />
              <StatBox label="Avg resolution" value="2.4d" />
            </div>
          </div>

          {/* Right */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              alignItems: "center",
            }}
          >
            <LiveMarketCard />
          </div>
        </div>
      </section>

      {/* ── Features (section 01) ───────────────────────────── */}
      <section
        id="features"
        style={{ padding: "96px 0 80px" }}
      >
        <div className="container">
          <div style={{ marginBottom: "48px" }}>
            <span
              className="mono"
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                display: "block",
                marginBottom: "12px",
              }}
            >
              &#167; 01 &middot; Primitives
            </span>
            <h2
              className="display"
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                letterSpacing: "-0.04em",
              }}
            >
              Privacy-first by design
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "16px",
            }}
          >
            <FeatureCard
              icon={
                <LockIcon
                  size={20}
                  stroke="var(--color-accent-bright)"
                />
              }
              title="Private positions"
              description="Individual bets are encrypted with FHE. No one can see your position size, direction, or timing&mdash;not even the contract owner."
            />
            <FeatureCard
              icon={
                <IconChart
                  size={20}
                  stroke="var(--color-accent-bright)"
                />
              }
              title="Live odds"
              description="Aggregate pool totals are publicly decryptable in real time, giving you accurate market signals without leaking who bet what."
            />
            <FeatureCard
              icon={
                <IconShield
                  size={20}
                  stroke="var(--color-accent-bright)"
                />
              }
              title="Verifiable resolution"
              description="Oracle resolution and payout proofs are on-chain and auditable. You can verify settlement without trusting anyone."
            />
          </div>
        </div>
      </section>

      {/* ── Flow diagram (section 02) ──────────────────────── */}
      <section
        style={{
          padding: "80px 0 96px",
          borderTop: "1px solid var(--color-border-subtle)",
        }}
      >
        <div className="container">
          <div style={{ marginBottom: "48px" }}>
            <span
              className="mono"
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                display: "block",
                marginBottom: "12px",
              }}
            >
              &#167; 02 &middot; Circuit
            </span>
            <h2
              className="display"
              style={{
                fontSize: "var(--text-2xl)",
                fontWeight: 700,
                letterSpacing: "-0.04em",
              }}
            >
              How it works
            </h2>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              gap: "0",
              paddingTop: "24px",
            }}
          >
            <FlowStep step="01" label="Sign" sublabel="wallet eoa" />
            <FlowStep step="02" label="Encrypt" sublabel="fhe ciphertext" />
            <FlowStep step="03" label="Aggregate" sublabel="on-chain sum" />
            <FlowStep
              step="04"
              label="Settle"
              sublabel="payout proof"
              isLast
            />
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer
        className="landing__footer"
        style={{ padding: "48px 0" }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Left: logo + version */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
            }}
          >
            <LogoFull size={22} />
            <span
              className="mono"
              style={{
                fontSize: "var(--text-xs)",
                color: "var(--color-text-tertiary)",
              }}
            >
              Sepolia testnet
            </span>
          </div>

          {/* Center: links */}
          <nav
            style={{
              display: "flex",
              gap: "24px",
              fontSize: "var(--text-sm)",
            }}
          >
            <a
              href="https://docs.nullcast.xyz"
              className="nc-nav"
              target="_blank"
              rel="noopener noreferrer"
            >
              Docs
            </a>
            <a
              href="https://sepolia.etherscan.io"
              className="nc-nav"
              target="_blank"
              rel="noopener noreferrer"
            >
              Contracts
            </a>
            <a
              href="https://github.com/nullcast"
              className="nc-nav"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              href="https://discord.gg/nullcast"
              className="nc-nav"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discord
            </a>
          </nav>

          {/* Right: built on badge */}
          <span className="pill pill-privacy">
            Built on Zama
          </span>
        </div>
      </footer>
    </div>
  );
}
