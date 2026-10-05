export const ONECLICK_BASE = "https://1click.chaindefuser.com"
export const NEARINTENTS_API_KEY = import.meta.env.VITE_NEARINTENTS_API_KEY || "";

export const RPC_URLS = {
  eth: import.meta.env.VITE_ETH_RPC_URL || "https://ethereum.publicnode.com",
  base: import.meta.env.VITE_BASE_RPC_URL || "https://mainnet.base.org",
  bsc: import.meta.env.VITE_BSC_RPC_URL || "https://bsc.publicnode.com",
  sol: import.meta.env.VITE_SOLANA_RPC_URL || "https://solana-rpc.publicnode.com",
} as const

/**
 * The free GeckoTerminal tier cannot serve one OHLCV request per row — see the
 * scheduler notes in `lib/gt.ts`. By default only the first `REAL_SPARKLINE_ROWS`
 * rows request real candles; every row after that draws a deterministic synthetic
 * series (`lib/synthetic-ohlcv.ts`) whose net move matches the row's real change.
 *
 * Set `VITE_SIMULATE_SPARKLINES=false` to make every row use the API instead, or
 * `VITE_SPARKLINE_REAL_ROWS=<n>` to move the cut-off.
 *
 * **Temporary, pending a paid API plan.** This is a workaround for the free tier's
 * burst limit, not the intended end state: we do not currently hold a paid CoinGecko
 * key, so most rows cannot be loaded from the API. With a paid key every row loads
 * for real and this flag can go away.
 */
export const SIMULATE_SPARKLINES = import.meta.env.VITE_SIMULATE_SPARKLINES !== "false"
export const REAL_SPARKLINE_ROWS = Number(import.meta.env.VITE_SPARKLINE_REAL_ROWS ?? 2)
