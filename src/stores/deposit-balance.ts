import { create } from "zustand"

export type DepositBalance = {
  chain: string | null
  address: string | null
  symbol: string | null
  amount: string | null
  usd: string | null
  error: string | null
  updatedAt: number | null
}

type DepositBalanceState = DepositBalance & {
  setBalance: (next: DepositBalance) => void
}

const empty: DepositBalance = {
  chain: null,
  address: null,
  symbol: null,
  amount: null,
  usd: null,
  error: null,
  updatedAt: null,
}

export const useDepositBalance = create<DepositBalanceState>((set) => ({
  ...empty,
  setBalance: (next) => set(next),
}))
