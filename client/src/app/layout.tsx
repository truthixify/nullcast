import type { Metadata } from "next";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "NullCast — Bet without revealing",
  description: "Prediction markets where your position is encrypted on-chain. Nobody sees your side, your size, or your strategy.",
  icons: {
    icon: "/icon.svg",
  },
  openGraph: {
    title: "NullCast — Confidential Prediction Markets",
    description: "Encrypted positions. Public odds. Copy top traders. Built on Zama fhEVM.",
    siteName: "NullCast",
    type: "website",
    images: [{ url: "/og.svg", width: 1200, height: 630, alt: "NullCast — Prediction markets, private by default" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NullCast — Bet without revealing",
    description: "Prediction markets with FHE-encrypted positions. Copy strategies from top traders. Powered by Zama fhEVM.",
    images: ["/og.svg"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
