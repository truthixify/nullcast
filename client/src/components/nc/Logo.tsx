/**
 * NullCast logo — a stylized null-set "Ø" rendered as a precision-engraved
 * coin edge: outer ring, inner ring, diagonal slash. Gold on charcoal.
 *
 * Variants:
 *   <Logo />              → mark + wordmark, default size
 *   <Logo mark />         → mark only (square, scales to font-size by default)
 *   <Logo size={28} />    → custom mark height in px
 */
import { cn } from "@/lib/utils";

interface LogoProps {
  mark?: boolean;
  size?: number;
  className?: string;
  wordmarkClassName?: string;
}

export const LogoMark = ({ size = 24, className }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="nc-gold" x1="6" y1="4" x2="26" y2="28" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="hsl(42 75% 70%)" />
        <stop offset="55%" stopColor="hsl(42 62% 55%)" />
        <stop offset="100%" stopColor="hsl(38 55% 42%)" />
      </linearGradient>
      <linearGradient id="nc-slash" x1="8" y1="8" x2="24" y2="24" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="hsl(42 80% 78%)" />
        <stop offset="100%" stopColor="hsl(42 62% 55%)" />
      </linearGradient>
    </defs>

    {/* Outer engraved ring */}
    <circle cx="16" cy="16" r="13.25" stroke="url(#nc-gold)" strokeWidth="1.5" />

    {/* Inner hairline — coin edge / privacy boundary */}
    <circle cx="16" cy="16" r="9.75" stroke="url(#nc-gold)" strokeWidth="0.6" opacity="0.55" />

    {/* Null-set slash, ends extend slightly past the ring */}
    <line
      x1="6.5"
      y1="25.5"
      x2="25.5"
      y2="6.5"
      stroke="url(#nc-slash)"
      strokeWidth="1.6"
      strokeLinecap="round"
    />

    {/* Tiny center dot — the secret, sealed */}
    <circle cx="16" cy="16" r="0.9" fill="hsl(42 62% 55%)" />
  </svg>
);

export const Logo = ({ mark = false, size = 22, className, wordmarkClassName }: LogoProps) => {
  if (mark) return <LogoMark size={size} className={className} />;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark size={size} />
      <span className={cn("font-display tracking-tight leading-none", wordmarkClassName)}>
        null<span className="italic text-primary">cast</span>
      </span>
    </span>
  );
};
