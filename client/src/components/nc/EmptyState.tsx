/**
 * EmptyState — sealed-envelope motif. Used wherever a list has no rows.
 */
import { ReactNode } from "react";
import { LogoMark } from "./Logo";

interface Props {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export const EmptyState = ({ title, body, action, icon }: Props) => (
  <div className="flex flex-col items-center justify-center text-center py-16 sm:py-24 px-6 animate-fade-in">
    <div className="relative mb-6">
      {icon ?? (
        <div className="relative h-20 w-28 rounded border border-subtle bg-surface-1 flex items-center justify-center overflow-hidden">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "repeating-linear-gradient(45deg, hsl(var(--primary)/0.15) 0px, hsl(var(--primary)/0.15) 1px, transparent 1px, transparent 8px)",
            }}
          />
          <div className="absolute inset-2 border border-primary/15 rounded-sm" />
          <LogoMark size={32} className="relative" />
        </div>
      )}
    </div>
    <div className="font-display text-xl text-fg">{title}</div>
    {body && <p className="mt-2 text-sm text-fg-3 font-display max-w-sm">{body}</p>}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/** Skeleton bar for shimmering placeholders during reveal animations. */
export const Skel = ({ className = "" }: { className?: string }) => (
  <div
    className={`rounded bg-surface-2 overflow-hidden relative ${className}`}
    aria-hidden
  >
    <div
      className="absolute inset-0 animate-shimmer"
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, hsl(var(--primary)/0.08) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
      }}
    />
  </div>
);
