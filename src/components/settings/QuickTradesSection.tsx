import { useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { CHAINS, CHAIN_ORDER, ChainMark, type ChainKey } from "@/components/settings/chainMarks";
import { useQuickTrades, type QuickTradeSetting } from "@/components/settings/quickTrades";

/**
 * Sigma caps buy amount buttons at two: `getPulseQuickBuySettings` only reads
 * index 0 and 1, which is exactly the pair of buy buttons rendered on a Pulse card.
 */
const MAX_BUY_AMOUNTS = 2;

type Draft = { buy: (number | null)[]; sell: number | null; sellAll: boolean };

const draftFrom = (s: QuickTradeSetting): Draft => ({
  buy: s.buyAmounts.length ? s.buyAmounts.map((n) => n) : [null],
  sell: s.sellAmount,
  sellAll: s.sellAll,
});

const parseAmount = (raw: string): number | null => {
  if (raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const fieldBox =
  "flex h-[34px] w-32 items-center rounded-sm border border-input bg-transparent px-2 focus-within:bg-muted focus-within:ring-2 focus-within:ring-ring";

const numberInput =
  "h-full w-full border-0 bg-transparent text-base outline-none md:text-sm [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none";

function BuyAmountsValue({ amounts }: { amounts: number[] }) {
  if (amounts.length === 0) {
    return <span className="w-20 py-2 text-sm text-muted-foreground md:w-32">Not Set</span>;
  }
  return (
    <span className="w-20 py-2 text-sm md:w-32">
      <span className="flex flex-col gap-1">
        {amounts.map((amount, i) => (
          <span key={i}>{amount}</span>
        ))}
      </span>
    </span>
  );
}

function ChainCard({ chain }: { chain: ChainKey }) {
  const { settingFor, save } = useQuickTrades();
  const setting = settingFor(chain);
  const [draft, setDraft] = useState<Draft | null>(null);

  const editing = draft !== null;
  const sellText = setting.sellAll
    ? "Sell All"
    : setting.sellAmount != null
      ? String(setting.sellAmount)
      : "Not Set";
  const sellMuted = !setting.sellAll && setting.sellAmount == null;

  const patch = (next: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...next } : d));

  const onSave = () => {
    if (!draft) return;
    save(chain, {
      buyAmounts: draft.buy.filter((n): n is number => n !== null),
      sellAmount: draft.sellAll ? null : draft.sell,
      sellAll: draft.sellAll,
    });
    setDraft(null);
  };

  return (
    <div className="flex w-full flex-col justify-between gap-4 rounded-md border border-border bg-background p-4 md:flex-row md:p-6">
      <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-start md:gap-10">
        <div className="flex w-20 shrink-0 items-center gap-2">
          <ChainMark chain={chain} />
          <span className="text-sm">{CHAINS[chain].label}</span>
        </div>

        {editing ? (
          <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-start md:gap-6">
            {/* Buy amounts — a list, capped at 2 like Sigma's card buttons */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-buy-foreground">Buy Amounts</span>
              <div className="flex flex-col gap-2">
                {draft.buy.map((amount, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <div className={fieldBox}>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        inputMode="decimal"
                        aria-label={`Buy amount ${i + 1}`}
                        placeholder="Not Set"
                        value={amount ?? ""}
                        onChange={(e) => {
                          const next = [...draft.buy];
                          next[i] = parseAmount(e.target.value);
                          patch({ buy: next });
                        }}
                        className={numberInput}
                      />
                    </div>
                    {draft.buy.length === 1 && draft.buy.length < MAX_BUY_AMOUNTS && (
                      <button
                        onClick={() => patch({ buy: [...draft.buy, null] })}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-secondary/95 px-3 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/60"
                      >
                        <Plus className="size-4" />
                        Add more
                      </button>
                    )}
                    {i > 0 && (
                      <button
                        aria-label="Delete"
                        onClick={() => patch({ buy: draft.buy.filter((_, idx) => idx !== i) })}
                        className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Sell amount + Always Sell All */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-sell-foreground">Sell Amount</span>
              <div className="flex items-center gap-4">
                <div className={fieldBox}>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    inputMode="decimal"
                    placeholder={draft.sellAll ? "Sell All" : "Not Set"}
                    disabled={draft.sellAll}
                    value={draft.sellAll ? "" : (draft.sell ?? "")}
                    onChange={(e) => patch({ sell: parseAmount(e.target.value) })}
                    className={cn(numberInput, "disabled:text-muted-foreground")}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    aria-label="Always Sell All"
                    checked={draft.sellAll}
                    onCheckedChange={(checked) => patch({ sellAll: checked === true })}
                  />
                  <span className="select-none text-sm font-medium">Always Sell All</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-start md:gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-buy-foreground">Buy Amounts</span>
              <BuyAmountsValue amounts={setting.buyAmounts} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-sell-foreground">Sell Amount</span>
              <span className={cn("w-20 py-2 text-sm md:w-32", sellMuted && "text-muted-foreground")}>
                {sellText}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex w-fit items-center gap-2 md:items-start">
        {editing ? (
          <>
            <button
              onClick={onSave}
              className="h-8 w-20 rounded-lg bg-secondary/95 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/60"
            >
              Save
            </button>
            <button
              onClick={() => setDraft(null)}
              className="h-8 w-20 rounded-lg border border-border bg-transparent text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              Cancel
            </button>
          </>
        ) : (
          <button
            onClick={() => setDraft(draftFrom(setting))}
            className="h-8 w-20 rounded-lg bg-secondary/95 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/60"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}

export function QuickTradesSection() {
  const { state, reset } = useQuickTrades();
  const unset = CHAIN_ORDER.filter((chain) => {
    const s = state[chain];
    return s.buyAmounts.length === 0 && s.sellAmount == null && !s.sellAll;
  }).length;

  return (
    <div className="space-y-4 pb-10 md:pt-4">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h5 className="text-lg font-semibold">
            <span className="flex items-center gap-2">
              <Zap className="size-4 fill-amber-400 stroke-amber-400" />
              <span>Quick Trades</span>
            </span>
          </h5>
          <p className="text-muted-foreground">
            Customize the preset amounts for Quick Buy and Quick Sell buttons. These values let you
            execute trades instantly with predefined amounts.
          </p>
        </div>

        <div className="space-y-3">
          {CHAIN_ORDER.map((chain) => (
            <ChainCard key={chain} chain={chain} />
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <span>
            {unset} of {CHAIN_ORDER.length} chains left unset
          </span>
          <button onClick={reset} className="transition-colors hover:text-foreground">
            Reset to captured state
          </button>
        </div>
      </div>
    </div>
  );
}
