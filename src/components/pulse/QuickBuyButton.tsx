import { Zap } from "lucide-react";
import { toast } from "sonner";
import { usePresets } from "@/components/pulse/presets";
import type { TrendingPool } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * The row's Quick Buy action.
 *
 * Sigma buys on the first click with no confirmation — the walkthrough measured its buy step
 * as "1 click, no confirm" — and the button prints the amount it will spend (`0.004 Ξ`). Ours
 * opened a confirmation dialog instead, which both cost a click and hid the amount behind it.
 *
 * With no amount configured there is nothing to spend, so the click is spent on getting that
 * set up: it asks the toolbar popover to open with its amount field focused, which is the only
 * place the amount can be set.
 */
export function QuickBuyButton({ pool }: { pool: TrendingPool }) {
  const { active, requestAmountEditor } = usePresets();
  const native = nativeSymbol(pool.network);
  const configured = active.amount > 0;

  function buy() {
    if (!configured) {
      requestAmountEditor();
      return;
    }
    toast.success(`Bought ${active.amount} ${native} of ${pool.symbol}`, {
      description: `Preset ${active.id} · slippage ${active.slippage}% · gas ${active.gas}`,
    });
  }

  return (
    <button
      onClick={buy}
      title={
        configured
          ? `Quick buy ${active.amount} ${native} using ${active.id}`
          : "Set the Quick Buy amount first"
      }
      className={cn(
        "flex h-10 items-center gap-1.5 rounded-xl border-[0.5px] border-brand/50 bg-brand/10 px-3",
        "text-brand transition-colors hover:bg-brand/20",
        "shadow-[0_0_8px_rgba(97,115,255,0.3),inset_0_0_7px_rgba(97,115,255,0.35)]",
      )}
    >
      <Zap className="size-4 fill-current" />
      {configured ? (
        <span className="text-sm font-medium tabular-nums text-foreground">
          {active.amount} <span className="text-brand">{native}</span>
        </span>
      ) : (
        <span className="text-sm font-medium text-foreground">Quick Buy</span>
      )}
    </button>
  );
}

export function nativeSymbol(network: string): string {
  switch (network) {
    case "solana":
      return "SOL";
    case "eth":
      return "ETH";
    case "bsc":
      return "BNB";
    case "base":
      return "ETH";
    default:
      return "ETH";
  }
}
