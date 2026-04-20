"use client";

import { ReactNode } from "react";
import { Header } from "@/components/shared/Header";
import { Footer } from "@/components/shared/Footer";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
    </>
  );
}
