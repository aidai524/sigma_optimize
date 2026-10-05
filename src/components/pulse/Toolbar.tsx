import { ChevronDown, List, ListFilter, SlidersHorizontal, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePresets } from "@/components/pulse/presets";
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

export function Toolbar({
  network,
  setNetwork,
  window: w,
  setWindow,
  density,
  setDensity,
  onOpenTrade,
}: Props) {
  const { presets, activeId, setActiveId } = usePresets();

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
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-foreground outline-none">
            {activeId}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-border bg-popover">
            {presets.map((p) => (
              <DropdownMenuItem
                key={p.id}
                onClick={() => setActiveId(p.id)}
                className={cn("text-sm", p.id === activeId && "text-brand")}
              >
                {p.id} · {p.amount} · slip {p.slippage}%
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
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
