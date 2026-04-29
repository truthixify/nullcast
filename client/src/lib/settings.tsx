"use client";

/**
 * Settings store — accent color, reveal-by-default toggle, currency, language,
 * reduced motion. Persisted to localStorage. The accent rewrites the
 * --primary HSL variable on the document root.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Accent = "gold" | "sage" | "terracotta";
export type Currency = "USD" | "EUR" | "GBP";
export type Lang = "en" | "es" | "fr";

const ACCENT_HSL: Record<Accent, string> = {
  gold:       "42 62% 55%",
  sage:       "138 28% 52%",
  terracotta: "14 55% 58%",
};
const ACCENT_GLOW: Record<Accent, string> = {
  gold:       "42 75% 65%",
  sage:       "138 38% 62%",
  terracotta: "14 70% 68%",
};

interface SettingsState {
  accent: Accent;
  revealByDefault: boolean;
  currency: Currency;
  lang: Lang;
  reducedMotion: boolean;
  setAccent: (a: Accent) => void;
  setRevealByDefault: (b: boolean) => void;
  setCurrency: (c: Currency) => void;
  setLang: (l: Lang) => void;
  setReducedMotion: (b: boolean) => void;
}

const Ctx = createContext<SettingsState | null>(null);

const KEY = "nc.settings.v1";

interface Persisted {
  accent: Accent;
  revealByDefault: boolean;
  currency: Currency;
  lang: Lang;
  reducedMotion: boolean;
}

const DEFAULTS: Persisted = {
  accent: "gold",
  revealByDefault: false,
  currency: "USD",
  lang: "en",
  reducedMotion: false,
};

const load = (): Persisted => {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch { return DEFAULTS; }
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [s, setS] = useState<Persisted>(() => load());

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignore */ }
  }, [s]);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--primary", ACCENT_HSL[s.accent]);
    root.style.setProperty("--primary-glow", ACCENT_GLOW[s.accent]);
    root.style.setProperty("--ring", ACCENT_HSL[s.accent]);
    root.style.setProperty("--accent", ACCENT_HSL[s.accent]);
    if (s.reducedMotion) root.setAttribute("data-reduced-motion", "true");
    else root.removeAttribute("data-reduced-motion");
  }, [s.accent, s.reducedMotion]);

  const setAccent = useCallback((a: Accent) => setS((p) => ({ ...p, accent: a })), []);
  const setRevealByDefault = useCallback((b: boolean) => setS((p) => ({ ...p, revealByDefault: b })), []);
  const setCurrency = useCallback((c: Currency) => setS((p) => ({ ...p, currency: c })), []);
  const setLang = useCallback((l: Lang) => setS((p) => ({ ...p, lang: l })), []);
  const setReducedMotion = useCallback((b: boolean) => setS((p) => ({ ...p, reducedMotion: b })), []);

  const value = useMemo<SettingsState>(() => ({
    ...s,
    setAccent, setRevealByDefault, setCurrency, setLang, setReducedMotion,
  }), [s, setAccent, setRevealByDefault, setCurrency, setLang, setReducedMotion]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useSettings = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error("useSettings must be used inside <SettingsProvider>");
  return v;
};

export const ACCENTS: { id: Accent; label: string; hsl: string }[] = [
  { id: "gold",       label: "Gold",       hsl: ACCENT_HSL.gold },
  { id: "sage",       label: "Sage",       hsl: ACCENT_HSL.sage },
  { id: "terracotta", label: "Terracotta", hsl: ACCENT_HSL.terracotta },
];
