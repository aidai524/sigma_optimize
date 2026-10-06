import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";

/**
 * The shape mirrors Sigma's `Trading Presets` dialog, which is the reference for the
 * advanced settings panel:
 *
 *   Button Presets
 *   Buy amount buttons (Ξ)   [ 0.002 ][ 0.2 ][ 0.5 ][ 1 ]
 *   [ P1 ][ P2 ][ P3 ]
 *   [ SLIPPAGE ][ MAX PRICE IMPACT ][ BUY GAS ]
 *   [ MINIMUM LIQUIDITY ]
 *   Alpha Mode            Enabled / Disabled
 *   ⟲ Reset P1
 *
 * The amount buttons sit *above* the P1/P2/P3 tabs in Sigma, so they are shared; everything
 * below the tabs is per preset. `mev` is global and lives here too — the toolbar popup and
 * the trade panel both render that switch, and two copies of it is exactly the drift we
 * removed from `slippage`.
 */
export type Preset = {
  id: "P1" | "P2" | "P3";
  /** The row quick-buy amount, in the chain's native token. */
  amount: number;
  /** Buy slippage, percent. */
  slippage: number;
  /** Buy gas, native token. */
  gas: number;
  /** MAX PRICE IMPACT, percent. */
  maxPriceImpact: number;
  /** MINIMUM LIQUIDITY, USD. */
  minLiquidity: number;
  /** Skips every safety check. Off by default, and it says why. */
  alphaMode: boolean;
  sellSlippage: number;
  sellGas: number;
};

/**
 * `Button Presets → Buy amount buttons`. Sigma's factory set is 0.1 / 0.2 / 0.5 / 1, and the
 * live dialog was captured at 0.002 / 0.2 / 0.5 / 1 after the walkthrough edited button one.
 */
export const DEFAULT_AMOUNT_BUTTONS = [0.002, 0.2, 0.5, 1];

/**
 * Slippage is 5% on the buy side because that is what Sigma actually runs; its factory value
 * is 100%, which is why the high-slippage warning exists at all. The gas and liquidity
 * defaults are the ones measured on the live dialog.
 */
export const DEFAULT_PRESETS: Preset[] = [
  { id: "P1", amount: 0.002, slippage: 5, gas: 0.001, maxPriceImpact: 25, minLiquidity: 1000, alphaMode: false, sellSlippage: 5, sellGas: 0.001 },
  { id: "P2", amount: 0.2, slippage: 15, gas: 0.002, maxPriceImpact: 25, minLiquidity: 1000, alphaMode: false, sellSlippage: 15, sellGas: 0.001 },
  { id: "P3", amount: 0.5, slippage: 25, gas: 0.005, maxPriceImpact: 40, minLiquidity: 1000, alphaMode: false, sellSlippage: 25, sellGas: 0.001 },
];

type PresetsCtx = {
  presets: Preset[];
  amountButtons: number[];
  activeId: Preset["id"];
  active: Preset;
  mev: boolean;
  setMev: (next: boolean) => void;
  /** `Button Presets → S Amount`: whether the quick-buy buttons print their amount. */
  showAmount: boolean;
  setShowAmount: (next: boolean) => void;
  setActiveId: (id: Preset["id"]) => void;
  updatePreset: (id: Preset["id"], patch: Partial<Preset>) => void;
  setAmountButtons: (next: number[]) => void;
  resetPreset: (id: Preset["id"]) => void;
};

const Ctx = createContext<PresetsCtx | null>(null);
/** v2: the preset record grew the fields Sigma's dialog edits, so v1 data is dropped. */
const LS_KEY = "trial.presets.v2";
const LS_ACTIVE = "trial.preset.active.v1";
const LS_MEV = "trial.preset.mev.v1";
const LS_BUTTONS = "trial.preset.buttons.v1";
const LS_SHOW_AMOUNT = "trial.preset.showamount.v1";

export function PresetsProvider({ children }: { children: ReactNode }) {
  const [presets, setPresets] = useState<Preset[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Preset[];
        if (Array.isArray(parsed) && parsed.length === 3) return parsed;
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_PRESETS;
  });
  const [amountButtons, setAmountButtons] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem(LS_BUTTONS);
      if (raw) {
        const parsed = JSON.parse(raw) as number[];
        if (Array.isArray(parsed) && parsed.length === 4) return parsed;
      }
    } catch {
      /* ignore */
    }
    return DEFAULT_AMOUNT_BUTTONS;
  });
  const [activeId, setActiveId] = useState<Preset["id"]>(() => {
    const raw = localStorage.getItem(LS_ACTIVE);
    return raw === "P2" || raw === "P3" ? raw : "P1";
  });
  const [mev, setMev] = useState(() => localStorage.getItem(LS_MEV) !== "off");
  const [showAmount, setShowAmount] = useState(() => localStorage.getItem(LS_SHOW_AMOUNT) !== "off");

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(presets));
  }, [presets]);
  useEffect(() => {
    localStorage.setItem(LS_BUTTONS, JSON.stringify(amountButtons));
  }, [amountButtons]);
  useEffect(() => {
    localStorage.setItem(LS_ACTIVE, activeId);
  }, [activeId]);
  useEffect(() => {
    localStorage.setItem(LS_MEV, mev ? "on" : "off");
  }, [mev]);
  useEffect(() => {
    localStorage.setItem(LS_SHOW_AMOUNT, showAmount ? "on" : "off");
  }, [showAmount]);

  const updatePreset = useCallback((id: Preset["id"], patch: Partial<Preset>) => {
    setPresets((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);

  const resetPreset = useCallback((id: Preset["id"]) => {
    const factory = DEFAULT_PRESETS.find((p) => p.id === id);
    if (factory) setPresets((ps) => ps.map((p) => (p.id === id ? { ...factory } : p)));
  }, []);

  const value = useMemo<PresetsCtx>(() => {
    const active = presets.find((p) => p.id === activeId) ?? presets[0];
    return {
      presets,
      amountButtons,
      activeId,
      active,
      mev,
      setMev,
      showAmount,
      setShowAmount,
      setActiveId,
      updatePreset,
      setAmountButtons,
      resetPreset,
    };
  }, [presets, amountButtons, activeId, mev, showAmount, updatePreset, resetPreset]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePresets(): PresetsCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePresets must be used inside PresetsProvider");
  return ctx;
}
