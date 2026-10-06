import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type Preset = {
  id: "P1" | "P2" | "P3";
  amount: number; // native token amount (SOL / ETH / BNB)
  slippage: number; // percent
  priority: number; // gwei-ish
};

/**
 * P1's slippage is 5% because that is the value Sigma actually ships (measured on the live
 * terminal during the walkthrough). It also keeps the panel's high-slippage warning honest:
 * at 10% the warning would be on in the factory state, which makes it look broken.
 */
export const DEFAULT_PRESETS: Preset[] = [
  { id: "P1", amount: 0.1, slippage: 5, priority: 0.001 },
  { id: "P2", amount: 0.5, slippage: 15, priority: 0.002 },
  { id: "P3", amount: 1, slippage: 25, priority: 0.005 },
];

type PresetsCtx = {
  presets: Preset[];
  activeId: Preset["id"];
  active: Preset;
  setActiveId: (id: Preset["id"]) => void;
  updatePreset: (id: Preset["id"], patch: Partial<Preset>) => void;
  resetPresets: () => void;
};

const Ctx = createContext<PresetsCtx | null>(null);
const LS_KEY = "trial.presets.v1";
const LS_ACTIVE = "trial.preset.active.v1";

export function PresetsProvider({ children }: { children: ReactNode }) {
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) return JSON.parse(raw) as Preset[];
    } catch {
      /* ignore */
    }
    return DEFAULT_PRESETS;
  });
  const [activeId, setActiveId] = useState<Preset["id"]>(() => {
    const raw = localStorage.getItem(LS_ACTIVE);
    return raw === "P2" || raw === "P3" ? raw : "P1";
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(presets));
  }, [presets]);
  useEffect(() => {
    localStorage.setItem(LS_ACTIVE, activeId);
  }, [activeId]);

  const updatePreset = useCallback((id: Preset["id"], patch: Partial<Preset>) => {
    setPresets((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const resetPresets = useCallback(() => setPresets(DEFAULT_PRESETS), []);

  const value = useMemo<PresetsCtx>(() => {
    const active = presets.find((p) => p.id === activeId) ?? presets[0];
    return { presets, activeId, active, setActiveId, updatePreset, resetPresets };
  }, [presets, activeId, updatePreset, resetPresets]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePresets(): PresetsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePresets must be used inside PresetsProvider");
  return ctx;
}
