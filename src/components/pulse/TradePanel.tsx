import { useState } from "react";
import {
  AlertTriangle,
  ArrowDownUp,
  ChevronDown,
  Fuel,
  Pencil,
  SlidersHorizontal,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { TrendingPool } from "@/lib/types";
import { compactUsd, mcapOf, price } from "@/lib/format";
import { nativeSymbol } from "@/components/pulse/QuickBuyButton";

type Props = {
  pool: TrendingPool | null;
  open: boolean;
  onClose: () => void;
};

const SLIPPAGE_PRESETS = [0.5, 1, 5, 10, 25];
const AMOUNT_PRESETS = [0.1, 0.2, 0.5, 1];
const ORDER_TYPES = ["Market", "Limit", "DCA"] as const;
const PRESET_TABS = ["P1", "P2", "P3"] as const;

export function TradePanel({ pool, open, onClose }: Props) {
  const [side, setSide] = useState<"Buy" | "Sell">("Buy");
  const [slippage, setSlippage] = useState(10);
  const [orderType, setOrderType] = useState<(typeof ORDER_TYPES)[number]>("Market");
  const [presetTab, setPresetTab] = useState<(typeof PRESET_TABS)[number]>("P1");
  const [mev, setMev] = useState(true);
  const [amount, setAmount] = useState(0.5);

  if (!open) return null;

  const native = pool ? nativeSymbol(pool.network) : "SOL";
  const highSlippage = slippage >= 10;
  const buy = side === "Buy";

  return (
    <div className="fixed bottom-12 right-4 z-40 w-[360px] overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
      {/* header */}
      <div className="flex items-center justify-between px-4 pt-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Zap className="size-4 fill-brand text-brand" />
          Instant Trade
          {pool && <span className="text-muted-foreground">{pool.symbol}</span>}
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
          <X className="size-4" />
        </button>
      </div>

      {pool ? (
        <div className="space-y-3 p-4">
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span>{pool.pairLabel}</span>
            <span>
              <span className="text-brand">{price(pool.priceUsd)}</span> · MC {compactUsd(mcapOf(pool))}
            </span>
          </div>

          {/* buy / sell tabs */}
          <div className="grid grid-cols-2 gap-2">
            {(["Buy", "Sell"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSide(s)}
                className={cn(
                  "h-10 rounded-lg text-sm font-semibold transition-colors",
                  side === s
                    ? s === "Buy"
                      ? "bg-buy text-buy-foreground"
                      : "bg-sell text-sell-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s}
              </button>
            ))}
          </div>

          {/* order type */}
          <div className="flex items-center gap-4 border-b border-border">
            {ORDER_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setOrderType(t)}
                className={cn(
                  "-mb-px border-b-2 px-0.5 pb-1.5 text-sm transition-colors",
                  orderType === t
                    ? "border-brand font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* wallet + max */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 flex-1 items-center gap-2 rounded-lg border-[0.5px] border-border px-2.5 text-sm">
              <Wallet className="size-3.5 text-muted-foreground" />
              <span>0</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
              <span className="h-4 w-px bg-border" />
              <span className="size-3.5 rounded-full bg-[#facc15]" />
              <span className="text-muted-foreground">0</span>
            </div>
            <button
              onClick={() => setAmount(AMOUNT_PRESETS[AMOUNT_PRESETS.length - 1])}
              className="h-8 rounded-lg border-[0.5px] border-brand/60 bg-brand/10 px-3 text-sm font-medium text-brand hover:bg-brand/20"
            >
              Max
            </button>
          </div>

          {/* amount */}
          <div className="flex items-center justify-between rounded-lg bg-secondary px-3 py-2">
            <span className="text-sm text-muted-foreground">Amount</span>
            <div className="flex items-center gap-2">
              <input
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-20 bg-transparent text-right text-sm tabular-nums outline-none"
                inputMode="decimal"
              />
              <span className="size-3.5 rounded-full bg-[#facc15]" title={native} />
            </div>
          </div>

          {/* amount presets */}
          <div className="grid grid-cols-6 gap-1.5">
            {AMOUNT_PRESETS.map((a) => (
              <button
                key={a}
                onClick={() => setAmount(a)}
                className={cn(
                  "rounded-lg border-[0.5px] py-1.5 text-xs font-medium transition-colors",
                  amount === a
                    ? "border-brand/60 bg-brand/10 text-brand"
                    : "border-border bg-secondary text-foreground hover:border-brand/40",
                )}
              >
                {a}
              </button>
            ))}
            <button className="grid place-items-center rounded-lg border-[0.5px] border-border bg-secondary text-muted-foreground hover:text-foreground">
              <ArrowDownUp className="size-3.5" />
            </button>
            <button className="grid place-items-center rounded-lg border-[0.5px] border-border bg-secondary text-muted-foreground hover:text-foreground">
              <Pencil className="size-3.5" />
            </button>
          </div>

          {/* action */}
          <button
            className={cn(
              "flex h-11 w-full items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90",
              buy ? "bg-buy-foreground text-[#060813]" : "bg-sell-foreground text-white",
            )}
            onClick={() =>
              toast.success(`${side} ${amount} ${native} of ${pool.symbol}`, {
                description: `Slippage ${slippage}% · MEV ${mev ? "on" : "off"}`,
              })
            }
          >
            {side}
          </button>

          {/* fee chips */}
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <SlidersHorizontal className="size-3" />
              {slippage}%
            </span>
            <span className="flex items-center gap-1">
              <Fuel className="size-3" />
              0.001
            </span>
            <label className="ml-auto flex items-center gap-1.5">
              MEV
              <Switch checked={mev} onCheckedChange={setMev} className="scale-75" />
            </label>
          </div>

          {/* slippage presets */}
          <div className="flex gap-1.5">
            {SLIPPAGE_PRESETS.map((s) => (
              <button
                key={s}
                onClick={() => setSlippage(s)}
                className={cn(
                  "flex-1 rounded-md border-[0.5px] py-1 text-xs font-medium transition-colors",
                  slippage === s
                    ? "border-brand/60 bg-brand/10 text-brand"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {s}%
              </button>
            ))}
          </div>

          {highSlippage && (
            <div className="flex items-center gap-1.5 rounded-md border border-sell-foreground/40 bg-sell px-2 py-1.5 text-[11px] text-sell-foreground">
              <AlertTriangle className="size-3.5 shrink-0" />
              High slippage — you may get a much worse price on volatile tokens.
            </div>
          )}

          {/* preset tabs */}
          <div className="grid grid-cols-4 gap-1.5 border-t border-border pt-3">
            {PRESET_TABS.map((p) => (
              <button
                key={p}
                onClick={() => setPresetTab(p)}
                className={cn(
                  "rounded-lg border-[0.5px] py-1.5 text-xs font-medium transition-colors",
                  presetTab === p
                    ? "border-brand/60 bg-brand/10 text-brand"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
            <button className="grid place-items-center text-muted-foreground hover:text-foreground">
              <SlidersHorizontal className="size-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-muted-foreground">Pick a token to trade.</div>
      )}
    </div>
  );
}
