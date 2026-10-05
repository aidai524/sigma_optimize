/**
 * Unit handling for Quick Trades.
 *
 * Requirement `18` §2 groups the chains by **display unit** and blocks copying a
 * token amount across groups, because the same number means a different amount of
 * money on each unit (`0.002 ETH` ≈ $5.4 but `0.002 BNB` ≈ $1.5). Grouping by
 * `symbol` is exactly that rule: `eth`/`base`/`hood` all quote in ETH, and
 * `stable`/`arc` both quote in dollars, which is 1:1 whatever the underlying
 * stablecoin is — so the same number keeps the same value inside a group.
 *
 * A dollar amount is the one thing that *is* safe to apply across groups, because
 * it is converted per unit; `usdToAmount` does that conversion and rounds **up**, so
 * rounding can only ever spend a little more than asked, never less (§3).
 */
import { CHAINS, CHAIN_ORDER, type ChainId } from "@/lib/chain-registry";

export type QuoteGroup = {
  /** Display unit, and the group key. */
  symbol: string;
  /** Human label for the group header. */
  label: string;
  chains: ChainId[];
  /** Decimals a USD conversion rounds up to for this unit. */
  decimals: number;
};

/**
 * Decimals per unit (§3). A single fixed precision does not work: three decimals
 * would overspend ETH by ~8%, four would leave AVAX showing `0.5000`.
 */
const UNIT_DECIMALS: Record<string, number> = {
  ETH: 4,
  BNB: 4,
  AVAX: 3,
  SOL: 4,
  $: 2,
};

const UNIT_LABELS: Record<string, string> = {
  ETH: "ETH-quoted",
  BNB: "BNB-quoted",
  AVAX: "AVAX-quoted",
  SOL: "SOL-quoted",
  $: "USD-quoted",
};

export function decimalsFor(symbol: string): number {
  return UNIT_DECIMALS[symbol] ?? 4;
}

/** Groups in first-seen order, so the page follows CHAIN_ORDER. */
export const QUOTE_GROUPS: QuoteGroup[] = CHAIN_ORDER.reduce<QuoteGroup[]>((groups, id) => {
  const symbol = CHAINS[id].symbol;
  const existing = groups.find((g) => g.symbol === symbol);
  if (existing) {
    existing.chains.push(id);
    return groups;
  }
  groups.push({
    symbol,
    label: UNIT_LABELS[symbol] ?? `${symbol}-quoted`,
    chains: [id],
    decimals: decimalsFor(symbol),
  });
  return groups;
}, []);

export function groupFor(chain: ChainId): QuoteGroup {
  const symbol = CHAINS[chain].symbol;
  return QUOTE_GROUPS.find((g) => g.symbol === symbol) ?? QUOTE_GROUPS[0];
}

export function amountToUsd(chain: ChainId, amount: number): number {
  return amount * CHAINS[chain].priceUsd;
}

/** Round **up** to the unit's precision so the spend is never below the target. */
export function usdToAmount(usd: number, symbol: string, priceUsd: number): number {
  const decimals = decimalsFor(symbol);
  const factor = 10 ** decimals;
  return Math.ceil((usd / priceUsd) * factor) / factor;
}

export function formatAmount(amount: number): string {
  return String(amount);
}

export function formatUsd(value: number): string {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

/**
 * Share of a trade the network fee would take, or null when we have no measured
 * cost for that chain. Deliberately sparse: the warning only appears where a real
 * number exists (see `estTxCostUsd` in the chain registry) rather than on invented
 * ones.
 */
export function feeShare(chain: ChainId, amountUsd: number): number | null {
  const cost = CHAINS[chain].estTxCostUsd;
  if (cost == null || amountUsd <= 0) return null;
  return cost / amountUsd;
}
