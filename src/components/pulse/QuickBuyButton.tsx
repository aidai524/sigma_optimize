import { useState } from "react";
import { Fuel, Percent, Pencil, Repeat, SlidersHorizontal, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePresets } from "@/components/pulse/presets";
import type { TrendingPool } from "@/lib/types";
import { compactUsd, mcapOf, price } from "@/lib/format";
import { cn } from "@/lib/utils";

export function QuickBuyButton({ pool }: { pool: TrendingPool }) {
  const { active, presets, activeId, setActiveId } = usePresets();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  function confirm() {
    setPending(true);
    window.setTimeout(() => {
      setPending(false);
      setOpen(false);
      toast.success(`Bought ${active.amount} ${nativeSymbol(pool.network)} of ${pool.symbol}`, {
        description: `Preset ${active.id} · slippage ${active.slippage}% · gas ${active.gas}`,
      });
    }, 500);
  }

  return (
    <>
      {/* Sigma row action: 40px square zap button. */}
      <button
        onClick={() => setOpen(true)}
        title={`Quick buy ${active.amount} ${nativeSymbol(pool.network)} using ${activeId}`}
        className={cn(
          "grid size-10 place-items-center rounded-xl border-[0.5px] border-brand/50 bg-brand/10",
          "text-brand transition-colors hover:bg-brand/20",
          "shadow-[0_0_8px_rgba(97,115,255,0.3),inset_0_0_7px_rgba(97,115,255,0.35)]",
        )}
      >
        <Zap className="size-4 fill-current" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-0 rounded-xl border-border bg-popover p-0 sm:max-w-sm">
          <DialogHeader className="border-b border-border px-4 py-3">
            <DialogTitle className="flex items-center gap-2 text-sm font-medium">
              <Zap className="size-4 fill-brand text-brand" />
              Quick Buy
              <span className="text-muted-foreground">{pool.symbol}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {pool.pairLabel} · {price(pool.priceUsd)} · MC {compactUsd(mcapOf(pool))}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 p-4">
            {/* preset tabs */}
            <div className="flex items-center gap-1">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={cn(
                    "rounded-md px-2 py-0.5 text-xs font-medium transition-colors",
                    p.id === activeId ? "bg-brand/15 text-brand" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.id}
                </button>
              ))}
              <SlidersHorizontal className="ml-auto size-3.5 text-muted-foreground" />
              <Percent className="size-3.5 text-muted-foreground" />
            </div>

            {/* amount buttons */}
            <div className="grid grid-cols-4 gap-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setActiveId(p.id)}
                  className={cn(
                    "rounded-lg border-[0.5px] py-1.5 text-sm font-medium transition-colors",
                    p.id === activeId
                      ? "border-brand/60 bg-brand/10 text-brand"
                      : "border-border bg-secondary text-foreground hover:border-brand/40",
                  )}
                >
                  {p.amount}
                </button>
              ))}
              <button className="grid place-items-center rounded-lg border-[0.5px] border-border bg-secondary text-muted-foreground hover:text-foreground">
                <Pencil className="size-3.5" />
              </button>
            </div>

            {/* fee chips */}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <SlidersHorizontal className="size-3" />
                {active.slippage}%
              </span>
              <span className="flex items-center gap-1">
                <Repeat className="size-3" />
                25%
              </span>
              <span className="flex items-center gap-1">
                <Zap className="size-3" />
                1,000
              </span>
              <span className="flex items-center gap-1">
                <Fuel className="size-3" />
                {active.gas}
              </span>
            </div>

            <Button
              onClick={confirm}
              disabled={pending}
              className="h-10 w-full rounded-lg bg-buy-foreground text-sm font-semibold text-[#060813] hover:bg-buy-foreground/90"
            >
              {pending ? "Submitting…" : `Buy ${active.amount} ${nativeSymbol(pool.network)}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
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
