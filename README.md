# Sigma Terminal — Pulse (trial build)

React + TypeScript + Tailwind + shadcn implementation of the improvements identified
in the competitor comparison. Built for the Sigma frontend trial task.

## Stack

- Vite + React 19 + TypeScript
- Tailwind CSS v4
- shadcn/ui components
- Live data: [GeckoTerminal](https://www.geckoterminal.com/) public API (no key)

## What's implemented

| ID | Improvement | Where |
| --- | --- | --- |
| — | **Sparklines render with a skeleton and load lazily per row** (IntersectionObserver) with retry — engineering polish, not a claimed competitor gap | `components/pulse/Sparkline.tsx`, `PulseTable.tsx` |
| A2 | **Grouped + labelled token metrics** (Liquidity / Valuation / Activity / Pool) replacing eight unlabelled micro-badges; Liq/MCap ratio highlighted when low | `components/pulse/TokenInfoCell.tsx` |
| A3 | **Row quick-buy shows the amount** (active preset) instead of being icon-only, with a compact confirm | `components/pulse/QuickBuyButton.tsx` |
| A4 | **Clean layout mode + comfortable/compact density**, persisted to localStorage | `Toolbar.tsx` |
| A6 | **Multiple discovery lenses** (Trending / Surge / Recent) over the same live table | `App.tsx` |
| B1 | **Instant Trade panel with slippage & priority presets + high-slippage warning** and MEV toggle | `components/pulse/TradePanel.tsx` |

## Data behaviour

- Trending pools come from `GET /networks/{net}/trending_pools`.
- Sparklines come from `GET /networks/{net}/pools/{pool}/ohlcv/...` (real OHLCV).
- Results are cached in memory (45s for lists, 5 min for sparklines) and all requests
  go through a concurrency queue because the free tier is rate limited.
- On rate limit / network error the UI keeps the previous data and retries with
  exponential backoff; first load keeps a skeleton for at least 600ms so the table
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
