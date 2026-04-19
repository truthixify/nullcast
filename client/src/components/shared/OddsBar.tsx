"use client";

interface OddsBarProps {
  yes: number;
  no: number;
  large?: boolean;
  pool?: number | null;
  lastUpdate?: string;
  pulsing?: boolean;
  showMeta?: boolean;
}

export const OddsBar = ({
  yes,
  no,
  large = false,
  pool = null,
  lastUpdate,
  pulsing = false,
  showMeta = true,
}: OddsBarProps) => {
  const total = yes + no;
  const yesPct = total > 0 ? Math.round((yes / total) * 100) : 50;
  const noPct = total > 0 ? 100 - yesPct : 50;

  const barClass = [
    "odds-bar",
    large ? "odds-bar--lg" : "",
    pulsing ? "odds-bar--pulsing" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <div className={barClass}>
        <span className="odds-bar__pct odds-bar__pct--yes">
          {yesPct}% Yes
        </span>
        <div className="odds-bar__track">
          <div
            className="odds-bar__yes"
            style={{ width: `${yesPct}%` }}
          />
          <div className="odds-bar__no" />
          <div className="odds-bar__pulse" />
        </div>
        <span className="odds-bar__pct odds-bar__pct--no">
          {noPct}% No
        </span>
      </div>

      {showMeta && (pool !== null || lastUpdate) && (
        <div className="odds-bar__meta">
          {pool !== null && (
            <span>
              Pool: {pool.toLocaleString()} cUSDT
            </span>
          )}
          {pool !== null && lastUpdate && (
            <span className="dot" />
          )}
          {lastUpdate && (
            <>
              <span className="live-dot" />
              <span>{lastUpdate}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
};
