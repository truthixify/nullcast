"use client";

import { useState, useCallback } from "react";
import { LockIcon, IconEye } from "./Icons";

type EncryptedSize = "sm" | "md" | "lg";

interface EncryptedValueProps {
  value: number;
  revealed: boolean;
  onReveal?: () => void;
  unit?: string;
  size?: EncryptedSize;
}

const sizeMap: Record<EncryptedSize, { fontSize: string; dotCount: number }> = {
  sm: { fontSize: "var(--text-sm)", dotCount: 5 },
  md: { fontSize: "var(--text-base)", dotCount: 7 },
  lg: { fontSize: "var(--text-lg)", dotCount: 9 },
};

export const EncryptedValue = ({
  value,
  revealed,
  onReveal,
  unit = "cUSDT",
  size = "md",
}: EncryptedValueProps) => {
  const [decrypting, setDecrypting] = useState(false);
  const { fontSize, dotCount } = sizeMap[size];

  const handleReveal = useCallback(() => {
    if (revealed || decrypting) return;
    setDecrypting(true);
    setTimeout(() => {
      setDecrypting(false);
      onReveal?.();
    }, 1200);
  }, [revealed, decrypting, onReveal]);

  // Hidden state: show dots + reveal button
  if (!revealed && !decrypting) {
    return (
      <span
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontSize,
        }}
      >
        <LockIcon size={14} />
        <span style={{ color: "var(--color-privacy-text)", letterSpacing: "0.15em" }}>
          {"\u2022".repeat(dotCount)}
        </span>
        {onReveal && (
          <button
            className="btn btn-sm btn-secondary"
            onClick={handleReveal}
            type="button"
          >
            <IconEye size={12} />
            Reveal
          </button>
        )}
      </span>
    );
  }

  // Decrypting state: animated text
  if (decrypting) {
    return (
      <span
        className="mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          fontSize,
          color: "var(--color-privacy-text)",
          animation: "decrypt 600ms ease-in-out infinite",
        }}
      >
        <LockIcon size={14} stroke="var(--color-privacy-text)" />
        decrypting...
      </span>
    );
  }

  // Revealed state: show value with glow animation
  return (
    <span
      className="mono encrypted-revealed"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize,
      }}
    >
      {value.toLocaleString()} {unit}
    </span>
  );
};
