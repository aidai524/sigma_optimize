import { useState } from "react";
import {
  ArrowUp10,
  Image as ImageIcon,
  Settings2,
  SwitchCamera,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QuickTradesSection } from "@/components/settings/QuickTradesSection";

type SectionId =
  | "Trade Settings"
  | "Cashback Wallets"
  | "Automation"
  | "Quick Trades"
  | "Presets"
  | "Custom PnL Cards"
  | "Portfolio Cards";

type NavItem = { id: SectionId; icon: React.ReactNode };

// Order and icons mirror Sigma's Settings sidebar.
const NAV: NavItem[] = [
  { id: "Trade Settings", icon: <Settings2 className="size-4 text-buy-foreground" /> },
  { id: "Cashback Wallets", icon: <span className="text-base leading-none">💸</span> },
  { id: "Automation", icon: <TrendingUp className="size-4 text-buy-foreground" /> },
  { id: "Quick Trades", icon: <SwitchCamera className="size-4 text-chart-1" /> },
  { id: "Presets", icon: <ArrowUp10 className="size-4" /> },
  { id: "Custom PnL Cards", icon: <ImageIcon className="size-4" /> },
  { id: "Portfolio Cards", icon: <WalletCards className="size-4 text-chart-2" /> },
];

function PlaceholderSection({ id }: { id: SectionId }) {
  return (
    <div className="space-y-2">
      <h5 className="text-lg font-semibold">{id}</h5>
      <p className="text-sm text-muted-foreground">
        This section is outside the scope of the trial build. Only{" "}
        <span className="text-foreground">Quick Trades</span> is implemented.
      </p>
    </div>
  );
}

export function SettingsPage() {
  const [section, setSection] = useState<SectionId>("Quick Trades");

  return (
    <div className="min-h-screen bg-canvas text-foreground">
      <div className="flex items-start">
        <aside className="w-[254px] shrink-0 border-r border-border py-4">
          <nav className="flex flex-col">
            {NAV.map((item) => {
              const active = item.id === section;
              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={cn(
                    "flex h-[44px] select-none items-center gap-4 px-6 text-left text-sm font-medium transition-colors",
                    active ? "text-brand" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="grid size-5 shrink-0 place-items-center">{item.icon}</span>
                  {item.id}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 overflow-y-auto px-4 pb-10">
          <div className="mx-auto my-4 w-full max-w-4xl space-y-4">
            {section === "Quick Trades" ? <QuickTradesSection /> : <PlaceholderSection id={section} />}
          </div>
        </main>
      </div>
    </div>
  );
}
