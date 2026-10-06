import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

/**
 * Sigma's trading wallets, as captured from the live toolbar's `Select Wallet` panel:
 * `W1 / 0x0cAb…51CA` and `W2 / 0x81C2…722b`. The amounts are the demo's own numbers —
 * nothing here reaches a chain, because we do not have Sigma's wallet service.
 */
export type Wallet = {
  id: string;
  address: string;
  /** Native-token balance, shown next to the chain dot. */
  amount: number;
};

export const DEFAULT_WALLETS: Wallet[] = [
  { id: "W1", address: "0x0cAb3f5d1e2b9c47a8f06e5d2c19b7f4a3d851CA", amount: 0.0198 },
  { id: "W2", address: "0x81C2b4e07a1d6f390c8b5e2a4d7f19c60b3e722b", amount: 0 },
];

type WalletsCtx = {
  wallets: Wallet[];
  activeId: string;
  active: Wallet;
  setActiveId: (id: string) => void;
  rename: (id: string, next: string) => void;
  /** Not wired: creating a wallet is Sigma's wallet service, which we do not hold. */
  canAddWallet: false;
};

const Ctx = createContext<WalletsCtx | null>(null);
const LS_KEY = "trial.wallets.v1";
const LS_ACTIVE = "trial.wallet.active.v1";

export function WalletsProvider({ children }: { children: ReactNode }) {
  const [wallets, setWallets] = useState<Wallet[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Wallet[];
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_WALLETS;
  });
  const [activeId, setActiveId] = useState<string>(() => localStorage.getItem(LS_ACTIVE) ?? "W1");

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(wallets));
  }, [wallets]);
  useEffect(() => {
    localStorage.setItem(LS_ACTIVE, activeId);
  }, [activeId]);

  const rename = useCallback((id: string, next: string) => {
    const label = next.trim();
    if (!label) return;
    setWallets((ws) => ws.map((w) => (w.id === id ? { ...w, id: label } : w)));
  }, []);

  const value = useMemo<WalletsCtx>(() => {
    const active = wallets.find((w) => w.id === activeId) ?? wallets[0];
    return { wallets, activeId, active, setActiveId, rename, canAddWallet: false };
  }, [wallets, activeId, rename]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallets(): WalletsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useWallets must be used inside WalletsProvider");
  return ctx;
}

/** `0x0cAb…51CA` — Sigma truncates the middle, not the end. */
export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
