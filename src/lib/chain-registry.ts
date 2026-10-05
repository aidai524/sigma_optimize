/**
 * Single source of truth for chain metadata.
 *
 * The app previously carried three overlapping chain lists: `NETWORKS` in
 * `lib/gt.ts` (market data, ids `solana|base|eth|bsc`), `RECEIVE_CHAINS` in
 * `lib/chains.ts` (deposit, ids `sol|base|eth|bsc`) and the mark/order list that
 * used to live in `components/settings/chainMarks.tsx`. Anything new — the chain
 * switcher, the balance summary, the Quick Trades page — should read from here so
 * a chain is described exactly once.
 *
 * `lib/gt.ts` and `lib/chains.ts` are intentionally left alone for now; folding
 * them in means touching the market-data and deposit flows, which is a separate
 * change.
 */

export type ChainId = "eth" | "bsc" | "avax" | "base" | "sol" | "hood" | "stable" | "arc";

export type ChainMeta = {
  id: ChainId;
  /** Uppercase short label, as used in Settings → Quick Trades. */
  label: string;
  /** Full name. */
  name: string;
  /** Native / settlement symbol, as shown next to an amount. */
  symbol: string;
  /** Disc colour used when a real logo is not needed. */
  color: string;
  /** One-glyph stand-in for the disc. */
  glyph: string;
  /** Logo shipped with the app (mirrored from the site). */
  logo: string;
  /** USD price of one unit of `symbol`, matching the status bar. */
  priceUsd: number;
  /**
   * Rough cost of one transaction on this chain in USD, used to warn when a preset
   * amount is small enough that fees would dominate it. Only filled in where there is
   * a real observation behind the number — ETH mainnet was measured at ~25% of a $5
   * order during the walkthrough, and Base fees were observed in cents. Chains with no
   * data are left undefined so the warning stays silent instead of guessing.
   */
  estTxCostUsd?: number;
};

export const CHAINS: Record<ChainId, ChainMeta> = {
  eth: {
    id: "eth",
    label: "ETH",
    name: "Ethereum",
    symbol: "ETH",
    color: "#6274ff",
    glyph: "Ξ",
    logo: "/sigma.win/cdn/chains/eth.svg",
    priceUsd: 2701.91,
    estTxCostUsd: 1.25,
  },
  bsc: {
    id: "bsc",
    label: "BSC",
    name: "BNB Chain",
    symbol: "BNB",
    color: "#f0b90b",
    glyph: "◆",
    logo: "/sigma.win/cdn/chains/bsc.svg",
    priceUsd: 774.98,
  },
  avax: {
    id: "avax",
    label: "AVAX",
    name: "Avax",
    symbol: "AVAX",
    color: "#e84142",
    glyph: "▲",
    logo: "/sigma.win/cdn/chains/avax.svg",
    priceUsd: 11.08,
  },
  base: {
    id: "base",
    label: "BASE",
    name: "Base",
    symbol: "ETH",
    color: "#0052ff",
    glyph: "●",
    logo: "/sigma.win/cdn/chains/base.svg",
    priceUsd: 2701.91,
    estTxCostUsd: 0.02,
  },
  sol: {
    id: "sol",
    label: "SOL",
    name: "Solana",
    symbol: "SOL",
    color: "#9945ff",
    glyph: "≡",
    logo: "/sigma.win/cdn/chains/sol.svg",
    priceUsd: 119.97,
  },
  hood: {
    id: "hood",
    label: "HOOD",
    name: "Robinhood",
    symbol: "ETH",
    color: "#00c805",
    glyph: "H",
    logo: "/sigma.win/cdn/chains/robinhood.svg",
    priceUsd: 2701.91,
  },
  stable: {
    id: "stable",
    label: "STABLE",
    name: "Stable",
    symbol: "$",
    color: "#5b6478",
    glyph: "$",
    logo: "/sigma.win/cdn/chains/stable.svg",
    priceUsd: 1,
  },
  arc: {
    id: "arc",
    label: "ARC",
    name: "Arc",
    symbol: "$",
    color: "#0ea5e9",
    glyph: "◠",
    logo: "/sigma.win/cdn/chains/arc.svg",
    priceUsd: 1,
  },
};

/** Display order, mirroring Settings → Quick Trades. */
export const CHAIN_ORDER: ChainId[] = ["eth", "bsc", "avax", "base", "sol", "hood", "stable", "arc"];

export function chain(id: ChainId): ChainMeta {
  return CHAINS[id];
}
