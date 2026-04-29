/**
 * Unified toast helper. Every action across the app routes through this so the
 * visual treatment stays consistent: gold accent, monospace tx hash chip,
 * optional "View" link.
 */
import { toast } from "sonner";

const fakeHash = () => {
  const chars = "0123456789abcdef";
  let s = "0x";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * 16)];
  s += "…";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * 16)];
  return s;
};

interface SealedOpts {
  hash?: string;
  href?: string;       // for "View" link
}

export const sealed = (message: string, opts: SealedOpts = {}) => {
  const hash = opts.hash ?? fakeHash();
  toast.success(message, {
    description: `tx ${hash} · sealed`,
    duration: 4000,
    action: opts.href
      ? { label: "View", onClick: () => (window.location.href = opts.href!) }
      : undefined,
    className: "nc-toast-sealed",
  });
};

export const failure = (message: string, description?: string) => {
  toast.error(message, { description, duration: 4500 });
};

export const info = (message: string, description?: string) => {
  toast(message, { description });
};
