"use client";

import { ReactNode } from "react";
import { AppLayout } from "@/components/nc/AppLayout";

export default function AppGroupLayout({ children }: { children: ReactNode }) {
  return <AppLayout>{children}</AppLayout>;
}
