import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pencil, SlidersHorizontal, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresets } from "@/components/pulse/presets";
import { PresetTabs, SlippageControls } from "@/components/pulse/SlippageControls";
import { TradingPresetsDialog } from "@/components/pulse/TradingPresetsDialog";
import { nativeSymbol } from "@/components/pulse/QuickBuyButton";
import { NETWORKS, NETWORK_COLORS, type NetworkId } from "@/lib/gt";
import { useWallets } from "@/stores/wallets";

/**
 * The toolbar's `Quick Buy … P1 ⌄` control, following Sigma's `Quick Buy Settings` popover:
 * the chain and its amount at the top, `Trading Preset` with the P1/P2/P3 switch, then the
 * four values the preset resolves to.
 *
 * The amount field is here rather than only in the advanced dialog because this popover is
 * what a row's Quick Buy button points at when no amount has been configured yet — see the
 * `amountEditorRequested` flag in the presets store.
 */
export function PresetMenu({ network }: { network: NetworkId }) {
  const {
    active,
    activeId,
    updatePreset,
    amountEditorRequested,
    clearAmountEditorRequest,
  } = usePresets();
  const { activeId: walletId } = useWallets();
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [focusAmount, setFocusAmount] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  // A row's Quick Buy button could not buy: no amount configured yet, so it asked for this.
  useEffect(() => {
    if (!amountEditorRequested) return;
    clearAmountEditorRequest();
    setOpen(true);
    setFocusAmount(true);
  }, [amountEditorRequested, clearAmountEditorRequest]);

  useEffect(() => {
    if (!open || !focusAmount) return;
    amountRef.current?.focus();
    amountRef.current?.select();
    setFocusAmount(false);
  }, [open, focusAmount]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const color = NETWORK_COLORS[network];
  const label = NETWORKS.find((n) => n.id === network)?.label ?? network;

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Quick Buy settings"
        className="flex cursor-pointer items-center gap-1 text-sm font-medium text-foreground outline-none"
      >
        {activeId}
        <ChevronDown
          className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute top-9 right-0 z-50 w-[340px] rounded-lg border border-border bg-popover p-3 shadow-2xl">
          <div className="flex items-center justify-between pb-2">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Zap className="size-4 fill-brand text-brand" />
              Quick Buy Settings
            </span>
            <span className="flex items-center gap-1.5 rounded-lg bg-secondary px-2 py-1 text-xs font-medium">
              <span className="size-3.5 rounded-full" style={{ backgroundColor: color }} />
              {walletId}
            </span>
          </div>

          {/* amount — what the row's Quick Buy button spends */}
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
            <span className="size-4 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-sm font-medium">{label}</span>
            <input
              ref={amountRef}
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              aria-label="Quick buy amount"
              placeholder="Not set"
              value={active.amount > 0 ? active.amount : ""}
              onChange={(e) => updatePreset(activeId, { amount: Number(e.target.value) || 0 })}
              className="ml-auto w-20 bg-transparent text-right text-sm tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
            <span className="text-sm text-foreground/70">{nativeSymbol(network)}</span>
            <button
              onClick={() => amountRef.current?.focus()}
              title="Edit amount"
              className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm font-medium">Trading Preset</span>
            <button
              onClick={() => {
                setOpen(false);
                setAdvanced(true);
              }}
              title={`Edit ${activeId} trade settings`}
              className="cursor-pointer text-muted-foreground transition-colors hover:text-foreground"
            >
              <SlidersHorizontal className="size-3.5" />
            </button>
          </div>

          <div className="mt-2">
            <PresetTabs />
          </div>

          <div className="mt-3 border-t border-border pt-3">
            <SlippageControls />
          </div>
        </div>
      )}

      <TradingPresetsDialog open={advanced} onClose={() => setAdvanced(false)} />
    </div>
  );
}
