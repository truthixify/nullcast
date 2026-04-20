import { type Address } from "viem";
import { CONTRACT_ADDRESSES } from "@/constants/addresses";

import NullCastFactoryABI from "@/constants/abis/NullCastFactory.json";
import NullCastMarketABI from "@/constants/abis/NullCastMarket.json";
import OracleMockABI from "@/constants/abis/OracleMock.json";
import ReputationGateABI from "@/constants/abis/ReputationGate.json";
import MockcUSDTABI from "@/constants/abis/MockcUSDT.json";
import VaultFactoryABI from "@/constants/abis/VaultFactory.json";
import StrategyVaultABI from "@/constants/abis/StrategyVault.json";

export const nullCastFactoryConfig = {
  address: CONTRACT_ADDRESSES.NullCastFactory as Address,
  abi: NullCastFactoryABI,
} as const;

export const oracleMockConfig = {
  address: CONTRACT_ADDRESSES.OracleMock as Address,
  abi: OracleMockABI,
} as const;

export const reputationGateConfig = {
  address: CONTRACT_ADDRESSES.ReputationGate as Address,
  abi: ReputationGateABI,
} as const;

export const mockcUSDTConfig = {
  address: CONTRACT_ADDRESSES.MockcUSDT as Address,
  abi: MockcUSDTABI,
} as const;

export function getMarketConfig(address: string) {
  return {
    address: address as Address,
    abi: NullCastMarketABI,
  } as const;
}

export const vaultFactoryConfig = {
  address: CONTRACT_ADDRESSES.VaultFactory as Address,
  abi: VaultFactoryABI,
} as const;

export function getVaultConfig(address: string) {
  return {
    address: address as Address,
    abi: StrategyVaultABI,
  } as const;
}
