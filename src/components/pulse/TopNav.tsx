import { ChevronDown, Flame, LayoutGrid, Search, Star, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = ["Discover", "Pulse", "Traders", "Trading", "Portfolio", "Rewards", "Orders", "Settings"];

function SigmaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <path
        d="M16 3c4.5 0 8.5 2.3 10.8 5.9l-3.7 2.1C21.4 8.6 18.9 7.3 16 7.3c-2.5 0-4.7.9-6.3 2.5l5.2 3c3.6 2 5.4 4 5.4 6.7 0 4.3-3.6 7.2-8.3 7.2-4.6 0-8.6-2.4-10.9-6.1l3.8-2.1c1.7 2.5 4.3 3.9 7.1 3.9 2.4 0 4.1-.9 4.1-2.4 0-1.2-.8-2-2.9-3.1l-3.6-2C7 13.5 5.7 11.9 5.7 10 5.7 6.1 10 3 16 3Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function TopNav({ active = "Pulse", onNavigate }: { active?: string; onNavigate?: (item: string) => void }) {
  return (
    <header className="border-b border-border bg-canvas">
      {/* main bar */}
      <div className="flex h-14 items-center gap-2 px-4">
        <div className="flex items-center gap-2 pr-3">
          <SigmaMark className="size-6 text-foreground" />
          <span className="text-[17px] font-semibold tracking-tight text-foreground">Sigma</span>
        </div>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <button
              key={item}
              onClick={() => onNavigate?.(item)}
              className={cn(
                "px-2.5 py-1.5 text-sm transition-colors",
                item === active
                  ? "font-medium text-foreground"
                  : "font-normal text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="mx-auto hidden h-8 w-full max-w-[420px] items-center gap-2 rounded-lg bg-secondary px-3 text-sm text-muted-foreground md:flex">
          <Search className="size-3.5" />
          <span className="flex-1">Search...</span>
          <kbd className="grid h-5 min-w-5 place-items-center rounded-[4px] bg-muted px-1 text-[11px] text-muted-foreground">
            /
          </kbd>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button className="grid size-8 place-items-center rounded-lg bg-secondary text-muted-foreground transition-colors hover:text-foreground">
            <Star className="size-4" />
          </button>
          <button className="h-8 rounded-lg border-[0.5px] border-brand-500 bg-brand-500/[0.12] px-3 text-sm font-medium text-brand-500 transition-colors hover:bg-brand-500/20">
            Deposit
          </button>
          <button className="flex h-8 items-center gap-2 rounded-lg bg-secondary px-2.5 text-sm">
            <span className="grid size-5 place-items-center rounded-full bg-[#7b61ff] text-[10px] font-semibold lowercase text-white">
              p
            </span>
            <span className="hidden font-medium text-foreground sm:inline">Joe Degen</span>
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* watchlist strip */}
      <div className="flex h-9 items-center gap-3 border-t border-border px-4 text-muted-foreground">
        <div className="flex items-center gap-3">
          <Star className="size-4" />
          <Flame className="size-4" />
          <TrendingUp className="size-4" />
          <LayoutGrid className="size-4" />
        </div>
        <span className="h-4 w-px bg-border" />
        <button className="flex items-center gap-1.5 text-sm">
          <span className="flex -space-x-1">
            <span className="size-4 rounded-full border border-canvas bg-[#6274ff]" />
            <span className="size-4 rounded-full border border-canvas bg-[#f0b90b]" />
            <span className="size-4 rounded-full border border-canvas bg-[#9945ff]" />
          </span>
          <span className="text-foreground">+4</span>
          <ChevronDown className="size-3.5" />
        </button>
        <span className="h-4 w-px bg-border" />
        <span className="text-[13px]">Add tokens to your watchlist to see them here</span>
      </div>
    </header>
  );
}
