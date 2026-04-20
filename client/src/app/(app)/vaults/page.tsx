"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useAccount, useReadContract, useReadContracts, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { vaultFactoryConfig, getVaultConfig } from "@/lib/contracts";
import { useApproveCUSDT } from "@/hooks/useCUSDT";
import { useFHEEncrypt } from "@/hooks/useFHEVM";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";
import { LockIcon, IconPlus, CheckIcon } from "@/components/shared/Icons";

/* ── Deposit flow step type ──────────────────────────────────── */

type DepositStep =
  | "idle"
  | "encrypting"
  | "approving"
  | "writing"
  | "confirming"
  | "confirmed"
  | "error";

/* ── Tier label helper ───────────────────────────────────────── */

function tierLabel(tier: number): string {
  if (tier >= 80) return "Oracle";
  if (tier >= 60) return "Strategist";
  if (tier >= 40) return "Analyst";
  if (tier >= 20) return "Explorer";
  return "Open";
}

function followerTierLabel(tier: number): string {
  if (tier === 0) return "Anyone can deposit";
  return `Requires ${tierLabel(tier)}+ (≥${tier})`;
}

function truncAddr(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ── VaultCard ───────────────────────────────────────────────── */

function VaultCard({ address }: { address: `0x${string}` }) {
  const config = getVaultConfig(address);
  const { address: userAddress } = useAccount();

  const { data, isLoading } = useReadContracts({
    contracts: [
      { ...config, functionName: "name" },
      { ...config, functionName: "description" },
      { ...config, functionName: "manager" },
      { ...config, functionName: "followerCount" },
      { ...config, functionName: "requiredTier" },
      { ...config, functionName: "performanceFeeBps" },
      { ...config, functionName: "publicTotalDeposits" },
      { ...config, functionName: "closed" },
      { ...config, functionName: "vaultId" },
    ],
  });

  const name = data?.[0]?.result as string | undefined;
  const description = data?.[1]?.result as string | undefined;
  const manager = data?.[2]?.result as string | undefined;
  const followerCount = data?.[3]?.result as bigint | undefined;
  const requiredTier = data?.[4]?.result as number | undefined;
  const perfFeeBps = data?.[5]?.result as number | undefined;
  const publicTotalDeposits = data?.[6]?.result as bigint | undefined;
  const closed = data?.[7]?.result as boolean | undefined;

  const isManager = userAddress && manager && userAddress.toLowerCase() === manager.toLowerCase();

  /* ── Close vault ───────────────────────────────────────────── */
  const {
    writeContract: writeClose,
    data: closeHash,
    isPending: isClosing,
  } = useWriteContract();
  const { isLoading: isCloseConfirming, isSuccess: isCloseClosed } =
    useWaitForTransactionReceipt({ hash: closeHash });

  const handleClose = () => {
    writeClose({
      ...config,
      functionName: "closeVault",
    });
  };

  /* ── Deposit ───────────────────────────────────────────────── */
  const {
    writeContract: writeDeposit,
    data: depositHash,
    isPending: isDepositWriting,
    error: depositWriteError,
  } = useWriteContract();
  const {
    isLoading: isDepositConfirming,
    isSuccess: isDepositConfirmed,
  } = useWaitForTransactionReceipt({ hash: depositHash });

  const approveCUSDT = useApproveCUSDT();
  const fhe = useFHEEncrypt();

  const [amount, setAmount] = useState("100");
  const [depositStep, setDepositStep] = useState<DepositStep>("idle");
  const [showDeposit, setShowDeposit] = useState(false);
  const amountNum = parseFloat(amount) || 0;

  const prevConfirmed = useRef(false);
  useEffect(() => {
    if (isDepositConfirmed && !prevConfirmed.current && depositStep === "confirming") {
      prevConfirmed.current = true;
      setDepositStep("confirmed");
    }
    if (!isDepositConfirmed) {
      prevConfirmed.current = false;
    }
  }, [isDepositConfirmed, depositStep]);

  const handleDeposit = useCallback(async () => {
    if (!userAddress || amountNum <= 0) return;

    try {
      setDepositStep("encrypting");
      const amountBaseUnits = BigInt(Math.round(amountNum * 1e6));

      const encResult = await fhe.encrypt(amountBaseUnits, address);
      if (!encResult) {
        setDepositStep("error");
        return;
      }

      setDepositStep("approving");
      const approveEnc = await fhe.encrypt(
        amountBaseUnits,
        CONTRACT_ADDRESSES.MockcUSDT as `0x${string}`
      );
      if (!approveEnc) {
        setDepositStep("error");
        return;
      }
      approveCUSDT.approve(address, approveEnc.handle, approveEnc.inputProof);

      setDepositStep("writing");
      writeDeposit({
        ...config,
        functionName: "deposit",
        args: [encResult.handle, encResult.inputProof],
      });
      setDepositStep("confirming");
    } catch {
      setDepositStep("error");
    }
  }, [userAddress, amountNum, address, fhe, approveCUSDT, writeDeposit, config]);

  /* ── Loading skeleton ──────────────────────────────────────── */
  if (isLoading) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <div className="skel" style={{ width: "50%", height: 18, marginBottom: 10 }} />
        <div className="skel" style={{ width: "80%", height: 14, marginBottom: 14 }} />
        <div className="skel" style={{ width: "100%", height: 36 }} />
      </div>
    );
  }

  const isClosed = closed || isCloseClosed;
  const totalDepositsDisplay = publicTotalDeposits
    ? (Number(publicTotalDeposits) / 1e6).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : "0.00";

  return (
    <div className="card" style={{ padding: 0 }}>
      {/* Header */}
      <div className="card-head">
        <div style={{ flex: 1 }}>
          <h3 style={{ marginBottom: 2 }}>{name || "Unnamed Vault"}</h3>
          {description && (
            <p style={{ fontSize: 12, color: "var(--t-3)", margin: 0 }}>{description}</p>
          )}
        </div>
        <span className={`pill ${isClosed ? "cancelled" : "open"}`}>
          {isClosed ? "Closed" : "Open"}
        </span>
      </div>

      <div className="card-body">
        {/* Stats grid */}
        <div className="grid-3" style={{ marginBottom: 16, fontSize: 13 }}>
          <div>
            <div className="eyebrow">Manager</div>
            <div className="mono" style={{ color: "var(--t-1)" }}>
              {manager ? truncAddr(manager) : "--"}
            </div>
          </div>
          <div>
            <div className="eyebrow">Followers</div>
            <div style={{ color: "var(--t-1)" }}>
              {followerCount !== undefined ? Number(followerCount) : 0}
            </div>
          </div>
          <div>
            <div className="eyebrow">Follower gate</div>
            <div style={{ color: "var(--t-1)", fontSize: 12 }}>
              {requiredTier !== undefined ? followerTierLabel(requiredTier) : "--"}
            </div>
          </div>
          <div>
            <div className="eyebrow">Performance fee</div>
            <div style={{ color: "var(--t-1)" }}>
              {perfFeeBps !== undefined ? `${(perfFeeBps / 100).toFixed(0)}%` : "--"}
            </div>
          </div>
          <div>
            <div className="eyebrow">Total deposits</div>
            <div className="mono" style={{ color: "var(--t-1)" }}>
              {totalDepositsDisplay} cUSDT
            </div>
          </div>
          <div>
            <div className="eyebrow">Contract</div>
            <div className="mono" style={{ color: "var(--t-1)" }}>
              {truncAddr(address)}
            </div>
          </div>
        </div>

        {/* Action buttons: deposit + close side by side */}
        {!isClosed && (
          <>
            {!showDeposit ? (
              <div className="row gap-2" style={{ flexWrap: "wrap" }}>
                <button
                  className="btn primary"
                  type="button"
                  onClick={() => setShowDeposit(true)}
                  style={{ flex: 1 }}
                >
                  Deposit
                </button>
                {isManager && (
                  <button
                    className="btn secondary"
                    type="button"
                    onClick={handleClose}
                    disabled={isClosing || isCloseConfirming}
                    style={{ flex: 1 }}
                  >
                    {isClosing
                      ? "Confirm..."
                      : isCloseConfirming
                        ? "Closing..."
                        : "Close Vault"}
                  </button>
                )}
              </div>
            ) : (
              <div style={{ marginTop: 4 }}>
                <div className="field" style={{ marginBottom: 10 }}>
                  <label className="eyebrow">Deposit amount</label>
                  <div className="input-row">
                    <input
                      className="input input-mono"
                      type="text"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => {
                        setAmount(e.target.value);
                        if (depositStep !== "idle") setDepositStep("idle");
                      }}
                    />
                    <span className="unit">cUSDT</span>
                  </div>
                </div>

                <div className="row gap-2" style={{ marginBottom: 12 }}>
                  {[50, 100, 250, 500].map((qa) => (
                    <button
                      key={qa}
                      className={`btn sm ${amount === String(qa) ? "primary" : "ghost"}`}
                      type="button"
                      onClick={() => {
                        setAmount(String(qa));
                        if (depositStep !== "idle") setDepositStep("idle");
                      }}
                      style={{ flex: 1, justifyContent: "center" }}
                    >
                      {qa}
                    </button>
                  ))}
                </div>

                <button
                  className="btn primary block"
                  type="button"
                  onClick={handleDeposit}
                  disabled={
                    !userAddress ||
                    depositStep !== "idle" ||
                    amountNum <= 0 ||
                    isDepositWriting ||
                    isDepositConfirming
                  }
                >
                  {!userAddress
                    ? "Connect wallet"
                    : depositStep === "encrypting"
                      ? "Encrypting..."
                      : depositStep === "approving"
                        ? "Approving cUSDT..."
                        : depositStep === "writing" || isDepositWriting
                          ? "Confirm in wallet..."
                          : isDepositConfirming
                            ? "Confirming..."
                            : depositStep === "confirmed"
                              ? "Deposited"
                              : `Deposit ${amountNum > 0 ? `${amountNum} cUSDT` : ""}`}
                </button>

                {depositStep === "error" && (
                  <div
                    style={{
                      background: "var(--no-bg)",
                      border: "1px solid var(--no-bd)",
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginTop: 10,
                      fontSize: 12,
                    }}
                  >
                    <p style={{ color: "var(--no)", fontWeight: 500, marginBottom: 6 }}>
                      {fhe.error || depositWriteError?.message || "Something went wrong"}
                    </p>
                    <button
                      className="btn sm ghost"
                      type="button"
                      onClick={() => {
                        setDepositStep("idle");
                        fhe.reset();
                      }}
                    >
                      Retry
                    </button>
                  </div>
                )}

                {/* Privacy notice */}
                <div
                  style={{
                    background: "var(--enc-bg)",
                    border: "1px solid var(--enc-bd)",
                    borderRadius: 8,
                    padding: "10px 14px",
                    marginTop: 14,
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <LockIcon size={11} />
                  <div style={{ fontSize: 11, color: "var(--enc)", lineHeight: 1.5 }}>
                    <strong>Deposits are encrypted</strong>
                    <br />
                    Your deposit amount is private. Only aggregate totals are public.
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/* ── Vaults page ─────────────────────────────────────────────── */

export default function VaultsPage() {
  const { data: allVaults, isLoading } = useReadContract({
    ...vaultFactoryConfig,
    functionName: "getAllVaults",
  });

  const vaults = (allVaults as `0x${string}`[]) || [];

  return (
    <div className="page">
      <div className="container">
        {/* Page head */}
        <div className="row between" style={{ marginBottom: 24 }}>
          <div className="page-head" style={{ padding: 0 }}>
            <h1 style={{ fontSize: 36 }}>Vaults</h1>
            <p className="sub">
              Follow top traders. Deposit into strategy vaults and copy-trade encrypted positions.
            </p>
          </div>
          <Link href="/vaults/create" className="btn primary lg">
            <IconPlus size={14} />
            Create Vault
          </Link>
        </div>

        {/* Loading */}
        {isLoading && (
          <div
            className="row"
            style={{
              justifyContent: "center",
              padding: "60px 20px",
              gap: 12,
            }}
          >
            <span
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                border: "2px solid var(--acc)",
                borderTopColor: "transparent",
                animation: "spin 1s linear infinite",
              }}
            />
            <span style={{ fontSize: 13, color: "var(--t-2)" }}>
              Loading vaults...
            </span>
          </div>
        )}

        {/* Vault cards */}
        {!isLoading && vaults.length > 0 && (
          <div className="stack gap-4">
            <span className="eyebrow">
              {vaults.length} vault{vaults.length !== 1 ? "s" : ""}
            </span>
            {vaults.map((addr) => (
              <VaultCard key={addr} address={addr} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && vaults.length === 0 && (
          <div
            className="card elevated"
            style={{
              padding: "80px 20px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <CheckIcon size={24} />
            <span
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: "var(--t-2)",
              }}
            >
              No vaults yet
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--t-3)",
                maxWidth: 320,
              }}
            >
              Create the first strategy vault or wait for managers to deploy theirs.
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
