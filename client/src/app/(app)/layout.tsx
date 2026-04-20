"use client";

import { ReactNode } from "react";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
}
