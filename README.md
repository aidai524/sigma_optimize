# Sigma Terminal — Discover (trial build)

React + TypeScript + Tailwind + shadcn implementation of Sigma's **Discover** page (the trending
list) with the improvements identified
in the competitor comparison. Built for the Sigma frontend trial task.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Live data: [GeckoTerminal](https://www.geckoterminal.com/) public API (no key)

## What's implemented

| ID | Improvement | Where |
| --- | --- | --- |
| — | **Trend column renders for every row**: the first two rows draw real OHLCV, the rest a deterministic synthetic series, because the free API will not serve one request per row | `components/pulse/Sparkline.tsx`, `lib/synthetic-ohlcv.ts`, `lib/gt.ts` |
| A3 | **Row quick-buy shows the amount** (active preset) instead of being icon-only, with a compact confirm | `components/pulse/QuickBuyButton.tsx` |
| — | **Display density** (comfortable / compact), persisted to localStorage | `components/pulse/Toolbar.tsx` |
| A6 | **Multiple discovery lenses** (Trending / Surge / Recent) over the same live table | `App.tsx` |
| B1 | **Instant Trade panel with slippage & priority presets + high-slippage warning** and MEV toggle | `components/pulse/TradePanel.tsx` |
| — | **Settings → Quick Trades**: per-chain amounts grouped by quote currency, each labelled with its unit and a `≈$` value, a USD batch setter, and a fee-share warning | `components/settings/QuickTradesSection.tsx`, `lib/quick-trade-units.ts` |
| — | **All-chain balance total and a working chain switcher** in the account menu | `components/settings/SettingsPage.tsx`, `stores/chain-context.ts` |
| — | **Deposit dialog** driven by a live cross-chain quote (Stableflow referrer over an intent rail), with `Estimated time` and `Fee` | `components/deposit/*` |

Two earlier candidates were **dropped after re-testing against the live app**, so they are no longer
in the list: labelling the eight Token-Info badges (Sigma's own row is deliberately unlabelled and
the captured markup is the reference we are matching), and a `Clean layout mode` toggle. The token
info row is Sigma's own markup unchanged; the density toggle above is what remains of that idea.

## Data behaviour

- Trending pools come from `GET /networks/{net}/trending_pools`. **All table data is real.**
- **Trend column**: the first `REAL_SPARKLINE_ROWS` (default **2**) rows fetch real OHLCV from
  `GET /networks/{net}/pools/{pool}/ohlcv/...`. Every row after that draws a **synthetic**
  series from `lib/synthetic-ohlcv.ts` — deterministic per pool, and with its net move forced
  to match the row's real window change so the line cannot contradict the Gain column.
  This is presentation data, not market data.
  - Why: the free GeckoTerminal tier refuses a burst of one OHLCV request per row. A 20-row
    page meant ~20 near-simultaneous requests; the first couple succeeded and the rest were
    refused, which left most of the trend column empty.
  - **Temporary workaround, not the intended design.** We do not hold a paid CoinGecko
    plan, so most rows cannot be loaded from the API today. With a paid key the onchain
    endpoints (`https://pro-api.coingecko.com/api/v3/onchain/...` plus `x-cg-pro-api-key`)
    allow far more calls per minute, every row loads real candles normally, and this flag
    can be dropped — switch with `VITE_SIMULATE_SPARKLINES=false` and point `lib/gt.ts` at
    the paid host. Nothing else in the table is simulated either way.
  - The refusal never arrives as a `429` Response — the error reply carries no CORS headers,
    so `fetch` rejects with a bare `TypeError`, which is why the original `res.status === 429`
    check never fired.
  - Controls: `VITE_SIMULATE_SPARKLINES=false` uses the real API for **every** row;
    `VITE_SPARKLINE_REAL_ROWS=<n>` moves the cut-off (put them in `.env.local`).
- Requests are cached in memory (45s for lists, 5 min for sparklines) and go through a
  scheduler that paces starts, lets the pool list jump ahead of trend requests, and backs the
  whole queue off when the API pushes back (`lib/gt.ts`).
- On error the UI keeps the previous data; a real trend row that keeps failing shows `n/a`
  rather than a skeleton forever. The table itself renders a skeleton for at least 600ms so it
  never flashes blank.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # type-check + production build
npm run preview  # preview the production build
```

## Notes / limitations

- No wallet is connected in this trial, so Quick Buy and Instant Trade are UI-complete
  simulations with real token context (price, MCap, presets) rather than on-chain trades.
- The free GeckoTerminal tier is rate limited; the caching + backoff above keeps the
  demo usable. A server-side cache proxy would remove this constraint.
