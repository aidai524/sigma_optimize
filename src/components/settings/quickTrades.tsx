import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CHAIN_ORDER, type ChainKey } from "@/components/settings/chainMarks";

export type QuickTradeSetting = {
  /** Buy amount buttons are a *list* on Sigma — one entry per preset button. */
  buyAmounts: number[];
  /** null means "Not Set". */
  sellAmount: number | null;
  /** When on, the sell button always closes the whole position. */
  sellAll: boolean;
};

export type QuickTradesState = Record<ChainKey, QuickTradeSetting>;

const blank = (): QuickTradeSetting => ({ buyAmounts: [], sellAmount: null, sellAll: false });

/**
 * Seeded with the state measured on the live Sigma account during the walkthrough
 * (2026-10-04): only ETH and BASE have a buy amount, and Sell Amount is unset on
 * every chain except BASE. Reproducing that seed is the point of the page — it
 * shows what a real account looks like out of the box.
 */
export const DEFAULT_QUICK_TRADES: QuickTradesState = CHAIN_ORDER.reduce((acc, chain) => {
  acc[chain] = blank();
  return acc;
}, {} as QuickTradesState);

DEFAULT_QUICK_TRADES.eth = { buyAmounts: [0.002], sellAmount: null, sellAll: false };
DEFAULT_QUICK_TRADES.base = { buyAmounts: [0.002], sellAmount: null, sellAll: true };

type Ctx = {
  state: QuickTradesState;
  settingFor: (chain: ChainKey) => QuickTradeSetting;
  save: (chain: ChainKey, next: QuickTradeSetting) => void;
  reset: () => void;
};

const QuickTradesCtx = createContext<Ctx | null>(null);
const LS_KEY = "trial.quickTrades.v1";

function read(): QuickTradesState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<QuickTradesState>;
      return CHAIN_ORDER.reduce((acc, chain) => {
        const s = parsed[chain];
        acc[chain] = s
          ? {
              buyAmounts: Array.isArray(s.buyAmounts) ? s.buyAmounts : [],
              sellAmount: typeof s.sellAmount === "number" ? s.sellAmount : null,
              sellAll: Boolean(s.sellAll),
            }
          : blank();
        return acc;
      }, {} as QuickTradesState);
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_QUICK_TRADES;
}

export function QuickTradesProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<QuickTradesState>(read);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);

  const save = useCallback((chain: ChainKey, next: QuickTradeSetting) => {
    setState((prev) => ({ ...prev, [chain]: next }));
  }, []);

  const reset = useCallback(() => setState(DEFAULT_QUICK_TRADES), []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      settingFor: (chain) => state[chain],
      save,
      reset,
    }),
    [state, save, reset],
  );

  return <QuickTradesCtx.Provider value={value}>{children}</QuickTradesCtx.Provider>;
}

export function useQuickTrades(): Ctx {
  const ctx = useContext(QuickTradesCtx);
  if (!ctx) throw new Error("useQuickTrades must be used inside QuickTradesProvider");
  return ctx;
}
