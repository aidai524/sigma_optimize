import { useEffect, useRef, useState } from "react";
import { ChevronDown, List, ListFilter, SlidersHorizontal, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePresets } from "@/components/pulse/presets";
import { nativeSymbol } from "@/components/pulse/QuickBuyButton";
import { NETWORKS, type NetworkId, type WindowKey } from "@/lib/gt";

type Density = "comfortable" | "compact";

type Props = {
  network: NetworkId;
  setNetwork: (n: NetworkId) => void;
  window: WindowKey;
  setWindow: (w: WindowKey) => void;
  density: Density;
  setDensity: (d: Density) => void;
  loading: boolean;
  refreshedAt: number | null;
  onRefresh: () => void;
  onOpenTrade: () => void;
};

const WINDOWS: { key: WindowKey; label: string }[] = [
  { key: "m5", label: "5m" },
  { key: "h1", label: "1h" },
  { key: "h6", label: "6h" },
  { key: "h24", label: "24h" },
];

const CHAIN_COLORS: Record<string, string> = {
  solana: "#9945ff",
  base: "#0052ff",
  eth: "#6274ff",
  bsc: "#f0b90b",
};

// Sigma's control buttons: 32px, radius 8, 6% white surface.
const surfaceBtn =
  "flex h-8 items-center gap-1.5 rounded-lg bg-secondary px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

const iconBtn = "grid size-8 place-items-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:text-foreground";

/**
 * The one surface that both reads *and* writes a preset.
 *
 * Sigma keeps this value in three places that disagree — its collapsed chip reads 5%, the
 * inline editor opened from that chip reads 100, and the presets dialog reads 5% — so a user
 * who opens the editor and saves can silently raise slippage. Ours reads from a single store,
 * so the dropdown, the Instant Trade panel and the Quick Buy button can never drift apart.
 *
 * Editing lives here — on the control a user already presses to pick a preset — rather than
 * only inside the trade panel, because "which preset am I on" and "what is in this preset"
 * are the same question.
 */
function PresetEditor({ native }: { native: string }) {
  const { presets, activeId, setActiveId, updatePreset, resetPresets } = usePresets();
  const [open, setOpen] = useState(false);
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

  const numField =
    "h-7 rounded-sm border border-input bg-transparent px-1.5 text-right text-xs tabular-nums outline-none focus-visible:ring-1 focus-visible:ring-ring [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

  return (
    <div ref={boxRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        title="Preset amount and slippage"
        className="flex cursor-pointer items-center gap-1 text-sm font-medium text-foreground outline-none"
      >
        {activeId}
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute top-9 right-0 z-50 w-[290px] rounded-lg border border-border bg-popover p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between text-[11px] tracking-wide text-muted-foreground uppercase">
            <span>Presets</span>
            <span>Amount · Slippage</span>
          </div>

          <div className="space-y-1.5">
            {presets.map((p) => (
              <div
                key={p.id}
                className={cn(
                  "flex items-center gap-2 rounded-md border-[0.5px] px-2 py-1.5 transition-colors",
                  p.id === activeId ? "border-brand/60 bg-brand/10" : "border-border bg-secondary",
                )}
              >
                <button
                  onClick={() => setActiveId(p.id)}
                  title={`Use ${p.id}`}
                  className={cn(
                    "w-7 shrink-0 cursor-pointer text-left text-xs font-semibold",
                    p.id === activeId ? "text-brand" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p.id}
                </button>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  inputMode="decimal"
                  aria-label={`${p.id} amount`}
                  value={p.amount}
                  onChange={(e) => updatePreset(p.id, { amount: Number(e.target.value) || 0 })}
                  className={cn(numField, "w-20")}
                />
                <span className="text-[11px] text-muted-foreground">{native}</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  inputMode="decimal"
                  aria-label={`${p.id} slippage`}
                  value={p.slippage}
                  onChange={(e) => updatePreset(p.id, { slippage: Number(e.target.value) || 0 })}
                  className={cn(numField, "ml-auto w-16")}
                />
                <span className="text-[11px] text-muted-foreground">%</span>
              </div>
            ))}
          </div>

          <button
            onClick={resetPresets}
            className="mt-2 w-full cursor-pointer rounded-md border border-border py-1.5 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Reset to defaults
          </button>
        </div>
      )}
    </div>
  );
}

export function Toolbar({
  network,
  setNetwork,
  window: w,
  setWindow,
  density,
  setDensity,
  onOpenTrade,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* timeframe */}
      <div className="flex items-center gap-1">
        {WINDOWS.map((item) => (
          <button
            key={item.key}
            onClick={() => setWindow(item.key)}
            className={cn(
              "h-8 rounded-lg px-2 text-sm font-medium transition-colors",
              w === item.key ? "bg-secondary text-brand" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* display density */}
      <button
        onClick={() => setDensity(density === "compact" ? "comfortable" : "compact")}
        title={`Row density: ${density}`}
        className={cn(iconBtn, density === "compact" && "text-brand")}
      >
        <SlidersHorizontal className="size-4" />
      </button>

      <button className={surfaceBtn}>
        <ListFilter className="size-3.5" />
        Filters
        <ChevronDown className="size-3.5" />
      </button>

      <button onClick={onOpenTrade} title="Instant Trade" className={surfaceBtn}>
        <List className="size-3.5" />
        <span className="text-foreground">1</span>
        <ChevronDown className="size-3.5" />
      </button>

      {/* quick buy preset */}
      <div className="flex h-8 items-center gap-2 rounded-lg bg-secondary px-2.5">
        <Zap className="size-3.5 fill-brand text-brand" />
        <span className="text-sm font-medium text-foreground">Quick Buy</span>
        <span className="h-4 w-px bg-border" />
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <span className="size-3.5 rounded-full bg-[#6274ff]" />0
        </span>
        <span className="h-4 w-px bg-border" />
        <PresetEditor native={nativeSymbol(network)} />
      </div>

      {/* chain multi-select */}
      <DropdownMenu>
        <DropdownMenuTrigger className={cn(surfaceBtn, "outline-none")}>
          <span className="flex -space-x-1">
            {NETWORKS.map((n) => (
              <span
                key={n.id}
                className={cn(
                  "size-4 rounded-full border border-canvas",
                  n.id === network ? "opacity-100" : "opacity-45",
                )}
                style={{ backgroundColor: CHAIN_COLORS[n.id] ?? "#6274ff" }}
              />
            ))}
          </span>
          <span className="text-foreground">+{NETWORKS.length}</span>
          <ChevronDown className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="border-border bg-popover">
          {NETWORKS.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => setNetwork(n.id)}
              className={cn("text-sm", n.id === network && "text-brand")}
            >
              <span
                className="mr-1 inline-block size-2.5 rounded-full"
                style={{ backgroundColor: CHAIN_COLORS[n.id] ?? "#6274ff" }}
              />
              {n.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
