"use client";

import { ReactNode } from "react";
import { Sidebar, TopBar, MobileNav } from "@/components/shared/Header";
import { CommandPalette } from "@/components/shared/CommandPalette";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <Sidebar />
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
          <TopBar />
          <div style={{ flex: 1 }}>{children}</div>
        </main>
      </div>
      <MobileNav />
      <CommandPalette />
    </>
  );
}
