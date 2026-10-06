import { AlertTriangle, Fuel, Repeat, SlidersHorizontal, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { usePresets } from "@/components/pulse/presets";

/**
 * Sigma's preset readout. Its Quick Buy settings popover prints all four values —
 * `5%  25%  1,000  0.001` — and ours showed only two of them behind an edit affordance,
 * which left a user unable to see what they were about to change. So: show all four, then
 * give slippage a custom field next to the shortcuts.
 *
 * The other three are edited in the `Trading Presets` dialog one level down, which is where
 * Sigma keeps them too.
 */
const SLIPPAGE_PRESETS = [0.5, 1, 5, 10, 25];

function Param({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1 text-[11px] tabular-nums text-muted-foreground" title={label}>
      {icon}
      {value}
    </span>
  );
}

export function SlippageControls() {
  const { active, activeId, updatePreset, mev, setMev } = usePresets();
  const slippage = active.slippage;
  const setSlippage = (v: number) => updatePreset(activeId, { slippage: v });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Param icon={<SlidersHorizontal className="size-3" />} value={`${slippage}%`} label="Slippage" />
        <Param icon={<Repeat className="size-3" />} value={`${active.maxPriceImpact}%`} label="Max price impact" />
        <Param
          icon={<Zap className="size-3" />}
          value={active.minLiquidity.toLocaleString()}
          label="Minimum liquidity"
        />
        <Param icon={<Fuel className="size-3" />} value={String(active.gas)} label="Buy gas" />
      </div>

      <label className="flex cursor-pointer items-center justify-end gap-1.5 text-[11px] text-muted-foreground">
        MEV
        <Switch
          aria-label="MEV protection"
          checked={mev}
          onCheckedChange={(checked) => setMev(checked === true)}
          className="scale-75"
        />
      </label>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Custom slippage</span>
        <div className="ml-auto flex h-7 w-20 items-center rounded-sm border border-input px-1.5 focus-within:ring-1 focus-within:ring-ring">
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            inputMode="decimal"
            aria-label="Custom slippage"
            value={slippage}
            onChange={(e) => setSlippage(Number(e.target.value) || 0)}
            className="w-full bg-transparent text-right text-xs tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <span className="text-xs text-muted-foreground">%</span>
        </div>
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

/** `P1 P2 P3` — the preset switcher itself. */
export function PresetTabs() {
  const { presets, activeId, setActiveId } = usePresets();
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {presets.map((p) => (
        <button
          key={p.id}
          onClick={() => setActiveId(p.id)}
          title={`Use ${p.id}`}
          className={cn(
            "cursor-pointer rounded-lg border-[0.5px] py-2 text-sm font-medium transition-colors",
            activeId === p.id
              ? "border-transparent bg-secondary text-brand"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          {p.id}
        </button>
      ))}
    </div>
  );
}
