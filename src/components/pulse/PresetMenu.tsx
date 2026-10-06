import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePresets } from "@/components/pulse/presets";
import { PresetTabs, SlippageControls } from "@/components/pulse/SlippageControls";
import { TradingPresetsDialog } from "@/components/pulse/TradingPresetsDialog";

/**
 * The toolbar's `P1 ⌄` control.
 *
 * It opens the same block the trade panel shows at its bottom — slippage and gas readout, the
 * MEV switch, the slippage shortcuts, the high-slippage warning and the P1/P2/P3 tabs — rather
 * than a plain list of preset names, because "which preset am I on" and "what is in this
 * preset" are one question. The advanced fields stay one level down, behind the ⚙.
 */
export function PresetMenu() {
  const { activeId } = usePresets();
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

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

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Trade presets"
        className="flex cursor-pointer items-center gap-1 text-sm font-medium text-foreground outline-none"
      >
        {activeId}
        <ChevronDown
          className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")}
        />
      </button>

      {open && (
        <div className="absolute top-9 right-0 z-50 w-[300px] rounded-lg border border-border bg-popover p-3 shadow-2xl">
          <SlippageControls side="buy" />
          <div className="mt-3 border-t border-border pt-3">
            <PresetTabs
              onOpenAdvanced={() => {
                setOpen(false);
                setAdvanced(true);
              }}
            />
          </div>
        </div>
      )}

      <TradingPresetsDialog open={advanced} onClose={() => setAdvanced(false)} />
    </div>
  );
}
