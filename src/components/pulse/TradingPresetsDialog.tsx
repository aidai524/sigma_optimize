import { useState } from "react";
import { RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { usePresets, type Preset } from "@/components/pulse/presets";
import { nativeSymbol } from "@/components/pulse/QuickBuyButton";
import { useWallets } from "@/stores/wallets";

/**
 * Sigma's `Trading Presets` dialog — what the ⚙ next to the P1/P2/P3 row opens.
 *
 * Layout follows the live dialog: a Buy / Sell switch, `Button Presets` (the four amount
 * buttons are shared, which is why they sit above the preset tabs), then the P1/P2/P3 tabs,
 * then the per-preset fields, `Alpha Mode`, and `Reset P1`.
 *
 * The values are the ones measured on the live dialog during the walkthrough. Sigma's factory
 * slippage of 100% is deliberately *not* copied; 5% is what the walkthrough set and what the
 * high-slippage warning is calibrated against.
 */
type FieldProps = {
  label: string;
  value: number;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (next: number) => void;
};

function Field({ label, value, suffix, min = 0, max, step = 1, onChange }: FieldProps) {
  return (
    <label className="flex cursor-text flex-col items-center rounded-lg border border-border bg-secondary/40 px-3 pt-3 pb-2">
      <span className="flex w-full items-center justify-center gap-1">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          inputMode="decimal"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(Number(e.target.value) || 0)}
          className="w-full bg-transparent text-center text-lg font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
        {suffix && <span className="text-sm text-foreground/70">{suffix}</span>}
      </span>
      <span className="mt-0.5 text-center text-[11px] tracking-wide text-foreground/65 uppercase">
        {label}
      </span>
    </label>
  );
}

function PresetRow({
  onSelect,
  compact,
}: {
  onSelect: (id: Preset["id"]) => void;
  compact?: boolean;
}) {
  const { presets, activeId } = usePresets();
  return (
    <div className={cn("grid grid-cols-3 gap-2", compact && "gap-1.5")}>
      {presets.map((p) => (
        <button
          key={p.id}
          onClick={() => onSelect(p.id)}
          className={cn(
            "cursor-pointer rounded-lg border-[0.5px] py-2 text-sm font-medium transition-colors",
            activeId === p.id
              ? "border-brand/60 bg-brand/10 text-brand"
              : "border-transparent bg-secondary/40 text-foreground/70 hover:text-foreground",
          )}
        >
          {p.id}
        </button>
      ))}
    </div>
  );
}

export function TradingPresetsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const {
    presets,
    amountButtons,
    activeId,
    active,
    mev,
    showAmount,
    setShowAmount,
    setActiveId,
    updatePreset,
    setAmountButtons,
    resetPreset,
  } = usePresets();
  const { activeId: walletId } = useWallets();
  const [side, setSide] = useState<"buy" | "sell">("buy");

  const native = nativeSymbol("solana");
  const set = (patch: Partial<Preset>) => updatePreset(activeId, patch);

  return (
    <Dialog open={open} onOpenChange={(next: boolean) => !next && onClose()}>
      <DialogContent className="sm:max-w-[580px]">
        <div className="flex items-center justify-between pr-8">
          <DialogTitle className="text-base font-semibold">Trading Presets</DialogTitle>
          <span className="flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-1 text-xs font-medium">
            <span className="size-3.5 rounded-full bg-[#0052ff]" />
            {walletId}
          </span>
        </div>

        {/* Buy / Sell switch */}
        <div className="grid grid-cols-2 gap-2">
          {(["buy", "sell"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSide(s)}
              className={cn(
                "cursor-pointer rounded-lg py-2.5 text-sm font-semibold transition-colors",
                side === s ? "bg-secondary text-foreground" : "text-foreground/70 hover:text-foreground",
              )}
            >
              {s === "buy" ? "Buy Settings" : "Sell Settings"}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {side === "buy" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-foreground/70">Button Presets</span>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs text-foreground/70">
                  S Amount
                  <Switch
                    aria-label="Show amount on the quick buy buttons"
                    checked={showAmount}
                    onCheckedChange={(next) => setShowAmount(next === true)}
                    className="scale-75"
                  />
                </label>
              </div>
              <div className="text-xs text-foreground/70">Buy amount buttons ({native})</div>
              <div className="grid grid-cols-4 gap-2">
                {amountButtons.map((a, i) => (
                  <input
                    key={i}
                    type="number"
                    min={0}
                    step={0.001}
                    inputMode="decimal"
                    aria-label={`Buy amount button ${i + 1}`}
                    value={a}
                    onChange={(e) => {
                      const next = [...amountButtons];
                      next[i] = Number(e.target.value) || 0;
                      setAmountButtons(next);
                    }}
                    className="h-9 rounded-lg border border-border bg-transparent text-center text-sm tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                ))}
              </div>
            </div>
          )}

          <PresetRow onSelect={setActiveId} />

          <div className="grid grid-cols-3 gap-2">
            {side === "buy" ? (
              <>
                <Field
                  label="Slippage"
                  suffix="%"
                  value={active.slippage}
                  max={100}
                  onChange={(v) => set({ slippage: v })}
                />
                <Field
                  label="Max price impact"
                  suffix="%"
                  value={active.maxPriceImpact}
                  max={100}
                  onChange={(v) => set({ maxPriceImpact: v })}
                />
                <Field
                  label="Buy gas"
                  suffix={native}
                  step={0.001}
                  value={active.gas}
                  onChange={(v) => set({ gas: v })}
                />
                <Field
                  label="Minimum liquidity"
                  value={active.minLiquidity}
                  step={100}
                  onChange={(v) => set({ minLiquidity: v })}
                />
              </>
            ) : (
              <>
                <Field
                  label="Slippage"
                  suffix="%"
                  value={active.sellSlippage}
                  max={100}
                  onChange={(v) => set({ sellSlippage: v })}
                />
                <Field
                  label="Sell gas"
                  suffix={native}
                  step={0.001}
                  value={active.sellGas}
                  onChange={(v) => set({ sellGas: v })}
                />
              </>
            )}
          </div>

          {side === "buy" && (
            <div className="flex items-start justify-between gap-4 rounded-lg border border-border px-3 py-2.5">
              <div className="min-w-0">
                <div className="text-sm font-medium">Alpha Mode</div>
                <div className="text-xs text-foreground/60">
                  Disables all security checks. High risk if enabled.
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {[
                  { label: "Enabled", on: true },
                  { label: "Disabled", on: false },
                ].map((opt) => (
                  <button
                    key={opt.label}
                    onClick={() => set({ alphaMode: opt.on })}
                    className={cn(
                      "cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                      active.alphaMode === opt.on
                        ? opt.on
                          ? "bg-sell text-sell-foreground"
                          : "bg-secondary text-foreground"
                        : "text-foreground/70 hover:text-foreground",
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-border pt-3">
            <button
              onClick={() => resetPreset(activeId)}
              className="flex cursor-pointer items-center gap-2 text-sm text-foreground/70 transition-colors hover:text-foreground"
            >
              <RotateCcw className="size-3.5" />
              Reset {activeId}
            </button>
            <span className="text-[11px] text-foreground/60 tabular-nums">
              {presets.length} presets · MEV {mev ? "on" : "off"}
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
