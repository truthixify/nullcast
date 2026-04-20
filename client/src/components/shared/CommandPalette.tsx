"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Icon } from "./Icons";

const NAV_ITEMS = [
  { id: "/", label: "Home", hint: "Landing page" },
  { id: "/markets", label: "Markets", hint: "Browse predictions" },
  { id: "/portfolio", label: "Portfolio", hint: "Your positions" },
  { id: "/vaults", label: "Vaults", hint: "Copy-trade strategies" },
  { id: "/reputation", label: "Score", hint: "Your reputation" },
  { id: "/liquidity", label: "Liquidity", hint: "LP positions" },
  { id: "/markets/create", label: "Create market", hint: "Deploy a new market" },
  { id: "/vaults/create", label: "Create vault", hint: "Start a strategy" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // ⌘K / Ctrl+K toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Close on navigation
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Filter items
  const items = useMemo(() => {
    if (!query.trim()) return NAV_ITEMS;
    const q = query.toLowerCase();
    return NAV_ITEMS.filter(
      (it) => it.label.toLowerCase().includes(q) || it.hint.toLowerCase().includes(q)
    );
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected((s) => Math.min(s + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        const it = items[selected];
        if (it) {
          router.push(it.id);
          setOpen(false);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, items, selected, router]);

  // Reset selection on query change
  useEffect(() => {
    setSelected(0);
  }, [query]);

  // Expose open function for external triggers
  useEffect(() => {
    (window as unknown as { openCommandPalette?: () => void }).openCommandPalette = () => setOpen(true);
    return () => { delete (window as unknown as { openCommandPalette?: () => void }).openCommandPalette; };
  }, []);

  if (!open) return null;

  return (
    <div
      onClick={() => setOpen(false)}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(8, 7, 6, 0.72)",
        backdropFilter: "blur(4px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        paddingTop: "14vh",
        animation: "fade-in 160ms ease-out",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 560,
          background: "var(--bg-1)",
          border: "1px solid var(--line-2)",
          borderRadius: 6,
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,168,67,0.05)",
          animation: "scale-in 180ms cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      >
        {/* Search input */}
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--line)",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Icon name="search" size={14} color="var(--ink-3)" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search pages, markets..."
            style={{ flex: 1, fontSize: 14, color: "var(--ink-1)" }}
          />
          <span className="kbd">esc</span>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: "auto" }}>
          {items.length === 0 && (
            <div style={{ padding: 24, color: "var(--ink-3)", fontSize: 12, textAlign: "center" }}>
              No results
            </div>
          )}
          {items.map((it, i) => (
            <button
              key={it.id}
              onClick={() => {
                router.push(it.id);
                setOpen(false);
              }}
              onMouseEnter={() => setSelected(i)}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 18px",
                background: selected === i ? "var(--bg-2)" : "transparent",
                borderLeft: selected === i ? "2px solid var(--gold)" : "2px solid transparent",
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <span style={{ fontSize: 13, color: "var(--ink-1)", flex: 1 }}>{it.label}</span>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{it.hint}</span>
            </button>
          ))}
        </div>

        {/* Footer hints */}
        <div
          style={{
            padding: "8px 18px",
            borderTop: "1px solid var(--line)",
            display: "flex",
            gap: 14,
            fontSize: 10,
            color: "var(--ink-3)",
          }}
        >
          <span><span className="kbd">↑↓</span> navigate</span>
          <span><span className="kbd">↵</span> open</span>
          <span><span className="kbd">esc</span> close</span>
        </div>
      </div>
    </div>
  );
}
