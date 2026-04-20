"use client";

import { LockIcon } from "./Icons";

interface Props {
  state: "hidden" | "decrypting" | "revealed";
  value?: string;
  onDecrypt?: () => void;
  compact?: boolean;
  unit?: string;
}

/**
 * EncryptedValue — backward-compatible wrapper.
 * New code should prefer CipherReveal for the slot-machine effect.
 */
export function EncryptedValue({ state, value, onDecrypt, compact, unit = "cUSDT" }: Props) {
  if (state === "revealed")
    return (
      <span className="enc-val">
        <span className="reveal num">{value}</span>
        {unit && !compact && (
          <span style={{ color: "var(--ink-3)", fontFamily: "var(--f-mono)" }}>{unit}</span>
        )}
      </span>
    );

  if (state === "decrypting")
    return (
      <span className="enc-val">
        <LockIcon size={11} /> <span className="shimmer-text mono">decrypting...</span>
      </span>
    );

  return (
    <span className="enc-val">
      <LockIcon size={11} />
      <span className="dots mono">{"\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}</span>
      {onDecrypt && (
        <button
          className="btn sm ghost"
          style={{ height: 22, padding: "0 8px", fontSize: 11 }}
          onClick={onDecrypt}
        >
          Decrypt
        </button>
      )}
    </span>
  );
}
