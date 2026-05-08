"use client";

import { useState, useCallback, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAccount, useReadContract, useSignTypedData } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { getRelayer } from "@/lib/fhevm";
import { CommandPalette } from "@/components/nc/CommandPalette";
import { Logo } from "@/components/nc/Logo";
import { TickerRail } from "@/components/nc/TickerRail";
import { BottomNav } from "@/components/nc/BottomNav";
import { ShortcutsModal } from "@/components/nc/ShortcutsModal";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { mockcUSDTConfig } from "@/lib/contracts";
import { useMintCUSDT } from "@/hooks/useCUSDT";
import { Menu, Search, Plus, Settings as SettingsIcon, Wallet, Copy, ExternalLink, Coins } from "lucide-react";

const NAV = [
  { to: "/markets",   label: "Markets" },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/vaults",    label: "Vaults" },
  { to: "/liquidity", label: "Liquidity" },
  { to: "/reputation", label: "Score" },
  { to: "/activity",  label: "Activity" },
];

function useCUSDTBalance() {
  const { address } = useAccount();
  const { signTypedDataAsync } = useSignTypedData();
  const [balance, setBalance] = useState<number | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const { data: balanceHandle } = useReadContract({
    ...mockcUSDTConfig,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const isZero = !balanceHandle || String(balanceHandle).toLowerCase() === "0x" + "0".repeat(64);

  const decrypt = useCallback(async () => {
    if (!address || isZero || !balanceHandle) return;
    setIsDecrypting(true);
    try {
      const relayer = await getRelayer();
      const keypair = await relayer.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000);
      const contractAddr = mockcUSDTConfig.address as `0x${string}`;
      const eip712 = await relayer.createEIP712(keypair.publicKey, [contractAddr], startTimestamp, 1);
      const primaryType = eip712.primaryType || Object.keys(eip712.types).find((k: string) => k !== "EIP712Domain") || "UserDecryptRequestVerification";
      const signature = await signTypedDataAsync({
        types: eip712.types as Record<string, Array<{ name: string; type: string }>>,
        primaryType,
        domain: eip712.domain as { name: string; version: string; chainId: number; verifyingContract: `0x${string}` },
        message: eip712.message as Record<string, unknown>,
      });
      const result = await relayer.userDecrypt({
        handles: [balanceHandle as `0x${string}`],
        contractAddress: contractAddr,
        signedContractAddresses: [contractAddr],
        privateKey: keypair.privateKey,
        publicKey: keypair.publicKey,
        signature,
        signerAddress: address,
        startTimestamp,
        durationDays: 1,
      });
      const val = result[balanceHandle as `0x${string}`] as bigint;
      setBalance(Number(val) / 1e6);
    } catch { /* user rejected or KMS error */ }
    finally { setIsDecrypting(false); }
  }, [address, isZero, balanceHandle, signTypedDataAsync]);

  return { balance, isDecrypting, decrypt, hasHandle: !isZero };
}

function WalletSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { address } = useAccount();
  const { mint, hash: mintHash, isWriting, isConfirming, isConfirmed: isMintConfirmed } = useMintCUSDT();
  const [copied, setCopied] = useState(false);
  const { balance, isDecrypting, decrypt, hasHandle } = useCUSDTBalance();

  const handleCopy = () => {
    if (!address) return;
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleMint = () => {
    if (!address) return;
    mint(address, BigInt(10_000_000_000));
  };

  const truncated = address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[340px] bg-background border-l border-subtle p-0">
        <div className="p-5 border-b border-subtle">
          <div className="font-display text-base text-fg">Wallet</div>
        </div>

        <div className="p-5 space-y-6">
          {/* Address */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-3 mb-2">Address</div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-fg">{truncated}</span>
              <button onClick={handleCopy} className="h-6 w-6 inline-flex items-center justify-center text-fg-3 hover:text-fg transition-colors">
                <Copy className="h-3 w-3" />
              </button>
              {copied && <span className="font-mono text-[10px] text-yes">Copied</span>}
            </div>
          </div>

          {/* cUSDT Balance */}
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-3 mb-2">cUSDT Balance</div>
            {balance !== null ? (
              <div className="font-mono tnum text-3xl text-primary">
                {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            ) : hasHandle ? (
              <div className="flex items-center gap-3">
                <span className="font-mono text-lg text-fg-3 tracking-wider">●●●●●●●●</span>
                <Button variant="outline" size="sm" onClick={decrypt} disabled={isDecrypting}
                  className="text-primary border-primary/30 h-7 px-2.5 text-[11px]">
                  {isDecrypting ? "Decrypting..." : "Reveal"}
                </Button>
              </div>
            ) : (
              <div className="font-mono text-lg text-fg-3">0.00</div>
            )}
            <div className="font-mono text-[10px] text-fg-4 mt-1">ERC-7984 · encrypted on-chain</div>
          </div>

          {/* Mint success message */}
          {isMintConfirmed && mintHash && (
            <div className="p-3 rounded border border-yes/20 bg-yes/[0.04] animate-fade-in">
              <p className="text-yes text-xs font-medium mb-1">Minted 10,000 cUSDT</p>
              <p className="text-fg-3 text-[11px]">
                Transaction confirmed.{" "}
                <a
                  href={`https://sepolia.etherscan.io/tx/${mintHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  View on Etherscan →
                </a>
              </p>
            </div>
          )}

          {/* Quick actions */}
          <div className="space-y-2">
            <Button variant="primary" className="w-full" onClick={handleMint}
              disabled={isWriting || isConfirming}>
              <Coins className="h-3.5 w-3.5" />
              {isWriting ? "Confirm in wallet..." : isConfirming ? "Minting..." : "Mint test cUSDT"}
            </Button>

            {address && (
              <Button variant="outline" className="w-full" asChild>
                <a href={`https://sepolia.etherscan.io/address/${address}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> View on Etherscan
                </a>
              </Button>
            )}
          </div>

          {/* Network info */}
          <div className="pt-4 border-t border-subtle">
            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-fg-3 mb-2">Network</div>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-yes" />
              <span className="font-mono text-sm text-fg">Sepolia Testnet</span>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const pathname = usePathname();
  const [navOpen, setNavOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <CommandPalette />
      <ShortcutsModal />
      <WalletSheet open={walletOpen} onOpenChange={setWalletOpen} />

      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-subtle bg-background/85 backdrop-blur-xl">
        <div className="max-w-[1280px] mx-auto h-14 px-4 sm:px-6 flex items-center gap-3 sm:gap-8">
          <button
            onClick={() => setNavOpen(true)}
            className="lg:hidden h-9 w-9 -ml-2 inline-flex items-center justify-center text-fg-2 hover:text-fg transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link href="/" className="group flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded">
            <Logo mark size={22} className="transition-transform group-hover:rotate-[8deg]" />
            <span className="font-display text-base sm:text-lg tracking-tight leading-none">
              null<span className="italic text-primary">cast</span>
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-6 text-sm" aria-label="Primary">
            {NAV.slice(0, 5).map((n) => (
              <Link
                key={n.to}
                href={n.to}
                className={`transition-colors focus-visible:outline-none focus-visible:text-fg ${pathname === n.to || pathname?.startsWith(n.to + "/") ? "text-fg" : "text-fg-3 hover:text-fg-2"}`}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <Link
              href="/markets/create"
              className="hidden md:inline-flex items-center gap-1.5 px-2.5 h-8 rounded border border-subtle hover:border-strong text-xs text-fg-2 hover:text-fg transition-colors"
            >
              <Plus className="h-3 w-3" /> New market
            </Link>

            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="inline-flex items-center gap-2 px-2 sm:px-2.5 h-8 rounded border border-subtle hover:border-strong text-xs text-fg-3 hover:text-fg-2 transition-colors"
              aria-label="Search · ⌘K"
            >
              <Search className="h-3 w-3" />
              <span className="hidden sm:inline">Search</span>
              <kbd className="hidden md:inline font-mono text-[10px] px-1.5 py-0.5 rounded bg-surface-2 border border-subtle">⌘K</kbd>
            </button>

            <Link
              href="/settings"
              className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded border border-subtle hover:border-strong text-fg-3 hover:text-fg transition-colors"
              aria-label="Settings"
            >
              <SettingsIcon className="h-3.5 w-3.5" />
            </Link>

            <ConnectButton.Custom>
              {({ account, chain, openChainModal, openConnectModal, mounted }) => {
                const connected = mounted && account && chain;
                return (
                  <div {...(!mounted && { "aria-hidden": true, style: { opacity: 0, pointerEvents: "none", userSelect: "none" } })}>
                    {!connected ? (
                      <button
                        onClick={openConnectModal}
                        className="flex items-center gap-2 h-8 px-3 rounded bg-primary text-primary-foreground text-xs font-medium hover:brightness-110 transition-all"
                      >
                        <Wallet className="h-3.5 w-3.5" />
                        Connect
                      </button>
                    ) : chain.unsupported ? (
                      <button
                        onClick={openChainModal}
                        className="flex items-center gap-2 h-8 px-3 rounded bg-no/20 text-no border border-no/30 text-xs font-medium"
                      >
                        Wrong network
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={openChainModal}
                          className="h-8 w-8 rounded border border-subtle hover:border-strong flex items-center justify-center transition-colors"
                          aria-label={chain.name}
                        >
                          {chain.iconUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={chain.iconUrl} alt={chain.name ?? ""} className="h-4 w-4 rounded-full" />
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-yes" />
                          )}
                        </button>
                        <button
                          onClick={() => setWalletOpen(true)}
                          className="flex items-center gap-2 h-8 px-2.5 sm:px-3 rounded bg-surface-2 border border-subtle hover:border-strong transition-colors text-xs"
                        >
                          <Wallet className="h-3 w-3 text-fg-3" />
                          <span className="font-mono text-fg-2 hidden sm:inline">{account.displayName}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>
      </header>

      {/* Mobile nav drawer */}
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-[80%] max-w-xs bg-background border-r border-subtle p-0">
          <div className="p-5 border-b border-subtle flex items-center gap-2.5">
            <Logo mark size={20} />
            <span className="font-display text-lg tracking-tight">
              null<span className="italic text-primary">cast</span>
            </span>
          </div>
          <nav className="flex flex-col p-2" aria-label="Mobile primary">
            {NAV.map((n) => (
              <Link
                key={n.to}
                href={n.to}
                onClick={() => setNavOpen(false)}
                className={`px-4 py-3 rounded text-sm transition-colors ${
                  pathname === n.to || pathname?.startsWith(n.to + "/") ? "bg-surface-2 text-fg" : "text-fg-3 hover:text-fg-2 hover:bg-surface-1"
                }`}
              >
                {n.label}
              </Link>
            ))}
            <Link href="/search" onClick={() => setNavOpen(false)} className="px-4 py-3 rounded text-sm text-fg-3 hover:text-fg-2 hover:bg-surface-1 transition-colors">Search</Link>
            <Link href="/settings" onClick={() => setNavOpen(false)} className="px-4 py-3 rounded text-sm text-fg-3 hover:text-fg-2 hover:bg-surface-1 transition-colors">Settings</Link>
            <Link href="/markets/create" onClick={() => setNavOpen(false)} className="px-4 py-3 rounded text-sm text-primary hover:bg-surface-2 transition-colors mt-2 border-t border-subtle">+ New market</Link>
          </nav>
        </SheetContent>
      </Sheet>

      <main key={pathname} className="flex-1 animate-fade-in pb-32 lg:pb-12" id="main">
        {children}
      </main>

      <BottomNav />
      <TickerRail />

      <footer className="border-t border-subtle py-3">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 flex items-center justify-between text-[11px] text-fg-3 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Logo mark size={12} />
            <span className="font-display italic truncate">The house can&apos;t see your cards.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
