/**
 * The app's single chain context: which chain is "current", and how much is
 * available on each chain.
 *
 * Before this store the current chain was implicit — the account dropdown simply
 * showed whichever chain you had last visited (`/portfolio/wallets/<chain>`), and
 * the Quick Buy popover kept a separate chain of its own. Requirement `19` §2.3
 * asks for one source of truth that the UI reads and writes; this is it.
 *
 * Balances are seeded with the amounts measured on the live Sigma account during
 * the walkthrough (2026-10-04) rather than fetched: the trial build has no
 * connected wallet, and the point of the summary is the chain/balance *entry
 * point*, not the balance source. `status` exists so a real fetcher can be
 * dropped in later without changing the UI — the summary must never silently
 * under-count (requirement §2.1.3).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { CHAINS, CHAIN_ORDER, type ChainId } from "@/lib/chain-registry";

export type BalanceStatus = "ok" | "loading" | "error";

export type ChainBalance = {
  /** Native-token amount. */
  amount: number;
  status: BalanceStatus;
};

type ChainContextState = {
  currentChain: ChainId;
  balances: Record<ChainId, ChainBalance>;
  setCurrentChain: (chain: ChainId) => void;
};

const SEED: Record<ChainId, ChainBalance> = {
  base: { amount: 0.028, status: "ok" },
  eth: { amount: 0.009, status: "ok" },
  bsc: { amount: 0.021, status: "ok" },
  avax: { amount: 0, status: "ok" },
  sol: { amount: 0, status: "ok" },
  hood: { amount: 0, status: "ok" },
  stable: { amount: 0, status: "ok" },
  arc: { amount: 0, status: "ok" },
};

export const useChainContext = create<ChainContextState>()(
  persist(
    (set) => ({
      currentChain: "base",
      balances: SEED,
      setCurrentChain: (currentChain) => set({ currentChain }),
    }),
    {
      name: "sigma.chain-context",
      version: 1,
      // Balances are derived data — only the user's chain choice is persisted.
      partialize: (state) => ({ currentChain: state.currentChain }),
    },
  ),
);

export function usdValue(chain: ChainId, amount: number): number {
  return amount * CHAINS[chain].priceUsd;
}

/** Total across every chain, plus the ones that could not be read. */
export function useBalanceSummary() {
  const balances = useChainContext((s) => s.balances);
  let total = 0;
  const unavailable: ChainId[] = [];
  for (const id of CHAIN_ORDER) {
    const entry = balances[id];
    if (!entry || entry.status !== "ok") {
      unavailable.push(id);
      continue;
    }
    total += usdValue(id, entry.amount);
  }
  return { total, unavailable, balances };
}
