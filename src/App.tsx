import { useMemo, useState } from "react";
import { Flag, Globe, LayoutList, Rocket, Send, Settings, Smile } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { TopNav } from "@/components/pulse/TopNav";
import { Toolbar } from "@/components/pulse/Toolbar";
import { PulseTable } from "@/components/pulse/PulseTable";
import { TradePanel } from "@/components/pulse/TradePanel";
import { PresetsProvider } from "@/components/pulse/presets";
import { QuickTradesProvider } from "@/components/settings/quickTrades";
import { SettingsPage } from "@/components/settings/SettingsPage";
import { useTrending } from "@/hooks/useTrending";
import type { NetworkId, WindowKey } from "@/lib/gt";
import { cn } from "@/lib/utils";

type Density = "comfortable" | "compact";
type PageId = "Discover" | "Settings";

const SORTS = ["Trending", "Surge", "Recent"] as const;

/**
 * The trending table. This is Sigma's **Discover** page — the captured header marks
 * `Discover` as the active nav item. Pulse is a different page and is not built yet,
 * so nothing here is labelled Pulse.
 */
function DiscoverPage() {
  const [network, setNetwork] = useState<NetworkId>("solana");
  const [windowKey, setWindowKey] = useState<WindowKey>("h1");
  const [density, setDensity] = useState<Density>("comfortable");
  const [sort, setSort] = useState<(typeof SORTS)[number]>("Trending");
  const [tradeOpen, setTradeOpen] = useState(false);

  const { pools, loading, error, refreshedAt, reload } = useTrending(network);

  const sorted = useMemo(() => {
    const list = [...pools];
    if (sort === "Surge") list.sort((a, b) => b.change[windowKey] - a.change[windowKey]);
    if (sort === "Recent") list.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    return list;
  }, [pools, sort, windowKey]);

  const topPool = sorted[0] ?? null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 px-4 pt-3 pb-2">
        <div className="flex select-none items-center gap-5">
          {SORTS.map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={cn(
                "py-1 text-xl leading-7 transition-colors",
                sort === s ? "font-medium text-foreground" : "font-medium text-muted-foreground hover:text-foreground",
              )}
            >
              {s}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <Toolbar
            network={network}
            setNetwork={setNetwork}
            window={windowKey}
            setWindow={setWindowKey}
            density={density}
            setDensity={setDensity}
            loading={loading}
            refreshedAt={refreshedAt}
            onRefresh={reload}
            onOpenTrade={() => setTradeOpen(true)}
          />
        </div>
      </div>

      <div className="px-4 pb-16">
        {error && (
          <div className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
            {error}
          </div>
        )}

        {pools.length === 0 ? (
          <PulseTable pools={[]} loading window={windowKey} density={density} />
        ) : (
          <PulseTable pools={sorted} loading={loading} window={windowKey} density={density} />
        )}
      </div>

      <TradePanel pool={topPool} open={tradeOpen} onClose={() => setTradeOpen(false)} />
    </>
  );
}

function StatusBar() {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 flex h-9 items-center gap-4 border-t border-border bg-canvas px-3 text-xs text-muted-foreground">
      <div className="flex items-center gap-3">
        <Settings className="size-4" />
        <Rocket className="size-4" />
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          Pulse
        </span>
        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          <LayoutList className="size-4" />
          Discover
        </span>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <span className="flex items-center gap-1.5 tabular-nums">
          <span className="size-3 rounded-full bg-[#6274ff]" />$2,701.91
        </span>
        <span className="flex items-center gap-1.5 tabular-nums">
          <span className="size-3 rounded-full bg-[#facc15]" />$774.98
        </span>
        <span className="flex items-center gap-1.5 tabular-nums">
          <span className="size-3 rounded-full bg-[#33ffb8]" />$119.97
        </span>
        <span className="flex items-center gap-1.5 tabular-nums">
          <span className="size-3 rounded-full bg-[#ff3d7b]" />$11.08
        </span>
        <span className="flex items-center gap-1.5 font-medium text-buy-foreground">
          <span className="size-1.5 rounded-full bg-buy-foreground" />
          Stable
        </span>
        <span className="h-4 w-px bg-border" />
        <Smile className="size-4" />
        <Send className="size-4" />
        <Globe className="size-4" />
        <Flag className="size-4" />
      </div>
    </footer>
  );
}

export default function App() {
  const [page, setPage] = useState<PageId>("Discover");

  return (
    <PresetsProvider>
      <QuickTradesProvider>
        <div className="min-h-screen bg-canvas text-foreground">
          <TopNav
            active={page}
            onNavigate={(next) => {
              // Only the two built pages navigate. Pulse / Traders / Trading / … are
              // not implemented in this build, so clicking them does nothing rather
              // than silently showing a different page.
              if (next === "Settings") setPage("Settings");
              else if (next === "Discover") setPage("Discover");
            }}
          />
          {page === "Settings" ? <SettingsPage /> : <DiscoverPage />}
          <StatusBar />
          <Toaster position="bottom-center" />
        </div>
      </QuickTradesProvider>
    </PresetsProvider>
  );
}
