"use client";

interface PulseDotProps {
  color?: string;
}

export function PulseDot({ color = "var(--gold)" }: PulseDotProps) {
  return (
    <span
      className="pulse-dot"
      style={{
        background: color,
        boxShadow: `0 0 10px ${color}`,
      }}
    />
  );
}
