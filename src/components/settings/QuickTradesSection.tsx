import { useState } from "react";
import { Plus, Trash2, Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { CHAINS, type ChainId } from "@/lib/chain-registry";
import { ChainMark } from "@/components/settings/chainMarks";
import { useQuickTrades, type QuickTradeSetting } from "@/components/settings/quickTrades";
import {
  QUOTE_GROUPS,
  type QuoteGroup,
  amountToUsd,
  feeShare,
  formatUsd,
  usdToAmount,
} from "@/lib/quick-trade-units";

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

/** Network fee as a share of the order — only where a measured cost exists. */
function FeeWarning({ chain, usd }: { chain: ChainId; usd: number }) {
  const share = feeShare(chain, usd);
  if (share == null) return null;
  const pct = Math.round(share * 100);
  if (pct < 10) return null;
  return (
    <span className={cn("text-[10px]", pct >= 25 ? "text-sell-foreground" : "text-amber-400")}>
      fee ≈{pct}% of this order
    </span>
  );
}

function AmountLine({ chain, amount }: { chain: ChainId; amount: number }) {
  const symbol = CHAINS[chain].symbol;
  const usdValue = amountToUsd(chain, amount);
  return (
    <span className="flex flex-col">
      <span className="tabular-nums">
        {amount} <span className="text-muted-foreground">{symbol}</span>
        <span className="text-muted-foreground"> ≈ {formatUsd(usdValue)}</span>
      </span>
      <FeeWarning chain={chain} usd={usdValue} />
    </span>
  );
}

function BuyAmountsValue({ chain, amounts }: { chain: ChainId; amounts: number[] }) {
  if (amounts.length === 0) {
    return (
      <span className="w-20 py-2 text-sm text-muted-foreground md:w-40">Not Set</span>
    );
  }
  return (
    <span className="w-20 py-2 text-sm md:w-40">
      <span className="flex flex-col gap-0.5">
        {amounts.map((amount, i) => (
          <AmountLine key={i} chain={chain} amount={amount} />
        ))}
      </span>
    </span>
  );
}

function ChainCard({ chain }: { chain: ChainId }) {
  const { settingFor, save } = useQuickTrades();
  const setting = settingFor(chain);
  const [draft, setDraft] = useState<Draft | null>(null);

  const editing = draft !== null;
  const symbol = CHAINS[chain].symbol;
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
              <span className="text-xs text-buy-foreground">Buy Amounts ({symbol})</span>
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
                {/* Sigma stacks "Add more" under the last input at the input's own
                    width, instead of sitting it beside the field where it wraps. */}
                {draft.buy.length < MAX_BUY_AMOUNTS && (
                  <button
                    onClick={() => patch({ buy: [...draft.buy, null] })}
                    className="inline-flex h-8 w-32 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-secondary/95 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/60"
                  >
                    <Plus className="size-4" />
                    Add more
                  </button>
                )}
              </div>
            </div>

            {/* Sell amount + Always Sell All */}
            <div className="flex flex-col gap-1">
              <span className="text-xs text-sell-foreground">Sell Amount ({symbol})</span>
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
              <BuyAmountsValue chain={chain} amounts={setting.buyAmounts} />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-sell-foreground">Sell Amount</span>
              <span className={cn("w-20 py-2 text-sm md:w-40", sellMuted && "text-muted-foreground")}>
                {setting.sellAll ? (
                  "Sell All"
                ) : setting.sellAmount != null ? (
                  <AmountLine chain={chain} amount={setting.sellAmount} />
                ) : (
                  "Not Set"
                )}
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

/** One header per quote group, with a group-scoped apply so a token amount can
 *  never be copied into a different unit by accident. */
function GroupHeading({ group, onApply }: { group: QuoteGroup; onApply: (amount: number) => void }) {
  const { state } = useQuickTrades();
  const [draft, setDraft] = useState<string | null>(null);
  const current = state[group.chains[0]]?.buyAmounts[0];
  const value = draft ?? (current != null ? String(current) : "");
  const parsed = parseAmount(value);

  return (
    <div className="flex flex-wrap items-center gap-3 pb-1">
      <ChainMark chain={group.chains[0]} />
      <span className="text-sm font-medium">{group.label}</span>
      <span className="text-xs text-muted-foreground">
        {group.chains.length} {group.chains.length === 1 ? "chain" : "chains"}
      </span>
      <div className="ml-auto flex items-center gap-2">
        <div className="flex h-8 w-28 items-center rounded-sm border border-input px-2">
          <input
            type="number"
            min={0}
            step={0.01}
            inputMode="decimal"
            aria-label={`Amount for the ${group.label} group`}
            placeholder={group.symbol}
            value={value}
            onChange={(e) => setDraft(e.target.value)}
            className={numberInput}
          />
        </div>
        <button
          disabled={parsed == null}
          onClick={() => {
            if (parsed == null) return;
            onApply(parsed);
          }}
          className="h-8 rounded-md bg-secondary/95 px-3 text-sm font-medium whitespace-nowrap text-secondary-foreground transition-colors hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Apply to {group.chains.length}
        </button>
      </div>
    </div>
  );
}

/**
 * One input that can set every chain at once.
 *
 * In USD the value is converted per unit, so it is safe across groups and the
 * preview shows each group's resulting amount and what it really costs. With the
 * USD switch off the number is a **token** amount, and copying one number into a
 * different unit silently changes its value (`0.002 ETH` ≈ $5.4 vs `0.002 BNB` ≈
 * $1.5) — so that path asks for confirmation and shows both sides.
 */
function BatchSetter({ onApplyUsd, onApplyToken }: {
  onApplyUsd: (usd: number) => void;
  onApplyToken: (amount: number) => void;
}) {
  const [usdMode, setUsdMode] = useState(true);
  const [raw, setRaw] = useState("10");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const value = Number(raw);
  const valid = Number.isFinite(value) && value > 0;

  const preview = QUOTE_GROUPS.map((group) => {
    const chain = group.chains[0];
    const amount = usdMode
      ? usdToAmount(value, group.symbol, CHAINS[chain].priceUsd)
      : value;
    return { group, amount, usd: amountToUsd(chain, amount) };
  });

  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Set every chain by</span>
          <div className="flex h-8 items-center gap-2">
            <Switch
              aria-label="Enter an amount in USD"
              checked={usdMode}
              onCheckedChange={(checked) => setUsdMode(checked === true)}
            />
            <span className="text-sm font-medium">{usdMode ? "USD" : "Token amount"}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">
            {usdMode ? "Dollars per chain" : "Amount per chain (each chain's own unit)"}
          </span>
          <div className="flex h-8 w-32 items-center rounded-sm border border-input px-2">
            <input
              type="number"
              min={0}
              step={0.01}
              inputMode="decimal"
              aria-label="Batch amount"
              placeholder={usdMode ? "$" : "0.00"}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className={numberInput}
            />
          </div>
        </div>
        <button
          disabled={!valid}
          onClick={() => (usdMode ? onApplyUsd(value) : setConfirmOpen(true))}
          className="h-8 rounded-lg bg-secondary/95 px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/60 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Apply to all {QUOTE_GROUPS.reduce((n, g) => n + g.chains.length, 0)} chains
        </button>
      </div>

      {/* What each unit would actually receive — the transparency the switch buys. */}
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-border pt-3 text-xs">
        {preview.map(({ group, amount, usd }) => (
          <span key={group.symbol} className="tabular-nums">
            <span className="text-muted-foreground">{group.label}: </span>
            {amount} {group.symbol}
            <span className="text-muted-foreground"> ≈ {formatUsd(usd)}</span>
          </span>
        ))}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Copy the same number into different units?</DialogTitle>
            <DialogDescription>
              This writes <span className="text-foreground">{raw}</span> of each chain&apos;s own
              token, so the same number is a different amount of money per unit.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5 py-2 text-sm tabular-nums">
            {preview.map(({ group, amount, usd }) => (
              <div key={group.symbol} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{group.label}</span>
                <span>
                  {amount} {group.symbol} <span className="text-muted-foreground">≈ {formatUsd(usd)}</span>
                </span>
              </div>
            ))}
          </div>
          <DialogFooter>
            <button
              onClick={() => setConfirmOpen(false)}
              className="h-8 rounded-lg border border-border px-4 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onApplyToken(value);
                setConfirmOpen(false);
              }}
              className="h-8 rounded-lg bg-secondary/95 px-4 text-sm font-medium text-secondary-foreground transition-colors hover:bg-secondary/60"
            >
              Apply anyway
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function QuickTradesSection() {
  const { state, save, reset } = useQuickTrades();

  const unset = Object.values(state).filter(
    (s) => s.buyAmounts.length === 0 && s.sellAmount == null && !s.sellAll,
  ).length;

  /** Writes the chain's primary buy amount, leaving a second button untouched. */
  const setPrimaryBuy = (chain: ChainId, amount: number) => {
    const prev = state[chain];
    save(chain, {
      ...prev,
      buyAmounts: prev.buyAmounts.length ? [amount, ...prev.buyAmounts.slice(1)] : [amount],
    });
  };

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

        <BatchSetter
          onApplyUsd={(usd) => {
            for (const group of QUOTE_GROUPS) {
              const price = CHAINS[group.chains[0]].priceUsd;
              const amount = usdToAmount(usd, group.symbol, price);
              for (const chain of group.chains) setPrimaryBuy(chain, amount);
            }
          }}
          onApplyToken={(amount) => {
            for (const group of QUOTE_GROUPS) {
              for (const chain of group.chains) setPrimaryBuy(chain, amount);
            }
          }}
        />

        {/* Grouped by quote unit: a token amount is only ever copied within a group. */}
        <div className="space-y-6">
          {QUOTE_GROUPS.map((group) => (
            <section key={group.symbol} className="space-y-3">
              <GroupHeading
                group={group}
                onApply={(amount) => {
                  for (const chain of group.chains) setPrimaryBuy(chain, amount);
                }}
              />
              <div className="space-y-3">
                {group.chains.map((chain) => (
                  <ChainCard key={chain} chain={chain} />
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
          <span>
            {unset} of {Object.keys(state).length} chains left unset · each amount shows its own unit
            and dollar value
          </span>
          <button onClick={reset} className="transition-colors hover:text-foreground">
            Reset to captured state
          </button>
        </div>
      </div>
    </div>
  );
}
