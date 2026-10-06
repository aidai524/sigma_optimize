import { AlertTriangle, Fuel, SlidersHorizontal } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { usePresets, type Preset } from "@/components/pulse/presets";

/**
 * The block Sigma keeps at the bottom of its Instant Trade window: the live slippage and gas
 * readout, the MEV switch, the slippage shortcuts and the warning that fires once slippage is
 * high enough to matter.
 *
 * Both the toolbar's preset popup and the trade panel render *this* component, so the two
 * surfaces cannot drift apart visually or in value.
 */
const SLIPPAGE_PRESETS = [0.5, 1, 5, 10, 25];

export function SlippageControls({ side = "buy" }: { side?: "buy" | "sell" }) {
  const { active, activeId, updatePreset, mev, setMev } = usePresets();
  const buy = side === "buy";
  const slippage = buy ? active.slippage : active.sellSlippage;
  const gas = buy ? active.gas : active.sellGas;
  const setSlippage = (v: number) =>
    updatePreset(activeId, buy ? { slippage: v } : { sellSlippage: v });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <SlidersHorizontal className="size-3" />
          <span className="tabular-nums">{slippage}%</span>
        </span>
        <span className="flex items-center gap-1">
          <Fuel className="size-3" />
          <span className="tabular-nums">{gas}</span>
        </span>
        <label className="ml-auto flex select-none items-center gap-1.5">
          MEV
          <Switch
            aria-label="MEV protection"
            checked={mev}
            onCheckedChange={(checked) => setMev(checked === true)}
            className="scale-75"
          />
        </label>
      </div>

      <div className="flex gap-1.5">
        {SLIPPAGE_PRESETS.map((s) => (
          <button
            key={s}
            onClick={() => setSlippage(s)}
            className={cn(
              "flex-1 cursor-pointer rounded-md border-[0.5px] py-1 text-xs font-medium tabular-nums transition-colors",
              slippage === s
                ? "border-brand/60 bg-brand/10 text-brand"
                : "border-border bg-secondary text-muted-foreground hover:text-foreground",
            )}
          >
            {s}%
          </button>
        ))}
      </div>

      {slippage >= 10 && (
        <div className="flex items-start gap-1.5 rounded-md border border-sell-foreground/40 bg-sell px-2 py-1.5 text-[11px] text-sell-foreground">
          <AlertTriangle className="mt-px size-3.5 shrink-0" />
          High slippage — you may get a much worse price on volatile tokens.
        </div>
      )}
    </div>
  );
}

/**
 * `P1 P2 P3` plus the button that opens the full `Trading Presets` dialog — Sigma's layout,
 * where the shortcut switching lives on the panel and the advanced fields live one level down.
 */
export function PresetTabs({ onOpenAdvanced }: { onOpenAdvanced: () => void }) {
  const { presets, active, activeId, setActiveId } = usePresets();
  return (
    <div className="grid grid-cols-4 items-center gap-1.5">
      {presets.map((p: Preset) => (
        <button
          key={p.id}
          onClick={() => setActiveId(p.id)}
          title={`Use ${p.id}`}
          className={cn(
            "cursor-pointer rounded-lg border-[0.5px] py-1.5 text-xs font-medium transition-colors",
            activeId === p.id
              ? "border-brand/60 bg-brand/10 text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {p.id}
        </button>
      ))}
      <button
        onClick={onOpenAdvanced}
        title={`Edit ${activeId} trade settings`}
        className="grid cursor-pointer place-items-center py-1.5 text-muted-foreground transition-colors hover:text-foreground"
      >
        <SlidersHorizontal className="size-3.5" />
      </button>
      <span className="sr-only">
        {active.amount} · {active.slippage}%
      </span>
    </div>
  );
}
