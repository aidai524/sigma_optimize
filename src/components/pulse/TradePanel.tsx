import { useState } from "react";
import { ChevronDown, Pencil, Wallet, X, Zap } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { TrendingPool } from "@/lib/types";
import { compactUsd, mcapOf, price } from "@/lib/format";
import { nativeSymbol } from "@/components/pulse/QuickBuyButton";
import { usePresets } from "@/components/pulse/presets";
import { PresetTabs, SlippageControls } from "@/components/pulse/SlippageControls";
import { TradingPresetsDialog } from "@/components/pulse/TradingPresetsDialog";
import { useWallets } from "@/stores/wallets";

type Props = {
  pool: TrendingPool | null;
  open: boolean;
  onClose: () => void;
};

const ORDER_TYPES = ["Market", "Limit", "DCA"] as const;

/**
 * Amount and slippage come from the active preset, not from panel-local state.
 *
 * They used to be two `useState`s here, disconnected from the store the toolbar reads — so the
 * toolbar could say `P2 · slip 15%` while this panel still showed 10%, and the P1/P2/P3 row
 * below only changed its own highlight. The bottom block is now the same component the toolbar
 * popup renders, and the ⚙ opens the full `Trading Presets` dialog.
 */
export function TradePanel({ pool, open, onClose }: Props) {
  const { amountButtons, active, activeId, updatePreset, mev } = usePresets();
  const { active: wallet } = useWallets();
  const [side, setSide] = useState<"Buy" | "Sell">("Buy");
  const [orderType, setOrderType] = useState<(typeof ORDER_TYPES)[number]>("Market");
  const [advanced, setAdvanced] = useState(false);

  if (!open) return null;

  const native = pool ? nativeSymbol(pool.network) : "SOL";
  const buy = side === "Buy";
  const slippage = buy ? active.slippage : active.sellSlippage;
  const amount = active.amount;
  const setAmount = (v: number) => updatePreset(activeId, { amount: v });

  return (
    <div className="fixed right-4 bottom-12 z-40 w-[360px] overflow-hidden rounded-xl border border-border bg-popover shadow-2xl">
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
                  "h-10 cursor-pointer rounded-lg text-sm font-semibold transition-colors",
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
                  "-mb-px cursor-pointer border-b-2 px-0.5 pb-1.5 text-sm transition-colors",
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
              <span className="font-medium">{wallet.id}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
              <span className="h-4 w-px bg-border" />
              <span className="size-3.5 rounded-full bg-[#facc15]" />
              <span className="tabular-nums text-muted-foreground">{wallet.amount}</span>
            </div>
            <button
              onClick={() => setAmount(wallet.amount)}
              className="h-8 cursor-pointer rounded-lg border-[0.5px] border-brand/60 bg-brand/10 px-3 text-sm font-medium text-brand hover:bg-brand/20"
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
                aria-label="Amount"
                onChange={(e) => setAmount(Number(e.target.value) || 0)}
                className="w-20 bg-transparent text-right text-sm tabular-nums outline-none"
                inputMode="decimal"
              />
              <span className="size-3.5 rounded-full bg-[#facc15]" title={native} />
            </div>
          </div>

          {/* amount buttons — the shared `Button Presets` set from the advanced dialog */}
          <div className="grid grid-cols-4 gap-1.5">
            {amountButtons.map((a, i) => (
              <button
                key={`${a}-${i}`}
                onClick={() => setAmount(a)}
                className={cn(
                  "cursor-pointer rounded-lg border-[0.5px] py-1.5 text-xs font-medium tabular-nums transition-colors",
                  amount === a
                    ? "border-brand/60 bg-brand/10 text-brand"
                    : "border-border bg-secondary text-foreground hover:border-brand/40",
                )}
              >
                {a}
              </button>
            ))}
            <button
              onClick={() => setAdvanced(true)}
              aria-label="Edit trade settings"
              className="grid cursor-pointer place-items-center rounded-lg border-[0.5px] border-border bg-secondary text-muted-foreground transition-colors hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>

          {/* action */}
          <button
            className={cn(
              "flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-opacity hover:opacity-90",
              buy ? "bg-buy-foreground text-[#060813]" : "bg-sell-foreground text-white",
            )}
            onClick={() =>
              toast.success(`${side} ${amount} ${native} of ${pool.symbol}`, {
                description: `Preset ${activeId} · slippage ${slippage}% · gas ${active.gas} · MEV ${mev ? "on" : "off"}`,
              })
            }
          >
            {side}
          </button>

          <SlippageControls side={buy ? "buy" : "sell"} />

          <div className="border-t border-border pt-3">
            <PresetTabs onOpenAdvanced={() => setAdvanced(true)} />
          </div>
        </div>
      ) : (
        <div className="p-6 text-center text-xs text-muted-foreground">Pick a token to trade.</div>
      )}

      <TradingPresetsDialog open={advanced} onClose={() => setAdvanced(false)} />
    </div>
  );
}
