import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "@rainbow-me/rainbowkit/styles.css";
import "../styles/design.css";
import "./globals.css";
import { Providers } from "@/components/providers";

const syne = Syne({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-syne",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NullCast — Bet without revealing",
  description: "Prediction markets where your position is encrypted on-chain. Nobody sees your side, your size, or your P&L.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "NullCast",
    description: "Confidential prediction markets. Encrypted positions. Public odds.",
    siteName: "NullCast",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "NullCast — Bet without revealing",
    description: "Prediction markets with FHE-encrypted positions on Zama fhEVM.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${syne.variable} ${dmSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
